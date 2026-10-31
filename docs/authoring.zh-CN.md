# 编写 Grok Bot 皮肤

[English](authoring.md) | **中文**

一份皮肤就是一个文件夹：

```
my-skin/
  skin.json
  assets/
    avatar.jpg      # 工作室列表封面
    wallpaper.jpg   # 可选
```

`id` 必须等于文件夹名，kebab-case：`ink-night`。

## skin.json

字段以 [schema/skin.schema.json](../schema/skin.schema.json) 为准。核心：

| 字段 | 作用 |
|---|---|
| `appearance` | `dark` 或 `light`，和 Grok Bot Settings → Appearance 对齐 |
| `bot.avatar` | 工作室封面图路径 |
| `bot.accent` | 预览 / 强调色 |
| `chrome.tokens.text` | 前景 |
| `chrome.tokens.chrome` | 窗口底 |
| `chrome.tokens.sidebar` | 侧栏 |
| `chrome.tokens.pane` | 对话表面 |
| `chrome.tokens.accent` | 强调色 |
| `chrome.tokens.extra` | 额外的 `--sand-…` 变量 |
| `chrome.customCss` | 追加 CSS |

改 `text` / `chrome` / `accent` 通常就够。壁纸画在 `.sand-shell` 上。`wallpaperOpacity` 越大，图越清楚。

## 校验与打包

```bash
npx grok-bot-skin validate packs/my-skin
npx grok-bot-skin compile my-skin
npx grok-bot-skin pack my-skin
```

zip 根目录就是 `skin.json`。`import` 后出现在用户 packs 目录。

粉丝向皮肤不要标成 CC BY。许可说明见 [README.zh-CN.md](../README.zh-CN.md)。
