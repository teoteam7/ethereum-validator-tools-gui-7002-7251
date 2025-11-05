export {};

type Api = {
  eip7002GetFee(rpcUrl: string): Promise<string>;
  getWithdrawalsStats(args: {
    beaconBase: string;
    lookback: number;
    start?: "head" | number;
  }): Promise<{
    startSlot: number;
    scanned: number;
    samples: number;
    avgPerBlock: number;
    p50: number;
    p95: number;
    min: number;
    max: number;
  }>;
  saveText?(name: string, text: string): Promise<any>;
};

const api = (globalThis as any).api as Api;

function H<T extends HTMLElement = HTMLElement>(id: string) {
  return document.getElementById(id) as T | null;
}
function asInput<T extends HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(el: HTMLElement | null): T | null {
  if (!el) return null;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return el as T;
  return null;
}
function getElValue(id: string): string {
  const el = asInput(H(id));
  return (el?.value ?? "").trim();
}
function setElValue(id: string, v: string) {
  const el = asInput(H(id));
  if (el) el.value = v;
}

function injectStyles() {
  if (document.getElementById("etaStyles")) return;
  const css = `
  #etaRoot .grid{ display:grid; grid-template-columns: 1fr 1fr; gap:12px; align-items:start; }
  @media (max-width:1100px){ #etaRoot .grid{ grid-template-columns: 1fr; } }
  #etaRoot .row{ display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
  @media (max-width:1100px){ #etaRoot .row{ grid-template-columns: 1fr; } }
  #etaRoot .muted{ color:var(--muted); font-size:12.5px; }
  #etaRoot .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  #console-eta{ background:#000 !important; border:1px solid #222 !important; }
  #console-eta pre{ background:transparent !important; color:#fff !important; }
  #etaStatusBox { margin-top: 10px; }
  `;
  const s = document.createElement("style");
  s.id = "etaStyles";
  s.textContent = css;
  document.head.appendChild(s);
}

function nowShort() {
  const d = new Date();
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}
function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }

async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { tries?: number; baseDelayMs?: number; maxDelayMs?: number; factor?: number; jitterMs?: number } = {}
): Promise<T> {
  const tries = Math.max(1, opts.tries ?? 4);
  const base = Math.max(100, opts.baseDelayMs ?? 400);
  const maxDelay = Math.max(base, opts.maxDelayMs ?? 4000);
  const factor = Math.max(1.2, opts.factor ?? 1.6);
  const jitter = Math.max(0, opts.jitterMs ?? 250);

  let lastErr: any = null;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e: any) {
      lastErr = e;
      const msg = String(e?.message || e);
      if (/invalid|bad|forbidden|unauthorized/i.test(msg)) throw e;
      const delay = Math.min(maxDelay, Math.floor(base * Math.pow(factor, i))) + Math.floor(Math.random() * jitter);
      await sleep(delay);
    }
  }
  throw lastErr;
}

let out: HTMLPreElement | null = null;
let logBuffer: string[] = [];
const LOG_MAX = 5000;
const LOG_TRIM_TO = 2500;

const spinnerState: { active: boolean; label: string; dots: number; timer: number | null } = {
  active: false,
  label: "",
  dots: 0,
  timer: null,
};
function attachOut() { out = H<HTMLPreElement>("etaOut"); }
function renderConsole() {
  if (!out) return;
  const spinnerLine = spinnerState.active
    ? `⏳ ${spinnerState.label}${spinnerState.dots ? ".".repeat(spinnerState.dots) : ""}`
    : null;
  const body = logBuffer.join("\n");
  out.textContent = body + (body ? "\n" : "") + (spinnerLine ? spinnerLine + "\n" : "");
  out.scrollTop = out.scrollHeight;
}
function log(line: string) {
  logBuffer.push(`[${nowShort()}] ${line}`);
  if (logBuffer.length > LOG_MAX) logBuffer = logBuffer.slice(-LOG_TRIM_TO);
  renderConsole();
}
function startSpinner(label: string) {
  log(`▶ ${label}…`);
  spinnerState.active = true;
  spinnerState.label = label;
  spinnerState.dots = 0;
  renderConsole();
  if (spinnerState.timer) window.clearInterval(spinnerState.timer);
  spinnerState.timer = window.setInterval(() => {
    spinnerState.dots = (spinnerState.dots + 1) % 4;
    renderConsole();
  }, 420);
  return (doneText?: string, isError = false) => {
    if (spinnerState.timer) window.clearInterval(spinnerState.timer);
    spinnerState.timer = null;
    spinnerState.active = false;
    const tail = doneText ? `: ${doneText}` : ": done";
    log(`${isError ? "✗" : "✓"} ${label}${tail}`);
  };
}

function renderStatusBand(kind: "ok" | "warn" | "danger", text: string) {
  const box = H("etaStatusBox");
  if (!box) return;
  const icon =
    kind === "ok"
      ? `<path d="M4 12l6 6L20 6"/>`
      : kind === "warn"
      ? `<path d="M12 9v4m0 4h.01M12 2l9 18H3L12 2z"/>`
      : `<path d="M18 6L6 18M6 6l12 12"/>`;
  box.innerHTML = `
    <div class="band ${kind}">
      <svg class="icon" viewBox="0 0 24 24">${icon}</svg>
      <div class="mono">${text}</div>
    </div>
  `;
}
function setStatusMode(kind: "ok" | "warn" | "danger", details?: string) {
  const el = H("etaInfo");
  if (!el) return;
  const label = kind === "ok" ? "OK" : kind === "warn" ? "Monitoring" : "Error";
  el.textContent = label;
  if (details && kind === "danger") el.setAttribute("title", details);
  else el.removeAttribute("title");
}

const STORE_KEY = "vt.eta.settings.v1";
function gatherSettings() {
  return {
    etaLookback: getElValue("etaLookback"),
    etaQueue: getElValue("etaQueue"),
    etaTarget: getElValue("etaTarget"),
    etaMax: getElValue("etaMax"),
    etaFeeWei: getElValue("etaFeeWei"),
    etaRpc: getElValue("etaRpc"),
  };
}
function applySettings(s: any) {
  if (!s) return;
  Object.entries(s).forEach(([k, v]) => {
    if (typeof v === "string") setElValue(k, v);
  });
}
function persistNow() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(gatherSettings())); } catch {}
}
function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) applySettings(JSON.parse(raw));
  } catch {}
}

function downloadTextAsFile(name: string, text: string) {
  try {
    const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
    return true;
  } catch {
    return false;
  }
}

let lastLoad: { avg: number; p50: number; p95: number; min: number; max: number } | null = null;
let lastFeeWei: string | null = null;
let lastStatusLine = "";

function mount(root: HTMLElement) {
  injectStyles();

  root.innerHTML = `
    <div class="grid">
      <div>
        <div class="row">
          <div>
            <label>Lookback (slots)</label>
            <div class="input-wrap"><input id="etaLookback" value="256"/></div>
          </div>
          <div>
            <label>Queue size (requests)</label>
            <div class="input-wrap"><input id="etaQueue" value="1"/></div>
          </div>
        </div>
        <div class="row" style="margin-top:10px;">
          <div>
            <label>TARGET_WITHDRAWAL_REQUESTS_PER_BLOCK</label>
            <div class="input-wrap"><input id="etaTarget" placeholder="auto"/></div>
          </div>
          <div>
            <label>MAX_WITHDRAWAL_REQUESTS_PER_BLOCK</label>
            <div class="input-wrap"><input id="etaMax" placeholder="auto"/></div>
          </div>
        </div>
        <div class="row" style="margin-top:10px;">
          <div>
            <label>Current fee (wei)</label>
            <div class="input-wrap"><input id="etaFeeWei" placeholder="auto"/></div>
          </div>
          <div>
            <label>RPC (for fee)</label>
            <div class="input-wrap"><input id="etaRpc" placeholder="(auto from top)"/></div>
          </div>
        </div>

        <div class="btns" style="margin-top:12px;">
          <button class="btn ghost" id="etaMeasure" type="button">Measure load</button>
          <button class="btn ghost" id="etaFee" type="button">Fetch fee</button>
          <button class="btn primary" id="etaCalc" type="button">Calculate</button>
          <button class="btn" id="etaExport" type="button">Export CSV</button>
        </div>

        <div id="etaStatusBox" style="margin-top:10px;"></div>
        <div id="etaInfo" class="muted mono" style="margin-top:6px;">—</div>
      </div>

      <div id="etaInlineConsoleHolder"></div>
    </div>
  `;

  const externalHost = H("etaConsoleHost");
  const inlineHost = H("etaInlineConsoleHolder");
  const consoleWrap = document.createElement("div");
  consoleWrap.innerHTML = `
    <div class="console" id="console-eta" style="margin-top:0;">
      <div class="toolbar"><button class="btn ghost" id="etaCopy" type="button">Copy</button></div>
      <pre id="etaOut">—</pre>
    </div>
  `;
  (externalHost || inlineHost)?.appendChild(consoleWrap.firstElementChild as HTMLElement);
  attachOut();

  H("etaCopy")?.addEventListener("click", async () => {
    if (!out) return;
    try { await navigator.clipboard.writeText(out.textContent || ""); showToast("Copied to clipboard"); } catch {}
  });

  (function syncFromTop() {
    const topRpc = H<HTMLInputElement>("rpcUrl");
    const etaRpc = H<HTMLInputElement>("etaRpc");

    const setIfEmpty = () => {
      if (etaRpc && etaRpc.value.trim() === "" && topRpc) etaRpc.value = topRpc.value.trim();
    };
    setIfEmpty();

    topRpc?.addEventListener("change", () => {
      if (etaRpc && etaRpc.dataset.userEdited !== "1") etaRpc.value = topRpc.value.trim();
      persistNow();
    });
    etaRpc?.addEventListener("input", () => { if (etaRpc) etaRpc.dataset.userEdited = "1"; persistNow(); });

    document.addEventListener("vt:profile", () => {
      if (etaRpc && etaRpc.dataset.userEdited !== "1" && etaRpc.value.trim() === "" && topRpc) {
        etaRpc.value = topRpc.value.trim();
      }
    });
  })();

  loadPersisted();

  H("etaMeasure")?.addEventListener("click", onMeasure);
  H("etaFee")?.addEventListener("click", onFetchFee);
  H("etaCalc")?.addEventListener("click", onCalculate);
  H("etaExport")?.addEventListener("click", onExport);

  ["etaLookback","etaQueue","etaTarget","etaMax","etaFeeWei","etaRpc"].forEach(id => {
    H(id)?.addEventListener("input", persistNow);
    H(id)?.addEventListener("change", persistNow);
  });
}

function getBeacon() { return (H<HTMLInputElement>("beaconUrl")?.value || "").trim(); }
function getRpc() { return (H<HTMLInputElement>("etaRpc")?.value || H<HTMLInputElement>("rpcUrl")?.value || "").trim(); }

async function onMeasure() {
  const look = Math.max(32, Math.min(8192, Number(getElValue("etaLookback") || "256")));
  const beacon = getBeacon();
  if (!beacon) { setStatusMode("danger", "Set Beacon URL"); renderStatusBand("danger","Set Beacon URL"); log("⚠ Measure: Beacon URL is empty"); return; }

  const stop = startSpinner(`Measure load (lookback=${look}, beacon=${beacon})`);
  setStatusMode("warn");
  try {
    log(`→ Request: GET headers/head + blocks (* ~${look})`);
    const s = await withRetry(() => api.getWithdrawalsStats({ beaconBase: beacon, lookback: look }), { tries: 3, baseDelayMs: 600 });
    lastLoad = { avg: s.avgPerBlock, p50: s.p50, p95: s.p95, min: s.min, max: s.max };
    const line = `Load (last ${look} slots): avg=${s.avgPerBlock.toFixed(2)}, p50=${s.p50}, p95=${s.p95}, min=${s.min}, max=${s.max}`;
    renderStatusBand("ok", line);
    setStatusMode("ok");
    log(`← Response: scanned=${s.scanned}/${s.samples} startSlot=${s.startSlot}`);
    stop(line);

    if (!getElValue("etaTarget")) setElValue("etaTarget", String(s.p50 || Math.round(s.avgPerBlock) || 1));
    if (!getElValue("etaMax")) setElValue("etaMax", String(s.max || (s.p95 + 1) || 1));
    persistNow();

    const statusLine = `avg=${s.avgPerBlock.toFixed(2)} p50=${s.p50} p95=${s.p95} min=${s.min} max=${s.max}`;
    if (statusLine !== lastStatusLine) { log(`info: ${statusLine}`); lastStatusLine = statusLine; }
    else { log("info: unchanged"); }
  } catch (e: any) {
    const msg = e?.message || String(e);
    stop(`failed: ${msg}`, true);
    renderStatusBand("danger", `Measure failed: ${msg}`);
    setStatusMode("danger", msg);
    log(`stack? ${e?.stack ? String(e.stack).slice(0, 500) : "-"}`);
  }
}

async function onFetchFee() {
  const rpc = getRpc();
  if (!rpc) { renderStatusBand("danger","Set RPC URL"); setStatusMode("danger","Set RPC URL"); log("⚠ Fetch fee: RPC URL is empty"); return; }

  const stop = startSpinner(`Fetch fee (rpc=${rpc})`);
  setStatusMode("warn");
  try {
    log("→ Request: eth_call(to=EIP-7002, data=0x)");
    const fee = await withRetry(() => api.eip7002GetFee(rpc), { tries: 4, baseDelayMs: 500, factor: 1.7, maxDelayMs: 5000 });
    lastFeeWei = String(fee);
    setElValue("etaFeeWei", lastFeeWei);
    const msg = `Fee: ${lastFeeWei} wei`;
    renderStatusBand("ok", msg);
    setStatusMode("ok");
    log(`← Response: fee=${lastFeeWei} wei`);
    stop(msg);

    const statusLine = `fee=${lastFeeWei} wei`;
    if (statusLine !== lastStatusLine) { log(`info: ${statusLine}`); lastStatusLine = statusLine; }
    else { log("info: unchanged"); }
    persistNow();
  } catch (e: any) {
    const msg = e?.message || String(e);
    stop(`failed: ${msg}`, true);
    renderStatusBand("danger", `Fee fetch failed: ${msg}`);
    setStatusMode("danger", msg);
    log(`stack? ${e?.stack ? String(e.stack).slice(0, 500) : "-"}`);
  }
}

function onCalculate() {
  const q = Math.max(0, Number(getElValue("etaQueue") || "1"));
  const target = Math.max(1, Number(getElValue("etaTarget") || (lastLoad?.p50 || 1)));
  const max = Math.max(target, Number(getElValue("etaMax") || (lastLoad?.max || target)));
  const feeWei = getElValue("etaFeeWei");
  const effRate = Math.min(max, target, Math.max(1, Math.round(lastLoad?.avg || target)));
  const blocks = effRate > 0 ? Math.ceil(q / effRate) : 0;
  const seconds = blocks * 12;
  const hours = (seconds / 3600).toFixed(2);

  const stop = startSpinner(`Calculate (queue=${q}, effRate=${effRate})`);
  let costWei = "n/a";
  let costEth = "n/a";
  try {
    if (feeWei && /^\d+$/.test(feeWei)) {
      const fee = BigInt(feeWei);
      const total = fee * BigInt(q);
      costWei = total.toString();
      const eth = (total / 1_000_000_000_000_000_000n).toString() + "." + (total % 1_000_000_000_000_000_000n).toString().padStart(18, "0").replace(/0+$/, "");
      costEth = eth.endsWith(".") ? eth.slice(0, -1) : eth;
    }
    const lines = [
      `Queue size: ${q}`,
      `Effective throughput: ${effRate} reqs/block`,
      `ETA: ~${blocks} blocks ≈ ${seconds}s ≈ ${hours}h`,
      `Total fee (approx): ${costWei} wei (${costEth} ETH)`,
    ].join("\n");
    renderStatusBand("ok", `ETA computed: blocks≈${blocks}, time≈${seconds}s, fee≈${costWei} wei`);
    setStatusMode("ok");
    H("etaInfo")!.textContent = lines;
    log(`✓ Calc: blocks≈${blocks}, time≈${seconds}s, fee≈${costWei} wei`);
    stop("done");
    persistNow();
  } catch (e: any) {
    const msg = e?.message || String(e);
    stop(`failed: ${msg}`, true);
    renderStatusBand("danger", `Calc failed: ${msg}`);
    setStatusMode("danger", msg);
    log(`stack? ${e?.stack ? String(e.stack).slice(0, 500) : "-"}`);
  }
}

function buildCsv(): string {
  const header = "timestamp,lookback,avg,p50,p95,min,max,queue,effective_rate,blocks,seconds,hours,fee_wei,total_fee_wei,total_fee_eth\n";

  const look = Number(getElValue("etaLookback") || (lastLoad ? "256" : "0"));
  const q = Math.max(0, Number(getElValue("etaQueue") || "1"));
  const target = Math.max(1, Number(getElValue("etaTarget") || (lastLoad?.p50 || 1)));
  const max = Math.max(target, Number(getElValue("etaMax") || (lastLoad?.max || target)));
  const feeWei = getElValue("etaFeeWei");
  const effRate = Math.min(max, target, Math.max(1, Math.round(lastLoad?.avg || target)));
  const blocks = effRate > 0 ? Math.ceil(q / effRate) : 0;
  const seconds = blocks * 12;
  const hours = (seconds / 3600).toFixed(2);

  let costWei = "";
  let costEth = "";
  if (feeWei && /^\d+$/.test(feeWei)) {
    const fee = BigInt(feeWei);
    const total = fee * BigInt(q);
    costWei = total.toString();
    const eth = (total / 1_000_000_000_000_000_000n).toString() + "." + (total % 1_000_000_000_000_000_000n).toString().padStart(18, "0").replace(/0+$/, "");
    costEth = eth.endsWith(".") ? eth.slice(0, -1) : eth;
  }

  const ts = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const timestamp = `${ts.getFullYear()}-${pad(ts.getMonth() + 1)}-${pad(ts.getDate())} ${pad(ts.getHours())}:${pad(ts.getMinutes())}:${pad(ts.getSeconds())}`;

  const avg = lastLoad ? lastLoad.avg.toFixed(2) : "";
  const p50 = lastLoad ? String(lastLoad.p50) : "";
  const p95 = lastLoad ? String(lastLoad.p95) : "";
  const min = lastLoad ? String(lastLoad.min) : "";
  const maxv = lastLoad ? String(lastLoad.max) : "";

  const row = [
    timestamp,
    look || "",
    avg,
    p50,
    p95,
    min,
    maxv,
    q || "",
    effRate || "",
    blocks || "",
    seconds || "",
    hours || "",
    feeWei || "",
    costWei || "",
    costEth || "",
  ].join(",") + "\n";

  return "\uFEFF" + header + row;
}

function makeFileName(prefix: string, ext: string) {
  const ts = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${prefix}_${ts.getFullYear()}-${pad(ts.getMonth()+1)}-${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.${ext}`;
}

async function onExport() {
  const csv = buildCsv();
  const fname = makeFileName("eta_report", "csv");

  try {
    if (typeof api.saveText === "function") {
      const res = await api.saveText(fname, csv);
      const savedPath = (res && (res.path || (res as any).filePath)) ? String(res.path || (res as any).filePath) : "";
      log(savedPath ? `✓ Saved to ${savedPath}` : "✓ CSV saved");
      showToast(savedPath ? `Saved to ${savedPath}` : "CSV saved");
      return;
    }
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg === "SAVE_CANCELED") { log("ℹ Save canceled"); return; }
    log(`⚠ saveText failed: ${msg} — falling back to browser download`);
  }

  const ok = downloadTextAsFile(fname, csv);
  if (ok) { log(`✓ Exported (downloaded) ${fname}`); showToast("CSV downloaded"); }
  else { log("✗ Export failed: unable to create download"); showToast("Export failed"); }
}

function boot() {
  const host = document.getElementById("etaRoot");
  if (host) mount(host as HTMLElement);
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true } as AddEventListenerOptions);
} else {
  boot();
}

function showToast(msg: string) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1600);
}
