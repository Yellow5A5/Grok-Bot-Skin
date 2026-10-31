# Security

This kit talks to a **loopback** Chrome DevTools port that the launcher adds to Grok Bot (`127.0.0.1:19222`). It does not patch the signed app and does not send your Grok or Cursor credentials anywhere else.

## Please do not

- Publish a remote-debugging port on a non-loopback interface
- Check in `Grok Bot.app`, session cookies, or usage API dumps
- File a public issue that includes account identifiers or chat transcripts

## Report a vulnerability

After the repository is on GitHub, use **Security → Advisories → New draft advisory** so the report stays private until a fix exists.

If the repo is still local-only, open a private note with the maintainer instead of pasting secrets into a chat or a public issue.
