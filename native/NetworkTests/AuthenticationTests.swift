import Foundation
import XCTest
import NIO
@preconcurrency import NIOSSH
import Citadel
@testable import TermforgeNetworkSecurity

final class AuthenticationTests: XCTestCase, @unchecked Sendable {
  private struct ServerAuth: NIOSSHServerUserAuthenticationDelegate {
    let password: String
    var supportedAuthenticationMethods: NIOSSHAvailableUserAuthenticationMethods { .password }
    func requestReceived(request: NIOSSHUserAuthenticationRequest, responsePromise: EventLoopPromise<NIOSSHUserAuthenticationOutcome>) {
      if case .password(let offered) = request.request, offered.password == password { responsePromise.succeed(.success) }
      else { responsePromise.succeed(.failure) }
    }
  }
  private final class ClientAuth: NIOSSHClientServerAuthenticationDelegate, NIOSSHClientUserAuthenticationDelegate, @unchecked Sendable {
    let expected: NIOSSHPublicKey
    let password: String
    let delay: TimeAmount
    private let lock = NSLock()
    private var approved = false
    private var requests = 0
    var requestCount: Int { lock.lock(); defer { lock.unlock() }; return requests }
    init(expected: NIOSSHPublicKey, password: String, delay: TimeAmount) { self.expected = expected; self.password = password; self.delay = delay }
    func validateHostKey(hostKey: NIOSSHPublicKey, validationCompletePromise: EventLoopPromise<Void>) {
      guard hostKey == expected else { validationCompletePromise.fail(CancellationError()); return }
      lock.lock(); approved = true; lock.unlock()
      validationCompletePromise.succeed(())
    }
    func nextAuthenticationType(availableMethods: NIOSSHAvailableUserAuthenticationMethods, nextChallengePromise: EventLoopPromise<NIOSSHUserAuthenticationOffer?>) {
      lock.lock(); let allowed = approved && requests == 0; requests += 1; lock.unlock()
      guard allowed else { nextChallengePromise.fail(CancellationError()); return }
      nextChallengePromise.futureResult.eventLoop.scheduleTask(in: delay) {
        nextChallengePromise.succeed(.init(username: "fixture", serviceName: "", offer: .password(.init(password: self.password))))
      }
    }
  }
  private func withServer(_ body: (SSHClientSettings, NIOSSHPublicKey, String) async throws -> Void) async throws {
    let group = MultiThreadedEventLoopGroup(numberOfThreads: 1)
    let channels = TermforgeForwardChannels()
    let hostKey = NIOSSHPrivateKey(ed25519Key: .init())
    let password = UUID().uuidString
    let server = try await ServerBootstrap(group: group).childChannelInitializer { channel in
      _ = channels.add(channel)
      return channel.pipeline.addHandler(NIOSSHHandler(role: .server(.init(hostKeys: [hostKey], userAuthDelegate: ServerAuth(password: password))), allocator: channel.allocator, inboundChildChannelInitializer: { child, type in
        guard case .directTCPIP(let target) = type, target.targetHost == "127.0.0.1", channels.add(child) else { return child.eventLoop.makeFailedFuture(CancellationError()) }
        return child.setOption(ChannelOptions.autoRead, value: false).flatMap {
          child.pipeline.addHandler(TermforgeForwardCodec())
        }.flatMap {
          ClientBootstrap(group: child.eventLoop).channelOption(ChannelOptions.autoRead, value: false)
            .connect(host: target.targetHost, port: target.targetPort)
        }.flatMap { local in
          guard channels.add(local) else { return child.eventLoop.makeFailedFuture(CancellationError()) }
          return TermforgeGlueHandler.connect(child, local)
        }
      }))
    }.bind(host: "127.0.0.1", port: 0).get()
    var settings = SSHClientSettings(host: "127.0.0.1", port: try XCTUnwrap(server.localAddress?.port), authenticationMethod: { .passwordBased(username: "fixture", password: password) }, hostKeyValidator: .trustedKeys([hostKey.publicKey]))
    settings.group = group
    do {
      try await body(settings, hostKey.publicKey, password)
      channels.close(); try await server.close().get(); try await group.shutdownGracefully()
    } catch {
      channels.close(); try? await server.close().get(); try? await group.shutdownGracefully(); throw error
    }
  }
  func testInteractiveAuthenticationCanExceedUpstreamTenSecondLimit() async throws {
    try await withServer { original, hostKey, password in
      let auth = ClientAuth(expected: hostKey, password: password, delay: .seconds(11))
      var settings = original
      settings.loginTimeout = .seconds(20)
      settings.hostKeyValidator = .custom(auth)
      settings.authenticationMethod = { .custom(auth) }
      let owned = TermforgeForwardChannels()
      defer { owned.close() }
      let client = try await TermforgeSSHTransport.connect(settings: settings, owned: owned)
      XCTAssertTrue(client.isConnected)
      XCTAssertEqual(auth.requestCount, 1)
      try await client.close()
    }
  }
  func testOwnedTransportAuthenticatesThroughBastion() async throws {
    try await withServer { settings, _, _ in
      let owned = TermforgeForwardChannels()
      defer { owned.close() }
      let bastion = try await TermforgeSSHTransport.connect(settings: settings, owned: owned)
      let target = try await TermforgeSSHTransport.connect(settings: settings, owned: owned, jump: bastion)
      XCTAssertTrue(target.isConnected)
      try await target.close(); try await bastion.close()
    }
  }

  func testWrongHostNeverRequestsCredentials() async throws {
    try await withServer { original, _, password in
      let auth = ClientAuth(expected: NIOSSHPrivateKey(ed25519Key: .init()).publicKey, password: password, delay: .milliseconds(0))
      var settings = original
      settings.hostKeyValidator = .custom(auth); settings.authenticationMethod = { .custom(auth) }
      let owned = TermforgeForwardChannels()
      defer { owned.close() }
      do { _ = try await TermforgeSSHTransport.connect(settings: settings, owned: owned); XCTFail("Changed host accepted") }
      catch { XCTAssertEqual(auth.requestCount, 0) }
    }
  }
}
