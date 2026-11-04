import Foundation

public struct ServerConfig: Sendable, Equatable {
  public var node: URL
  public var serverJS: URL
  public var dataDir: URL
  public var claudeBin: String?
  public var port: Int
  public var token: String

  public init(node: URL, serverJS: URL, dataDir: URL, claudeBin: String?, port: Int, token: String) {
    self.node = node
    self.serverJS = serverJS
    self.dataDir = dataDir
    self.claudeBin = claudeBin
    self.port = port
    self.token = token
  }

  public var baseURL: URL { URL(string: "http://127.0.0.1:\(port)")! }

  /// 앱 프로세스의 환경을 바탕으로 서버 환경을 만든다 (spec §1-1).
  /// 앱 밖에서 들어온 HATCH_ 값(데모, 발행 토큰, 개발용 덮어쓰기)은 모두 빼고 앱이 정한 값만 넣는다
  public func environment(base: [String: String]) -> [String: String] {
    var env = base.filter { !$0.key.hasPrefix("HATCH_") }
    env["HOSTNAME"] = "127.0.0.1"
    env["PORT"] = String(port)
    env["NODE_ENV"] = "production"
    env["HATCH_DATA_DIR"] = dataDir.path
    env["HATCH_APP_TOKEN"] = token
    if let claudeBin { env["HATCH_CLAUDE_BIN"] = claudeBin }
    return env
  }
}
