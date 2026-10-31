# Contributing

Thanks for helping with Grok Bot Skin. Please open an issue before large changes.

## Setup

- macOS 13+
- Node 22+
- Grok Bot installed (this repo does not ship the app)

```bash
npm test
```

## Rules

- Do not commit `Grok Bot.app`, `.env`, credentials, or `macos/*.app`.
- Do not patch `/Applications/Grok Bot.app`.
- Use [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary`.
- Keep the English `README.md` current. Update `README.zh-CN.md` in the same change when the user-facing flow changes.
- Bundled art must be original or clearly licensed. No official logos, rips, or frames from other works. Do not mark franchise-inspired packs as CC BY.

## Pull requests

See `.github/pull_request_template.md`. Include `npm test` in the notes.
