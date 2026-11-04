import Foundation
import Testing
@testable import HatchCore

@Suite(.serialized) struct ServerProcessTests {
  func makeLog() throws -> LogWriter {
    try LogWriter(url: FileManager.default.temporaryDirectory.appending(path: "hatch-sp-\(UUID().uuidString)/server.log"))
  }

  @Test func 켜고_준비되면_로그에_남고_끄면_멈춘다() async throws {
    let log = try makeLog()
    let config = try FakeServer.config()
    let server = ServerProcess(log: log)
    try server.start(config)
    #expect(await Readiness.wait(base: config.baseURL, token: config.token, timeout: 10))
    #expect(server.isRunning)
    server.stop()
    #expect(server.isRunning == false)
    try await Task.sleep(for: .milliseconds(200))
    log.close()
    #expect(try String(contentsOf: log.url, encoding: .utf8).contains("ready \(config.port)"))
  }

  @Test func SIGTERM을_무시하면_SIGKILL로_끈다() async throws {
    let config = try FakeServer.config()
    let server = ServerProcess(log: try makeLog())
    try server.start(config, base: ProcessInfo.processInfo.environment.merging(["FAKE_SERVER": "ignore-term"]) { $1 })
    #expect(await Readiness.wait(base: config.baseURL, token: config.token, timeout: 10))
    let started = Date()
    server.stop(grace: 0.5)
    #expect(server.isRunning == false)
    #expect(Date().timeIntervalSince(started) < 3)
  }

  @Test func 혼자_죽으면_종료_코드를_알린다() async throws {
    let config = try FakeServer.config()
    let server = ServerProcess(log: try makeLog())
    let code = await withCheckedContinuation { (done: CheckedContinuation<Int32, Never>) in
      server.onUnexpectedExit = { done.resume(returning: $0) }
      do {
        try server.start(config, base: ProcessInfo.processInfo.environment.merging(["FAKE_SERVER": "crash"]) { $1 })
      } catch {
        done.resume(returning: -1)
      }
    }
    #expect(code == 3)
    #expect(server.isRunning == false)
  }

  @Test func 끈_것은_죽음으로_알리지_않는다() async throws {
    let config = try FakeServer.config()
    let server = ServerProcess(log: try makeLog())
    let called = Locked(false)
    server.onUnexpectedExit = { _ in called.set(true) }
    try server.start(config)
    #expect(await Readiness.wait(base: config.baseURL, token: config.token, timeout: 10))
    server.stop()
    try await Task.sleep(for: .milliseconds(300))
    #expect(called.get() == false)
  }

  @Test func 두_번_켜면_거절() throws {
    let config = try FakeServer.config()
    let server = ServerProcess(log: try makeLog())
    try server.start(config)
    defer { server.stop() }
    #expect(throws: ServerProcess.Failure.alreadyRunning) { try server.start(config) }
  }
}

/// 테스트에서 다른 스레드가 쓴 값을 읽는 작은 상자
final class Locked<T: Sendable>: @unchecked Sendable {
  private let lock = NSLock()
  private var value: T
  init(_ value: T) { self.value = value }
  func set(_ v: T) { lock.withLock { value = v } }
  func get() -> T { lock.withLock { value } }
}
