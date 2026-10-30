# 编写并分享 Grok Bot 皮肤

一份皮肤就是一个文件夹：

```
my-skin/
  skin.json
  assets/
    avatar.jpg      # 必需，正方形，< 25 MB
    wallpaper.jpg   # 可选
```

`id` 必须等于文件夹名，kebab-case：`ink-night`。

## skin.json

字段以 [schema/skin.schema.json](../schema/skin.schema.json) 为准。核心：

| 字段 | 作用 |
|---|---|
| `appearance` | `dark` 或 `light`，和 Grok Bot Settings → Appearance 对齐 |
| `bot.avatar` | 相对路径 |
| `bot.accent` | 头像/气泡建议色 |
| `bot.generatePrompt` | 别人用官方 Generate 页重画头像的提示词 |
| `chrome.tokens.text` | 前景，对应 `--cursor-base` |
| `chrome.tokens.chrome` | 窗口底 |
| `chrome.tokens.sidebar` | 侧栏 |
| `chrome.tokens.pane` | 对话表面 |
| `chrome.tokens.accent` | 强调色 |
| `chrome.tokens.extra` | 直接写 `--sand-...` 等变量 |
| `chrome.customCss` | 追加 CSS，选择器尽量保守 |

## 头像怎么画

Grok Bot 会把图裁成圆。按官方 Generate 约束来：

- 主体居中，铺满方幅，重要细节靠近中心
- 背景铺到四边，不要画圆框、徽章、描边
- 形状清楚，颜色少
- 不要字、logo、水印、界面元件

把同一段提示词写进 `bot.generatePrompt`，别人不用你的文件也能在「编辑头像」的 Generate 页生成接近的图。内置 Bot 要先「创建副本」才能改头像。

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
