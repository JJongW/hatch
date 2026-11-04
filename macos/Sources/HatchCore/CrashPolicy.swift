import Foundation

/// 서버가 혼자 죽었을 때 (spec §5). 처음은 조용히 다시 켜고, 1분 안에 또 죽으면 오류 화면
public struct CrashPolicy: Sendable {
  public enum Decision: Equatable, Sendable { case restartQuietly, showError }

  public let window: TimeInterval
  private var lastCrash: Date?

  public init(window: TimeInterval = 60) { self.window = window }

  public mutating func onCrash(at now: Date) -> Decision {
    defer { lastCrash = now }
    if let last = lastCrash, now.timeIntervalSince(last) < window { return .showError }
    return .restartQuietly
  }

  /// 사용자가 오류 화면에서 다시 시작을 누르면 처음부터 센다
  public mutating func reset() { lastCrash = nil }
}
