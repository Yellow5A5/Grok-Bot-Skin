import path from "node:path";
import { pathToFileURL } from "node:url";

const TOKEN_MAP = {
  text: ["--cursor-base", "--sand-text-primary", "--sand-icon-primary"],
  muted: [
    "--sand-text-secondary",
    "--sand-text-tertiary",
    "--cursor-text-secondary",
  ],
  chrome: [
    "--cursor-chrome",
    "--cursor-bg-chrome",
    "--sand-bg-primary",
    "--sand-bg-chrome",
  ],
  sidebar: ["--cursor-sidebar", "--cursor-bg-sidebar"],
  pane: [
    "--cursor-pane",
    "--cursor-elevated",
    "--cursor-bg-elevated",
    "--sand-bg-elevated",
  ],
  accent: [
    "--cursor-accent",
    "--cursor-accent-fill",
    "--sand-bg-accent-primary",
    "--sand-text-accent-primary",
  ],
  border: ["--cursor-stroke-primary", "--border-secondary"],
};

const BEAT = ":not(#\\#):not(#\\#):not(#\\#):not(#\\#)";

function fileUrl(absPath) {
  return pathToFileURL(absPath).href;
}

function applyAssetTokens(css, pack) {
  if (!css || !pack?.packDir) return css ? css.trim() : "";
  const root = path.resolve(pack.packDir);
  return css.replace(/\{\{asset:([^}]+)\}\}/g, (_, rel) => {
    const abs = path.resolve(pack.packDir, rel.trim());
    if (abs !== root && !abs.startsWith(root + path.sep)) return "";
    return fileUrl(abs);
  }).trim();
}

function mix(color, percent) {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

export function compileOverlay(pack, options = {}) {
  const tokens = pack.chrome?.tokens || {};
  const appearance = pack.appearance === "light" ? "light" : "dark";
  const text = tokens.text || (appearance === "light" ? "#1c1c1c" : "#f0f0f0");
  const chrome = tokens.chrome || (appearance === "light" ? "#f5f5f5" : "#141414");
  const sidebar = tokens.sidebar || chrome;
  const pane = tokens.pane || chrome;
  const accent = tokens.accent || pack.bot?.accent || "#599ce7";
  const wallpaperStrength = Math.min(
    1,
    Math.max(0, pack.chrome?.wallpaperOpacity ?? 0.55),
  );
  const veilPercent = Math.round((1 - wallpaperStrength) * 100);

  const wallpaperUrl =
    options.wallpaperUrl !== undefined
      ? options.wallpaperUrl
      : pack.wallpaperAbs
        ? fileUrl(pack.wallpaperAbs)
        : null;

  const decls = [
    `  color-scheme: ${appearance} !important;`,
    `  --grok-skin-id: ${JSON.stringify(pack.id)};`,
    `  --grok-skin-text: ${text};`,
    `  --grok-skin-chrome: ${chrome};`,
    `  --grok-skin-sidebar: ${sidebar};`,
    `  --grok-skin-pane: ${pane};`,
    `  --grok-skin-accent: ${accent};`,
    `  --grok-skin-veil: ${mix("var(--grok-skin-chrome)", veilPercent)};`,
    `  --grok-skin-wallpaper: ${wallpaperUrl ? `url(${JSON.stringify(wallpaperUrl)})` : "none"};`,
  ];

  for (const [key, vars] of Object.entries(TOKEN_MAP)) {
    const value = tokens[key] || (key === "accent" ? accent : null);
    if (!value) continue;
    for (const cssVar of vars) {
      decls.push(`  ${cssVar}: ${value} !important;`);
    }
  }
  decls.push(`  --sand-bg-secondary: ${mix("var(--grok-skin-text)", 6)} !important;`);

  const extra = tokens.extra || {};
  for (const name of Object.keys(extra).sort()) {
    decls.push(`  ${name}: ${extra[name]} !important;`);
  }

  const host = `html[data-grok-bot-skin]`;
  const shell = `${host} .sand-shell${BEAT}`;
  const side = `${host} .sand-agents-sidebar${BEAT}`;
  const chat = `${host} .sand-chat${BEAT}, ${host} .sand-chat-stage${BEAT}`;
  const prompt = `${host} .sand-prompt-shell${BEAT}, ${host} .sand-kit-message-input-frame${BEAT}`;
  const message = `${host} .sand-message${BEAT}`;

  const blocks = [
    `/* grok-bot-skin ${pack.id}@${pack.version} */`,
    `:root, html, body, #root {\n${decls.join("\n")}\n}`,
    `${shell} {
  background-color: var(--grok-skin-chrome) !important;
  background-image:
    linear-gradient(var(--grok-skin-veil), var(--grok-skin-veil)),
    var(--grok-skin-wallpaper) !important;
  background-size: cover !important;
  background-position: center !important;
  background-repeat: no-repeat !important;
  background-attachment: fixed !important;
  color: var(--grok-skin-text) !important;
}`,
    `${side} {
  background: ${mix("var(--grok-skin-sidebar)", 78)} !important;
  background-image: none !important;
  box-shadow: inset -1px 0 0 ${mix("var(--grok-skin-accent)", 28)} !important;
}`,
    `${chat} {
  background: transparent !important;
}`,
    `${prompt} {
  background: ${mix("var(--grok-skin-pane)", 72)} !important;
  box-shadow: inset 0 0 0 1px ${mix("var(--grok-skin-accent)", 22)} !important;
}`,
    `${message} {
  background: ${mix("var(--grok-skin-pane)", 48)} !important;
  background-image: none !important;
}`,
  ];

  const customCss = applyAssetTokens(pack.chrome?.customCss, pack);
  if (customCss) {
    blocks.push(customCss);
  }

  return `${blocks.join("\n\n")}\n`;
}

export function injectExpression(css, skinId) {
  return `(() => {
    const id = "grok-bot-skin-overlay";
    document.documentElement.dataset.grokBotSkin = ${JSON.stringify(skinId)};
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.documentElement.appendChild(el);
    }
    el.textContent = ${JSON.stringify(css)};
    const root = getComputedStyle(document.documentElement);
    const v = (name) => root.getPropertyValue(name).trim();
    const shell = document.querySelector(".sand-shell");
    if (shell) {
      const paper = v("--grok-skin-wallpaper");
      const veil = v("--grok-skin-veil");
      shell.style.setProperty("background-color", v("--grok-skin-chrome"), "important");
      shell.style.setProperty(
        "background-image",
        paper && paper !== "none" ? "linear-gradient(" + veil + ", " + veil + "), " + paper : "none",
        "important",
      );
      shell.style.setProperty("background-size", "cover", "important");
      shell.style.setProperty("background-position", "center", "important");
      shell.style.setProperty("background-repeat", "no-repeat", "important");
    }
    const side = document.querySelector(".sand-agents-sidebar");
    if (side) {
      side.style.setProperty(
        "background",
        "color-mix(in srgb, " + v("--grok-skin-sidebar") + " 78%, transparent)",
        "important",
      );
      side.style.setProperty(
        "box-shadow",
        "inset -1px 0 0 color-mix(in srgb, " + v("--grok-skin-accent") + " 35%, transparent)",
        "important",
      );
    }
    return { ok: true, skin: ${JSON.stringify(skinId)}, bytes: el.textContent.length };
  })()`;
}

export function clearExpression() {
  return `(() => {
    const el = document.getElementById("grok-bot-skin-overlay");
    if (el) el.remove();
    delete document.documentElement.dataset.grokBotSkin;
    return { ok: true, cleared: true };
  })()`;
}
