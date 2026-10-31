const rail = document.querySelector("#rail");
const detail = document.querySelector("#detail");
const statusEl = document.querySelector("#status");
const device = document.querySelector("#device");
const sidebar = document.querySelector("#sidebar");
const transcript = document.querySelector("#transcript");
const deviceTitle = document.querySelector("#device-title");
const composer = document.querySelector("#composer");
const brandTitle = document.querySelector("#brand-title");
const footnote = document.querySelector("#footnote");
const langBar = document.querySelector("#lang");

let packs = [];
let selectedId = null;
let status = null;
let locale = "en";

const COPY = {
  en: {
    documentTitle: "Grok Bot Skin Studio",
    brand: "Grok Bot Skin Studio",
    htmlLang: "en",
    rail: "Skin packs",
    checking: "Checking Grok Bot…",
    statusUnknown: "Can't read Grok Bot status",
    composer: "Message this bot…",
    footnote: "Chrome skins overlay CSS tokens. They do not modify Grok Bot.app.",
    apply: "Apply chrome CSS",
    launch: "Open Grok Bot and wear",
    export: "Export .grokskin.zip",
    previewBots: [
      ["Research", "Sources"],
      ["Inbox", "Later"],
    ],
    preview: (name) => [
      `Wearing “${name}”. The window uses this pack’s tokens and wallpaper.`,
      "Share the zip so someone else can wear it on their Grok Bot.",
      "Export, then they run grok-bot-skin import.",
    ],
    states: {
      "running-debug": "Grok Bot has the debug port. Chrome can be applied now.",
      running: "Grok Bot is running without the debug port. The launcher will quit and reopen it.",
      stopped: "Grok Bot is not running. Use Open Grok Bot and wear.",
    },
    exported: (file) => `Exported: ${file}`,
    skipped: (reason, command) =>
      `Chrome was not injected: ${reason}. Quit Grok Bot, then Open Grok Bot and wear, or run ${command}`,
    applied: (bytes, appearance) =>
      `Chrome CSS injected (${bytes} bytes). If nothing changed, set Appearance to ${appearance}.`,
  },
  zh: {
    documentTitle: "Grok Bot 皮肤工作室",
    brand: "Grok Bot 皮肤工作室",
    htmlLang: "zh-CN",
    rail: "皮肤列表",
    checking: "正在检查 Grok Bot…",
    statusUnknown: "无法读取 Grok Bot 状态",
    composer: "给这个 Bot 发消息…",
    footnote: "界面皮肤通过本地 CSS 覆盖 token，不修改 Grok Bot.app。",
    apply: "套用界面 CSS",
    launch: "启动 Grok Bot 并套上界面",
    export: "导出可分享的 .grokskin.zip",
    previewBots: [
      ["Research", "资料"],
      ["Inbox", "待办"],
    ],
    preview: (name) => [
      `已经套上「${name}」。界面用这套 token 和壁纸。`,
      "把皮肤包发给别人，他们也能给自己的 Grok Bot 换上。",
      "导出 zip 即可。对方运行 grok-bot-skin import 就能装上。",
    ],
    states: {
      "running-debug": "Grok Bot 已开调试端口，可直接套界面",
      running: "Grok Bot 在运行但未开调试端口；启动器会先退出再带端口打开",
      stopped: "Grok Bot 未运行，可用「启动并套上」",
    },
    exported: (file) => `已导出：${file}`,
    skipped: (reason, command) =>
      `界面未注入：${reason}。先退出 Grok Bot，再点「启动并套上」，或运行 ${command}`,
    applied: (bytes, appearance) =>
      `界面 CSS 已注入（${bytes} bytes）。若没看到变化，把 Appearance 调成 ${appearance}。`,
  },
};

function copy() {
  return COPY[locale] || COPY.en;
}

function packName(pack) {
  if (locale === "zh") return pack.nameZh || pack.name || pack.id;
  return pack.name || pack.nameZh || pack.id;
}

function packDescription(pack) {
  if (locale === "zh") return pack.description || pack.descriptionEn || "";
  return pack.descriptionEn || pack.description || "";
}

async function getJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || response.statusText);
  return payload;
}

function selected() {
  return packs.find((pack) => pack.id === selectedId) || packs[0];
}

function paintChrome() {
  const text = copy();
  document.documentElement.lang = text.htmlLang;
  document.title = text.documentTitle;
  brandTitle.textContent = text.brand;
  composer.textContent = text.composer;
  footnote.textContent = text.footnote;
  rail.setAttribute("aria-label", text.rail);
  langBar.setAttribute("aria-label", locale === "zh" ? "语言" : "Language");
  for (const button of langBar.querySelectorAll("[data-locale]")) {
    button.setAttribute("aria-pressed", button.dataset.locale === locale ? "true" : "false");
  }
}

function paintStatus() {
  const text = copy();
  statusEl.textContent = status
    ? text.states[status.state] || status.state
    : text.statusUnknown;
}

function paintRail() {
  rail.innerHTML = "";
  for (const pack of packs) {
    const button = document.createElement("button");
    button.className = "pack";
    button.type = "button";
    button.setAttribute("aria-selected", pack.id === selectedId ? "true" : "false");
    button.innerHTML = `<img alt="" src="${pack.bot.avatar}" /><span><b>${packName(pack)}</b><small>${pack.id} · ${pack.appearance}</small></span>`;
    button.addEventListener("click", () => {
      selectedId = pack.id;
      paint();
    });
    rail.append(button);
  }
}

function paintPreview(pack) {
  const tokens = pack.chrome?.tokens || {};
  const text = copy();
  const name = packName(pack);
  device.style.setProperty("--skin-text", tokens.text || "#f0f0f0");
  device.style.setProperty("--skin-chrome", tokens.chrome || "#141414");
  device.style.setProperty("--skin-sidebar", tokens.sidebar || tokens.chrome || "#181818");
  device.style.setProperty("--skin-pane", tokens.pane || "#181818");
  device.style.setProperty("--skin-accent", tokens.accent || pack.bot.accent);
  device.style.setProperty(
    "--skin-wallpaper",
    pack.chrome?.wallpaper ? `url("${pack.chrome.wallpaper}")` : "none",
  );
  device.style.setProperty(
    "--skin-wallpaper-opacity",
    String(pack.chrome?.wallpaperOpacity ?? 0.22),
  );
  deviceTitle.textContent = name;
  const bots = [
    { name, label: pack.bot.suggestedLabel || pack.id, active: true, avatar: pack.bot.avatar },
    ...text.previewBots.map(([botName, label]) => ({ name: botName, label, active: false })),
  ];
  sidebar.innerHTML = bots
    .map((bot) => {
      const img = bot.avatar
        ? `<img alt="" src="${bot.avatar}" />`
        : `<img alt="" src="${pack.bot.avatar}" style="opacity:.35" />`;
      return `<div class="bot-row${bot.active ? " active" : ""}">${img}<div><b>${bot.name}</b><span>${bot.label}</span></div></div>`;
    })
    .join("");
  transcript.innerHTML = text
    .preview(name)
    .map((line, index) => `<div class="msg ${index === 1 ? "user" : "bot"}">${line}</div>`)
    .join("");
}

function paintDetail(pack) {
  const tokens = pack.chrome?.tokens || {};
  const text = copy();
  const swatches = ["text", "chrome", "sidebar", "pane", "accent"]
    .filter((key) => tokens[key] || (key === "accent" && pack.bot.accent))
    .map((key) => {
      const color = tokens[key] || pack.bot.accent;
      return `<span class="swatch" title="${key}" style="background:${color}"></span>`;
    })
    .join("");
  detail.innerHTML = `
    <div class="meta">
      <h2>${packName(pack)}</h2>
      <p>${packDescription(pack)}</p>
      <div class="swatches">${swatches}</div>
    </div>
    <div class="actions">
      <button class="act primary" data-act="chrome">${text.apply}</button>
      <button class="act" data-act="launch">${text.launch}</button>
      <button class="act" data-act="export">${text.export}</button>
    </div>
    <div class="note" id="note"></div>
  `;
  detail.querySelectorAll("[data-act]").forEach((button) => {
    button.addEventListener("click", () => runAction(button.dataset.act, pack, button));
  });
}

function setNote(text) {
  const note = document.querySelector("#note");
  if (note) note.textContent = text;
}

async function runAction(act, pack, button) {
  const text = copy();
  button.disabled = true;
  try {
    if (act === "export") {
      const payload = await getJson("/api/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: pack.id }),
      });
      setNote(text.exported(payload.file));
      return;
    }
    const payload = await getJson("/api/apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: pack.id,
        mode: "chrome",
        launch: act === "launch",
      }),
    });
    status = payload.status;
    paintStatus();
    if (payload.chrome?.skipped) {
      setNote(text.skipped(payload.chrome.reason, payload.chrome.command));
    } else if (payload.chrome) {
      setNote(text.applied(payload.chrome.cssBytes, pack.appearance));
    }
  } catch (error) {
    setNote(error.message);
  } finally {
    button.disabled = false;
  }
}

function paint() {
  const pack = selected();
  if (!pack) return;
  paintChrome();
  paintRail();
  paintPreview(pack);
  paintDetail(pack);
  paintStatus();
}

async function setLocale(next) {
  if (next !== "en" && next !== "zh") return;
  locale = next;
  paint();
  await getJson("/api/prefs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ locale }),
  });
}

async function boot() {
  const prefs = await getJson("/api/prefs");
  locale = prefs.locale === "zh" ? "zh" : "en";
  paintChrome();
  packs = await getJson("/api/packs");
  selectedId = packs[0]?.id;
  paint();
  status = await getJson("/api/status");
  paintStatus();
}

langBar.addEventListener("click", (event) => {
  const button = event.target.closest("[data-locale]");
  if (!button) return;
  setLocale(button.dataset.locale).catch((error) => {
    statusEl.textContent = error.message;
  });
});

boot().catch((error) => {
  statusEl.textContent = error.message;
});
