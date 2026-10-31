# 编写并分享 Grok Bot 皮肤

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
| `bot.accent` | 预览/强调色 |
| `chrome.tokens.text` | 前景，对应 `--cursor-base` |
| `chrome.tokens.chrome` | 窗口底 |
| `chrome.tokens.sidebar` | 侧栏 |
| `chrome.tokens.pane` | 对话表面 |
| `chrome.tokens.accent` | 强调色 |
| `chrome.tokens.extra` | 直接写 `--sand-...` 等变量 |
| `chrome.customCss` | 追加 CSS，选择器尽量保守 |

## 界面 token

Grok Bot 的表面色大量是 `color-mix(var(--cursor-base), transparent)`。改 `text` / `chrome` / `accent` 通常就够。硬编码在 class 里的颜色覆盖不到，这是有意的：皮肤跟 App 小版本走，不绑死选择器。

壁纸画在 `.sand-shell` 上（窗口真正的不透明层），聊天区保持透明才能透出来。`wallpaperOpacity` 越大，山、雾这些图越清楚。Grok Bot 的 CSP 允许 `img-src file:`。

## 校验与打包

```bash
npx grok-bot-skin validate packs/my-skin
npx grok-bot-skin compile my-skin
npx grok-bot-skin pack my-skin
```

zip 根目录就是 `skin.json`。对方 `import` 后出现在用户 packs 目录。
