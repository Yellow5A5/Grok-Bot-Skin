import { execFile, spawn } from "node:child_process";
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
import { getPack, listPacks, localizedPackName } from "./pack.mjs";
import { kitRoot, menuBarAppPath, STUDIO_PORT } from "./paths.mjs";
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
  const locale = readPrefs().locale;
  let pack = null;
  try {
    pack = preferredPack();
  } catch {
    pack = null;
  }
  return {
    kitRoot,
    activeId: pack?.id ?? null,
    activeName: pack ? localizedPackName(pack, locale) : "",
    prefs: readPrefs(),
    packs: packs.map((item) => ({
      id: item.id,
      name: localizedPackName(item, locale),
      appearance: item.appearance,
      selected: item.id === pack?.id,
    })),
  };
}

export function studioHref() {
  return `http://127.0.0.1:${STUDIO_PORT}/`;
}

export async function studioAvailable() {
  try {
    const response = await fetch(studioHref(), { signal: AbortSignal.timeout(600) });
    return response.ok;
  } catch {
    return false;
  }
}

export async function openSkinStudio() {
  const href = studioHref();
  if (!(await studioAvailable())) {
    const child = spawn(
      process.execPath,
      [path.join(kitRoot, "bin/cli.mjs"), "serve-studio"],
      {
        detached: true,
        stdio: "ignore",
        env: { ...process.env, GROK_BOT_SKIN_ROOT: kitRoot },
      },
    );
    child.unref();
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      if (await studioAvailable()) break;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    if (!(await studioAvailable())) {
      throw new Error("Skin Studio did not start. Check that port 4177 is free.");
    }
  }
  if (process.platform === "darwin") {
    await execFileAsync("open", [href]);
  }
  return href;
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
