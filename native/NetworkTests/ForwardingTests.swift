import XCTest
import NIO
import NIOEmbedded
import NIOSSH
@testable import TermforgeNetworkSecurity

final class ForwardingTests: XCTestCase {
  func testReverseCodecPreservesBytes() throws {
    let channel = EmbeddedChannel(handler: TermforgeForwardCodec())
    let bytes = ByteBuffer(string: "hello\0world")
    try channel.writeInbound(SSHChannelData(type: .channel, data: .byteBuffer(bytes)))
    XCTAssertEqual(try channel.readInbound(as: ByteBuffer.self), bytes)
    try channel.writeOutbound(bytes)
    let message = try XCTUnwrap(channel.readOutbound(as: SSHChannelData.self))
    guard case .byteBuffer(let written) = message.data else { return XCTFail("Wrong payload") }
    XCTAssertEqual(written, bytes)
    _ = try channel.finish()
  }

  func testConnectionCapAndStopCloseChildrenIncludingLateArrivals() throws {
    let owner = TermforgeForwardChannels()
    let loop = EmbeddedEventLoop()
    var channels: [EmbeddedChannel] = []
    for _ in 0..<16 {
      let channel = EmbeddedChannel(loop: loop)
      XCTAssertTrue(owner.add(channel, connection: true)); channels.append(channel)
    }
    let excess = EmbeddedChannel(loop: loop)
    XCTAssertFalse(owner.add(excess, connection: true))
    owner.close()
    let late = EmbeddedChannel(loop: loop)
    XCTAssertFalse(owner.add(late))
    loop.run()
    for channel in channels + [excess, late] { XCTAssertNoThrow(try channel.closeFuture.wait()) }
  }

  private final class ReadCounter: ChannelOutboundHandler, @unchecked Sendable {
    typealias OutboundIn = ByteBuffer
    var reads = 0
    func read(context: ChannelHandlerContext) { reads += 1 }
  }

  func testSlowPeerStopsReadsUntilWritable() throws {
    let loop = EmbeddedEventLoop()
    let counter = ReadCounter()
    let a = EmbeddedChannel(handler: counter, loop: loop), b = EmbeddedChannel(loop: loop)
    try a.connect(to: SocketAddress(ipAddress: "127.0.0.1", port: 1)).wait()
    try b.connect(to: SocketAddress(ipAddress: "127.0.0.1", port: 2)).wait()
    b.isWritable = false
    try TermforgeGlueHandler.connect(a, b).wait()
    let before = counter.reads
    a.pipeline.fireChannelReadComplete()
    XCTAssertEqual(counter.reads, before)
    b.isWritable = true
    b.pipeline.fireChannelWritabilityChanged()
    XCTAssertGreaterThan(counter.reads, before)
    _ = try a.finish(); XCTAssertNoThrow(try b.closeFuture.wait())
  }

  func testGluePreservesBytesAndClosesBothSides() throws {
    let loop = EmbeddedEventLoop()
    let a = EmbeddedChannel(loop: loop), b = EmbeddedChannel(loop: loop)
    try TermforgeGlueHandler.connect(a, b).wait()
    let bytes = ByteBuffer(string: "forwarded payload")
    try a.writeInbound(bytes)
    XCTAssertEqual(try b.readOutbound(as: ByteBuffer.self), bytes)
    try a.close().wait()
    loop.run()
    XCTAssertNoThrow(try b.closeFuture.wait())
  }
}
