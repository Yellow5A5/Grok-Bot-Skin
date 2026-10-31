# Grok Bot 皮肤工具

[English](README.md) | **中文**

给 [Grok Bot](https://grok.com) 换皮肤，并且让别人也能换。皮肤是独立的数据包，**不修改** `Grok Bot.app`。

这套工具只做 **界面**：覆盖 token，并把壁纸画在窗口层 `.sand-shell` 上。Bot 头像是 Grok Bot 自己的功能，这里不管。

日常：菜单栏记住上一套皮肤，列表里来回切。菜单栏在跑时，点官方 Dock 图标也会套上（先退出没带端口的进程，再带端口打开）。官方包本身不动。

```mermaid
flowchart LR
  pack["skin.json + 壁纸"] --> studio["皮肤工作室"]
  menubar["菜单栏常驻"] --> grok["带调试端口的 Grok Bot"]
  dock["官方 Dock 图标"] --> menubar
  grok --> css["CDP 注入 CSS"]
  pack --> zip[".grokskin.zip"]
  zip --> import["别人 import"]
```

非官方社区项目，与 xAI、Cursor 及任何影视或动漫版权方无关。自带插画是粉丝向原创，不是官方素材。不要再分发 `Grok Bot.app`。

## 快速开始

需要 Node 22+，macOS。

第一次，打开菜单栏并让它登录时启动：

```bash
npm run menubar
# 或双击 scripts/Show Skin Menu.command
```

菜单栏勾选 **登录时打开菜单栏**、**官方 Dock 打开也套皮肤**（默认都开）。之后：

- 点 Dock 里官方 Grok Bot：会套上上一套皮肤
- 点菜单栏皮肤名：原地换肤
- **显示订阅用量**（默认开）：能读到 token 就显示消耗，否则显示本周期已用/剩余百分比。不想看就取消勾选

预览、做包、改 token：

```bash
npm run studio
# 或双击 scripts/Open Skin Studio.command
```

| id | 名字 | Appearance |
|---|---|---|
| `ink-night` | 水墨夜 | Dark |
| `straw-sea` | 草帽海 | Light |
| `leaf-warm` | 木叶暖 | Light |
| `avenger-neon` | 复联霓 | Dark |
| `jade-grove` | 青玉林 | Dark |

状态在 `~/Library/Application Support/grok-bot-skin/`：`active.json` 是上一套皮肤，`prefs.json` 是 Dock 跟随、登录启动和是否显示订阅用量。

把 Grok Bot 的 Settings → Appearance 调成皮肤要求的 Dark / Light。

## 界面怎么套上

Grok Bot 没有官方主题 API。启动器给进程加上本机回环调试端口（`127.0.0.1:19222`），再注入 CSS。只改颜色变量，不改 asar、不破签名。套上皮肤后，侧栏头像**上方**默认有一块用量卡片：接口给 token 就显示消耗，否则显示订阅**已用 / 剩余百分比**。卡片不拦截点击。菜单栏取消勾选 **显示订阅用量**，或 `npx grok-bot-skin usage off`。

| 你怎么打开 | 会怎样 |
|---|---|
| 菜单栏「打开并套上」 | 用上一套皮肤打开；已在跑且端口开着则原地换肤 |
| 菜单栏皮肤名 | 同上，并记住这一套 |
| 官方 Dock 图标，且菜单栏在跑、跟随已开 | 若这次没带端口，会先退出再带端口打开并套上 |
| 官方 Dock 图标，菜单栏没开或跟随已关 | 原样官方进程，界面没皮肤 |

关掉跟随：菜单栏取消勾选，或 `npx grok-bot-skin follow off`。

不要改 `/Applications/Grok Bot.app`：Developer ID 签名、公证、`ElectronAsarIntegrity`，一改就破校验，官方更新也会冲掉。

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

见 [docs/authoring.zh-CN.md](docs/authoring.zh-CN.md)（[English](docs/authoring.md)）。最短路径：

1. 复制 `examples/template/` 或任意 `packs/*`
2. 文件夹名与 `skin.json` 的 `id` 一致
3. 换成自己的壁纸和封面图
4. 改 `chrome.tokens`
5. `npx grok-bot-skin validate packs/my-skin`
6. `npx grok-bot-skin pack my-skin`

## 命令

日常只用这两个：

```bash
npm run menubar   # 第一次：菜单栏、登录启动、Dock 跟随
npm run studio    # 预览、做包
```

`npm run open` 只在菜单栏没跑时才用得上。做包、导入写在上面两节。其余给调试用，`npx grok-bot-skin` 会列出。

## 许可

代码为 [MIT](LICENSE)。自带包和模板的元数据默认 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。另见 [CONTRIBUTING.md](CONTRIBUTING.md) 与 [SECURITY.md](SECURITY.md)。
