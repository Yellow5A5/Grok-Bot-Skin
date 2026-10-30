export const USAGE_HUD_CSS = `html[data-grok-bot-skin] #grok-bot-skin-usage {
  position: fixed !important;
  left: 12px !important;
  bottom: 12px !important;
  z-index: 80 !important;
  width: min(228px, calc(100vw - 24px)) !important;
  box-sizing: border-box !important;
  padding: 10px 12px 11px !important;
  border-radius: 16px !important;
  color: var(--grok-skin-text, inherit) !important;
  background: color-mix(in srgb, var(--grok-skin-pane, #222) 86%, transparent) !important;
  box-shadow:
    0 6px 0 color-mix(in srgb, var(--grok-skin-accent, #888) 22%, transparent),
    inset 0 0 0 1px color-mix(in srgb, var(--grok-skin-accent, #888) 28%, transparent) !important;
  font: 12px/1.35 ui-sans-serif, system-ui, sans-serif !important;
  pointer-events: auto !important;
  cursor: default !important;
  user-select: none !important;
}
html[data-grok-bot-skin] #grok-bot-skin-usage .hud-kicker {
  opacity: 0.72;
  font-size: 10px;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}
html[data-grok-bot-skin] #grok-bot-skin-usage .hud-line {
  font-weight: 650;
  margin-bottom: 6px;
}
html[data-grok-bot-skin] #grok-bot-skin-usage .hud-bar {
  height: 7px;
  border-radius: 99px;
  overflow: hidden;
  background: color-mix(in srgb, var(--grok-skin-text, #888) 12%, transparent);
  margin-bottom: 5px;
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

  function pickTokens(value, depth = 0) {
    if (!value || typeof value !== "object" || depth > 4) return null;
    const input = asNum(value.totalInputTokens ?? value.total_input_tokens);
    const output = asNum(value.totalOutputTokens ?? value.total_output_tokens);
    const cacheRead = asNum(value.totalCacheReadTokens ?? value.total_cache_read_tokens) || 0;
    const cacheWrite = asNum(value.totalCacheWriteTokens ?? value.total_cache_write_tokens) || 0;
    if (input != null || output != null) {
      const inn = input || 0;
      const out = output || 0;
      return { input: inn, output: out, total: inn + out + cacheRead + cacheWrite };
    }
    if (Array.isArray(value.aggregations)) {
      let inn = 0;
      let out = 0;
      for (const row of value.aggregations) {
        inn += asNum(row.inputTokens ?? row.input_tokens) || 0;
        out += asNum(row.outputTokens ?? row.output_tokens) || 0;
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
      value.usagePercent ??
      value.sandUsagePercent ??
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

  function readDomPercent() {
    const el = document.querySelector("[data-sand-weekly-usage-percent]");
    if (!el) return null;
    const text = el.textContent || "";
    const match = text.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*%/);
    return match ? Number(match[1]) : null;
  }

  async function callDesktop(name, args) {
    const api = window.desktop;
    const fn = api && api[name];
    if (typeof fn !== "function") return null;
    try {
      return await fn.apply(api, args || []);
    } catch {
      return null;
    }
  }

  async function loadUsage() {
    const [breakdown, summary, weekly] = await Promise.all([
      callDesktop("getCursorUsageBreakdown", [{ includeCredits: true }]),
      callDesktop("getCursorUsageSummary"),
      callDesktop("getCursorWeeklyUsage"),
    ]);
    const tokens = pickTokens(breakdown) || pickTokens(summary) || pickTokens(weekly);
    let used = pickPercent(summary) ?? pickPercent(weekly) ?? pickPercent(breakdown);
    if (used == null) used = readDomPercent();
    used = used == null ? null : Math.min(100, Math.max(0, used));
    const remaining = used == null ? null : Math.max(0, 100 - used);
    const resetMs = asNum(summary?.nextResetMs ?? weekly?.nextResetMs ?? weekly?.usage?.nextResetMs);
    return { tokens, used, remaining, resetMs };
  }

  function paint(state) {
    let host = document.getElementById(HOST_ID);
    if (!host) {
      host = document.createElement("div");
      host.id = HOST_ID;
      host.setAttribute("aria-live", "polite");
      (document.querySelector(".sand-shell") || document.body).appendChild(host);
    }
    if (!state || (state.tokens == null && state.used == null)) {
      host.innerHTML =
        '<div class="hud-kicker">本周期用量</div><div class="hud-line">暂时读不到</div><div class="hud-meta">登录后会从 Grok Bot 账户拉取</div>';
      return;
    }
    const parts = [];
    if (state.tokens) {
      parts.push(
        `<div class="hud-line">${formatTok(state.tokens.total)} tok · 入 ${formatTok(state.tokens.input)} / 出 ${formatTok(state.tokens.output)}</div>`,
      );
    } else {
      parts.push('<div class="hud-line">订阅额度</div>');
    }
    if (state.used != null) {
      parts.push(
        `<div class="hud-bar" aria-hidden="true"><i style="width:${state.used.toFixed(1)}%"></i></div>`,
      );
      parts.push(
        `<div class="hud-meta">已用 ${Math.round(state.used)}% · 剩 ${Math.round(state.remaining)}%</div>`,
      );
    }
    host.innerHTML = `<div class="hud-kicker">本周期用量</div>${parts.join("")}`;
  }

  async function refresh() {
    try {
      paint(await loadUsage());
    } catch {
      paint(null);
    }
  }

  refresh();
  if (!window.__grokBotSkinUsageTimer) {
    window.__grokBotSkinUsageTimer = setInterval(refresh, 45000);
  }
}
