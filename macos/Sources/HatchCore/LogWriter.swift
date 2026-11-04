import Foundation

/// 서버 stdout, stderr를 남기는 파일 (spec §5). 한도를 넘으면 server.1.log로 넘기고 그 하나만 남긴다
public final class LogWriter: @unchecked Sendable {
  public static let defaultMaxBytes = 5 * 1024 * 1024

  public let url: URL
  private let maxBytes: Int
  private let lock = NSLock()
  private var handle: FileHandle?
  private var closed = false

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
    guard !closed else { return }
    // 다시 열기에 실패했거나 파일, 폴더가 사라졌으면 다음 쓰기에서 다시 시도한다
    if handle == nil || !FileManager.default.fileExists(atPath: url.path) {
      try? handle?.close()
      handle = nil
      try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
      try? open()
    }
    rotateIfNeeded(adding: data.count)
    try? handle?.write(contentsOf: data)
  }

  public func close() {
    lock.lock()
    defer { lock.unlock() }
    closed = true
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
