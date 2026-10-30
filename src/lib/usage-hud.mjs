export const USAGE_HUD_CSS = `html[data-grok-bot-skin] .sand-agents-sidebar {
  position: relative !important;
}
html[data-grok-bot-skin] #grok-bot-skin-usage {
  position: absolute !important;
  left: 10px !important;
  right: 10px !important;
  bottom: 64px !important;
  top: auto !important;
  z-index: 60 !important;
  width: auto !important;
  box-sizing: border-box !important;
  padding: 8px 10px 9px !important;
  border-radius: 14px !important;
  color: var(--grok-skin-text, inherit) !important;
  background: color-mix(in srgb, var(--grok-skin-pane, #222) 88%, transparent) !important;
  box-shadow:
    0 4px 0 color-mix(in srgb, var(--grok-skin-accent, #888) 22%, transparent),
    inset 0 0 0 1px color-mix(in srgb, var(--grok-skin-accent, #888) 28%, transparent) !important;
  font: 12px/1.35 ui-sans-serif, system-ui, sans-serif !important;
  pointer-events: none !important;
  user-select: none !important;
}
html[data-grok-bot-skin] body:not(:has(.sand-agents-sidebar)) #grok-bot-skin-usage,
html[data-grok-bot-skin] #grok-bot-skin-usage[data-hud-place="window"] {
  position: fixed !important;
  top: 12px !important;
  right: 16px !important;
  left: auto !important;
  bottom: auto !important;
  width: min(240px, calc(100vw - 32px)) !important;
}
html[data-grok-bot-skin] #grok-bot-skin-usage .hud-kicker {
  opacity: 0.72;
  font-size: 10px;
  letter-spacing: 0.04em;
  margin-bottom: 3px;
}
html[data-grok-bot-skin] #grok-bot-skin-usage .hud-line {
  font-weight: 650;
  margin-bottom: 5px;
}
html[data-grok-bot-skin] #grok-bot-skin-usage .hud-bar {
  height: 6px;
  border-radius: 99px;
  overflow: hidden;
  background: color-mix(in srgb, var(--grok-skin-text, #888) 12%, transparent);
  margin-bottom: 4px;
}
html[data-grok-bot-skin] #grok-bot-skin-usage .hud-bar > i {
  display: block;
  height: 100%;
  width: 0;
  border-radius: inherit;
  background: var(--grok-skin-accent, #599ce7);
  transition: width 0.4s ease;
}
html[data-grok-bot-skin] #grok-bot-skin-usage .hud-meta {
  opacity: 0.78;
  font-size: 11px;
}`;

export function usageHudBootSource() {
  return `(${usageHudBoot.toString()})()`;
}

export function usageHudTeardownSource() {
  return `(${usageHudTeardown.toString()})()`;
}

function usageHudTeardown() {
  const timer = window.__grokBotSkinUsageTimer;
  if (timer) {
    clearInterval(timer);
    window.__grokBotSkinUsageTimer = 0;
  }
  document.getElementById("grok-bot-skin-usage")?.remove();
}

function usageHudBoot() {
  const HOST_ID = "grok-bot-skin-usage";

  function desktopApi() {
    const desktop = window.desktop;
    if (!desktop || typeof desktop !== "object") return null;
    if (desktop.main && typeof desktop.main === "object") return desktop.main;
    return desktop;
  }

  function asNum(value) {
    if (value == null) return null;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "bigint") return Number(value);
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
    if (typeof value === "object") {
      try {
        if (typeof value.toNumber === "function") return value.toNumber();
      } catch {
        // protobuf Long may overflow
      }
      if (typeof value.low === "number") {
        return (value.high | 0) * 4294967296 + (value.low >>> 0);
      }
    }
    return null;
  }

  function formatTok(n) {
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
    if (abs >= 1000) return `${(n / 1000).toFixed(abs >= 10_000 ? 0 : 1).replace(/\.0$/, "")}k`;
    return `${Math.round(n)}`;
  }

  function formatReset(ms) {
    const n = asNum(ms);
    if (n == null || n <= 0) return "";
    const date = new Date(n);
    if (!Number.isFinite(date.getTime())) return "";
    return `${date.getMonth() + 1}/${date.getDate()} 重置`;
  }

  function pickTokens(value, depth = 0) {
    if (!value || typeof value !== "object" || depth > 5) return null;
    const input = asNum(value.totalInputTokens ?? value.total_input_tokens ?? value.inputTokens);
    const output = asNum(value.totalOutputTokens ?? value.total_output_tokens ?? value.outputTokens);
    const cacheRead = asNum(value.totalCacheReadTokens ?? value.total_cache_read_tokens) || 0;
    const cacheWrite = asNum(value.totalCacheWriteTokens ?? value.total_cache_write_tokens) || 0;
    if (input != null || output != null) {
      const inn = input || 0;
      const out = output || 0;
      return { input: inn, output: out, total: inn + out + cacheRead + cacheWrite };
    }
    if (Array.isArray(value.aggregations) || Array.isArray(value.bots) || Array.isArray(value.days)) {
      let inn = 0;
      let out = 0;
      const rows = [].concat(value.aggregations || [], value.bots || [], value.days || []);
      for (const row of rows) {
        const nested = pickTokens(row, depth + 1);
        if (nested) {
          inn += nested.input;
          out += nested.output;
        }
      }
      if (inn || out) return { input: inn, output: out, total: inn + out };
    }
    for (const key of ["usage", "value", "data", "summary", "events", "period"]) {
      const inner = pickTokens(value[key], depth + 1);
      if (inner) return inner;
    }
    return null;
  }

  function pickPercent(value, depth = 0) {
    if (value == null || depth > 4) return null;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value !== "object") return null;
    const raw =
      value.percentUsed ??
      value.sandUsagePercent ??
      value.usagePercent ??
      value.percent_of_burst_used ??
      value.percentOfBurstUsed ??
      value.usage_percent;
    const n = asNum(raw);
    if (n != null) return n;
    for (const key of ["usage", "value", "data", "meter", "summary"]) {
      const inner = pickPercent(value[key], depth + 1);
      if (inner != null) return inner;
    }
    return null;
  }

  function pickPlan(value) {
    if (!value || typeof value !== "object") return "";
    return String(value.unifiedPlanName || value.grokPlanLabel || value.planName || "").trim();
  }

  function readDomPercent() {
    const el = document.querySelector("[data-sand-weekly-usage-percent]");
    if (!el) return null;
    const text = el.textContent || "";
    const match = text.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*%/);
    return match ? Number(match[1]) : null;
  }

  async function callDesktop(name, args) {
    const api = desktopApi();
    const fn = api && api[name];
    if (typeof fn !== "function") return null;
    try {
      return await fn.apply(api, args || []);
    } catch {
      return null;
    }
  }

  function buildState({ auth, breakdown, summary, weekly }) {
    const signedIn = !auth || auth.kind === "logged-in" || auth.status === "logged-in";
    const tokens = pickTokens(breakdown) || pickTokens(summary) || pickTokens(weekly);
    let used = pickPercent(weekly) ?? pickPercent(summary) ?? pickPercent(breakdown);
    if (used == null) used = readDomPercent();
    used = used == null ? null : Math.min(100, Math.max(0, used));
    const remaining = used == null ? null : Math.max(0, 100 - used);
    const resetMs =
      asNum(weekly?.nextResetMs) ??
      asNum(summary?.sandUsageResetTimestampMs) ??
      asNum(summary?.nextResetMs);
    const plan = pickPlan(weekly) || pickPlan(summary);
    return { signedIn, tokens, used, remaining, resetMs, plan };
  }

  function hostPlace() {
    return document.querySelector(".sand-agents-sidebar") || document.body;
  }

  function ensureHost() {
    let host = document.getElementById(HOST_ID);
    if (!host) {
      host = document.createElement("div");
      host.id = HOST_ID;
      host.setAttribute("aria-live", "polite");
      host.setAttribute("aria-hidden", "true");
    }
    const parent = hostPlace();
    if (host.parentNode !== parent) parent.appendChild(host);
    host.dataset.hudPlace = parent.classList?.contains("sand-agents-sidebar")
      ? "sidebar"
      : "window";
    return host;
  }

  async function loadAndPaint() {
    const authP = callDesktop("getCursorAuthStatus");
    const summaryP = callDesktop("getCursorUsageSummary");
    const weeklyP = callDesktop("getCursorWeeklyUsage");
    const breakdownP = callDesktop("getCursorUsageBreakdown", [{ includeCredits: true }]);
    const [auth, summary, weekly] = await Promise.all([authP, summaryP, weeklyP]);
    paint(buildState({ auth, summary, weekly }));
    const breakdown = await breakdownP;
    if (pickTokens(breakdown)) {
      paint(buildState({ auth, breakdown, summary, weekly }));
    }
  }

  function paint(state) {
    const host = ensureHost();
    if (!state || (state.tokens == null && state.used == null)) {
      const why = state && state.signedIn === false ? "当前窗口还没登录" : "暂时读不到用量";
      host.innerHTML =
        `<div class="hud-kicker">本周期用量</div><div class="hud-line">${why}</div>`;
      return;
    }
    const kicker = state.plan ? `用量 · ${state.plan}` : "本周期用量";
    const parts = [`<div class="hud-kicker">${kicker}</div>`];
    if (state.tokens) {
      parts.push(
        `<div class="hud-line">${formatTok(state.tokens.total)} tok · 入 ${formatTok(state.tokens.input)} / 出 ${formatTok(state.tokens.output)}</div>`,
      );
    } else {
      parts.push(
        `<div class="hud-line">已用 ${Math.round(state.used)}% · 剩 ${Math.round(state.remaining)}%</div>`,
      );
    }
    if (state.used != null) {
      parts.push(
        `<div class="hud-bar" aria-hidden="true"><i style="width:${state.used.toFixed(1)}%"></i></div>`,
      );
    }
    const meta = [];
    if (state.tokens && state.used != null) {
      meta.push(`已用 ${Math.round(state.used)}% · 剩 ${Math.round(state.remaining)}%`);
    }
    const reset = formatReset(state.resetMs);
    if (reset) meta.push(reset);
    if (meta.length) parts.push(`<div class="hud-meta">${meta.join(" · ")}</div>`);
    host.innerHTML = parts.join("");
    host.dataset.hudReady = "1";
  }

  async function refresh() {
    try {
      await loadAndPaint();
    } catch {
      paint(null);
    }
  }

  const host = ensureHost();
  if (!host.dataset.hudReady) {
    host.innerHTML =
      '<div class="hud-kicker">本周期用量</div><div class="hud-line">读取中…</div>';
  }
  if (window.__grokBotSkinUsageTimer) {
    clearInterval(window.__grokBotSkinUsageTimer);
  }
  window.__grokBotSkinUsageTimer = setInterval(refresh, 30000);
  refresh();
}
