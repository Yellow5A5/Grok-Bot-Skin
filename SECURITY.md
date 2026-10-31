# Security

This kit talks to a **loopback** Chrome DevTools port that the extra adds to Grok Bot (`127.0.0.1:19222`). Anything else on the same Mac can use that port while it is open. The kit does not patch the signed app and does not send Grok or Cursor credentials elsewhere.

Imported `.grokskin.zip` files can include CSS that is injected into Grok Bot. Only import packs you trust.

## Please do not

- Publish a remote-debugging port on a non-loopback interface
- Check in `Grok Bot.app`, session cookies, or usage API dumps
- File a public issue that includes account identifiers or chat transcripts
- Import a zip from someone you would not let run CSS in Grok Bot

## Report a vulnerability

After the repository is on GitHub, use **Security → Advisories → New draft advisory** so the report stays private until a fix exists.

If the repo is still local-only, open a private note with the maintainer instead of pasting secrets into a chat or a public issue.
