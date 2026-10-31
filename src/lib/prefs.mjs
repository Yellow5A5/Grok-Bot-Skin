import fs from "node:fs";
import path from "node:path";
import { ensureUserRoot, userRoot } from "./paths.mjs";

export const DEFAULT_PREFS = {
  followOfficialLaunch: true,
  openAtLogin: true,
  showUsageHud: true,
  locale: "en",
};

export function normalizeLocale(value) {
  const token = String(value ?? "en").trim().toLowerCase().replace("_", "-");
  if (["zh", "zh-cn", "zh-hans", "chinese", "cn"].includes(token)) return "zh";
  return "en";
}

export function prefsPath() {
  return path.join(userRoot(), "prefs.json");
}

export function readPrefs() {
  try {
    const parsed = JSON.parse(fs.readFileSync(prefsPath(), "utf8"));
    return {
      ...DEFAULT_PREFS,
      ...parsed,
      followOfficialLaunch: parsed.followOfficialLaunch !== false,
      openAtLogin: parsed.openAtLogin !== false,
      showUsageHud: parsed.showUsageHud !== false,
      locale: normalizeLocale(parsed.locale),
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function writePrefs(partial) {
  const next = { ...readPrefs(), ...partial };
  ensureUserRoot();
  fs.writeFileSync(prefsPath(), `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

export function parseOnOff(value) {
  const token = String(value ?? "on").trim().toLowerCase();
  if (["off", "0", "false", "no"].includes(token)) return false;
  if (["on", "1", "true", "yes", ""].includes(token)) return true;
  throw new Error("请使用 on 或 off");
}

export function parseLocale(value) {
  const token = String(value ?? "en").trim().toLowerCase().replace("_", "-");
  if (["zh", "zh-cn", "zh-hans", "chinese", "cn"].includes(token)) return "zh";
  if (["en", "en-us", "english", ""].includes(token)) return "en";
  throw new Error("Use en or zh");
}
