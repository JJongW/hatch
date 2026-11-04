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
