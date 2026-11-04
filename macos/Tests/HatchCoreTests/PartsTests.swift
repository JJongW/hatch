import Foundation
import Testing
@testable import HatchCore

@Suite struct AppTokenTests {
  @Test func 비밀값은_16진수_64자이고_매번_다르다() {
    let a = AppToken.make()
    let b = AppToken.make()
    #expect(a.count == 64)
    #expect(a.allSatisfy { "0123456789abcdef".contains($0) })
    #expect(a != b)
  }
}

@Suite struct PortPickerTests {
  @Test func 빈_포트는_1024보다_크다() throws {
    let port = try PortPicker.freePort()
    #expect(port > 1023 && port < 65536)
  }
}

@Suite struct ServerConfigTests {
  let config = ServerConfig(
    node: URL(fileURLWithPath: "/opt/homebrew/bin/node"),
    serverJS: URL(fileURLWithPath: "/Applications/Hatch.app/Contents/Resources/hatch/server.js"),
    dataDir: URL(fileURLWithPath: "/Users/me/Hatch"),
    claudeBin: "/Users/me/.local/bin/claude",
    port: 51234,
    token: String(repeating: "a", count: 64)
  )

  @Test func 서버에_넘길_값을_채운다() {
    let env = config.environment(base: ["PATH": "/usr/bin", "HOME": "/Users/me"])
    #expect(env["HOSTNAME"] == "127.0.0.1")
    #expect(env["PORT"] == "51234")
    #expect(env["NODE_ENV"] == "production")
    #expect(env["HATCH_DATA_DIR"] == "/Users/me/Hatch")
    #expect(env["HATCH_APP_TOKEN"] == String(repeating: "a", count: 64))
    #expect(env["HATCH_CLAUDE_BIN"] == "/Users/me/.local/bin/claude")
    #expect(env["PATH"] == "/usr/bin")
  }

  @Test func 앱_밖의_HATCH_값은_넘기지_않는다() {
    let env = config.environment(base: ["HATCH_DEMO": "1", "HATCH_PUBLISH_TOKEN": "secret", "HATCH_APP_DATA_DIR": "/tmp/x"])
    #expect(env["HATCH_DEMO"] == nil)
    #expect(env["HATCH_PUBLISH_TOKEN"] == nil)
    #expect(env["HATCH_APP_DATA_DIR"] == nil)
  }

  @Test func claude_경로가_없으면_넣지_않는다() {
    var c = config
    c.claudeBin = nil
    #expect(c.environment(base: [:])["HATCH_CLAUDE_BIN"] == nil)
  }

  @Test func 주소는_127_0_0_1() {
    #expect(config.baseURL.absoluteString == "http://127.0.0.1:51234")
  }
}

@Suite struct NodeLocatorTests {
  let resources = URL(fileURLWithPath: "/App/Contents/Resources")

  @Test func 번들_node가_먼저() {
    let found = NodeLocator.find(resources: resources) { _ in true }
    #expect(found?.path == "/App/Contents/Resources/node")
  }

  @Test func 번들에_없으면_홈브루_그다음_usr_local() {
    #expect(NodeLocator.find(resources: resources) { $0 == "/opt/homebrew/bin/node" || $0 == "/usr/local/bin/node" }?.path == "/opt/homebrew/bin/node")
    #expect(NodeLocator.find(resources: resources) { $0 == "/usr/local/bin/node" }?.path == "/usr/local/bin/node")
  }

  @Test func 아무것도_없으면_nil() {
    #expect(NodeLocator.find(resources: nil) { _ in false } == nil)
  }
}

@Suite struct CrashPolicyTests {
  @Test func 처음은_조용히_1분_안에_또면_오류() {
    var p = CrashPolicy()
    let t0 = Date(timeIntervalSince1970: 1000)
    #expect(p.onCrash(at: t0) == .restartQuietly)
    #expect(p.onCrash(at: t0.addingTimeInterval(30)) == .showError)
  }

  @Test func `1분이_지나면_다시_조용히`() {
    var p = CrashPolicy()
    let t0 = Date(timeIntervalSince1970: 1000)
    _ = p.onCrash(at: t0)
    #expect(p.onCrash(at: t0.addingTimeInterval(61)) == .restartQuietly)
  }

  @Test func 사용자가_다시_시작하면_처음부터() {
    var p = CrashPolicy()
    let t0 = Date(timeIntervalSince1970: 1000)
    _ = p.onCrash(at: t0)
    p.reset()
    #expect(p.onCrash(at: t0.addingTimeInterval(1)) == .restartQuietly)
  }
}
