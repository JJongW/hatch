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

  /// 예전 서버가 남아 있으면 먼저 끈다. restart와 시간 초과는 takeServer로 먼저 비우므로 여기선 보통 할 일이 없다
  func start() {
    stop()
    state = .starting
    guard let log else { return fail("로그 폴더(~/Library/Logs/Hatch)를 만들지 못했어요.") }
    guard let resources = Bundle.main.resourceURL else { return fail("앱 파일을 읽지 못했어요. 앱을 다시 설치해 주세요.") }
    guard let node = NodeLocator.find(resources: resources) else { return fail("Node를 찾지 못했어요. Homebrew로 Node를 설치해 주세요 (brew install node).") }
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
    server.onUnexpectedExit = { [weak self, weak server] _ in
      Task { @MainActor in
        guard let server else { return }
        self?.serverDied(server)
      }
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
    state = .starting
    let old = takeServer()
    Task {
      await Task.detached { old?.stop() }.value
      start() // 예전 서버가 완전히 멈춘 뒤에 켠다
    }
  }

  /// 앱 종료(applicationWillTerminate)용. 끝까지 멈춰야 하므로 이 스레드를 막고 기다린다
  func stop() {
    server?.stop()
    server = nil
  }

  /// 지금 서버를 떼어 낸다. 끄기(stop)는 grace(3초)까지 걸릴 수 있어 부르는 쪽이 메인 밖에서 한다
  private func takeServer() -> ServerProcess? {
    defer { server = nil }
    return server
  }

  func openLog() {
    NSWorkspace.shared.open(LogWriter.defaultURL())
  }

  private func finishStart(ready: Bool, url: URL, server: ServerProcess) {
    guard self.server === server else { return } // 그사이 다시 켰으면 예전 결과는 버린다
    if ready {
      state = .ready(url)
    } else {
      fail("서버가 30초 안에 답하지 않았어요.")
      let old = takeServer()
      Task.detached { old?.stop() }
    }
  }

  private func serverDied(_ dead: ServerProcess) {
    guard server === dead else { return } // 그사이 다시 켰으면 예전 서버의 알림은 버린다
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
