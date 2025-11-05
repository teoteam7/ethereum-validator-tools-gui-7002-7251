export {};

type Theme = "dark" | "light" | "neutral";
type BeaconKeyAttach = "auth_bearer" | "x_api_key" | "query_apikey";

interface SettingsShape {
  confirmBeforeSend: boolean;
  maskSensitiveInputs: boolean;
  blockTabSwitchWhileRunning: boolean;
  persistNodeUrls: boolean;
  tooltipDelayMs: number;
  successAutocloseMs: number;
  defaultLookbackSlots: number;
  theme: Theme;
  beaconApiKeyEnabled: boolean;
  persistBeaconApiKey: boolean;
  beaconApiKey: string;
  beaconKeyAttach: BeaconKeyAttach;
  beaconKeyHeaderName: string;
  beaconKeyAuthPrefix: string;
  beaconKeyQueryName: string;
}

const LS_KEY = "vt.settings.v3";
const EVT_CHANGED = "vt.settings.changed";
const EVT_THEME = "vt.theme.change";

const DEFAULTS: SettingsShape = {
  confirmBeforeSend: true,
  maskSensitiveInputs: true,
  blockTabSwitchWhileRunning: false,
  persistNodeUrls: true,
  tooltipDelayMs: 350,
  successAutocloseMs: 2500,
  defaultLookbackSlots: 2048,
  theme: "dark",
  beaconApiKeyEnabled: false,
  persistBeaconApiKey: false,
  beaconApiKey: "",
  beaconKeyAttach: "auth_bearer",
  beaconKeyHeaderName: "X-API-Key",
  beaconKeyAuthPrefix: "Bearer ",
  beaconKeyQueryName: "apikey",
};

class SettingsStore {
  private static mem: SettingsShape | null = null;

  static load(): SettingsShape {
    if (this.mem) return this.mem;
    let raw: Partial<SettingsShape> = {};
    try {
      const j = localStorage.getItem(LS_KEY);
      if (j) raw = JSON.parse(j);
    } catch {}
    const s: SettingsShape = { ...DEFAULTS, ...raw };
    if (!s.persistBeaconApiKey) s.beaconApiKey = "";
    this.mem = s;
    return s;
  }

  static get(): SettingsShape {
    return this.load();
  }

  static save(patch: Partial<SettingsShape>): SettingsShape {
    const prev = this.load();
    const next: SettingsShape = { ...prev, ...patch };
    if (!next.persistBeaconApiKey) {
      const toLs = { ...next, beaconApiKey: "" };
      try { localStorage.setItem(LS_KEY, JSON.stringify(toLs)); } catch {}
      this.mem = { ...next };
    } else {
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
      this.mem = { ...next };
    }
    dispatchEvent(new CustomEvent(EVT_CHANGED, { detail: this.mem }));
    applyTheme(next.theme);
    applySensitiveMask(next.maskSensitiveInputs);
    return this.mem!;
  }

  static reset(): SettingsShape {
    const cleared = { ...DEFAULTS };
    try { localStorage.setItem(LS_KEY, JSON.stringify({ ...DEFAULTS, beaconApiKey: "" })); } catch {}
    this.mem = { ...cleared };
    dispatchEvent(new CustomEvent(EVT_CHANGED, { detail: this.mem }));
    applyTheme(cleared.theme);
    applySensitiveMask(cleared.maskSensitiveInputs);
    return this.mem!;
  }
}

const BeaconKeyRuntime = {
  _sessionKey: "",
  get(): string {
    const s = SettingsStore.get();
    return s.persistBeaconApiKey ? (s.beaconApiKey || "") : this._sessionKey || "";
  },
  set(k: string) { this._sessionKey = k || ""; },
  clear() { this._sessionKey = ""; },
};

declare global {
  interface Window {
    __vt_fetch_original__?: typeof fetch;
    __vt_fetch_hook_installed__?: boolean;
  }
}

function normalizeBase(u: string): string {
  try {
    if (!u) return "";
    const url = new URL(u, location.href);
    return url.origin + url.pathname.replace(/\/+$/, "");
  } catch { return (u || "").replace(/\/+$/, ""); }
}

function startsWithBase(full: string, base: string): boolean {
  try {
    const a = new URL(full, location.href);
    const b = new URL(base, location.href);
    return a.origin === b.origin && a.pathname.startsWith(b.pathname.replace(/\/+$/, ""));
  } catch { return full.startsWith(base); }
}

function installFetchHook() {
  if (window.__vt_fetch_hook_installed__) return;
  const orig = window.fetch.bind(window);
  window.__vt_fetch_original__ = orig;

  window.fetch = async function patched(input: RequestInfo | URL, init?: RequestInit) {
    try {
      const s = SettingsStore.get();
      const enabled = !!s.beaconApiKeyEnabled;
      const key = BeaconKeyRuntime.get().trim();

      let urlStr = typeof input === "string" ? input : (input as Request).url || String(input);
      if (input instanceof URL) urlStr = input.toString();

      let useKey = false;
      let reqObj: Request | null = null;
      const hdrs = new Headers(init?.headers);
      if (input instanceof Request) {
        reqObj = input;
        const rh = new Headers(reqObj.headers);
        rh.forEach((v, k) => { if (!hdrs.has(k)) hdrs.set(k, v); });
      }

      if (hdrs.get("X-Use-Beacon-Key") === "1") {
        hdrs.delete("X-Use-Beacon-Key");
        useKey = true;
      }

      if (enabled && key) {
        const base = normalizeBase(($id<HTMLInputElement>("beaconUrl")?.value) || "");
        if (base && startsWithBase(urlStr, base)) useKey = true;
      }

      if (!useKey || !key) {
        return reqObj ? orig(reqObj, { ...init, headers: hdrs }) : orig(urlStr, { ...init, headers: hdrs });
      }

      if (s.beaconKeyAttach === "auth_bearer") {
        if (!hdrs.has("Authorization")) hdrs.set("Authorization", `${s.beaconKeyAuthPrefix ?? "Bearer "}${key}`);
      } else if (s.beaconKeyAttach === "x_api_key") {
        const name = (s.beaconKeyHeaderName || "X-API-Key").trim();
        if (!hdrs.has(name)) hdrs.set(name, key);
      } else {
        try {
          const u = new URL(urlStr, location.href);
          const qname = (s.beaconKeyQueryName || "apikey").trim();
          if (!u.searchParams.has(qname)) u.searchParams.set(qname, key);
          urlStr = u.toString();
        } catch {}
      }

      if (reqObj) {
        const cloned = new Request(urlStr, {
          method: reqObj.method,
          headers: hdrs,
          body: reqObj.body,
          mode: reqObj.mode,
          credentials: reqObj.credentials,
          cache: reqObj.cache,
          redirect: reqObj.redirect,
          referrer: reqObj.referrer,
          referrerPolicy: reqObj.referrerPolicy,
          integrity: reqObj.integrity,
          keepalive: (reqObj as any).keepalive,
          signal: reqObj.signal,
        });
        return orig(cloned, init);
      }
      return orig(urlStr, { ...init, headers: hdrs });
    } catch {
      return window.__vt_fetch_original__!(input as any, init as any);
    }
  };

  window.__vt_fetch_hook_installed__ = true;
}

function applyTheme(t: Theme) {
  try { document.documentElement.setAttribute("data-theme", t); dispatchEvent(new CustomEvent(EVT_THEME, { detail: t })); } catch {}
}
function applySensitiveMask(enabled: boolean) {
  try {
    const setType = (inp: HTMLInputElement) => { inp.type = enabled ? "password" : "text"; inp.autocomplete = enabled ? "new-password" : "off"; };
    document.querySelectorAll<HTMLInputElement>('input[data-sensitive="true"]').forEach(setType);
    const mo = new MutationObserver((recs) => {
      for (const r of recs) {
        r.addedNodes.forEach((n) => {
          if (!(n instanceof HTMLElement)) return;
          const list: HTMLInputElement[] = [];
          if (n.matches?.('input[data-sensitive="true"]')) list.push(n as HTMLInputElement);
          n.querySelectorAll?.('input[data-sensitive="true"]').forEach((x) => list.push(x as HTMLInputElement));
          list.forEach(setType);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  } catch {}
}

const $id = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, attrs?: Record<string, any>) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (attrs) for (const [k, v] of Object.entries(attrs)) (n as any)[k] = v;
  return n;
}
function html(markup: string): HTMLElement { const d = document.createElement("div"); d.innerHTML = markup.trim(); return d.firstElementChild as HTMLElement; }
function escAttr(s: string) { return (s || "").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function clampInt(v: string | number, min: number, max: number, fb: number) { let n = typeof v === "number" ? v : parseInt(String(v), 10); if (Number.isNaN(n)) n = fb; return Math.min(max, Math.max(min, n | 0)); }
function copyToClipboard(text: string) {
  try { navigator.clipboard?.writeText(text); }
  catch {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.left = "-9999px";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch {}
    ta.remove();
  }
}
function maskKey(k: string) { if (k.length <= 8) return "***"; return k.slice(0,4) + "…" + k.slice(-4); }

function injectStyles() {
  if ($id("settingsStyles")) return;
  const css = `
#settingsRoot { display: grid; gap: 16px; }
#settingsRoot .card{
  border: 1px solid var(--border);
  background: var(--panel);
  padding: var(--pad);
  box-shadow: var(--shadow-1);
  position: relative;
}
#settingsRoot .card-head{
  display:flex; align-items:center; justify-content:space-between;
  margin: 0 0 10px 0;
}
#settingsRoot .card-title{
  display:flex; align-items:center; gap:10px; font-weight:900; letter-spacing:.2px; font-size:14px;
}
#settingsRoot .card-title .icon{ width:16px; height:16px; stroke: var(--icon); stroke-width:1.6; fill:none; }
#settingsRoot .toolbar{
  display:flex; gap:8px; flex-wrap:wrap;
  position: sticky; top: calc(var(--scrim-top) + 8px);
  z-index: 2;
}
#settingsRoot .band{
  display:flex; gap:10px; align-items:flex-start;
  padding:10px 12px; border: 1px solid var(--border);
  margin: 10px 0 12px 0;
  background:
    linear-gradient(90deg, rgba(34,211,238,.12), transparent 40%),
    linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,0));
}
html[data-theme="light"] #settingsRoot .band,
html[data-theme="neutral"] #settingsRoot .band{
  background:
    linear-gradient(90deg, rgba(34,211,238,.12), transparent 40%),
    linear-gradient(180deg, rgba(0,0,0,.04), rgba(0,0,0,0));
}
#settingsRoot .band.warn{
  background:
    linear-gradient(90deg, rgba(245,158,11,.18), transparent 40%),
    linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,0));
}
#settingsRoot .band .icon{ width:16px; height:16px; stroke: var(--icon); stroke-width:1.6; }
#settingsRoot .grid-2 { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
#settingsRoot .grid-3 { display:grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
@media (max-width:1100px){ #settingsRoot .grid-2, #settingsRoot .grid-3 { grid-template-columns: 1fr; } }
#settingsRoot .form{ display:grid; gap: 12px; }
#settingsRoot .form-row{
  display:grid; grid-template-columns: 220px 1fr; gap: 10px; align-items:center;
}
@media (max-width:1100px){ #settingsRoot .form-row{ grid-template-columns: 1fr; } }
#settingsRoot .form-row > label{ font-size: 12px; color: var(--muted); }
#settingsRoot .input-wrap input,
#settingsRoot .input-wrap select{
  width:100%; padding:10px 10px;
  background: var(--input-bg);
  color: var(--input-color);
  border:1px solid var(--input-border);
}
#settingsRoot .muted { color: var(--muted); font-size: 12.5px; }
#settingsRoot .desc { color: var(--muted); font-size: 12px; margin-top: 6px; }
#settingsRoot .chip{ display:inline-flex; align-items:center; gap:6px; padding:2px 8px; border:1px solid var(--border); background: rgba(255,255,255,.04); font-size:11px; font-weight:800; letter-spacing:.2px; }
#settingsRoot .chip.ok{ border-color:#1f3f2b; color:#7ae6b8; background:#0f1a13; }
#settingsRoot .chip.warn{ border-color:#3a2a0b; color:#f5d087; background:#1d1405; }
#settingsRoot .preview{
  border:1px dashed var(--border);
  background: rgba(255,255,255,.03);
  padding:12px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size:12.5px; color: var(--text);
  white-space: pre-wrap; word-break: break-word;
}
#settingsRoot .key-body{
  display:grid; grid-template-columns: minmax(var(--key-left-base, 560px), auto) minmax(0, 1fr); gap: 14px; align-items:start;
}
#settingsRoot .key-body > div { min-width: 0; }
@media (max-width:1200px){ #settingsRoot .key-body{ grid-template-columns: 1fr; } }
#settingsRoot .console-card{
  border: 1px solid #222;
  background: #0a0a0a;
  padding: 0;
  box-shadow: var(--shadow-1);
  position: sticky;
  top: calc(var(--scrim-top) + 8px);
  min-width: 0;
}
#settingsRoot .console-head{
  display:flex; align-items:center; justify-content:space-between;
  padding: 10px 12px; border-bottom: 1px solid #222; background: rgba(255,255,255,.04);
}
#settingsRoot .console-title{
  display:flex; align-items:center; gap:8px; font-weight:900; font-size:12.5px; color:#e5e7eb;
}
#settingsRoot .console-title .icon{ width:16px; height:16px; stroke:#cbd5e1; stroke-width:1.6; fill:none; }
#settingsRoot .console-toolbar{ display:flex; gap:8px; }
#settingsRoot .console-body{ padding: 10px; max-height: 420px; overflow:auto; }
#settingsRoot .console-body pre{
  margin:0; color:#e5e7eb; background:transparent; font-size:12.5px; line-height:1.4;
  white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word;
}
#settingsRoot .subblock{
  padding: 6px 0 12px 0;
  border-top: 1px solid var(--border);
}
#settingsRoot .subblock:first-child{ border-top: none; padding-top: 0; }
  `.trim();
  const s = document.createElement("style");
  s.id = "settingsStyles";
  s.textContent = css;
  document.head.appendChild(s);
}


function syncBeaconAuthToMain() {
  const s = SettingsStore.get();
  const key = s.persistBeaconApiKey ? s.beaconApiKey : BeaconKeyRuntime.get();
  const cfg = {
    enabled: !!s.beaconApiKeyEnabled,
    mode: s.beaconKeyAttach,
    key: key || "",
    headerName: s.beaconKeyHeaderName,
    authPrefix: s.beaconKeyAuthPrefix,
    queryName: s.beaconKeyQueryName,
  };
  (window as any).api?.beaconSetAuth?.(cfg).catch(() => {});
}

window.addEventListener("vt.settings.changed" as any, () => { try { syncBeaconAuthToMain(); } catch {} });
document.addEventListener("DOMContentLoaded", () => { try { syncBeaconAuthToMain(); } catch {} }, { once: true } as any);


function renderSettings(root: HTMLElement) {
  const s = SettingsStore.get();
  root.innerHTML = "";
  injectStyles();

  const cardKey = el("div", "card");

  {
    const head = el("div", "card-head");
    head.innerHTML = `
      <div class="card-title">
        <svg class="icon" viewBox="0 0 24 24"><path d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1 2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.07a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1z"/></svg>
        <span>Beacon API Key</span>
      </div>
      <div class="toolbar">
        <button class="btn ok" id="stTestBeacon" type="button">Test</button>
        <button class="btn warn" id="stClearKey" type="button">Clear</button>
        <button class="btn" id="stReset" type="button">Reset</button>
      </div>
    `;
    cardKey.appendChild(head);
  }

  {
    const band = el("div", "band warn");
    band.innerHTML = `
      <svg class="icon" viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M12 2l9 18H3L12 2z"/></svg>
      <div>
        The key is applied <b>only</b> to requests targeting your Beacon URL (top bar).
        By default the key is <b>not</b> persisted; enable <b>Persist</b> to store it between sessions.
      </div>
    `;
    cardKey.appendChild(band);
  }

  const body = el("div", "key-body");

  const leftCol = el("div");
  {
    const toggles = el("div", "grid-2");
    toggles.innerHTML = `
      <label class="checkline"><input id="stEnableKey" type="checkbox" ${s.beaconApiKeyEnabled ? "checked" : ""}/> <span><b>Enable custom Beacon API key</b></span></label>
      <label class="checkline"><input id="stPersistKey" type="checkbox" ${s.persistBeaconApiKey ? "checked" : ""}/> <span>Persist key in localStorage</span></label>
    `;
    leftCol.appendChild(toggles);

    const form = el("div", "form");
    const keyVal = s.persistBeaconApiKey ? (s.beaconApiKey || "") : BeaconKeyRuntime.get();
    const sensitiveAttr = s.maskSensitiveInputs ? 'data-sensitive="true"' : "";

    form.appendChild(html(`
      <div class="form-row">
        <label>API key</label>
        <div class="input-wrap">
          <input id="stKeyValue" ${sensitiveAttr} placeholder="paste your key" value="${escAttr(keyVal)}"/>
          <div class="muted" style="margin-top:6px;">Storage: <span class="chip ${s.persistBeaconApiKey ? "ok" : "warn"}" id="stStorageChip">${s.persistBeaconApiKey ? "persistent" : "session-only"}</span></div>
        </div>
      </div>
    `));

    form.appendChild(html(`
      <div class="form-row">
        <label>Attach mode</label>
        <div class="input-wrap">
          <select id="stKeyMode">
            <option value="auth_bearer">Authorization: Bearer &lt;key&gt;</option>
            <option value="x_api_key">Header: X-API-Key: &lt;key&gt;</option>
            <option value="query_apikey">Query param: ?apikey=&lt;key&gt;</option>
          </select>
          <div class="desc">How the key will be attached to the request.</div>
        </div>
      </div>
    `));

    form.appendChild(html(`<div id="stModeOpts"></div>`));

    form.appendChild(html(`
      <div class="form-row">
        <label>Preview</label>
        <div class="preview" id="stPreview"></div>
      </div>
    `));

    leftCol.appendChild(form);
  }

  const rightCol = el("div");
  {
    const con = el("div", "console-card");
    con.innerHTML = `
      <div class="console-head">
        <div class="console-title">
          <svg class="icon" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          <span>Activity (Beacon Key)</span>
        </div>
        <div class="console-toolbar">
          <button class="btn ghost" data-copy="#stLocalOut" type="button">Copy</button>
        </div>
      </div>
      <div class="console-body">
        <pre id="stLocalOut"></pre>
      </div>
    `;
    rightCol.appendChild(con);
  }

  body.appendChild(leftCol);
  body.appendChild(rightCol);
  cardKey.appendChild(body);

  const cardUi = el("div", "card");
  {
    const head = el("div", "card-head");
    head.innerHTML = `
      <div class="card-title">
        <svg class="icon" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
        <span>UX & Persistence</span>
      </div>
    `;
    cardUi.appendChild(head);

    const grid = el("div", "grid-2");

    const col1 = html(`
      <div>
        <div class="subblock">
          <div class="form-row">
            <label>Confirm before sending</label>
            <label class="checkline"><input id="stConfirm" type="checkbox" ${s.confirmBeforeSend ? "checked" : ""}/> <span>Ask before network actions</span></label>
          </div>
        </div>
        <div class="subblock">
          <div class="form-row">
            <label>Mask sensitive inputs</label>
            <label class="checkline"><input id="stMask" type="checkbox" ${s.maskSensitiveInputs ? "checked" : ""}/> <span>Hide privkeys, seeds, etc.</span></label>
          </div>
        </div>
        <div class="subblock">
          <div class="form-row">
            <label>Block tab switching</label>
            <label class="checkline"><input id="stBlockTab" type="checkbox" ${s.blockTabSwitchWhileRunning ? "checked" : ""}/> <span>While tasks run</span></label>
          </div>
        </div>
        <div class="subblock">
          <div class="form-row">
            <label>Persist node URLs</label>
            <label class="checkline"><input id="stPersistUrls" type="checkbox" ${s.persistNodeUrls ? "checked" : ""}/> <span>Save Beacon/RPC</span></label>
          </div>
        </div>
      </div>
    `);

    const col2 = html(`
      <div>
        <div class="subblock">
          <div class="form-row">
            <label>Tooltip delay (ms)</label>
            <div class="input-wrap"><input id="stTooltipDelay" type="number" min="0" step="50" value="${s.tooltipDelayMs}"/></div>
          </div>
        </div>
        <div class="subblock">
          <div class="form-row">
            <label>Success auto-close (ms)</label>
            <div class="input-wrap"><input id="stSuccessClose" type="number" min="0" step="100" value="${s.successAutocloseMs}"/></div>
          </div>
        </div>
        <div class="subblock">
          <div class="form-row">
            <label>Default lookback (slots)</label>
            <div class="input-wrap"><input id="stLookback" type="number" min="32" step="32" value="${s.defaultLookbackSlots}"/></div>
          </div>
        </div>
        <div class="subblock">
          <div class="form-row">
            <label>Theme</label>
            <div class="input-wrap">
              <select id="stTheme">
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    `);

    grid.appendChild(col1);
    grid.appendChild(col2);
    cardUi.appendChild(grid);
  }

  root.appendChild(cardKey);
  root.appendChild(cardUi);

  const write = (k: "ok"|"warn"|"info", msg: string) => {
    const out = root.querySelector<HTMLPreElement>("#stLocalOut");
    if (!out) return;
    const ts = new Date().toISOString().replace("T"," ").replace("Z","");
    out.textContent = (out.textContent ? out.textContent + "\n" : "") + `[${ts}] [${k.toUpperCase()}] ${msg}`;
    out.parentElement?.scrollTo({ top: 1e9 });
  };
  const ok   = (m:string)=>write("ok",m);
  const warn = (m:string)=>write("warn",m);
  const info = (m:string)=>write("info",m);

  const keyInput = root.querySelector<HTMLInputElement>("#stKeyValue");
  const modeSel  = root.querySelector<HTMLSelectElement>("#stKeyMode");
  const optsHost = root.querySelector<HTMLDivElement>("#stModeOpts");
  const preview  = root.querySelector<HTMLDivElement>("#stPreview");
  const chip     = root.querySelector<HTMLSpanElement>("#stStorageChip");

  if (modeSel) modeSel.value = s.beaconKeyAttach;

  const renderModeOpts = () => {
    if (!optsHost) return;
    const mode = (modeSel?.value as BeaconKeyAttach) || "auth_bearer";
    if (mode === "auth_bearer") {
      optsHost.innerHTML = `
        <div class="form-row">
          <label>Authorization prefix</label>
          <div class="input-wrap"><input id="stAuthPrefix" placeholder="Bearer " value="${escAttr(s.beaconKeyAuthPrefix)}"/></div>
        </div>
      `;
    } else if (mode === "x_api_key") {
      optsHost.innerHTML = `
        <div class="form-row">
          <label>Header name</label>
          <div class="input-wrap"><input id="stHeaderName" placeholder="X-API-Key" value="${escAttr(s.beaconKeyHeaderName)}"/></div>
        </div>
      `;
    } else {
      optsHost.innerHTML = `
        <div class="form-row">
          <label>Query param name</label>
          <div class="input-wrap"><input id="stQueryName" placeholder="apikey" value="${escAttr(s.beaconKeyQueryName)}"/></div>
        </div>
      `;
    }
    updatePreview();
  };

  const updatePreview = () => {
    if (!preview) return;
    const mode = (modeSel?.value as BeaconKeyAttach) || "auth_bearer";
    const _key = (keyInput?.value || "").trim() || "<your-key>";
    let text = "";
    if (mode === "auth_bearer") {
      const pfx = (root.querySelector<HTMLInputElement>("#stAuthPrefix")?.value || s.beaconKeyAuthPrefix || "Bearer ").trim();
      text = `Authorization: ${pfx}${maskKey(_key)}`;
    } else if (mode === "x_api_key") {
      const name = (root.querySelector<HTMLInputElement>("#stHeaderName")?.value || s.beaconKeyHeaderName || "X-API-Key").trim();
      text = `${name}: ${maskKey(_key)}`;
    } else {
      const q = (root.querySelector<HTMLInputElement>("#stQueryName")?.value || s.beaconKeyQueryName || "apikey").trim();
      text = `GET /eth/v1/node/health?${q}=${maskKey(_key)}`;
    }
    preview.textContent = text;
  };

  renderModeOpts();

  root.querySelector<HTMLInputElement>("#stEnableKey")
    ?.addEventListener("change", (ev) => {
      SettingsStore.save({ beaconApiKeyEnabled: (ev.target as HTMLInputElement).checked });
      info("Beacon key " + (SettingsStore.get().beaconApiKeyEnabled ? "enabled" : "disabled"));
    });

  root.querySelector<HTMLInputElement>("#stPersistKey")
    ?.addEventListener("change", (ev) => {
      const wantPersist = (ev.target as HTMLInputElement).checked;
      const current = keyInput?.value || "";
      if (wantPersist) { SettingsStore.save({ persistBeaconApiKey: true, beaconApiKey: current }); BeaconKeyRuntime.set(""); }
      else { SettingsStore.save({ persistBeaconApiKey: false, beaconApiKey: "" }); BeaconKeyRuntime.set(current); }
      chip?.classList.toggle("ok", wantPersist);
      chip?.classList.toggle("warn", !wantPersist);
      if (chip) chip.textContent = wantPersist ? "persistent" : "session-only";
      info("Persist = " + (wantPersist ? "ON" : "OFF"));
    });

  keyInput?.addEventListener("input", (ev) => {
    const val = (ev.target as HTMLInputElement).value || "";
    const st = SettingsStore.get();
    if (st.persistBeaconApiKey) SettingsStore.save({ beaconApiKey: val });
    else BeaconKeyRuntime.set(val);
    updatePreview();
  });

  modeSel?.addEventListener("change", (ev) => {
    SettingsStore.save({ beaconKeyAttach: (ev.target as HTMLSelectElement).value as BeaconKeyAttach });
    renderModeOpts();
  });

  optsHost?.addEventListener("input", (ev) => {
    const t = (ev.target as HTMLInputElement);
    if (!t) return;
    if (t.id === "stAuthPrefix") SettingsStore.save({ beaconKeyAuthPrefix: t.value });
    if (t.id === "stHeaderName") SettingsStore.save({ beaconKeyHeaderName: t.value });
    if (t.id === "stQueryName") SettingsStore.save({ beaconKeyQueryName: t.value });
    updatePreview();
  });

  root.querySelector<HTMLButtonElement>('[data-copy="#stLocalOut"]')
    ?.addEventListener("click", () => {
      const out = root.querySelector<HTMLPreElement>("#stLocalOut");
      if (out) copyToClipboard(out.textContent || "");
    });

  root.querySelector<HTMLButtonElement>("#stClearKey")
    ?.addEventListener("click", () => {
      if (keyInput) keyInput.value = "";
      BeaconKeyRuntime.clear();
      SettingsStore.save({ beaconApiKey: "" });
      updatePreview();
      info("Key cleared");
    });

  root.querySelector<HTMLButtonElement>("#stReset")
    ?.addEventListener("click", () => {
      SettingsStore.save({
        beaconApiKeyEnabled: DEFAULTS.beaconApiKeyEnabled,
        persistBeaconApiKey: DEFAULTS.persistBeaconApiKey,
        beaconApiKey: "",
        beaconKeyAttach: DEFAULTS.beaconKeyAttach,
        beaconKeyHeaderName: DEFAULTS.beaconKeyHeaderName,
        beaconKeyAuthPrefix: DEFAULTS.beaconKeyAuthPrefix,
        beaconKeyQueryName: DEFAULTS.beaconKeyQueryName,
      });
      BeaconKeyRuntime.clear();
      if (keyInput) keyInput.value = "";
      if (modeSel) modeSel.value = DEFAULTS.beaconKeyAttach;
      const chip2 = root.querySelector<HTMLSpanElement>("#stStorageChip");
      chip2?.classList.toggle("ok", DEFAULTS.persistBeaconApiKey);
      chip2?.classList.toggle("warn", !DEFAULTS.persistBeaconApiKey);
      if (chip2) chip2.textContent = DEFAULTS.persistBeaconApiKey ? "persistent" : "session-only";
      renderModeOpts();
      info("Beacon key settings reset to defaults");
    });

  root.querySelector<HTMLButtonElement>("#stTestBeacon")
    ?.addEventListener("click", async () => {
      const base = normalizeBase($id<HTMLInputElement>("beaconUrl")?.value || "");
      if (!base) { warn("Beacon URL is not set (top bar)."); return; }
      const endpoints = ["/eth/v1/node/health","/eth/v1/node/identity","/eth/v1/beacon/headers/head"];
      info("Testing Beacon with key…\n" + endpoints.map(p => base + p).join("\n"));
      for (const p of endpoints) {
        const u = base + p;
        try {
          const r = await fetch(u, { headers: { "X-Use-Beacon-Key": "1", "Accept": "application/json" } });
          info(`GET ${u} → ${r.status}`);
          if (r.ok || r.status === 206) {
            let text = "";
            try { text = JSON.stringify(await r.json(), null, 2); } catch { text = await r.text(); }
            ok(`Success on ${u}\n${text.slice(0, 1800)}`);
            return;
          }
        } catch (e:any) {
          warn(`Error on ${u}: ${String(e?.message || e)}`);
        }
      }
      warn("All probe endpoints failed. Check key/mode/provider.");
    });

  root.querySelector<HTMLButtonElement>("#stExport")
    ?.addEventListener("click", () => {
      const st = SettingsStore.get();
      const data = JSON.stringify({ ...st, beaconApiKey: st.persistBeaconApiKey ? st.beaconApiKey : "" }, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "vt-settings.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      info("Settings exported to vt-settings.json");
    });

  root.querySelector<HTMLSelectElement>("#stTheme")!.value = s.theme;
  root.querySelector<HTMLSelectElement>("#stTheme")
    ?.addEventListener("change", (e) => {
      SettingsStore.save({ theme: (e.target as HTMLSelectElement).value as Theme });
    });

  root.querySelector<HTMLInputElement>("#stConfirm")
    ?.addEventListener("change", (e) => SettingsStore.save({ confirmBeforeSend: (e.target as HTMLInputElement).checked }));
  root.querySelector<HTMLInputElement>("#stMask")
    ?.addEventListener("change", (e) => SettingsStore.save({ maskSensitiveInputs: (e.target as HTMLInputElement).checked }));
  root.querySelector<HTMLInputElement>("#stBlockTab")
    ?.addEventListener("change", (e) => SettingsStore.save({ blockTabSwitchWhileRunning: (e.target as HTMLInputElement).checked }));
  root.querySelector<HTMLInputElement>("#stPersistUrls")
    ?.addEventListener("change", (e) => SettingsStore.save({ persistNodeUrls: (e.target as HTMLInputElement).checked }));

  root.querySelector<HTMLInputElement>("#stTooltipDelay")
    ?.addEventListener("input", (e) => {
      SettingsStore.save({ tooltipDelayMs: clampInt((e.target as HTMLInputElement).value, 0, 10000, DEFAULTS.tooltipDelayMs) });
      (window as any).__vt_tooltip_delay = SettingsStore.get().tooltipDelayMs;
    });
  root.querySelector<HTMLInputElement>("#stSuccessClose")
    ?.addEventListener("input", (e) => {
      SettingsStore.save({ successAutocloseMs: clampInt((e.target as HTMLInputElement).value, 0, 60000, DEFAULTS.successAutocloseMs) });
      (window as any).__vt_success_autoclose = SettingsStore.get().successAutocloseMs;
    });
  root.querySelector<HTMLInputElement>("#stLookback")
    ?.addEventListener("input", (e) => {
      SettingsStore.save({ defaultLookbackSlots: clampInt((e.target as HTMLInputElement).value, 32, 65536, DEFAULTS.defaultLookbackSlots) });
      (window as any).__vt_default_lookback = SettingsStore.get().defaultLookbackSlots;
    });

  requestAnimationFrame(() => {
    const w = Math.max(360, Math.round(leftCol.getBoundingClientRect().width));
    (body as HTMLElement).style.setProperty("--key-left-base", w + "px");
  });
}

function boot() {
  try {
    const s = SettingsStore.get();
    applyTheme(s.theme);
    applySensitiveMask(s.maskSensitiveInputs);
    installFetchHook();
    const host = $id("settingsRoot");
    if (host) renderSettings(host as HTMLElement);
  } catch (e) {
    const wrap = $id("bootError");
    const msg = $id("bootErrorMsg");
    if (wrap && msg) {
      msg.textContent = "Settings renderer: " + (e as any)?.message;
      wrap.setAttribute("style", (wrap.getAttribute("style") || "").replace("display:none", "display:flex"));
    } else {
      console.error("Settings boot error:", e);
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true } as AddEventListenerOptions);
} else {
  boot();
}
