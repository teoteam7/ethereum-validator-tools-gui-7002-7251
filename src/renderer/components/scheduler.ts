export {};

type Api = {
  eip7002GetFee(rpc: string): Promise<string>;
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
  getValidator(beaconBase: string, id: string): Promise<any>;
  eipStaticCall(args: { rpcUrl: string; to: string; data?: string }): Promise<{ hex: string }>;
  eip7002Submit(args: {
    rpcUrl: string;
    secret?: string;
    validatorPubkey: string;
    amountGwei: string;
    gas?: {
      maxFeePerGasGwei?: string | number;
      maxPriorityFeePerGasGwei?: string | number;
      gasLimit?: string | number;
    };
    nonce?: number;
    sendRetries?: number;
    bumpPercent?: number;
  }): Promise<{ txHash: string; status: number | null }>;
  eip7002AddrFromSecret?(args: { secret?: string; privkey?: string; derivationPath?: string }): Promise<{ address: string }>;
  saveText?(name: string, text: string): Promise<any>;
};

const api = (globalThis as any).api as Api;

function H<T extends HTMLElement = HTMLElement>(id: string) {
  return document.getElementById(id) as T | null;
}
function asInput<T extends HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(el: HTMLElement | null): T | null {
  if (!el) return null;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") {
    return el as T;
  }
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
  if (document.getElementById("schedulerStyles")) return;
  const css = `
  #schedulerRoot .grid{ display:grid; grid-template-columns: 1fr; gap:12px; align-items:start; }
  #schedulerRoot .row{ display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
  #schedulerRoot .row3{ display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; }
  @media (max-width:1100px){ #schedulerRoot .row, #schedulerRoot .row3{ grid-template-columns: 1fr; } }
  #schedulerRoot textarea{ width:100%; min-height:160px; padding:10px; background:var(--input-bg); color:var(--input-color); border:1px solid var(--input-border); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  #schedulerRoot .muted{ color:var(--muted); font-size:12.5px; }
  #schStatusBox { margin-top: 10px; }
  #console-scheduler{ background:#000 !important; border:1px solid #222 !important; }
  #console-scheduler pre{ background:transparent !important; color:#fff !important; }
  #schQueueActions{ display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; }
  `;
  const s = document.createElement("style");
  s.id = "schedulerStyles";
  s.textContent = css;
  document.head.appendChild(s);
}

function nowShort() {
  const d = new Date();
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}
function parseWc(wc: string | undefined): { kind: "00" | "01" | "02" | "unknown"; address?: string } {
  if (!wc || wc.length !== 66 || !wc.startsWith("0x")) return { kind: "unknown" };
  const pfx = wc.slice(2, 4);
  let kind: "00" | "01" | "02" | "unknown" = "unknown";
  if (pfx === "00") kind = "00";
  else if (pfx === "01") kind = "01";
  else if (pfx === "02") kind = "02";
  const address = kind === "01" || kind === "02" ? ("0x" + wc.slice(26, 66)).toLowerCase() : undefined;
  return { kind, address };
}
function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }

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
function attachOut() { out = H<HTMLPreElement>("schOut"); }
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

function renderStatusBand(kind: "ok" | "warn" | "danger", text: string, progress?: string) {
  const box = H("schStatusBox");
  if (!box) return;
  const icon =
    kind === "ok"
      ? `<path d="M4 12l6 6L20 6"/>`
      : kind === "warn"
      ? `<path d="M12 9v4m0 4h.01M12 2l9 18H3L12 2z"/>`
      : `<path d="M18 6L6 18M6 6l12 12"/>`;
  const progressHtml = progress ? `<div class="mono" style="margin-top:6px;opacity:.9">${progress}</div>` : "";
  box.innerHTML = `
    <div class="band ${kind}">
      <svg class="icon" viewBox="0 0 24 24">${icon}</svg>
      <div>
        <div class="mono">${text}</div>
        ${progressHtml}
      </div>
    </div>
  `;
}
function setStatusMode(kind: "ok" | "warn" | "danger", details?: string) {
  const el = H("schStatus");
  if (!el) return;
  const label = kind === "ok" ? "Ready to send" : kind === "warn" ? "Monitoring" : "Error";
  el.textContent = label;
  if (details && kind === "danger") el.setAttribute("title", details);
  else el.removeAttribute("title");
}

type Preflight = { ok: boolean; expected?: string; got?: string; reason?: string };
const preflightCache = new Map<string, Preflight>();

async function preflightMatchEOA(beaconBase: string, pubkeyHex: string, secret: string): Promise<Preflight> {
  const key = `${beaconBase}::${pubkeyHex.toLowerCase()}::${secret.slice(0, 16)}`;
  const cached = preflightCache.get(key);
  if (cached) return cached;

  let gotAddr = "";
  try {
    const derived = await api.eip7002AddrFromSecret?.({ secret });
    gotAddr = (derived?.address || "").toLowerCase();
    if (!/^0x[0-9a-fA-F]{40}$/.test(gotAddr)) {
      const res: Preflight = { ok: false, reason: "Cannot derive sender address from secret" };
      preflightCache.set(key, res);
      return res;
    }
  } catch (e: any) {
    const res: Preflight = { ok: false, reason: `addrFromSecret failed: ${e?.message || String(e)}` };
    preflightCache.set(key, res);
    return res;
  }

  let expectedAddr = "";
  try {
    const pk = pubkeyHex.startsWith("0x") ? pubkeyHex : "0x" + pubkeyHex;
    const r = await api.getValidator(beaconBase, pk);
    const wc = r?.data?.validator?.withdrawal_credentials ?? r?.data?.data?.validator?.withdrawal_credentials;
    const parsed = parseWc(typeof wc === "string" ? wc : "");
    if (parsed.kind !== "01" || !parsed.address) {
      const res: Preflight = { ok: false, expected: parsed.address, got: gotAddr, reason: "Validator is not 0x01 (ETH1) or wc unreadable" };
      preflightCache.set(key, res);
      return res;
    }
    expectedAddr = parsed.address.toLowerCase();
  } catch (e: any) {
    const res: Preflight = { ok: false, expected: "", got: gotAddr, reason: `Beacon getValidator failed: ${e?.message || String(e)}` };
    preflightCache.set(key, res);
    return res;
  }

  const ok = expectedAddr === gotAddr;
  const res: Preflight = ok
    ? { ok: true, expected: expectedAddr, got: gotAddr }
    : { ok: false, expected: expectedAddr, got: gotAddr, reason: "EOA mismatch with validator 0x01 address" };
  preflightCache.set(key, res);
  return res;
}

function isEligibleFor7002(val: any, amountGwei: string): { ok: boolean; reason?: string } {
  try {
    const status = String(val?.status || "").toLowerCase();
    const v = val?.validator || val || {};
    const slashed = !!v?.slashed;
    const exitEpoch = String(v?.exit_epoch ?? v?.exitEpoch ?? "");
    const FAR = "18446744073709551615";
    const wcParsed = parseWc(String(v?.withdrawal_credentials || ""));
    if (wcParsed.kind !== "01") return { ok: false, reason: "withdrawal_credentials is not 0x01" };

    const isExit = String(amountGwei || "0") === "0";
    if (isExit) {
      if (slashed) return { ok: false, reason: "validator is slashed" };
      if (!status.startsWith("active")) return { ok: false, reason: `status is not active: ${status}` };
      if (exitEpoch && exitEpoch !== "" && exitEpoch !== FAR) return { ok: false, reason: "already exiting/exited" };
      return { ok: true };
    }

    if (slashed) return { ok: false, reason: "validator is slashed" };
    if (!status.includes("active") && !status.includes("withdraw")) return { ok: false, reason: `status not eligible for partial: ${status}` };
    return { ok: true };
  } catch {
    return { ok: false, reason: "eligibility check failed" };
  }
}

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
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      const msg = String(e?.message || e);
      if (/invalid|bad|forbidden|unauthorized/i.test(msg)) throw e;
      const delay = Math.min(maxDelay, Math.floor(base * Math.pow(factor, i))) + Math.floor(Math.random() * jitter);
      await sleep(delay);
    }
  }
  throw lastErr;
}

type Task = { pubkey: string; amountGwei: string; attempts: number; done: boolean; tx?: string; err?: string };

let running = false;
let ticking = false;
let paused = false;
let inflight = 0;
let timer: number | null = null;
let tasks: Task[] = [];
let lastStatusLine = "";
let tickCount = 0;

const LOG_EVERY_N_TICKS = 5;

function mount(root: HTMLElement) {
  injectStyles();

  root.innerHTML = `
  <div class="grid">
    <div>
      <div class="row">
        <div>
          <label>EOA secret</label>
          <div class="input-wrap"><input id="schSecret" type="password" placeholder="0x... or seed phrase"/></div>
        </div>
        <div>
          <label>Check period (sec)</label>
          <div class="input-wrap"><input id="schPeriod" placeholder="8" value="8"/></div>
        </div>
      </div>

      <div class="row3" style="margin-top:8px;">
        <div><label>Fee cap (wei)</label><div class="input-wrap"><input id="schFeeCapWei" placeholder="auto"/></div></div>
        <div><label>Drop threshold (%)</label><div class="input-wrap"><input id="schDropPct" value="12"/></div></div>
        <div><label>MA window (samples)</label><div class="input-wrap"><input id="schWindow" value="20"/></div></div>
      </div>

      <div class="row3" style="margin-top:8px;">
        <div><label>Lookback (slots) for load</label><div class="input-wrap"><input id="schLookback" value="256"/></div></div>
        <div><label>Target per block (optional)</label><div class="input-wrap"><input id="schTarget" placeholder="auto from p50"/></div></div>
        <div><label>Load ratio threshold</label><div class="input-wrap"><input id="schLoadRatio" value="0.60"/></div></div>
      </div>

      <div class="row3" style="margin-top:8px;">
        <div><label>maxFeePerGas (gwei)</label><div class="input-wrap"><input id="schMaxFeeGwei" placeholder="auto" /></div></div>
        <div><label>maxPriorityFee (gwei)</label><div class="input-wrap"><input id="schMaxPrioGwei" placeholder="auto" /></div></div>
        <div><label>gasLimit</label><div class="input-wrap"><input id="schGasLimit" placeholder="auto" /></div></div>
      </div>

      <div class="row" style="margin-top:8px;">
        <div><label>Optional 7251 predeploy (for fee/staticcall)</label><div class="input-wrap"><input id="sch7251Addr" placeholder="0x..."/></div></div>
        <div><label>7251 selector (4 bytes hex)</label><div class="input-wrap"><input id="sch7251Sel" placeholder="0x????????"/></div></div>
      </div>

      <div class="btns" style="margin-top:10px;">
        <button class="btn ghost" id="schPing" type="button">Fetch fee & load</button>
        <button class="btn primary" id="schStart" type="button">Start</button>
        <button class="btn" id="schStop" type="button" disabled>Stop</button>
        <button class="btn warn" id="schPause" type="button" disabled>Pause</button>
        <button class="btn ok" id="schResume" type="button" disabled>Resume</button>
      </div>

      <div id="schStatusBox"></div>
      <div class="muted" style="margin-top:6px;">
        Trigger: <b>(fee ≤ fee cap)</b> OR <b>(fee below MA by X%)</b> OR <b>(avg/target ≤ threshold)</b>.
      </div>
      <div class="muted mono" id="schStatus" style="margin-top:6px;">—</div>

      <div style="margin-top:12px;">
        <label>Validators queue</label>
        <div class="muted" style="margin-bottom:6px;">Format: <span class="mono">0xPubkey48, amountGwei</span> — one pair per line.</div>
        <textarea id="schValidators" placeholder="0x..., 0&#10;0x..., 3200000000"></textarea>

        <div id="schQueueActions">
          <button class="btn" id="schRetryFailed" type="button">Retry failed</button>
          <button class="btn warn" id="schMoveErrorsTop" type="button">Move errors to top</button>
          <button class="btn warn" id="schClearDone" type="button">Clear done</button>
          <button class="btn warn" id="schClearAll" type="button">Clear all</button>
          <button class="btn ghost" id="schExportCsv" type="button">Export CSV</button>
        </div>

        <div class="row" style="margin-top:8px;">
          <div><label>Concurrency</label><div class="input-wrap"><input id="schConc" value="2"/></div></div>
          <div><label>Retries per task</label><div class="input-wrap"><input id="schRetries" value="2"/></div></div>
        </div>

        <div class="row" style="margin-top:8px;">
          <div><label>Max partial amount (gwei) — soft cap</label><div class="input-wrap"><input id="schMaxPartialGwei" value="32000000000"/></div></div>
          <div><label>Autosave</label><div class="input-wrap"><select id="schAutosave"><option value="on">On</option><option value="off">Off</option></select></div></div>
        </div>

        <div class="muted" id="schQueueInfo" style="margin-top:6px;">Queue: 0</div>
      </div>
    </div>
  </div>
  `;

  const host = H("schedulerConsoleHost");
  if (host && !host.querySelector("#console-scheduler")) {
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="console" id="console-scheduler" style="margin-top:0;">
        <div class="toolbar"><button class="btn ghost" id="schCopy" type="button">Copy</button></div>
        <pre id="schOut">—</pre>
      </div>
    `;
    host.appendChild(wrap.firstElementChild as HTMLElement);
  }
  attachOut();
  H("schCopy")?.addEventListener("click", async () => {
    if (!out) return;
    try { await navigator.clipboard.writeText(out.textContent || ""); showToast("Copied to clipboard"); } catch {}
  });

  loadPersisted();

  H("schPing")?.addEventListener("click", onPing);
  H("schStart")?.addEventListener("click", onStart);
  H("schStop")?.addEventListener("click", onStop);
  H("schPause")?.addEventListener("click", onPause);
  H("schResume")?.addEventListener("click", onResume);
  H("schRetryFailed")?.addEventListener("click", onRetryFailed);
  H("schMoveErrorsTop")?.addEventListener("click", onMoveErrorsTop);
  H("schClearDone")?.addEventListener("click", onClearDone);
  H("schClearAll")?.addEventListener("click", onClearAll);
  H("schExportCsv")?.addEventListener("click", onExportCsv);

  bindAutosave();
}

const STORE_KEY = "vt.scheduler.settings.v1";
const QUEUE_KEY = "vt.scheduler.queue.v1";

function gatherSettings() {
  return {
    schPeriod: getElValue("schPeriod"),
    schFeeCapWei: getElValue("schFeeCapWei"),
    schDropPct: getElValue("schDropPct"),
    schWindow: getElValue("schWindow"),
    schLookback: getElValue("schLookback"),
    schTarget: getElValue("schTarget"),
    schLoadRatio: getElValue("schLoadRatio"),
    schMaxFeeGwei: getElValue("schMaxFeeGwei"),
    schMaxPrioGwei: getElValue("schMaxPrioGwei"),
    schGasLimit: getElValue("schGasLimit"),
    schConc: getElValue("schConc"),
    schRetries: getElValue("schRetries"),
    sch7251Addr: getElValue("sch7251Addr"),
    sch7251Sel: getElValue("sch7251Sel"),
    schMaxPartialGwei: getElValue("schMaxPartialGwei"),
    schAutosave: getElValue("schAutosave"),
  };
}
function applySettings(s: any) {
  if (!s) return;
  Object.entries(s).forEach(([k, v]) => {
    if (typeof v === "string") setElValue(k, v);
  });
}
function persistNow() {
  const flag = getElValue("schAutosave") || "on";
  if (flag !== "on") return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(gatherSettings()));
    localStorage.setItem(QUEUE_KEY, getElValue("schValidators") || "");
  } catch {}
}
function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) applySettings(JSON.parse(raw));
    const q = localStorage.getItem(QUEUE_KEY);
    if (q) setElValue("schValidators", q);
  } catch {}
  refreshQueueInfo();
}
function bindAutosave() {
  const ids = [
    "schSecret","schPeriod","schFeeCapWei","schDropPct","schWindow","schLookback","schTarget","schLoadRatio",
    "schMaxFeeGwei","schMaxPrioGwei","schGasLimit","schConc","schRetries","sch7251Addr","sch7251Sel","schMaxPartialGwei","schAutosave"
  ];
  ids.forEach(id => {
    H(id)?.addEventListener("input", () => { persistNow(); });
    H(id)?.addEventListener("change", () => { persistNow(); });
  });
  H("schValidators")?.addEventListener("input", () => persistNow());
}

function parseQueue(): Task[] {
  const raw = getElValue("schValidators");
  const list: Task[] = [];
  if (!raw) return list;
  const lines = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  for (const ln of lines) {
    const parts = ln.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
    if (parts.length < 1) continue;
    const pub = parts[0]; const amt = parts[1] ?? "0";
    if (/^0x[0-9a-fA-F]{96}$/.test(pub) && /^\d+$/.test(amt))
      list.push({ pubkey: pub, amountGwei: amt, attempts: 0, done: false });
    else
      log(`⚠ skip line: "${ln}"`);
  }
  return list;
}
function refreshQueueInfo() {
  const left = tasks.filter(t => !t.done).length;
  const err = tasks.filter(t => !t.done && t.err).length;
  const ok = tasks.filter(t => t.done).length;
  const el = H("schQueueInfo");
  if (el) el.textContent = `Queue: ${left} pending • ok=${ok} • failed=${err} • inflight=${inflight}`;
}
function onRetryFailed() {
  const failed = tasks.filter(t => !t.done && t.err);
  if (!failed.length) { log("ℹ Retry failed: nothing to retry"); return; }
  failed.forEach(t => { t.err = ""; t.attempts = 0; });
  log(`✓ Retry failed: ${failed.length} tasks reset`);
  refreshQueueInfo();
  persistNow();
}
function onMoveErrorsTop() {
  const pend = tasks.filter(t => !t.done && !t.err);
  const errs = tasks.filter(t => !t.done && t.err);
  const done = tasks.filter(t => t.done);
  tasks = [...errs, ...pend, ...done];
  setElValue("schValidators", tasks.filter(t => !t.done).map(t => `${t.pubkey}, ${t.amountGwei}`).join("\n"));
  refreshQueueInfo();
  persistNow();
  log(`✓ Moved ${errs.length} failed tasks to top`);
}
function onClearDone() {
  tasks = tasks.filter(t => !t.done && !t.err);
  setElValue("schValidators", tasks.map(t => `${t.pubkey}, ${t.amountGwei}`).join("\n"));
  refreshQueueInfo();
  persistNow();
  log("✓ Cleared done/failed from queue editor");
}
function onClearAll() {
  tasks = [];
  setElValue("schValidators", "");
  refreshQueueInfo();
  persistNow();
  log("✓ Cleared entire queue");
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
async function onExportCsv() {
  const header = "pubkey,amount_gwei,status,attempts,tx,err\n";
  const rows = tasks.map(t => {
    const status = t.done ? "done" : (t.err ? "error" : "pending");
    return `${t.pubkey},${t.amountGwei},${status},${t.attempts},${t.tx || ""},${(t.err || "").replace(/[\r\n,]/g, " ")}`;
  }).join("\n");

  const csv = "\uFEFF" + header + rows + (rows ? "\n" : "");
  const ts = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fname = `scheduler_queue_${ts.getFullYear()}-${pad(ts.getMonth()+1)}-${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.csv`;

  try {
    if (typeof api.saveText === "function") {
      const res = await api.saveText(fname, csv);
      const savedPath = (res && (res.path || res.filePath)) ? String(res.path || res.filePath) : "";
      log(savedPath ? `✓ Saved to ${savedPath}` : "✓ CSV saved");
      showToast(savedPath ? `Saved to ${savedPath}` : "CSV saved");
      return;
    }
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg === "SAVE_CANCELED") {
      log("ℹ Save canceled");
      return;
    }
    log(`⚠ saveText failed: ${msg} — falling back to browser download`);
  }

  try {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
    log(`✓ Exported (downloaded) ${fname}`);
    showToast("CSV downloaded");
  } catch {
    log("✗ Export failed: unable to create download");
    showToast("Export failed");
  }
}

async function fetchFeeAndMaybe7251() {
  const rpc = getRpc();
  if (!rpc) throw new Error("RPC URL required");
  const fee7002 = await withRetry(() => api.eip7002GetFee(rpc), { tries: 4, baseDelayMs: 500, maxDelayMs: 5000, factor: 1.7 });
  let fee7251: string | undefined;
  const addr = getElValue("sch7251Addr");
  const sel = getElValue("sch7251Sel");
  if (addr && /^0x[0-9a-fA-F]{40}$/.test(addr)) {
    const data = (sel && /^0x[0-9a-fA-F]{8}$/.test(sel)) ? sel : "0x";
    try { const r = await withRetry(() => api.eipStaticCall({ rpcUrl: rpc, to: addr, data }), { tries: 3, baseDelayMs: 400 }); fee7251 = r.hex; } catch {}
  }
  return { fee7002: BigInt(fee7002), fee7251 };
}
async function fetchLoad() {
  const beacon = getBeacon();
  const look = getNumber("schLookback", 256);
  if (!beacon) throw new Error("Beacon URL required");
  const s = await withRetry(
    () => api.getWithdrawalsStats({ beaconBase: beacon, lookback: Math.max(32, Math.min(8192, look)) }),
    { tries: 3, baseDelayMs: 600 }
  );
  return { avg: s.avgPerBlock, p50: s.p50, p95: s.p95 };
}
function getRpc() { return getElValue("rpcUrl"); }
function getBeacon() { return getElValue("beaconUrl"); }
function getNumber(id: string, def: number) {
  const v = Number(getElValue(id));
  return Number.isFinite(v) && v > 0 ? v : def;
}
function pushFee(f: bigint, cap: number) { (fees as bigint[]).push(f); const max = Math.max(1, cap); if ((fees as bigint[]).length > max) (fees as bigint[]).splice(0, (fees as bigint[]).length - max); }
function avgFee(): bigint { if ((fees as bigint[]).length === 0) return 0n; return (fees as bigint[]).reduce((a, b) => a + b, 0n) / BigInt((fees as bigint[]).length); }
const fees: bigint[] = [];

async function trySubmitOne(t: Task) {
  const rpc = getRpc();
  const beacon = getBeacon();
  const secret = getElValue("schSecret");
  const maxFeeGwei = getElValue("schMaxFeeGwei");
  const maxPrioGwei = getElValue("schMaxPrioGwei");
  const gasLimit = getElValue("schGasLimit");
  const retries = Math.max(0, Number(getElValue("schRetries") || "2"));
  const maxPartialSoft = Math.max(1, Number(getElValue("schMaxPartialGwei") || "32000000000"));

  if (!rpc) { log("⚠ submit: RPC URL not set"); return; }
  if (!secret) { log("⚠ submit: Secret not set"); return; }

  if (t.amountGwei && /^\d+$/.test(t.amountGwei) && Number(t.amountGwei) > 0) {
    if (Number(t.amountGwei) > maxPartialSoft) {
      log(`⚠ partial amount ${t.amountGwei} gwei exceeds soft cap ${maxPartialSoft} gwei — skip`);
      t.err = "partial amount over soft cap"; refreshQueueInfo(); return;
    }
  }

  const stopElig = startSpinner(`Eligibility pub=${t.pubkey.slice(0, 12)}…`);
  try {
    const val = await withRetry(() => api.getValidator(beacon, t.pubkey), { tries: 3, baseDelayMs: 600 });
    const payload = val?.data || val?.data?.data || val || {};
    const elig = isEligibleFor7002(payload, t.amountGwei);
    if (!elig.ok) { t.err = elig.reason || "not eligible"; stopElig(`failed: ${t.err}`, true); return; }
    stopElig("ok");
  } catch (e: any) { t.err = e?.message || String(e); stopElig(`failed: ${t.err}`, true); return; }

  const stopPre = startSpinner(`Preflight pub=${t.pubkey.slice(0, 12)}…`);
  try {
    const pre = await withRetry(() => preflightMatchEOA(beacon, t.pubkey, secret), { tries: 2, baseDelayMs: 600 });
    if (!pre.ok) {
      t.err = pre.reason || "EOA preflight failed";
      const extra = pre.expected && pre.got ? ` (expected ${pre.expected}, got ${pre.got})` : "";
      stopPre(`failed: ${t.err}${extra}`, true); return;
    }
    stopPre("ok");
  } catch (e: any) { t.err = e?.message || String(e); stopPre(`failed: ${t.err}`, true); return; }

  t.attempts++;
  const stop = startSpinner(`Submit pub=${t.pubkey.slice(0, 12)}… amt=${t.amountGwei}`);
  try {
    const res = await api.eip7002Submit({
      rpcUrl: rpc,
      secret,
      validatorPubkey: t.pubkey,
      amountGwei: t.amountGwei,
      gas: {
        maxFeePerGasGwei: maxFeeGwei || undefined,
        maxPriorityFeePerGasGwei: maxPrioGwei || undefined,
        gasLimit: gasLimit || undefined,
      },
      sendRetries: 3,
      bumpPercent: 12,
    });
    t.done = true; t.tx = res.txHash;
    stop(`tx=${res.txHash}`);
  } catch (e: any) {
    t.err = e?.message || String(e);
    stop(`failed: ${t.err}`, true);
    if (t.attempts <= retries) log(`↺ will retry pub=${t.pubkey.slice(0, 12)}… (#${t.attempts}/${retries})`);
  } finally {
    refreshQueueInfo();
    persistNow();
  }
}

async function tick() {
  if (!running || paused || ticking) return;
  ticking = true;

  const periodSec = Math.max(3, Number(getElValue("schPeriod") || "8"));
  const maCap = Math.max(1, Number(getElValue("schWindow") || "20"));
  const dropPct = Math.max(0, Number(getElValue("schDropPct") || "12")) / 100;
  const feeCapWei = getElValue("schFeeCapWei");
  const targetInput = getElValue("schTarget");
  const loadThr = Math.max(0, Math.min(1, Number(getElValue("schLoadRatio") || "0.60")));

  const stopSpin = startSpinner("Tick");
  try {
    const { fee7002 } = await fetchFeeAndMaybe7251();
    pushFee(fee7002, maCap);
    const ma = avgFee();
    const dropOk = (fees.length >= maCap) ? (fee7002 * 100n <= (ma * BigInt(Math.round((1 - dropPct) * 100)))) : false;
    const feeCapOk = (feeCapWei && /^\d+$/.test(feeCapWei)) ? (fee7002 <= BigInt(feeCapWei)) : false;

    const load = await fetchLoad();
    const target = targetInput && /^\d+$/.test(targetInput) ? Number(targetInput) : Math.max(1, Math.round(load.p50 || load.avg || 1));
    const ratio = (load.avg && target) ? (load.avg / target) : 1;
    const loadOk = ratio <= loadThr;

    const statusLine =
      `fee=${fee7002.toString()} wei; MA=${ma.toString()} wei; dropOk=${dropOk} ` +
      `feeCapOk=${feeCapOk}; load avg=${load.avg.toFixed(2)} t=${target} ratio=${ratio.toFixed(2)} loadOk=${loadOk}`;

    const hasTasksLeft = tasks.some(t => !t.done);
    const conditionOk = feeCapOk || dropOk || loadOk;

    const ok = tasks.filter(t => t.done).length;
    const err = tasks.filter(t => !t.done && t.err).length;
    const pend = tasks.filter(t => !t.done && !t.err).length;
    const progress = `progress: ok=${ok} • failed=${err} • pending=${pend} • inflight=${inflight}`;

    renderStatusBand(
      conditionOk ? "ok" : "warn",
      conditionOk ? statusLine : (hasTasksLeft ? statusLine : `monitoring: ${statusLine}`),
      progress
    );
    setStatusMode(conditionOk ? "ok" : "warn");

    if (statusLine !== lastStatusLine) {
      log(`info: ${statusLine}`);
      lastStatusLine = statusLine;
    } else {
      log(`info: unchanged`);
    }

    stopSpin("done");

    if (conditionOk && hasTasksLeft && !paused) {
      const conc = Math.max(1, Number(getElValue("schConc") || "2"));
      const retries = Math.max(0, Number(getElValue("schRetries") || "2"));
      while (running && !paused && inflight < conc) {
        const next = tasks.find(t => !t.done && (!t.err || t.attempts <= retries));
        if (!next) break;
        inflight++;
        try { await trySubmitOne(next); } finally { inflight--; }
      }
    }
  } catch (e: any) {
    const msg = e?.message || String(e);
    stopSpin(`error: ${msg}`, true);
    renderStatusBand("danger", `error: ${msg}`);
    setStatusMode("danger", msg);
    log(`stack? ${e?.stack ? String(e.stack).slice(0, 500) : "-"}`);
  } finally {
    ticking = false;
    refreshQueueInfo();
    if (running) timer = window.setTimeout(tick, periodSec * 1000);
  }
}

async function onPing() {
  const rpc = getRpc(); const beacon = getBeacon();
  if (!rpc) { renderStatusBand("danger", "RPC URL is empty"); setStatusMode("danger", "RPC URL is empty"); log("⚠ ping: RPC URL is empty"); return; }
  if (!beacon) { renderStatusBand("danger", "Beacon URL is empty"); setStatusMode("danger", "Beacon URL is empty"); log("⚠ ping: Beacon URL is empty"); return; }

  const stop = startSpinner(`Fetch fee & load (rpc=${rpc}, beacon=${beacon})`);
  try {
    log("→ fee: eth_call to EIP-7002 predeploy");
    const { fee7002 } = await fetchFeeAndMaybe7251();
    log(`← fee: ${fee7002.toString()} wei`);

    const look = Math.max(32, Math.min(8192, Number(getElValue("schLookback") || "256")));
    log(`→ load: lookback=${look}`);
    const load = await fetchLoad();
    const msg = `fee=${fee7002.toString()} wei; load avg=${load.avg.toFixed(2)} p50=${load.p50} p95=${load.p95}`;
    renderStatusBand("ok", msg);
    setStatusMode("ok");
    log(`← load: ${msg}`);
    pushFee(fee7002, Math.max(1, Number(getElValue("schWindow") || "20")));
    stop("done");
  } catch (e: any) {
    const msg = e?.message || String(e);
    stop(`failed: ${msg}`, true);
    renderStatusBand("danger", `ping error: ${msg}`);
    setStatusMode("danger", msg);
    log(`stack? ${e?.stack ? String(e.stack).slice(0, 500) : "-"}`);
  }
}

function onStart() {
  const rpc = getRpc(); const beacon = getBeacon();
  if (!rpc) { renderStatusBand("danger", "RPC URL is empty"); setStatusMode("danger", "RPC URL is empty"); log("✗ Start: RPC URL is empty"); return; }
  if (!beacon) { renderStatusBand("danger", "Beacon URL is empty"); setStatusMode("danger", "Beacon URL is empty"); log("✗ Start: Beacon URL is empty"); return; }
  if (running) return;

  tasks = parseQueue();
  refreshQueueInfo();

  if (!tasks.length) {
    renderStatusBand("warn", "Monitoring only: queue is empty");
    setStatusMode("warn");
    log("ℹ Start: queue empty — monitoring only");
  }

  running = true; paused = false; tickCount = 0; lastStatusLine = "";
  H<HTMLButtonElement>("schStart")?.setAttribute("disabled", "true");
  H<HTMLButtonElement>("schStop")?.removeAttribute("disabled");
  H<HTMLButtonElement>("schPause")?.removeAttribute("disabled");
  H<HTMLButtonElement>("schResume")?.setAttribute("disabled", "true");
  log("=== Scheduler started ===");
  tick();
}

function onStop() {
  running = false; paused = false;
  if (timer) { clearTimeout(timer); timer = null; }
  H<HTMLButtonElement>("schStart")?.removeAttribute("disabled");
  H<HTMLButtonElement>("schStop")?.setAttribute("disabled", "true");
  H<HTMLButtonElement>("schPause")?.setAttribute("disabled", "true");
  H<HTMLButtonElement>("schResume")?.setAttribute("disabled", "true");
  log("=== Scheduler stopped ===");
}

function onPause() {
  if (!running || paused) return;
  paused = true;
  H<HTMLButtonElement>("schPause")?.setAttribute("disabled", "true");
  H<HTMLButtonElement>("schResume")?.removeAttribute("disabled");
  setStatusMode("warn");
  log("‖ Paused");
}

function onResume() {
  if (!running || !paused) return;
  paused = false;
  H<HTMLButtonElement>("schResume")?.setAttribute("disabled", "true");
  H<HTMLButtonElement>("schPause")?.removeAttribute("disabled");
  setStatusMode("warn");
  log("▶ Resumed");
  tick();
}

function boot() {
  const host = document.getElementById("schedulerRoot");
  if (host) mount(host as HTMLElement);
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true } as AddEventListenerOptions);
else boot();

function showToast(msg: string) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1600);
}
