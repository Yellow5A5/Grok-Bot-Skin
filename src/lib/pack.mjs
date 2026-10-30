import fs from "node:fs";
import path from "node:path";
import { bundledPacksDir, userPacksDir } from "./paths.mjs";

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERSION_RE = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[a-z0-9.]+)?$/;
const HEX_RE = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export class PackError extends Error {
  constructor(message, extra = {}) {
    super(message);
    this.name = "PackError";
    this.extra = extra;
  }
}

export function resolveAsset(packDir, rel) {
  if (!rel) return null;
  const abs = path.resolve(packDir, rel);
  const root = path.resolve(packDir);
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    throw new PackError(`Asset path escapes pack folder: ${rel}`);
  }
  return abs;
}

export function loadPack(jsonPath) {
  const packDir = path.dirname(jsonPath);
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  } catch (error) {
    throw new PackError(`Cannot read ${jsonPath}: ${error.message}`);
  }
  const issues = validatePack(raw, packDir);
  const errors = issues.filter((item) => item.level === "error");
  if (errors.length) {
    throw new PackError(
      errors.map((item) => item.message).join("\n"),
      { issues },
    );
  }
  const avatarAbs = resolveAsset(packDir, raw.bot.avatar);
  const wallpaperAbs = raw.chrome?.wallpaper
    ? resolveAsset(packDir, raw.chrome.wallpaper)
    : null;
  const ornamentsPath = path.join(packDir, "ornaments.css");
  let customCss = raw.chrome?.customCss || "";
  if (fs.existsSync(ornamentsPath)) {
    customCss = `${customCss}\n${fs.readFileSync(ornamentsPath, "utf8")}`.trim();
  }
  return {
    ...raw,
    packDir,
    jsonPath,
    avatarAbs,
    wallpaperAbs,
    displayName: raw.nameZh || raw.name,
    issues,
    chrome: raw.chrome
      ? { ...raw.chrome, customCss: customCss || undefined }
      : raw.chrome,
  };
}

export function validatePack(raw, packDir = null) {
  const issues = [];
  const error = (message) => issues.push({ level: "error", message });
  const warn = (message) => issues.push({ level: "warn", message });

  if (!raw || typeof raw !== "object") {
    error("skin.json must be an object");
    return issues;
  }
  if (!ID_RE.test(raw.id || "")) error("id must be kebab-case, like ink-night");
  if (!raw.name) error("name is required");
  if (!VERSION_RE.test(raw.version || "")) {
    error("version must look like 1.0.0");
  }
  if (raw.appearance !== "dark" && raw.appearance !== "light") {
    error("appearance must be dark or light");
  }
  if (!raw.bot?.avatar) error("bot.avatar is required");
  if (!HEX_RE.test(raw.bot?.accent || "")) error("bot.accent must be a hex color");
  if (packDir && raw.bot?.avatar) {
    const avatar = resolveAsset(packDir, raw.bot.avatar);
    if (!fs.existsSync(avatar)) error(`missing avatar: ${raw.bot.avatar}`);
  }
  if (raw.chrome?.wallpaper && packDir) {
    const wallpaper = resolveAsset(packDir, raw.chrome.wallpaper);
    if (!fs.existsSync(wallpaper)) {
      error(`missing wallpaper: ${raw.chrome.wallpaper}`);
    }
  }
  const tokens = raw.chrome?.tokens || {};
  for (const [key, value] of Object.entries(tokens)) {
    if (key === "extra") {
      for (const [varName, varValue] of Object.entries(value || {})) {
        if (!varName.startsWith("--")) {
          error(`chrome.tokens.extra key must start with --: ${varName}`);
        }
        if (typeof varValue !== "string") {
          error(`chrome.tokens.extra.${varName} must be a string`);
        }
      }
      continue;
    }
    if (value && !HEX_RE.test(value)) {
      error(`chrome.tokens.${key} must be a hex color`);
    }
  }
  if (packDir) {
    const folder = path.basename(packDir);
    if (raw.id && folder !== raw.id) {
      warn(`folder name "${folder}" does not match id "${raw.id}"`);
    }
  }
  return issues;
}

function packDirsIn(root) {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, entry.name, "skin.json"))
    .filter((jsonPath) => fs.existsSync(jsonPath));
}

function loadPackQuietly(jsonPath, source) {
  try {
    const pack = loadPack(jsonPath);
    pack.source = source;
    return pack;
  } catch (error) {
    console.warn(`skip ${jsonPath}: ${error.message}`);
    return null;
  }
}

export function listPacks() {
  const byId = new Map();
  for (const jsonPath of packDirsIn(bundledPacksDir)) {
    const pack = loadPackQuietly(jsonPath, "bundled");
    if (pack) byId.set(pack.id, pack);
  }
  for (const jsonPath of packDirsIn(userPacksDir())) {
    const pack = loadPackQuietly(jsonPath, "user");
    if (pack) byId.set(pack.id, pack);
  }
  const featured = [
    "ink-night",
    "paper-dawn",
    "straw-sea",
    "leaf-warm",
    "starlight",
    "jade-grove",
    "ember-forge",
  ];
  return [...byId.values()].sort((a, b) => {
    const ia = featured.indexOf(a.id);
    const ib = featured.indexOf(b.id);
    if (ia === -1 && ib === -1) return a.displayName.localeCompare(b.displayName, "zh");
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

export function getPack(id) {
  const pack = listPacks().find((item) => item.id === id);
  if (!pack) throw new PackError(`Unknown skin: ${id}`);
  return pack;
}

export function publicPack(pack) {
  return {
    id: pack.id,
    name: pack.name,
    nameZh: pack.nameZh || null,
    displayName: pack.displayName,
    version: pack.version,
    author: pack.author || null,
    license: pack.license || null,
    description: pack.description || "",
    appearance: pack.appearance,
    source: pack.source || "bundled",
    bot: {
      avatar: `/packs/${pack.id}/avatar`,
      accent: pack.bot.accent,
      suggestedName: pack.bot.suggestedName || null,
      suggestedLabel: pack.bot.suggestedLabel || null,
      generatePrompt: pack.bot.generatePrompt || null,
    },
    chrome: pack.chrome
      ? {
          wallpaper: pack.wallpaperAbs ? `/packs/${pack.id}/wallpaper` : null,
          wallpaperOpacity: pack.chrome.wallpaperOpacity ?? 0.22,
          tokens: pack.chrome.tokens || {},
        }
      : null,
  };
}
