import Foundation

/// 번들 안 Next 서버(node server.js) 하나를 맡는다 (spec §1, §5)
public final class ServerProcess: @unchecked Sendable {
  public enum Failure: Error, Equatable { case alreadyRunning }

  private let log: LogWriter
  private let lock = NSLock()
  /// 지금 맡은 프로세스. stop()이 가져가면 nil이 되고, 그 프로세스의 종료는 알리지 않는다
  private var process: Process?
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
      // 끝(EOF)까지 읽고 스스로 손을 뗀다. 프로세스가 끝난 뒤 남은 출력도 받는다
      pipe.fileHandleForReading.readabilityHandler = { handle in
        let data = handle.availableData
        if data.isEmpty {
          handle.readabilityHandler = nil
        } else {
          log.append(data)
        }
      }
      // 같은 lock을 잡으므로, run() 직후 죽어도 process = p 뒤에 처리된다
      p.terminationHandler = { [weak self] ended in self?.didExit(ended) }
      do {
        try p.run()
      } catch {
        pipe.fileHandleForReading.readabilityHandler = nil
        throw error
      }
      process = p
    }
  }

  /// SIGTERM을 보내고 grace초 안에 안 끝나면 SIGKILL (spec §1)
  public func stop(grace: TimeInterval = 3) {
    // 먼저 가져가 둔다. 늦게 오는 didExit는 이 프로세스를 자기 것이 아니라고 보고 알리지 않는다
    let target: Process? = lock.withLock {
      defer { process = nil }
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
  }

  /// 아직 맡고 있는 프로세스가 끝났을 때만 알린다. stop()이 가져간 것은 끈 것이다
  private func didExit(_ ended: Process) {
    let handler: (@Sendable (Int32) -> Void)? = lock.withLock {
      guard process === ended else { return nil }
      process = nil
      return exitHandler
    }
    handler?(ended.terminationStatus)
  }
}
