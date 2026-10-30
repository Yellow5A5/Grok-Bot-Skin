#!/usr/bin/env node
import { execFile } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { promisify } from "node:util";
import { exportPack } from "../src/lib/archive.mjs";
import {
  applyChrome,
  grokBotStatus,
  revealAvatar,
} from "../src/lib/apply.mjs";
import { wearSkin } from "../src/lib/wear.mjs";
import { compileOverlay } from "../src/lib/compile.mjs";
import { getPack, listPacks, PackError, publicPack } from "../src/lib/pack.mjs";
import { STUDIO_PORT, studioDir } from "../src/lib/paths.mjs";

const execFileAsync = promisify(execFile);
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".zip": "application/zip",
};

function json(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(body);
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function sendFile(response, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  response.writeHead(200, {
    "content-type": MIME[ext] || "application/octet-stream",
    "cache-control": "no-store",
  });
  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://127.0.0.1:${STUDIO_PORT}`);
    if (request.method === "GET" && url.pathname === "/api/packs") {
      return json(response, 200, listPacks().map(publicPack));
    }
    if (request.method === "GET" && url.pathname === "/api/status") {
      return json(response, 200, await grokBotStatus());
    }
    const packAsset = url.pathname.match(/^\/packs\/([^/]+)\/(avatar|wallpaper)$/);
    if (request.method === "GET" && packAsset) {
      const pack = getPack(packAsset[1]);
      const file = packAsset[2] === "avatar" ? pack.avatarAbs : pack.wallpaperAbs;
      if (!file || !fs.existsSync(file)) {
        response.writeHead(404);
        return response.end("missing");
      }
      return sendFile(response, file);
    }
    if (request.method === "GET" && url.pathname.match(/^\/api\/packs\/([^/]+)\/overlay\.css$/)) {
      const id = url.pathname.split("/")[3];
      const css = compileOverlay(getPack(id), {
        wallpaperUrl: `/packs/${id}/wallpaper`,
      });
      response.writeHead(200, { "content-type": "text/css; charset=utf-8" });
      return response.end(css);
    }
    if (request.method === "POST" && url.pathname === "/api/apply") {
      const body = await readBody(request);
      const pack = getPack(body.id);
      const mode = body.mode || "both";
      const status = await grokBotStatus();
      const result = { status, avatar: null, chrome: null };
      if (mode === "avatar" || mode === "both") {
        result.avatar = await revealAvatar(pack);
      }
      if (mode === "chrome" || mode === "both") {
        if (status.debug) result.chrome = await applyChrome(pack);
        else if (body.launch) {
          const worn = await wearSkin(pack.id);
          result.chrome = worn.chrome;
          result.status = worn.status;
        } else {
          result.chrome = {
            skipped: true,
            reason: "debug-port-closed",
            command: `npx grok-bot-skin open ${pack.id}`,
          };
        }
      }
      return json(response, 200, result);
    }
    if (request.method === "POST" && url.pathname === "/api/export") {
      const body = await readBody(request);
      const file = await exportPack(getPack(body.id));
      return json(response, 200, { file });
    }

    let filePath = path.join(
      studioDir,
      url.pathname === "/" ? "index.html" : path.normalize(url.pathname).replace(/^[/\\]+/, ""),
    );
    if (!filePath.startsWith(studioDir)) {
      response.writeHead(403);
      return response.end("forbidden");
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      response.writeHead(404);
      return response.end("not found");
    }
    return sendFile(response, filePath);
  } catch (error) {
    const status = error instanceof PackError ? 400 : 500;
    json(response, status, { error: error.message });
  }
});

function openStudio(href) {
  console.log(`Grok Bot 皮肤工作室  ${href}`);
  if (process.platform === "darwin") {
    execFileAsync("open", [href]).catch(() => {});
  }
}

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`端口 ${STUDIO_PORT} 已被占用。若工作室已开，直接访问 http://127.0.0.1:${STUDIO_PORT}/`);
    process.exit(1);
  }
  throw error;
});

server.listen(STUDIO_PORT, "127.0.0.1", () => {
  openStudio(`http://127.0.0.1:${STUDIO_PORT}/`);
});

