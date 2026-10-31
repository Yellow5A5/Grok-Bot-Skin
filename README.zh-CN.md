# Grok Bot 皮肤

[English](README.md) | **中文**

给 macOS 上的 [Grok Bot](https://grok.com) 换皮肤。菜单栏切换，皮肤工作室里预览和导出。侧栏可以显示本周期订阅已用 / 剩余百分比。

全部在用户本机完成：经回环调试口注入 CSS。不上传对话、账号或凭据；订阅用量只在本机读出来画在侧栏。不改签名后的 Grok Bot。

非官方，通过仓库能力获得更好的Grok Bot感官体验。

## 预览


| 水墨夜                                    | 青玉林                                     |
| -------------------------------------- | --------------------------------------- |
| ![水墨夜](docs/screenshots/ink-night.jpg) | ![青玉林](docs/screenshots/jade-grove.jpg) |



| 木叶暖                                    | 复联霓                                       |
| -------------------------------------- | ----------------------------------------- |
| ![木叶暖](docs/screenshots/leaf-warm.jpg) | ![复联霓](docs/screenshots/avenger-neon.jpg) |



| 草帽海                                    |
| -------------------------------------- |
| ![草帽海](docs/screenshots/straw-sea.jpg) |


水墨夜、复联霓、青玉林用 **Dark**。草帽海、木叶暖用 **Light**。在 Grok Bot → Settings → Appearance 里改。

## 安装

需要 macOS 13+、Node 22+、Xcode Command Line Tools，以及 `/Applications` 里的 Grok Bot。脚本不会代装这些。

```bash
curl -fsSL https://raw.githubusercontent.com/Yellow5A5/Grok-Bot-Skin/main/scripts/install.sh | bash
```

脚本会把工具复制到 `~/Library/Application Support/grok-bot-skin/app` 并打开菜单栏。若已经有一份仓库目录，执行 `./scripts/install.sh`（或双击 `scripts/Install Grok Bot Skin.command`）效果相同。

## 菜单栏

![菜单栏](docs/screenshots/menubar.jpg)

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

菜单栏会带着本机回环调试端口（`127.0.0.1:19222`）启动 Grok Bot，再注入 CSS。菜单栏没开、或关掉了跟随，从 Dock 打开就是原装界面。其余命令见 `npx grok-bot-skin`。

## 许可

代码：[MIT](LICENSE)。

`ink-night`、`jade-grove` 和 `examples/template`（含其中的原创插画）：[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。

`straw-sea`、`leaf-warm`、`avenger-neon` 是非官方粉丝向皮肤，名称和形象归权利方。这三套**不是** CC BY。

不要把 `Grok Bot.app` 放进本仓库或你分享的 zip。

[CONTRIBUTING.md](CONTRIBUTING.md) · [SECURITY.md](SECURITY.md)
