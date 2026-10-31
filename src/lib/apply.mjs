import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import { promisify } from "node:util";
import {
  DEBUG_PORT,
  activePath,
  ensureUserRoot,
  findGrokBotApp,
} from "./paths.mjs";
import { compileOverlay, clearExpression, injectExpression } from "./compile.mjs";
import { debugAvailable, evaluateOnPages, waitForDebug } from "./cdp.mjs";
import { readPrefs } from "./prefs.mjs";

const execFileAsync = promisify(execFile);

export async function grokBotProcessRunning() {
  try {
    await execFileAsync("pgrep", ["-x", "Grok Bot"], { timeout: 1500 });
    return true;
  } catch {
    return false;
  }
}

export async function grokBotStatus(port = DEBUG_PORT) {
  const running = await grokBotProcessRunning();
  const debug = await debugAvailable(port);
  return {
    running,
    debug,
    app: findGrokBotApp(),
    port,
    state: debug ? "running-debug" : running ? "running" : "stopped",
  };
}

export async function quitGrokBot() {
  try {
    await execFileAsync("osascript", ["-e", 'tell application "Grok Bot" to quit'], {
      timeout: 8000,
    });
  } catch {
    try {
      await execFileAsync("killall", ["Grok Bot"]);
    } catch {
      // Already gone.
    }
  }
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    if (!(await grokBotProcessRunning())) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  try {
    await execFileAsync("killall", ["-9", "Grok Bot"]);
  } catch {
    // Ignore.
  }
  await new Promise((resolve) => setTimeout(resolve, 400));
  if (await grokBotProcessRunning()) {
    throw new Error("无法退出已在运行的 Grok Bot，请先手动退出后再用启动器打开。");
  }
}

export async function launchGrokBot({ port = DEBUG_PORT } = {}) {
  const app = findGrokBotApp();
  if (!app) {
    throw new Error(
      "找不到 Grok Bot.app。把它放到本仓库根目录，或安装到 /Applications。",
    );
  }
  const status = await grokBotStatus(port);
  if (status.debug) return { app, launched: false, debug: true };
  if (status.running) {
    throw new Error(
      "Grok Bot 已在运行，但没有打开皮肤调试端口。请用启动器或菜单栏打开（会先退出再带端口启动）。",
    );
  }
  await execFileAsync("open", ["-na", app, "--args", `--remote-debugging-port=${port}`]);
  const ready = await waitForDebug(port, 25000);
  if (!ready) {
    throw new Error("Grok Bot 已启动，但 25 秒内没有出现调试端口。界面皮肤无法注入。");
  }
  return { app, launched: true, debug: true };
}

export async function applyChrome(
  pack,
  { port = DEBUG_PORT, persist = true, showUsageHud, locale } = {},
) {
  const prefs = readPrefs();
  const hud = showUsageHud ?? prefs.showUsageHud !== false;
  const loc = locale ?? prefs.locale;
  const css = compileOverlay(pack, { showUsageHud: hud });
  const expression = injectExpression(css, pack.id, { showUsageHud: hud, locale: loc });
  const results = await evaluateOnPages(expression, port, { persist });
  rememberSkin(pack, { mode: "chrome" });
  return { cssBytes: css.length, results };
}

export async function clearChrome({ port = DEBUG_PORT } = {}) {
  const results = await evaluateOnPages(clearExpression(), port);
  const file = activePath();
  if (fs.existsSync(file)) fs.unlinkSync(file);
  return results;
}

export async function revealAvatar(pack) {
  if (!pack.avatarAbs) throw new Error("This pack has no avatar file");
  if (process.platform === "darwin") {
    await execFileAsync("open", ["-R", pack.avatarAbs]);
    await copyToClipboard(pack.avatarAbs);
  } else {
    throw new Error(`Reveal-in-folder is not implemented on ${process.platform}`);
  }
  return {
    avatar: pack.avatarAbs,
    steps: ["Revealed in Finder."],
  };
}

export function writeActive(payload) {
  try {
    ensureUserRoot();
    fs.writeFileSync(activePath(), `${JSON.stringify(payload, null, 2)}\n`);
  } catch {
    // Local preference file is optional.
  }
}

export function rememberSkin(pack, extra = {}) {
  writeActive({
    skinId: pack.id,
    version: pack.version,
    source: pack.packDir,
    appliedAt: new Date().toISOString(),
    ...extra,
  });
}

function copyToClipboard(text) {
  return new Promise((resolve, reject) => {
    const child = spawn("pbcopy");
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pbcopy exited ${code}`));
    });
    child.stdin.end(text);
  });
}

export function readActive() {
  try {
    return JSON.parse(fs.readFileSync(activePath(), "utf8"));
  } catch {
    return null;
  }
}
