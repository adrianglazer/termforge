internal import NIO

internal final class TermforgeGlueHandler: ChannelDuplexHandler, @unchecked Sendable {
  typealias InboundIn = NIOAny
  typealias OutboundIn = NIOAny
  typealias OutboundOut = NIOAny

  private weak var partner: TermforgeGlueHandler?
  private var context: ChannelHandlerContext?

  private init() {}

  static func matchedPair() -> (TermforgeGlueHandler, TermforgeGlueHandler) {
    let first = TermforgeGlueHandler()
    let second = TermforgeGlueHandler()
    first.partner = second
    second.partner = first
    return (first, second)
  }

  func handlerAdded(context: ChannelHandlerContext) { self.context = context }
  func handlerRemoved(context: ChannelHandlerContext) { self.context = nil; partner = nil }
  func channelRead(context: ChannelHandlerContext, data: NIOAny) { partner?.context?.write(data, promise: nil) }
  func channelReadComplete(context: ChannelHandlerContext) { partner?.context?.flush() }
  func channelInactive(context: ChannelHandlerContext) { partner?.context?.close(promise: nil) }
  func errorCaught(context: ChannelHandlerContext, error: Error) { partner?.context?.close(promise: nil); context.close(promise: nil) }
}
