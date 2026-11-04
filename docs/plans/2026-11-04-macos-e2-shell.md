# macOS 앱 E2: 앱 뼈대 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 더블클릭하면 Hatch 창이 뜨는 서명 없는 `Hatch.app`. 앱이 번들 안의 Next 서버를 빈 포트로 켜고, 준비되면 창에 보여 주고, 서버가 죽거나 안 켜지면 오류 화면을 띄운다. 서버 출력은 로그 파일에 남긴다.

**Architecture:** `macos/`는 Swift 패키지 하나다. 로직은 `HatchCore`(라이브러리, `swift test`로 검사), 화면은 `Hatch`(SwiftUI 실행 파일). `macos/scripts/build.sh`가 E1의 standalone 빌드와 Swift 실행 파일, `Info.plist`를 `Hatch.app`으로 묶는다. Xcode 프로젝트 파일은 만들지 않는다. Node는 E6에서 번들에 넣고, E2에서는 시스템 Node(`/opt/homebrew/bin/node`, `/usr/local/bin/node`)를 쓴다.

**Tech Stack:** Swift 6.3 (swift-tools-version 6.0), SwiftUI, AppKit, WebKit(WKWebView), Swift Testing, Foundation `Process`. 새 의존성 없음.

spec: [docs/specs/2026-11-04-macos-app-design.md](../specs/2026-11-04-macos-app-design.md) §1, §1-1, §5, §6, §7 E2. E1(PR #139)의 `/api/app/status`와 `HATCH_STANDALONE=1` 빌드를 쓴다.

## Global Constraints
- GitHub CI(Actions)는 쓰지 않는다. 검증은 로컬에서: `npm run lint && npm run typecheck && npm test && npm run build`와 `cd macos && swift test`
- 모든 글(코드 주석, 화면 문구, 커밋, PR, 문서)에 가운데점(U+00B7)을 쓰지 않는다
- 화면 문구는 한국어, "-해요"체, 짧게
- 새 의존성 없음 (Swift 패키지 의존성도 E7 Sparkle 전까지 없음). Xcode 프로젝트 파일, xcodegen 같은 생성 도구를 쓰지 않는다
- 웹 버전과 Vercel 데모는 바뀌지 않는다. Next 쪽 코드는 이 PR에서 고치지 않는다
- 서버는 `127.0.0.1`에만 연다. 앱 비밀값은 로그와 화면에 쓰지 않는다
- 사용자 데이터 폴더 `~/Hatch`를 지우거나 옮기지 않는다. 검증은 `HATCH_APP_DATA_DIR`로 임시 폴더를 쓴다
- macOS 14 이상 (`platforms: [.macOS(.v14)]`, `LSMinimumSystemVersion 14.0`)
- 커밋 `<type>(macos): 내용 (#이슈)`, 끝에 실제로 쓴 모델 이름의 `Co-Authored-By:` 꼬리말
- PR 15파일, 400줄 안쪽. 머지는 사용자 승인 뒤 squash

## spec과 달라지는 것 (Task 7에서 spec에도 반영)
| spec | plan | 이유 |
| --- | --- | --- |
| §1 "Xcode 프로젝트" | Swift 패키지 + `build.sh`가 `.app`을 묶음 | 프로젝트 파일(pbxproj)은 손으로 고치기 어렵고 리뷰가 안 된다. 패키지는 `swift build`, `swift test`로 터미널에서 다 된다. 서명과 공증(E6)도 스크립트에서 한다 |
| §2-5 설정은 UserDefaults | E2는 설정이 없다. 개발 확인용 환경 변수 `HATCH_APP_DATA_DIR`, `HATCH_APP_CLAUDE_BIN`만 읽는다 | 설정 화면은 E3. 검증 때 사용자 `~/Hatch`를 건드리지 않으려고 |
| §5 만드는 중 ⌘Q 확인 | E5로 미룸 | 생성 중인지 알려면 status를 읽어야 하고, 그건 알림(E5)과 같이 만든다 |
| §9 proxy.ts Host 검사 | 후속 PR (#141) | Global Constraints대로 Next 코드는 이 PR에서 고치지 않는다. 앱 포트가 실행마다 바뀌어 지금 dev 서버(3000)보다 노출이 크지 않다 |

## 파일 지도
| 파일 | 할 일 |
| --- | --- |
| `macos/Package.swift` | 타깃 3개: `HatchCore`, `Hatch`, `HatchCoreTests` |
| `macos/Sources/HatchCore/AppToken.swift` | 앱 비밀값 만들기 |
| `macos/Sources/HatchCore/PortPicker.swift` | 127.0.0.1의 빈 포트 받기 |
| `macos/Sources/HatchCore/ServerConfig.swift` | 서버에 넘길 환경 변수, 주소 |
| `macos/Sources/HatchCore/NodeLocator.swift` | node 찾기 |
| `macos/Sources/HatchCore/CrashPolicy.swift` | 죽으면 다시 켤지, 오류 화면을 띄울지 |
| `macos/Sources/HatchCore/LogWriter.swift` | `~/Library/Logs/Hatch/server.log`, 5MB 넘으면 넘기기 |
| `macos/Sources/HatchCore/ServerProcess.swift` | node 프로세스 켜기, 끄기, 죽음 알리기 |
| `macos/Sources/HatchCore/Readiness.swift` | status 주소가 200을 줄 때까지 기다리기 |
| `macos/Sources/Hatch/HatchApp.swift` | `@main`, AppDelegate |
| `macos/Sources/Hatch/ServerController.swift` | 상태(켜는 중, 준비됨, 실패)와 다시 켜기 |
| `macos/Sources/Hatch/Views.swift` | 켜는 중 화면, 웹 화면, 오류 화면 |
| `macos/Tests/HatchCoreTests/*.swift` | Swift Testing |
| `macos/Tests/HatchCoreTests/Fixtures/fake-server.mjs` | 테스트용 가짜 서버 |
| `macos/Info.plist`, `macos/scripts/build.sh` | `.app` 묶기 |
| `macos/CLAUDE.md`, `CLAUDE.md`, `.gitignore`, spec, 결정 기록 | 문서 |

---

### Task 0: 이슈, 라벨, 브랜치

- [ ] **Step 1: 라벨과 이슈**

```bash
gh label create "area:macos" --color 1D76DB --description "E 맥 앱" 2>/dev/null || true
gh issue create --title "macOS 앱 E2: 앱 뼈대 (서버 띄우기, 창, 로그, 오류 화면)" --label "area:macos" --label "type:feat" \
  --body "spec docs/specs/2026-11-04-macos-app-design.md §7 E2. plan docs/plans/2026-11-04-macos-e2-shell.md. 서명 없는 Hatch.app, 시스템 Node 사용."
```
나온 번호를 아래에서 `<n>`으로 쓴다.

- [ ] **Step 2: 브랜치**

E1(PR #139)이 머지됐으면 `git switch main && git pull --ff-only` 뒤에, 아니면 `feat/138-macos-e1-next`에서 가른다.

```bash
git switch -c feat/<n>-macos-shell
```

---

### Task 1: 패키지와 작은 부품 (비밀값, 포트, 환경 변수, node 찾기, 다시 켜기 규칙)

**Files:**
- Create: `macos/Package.swift`, `macos/Sources/HatchCore/{AppToken,PortPicker,ServerConfig,NodeLocator,CrashPolicy}.swift`
- Create: `macos/Sources/Hatch/HatchApp.swift` (빈 껍데기, Task 5에서 채움)
- Test: `macos/Tests/HatchCoreTests/PartsTests.swift`

**Interfaces:**
- Produces:
  - `AppToken.make() -> String` (16진수 64자)
  - `PortPicker.freePort() throws -> Int`
  - `ServerConfig(node: URL, serverJS: URL, dataDir: URL, claudeBin: String?, port: Int, token: String)`, `.environment(base: [String: String]) -> [String: String]`, `.baseURL: URL`
  - `NodeLocator.find(resources: URL?, isExecutable: (String) -> Bool) -> URL?`
  - `CrashPolicy(window: TimeInterval = 60)`, `mutating onCrash(at: Date) -> CrashPolicy.Decision` (`.restartQuietly`, `.showError`), `mutating reset()`

- [ ] **Step 1: Package.swift**

```swift
// swift-tools-version: 6.0
import PackageDescription

// 맥 앱 (spec 2026-11-04-macos-app). Xcode 프로젝트 대신 패키지 하나. .app은 scripts/build.sh가 묶는다
let package = Package(
  name: "Hatch",
  platforms: [.macOS(.v14)],
  targets: [
    .target(name: "HatchCore"),
    .executableTarget(name: "Hatch", dependencies: ["HatchCore"]),
    .testTarget(name: "HatchCoreTests", dependencies: ["HatchCore"], resources: [.copy("Fixtures")]),
  ]
)
```

`macos/Sources/Hatch/HatchApp.swift` (Task 5에서 바꾼다. 지금은 빌드만 되게)

```swift
import SwiftUI

@main
struct HatchApp: App {
  var body: some Scene { WindowGroup("Hatch") { Text("Hatch") } }
}
```

`macos/Tests/HatchCoreTests/Fixtures/.gitkeep` 빈 파일 (Task 4에서 가짜 서버를 넣는다. 폴더가 없으면 패키지가 안 읽힌다)

- [ ] **Step 2: 실패하는 테스트**

`macos/Tests/HatchCoreTests/PartsTests.swift`

```swift
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

  @Test func 1분이_지나면_다시_조용히() {
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
```

- [ ] **Step 3: 실패 확인**

Run: `cd macos && swift test 2>&1 | tail -5`
Expected: 컴파일 실패, `cannot find 'AppToken' in scope` 같은 오류

- [ ] **Step 4: 구현**

`AppToken.swift`

```swift
import Foundation
import Security

public enum AppToken {
  /// 32바이트 난수를 16진수 64자로. 서버의 APP_TOKEN_MIN(32자)보다 길다 (spec §1-1)
  public static func make() -> String {
    var bytes = [UInt8](repeating: 0, count: 32)
    let status = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
    precondition(status == errSecSuccess, "SecRandomCopyBytes 실패")
    return bytes.map { String(format: "%02x", $0) }.joined()
  }
}
```

`PortPicker.swift`

```swift
import Darwin

public enum PortPicker {
  public enum Failure: Error { case socket, bind, name }

  /// 127.0.0.1에 포트 0으로 묶어 OS가 고른 빈 포트를 받는다. 소켓은 바로 닫는다 (서버가 곧 같은 포트를 연다)
  public static func freePort() throws -> Int {
    let fd = socket(AF_INET, SOCK_STREAM, 0)
    guard fd >= 0 else { throw Failure.socket }
    defer { close(fd) }
    var addr = sockaddr_in()
    addr.sin_len = UInt8(MemoryLayout<sockaddr_in>.size)
    addr.sin_family = sa_family_t(AF_INET)
    addr.sin_port = 0
    addr.sin_addr.s_addr = inet_addr("127.0.0.1")
    var len = socklen_t(MemoryLayout<sockaddr_in>.size)
    let bound = withUnsafePointer(to: &addr) {
      $0.withMemoryRebound(to: sockaddr.self, capacity: 1) { bind(fd, $0, len) }
    }
    guard bound == 0 else { throw Failure.bind }
    let named = withUnsafeMutablePointer(to: &addr) {
      $0.withMemoryRebound(to: sockaddr.self, capacity: 1) { getsockname(fd, $0, &len) }
    }
    guard named == 0 else { throw Failure.name }
    return Int(UInt16(bigEndian: addr.sin_port))
  }
}
```

`ServerConfig.swift`

```swift
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
```

`NodeLocator.swift`

```swift
import Foundation

public enum NodeLocator {
  /// 번들의 node가 먼저. 없으면 시스템 node (E2 개발용). E6에서 번들에 node가 늘 들어간다
  public static func find(
    resources: URL?,
    isExecutable: (String) -> Bool = { FileManager.default.isExecutableFile(atPath: $0) }
  ) -> URL? {
    let candidates = [resources?.appendingPathComponent("node").path, "/opt/homebrew/bin/node", "/usr/local/bin/node"]
    return candidates.compactMap { $0 }.first(where: isExecutable).map { URL(fileURLWithPath: $0) }
  }
}
```

`CrashPolicy.swift`

```swift
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
```

- [ ] **Step 5: 통과 확인**

Run: `cd macos && swift test 2>&1 | tail -5`
Expected: `Test run with 12 tests ... passed`

- [ ] **Step 6: 커밋**

```bash
git add macos/Package.swift macos/Sources macos/Tests
git commit -m "feat(macos): Swift 패키지와 비밀값, 포트, 서버 환경, node 찾기, 다시 켜기 규칙 (#<n>)

Co-Authored-By: <실제 모델> <noreply@anthropic.com>"
```

---

### Task 2: 로그 파일

**Files:**
- Create: `macos/Sources/HatchCore/LogWriter.swift`
- Test: `macos/Tests/HatchCoreTests/LogWriterTests.swift`

**Interfaces:**
- Produces: `LogWriter(url: URL, maxBytes: Int = 5 * 1024 * 1024) throws`, `append(_ data: Data)`, `close()`, `rotatedURL: URL` (`server.1.log`), `static defaultURL() -> URL` (`~/Library/Logs/Hatch/server.log`). `final class`, `@unchecked Sendable` (안쪽 잠금)

- [ ] **Step 1: 실패하는 테스트**

```swift
import Foundation
import Testing
@testable import HatchCore

@Suite struct LogWriterTests {
  func tempDir() throws -> URL {
    let dir = FileManager.default.temporaryDirectory.appending(path: "hatch-log-\(UUID().uuidString)")
    try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    return dir
  }

  @Test func 폴더가_없으면_만들고_이어_쓴다() throws {
    let dir = try tempDir()
    defer { try? FileManager.default.removeItem(at: dir) }
    let url = dir.appending(path: "Logs/Hatch/server.log")
    let log = try LogWriter(url: url)
    log.append(Data("첫 줄\n".utf8))
    log.close()
    let again = try LogWriter(url: url)
    again.append(Data("둘째 줄\n".utf8))
    again.close()
    #expect(try String(contentsOf: url, encoding: .utf8) == "첫 줄\n둘째 줄\n")
  }

  @Test func 한도를_넘으면_server_1_log로_넘기고_하나만_남긴다() throws {
    let dir = try tempDir()
    defer { try? FileManager.default.removeItem(at: dir) }
    let url = dir.appending(path: "server.log")
    let log = try LogWriter(url: url, maxBytes: 10)
    log.append(Data("12345678".utf8))
    log.append(Data("abcdef".utf8))
    log.append(Data("XYZXYZXYZ".utf8))
    log.close()
    #expect(log.rotatedURL.lastPathComponent == "server.1.log")
    #expect(try String(contentsOf: url, encoding: .utf8) == "XYZXYZXYZ")
    #expect(try String(contentsOf: log.rotatedURL, encoding: .utf8) == "abcdef")
  }

  @Test func 기본_위치는_Library_Logs_Hatch() {
    #expect(LogWriter.defaultURL().path.hasSuffix("/Library/Logs/Hatch/server.log"))
  }
}
```

- [ ] **Step 2: 실패 확인**

Run: `cd macos && swift test --filter LogWriterTests 2>&1 | tail -5`
Expected: 컴파일 실패, `cannot find 'LogWriter'`

- [ ] **Step 3: 구현**

```swift
import Foundation

/// 서버 stdout, stderr를 남기는 파일 (spec §5). 한도를 넘으면 server.1.log로 넘기고 그 하나만 남긴다
public final class LogWriter: @unchecked Sendable {
  public static let defaultMaxBytes = 5 * 1024 * 1024

  public let url: URL
  private let maxBytes: Int
  private let lock = NSLock()
  private var handle: FileHandle?

  public init(url: URL, maxBytes: Int = LogWriter.defaultMaxBytes) throws {
    self.url = url
    self.maxBytes = maxBytes
    try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
    try open()
  }

  public static func defaultURL() -> URL {
    FileManager.default.homeDirectoryForCurrentUser.appending(path: "Library/Logs/Hatch/server.log")
  }

  public var rotatedURL: URL { url.deletingPathExtension().appendingPathExtension("1.log") }

  public func append(_ data: Data) {
    lock.lock()
    defer { lock.unlock() }
    rotateIfNeeded(adding: data.count)
    try? handle?.write(contentsOf: data)
  }

  public func close() {
    lock.lock()
    defer { lock.unlock() }
    try? handle?.close()
    handle = nil
  }

  private func open() throws {
    if !FileManager.default.fileExists(atPath: url.path) {
      FileManager.default.createFile(atPath: url.path, contents: nil)
    }
    let h = try FileHandle(forWritingTo: url)
    try h.seekToEnd()
    handle = h
  }

  private func rotateIfNeeded(adding count: Int) {
    let size = ((try? FileManager.default.attributesOfItem(atPath: url.path))?[.size] as? Int) ?? 0
    guard size > 0, size + count > maxBytes else { return }
    try? handle?.close()
    handle = nil
    // 로그 파일 둘만 다룬다 (server.log, server.1.log). 사용자 데이터가 아니다
    try? FileManager.default.removeItem(at: rotatedURL)
    try? FileManager.default.moveItem(at: url, to: rotatedURL)
    try? open()
  }
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd macos && swift test --filter LogWriterTests 2>&1 | tail -3`
Expected: 3개 통과

- [ ] **Step 5: 커밋**

```bash
git add macos/Sources/HatchCore/LogWriter.swift macos/Tests/HatchCoreTests/LogWriterTests.swift
git commit -m "feat(macos): 서버 로그 파일과 5MB 넘기기 (#<n>)

Co-Authored-By: <실제 모델> <noreply@anthropic.com>"
```

---

### Task 3: 준비 확인 (status 주소 기다리기)

**Files:**
- Create: `macos/Sources/HatchCore/Readiness.swift`
- Create: `macos/Tests/HatchCoreTests/Fixtures/fake-server.mjs` (`.gitkeep` 지움)
- Test: `macos/Tests/HatchCoreTests/ReadinessTests.swift`, `macos/Tests/HatchCoreTests/FakeServer.swift`

**Interfaces:**
- Produces: `Readiness.wait(base: URL, token: String, timeout: TimeInterval = 30, interval: TimeInterval = 0.25) async -> Bool`, 머리 이름 상수 `Readiness.tokenHeader = "x-hatch-app-token"`
- 테스트 도우미 `FakeServer.script: URL`, `FakeServer.node: URL?` (Task 4도 쓴다)

- [ ] **Step 1: 가짜 서버**

`macos/Tests/HatchCoreTests/Fixtures/fake-server.mjs`

```js
// 테스트용 가짜 Hatch 서버. FAKE_SERVER 값으로 동작을 고른다
// ok: status에 비밀값이 맞으면 200 / crash: 바로 3으로 끝남 / ignore-term: SIGTERM을 무시 (SIGKILL 확인용)
import http from 'node:http';

const mode = process.env.FAKE_SERVER ?? 'ok';
if (mode === 'crash') {
  console.error('boom');
  process.exit(3);
}
if (mode === 'ignore-term') process.on('SIGTERM', () => console.log('ignored SIGTERM'));

const server = http.createServer((req, res) => {
  const ok = req.url === '/api/app/status' && req.headers['x-hatch-app-token'] === process.env.HATCH_APP_TOKEN;
  res.writeHead(ok ? 200 : 401, { 'content-type': 'application/json' });
  res.end(ok ? '{"ok":true}' : '{"ok":false}');
});
server.listen(Number(process.env.PORT), process.env.HOSTNAME, () => console.log(`ready ${process.env.PORT}`));
```

`macos/Tests/HatchCoreTests/FakeServer.swift`

```swift
import Foundation
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
```
`#require`를 쓰려면 `import Testing`도 넣는다.

- [ ] **Step 2: 실패하는 테스트**

`ReadinessTests.swift`

```swift
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
```

Run: `cd macos && swift test --filter ReadinessTests 2>&1 | tail -5`
Expected: 컴파일 실패, `cannot find 'Readiness'`

- [ ] **Step 3: 구현**

```swift
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
```

- [ ] **Step 4: 통과 확인**

Run: `cd macos && swift test --filter ReadinessTests 2>&1 | tail -3`
Expected: 3개 통과

- [ ] **Step 5: 커밋**

```bash
git add macos/Sources/HatchCore/Readiness.swift macos/Tests
git commit -m "feat(macos): 서버 준비 확인과 테스트용 가짜 서버 (#<n>)

Co-Authored-By: <실제 모델> <noreply@anthropic.com>"
```

---

### Task 4: 서버 프로세스

**Files:**
- Create: `macos/Sources/HatchCore/ServerProcess.swift`
- Test: `macos/Tests/HatchCoreTests/ServerProcessTests.swift`

**Interfaces:**
- Consumes: Task 1 `ServerConfig`, Task 2 `LogWriter`, Task 3 `Readiness`, `FakeServer`
- Produces: `ServerProcess(log: LogWriter)`, `start(_ config: ServerConfig, base: [String: String] = ProcessInfo.processInfo.environment) throws`, `stop(grace: TimeInterval = 3)`, `isRunning: Bool`, `onUnexpectedExit: (@Sendable (Int32) -> Void)?` (`stop`으로 끈 것은 알리지 않는다). `final class`, `@unchecked Sendable`

- [ ] **Step 1: 실패하는 테스트**

```swift
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
```

Run: `cd macos && swift test --filter ServerProcessTests 2>&1 | tail -5`
Expected: 컴파일 실패, `cannot find 'ServerProcess'`

- [ ] **Step 2: 구현**

```swift
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
```

- [ ] **Step 3: 통과 확인**

Run: `cd macos && swift test 2>&1 | tail -3`
Expected: 전체 통과 (24개 안팎), 경고 없음

- [ ] **Step 4: 커밋**

```bash
git add macos/Sources/HatchCore/ServerProcess.swift macos/Tests/HatchCoreTests/ServerProcessTests.swift
git commit -m "feat(macos): 서버 프로세스 켜기, 끄기, 혼자 죽으면 알리기 (#<n>)

Co-Authored-By: <실제 모델> <noreply@anthropic.com>"
```

---

### Task 5: 앱 화면 (켜는 중, 웹 화면, 오류 화면)

**Files:**
- Modify: `macos/Sources/Hatch/HatchApp.swift`
- Create: `macos/Sources/Hatch/ServerController.swift`, `macos/Sources/Hatch/Views.swift`

**Interfaces:**
- Consumes: Task 1~4 전부
- Produces: `ServerController` (`@MainActor`, `ObservableObject`), `state: .starting | .ready(URL) | .failed(String)`, `start()`, `restart()`, `stop()`, `openLog()`

- [ ] **Step 1: ServerController.swift**

```swift
import AppKit
import Foundation
import HatchCore

/// 서버 하나의 생명 주기와 창에 보일 상태 (spec §1, §5)
@MainActor
final class ServerController: ObservableObject {
  enum State: Equatable {
    case starting
    case ready(URL)
    case failed(String)
  }

  @Published private(set) var state: State = .starting

  private let log: LogWriter?
  private var server: ServerProcess?
  private var policy = CrashPolicy()

  init() {
    log = try? LogWriter(url: LogWriter.defaultURL())
  }

  /// 개발 확인용 덮어쓰기. 설정 화면(E3)이 생기면 그 값이 먼저다. 검증 때 사용자 ~/Hatch를 건드리지 않으려고 둔다
  private var dataDir: URL {
    if let dir = ProcessInfo.processInfo.environment["HATCH_APP_DATA_DIR"], !dir.isEmpty { return URL(fileURLWithPath: dir) }
    return FileManager.default.homeDirectoryForCurrentUser.appending(path: "Hatch")
  }

  private var claudeBin: String? {
    ProcessInfo.processInfo.environment["HATCH_APP_CLAUDE_BIN"].flatMap { $0.isEmpty ? nil : $0 }
  }

  func start() {
    state = .starting
    guard let log else { return fail("로그 폴더(~/Library/Logs/Hatch)를 만들지 못했어요.") }
    guard let resources = Bundle.main.resourceURL else { return fail("앱 파일을 읽지 못했어요. 앱을 다시 설치해 주세요.") }
    guard let node = NodeLocator.find(resources: resources) else { return fail("Node를 찾지 못했어요. 앱을 다시 설치해 주세요.") }
    let serverJS = resources.appending(path: "hatch/server.js")
    guard FileManager.default.fileExists(atPath: serverJS.path) else { return fail("Hatch 서버 파일이 없어요. 앱을 다시 설치해 주세요.") }
    do {
      try FileManager.default.createDirectory(at: dataDir, withIntermediateDirectories: true)
    } catch {
      return fail("데이터 폴더(\(dataDir.path))를 쓸 수 없어요. 폴더 권한을 확인해 주세요.")
    }
    let config: ServerConfig
    do {
      config = ServerConfig(node: node, serverJS: serverJS, dataDir: dataDir, claudeBin: claudeBin, port: try PortPicker.freePort(), token: AppToken.make())
    } catch {
      return fail("빈 포트를 찾지 못했어요. 맥을 다시 시작해 보세요.")
    }
    let server = ServerProcess(log: log)
    server.onUnexpectedExit = { [weak self] _ in
      Task { @MainActor in self?.serverDied() }
    }
    do {
      try server.start(config)
    } catch {
      return fail("서버를 켜지 못했어요. 로그를 확인해 주세요.")
    }
    self.server = server
    Task { [weak self] in
      let ready = await Readiness.wait(base: config.baseURL, token: config.token)
      self?.finishStart(ready: ready, url: config.baseURL, server: server)
    }
  }

  func restart() {
    policy.reset()
    stop()
    start()
  }

  func stop() {
    server?.stop()
    server = nil
  }

  func openLog() {
    NSWorkspace.shared.open(LogWriter.defaultURL())
  }

  private func finishStart(ready: Bool, url: URL, server: ServerProcess) {
    guard self.server === server else { return } // 그사이 다시 켰으면 예전 결과는 버린다
    if ready {
      state = .ready(url)
    } else {
      stop()
      fail("서버가 30초 안에 답하지 않았어요.")
    }
  }

  private func serverDied() {
    server = nil
    switch policy.onCrash(at: Date()) {
    case .restartQuietly: start()
    case .showError: fail("서버가 1분 안에 두 번 멈췄어요. 로그를 확인해 주세요.")
    }
  }

  private func fail(_ reason: String) {
    state = .failed(reason)
  }
}
```

- [ ] **Step 2: Views.swift**

```swift
import SwiftUI
import WebKit

struct RootView: View {
  @ObservedObject var controller: ServerController

  var body: some View {
    switch controller.state {
    case .starting:
      VStack(spacing: 12) {
        ProgressView()
        Text("Hatch를 켜는 중이에요")
          .foregroundStyle(.secondary)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
    case .ready(let url):
      WebView(url: url)
    case .failed(let reason):
      ErrorView(reason: reason, restart: controller.restart, openLog: controller.openLog)
    }
  }
}

/// 서버가 안 켜지거나 계속 죽을 때 (spec §5)
struct ErrorView: View {
  let reason: String
  let restart: () -> Void
  let openLog: () -> Void

  var body: some View {
    VStack(spacing: 16) {
      Text("Hatch를 켜지 못했어요")
        .font(.title2.bold())
      Text(reason)
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)
      HStack(spacing: 12) {
        Button("로그 보기", action: openLog)
        Button("다시 시작", action: restart)
          .keyboardShortcut(.defaultAction)
      }
    }
    .padding(40)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

/// Hatch 웹 화면. 서버를 다시 켜면 포트가 바뀌므로 주소가 달라지면 다시 읽는다
struct WebView: NSViewRepresentable {
  let url: URL

  func makeNSView(context: Context) -> WKWebView {
    let view = WKWebView(frame: .zero, configuration: WKWebViewConfiguration())
    view.load(URLRequest(url: url))
    return view
  }

  func updateNSView(_ view: WKWebView, context: Context) {
    guard view.url?.port != url.port else { return }
    view.load(URLRequest(url: url))
  }
}
```

- [ ] **Step 3: HatchApp.swift**

```swift
import AppKit
import SwiftUI

@main
struct HatchApp: App {
  @NSApplicationDelegateAdaptor(AppDelegate.self) private var delegate

  var body: some Scene {
    WindowGroup("Hatch") {
      RootView(controller: delegate.controller)
        .frame(minWidth: 960, minHeight: 640)
    }
  }
}

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
  let controller = ServerController()

  func applicationDidFinishLaunching(_ notification: Notification) {
    controller.start()
  }

  /// 끝내기(⌘Q)에서 서버도 끈다. 만드는 중 확인은 E5
  func applicationWillTerminate(_ notification: Notification) {
    controller.stop()
  }

  /// 창을 닫아도 서버는 산다 (spec §1). Dock 아이콘을 누르면 창이 다시 열린다. 메뉴 막대는 E4
  func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }
}
```

- [ ] **Step 4: 빌드와 테스트**

Run: `cd macos && swift build 2>&1 | tail -3 && swift test 2>&1 | tail -2`
Expected: 빌드 성공, 경고 없음, 테스트 전부 통과

- [ ] **Step 5: 커밋**

```bash
git add macos/Sources/Hatch
git commit -m "feat(macos): 앱 창, 켜는 중 화면, 오류 화면, 서버가 죽으면 다시 켜기 (#<n>)

Co-Authored-By: <실제 모델> <noreply@anthropic.com>"
```

---

### Task 6: `.app` 묶기와 실제 실행

**Files:**
- Create: `macos/Info.plist`, `macos/scripts/build.sh`
- Modify: `.gitignore`

- [ ] **Step 1: Info.plist**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>Hatch</string>
  <key>CFBundleDisplayName</key><string>Hatch</string>
  <key>CFBundleIdentifier</key><string>io.github.jjongw.hatch</string>
  <key>CFBundleExecutable</key><string>Hatch</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>0.1.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>CFBundleDevelopmentRegion</key><string>ko</string>
  <key>LSMinimumSystemVersion</key><string>14.0</string>
  <key>LSApplicationCategoryType</key><string>public.app-category.productivity</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSAppTransportSecurity</key>
  <dict>
    <key>NSAllowsLocalNetworking</key><true/>
  </dict>
</dict>
</plist>
```

- [ ] **Step 2: build.sh**

```bash
#!/usr/bin/env bash
# 서명 없는 Hatch.app을 macos/dist/에 만든다 (spec 2026-11-04-macos-app §1, E2).
# 레포 어디서 불러도 레포 뿌리로 옮겨서 돈다 (next.config.ts의 outputFileTracingRoot가 process.cwd()라서)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
APP="$ROOT/macos/dist/Hatch.app"
SA="$ROOT/.next/standalone"

rm -rf "$SA"
HATCH_STANDALONE=1 npm run build

[ -f "$SA/server.js" ] || { echo "server.js가 없어요. HATCH_STANDALONE 빌드를 확인해 주세요." >&2; exit 1; }
# 번들에 소스가 들어가면 안 된다 (next.config.ts outputFileTracingExcludes)
for d in src docs bridge supabase macos .anatomy .superpowers; do
  [ ! -e "$SA/$d" ] || { echo "standalone에 $d가 들어갔어요. next.config.ts의 outputFileTracingExcludes에 더해 주세요." >&2; exit 1; }
done

(cd macos && swift build -c release)
BIN="$(cd macos && swift build -c release --show-bin-path)/Hatch"

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/hatch/.next"
cp "$BIN" "$APP/Contents/MacOS/Hatch"
cp macos/Info.plist "$APP/Contents/Info.plist"
cp -R "$SA/." "$APP/Contents/Resources/hatch/"
cp -R public "$APP/Contents/Resources/hatch/public"
cp -R .next/static "$APP/Contents/Resources/hatch/.next/static"

echo "만들었어요: $APP"
```

Run: `chmod +x macos/scripts/build.sh`

- [ ] **Step 3: .gitignore**

맨 아래에 더한다.

```
# 맥 앱 빌드 결과
/macos/.build/
/macos/dist/
```

- [ ] **Step 4: 묶기**

Run: `macos/scripts/build.sh 2>&1 | tail -3 && du -sh macos/dist/Hatch.app && ls macos/dist/Hatch.app/Contents/Resources/hatch`
Expected: `만들었어요: .../macos/dist/Hatch.app`. `hatch/` 안에 `server.js`, `.next`, `node_modules`, `public`, `demo-data`, `package.json`. `src`, `docs` 없음

- [ ] **Step 5: 실제로 켜 보기 (임시 데이터 폴더, 가짜 claude)**

```bash
D=$(mktemp -d)
open -n --env HATCH_APP_DATA_DIR="$D" --env HATCH_APP_CLAUDE_BIN="$PWD/src/lib/claude/fake-claude.mjs" --env FAKE_CLAUDE=plan macos/dist/Hatch.app
sleep 6
lsof -nP -iTCP -sTCP:LISTEN | grep node
tail -5 ~/Library/Logs/Hatch/server.log
```
Expected: 창에 Hatch 홈이 뜬다. node가 `127.0.0.1:<포트>`에서만 듣는다 (`*:` 아님). 로그에 `Ready`.

화면에서 아이디어 하나를 쓰고 기획안을 만든다. `$D` 안에 아이디어 폴더와 `plan.md`가 생기는지, `~/Hatch`에는 아무것도 안 생겼는지 본다 (`ls -lt ~/Hatch | head -3`의 맨 위 시각이 바뀌지 않음).

- [ ] **Step 6: 오류 화면 확인**

1. node를 한 번 죽인다: `kill $(lsof -tiTCP -sTCP:LISTEN -a -c node -a -i @127.0.0.1)`는 다른 node를 죽일 수 있으니 쓰지 않는다. 대신 `ps -o pid,command -ax | grep "Hatch.app/Contents/Resources/hatch/server.js" | grep -v grep`로 이 앱의 node PID만 찾아 `kill <PID>`. 창이 잠깐 "켜는 중"을 거쳐 다시 Hatch 화면이 되는지 본다 (포트가 바뀐다)
2. 1분 안에 같은 방법으로 한 번 더 죽인다. "Hatch를 켜지 못했어요", "서버가 1분 안에 두 번 멈췄어요" 화면이 뜨는지
3. `다시 시작`을 누르면 다시 Hatch 화면이 되는지. `로그 보기`가 콘솔 앱으로 `server.log`를 여는지

- [ ] **Step 7: 끝내기**

⌘Q 뒤 `ps -ax | grep "Hatch.app/Contents/Resources/hatch/server.js" | grep -v grep`가 비어 있는지 본다. 창만 닫았을 때는 node가 살아 있고, Dock 아이콘을 누르면 창이 다시 열리는지 본다. 확인 뒤 ⌘Q로 끄고 `rm -rf "$D"`.

- [ ] **Step 8: 커밋**

```bash
git add macos/Info.plist macos/scripts/build.sh .gitignore
git commit -m "feat(macos): 서명 없는 Hatch.app 묶기 (#<n>)

Co-Authored-By: <실제 모델> <noreply@anthropic.com>"
```

---

### Task 7: 문서

**Files:**
- Create: `macos/CLAUDE.md`, `docs/decisions/2026-11-04_맥-앱은-Swift-패키지로.md`
- Modify: `CLAUDE.md`, `docs/decisions/README.md`, `docs/specs/2026-11-04-macos-app-design.md`

- [ ] **Step 1: macos/CLAUDE.md (30줄 이하)**

```markdown
# macos/ — Hatch 맥 앱

Swift 패키지 하나. spec: `docs/specs/2026-11-04-macos-app-design.md`. Xcode 프로젝트 파일은 만들지 않는다.

| 경로 | 역할 |
| --- | --- |
| `Sources/HatchCore/` | 로직 (비밀값, 포트, 서버 환경, node 찾기, 로그, 서버 프로세스, 준비 확인). UI를 import하지 않는다 |
| `Sources/Hatch/` | SwiftUI 앱 (창, 켜는 중, 오류 화면) |
| `Tests/HatchCoreTests/` | Swift Testing. `Fixtures/fake-server.mjs`가 가짜 서버 |
| `scripts/build.sh` | 서명 없는 `dist/Hatch.app` 묶기 |

## 명령
- 테스트: `cd macos && swift test`
- 앱 만들기: `macos/scripts/build.sh` (레포 뿌리의 Next 빌드를 같이 한다)
- 개발 확인: `open -n --env HATCH_APP_DATA_DIR=<임시 폴더> macos/dist/Hatch.app`. 사용자 `~/Hatch`로 확인하지 않는다

## 규칙
- 로직은 HatchCore에 두고 테스트한다. 화면 쪽(Hatch)은 상태를 보여 주기만 한다
- 서버는 127.0.0.1에만. 앱 비밀값은 로그, 화면, 커밋에 쓰지 않는다
- 서버에 넘기는 HATCH_ 값은 `ServerConfig.environment`가 정한 것뿐이다. 앱 밖의 HATCH_ 값은 버린다
- node는 E2까지 시스템 것, E6부터 번들 것 (`NodeLocator`)
- 서버 응답 모양(`/api/app/*`)을 바꾸면 `src/lib/app/`과 같은 PR에서 바꾼다
- 서명 예외 권한은 실제로 막힐 때만 하나씩 더하고 여기에 이유를 적는다 (E6)
```

- [ ] **Step 2: 루트 CLAUDE.md**

폴더 지도의 `bridge/` 줄 바로 위에 한 줄.

```markdown
| `macos/` | 맥 앱: Swift 겉, 번들 Next 서버를 띄움 | E | `ui-builder` |
```

"지금 단계" 문단 끝에 한 문장: `**E 진행: 맥 앱** (spec docs/specs/2026-11-04-macos-app-design.md).`

60줄 이하인지 `wc -l CLAUDE.md`로 본다.

- [ ] **Step 3: spec 맞추기**

- §1 "코드 위치" 줄: `macos/` Swift 패키지(`HatchCore`, `Hatch`, 테스트) + `scripts/build.sh`가 `.app`을 묶는다. Xcode 프로젝트 파일 없음
- §1 그림의 `MacOS/Hatch` 설명은 그대로, `Resources/node`에 "E6부터, E2는 시스템 node" 덧붙임
- §5 표의 "만드는 중 ⌘Q" 줄 끝에 "(E5)"
- §7 E2 줄의 "끝나면" 칸: "내 맥에서 앱으로 켜짐 (서명 없음, 시스템 Node). 확인용 `HATCH_APP_DATA_DIR`, `HATCH_APP_CLAUDE_BIN`"

- [ ] **Step 4: 결정 기록**

`docs/decisions/2026-11-04_맥-앱은-Swift-패키지로.md`

```markdown
# 맥 앱은 Xcode 프로젝트 대신 Swift 패키지로

**날짜**: 2026-11-04
**관련 파일**: macos/Package.swift, macos/scripts/build.sh

## What — 무엇이 달라졌나
Hatch를 맥 앱(`Hatch.app`)으로 켤 수 있다. 더블클릭하면 앱이 번들 안의 Hatch 서버를 켜고 창에 보여 준다. 서버가 안 켜지거나 1분 안에 두 번 멈추면 이유와 함께 `다시 시작`, `로그 보기`가 뜬다. 앱 코드는 Xcode 프로젝트가 아니라 Swift 패키지 하나다.

## Why — 왜 필요했나
터미널 없이 설치하고 실행하는 맥 앱이 목표다. 그런데 Xcode 프로젝트 파일은 사람이 읽고 리뷰하기 어렵고, 에이전트가 고치다 깨뜨리기 쉽다.

## 판단 근거
- Swift 패키지는 `swift build`, `swift test`로 터미널에서 빌드와 테스트가 다 된다. 리뷰할 것은 Swift 파일과 스크립트뿐이다
- `.app`은 스크립트가 묶는다. 서명과 공증(E6)도 어차피 스크립트에서 한다. GitHub CI는 쓰지 않는다
- 로직(서버 켜기, 끄기, 로그, 다시 켜기 규칙)은 화면과 떨어진 HatchCore에 두고 가짜 서버로 테스트한다
- 지금은 시스템 Node를 쓴다. 다른 사람에게 줄 수 있는 판(Node를 번들에 넣고 서명)은 E6
- Xcode 프로젝트로 옮기는 신호: 위젯, 앱 확장처럼 패키지로 못 만드는 타깃이 필요해지면
```

`docs/decisions/README.md` 표 맨 아래에 `| 11-04 | [맥 앱은 Swift 패키지로](2026-11-04_맥-앱은-Swift-패키지로.md) |`

- [ ] **Step 5: 가운데점 검사와 커밋**

Run: `perl -CSD -ne '$n++ while /\x{00B7}/g; END { print $n+0, "\n" }' macos/CLAUDE.md docs/decisions/2026-11-04_맥-앱은-Swift-패키지로.md CLAUDE.md docs/specs/2026-11-04-macos-app-design.md`
Expected: `0` (README.md 표의 예전 줄에 남은 것은 이번에 고치지 않는다. 새로 쓴 줄에는 없어야 한다)

```bash
git add macos/CLAUDE.md CLAUDE.md docs/decisions docs/specs/2026-11-04-macos-app-design.md
git commit -m "docs(macos): 맥 앱 폴더 규칙, 결정 기록, spec을 E2에 맞춤 (#<n>)

Co-Authored-By: <실제 모델> <noreply@anthropic.com>"
```

---

### Task 8: 검증, 리뷰, PR

- [ ] **Step 1: 전체 검증**

Run: `npm run lint && npm run typecheck && npm test && npm run build && (cd macos && swift test)`
Expected: 모두 통과

- [ ] **Step 2: hatch-reviewer와 Swift 리뷰**

`hatch-reviewer`에 브랜치 변경을 맡긴다. Swift 코드는 `everything-claude-code-ios:swift-code-reviewer`에도 맡긴다 (프로세스, 스레드, 메모리). 지적을 고치고 남긴 것은 PR에 이유를 적는다.

- [ ] **Step 3: PR**

```bash
git push -u origin feat/<n>-macos-shell
gh pr create --title "feat(macos): 맥 앱 E2, 앱 뼈대 (#<n>)" --label "area:macos" --label "type:feat" --body-file <본문 파일>
```
본문: 개요, `closes #<n>`, 변경, 검증(명령과 결과, Task 6의 실제 실행 확인 항목), 화면 캡처(켜는 중, Hatch 화면, 오류 화면), 리뷰어 결과, why 기록 링크. 끝에 `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

- [ ] **Step 4: 사용자 승인 뒤 squash 머지**
