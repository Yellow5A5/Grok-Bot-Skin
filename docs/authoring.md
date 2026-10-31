# Author a Grok Bot skin

**English** | [中文](authoring.zh-CN.md)

A pack is a folder:

```
my-skin/
  skin.json
  assets/
    avatar.jpg      # studio cover, not a Grok Bot avatar upload
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
| `chrome.tokens.text` | Foreground (`--cursor-base`) |
| `chrome.tokens.chrome` | Window chrome |
| `chrome.tokens.sidebar` | Sidebar |
| `chrome.tokens.pane` | Chat surface |
| `chrome.tokens.accent` | Accent |
| `chrome.tokens.extra` | Raw `--sand-...` variables |
| `chrome.customCss` | Extra CSS; keep selectors conservative |

## Chrome tokens

Many Grok Bot surfaces are `color-mix(var(--cursor-base), transparent)`. Changing `text` / `chrome` / `accent` is usually enough. Hard-coded class colors are left alone on purpose: packs track the app by tokens, not by hashed selectors.

Wallpaper is painted on `.sand-shell` (the opaque window layer). The chat stage stays transparent so the paper shows through. Higher `wallpaperOpacity` makes the illustration stronger. Grok Bot CSP allows `img-src file:`.

## Validate and pack

```bash
npx grok-bot-skin validate packs/my-skin
npx grok-bot-skin compile my-skin
npx grok-bot-skin pack my-skin
```

The zip root is `skin.json`. After `import`, the pack lands in the user packs directory.
