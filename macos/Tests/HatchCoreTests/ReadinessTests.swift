import Foundation
import Testing
@testable import HatchCore

@Suite(.serialized) struct ReadinessTests {
  func launch(_ config: ServerConfig) throws -> Process {
    let p = Process()
    p.executableURL = config.node
    p.arguments = [config.serverJS.path]
    p.environment = config.environment(base: ProcessInfo.processInfo.environment)
    p.standardOutput = FileHandle.nullDevice
    p.standardError = FileHandle.nullDevice
    try p.run()
    return p
  }

  @Test func 비밀값이_맞으면_준비됨() async throws {
    let config = try FakeServer.config()
    let p = try launch(config)
    defer { p.terminate() }
    #expect(await Readiness.wait(base: config.baseURL, token: config.token, timeout: 10))
  }

  @Test func 비밀값이_틀리면_시간이_다_돼도_아님() async throws {
    let config = try FakeServer.config()
    let p = try launch(config)
    defer { p.terminate() }
    #expect(await Readiness.wait(base: config.baseURL, token: "wrong", timeout: 1.5) == false)
  }

  @Test func 서버가_없으면_아님() async throws {
    let port = try PortPicker.freePort()
    #expect(await Readiness.wait(base: URL(string: "http://127.0.0.1:\(port)")!, token: "x", timeout: 1) == false)
  }
}
