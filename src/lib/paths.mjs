import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const kitRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export const bundledPacksDir = path.join(kitRoot, "packs");
export const studioDir = path.join(kitRoot, "studio");
export const schemaPath = path.join(kitRoot, "schema", "skin.schema.json");
export const DEBUG_PORT = 19222;
export const STUDIO_PORT = 4177;
export const menuBarAppPath = path.join(kitRoot, "macos", "Grok Bot Skin.app");

export function userRoot() {
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library/Application Support/grok-bot-skin");
  }
  if (process.platform === "win32") {
    return path.join(
      process.env.APPDATA || path.join(os.homedir(), "AppData/Roaming"),
      "grok-bot-skin",
    );
  }
  return path.join(
    process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"),
    "grok-bot-skin",
  );
}

export function userPacksDir() {
  return path.join(userRoot(), "packs");
}

export function activePath() {
  return path.join(userRoot(), "active.json");
}

export function ensureUserRoot() {
  fs.mkdirSync(userPacksDir(), { recursive: true });
  return userRoot();
}

export function findGrokBotApp() {
  const candidates = [
    path.join(kitRoot, "Grok Bot.app"),
    "/Applications/Grok Bot.app",
    path.join(os.homedir(), "Applications/Grok Bot.app"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}
