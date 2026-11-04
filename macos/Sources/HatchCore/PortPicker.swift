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
