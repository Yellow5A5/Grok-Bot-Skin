const rail = document.querySelector("#rail");
const detail = document.querySelector("#detail");
const statusEl = document.querySelector("#status");
const device = document.querySelector("#device");
const sidebar = document.querySelector("#sidebar");
const transcript = document.querySelector("#transcript");
const deviceTitle = document.querySelector("#device-title");

let packs = [];
let selectedId = null;
let status = null;

const STATE_LABEL = {
  "running-debug": "Grok Bot 已开调试端口，可直接套界面",
  running: "Grok Bot 在运行但未开调试端口；启动器会先退出再带端口打开",
  stopped: "Grok Bot 未运行，可用「启动并套上」",
};

async function getJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || response.statusText);
  return payload;
}

function selected() {
  return packs.find((pack) => pack.id === selectedId) || packs[0];
}

function paintStatus() {
  statusEl.textContent = status
    ? STATE_LABEL[status.state] || status.state
    : "无法读取 Grok Bot 状态";
}

function paintRail() {
  rail.innerHTML = "";
  for (const pack of packs) {
    const button = document.createElement("button");
    button.className = "pack";
    button.type = "button";
    button.setAttribute("aria-selected", pack.id === selectedId ? "true" : "false");
    button.innerHTML = `<img alt="" src="${pack.bot.avatar}" /><span><b>${pack.displayName}</b><small>${pack.id} · ${pack.appearance}</small></span>`;
    button.addEventListener("click", () => {
      selectedId = pack.id;
      paint();
    });
    rail.append(button);
  }
}

function paintPreview(pack) {
  const tokens = pack.chrome?.tokens || {};
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
  deviceTitle.textContent = pack.displayName;
  sidebar.innerHTML = [
    { name: pack.displayName, label: pack.bot.suggestedLabel || pack.id, active: true, avatar: pack.bot.avatar },
    { name: "Research", label: "资料", active: false },
    { name: "Inbox", label: "待办", active: false },
  ]
    .map((bot) => {
      const img = bot.avatar
        ? `<img alt="" src="${bot.avatar}" />`
        : `<img alt="" src="${pack.bot.avatar}" style="opacity:.35" />`;
      return `<div class="bot-row${bot.active ? " active" : ""}">${img}<div><b>${bot.name}</b><span>${bot.label}</span></div></div>`;
    })
    .join("");
  transcript.innerHTML = `
    <div class="msg bot">已经套上「${pack.displayName}」。头像用官方 Upload，界面用这套 token。</div>
    <div class="msg user">把皮肤包发给别人，他们也能给自己的 Grok Bot 换上。</div>
    <div class="msg bot">导出 zip 即可。对方运行 grok-bot-skin import 就能装上。</div>
  `;
}

function paintDetail(pack) {
  const tokens = pack.chrome?.tokens || {};
  const swatches = ["text", "chrome", "sidebar", "pane", "accent"]
    .filter((key) => tokens[key] || (key === "accent" && pack.bot.accent))
    .map((key) => {
      const color = tokens[key] || pack.bot.accent;
      return `<span class="swatch" title="${key}" style="background:${color}"></span>`;
    })
    .join("");
  detail.innerHTML = `
    <div class="meta">
      <h2>${pack.displayName}</h2>
      <p>${pack.description || ""}</p>
      <div class="swatches">${swatches}</div>
    </div>
    <div class="actions">
      <button class="act primary" data-act="avatar">套用头像（官方 Upload）</button>
      <button class="act" data-act="chrome">套用界面 CSS</button>
      <button class="act" data-act="launch">启动 Grok Bot 并套上界面</button>
      <button class="act" data-act="export">导出可分享的 .grokskin.zip</button>
      <button class="act" data-act="copy-prompt">复制 Generate 提示词</button>
    </div>
    <div class="note" id="note"></div>
    <div class="prompt">${pack.bot.generatePrompt || "这套皮肤没有 Generate 提示词。"}</div>
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
  button.disabled = true;
  try {
    if (act === "copy-prompt") {
      const prompt = pack.bot.generatePrompt || "";
      try {
        await navigator.clipboard.writeText(prompt);
        setNote("提示词已复制。在 Grok Bot 头像编辑器的 Generate 页粘贴即可。");
      } catch {
        setNote("剪贴板不可用。提示词已显示在下方，请手动复制。");
      }
      return;
    }
    if (act === "export") {
      const payload = await getJson("/api/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: pack.id }),
      });
      setNote(`已导出：${payload.file}`);
      return;
    }
    const mode = act === "avatar" ? "avatar" : "chrome";
    const payload = await getJson("/api/apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: pack.id,
        mode,
        launch: act === "launch",
      }),
    });
    status = payload.status;
    paintStatus();
    if (payload.avatar) {
      setNote(
        `Finder 已选中头像。打开 Bot 详情 → 点头像 → Upload → Set avatar。\n${payload.avatar.avatar}`,
      );
    } else if (payload.chrome?.skipped) {
      setNote(
        `界面未注入：${payload.chrome.reason}。先退出 Grok Bot，再点「启动并套上」，或运行 ${payload.chrome.command}`,
      );
    } else if (payload.chrome) {
      setNote(`界面 CSS 已注入（${payload.chrome.cssBytes} bytes）。若没看到变化，把 Appearance 调成 ${pack.appearance}。`);
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
  paintRail();
  paintPreview(pack);
  paintDetail(pack);
}

async function boot() {
  packs = await getJson("/api/packs");
  selectedId = packs[0]?.id;
  paint();
  status = await getJson("/api/status");
  paintStatus();
}

boot().catch((error) => {
  statusEl.textContent = error.message;
});
