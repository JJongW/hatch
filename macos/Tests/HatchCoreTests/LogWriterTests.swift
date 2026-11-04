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

  @Test func 폴더가_사라져도_다음_쓰기에서_다시_만들어_쓴다() throws {
    let dir = try tempDir()
    defer { try? FileManager.default.removeItem(at: dir) }
    let url = dir.appending(path: "Logs/server.log")
    let log = try LogWriter(url: url)
    log.append(Data("지워질 줄\n".utf8))
    try FileManager.default.removeItem(at: dir.appending(path: "Logs"))
    log.append(Data("새 줄\n".utf8))
    log.close()
    #expect(try String(contentsOf: url, encoding: .utf8).contains("새 줄"))
  }

  @Test func 닫은_뒤에는_한도를_넘어도_쓰지도_다시_열지도_않는다() throws {
    let dir = try tempDir()
    defer { try? FileManager.default.removeItem(at: dir) }
    let url = dir.appending(path: "server.log")
    let log = try LogWriter(url: url, maxBytes: 10)
    log.append(Data("12345678".utf8))
    log.close()
    log.append(Data("abcdefghijkl".utf8))
    #expect(try String(contentsOf: url, encoding: .utf8) == "12345678")
    #expect(!FileManager.default.fileExists(atPath: log.rotatedURL.path))
    try FileManager.default.removeItem(at: url)
    log.append(Data("zz".utf8))
    #expect(!FileManager.default.fileExists(atPath: url.path))
  }
}
