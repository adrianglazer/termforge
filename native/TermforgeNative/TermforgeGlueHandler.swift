import Foundation
internal import NIO
internal import NIOSSH
internal import Citadel

/// Own listeners and accepted channels, including connections still being set up.
internal final class TermforgeForwardChannels: @unchecked Sendable {
  private let lock = NSLock()
  private var stopped = false
  private var channels: [ObjectIdentifier: Channel] = [:]
  private var connections = Set<ObjectIdentifier>()

  func add(_ channel: Channel, connection: Bool = false) -> Bool {
    let id = ObjectIdentifier(channel)
    lock.lock()
    guard !stopped, !connection || connections.count < 16 else {
      lock.unlock(); channel.close(promise: nil); return false
    }
    channels[id] = channel
    if connection { connections.insert(id) }
    lock.unlock()
    channel.closeFuture.whenComplete { [weak self] _ in self?.remove(id) }
    return true
  }
  private func remove(_ id: ObjectIdentifier) {
    lock.lock(); defer { lock.unlock() }
    channels.removeValue(forKey: id); connections.remove(id)
  }
  func listenLocal(client: SSHClient, localPort: Int, remoteHost: String, remotePort: Int) async throws {
    let owned = self
      let bootstrap = ServerBootstrap(group: client.eventLoop)
        .serverChannelOption(ChannelOptions.backlog, value: 16)
        .childChannelOption(ChannelOptions.autoRead, value: false)
        .childChannelOption(ChannelOptions.writeBufferWaterMark, value: .init(low: 32768, high: 65536))
        .childChannelInitializer { localChannel in
          guard owned.add(localChannel, connection: true) else { return localChannel.eventLoop.makeFailedFuture(CancellationError()) }
          return localChannel.eventLoop.makeFutureWithTask {
            do {
              let origin = try localChannel.remoteAddress ?? SocketAddress(ipAddress: "127.0.0.1", port: 0)
              let sshChannel = try await client.createDirectTCPIPChannel(using: .init(targetHost: remoteHost, targetPort: remotePort, originatorAddress: origin)) { channel in
                guard owned.add(channel) else { return channel.eventLoop.makeFailedFuture(CancellationError()) }
                return channel.setOption(ChannelOptions.autoRead, value: false)
              }
              try await TermforgeGlueHandler.connect(localChannel, sshChannel).get()
            } catch { localChannel.close(promise: nil); throw error }
          }
        }
      let listener = try await bootstrap.bind(host: "127.0.0.1", port: localPort).get()
      guard owned.add(listener) else { throw CancellationError() }
  }

  func runRemote(client: SSHClient, remotePort: Int, localHost: String, localPort: Int,
                 onOpen: @escaping @Sendable (SSHRemotePortForward) async throws -> Void) async throws {
    let owned = self
    try await client.withRemotePortForward(host: "127.0.0.1", port: remotePort, onOpen: onOpen, handleChannel: { sshChannel, _ in
      guard owned.add(sshChannel, connection: true) else { return sshChannel.eventLoop.makeFailedFuture(CancellationError()) }
      return sshChannel.setOption(ChannelOptions.autoRead, value: false).flatMap {
        sshChannel.pipeline.addHandler(TermforgeForwardCodec())
      }.flatMap {
        ClientBootstrap(group: sshChannel.eventLoop)
          .channelOption(ChannelOptions.autoRead, value: false)
          .channelOption(ChannelOptions.writeBufferWaterMark, value: .init(low: 32768, high: 65536))
          .connectTimeout(.seconds(10))
          .connect(host: localHost, port: localPort)
      }.flatMap { localChannel in
        guard owned.add(localChannel) else { return sshChannel.eventLoop.makeFailedFuture(CancellationError()) }
        return TermforgeGlueHandler.connect(sshChannel, localChannel).flatMapError { error in
          localChannel.close(promise: nil)
          return sshChannel.eventLoop.makeFailedFuture(error)
        }
      }.flatMapError { error in
        sshChannel.close(promise: nil)
        return sshChannel.eventLoop.makeFailedFuture(error)
      }
    })
  }

  func close() {
    lock.lock(); stopped = true
    let owned = Array(channels.values)
    channels.removeAll(); connections.removeAll(); lock.unlock()
    owned.forEach { $0.close(promise: nil) }
  }
}

/// Both channels must share an event loop and have autoRead disabled. Reads resume
/// only while the destination is writable, so a slow peer cannot grow a queue.
internal final class TermforgeGlueHandler: ChannelDuplexHandler, @unchecked Sendable {
  typealias InboundIn = ByteBuffer
  typealias OutboundIn = ByteBuffer
  typealias OutboundOut = ByteBuffer
  private weak var partner: TermforgeGlueHandler?
  private var context: ChannelHandlerContext?

  private init() {}
  static func connect(_ first: Channel, _ second: Channel) -> EventLoopFuture<Void> {
    precondition(first.eventLoop === second.eventLoop)
    let a = TermforgeGlueHandler(), b = TermforgeGlueHandler()
    a.partner = b; b.partner = a
    return first.pipeline.addHandler(a).flatMap { second.pipeline.addHandler(b) }
  }
  private func readIfReady() {
    guard let context, context.channel.isActive,
          let peer = partner?.context, peer.channel.isActive, peer.channel.isWritable else { return }
    context.read()
  }
  func handlerAdded(context: ChannelHandlerContext) {
    self.context = context
    readIfReady(); partner?.readIfReady()
  }
  func handlerRemoved(context: ChannelHandlerContext) { self.context = nil; partner = nil }
  func channelActive(context: ChannelHandlerContext) {
    readIfReady(); partner?.readIfReady(); context.fireChannelActive()
  }
  func channelRead(context: ChannelHandlerContext, data: NIOAny) {
    guard let peer = partner?.context else { context.close(promise: nil); return }
    let promise = context.eventLoop.makePromise(of: Void.self)
    promise.futureResult.whenFailure { [weak self] _ in
      self?.context?.close(promise: nil); self?.partner?.context?.close(promise: nil)
    }
    peer.write(data, promise: promise)
  }
  func channelReadComplete(context: ChannelHandlerContext) {
    partner?.context?.flush(); readIfReady()
  }
  func channelWritabilityChanged(context: ChannelHandlerContext) {
    partner?.readIfReady(); context.fireChannelWritabilityChanged()
  }
  func channelInactive(context: ChannelHandlerContext) {
    partner?.context?.close(promise: nil); context.fireChannelInactive()
  }
  func errorCaught(context: ChannelHandlerContext, error: Error) {
    partner?.context?.close(promise: nil); context.close(promise: nil)
  }
}

/// Citadel's low-level reverse-forward API supplies raw SSHChannelData.
internal final class TermforgeForwardCodec: ChannelDuplexHandler {
  typealias InboundIn = SSHChannelData
  typealias InboundOut = ByteBuffer
  typealias OutboundIn = ByteBuffer
  typealias OutboundOut = SSHChannelData
  func channelRead(context: ChannelHandlerContext, data: NIOAny) {
    let message = unwrapInboundIn(data)
    guard message.type == .channel, case .byteBuffer(let bytes) = message.data else {
      context.close(promise: nil); return
    }
    context.fireChannelRead(wrapInboundOut(bytes))
  }
  func write(context: ChannelHandlerContext, data: NIOAny, promise: EventLoopPromise<Void>?) {
    context.write(wrapOutboundOut(SSHChannelData(type: .channel, data: .byteBuffer(unwrapOutboundIn(data)))), promise: promise)
  }
}

/// Own the socket before authentication starts, including failed/cancelled handshakes.
internal enum TermforgeSSHTransport {
  static func connect(settings: SSHClientSettings, owned: TermforgeForwardChannels, jump: SSHClient? = nil) async throws -> SSHClient {
    try await withTaskCancellationHandler {
      let channel: Channel
      if let jump {
        channel = try await jump.createDirectTCPIPChannel(using: .init(targetHost: settings.host, targetPort: settings.port, originatorAddress: SocketAddress(ipAddress: "127.0.0.1", port: 0))) { channel in
          guard owned.add(channel) else { return channel.eventLoop.makeFailedFuture(CancellationError()) }
          return channel.setOption(ChannelOptions.autoRead, value: false)
        }
      } else {
        channel = try await ClientBootstrap(group: settings.group)
          .connectTimeout(settings.connectTimeout)
          .channelOption(ChannelOptions.autoRead, value: false)
          .channelInitializer { channel in
            guard owned.add(channel) else { return channel.eventLoop.makeFailedFuture(CancellationError()) }
            return channel.eventLoop.makeSucceededVoidFuture()
          }.connect(host: settings.host, port: settings.port).get()
      }
      do {
        try Task.checkCancellation()
        return try await SSHClient.connect(on: channel, settings: settings)
      } catch { try? await channel.close().get(); throw error }
    } onCancel: { owned.close() }
  }
}
