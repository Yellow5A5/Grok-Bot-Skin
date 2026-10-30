#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { exportPack, importPack } from "../src/lib/archive.mjs";
import {
  applyChrome,
  clearChrome,
  grokBotStatus,
  revealAvatar,
} from "../src/lib/apply.mjs";
import { compileOverlay } from "../src/lib/compile.mjs";
import { PackError, getPack, listPacks, loadPack, validatePack } from "../src/lib/pack.mjs";
import { parseOnOff, writePrefs } from "../src/lib/prefs.mjs";
import {
  openMenuBar,
  resolvePack,
  snapshotWithStatus,
  wearSkin,
} from "../src/lib/wear.mjs";

const USAGE = `grok-bot-skin — Grok Bot 皮肤工具

命令:
  studio                 打开皮肤工作室
  open [id]              启动器：记住并套上上一套（或指定）皮肤
  menubar                打开菜单栏，五个皮肤来回切
  snapshot               当前皮肤与 Grok Bot 状态（JSON）
  follow [on|off]        官方 Dock 打开时也套皮肤（需菜单栏在跑）
  login [on|off]         登录时打开菜单栏
  list                   列出已安装皮肤
  apply <id>             套用头像（官方 Upload）+ 尝试套用界面
  launch [id]            用皮肤调试端口启动 Grok Bot 并套上界面
  chrome [id]            只注入界面 CSS（需要调试端口已开）
  avatar <id>            只打开头像文件，供 Grok Bot 官方上传
  clear                  移除已注入的界面 CSS
  compile [id]           把皮肤编译成 overlay.css
  pack <id>              打包成可分享的 .grokskin.zip
  import <zip>           导入别人分享的皮肤包
  validate [path]        校验 skin.json
  status                 查看 Grok Bot 与调试端口状态
`;

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === "help" || command === "-h" || command === "--help") {
    console.log(USAGE);
    return;
  }
  switch (command) {
    case "studio":
      await import("./studio.mjs");
      return;
    case "list":
      for (const pack of listPacks()) {
        console.log(
          `${pack.id.padEnd(16)} ${pack.displayName}  v${pack.version}  [${pack.source}]`,
        );
      }
      return;
    case "status": {
      const status = await grokBotStatus();
      console.log(JSON.stringify(status, null, 2));
      return;
    }
    case "snapshot": {
      console.log(JSON.stringify(await snapshotWithStatus()));
      return;
    }
    case "open": {
      const result = await wearSkin(args[0]);
      console.log(`已打开并套上 ${result.pack.displayName}`);
      return;
    }
    case "menubar": {
      const app = await openMenuBar();
      console.log(`菜单栏已打开：${app}`);
      return;
    }
    case "follow": {
      const prefs = writePrefs({ followOfficialLaunch: parseOnOff(args[0]) });
      console.log(
        prefs.followOfficialLaunch
          ? "已打开：从官方 Dock 图标启动时也会套上上一套皮肤（菜单栏需要在跑）。"
          : "已关闭：只有启动器或菜单栏会套皮肤。",
      );
      return;
    }
    case "login": {
      const prefs = writePrefs({ openAtLogin: parseOnOff(args[0]) });
      console.log(
        prefs.openAtLogin
          ? "已打开：登录时启动皮肤菜单栏。"
          : "已关闭：登录时不自动打开菜单栏。",
      );
      return;
    }
    case "apply": {
      const pack = requirePack(args[0]);
      await revealAvatar(pack);
      console.log(`头像路径已复制，Finder 已选中：\n  ${pack.avatarAbs}`);
      if (pack.bot.generatePrompt) {
        console.log(`\nGenerate 提示词：\n${pack.bot.generatePrompt}`);
      }
      const status = await grokBotStatus();
      if (status.debug) {
        const result = await applyChrome(pack);
        console.log(`界面 CSS 已注入（${result.cssBytes} bytes）`);
      } else {
        console.log(
          `\n界面皮肤需要调试端口。先退出 Grok Bot，然后运行：\n  grok-bot-skin launch ${pack.id}`,
        );
      }
      return;
    }
    case "avatar": {
      const pack = requirePack(args[0]);
      await revealAvatar(pack);
      console.log(pack.avatarAbs);
      return;
    }
    case "chrome": {
      const pack = resolvePack(args[0]);
      const result = await applyChrome(pack);
      console.log(`界面 CSS 已注入（${result.cssBytes} bytes）`);
      return;
    }
    case "launch": {
      const packId = args.find((arg) => !arg.startsWith("--"));
      const result = await wearSkin(packId);
      console.log(`Grok Bot 已套上 ${result.pack.displayName}（${result.chrome.cssBytes} bytes）`);
      if (!args.includes("--chrome-only")) {
        await revealAvatar(result.pack);
        console.log("头像已在 Finder 中选中，按官方 Upload 流程设置。");
      }
      if (args.includes("--once")) return;
      console.log("正在保持注入。按 Ctrl+C 结束（不会退出 Grok Bot）。");
      setInterval(async () => {
        try {
          await applyChrome(result.pack, { persist: false });
        } catch (error) {
          console.error(error.message);
        }
      }, 4000);
      return;
    }
    case "clear":
      await clearChrome();
      console.log("已移除界面皮肤。");
      return;
    case "compile": {
      const targets = args[0] ? [requirePack(args[0])] : listPacks();
      for (const pack of targets) {
        const css = compileOverlay(pack);
        const out = path.join(pack.packDir, "overlay.css");
        fs.writeFileSync(out, css);
        console.log(out);
      }
      return;
    }
    case "pack": {
      const file = await exportPack(requirePack(args[0]));
      console.log(file);
      return;
    }
    case "import": {
      if (!args[0]) throw new PackError("import 需要 zip 路径");
      const pack = await importPack(path.resolve(args[0]));
      console.log(`已导入 ${pack.id}@${pack.version} → ${pack.packDir}`);
      return;
    }
    case "validate": {
      if (args[0]) {
        const jsonPath = path.resolve(args[0]);
        const pack = loadPack(
          jsonPath.endsWith("skin.json") ? jsonPath : path.join(jsonPath, "skin.json"),
        );
        printIssues(pack);
        return;
      }
      for (const pack of listPacks()) printIssues(pack);
      return;
    }
    default:
      throw new PackError(`Unknown command: ${command}\n${USAGE}`);
  }
}

function requirePack(id) {
  if (!id) throw new PackError("请提供皮肤 id，例如 ink-night");
  return getPack(id);
}

function printIssues(pack) {
  const issues = pack.issues || validatePack(pack, pack.packDir);
  const prefix = `${pack.id}@${pack.version}`;
  if (!issues.length) {
    console.log(`${prefix} ok`);
    return;
  }
  for (const issue of issues) {
    console.log(`${prefix} ${issue.level}: ${issue.message}`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
