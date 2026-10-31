# Author a Grok Bot skin

**English** | [中文](authoring.zh-CN.md)

A pack is a folder:

```
my-skin/
  skin.json
  assets/
    avatar.jpg      # studio list cover
    wallpaper.jpg   # optional
```

`id` must match the folder name, kebab-case: `ink-night`.

## skin.json

Fields follow [schema/skin.schema.json](../schema/skin.schema.json). Core ones:

| Field | Role |
|---|---|
| `appearance` | `dark` or `light`; match Grok Bot Settings → Appearance |
| `bot.avatar` | Studio cover path |
| `bot.accent` | Preview / accent |
| `chrome.tokens.text` | Foreground |
| `chrome.tokens.chrome` | Window |
| `chrome.tokens.sidebar` | Sidebar |
| `chrome.tokens.pane` | Chat surface |
| `chrome.tokens.accent` | Accent |
| `chrome.tokens.extra` | Extra `--sand-…` variables |
| `chrome.customCss` | Extra CSS |

Changing `text` / `chrome` / `accent` is usually enough. Wallpaper is painted on `.sand-shell`. Raise `wallpaperOpacity` to show more of the illustration.

## Validate and pack

```bash
npx grok-bot-skin validate packs/my-skin
npx grok-bot-skin compile my-skin
npx grok-bot-skin pack my-skin
```

The zip root is `skin.json`. After `import`, the pack lands in the user packs directory.

Do not mark franchise-inspired packs as CC BY. See the License section in [README.md](../README.md).
