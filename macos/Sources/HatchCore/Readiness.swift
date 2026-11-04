import Foundation

public enum Readiness {
  public static let tokenHeader = "x-hatch-app-token"

  /// /api/app/status가 200을 줄 때까지 기다린다 (spec §1). 비밀값까지 맞아야 200이라 "앱이 켠 그 서버"인지도 같이 확인된다
  public static func wait(base: URL, token: String, timeout: TimeInterval = 30, interval: TimeInterval = 0.25) async -> Bool {
    let url = base.appending(path: "api/app/status")
    let session = URLSession(configuration: .ephemeral)
    defer { session.invalidateAndCancel() }
    let deadline = Date().addingTimeInterval(timeout)
    while Date() < deadline {
      var request = URLRequest(url: url)
      request.setValue(token, forHTTPHeaderField: tokenHeader)
      request.timeoutInterval = 2
      if let (_, response) = try? await session.data(for: request), (response as? HTTPURLResponse)?.statusCode == 200 {
        return true
      }
      try? await Task.sleep(for: .seconds(interval))
    }
    return false
  }
}
