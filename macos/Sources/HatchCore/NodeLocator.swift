import Foundation

public enum NodeLocator {
  /// 번들의 node가 먼저. 없으면 시스템 node (E2 개발용). E6에서 번들에 node가 늘 들어간다
  public static func find(
    resources: URL?,
    isExecutable: (String) -> Bool = { FileManager.default.isExecutableFile(atPath: $0) }
  ) -> URL? {
    let candidates: [String?] = [resources?.appendingPathComponent("node").path, "/opt/homebrew/bin/node", "/usr/local/bin/node"]
    return candidates.compactMap { $0 }.first(where: isExecutable).map { URL(fileURLWithPath: $0) }
  }
}
