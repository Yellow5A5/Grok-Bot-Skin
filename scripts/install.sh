#!/bin/bash
# Copy this kit into Application Support and start the menu bar.
#
#   curl -fsSL https://raw.githubusercontent.com/Yellow5A5/Grok-Bot-Skin/main/scripts/install.sh | bash
#   ./scripts/install.sh
set -euo pipefail

DEFAULT_REPO="https://github.com/Yellow5A5/Grok-Bot-Skin"
DEST="${GROK_BOT_SKIN_HOME:-$HOME/Library/Application Support/grok-bot-skin/app}"
REPO="${GROK_BOT_SKIN_REPO:-$DEFAULT_REPO}"

usage() {
  cat <<EOF
Install Grok Bot Skin into ~/Library/Application Support/grok-bot-skin/app
and open the menu bar extra.

  curl -fsSL https://raw.githubusercontent.com/Yellow5A5/Grok-Bot-Skin/main/scripts/install.sh | bash
  ./scripts/install.sh
  ./scripts/install.sh --repo https://github.com/Yellow5A5/Grok-Bot-Skin

Needs macOS, Node 22+, and Xcode Command Line Tools. Does not modify Grok Bot.app.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      REPO="${2:-}"
      shift 2
      ;;
    --repo=*)
      REPO="${1#*=}"
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This extra is for macOS." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Need Node.js 22 or newer." >&2
  exit 1
fi

node_major="$(node -p "Number(process.versions.node.split('.')[0])")"
if [[ "$node_major" -lt 22 ]]; then
  echo "Need Node.js 22 or newer (found $(node -v))." >&2
  exit 1
fi

if ! command -v swiftc >/dev/null 2>&1; then
  echo "Need Xcode Command Line Tools. Run: xcode-select --install" >&2
  exit 1
fi

local_root() {
  local script="${BASH_SOURCE[0]:-}"
  [[ -n "$script" && -f "$script" ]] || return 1
  local root
  root="$(cd "$(dirname "$script")/.." && pwd)" || return 1
  [[ -f "$root/package.json" ]] || return 1
  grep -q '"name": "grok-bot-skin"' "$root/package.json" || return 1
  printf '%s\n' "$root"
}

github_archive() {
  local url="$1"
  local owner repo
  if [[ "$url" =~ github.com[:/]([^/]+)/([^/#]+) ]]; then
    owner="${BASH_REMATCH[1]}"
    repo="${BASH_REMATCH[2]}"
    repo="${repo%.git}"
  else
    return 1
  fi
  local tmp
  tmp="$(mktemp -d "${TMPDIR:-/tmp}/grok-bot-skin.XXXXXX")"
  local tarball="$tmp/src.tar.gz"
  local fetched=0
  local ref
  for ref in main master; do
    if curl -fsSL "https://github.com/${owner}/${repo}/archive/refs/heads/${ref}.tar.gz" -o "$tarball"; then
      fetched=1
      break
    fi
  done
  if [[ "$fetched" -ne 1 ]]; then
    rm -rf "$tmp"
    return 1
  fi
  tar -xzf "$tarball" -C "$tmp"
  local found
  found="$(find "$tmp" -maxdepth 2 -name package.json -print -quit)"
  if [[ -z "$found" ]]; then
    rm -rf "$tmp"
    return 1
  fi
  (cd "$(dirname "$found")" && pwd)
}

fetch_repo() {
  if [[ -z "$REPO" ]]; then
    echo "No checkout here. Pass --repo $DEFAULT_REPO" >&2
    exit 1
  fi
  local unpacked
  if unpacked="$(github_archive "$REPO")"; then
    printf '%s\n' "$unpacked"
    return
  fi
  if ! command -v git >/dev/null 2>&1; then
    echo "Could not download $REPO (need a public GitHub URL, or install git)." >&2
    exit 1
  fi
  local tmp
  tmp="$(mktemp -d "${TMPDIR:-/tmp}/grok-bot-skin.XXXXXX")"
  git clone --depth 1 "$REPO" "$tmp/src" >&2
  printf '%s\n' "$tmp/src"
}

SOURCE="$(local_root || true)"
if [[ -z "$SOURCE" ]]; then
  SOURCE="$(fetch_repo)"
fi

mkdir -p "$DEST"
src_real="$(cd "$SOURCE" && pwd)"
dst_real="$(cd "$DEST" && pwd)"
if [[ "$src_real" != "$dst_real" ]]; then
  if ! command -v rsync >/dev/null 2>&1; then
    echo "Need rsync." >&2
    exit 1
  fi
  rsync -a --delete \
    --exclude '.git/' \
    --exclude 'Grok Bot.app/' \
    --exclude 'macos/Grok Bot Skin.app/' \
    --exclude 'node_modules/' \
    --exclude 'dist/' \
    --exclude '.cursor/' \
    --exclude '.inspect/' \
    "$src_real/" "$dst_real/"
fi

echo "Installed to $dst_real"
cd "$dst_real"
exec node bin/cli.mjs menubar
