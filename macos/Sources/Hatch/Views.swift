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
