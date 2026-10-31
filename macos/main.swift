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
  var showUsageHud: Bool { prefs?.showUsageHud ?? true }
  var locale: String { prefs?.locale == "zh" ? "zh" : "en" }

  struct Prefs: Codable {
    var followOfficialLaunch: Bool?
    var openAtLogin: Bool?
    var showUsageHud: Bool?
    var locale: String?
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

struct MenuCopy {
  let zh: Bool

  init(_ locale: String) {
    zh = locale == "zh"
  }

  var fallbackTitle: String { zh ? "皮肤" : "Skin" }
  var accessibility: String { zh ? "Grok Bot 皮肤" : "Grok Bot Skin" }
  var openWear: String { zh ? "打开 Grok Bot 并套上" : "Open Grok Bot and wear" }
  var reopen: String { zh ? "退出并重新打开 Grok Bot" : "Quit and reopen Grok Bot" }
  var empty: String { zh ? "没有皮肤包" : "No skin packs" }
  var follow: String { zh ? "官方 Dock 打开也套皮肤" : "Follow official Dock launches" }
  var usage: String { zh ? "显示订阅用量" : "Show usage chip" }
  var login: String { zh ? "登录时打开菜单栏" : "Open menu bar at login" }
  var language: String { "中文" }
  var studio: String { zh ? "皮肤工作室" : "Skin Studio" }
  var quit: String { zh ? "退出菜单栏" : "Quit menu bar" }
  var headerUnknown: String { zh ? "无法读取皮肤状态" : "Can't read skin status" }
  var applyFailed: String { zh ? "套皮肤失败" : "Could not apply skin" }
  var nodeMissing: String {
    zh
      ? "找不到 node。请安装 Node.js，或把它放到 /opt/homebrew/bin。"
      : "Can't find node. Install Node.js, or put it in /opt/homebrew/bin."
  }

  func headerNow(_ name: String) -> String {
    zh ? "当前：\(name)" : "Now: \(name)"
  }

  func headerNotWearing(_ name: String) -> String {
    zh ? "未套上 · \(name)" : "Not wearing · \(name)"
  }

  func headerClosed(_ name: String) -> String {
    zh ? "未打开 · \(name)" : "Not open · \(name)"
  }

  func cliMissing(_ path: String) -> String {
    zh ? "找不到 grok-bot-skin CLI：\(path)" : "Can't find grok-bot-skin CLI: \(path)"
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
  private var lastLocale = "en"

  func applicationDidFinishLaunching(_ notification: Notification) {
    let snap = loadSnapshot()
    let copy = MenuCopy(snap?.locale ?? "en")
    if let button = statusItem.button {
      let image = NSImage(systemSymbolName: "paintpalette.fill", accessibilityDescription: copy.accessibility)
      image?.isTemplate = true
      button.image = image
      button.imagePosition = .imageLeading
      button.title = title(for: snap)
    }
    menu.delegate = self
    statusItem.menu = menu
    rebuildMenu(snapshot: snap)
    if let snap {
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

  @objc private func toggleUsage(_ sender: Any?) {
    let current = loadSnapshot()?.showUsageHud ?? true
    runInBackground { try self.runNode(["usage", current ? "off" : "on"]) }
  }

  @objc private func toggleLocale(_ sender: Any?) {
    let current = loadSnapshot()?.locale ?? "en"
    runInBackground { try self.runNode(["lang", current == "zh" ? "en" : "zh"]) }
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

  private func title(for snap: Snapshot?) -> String {
    let copy = MenuCopy(snap?.locale ?? "en")
    guard let snap else { return copy.fallbackTitle }
    let name = snap.activeName.isEmpty ? copy.fallbackTitle : snap.activeName
    return snap.status.debug ? name : "\(name) ·"
  }

  private func rebuildMenu(snapshot: Snapshot?) {
    menu.removeAllItems()
    let snap = snapshot
    let copy = MenuCopy(snap?.locale ?? "en")
    let header = NSMenuItem(
      title: headerTitle(snap, copy: copy),
      action: nil,
      keyEquivalent: ""
    )
    header.isEnabled = false
    menu.addItem(header)

    let openItem = NSMenuItem(
      title: snap?.status.running == true && snap?.status.debug != true
        ? copy.reopen
        : copy.openWear,
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
      let empty = NSMenuItem(title: copy.empty, action: nil, keyEquivalent: "")
      empty.isEnabled = false
      menu.addItem(empty)
    }

    menu.addItem(.separator())
    let follow = NSMenuItem(
      title: copy.follow,
      action: #selector(toggleFollow(_:)),
      keyEquivalent: ""
    )
    follow.target = self
    follow.state = (snap?.followOfficialLaunch ?? true) ? .on : .off
    menu.addItem(follow)
    let usage = NSMenuItem(
      title: copy.usage,
      action: #selector(toggleUsage(_:)),
      keyEquivalent: ""
    )
    usage.target = self
    usage.state = (snap?.showUsageHud ?? true) ? .on : .off
    menu.addItem(usage)
    let login = NSMenuItem(
      title: copy.login,
      action: #selector(toggleLogin(_:)),
      keyEquivalent: ""
    )
    login.target = self
    login.state = (snap?.openAtLogin ?? true) ? .on : .off
    menu.addItem(login)
    let language = NSMenuItem(
      title: copy.language,
      action: #selector(toggleLocale(_:)),
      keyEquivalent: ""
    )
    language.target = self
    language.state = copy.zh ? .on : .off
    menu.addItem(language)
    let studio = NSMenuItem(title: copy.studio, action: #selector(openStudio(_:)), keyEquivalent: "")
    studio.target = self
    menu.addItem(studio)
    let quit = NSMenuItem(title: copy.quit, action: #selector(quitMenu(_:)), keyEquivalent: "")
    quit.target = self
    menu.addItem(quit)
  }

  private func headerTitle(_ snap: Snapshot?, copy: MenuCopy) -> String {
    guard let snap else { return copy.headerUnknown }
    if snap.status.debug {
      return copy.headerNow(snap.activeName)
    }
    if snap.status.running {
      return copy.headerNotWearing(snap.activeName)
    }
    return copy.headerClosed(snap.activeName)
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
          self?.statusItem.button?.title = self?.title(for: snap) ?? MenuCopy("en").fallbackTitle
        }
      } catch {
        DispatchQueue.main.async {
          NSApp.activate(ignoringOtherApps: true)
          let alert = NSAlert()
          alert.alertStyle = .warning
          alert.messageText = MenuCopy(self?.loadSnapshot()?.locale ?? "en").applyFailed
          alert.informativeText = error.localizedDescription
          alert.runModal()
        }
      }
    }
  }

  private func loadSnapshot() -> Snapshot? {
    guard let raw = try? runNode(["snapshot"]) else { return nil }
    let data = Data(raw.utf8)
    guard let snap = try? JSONDecoder().decode(Snapshot.self, from: data) else { return nil }
    lastLocale = snap.locale
    return snap
  }

  private func runNode(_ args: [String]) throws -> String {
    let copy = MenuCopy(lastLocale)
    guard let node = findNode() else {
      throw CliError.message(copy.nodeMissing)
    }
    let cli = (kitRoot() as NSString).appendingPathComponent("bin/cli.mjs")
    guard FileManager.default.isReadableFile(atPath: cli) else {
      throw CliError.message(copy.cliMissing(cli))
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
