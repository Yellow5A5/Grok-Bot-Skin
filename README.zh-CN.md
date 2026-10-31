# Grok Bot 皮肤

[English](README.md) | **中文**

给 macOS 上的 [Grok Bot](https://grok.com) 换皮肤。菜单栏切换，皮肤工作室里预览和导出。

本仓库不含 Grok Bot，也不改 `Grok Bot.app`。

非官方，与 xAI、Cursor 无关。

## 预览

| 水墨夜 | 草帽海 |
|:---:|:---:|
| ![水墨夜](docs/screenshots/ink-night.jpg) | ![草帽海](docs/screenshots/straw-sea.jpg) |

| 木叶暖 | 复联霓 |
|:---:|:---:|
| ![木叶暖](docs/screenshots/leaf-warm.jpg) | ![复联霓](docs/screenshots/avenger-neon.jpg) |

| 青玉林 |
|:---:|
| ![青玉林](docs/screenshots/jade-grove.jpg) |

水墨夜、复联霓、青玉林用 **Dark**。草帽海、木叶暖用 **Light**。在 Grok Bot → Settings → Appearance 里改。

## 安装

macOS、Node 22+，本机已装 Grok Bot。

```bash
curl -fsSL https://raw.githubusercontent.com/Acropolis/grok-bot-skin/main/scripts/install.sh | bash
```

脚本会把工具复制到 `~/Library/Application Support/grok-bot-skin/app` 并打开菜单栏。若已经有一份仓库目录，执行 `./scripts/install.sh`（或双击 `scripts/Install Grok Bot Skin.command`）效果相同。

## 菜单栏

<img src="docs/screenshots/menubar.jpg" alt="菜单栏" width="280">

- 点皮肤名：换皮肤
- **官方 Dock 打开也换皮肤** — 从 Dock 打开时仍用上次的皮肤（菜单栏会重启一次 Grok Bot）
- **显示订阅用量** — 本周期已用 / 剩余百分比
- **登录时打开菜单栏**
- **语言 → English / 中文**
- **皮肤工作室**

设置和导入的包在 `~/Library/Application Support/grok-bot-skin/`。

## 皮肤工作室

菜单栏里的 **皮肤工作室**，或在仓库目录里执行 `npm run studio`。打开 [http://127.0.0.1:4177/](http://127.0.0.1:4177/)。预览、应用，或导出 `.grokskin.zip`。

![皮肤工作室](docs/screenshots/studio.jpg)

## 自己做一套皮肤

[docs/authoring.zh-CN.md](docs/authoring.zh-CN.md) · [English](docs/authoring.md)

1. 复制 `examples/template/` 或任意 `packs/*`
2. 文件夹名与 `skin.json` 的 `id` 一致
3. 换成自己的壁纸和封面
4. 改 `chrome.tokens`
5. `npx grok-bot-skin validate packs/my-skin`
6. `npx grok-bot-skin pack my-skin`

## 分享给别人

```bash
npx grok-bot-skin pack ink-night
# dist/ink-night-1.0.0.grokskin.zip
```

另一台电脑：

```bash
npx grok-bot-skin import ~/Downloads/ink-night-1.0.0.grokskin.zip
npx grok-bot-skin studio
```

导入的包在 `~/Library/Application Support/grok-bot-skin/packs/`。和自带包同 `id` 时，导入的生效。

只导入你信任的 zip。

## 原理

菜单栏会带着本机回环调试端口（`127.0.0.1:19222`）启动 Grok Bot，再注入 CSS。菜单栏没开、或关掉了跟随，从 Dock 打开就是原装界面。

不要改 `/Applications/Grok Bot.app`。其余命令见 `npx grok-bot-skin`。

## 许可

代码：[MIT](LICENSE)。

`ink-night`、`jade-grove` 和 `examples/template`（含其中的原创插画）：[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。

`straw-sea`、`leaf-warm`、`avenger-neon` 是非官方粉丝向皮肤，名称和形象归权利方。这三套**不是** CC BY。

不要把 `Grok Bot.app` 放进本仓库或你分享的 zip。

[CONTRIBUTING.md](CONTRIBUTING.md) · [SECURITY.md](SECURITY.md)
