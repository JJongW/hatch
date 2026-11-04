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
