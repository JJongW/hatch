import Foundation

/// 번들 안 Next 서버(node server.js) 하나를 맡는다 (spec §1, §5)
public final class ServerProcess: @unchecked Sendable {
  public enum Failure: Error, Equatable { case alreadyRunning }

  private let log: LogWriter
  private let lock = NSLock()
  private var process: Process?
  private var stopping = false
  private var exitHandler: (@Sendable (Int32) -> Void)?

  public init(log: LogWriter) { self.log = log }

  /// stop()으로 끈 게 아닌데 끝나면 종료 코드와 함께 부른다. 아무 스레드에서나 불린다
  public var onUnexpectedExit: (@Sendable (Int32) -> Void)? {
    get { lock.withLock { exitHandler } }
    set { lock.withLock { exitHandler = newValue } }
  }

  public var isRunning: Bool { lock.withLock { process?.isRunning ?? false } }

  public func start(_ config: ServerConfig, base: [String: String] = ProcessInfo.processInfo.environment) throws {
    try lock.withLock {
      guard process == nil else { throw Failure.alreadyRunning }
      let p = Process()
      p.executableURL = config.node
      p.arguments = [config.serverJS.path]
      p.currentDirectoryURL = config.serverJS.deletingLastPathComponent()
      p.environment = config.environment(base: base)
      let pipe = Pipe()
      p.standardOutput = pipe
      p.standardError = pipe
      let log = self.log
      pipe.fileHandleForReading.readabilityHandler = { handle in
        let data = handle.availableData
        if !data.isEmpty { log.append(data) }
      }
      p.terminationHandler = { [weak self] ended in self?.didExit(ended, pipe: pipe) }
      stopping = false
      try p.run()
      process = p
    }
  }

  /// SIGTERM을 보내고 grace초 안에 안 끝나면 SIGKILL (spec §1)
  public func stop(grace: TimeInterval = 3) {
    let target: Process? = lock.withLock {
      stopping = true
      return process
    }
    guard let target, target.isRunning else { return }
    target.terminate()
    let deadline = Date().addingTimeInterval(grace)
    while target.isRunning && Date() < deadline { Thread.sleep(forTimeInterval: 0.05) }
    if target.isRunning {
      kill(target.processIdentifier, SIGKILL)
      target.waitUntilExit()
    }
    lock.withLock { if process === target { process = nil } }
  }

  private func didExit(_ ended: Process, pipe: Pipe) {
    pipe.fileHandleForReading.readabilityHandler = nil
    let (expected, handler): (Bool, (@Sendable (Int32) -> Void)?) = lock.withLock {
      if process === ended { process = nil }
      return (stopping, exitHandler)
    }
    if !expected { handler?(ended.terminationStatus) }
  }
}
