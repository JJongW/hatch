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
