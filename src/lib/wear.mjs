import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import {
  applyChrome,
  grokBotStatus,
  launchGrokBot,
  quitGrokBot,
  readActive,
  rememberSkin,
} from "./apply.mjs";
import { getPack, listPacks } from "./pack.mjs";
import { kitRoot, menuBarAppPath } from "./paths.mjs";
import { readPrefs } from "./prefs.mjs";

const execFileAsync = promisify(execFile);

export function preferredPack() {
  const packs = listPacks();
  if (!packs.length) throw new Error("没有可用皮肤包。");
  const saved = readActive()?.skinId;
  if (saved) {
    try {
      return getPack(saved);
    } catch {
      // Fall through to the featured default.
    }
  }
  return packs[0];
}

export function resolvePack(id) {
  return id ? getPack(id) : preferredPack();
}

export function snapshot() {
  const packs = listPacks();
  let pack = null;
  try {
    pack = preferredPack();
  } catch {
    pack = null;
  }
  return {
    kitRoot,
    activeId: pack?.id ?? null,
    activeName: pack?.displayName ?? "",
    prefs: readPrefs(),
    packs: packs.map((item) => ({
      id: item.id,
      name: item.displayName,
      appearance: item.appearance,
      selected: item.id === pack?.id,
    })),
  };
}

export async function snapshotWithStatus() {
  return { ...snapshot(), status: await grokBotStatus() };
}

export async function wearSkin(id, { persist = true } = {}) {
  const pack = resolvePack(id);
  rememberSkin(pack, { mode: "preferred" });
  let status = await grokBotStatus();
  if (!status.debug) {
    if (status.running) await quitGrokBot();
    await launchGrokBot();
    status = await grokBotStatus();
  }
  if (!status.debug) {
    throw new Error(
      "Grok Bot 没有打开皮肤调试端口。请用启动器或菜单栏打开，不要从 Dock 里那个未带调试端口的图标启动。",
    );
  }
  const chrome = await applyChrome(pack, { persist });
  return { pack, chrome, status: await grokBotStatus() };
}

export async function openMenuBar() {
  const binary = path.join(menuBarAppPath, "Contents/MacOS/Grok Bot Skin");
  if (!fs.existsSync(binary)) {
    const script = path.join(kitRoot, "macos", "build.sh");
    await execFileAsync("bash", [script], { cwd: kitRoot });
  }
  if (!fs.existsSync(binary)) {
    throw new Error("菜单栏应用没有编译成功。请确认已安装 Xcode Command Line Tools。");
  }
  try {
    await execFileAsync("killall", ["Grok Bot Skin"]);
    await new Promise((resolve) => setTimeout(resolve, 300));
  } catch {
    // Not running.
  }
  await execFileAsync("open", [menuBarAppPath]);
  return menuBarAppPath;
}
