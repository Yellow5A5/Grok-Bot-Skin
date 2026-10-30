import { DEBUG_PORT } from "./paths.mjs";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function debugAvailable(port = DEBUG_PORT) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`, {
      signal: AbortSignal.timeout(800),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function listTargets(port = DEBUG_PORT) {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`, {
    signal: AbortSignal.timeout(2000),
  });
  if (!response.ok) {
    throw new Error(`CDP list failed: HTTP ${response.status}`);
  }
  return response.json();
}

export async function waitForDebug(port = DEBUG_PORT, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await debugAvailable(port)) return true;
    await sleep(400);
  }
  return false;
}

function onceOpen(ws) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("CDP websocket timeout")), 8000);
    ws.addEventListener("open", () => {
      clearTimeout(timer);
      resolve();
    });
    ws.addEventListener("error", (event) => {
      clearTimeout(timer);
      reject(event.error || new Error("CDP websocket error"));
    });
  });
}

export async function withSession(wsUrl, fn) {
  if (typeof WebSocket === "undefined") {
    throw new Error("Need Node 22+ for WebSocket (this machine has no global WebSocket)");
  }
  const ws = new WebSocket(wsUrl);
  await onceOpen(ws);
  let nextId = 0;
  const pending = new Map();
  const onMessage = (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id == null) return;
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(message.error.message || "CDP error"));
    else waiter.resolve(message.result);
  };
  ws.addEventListener("message", onMessage);
  const send = (method, params = {}) => {
    const id = ++nextId;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  };
  try {
    return await fn({ send });
  } finally {
    ws.removeEventListener("message", onMessage);
    ws.close();
  }
}

export async function evaluateOnPages(
  expression,
  port = DEBUG_PORT,
  { persist = false } = {},
) {
  const targets = await listTargets(port);
  const pages = targets.filter(
    (target) =>
      target.webSocketDebuggerUrl &&
      (target.type === "page" || target.type === "webview" || !target.type),
  );
  if (!pages.length) {
    throw new Error("Grok Bot debug port is open, but no page target was found");
  }
  const results = [];
  for (const page of pages) {
    const result = await withSession(page.webSocketDebuggerUrl, async ({ send }) => {
      await send("Runtime.enable");
      if (persist) {
        await send("Page.enable");
        await send("Page.addScriptToEvaluateOnNewDocument", { source: expression });
      }
      return send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
    });
    results.push({
      title: page.title,
      url: page.url,
      result: result?.result?.value ?? result,
    });
  }
  return results;
}
