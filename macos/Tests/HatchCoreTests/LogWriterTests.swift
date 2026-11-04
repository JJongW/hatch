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
