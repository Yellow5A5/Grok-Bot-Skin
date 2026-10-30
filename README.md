# Grok Bot 皮肤工具

给 Grok Bot 换皮肤，并且让别人也能换。皮肤是独立的数据包，**不修改** `Grok Bot.app`，更新 App 也不会把皮肤冲掉。

做两件事：

1. **头像** — 正方形插画，走 Grok Bot 官方 Upload（或 Generate 提示词）。
2. **界面** — 覆盖 Grok Bot 的 token，并把壁纸画在真正的窗口层 `.sand-shell` 上。

日常用法是启动器记住上一套皮肤，菜单栏在五套之间切换。不修改官方 `Grok Bot.app`。菜单栏常驻后，从官方 Dock 图标打开也会套上上一套皮肤：发现没有调试端口就先退出再带端口打开。

```mermaid
flowchart LR
  pack["skin.json + 图"] --> studio["皮肤工作室"]
  studio --> avatar["官方 Upload 头像"]
  launcher["启动器 / 菜单栏"] --> grok["带调试端口的 Grok Bot"]
  grok --> css["CDP 注入 CSS"]
  pack --> zip[".grokskin.zip"]
  zip --> import["别人 import"]
```

## 快速开始

需要 Node 22+（本机已可）。

日常打开（记住上一套，一点即套上；若 Grok Bot 已在跑则直接换肤）：

```bash
npm run open
# 或双击 scripts/Open Grok Bot.command
```

菜单栏显示当前皮肤，五个包来回切：

```bash
npm run menubar
# 或双击 scripts/Show Skin Menu.command
```

预览、做包、改 token：

```bash
npm run studio
# 或双击 scripts/Open Skin Studio.command
```

| id | 名字 | Appearance |
|---|---|---|
| `ink-night` | 水墨夜 | Dark |
| `paper-dawn` | 宣纸晨 | Light |
| `starlight` | 星光 | Dark |
| `jade-grove` | 青玉林 | Dark |
| `ember-forge` | 熔炉 | Dark |

上次用的皮肤记在 `~/Library/Application Support/grok-bot-skin/active.json`。

## 套到自己的 Grok Bot 上

### 界面（启动器）

Grok Bot 没有官方主题 API。启动器会带上本机回环调试端口（`127.0.0.1:19222`）再注入 CSS，只改 token，不改 asar、不破签名。

- 点启动器或菜单里的「打开并套上」：用上一套皮肤打开。
- 若 Grok Bot 已用本启动器打开：菜单里点另一套会原地换肤。
- 菜单栏打开且勾选「官方 Dock 打开也套皮肤」时：点官方 Dock 图标也会被带上调试端口并套上上一套皮肤。这不是改官方包，只是菜单栏跟着那次启动。
- 关掉该选项后，官方 Dock 图标又会打开未套皮肤的 Grok Bot。
- 不要改 `/Applications/Grok Bot.app`：它有 Developer ID 签名、公证和 `ElectronAsarIntegrity`，一改就破校验，官方更新也会冲掉。

把 Settings → Appearance 调成皮肤要求的 Dark / Light。

### 头像（所有人都能用，会同步到手机）

1. 工作室点「套用头像」，或 `npx grok-bot-skin avatar ink-night`
2. 打开对应 Bot 的对话 → 点顶部名字 → 点头像 → **Upload** → 把 Finder 里选中的图拖进去 → **Set avatar**

也可以把皮肤包里的 `bot.generatePrompt` 贴到 **Generate** 页，让 Grok Bot 自己重画一张。

## 分享给别人

```bash
npx grok-bot-skin pack ink-night
# 得到 dist/ink-night-1.0.0.grokskin.zip
```

对方：

```bash
npx grok-bot-skin import ~/Downloads/ink-night-1.0.0.grokskin.zip
npx grok-bot-skin studio
```

导入的包放在 `~/Library/Application Support/grok-bot-skin/packs/`，不污染仓库。同 id 时用户包覆盖自带包。

## 自己做一套皮肤

见 [docs/authoring.md](docs/authoring.md)。最短路径：

1. 复制 `examples/template/` 或任意 `packs/*`
2. 文件夹名与 `skin.json` 的 `id` 一致
3. 换成自己的正方形头像（主体靠中间，圆形裁切也看得清）
4. 改 `chrome.tokens`
5. `npx grok-bot-skin validate packs/my-skin`
6. `npx grok-bot-skin pack my-skin`

## 命令

```
npx grok-bot-skin open [id]
npx grok-bot-skin menubar
npx grok-bot-skin follow on
npx grok-bot-skin login on
npx grok-bot-skin studio
npx grok-bot-skin list
npx grok-bot-skin apply <id>
npx grok-bot-skin launch [id]
npx grok-bot-skin avatar <id>
npx grok-bot-skin chrome [id]
npx grok-bot-skin clear
npx grok-bot-skin pack <id>
npx grok-bot-skin import <zip>
npx grok-bot-skin validate
```

## 为什么不改 Grok Bot.app

应用带 `ElectronAsarIntegrity` 和代码签名。改 asar 会破校验，也没法跟着官方更新走。皮肤包 + 官方头像上传 + 启动器注入 CSS，才是可维护、可分发的做法。
