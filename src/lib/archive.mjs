import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { kitRoot, userPacksDir, ensureUserRoot } from "./paths.mjs";
import { loadPack, PackError } from "./pack.mjs";

const execFileAsync = promisify(execFile);

export function distDir() {
  const dir = path.join(kitRoot, "dist");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export async function exportPack(pack) {
  const out = path.join(distDir(), `${pack.id}-${pack.version}.grokskin.zip`);
  if (fs.existsSync(out)) fs.unlinkSync(out);
  await execFileAsync(
    "zip",
    ["-r", "-q", out, ".", "-x", ".DS_Store", "overlay.css"],
    { cwd: pack.packDir },
  );
  return out;
}

export async function importPack(zipPath) {
  if (!fs.existsSync(zipPath)) throw new PackError(`File not found: ${zipPath}`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "grokskin-"));
  await execFileAsync("unzip", ["-q", zipPath, "-d", tmp]);
  const jsonPath = findSkinJson(tmp);
  if (!jsonPath) throw new PackError("Zip is missing skin.json");
  const pack = loadPack(jsonPath);
  ensureUserRoot();
  const dest = path.join(userPacksDir(), pack.id);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(path.dirname(jsonPath), dest, { recursive: true });
  fs.rmSync(tmp, { recursive: true, force: true });
  return loadPack(path.join(dest, "skin.json"));
}

function findSkinJson(root) {
  const direct = path.join(root, "skin.json");
  if (fs.existsSync(direct)) return direct;
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const nested = path.join(root, entry.name, "skin.json");
    if (fs.existsSync(nested)) return nested;
  }
  return null;
}
