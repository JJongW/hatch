import Foundation
import Testing
@testable import HatchCore

enum FakeServer {
  static var script: URL { Bundle.module.url(forResource: "fake-server", withExtension: "mjs", subdirectory: "Fixtures")! }
  static var node: URL? { NodeLocator.find(resources: nil) }

  /// 테스트 하나가 쓸 설정. 데이터 폴더는 가짜 서버가 안 쓰니 임시 경로만 넘긴다
  static func config(token: String = AppToken.make()) throws -> ServerConfig {
    ServerConfig(
      node: try #require(node),
      serverJS: script,
      dataDir: FileManager.default.temporaryDirectory,
      claudeBin: nil,
      port: try PortPicker.freePort(),
      token: token
    )
  }
}
