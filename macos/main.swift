import AppKit
import Foundation
import ServiceManagement

struct Snapshot: Codable {
  var kitRoot: String
  var activeId: String?
  var activeName: String
  var packs: [Pack]
  var status: Status
  var prefs: Prefs?

  var followOfficialLaunch: Bool { prefs?.followOfficialLaunch ?? true }
  var openAtLogin: Bool { prefs?.openAtLogin ?? true }

  struct Prefs: Codable {
    var followOfficialLaunch: Bool?
    var openAtLogin: Bool?
  }

  struct Pack: Codable {
    var id: String
    var name: String
    var appearance: String
    var selected: Bool
  }

  struct Status: Codable {
    var running: Bool
    var debug: Bool
    var state: String
  }
}

enum CliError: LocalizedError {
  case message(String)

  var errorDescription: String? {
    switch self {
    case .message(let text):
      return text
    }
  }
}

@main
enum GrokBotSkinMenu {
  static func main() {
    let app = NSApplication.shared
    let delegate = AppDelegate()
    app.delegate = delegate
    app.setActivationPolicy(.accessory)
    app.run()
  }
}

final class AppDelegate: NSObject, NSApplicationDelegate, NSMenuDelegate {
  private let statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
  private let menu = NSMenu()
  private var lastDebug = false
  private var applying = false
  private var lastFollowAttempt = Date.distantPast

  func applicationDidFinishLaunching(_ notification: Notification) {
    if let button = statusItem.button {
      let image = NSImage(systemSymbolName: "paintpalette.fill", accessibilityDescription: "Grok Bot 皮肤")
      image?.isTemplate = true
      button.image = image
      button.imagePosition = .imageLeading
      button.title = "皮肤"
    }
    menu.delegate = self
    statusItem.menu = menu
    rebuildMenu(snapshot: nil)
    refreshTitle()
    if let snap = loadSnapshot() {
      syncLoginItem(enabled: snap.openAtLogin)
    }
    Timer.scheduledTimer(withTimeInterval: 3.0, repeats: true) { [weak self] _ in
      self?.onTick()
    }
  }

  func menuWillOpen(_ menu: NSMenu) {
    rebuildMenu(snapshot: loadSnapshot())
  }

  @objc private func openLast(_ sender: Any?) {
    runInBackground { try self.runNode(["open"]) }
  }

  @objc private func chooseSkin(_ sender: NSMenuItem) {
    guard let id = sender.representedObject as? String else { return }
    runInBackground { try self.runNode(["open", id]) }
  }

  @objc private func openStudio(_ sender: Any?) {
    DispatchQueue.global(qos: .utility).async {
      _ = try? self.runNode(["studio"])
    }
  }

  @objc private func quitMenu(_ sender: Any?) {
    NSApp.terminate(nil)
  }

  @objc private func toggleFollow(_ sender: Any?) {
    let current = loadSnapshot()?.followOfficialLaunch ?? true
    runInBackground { try self.runNode(["follow", current ? "off" : "on"]) }
  }

  @objc private func toggleLogin(_ sender: Any?) {
    let current = loadSnapshot()?.openAtLogin ?? true
    runInBackground {
      let output = try self.runNode(["login", current ? "off" : "on"])
      self.syncLoginItem(enabled: !current)
      return output
    }
  }

  private func onTick() {
    DispatchQueue.global(qos: .utility).async { [weak self] in
      guard let self else { return }
      guard let snap = self.loadSnapshot() else { return }
      let debug = snap.status.debug
      if snap.followOfficialLaunch,
         snap.status.running,
         !debug,
         !self.applying,
         Date().timeIntervalSince(self.lastFollowAttempt) > 15
      {
        self.lastFollowAttempt = Date()
        self.applying = true
        _ = try? self.runNode(["open"])
        self.applying = false
      }
      var latest = snap
      if let current = self.loadSnapshot() { latest = current }
      let shouldApply = latest.status.debug && !self.lastDebug && !self.applying
      self.lastDebug = latest.status.debug
      if shouldApply, let id = latest.activeId {
        self.applying = true
        _ = try? self.runNode(["chrome", id])
        self.applying = false
      }
      DispatchQueue.main.async {
        self.statusItem.button?.title = self.title(for: latest)
      }
    }
  }

  private func refreshTitle() {
    DispatchQueue.global(qos: .utility).async { [weak self] in
      let snap = self?.loadSnapshot()
      DispatchQueue.main.async {
        self?.statusItem.button?.title = self?.title(for: snap) ?? "皮肤"
      }
    }
  }

  private func title(for snap: Snapshot?) -> String {
    guard let snap else { return "皮肤" }
    let name = snap.activeName.isEmpty ? "皮肤" : snap.activeName
    return snap.status.debug ? name : "\(name) ·"
  }

  private func rebuildMenu(snapshot: Snapshot?) {
    menu.removeAllItems()
    let snap = snapshot
    let header = NSMenuItem(
      title: headerTitle(snap),
      action: nil,
      keyEquivalent: ""
    )
    header.isEnabled = false
    menu.addItem(header)

    let openItem = NSMenuItem(
      title: snap?.status.running == true && snap?.status.debug != true
        ? "退出并重新打开 Grok Bot"
        : "打开 Grok Bot 并套上",
      action: #selector(openLast(_:)),
      keyEquivalent: ""
    )
    openItem.target = self
    menu.addItem(openItem)
    menu.addItem(.separator())

    if let packs = snap?.packs, !packs.isEmpty {
      for pack in packs {
        let item = NSMenuItem(
          title: pack.name,
          action: #selector(chooseSkin(_:)),
          keyEquivalent: ""
        )
        item.target = self
        item.representedObject = pack.id
        item.state = pack.selected ? .on : .off
        menu.addItem(item)
      }
    } else {
      let empty = NSMenuItem(title: "没有皮肤包", action: nil, keyEquivalent: "")
      empty.isEnabled = false
      menu.addItem(empty)
    }

    menu.addItem(.separator())
    let follow = NSMenuItem(
      title: "官方 Dock 打开也套皮肤",
      action: #selector(toggleFollow(_:)),
      keyEquivalent: ""
    )
    follow.target = self
    follow.state = (snap?.followOfficialLaunch ?? true) ? .on : .off
    menu.addItem(follow)
    let login = NSMenuItem(
      title: "登录时打开菜单栏",
      action: #selector(toggleLogin(_:)),
      keyEquivalent: ""
    )
    login.target = self
    login.state = (snap?.openAtLogin ?? true) ? .on : .off
    menu.addItem(login)
    let studio = NSMenuItem(title: "皮肤工作室", action: #selector(openStudio(_:)), keyEquivalent: "")
    studio.target = self
    menu.addItem(studio)
    let quit = NSMenuItem(title: "退出菜单栏", action: #selector(quitMenu(_:)), keyEquivalent: "")
    quit.target = self
    menu.addItem(quit)
  }

  private func headerTitle(_ snap: Snapshot?) -> String {
    guard let snap else { return "无法读取皮肤状态" }
    if snap.status.debug {
      return "当前：\(snap.activeName)"
    }
    if snap.status.running {
      return "未套上 · \(snap.activeName)"
    }
    return "未打开 · \(snap.activeName)"
  }

  private func runInBackground(_ work: @escaping () throws -> String) {
    applying = true
    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
      defer { self?.applying = false }
      do {
        _ = try work()
        let snap = self?.loadSnapshot()
        if let snap { self?.lastDebug = snap.status.debug }
        DispatchQueue.main.async {
          self?.rebuildMenu(snapshot: snap)
          self?.statusItem.button?.title = self?.title(for: snap) ?? "皮肤"
        }
      } catch {
        DispatchQueue.main.async {
          NSApp.activate(ignoringOtherApps: true)
          let alert = NSAlert()
          alert.alertStyle = .warning
          alert.messageText = "套皮肤失败"
          alert.informativeText = error.localizedDescription
          alert.runModal()
        }
      }
    }
  }

  private func loadSnapshot() -> Snapshot? {
    guard let raw = try? runNode(["snapshot"]) else { return nil }
    let data = Data(raw.utf8)
    return try? JSONDecoder().decode(Snapshot.self, from: data)
  }

  private func runNode(_ args: [String]) throws -> String {
    guard let node = findNode() else {
      throw CliError.message("找不到 node。请安装 Node.js，或把它放到 /opt/homebrew/bin。")
    }
    let cli = (kitRoot() as NSString).appendingPathComponent("bin/cli.mjs")
    guard FileManager.default.isReadableFile(atPath: cli) else {
      throw CliError.message("找不到 grok-bot-skin CLI：\(cli)")
    }
    let task = Process()
    task.executableURL = URL(fileURLWithPath: node)
    task.arguments = [cli] + args
    var env = ProcessInfo.processInfo.environment
    let extra = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
    env["PATH"] = extra + ":" + (env["PATH"] ?? "")
    env["GROK_BOT_SKIN_ROOT"] = kitRoot()
    task.environment = env
    let out = Pipe()
    let err = Pipe()
    task.standardOutput = out
    task.standardError = err
    try task.run()
    task.waitUntilExit()
    let stdout = String(data: out.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
    if task.terminationStatus != 0 {
      let stderr = String(data: err.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
      let text = stderr.trimmingCharacters(in: .whitespacesAndNewlines)
      throw CliError.message(text.isEmpty ? stdout.trimmingCharacters(in: .whitespacesAndNewlines) : text)
    }
    return stdout
  }

  private func kitRoot() -> String {
    if let env = ProcessInfo.processInfo.environment["GROK_BOT_SKIN_ROOT"], !env.isEmpty {
      return env
    }
    var url = Bundle.main.bundleURL
    for _ in 0..<8 {
      url.deleteLastPathComponent()
      let cli = url.appendingPathComponent("bin/cli.mjs")
      if FileManager.default.isReadableFile(atPath: cli.path) {
        return url.path
      }
    }
    return Bundle.main.bundleURL.deletingLastPathComponent().deletingLastPathComponent().path
  }

  private func findNode() -> String? {
    let candidates = [
      "/opt/homebrew/bin/node",
      "/usr/local/bin/node",
      "/usr/bin/node",
    ]
    if let found = candidates.first(where: { FileManager.default.isExecutableFile(atPath: $0) }) {
      return found
    }
    let task = Process()
    task.executableURL = URL(fileURLWithPath: "/bin/zsh")
    task.arguments = ["-lc", "command -v node"]
    let out = Pipe()
    task.standardOutput = out
    task.standardError = FileHandle.nullDevice
    do {
      try task.run()
      task.waitUntilExit()
      let path = String(data: out.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8)?
        .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
      if !path.isEmpty, FileManager.default.isExecutableFile(atPath: path) {
        return path
      }
    } catch {
      return nil
    }
    return nil
  }

  private func syncLoginItem(enabled: Bool) {
    guard #available(macOS 13.0, *) else { return }
    do {
      if enabled {
        try SMAppService.mainApp.register()
      } else if SMAppService.mainApp.status == .enabled {
        try SMAppService.mainApp.unregister()
      }
    } catch {
      // The user can deny the login-item prompt; the menu toggle still stores the pref.
    }
  }
}
