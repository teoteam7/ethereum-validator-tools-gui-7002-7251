export {};

type Api = {
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
  getValidator?(beaconBase: string, id: string): Promise<any>;

  saveText?(name: string, text: string): Promise<{ ok?: boolean; path?: string; filePath?: string }>;
};

const api = (globalThis as any).api as Api;

function H<T extends HTMLElement = HTMLElement>(id: string) {
  return document.getElementById(id) as T | null;
}
function asInput<T extends HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
  el: HTMLElement | null
): T | null {
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
  if (document.getElementById("batchStyles")) return;
  const css = `
  #batchRoot .grid{ display:grid; grid-template-columns: 1fr; gap:12px; align-items:start; }
  #batchRoot .row{ display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
  @media (max-width:1100px){ #batchRoot .row{ grid-template-columns: 1fr; } }
  #batchRoot textarea{ width:100%; min-height:200px; padding:10px; background:var(--input-bg); color:var(--input-color);
    border:1px solid var(--input-border); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  #batchRoot .muted{ color:var(--muted); font-size:12.5px; }
  #batchRoot .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }

  #console-batch{ background:#000 !important; border:1px solid #222 !important; }
  #console-batch pre{ background:transparent !important; color:#fff !important; margin:0; padding:10px; max-height:var(--console-maxh, 420px); overflow:auto; }

  #batchProg{ width:100%; height:10px; background:rgba(255,255,255,.08); position:relative; overflow:hidden; margin-top:10px; border-radius:4px; }
  #batchProg .bar{ position:absolute; left:0; top:0; bottom:0; width:0%; background:var(--app-accent, #0ea5e9); box-shadow: inset 0 0 6px rgba(34,211,238,.35); border-radius:4px; transition:width .18s ease; }

  #batchStatusBox .band{ display:flex; gap:10px; align-items:flex-start; background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08); padding:10px; border-radius:6px; }
  #batchStatusBox .band.ok{ border-color:rgba(34,197,94,.35); background:rgba(34,197,94,.08);}
  #batchStatusBox .band.warn{ border-color:rgba(245,158,11,.35); background:rgba(245,158,11,.08);}
  #batchStatusBox .band.danger{ border-color:rgba(239,68,68,.35); background:rgba(239,68,68,.08);}
  #batchStatusBox .band .icon{ width:18px; height:18px; flex:0 0 18px; margin-top:1px; }
  #batchStatusBox .band.ok .icon{ color:#22c55e }
  #batchStatusBox .band.warn .icon{ color:#f59e0b }
  #batchStatusBox .band.danger .icon{ color:#ef4444 }
  `;
  const s = document.createElement("style");
  s.id = "batchStyles";
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

  let last: any = null;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e: any) {
      last = e;
      const msg = String(e?.message || e);
      if (/invalid|forbidden|unauthorized|bad/i.test(msg)) break;
      const delay = Math.min(maxDelay, Math.floor(base * Math.pow(factor, i))) + Math.floor(Math.random() * jitter);
      await sleep(delay);
    }
  }
  throw last ?? new Error("Retry exceeded");
}

let outEl: HTMLPreElement | null = null;
let logBuffer: string[] = [];
const LOG_MAX = 5000;
const LOG_TRIM_TO = 2500;

const spinner = { active: false, label: "", dots: 0, timer: 0 as any };

function renderConsole() {
  if (!outEl) return;
  const body = logBuffer.join("\n");
  const spinLine = spinner.active ? `⧗ ${spinner.label}${spinner.dots ? ".".repeat(spinner.dots) : ""}` : "";
  outEl.textContent = body + (body ? "\n" : "") + (spinLine ? spinLine + "\n" : "");
  outEl.scrollTop = outEl.scrollHeight;
}
function log(line: string) {
  logBuffer.push(`[${nowShort()}] ${line}`);
  if (logBuffer.length > LOG_MAX) logBuffer = logBuffer.slice(-LOG_TRIM_TO);
  renderConsole();
}
function startSpinner(label: string) {
  log(`▶ ${label}…`);
  spinner.active = true;
  spinner.label = label;
  spinner.dots = 0;
  if (spinner.timer) clearInterval(spinner.timer);
  spinner.timer = setInterval(() => {
    spinner.dots = (spinner.dots + 1) % 4;
    renderConsole();
  }, 420);
  return (doneText?: string, isError = false) => {
    if (spinner.timer) clearInterval(spinner.timer);
    spinner.timer = 0;
    spinner.active = false;
    const tail = doneText ? `: ${doneText}` : ": done";
    log(`${isError ? "✗" : "✓"} ${label}${tail}`);
  };
}

function renderStatusBand(kind: "ok" | "warn" | "danger", text: string, progress?: string) {
  const box = H("batchStatusBox");
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

function parseWc(wc: string | undefined): { kind: "00" | "01" | "02" | "unknown"; address?: string } {
  if (!wc || wc.length !== 66 || !wc.startsWith("0x")) return { kind: "unknown" };
  const pfx = wc.slice(2, 4);
  let kind: "00" | "01" | "02" | "unknown" = "unknown";
  if (pfx === "00") kind = "00";
  else if (pfx === "01") kind = "01";
  else if (pfx === "02") kind = "02";
  const address = (kind === "01" || kind === "02") ? ("0x" + wc.slice(26, 66)).toLowerCase() : undefined;
  return { kind, address };
}
type Preflight = { ok: boolean; expected?: string; got?: string; reason?: string };
const pfCache = new Map<string, Preflight>();

async function preflightEOA(beaconBase: string, pubkeyHex: string, secret: string): Promise<Preflight> {
  const key = `${beaconBase}::${pubkeyHex.toLowerCase()}::${secret.slice(0, 16)}`;
  const cached = pfCache.get(key);
  if (cached) return cached;

  let gotAddr = "";
  try {
    if (!api.eip7002AddrFromSecret) throw new Error("addrFromSecret not available");
    const derived = await api.eip7002AddrFromSecret({ secret });
    gotAddr = (derived?.address || "").toLowerCase();
    if (!/^0x[0-9a-fA-F]{40}$/.test(gotAddr)) throw new Error("Cannot derive EOA from secret");
  } catch (e: any) {
    const res: Preflight = { ok: false, reason: e?.message || String(e) };
    pfCache.set(key, res); return res;
  }

  let expectedAddr = "";
  try {
    if (!api.getValidator) throw new Error("getValidator not available");
    const pk = pubkeyHex.startsWith("0x") ? pubkeyHex : ("0x" + pubkeyHex);
    const r = await withRetry(() => api.getValidator!(getBeacon(), pk), { tries: 3, baseDelayMs: 600 });
    const wc = r?.data?.validator?.withdrawal_credentials ?? r?.data?.data?.validator?.withdrawal_credentials;
    const parsed = parseWc(typeof wc === "string" ? wc : "");
    if (parsed?.kind !== "01" || !parsed?.address) {
      const res: Preflight = { ok: false, expected: parsed?.address, got: gotAddr, reason: "Validator not 0x01 / wc missing" };
      pfCache.set(key, res); return res;
    }
    expectedAddr = parsed.address.toLowerCase();
  } catch (e: any) {
    const res: Preflight = { ok: false, expected: "", got: gotAddr, reason: e?.message || String(e) };
    pfCache.set(key, res); return res;
  }

  const ok = expectedAddr === gotAddr;
  const res: Preflight = ok ? { ok: true, expected: expectedAddr, got: gotAddr }
                            : { ok: false, expected: expectedAddr, got: gotAddr, reason: "EOA ≠ 0x01" };
  pfCache.set(key, res);
  return res;
}

const STORE_KEY = "vt.batch.settings.v1";
const QUEUE_KEY = "vt.batch.queue.v1";

function gatherSettings() {
  return {
    btSecret: getElValue("btSecret"),
    btRpc: getElValue("btRpc"),
    btConc: getElValue("btConc"),
    btRetries: getElValue("btRetries"),
    btMaxFee: getElValue("btMaxFee"),
    btMaxPrio: getElValue("btMaxPrio"),
    btGasLimit: getElValue("btGasLimit"),
  };
}
function applySettings(s: any) {
  if (!s) return;
  if (s.btSecret) setElValue("btSecret", s.btSecret);
  if (s.btRpc) setElValue("btRpc", s.btRpc);
  if (s.btConc) setElValue("btConc", s.btConc);
  if (s.btRetries) setElValue("btRetries", s.btRetries);
  if (s.btMaxFee) setElValue("btMaxFee", s.btMaxFee);
  if (s.btMaxPrio) setElValue("btMaxPrio", s.btMaxPrio);
  if (s.btGasLimit) setElValue("btGasLimit", s.btGasLimit);
}
function persistNow() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(gatherSettings()));
    localStorage.setItem(QUEUE_KEY, getElValue("btList") || "");
  } catch {}
}
function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) applySettings(JSON.parse(raw));
    const q = localStorage.getItem(QUEUE_KEY);
    if (q) setElValue("btList", q);
  } catch {}
}

function getRpc() { return getElValue("btRpc") || getElValue("rpcUrl"); }
function getBeacon() { return getElValue("beaconUrl"); }
function setProg(pct: number) {
  const bar = H<HTMLDivElement>("batchProgBar");
  if (bar) bar.style.width = `${Math.max(0, Math.min(100, Math.round(pct)))}%`;
}

type Job = { pubkey: string; amountGwei: string; attempts: number; done: boolean; tx?: string; err?: string };
let tasks: Job[] = [];
let running = false;
let stopping = false;
let inflight = 0;

function parseQueue(): Job[] {
  const raw = getElValue("btList");
  const seen = new Set<string>();
  const res: Job[] = [];
  if (!raw) return res;

  const lines = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  for (const ln of lines) {
    const parts = ln.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
    if (parts.length < 1) { log("⚠ skip empty line"); continue; }
    const pub = parts[0];
    const amt = parts[1] ?? "0";
    if (!/^0x[0-9A-Fa-f]{96}$/.test(pub) || !/^\d+$/.test(amt)) { log(`⚠ bad line: "${ln}"`); continue; }
    const key = `${pub.toLowerCase()}__${amt}`;
    if (seen.has(key)) { log(`ℹ duplicate skipped: ${pub.slice(0,12)}… ${amt}`); continue; }
    seen.add(key);
    res.push({ pubkey: pub, amountGwei: amt, attempts: 0, done: false });
  }
  return res;
}
function rewriteTextareaFromTasks(ts: Job[]) {
  const lines = ts.map(t => `${t.pubkey}, ${t.amountGwei}`);
  setElValue("btList", lines.join("\n"));
  persistNow();
}
function updateProgress() {
  const left = tasks.filter(t => !t.done).length;
  const ok = tasks.filter(t => t.done).length;
  const fail = tasks.filter(t => !t.done && t.err).length;
  const progress = `ok=${ok} • failed=${fail} • pending=${left} • inflight=${inflight}`;
  renderStatusBand(running ? "warn" : "ok", running ? "Batch running" : "Batch idle", progress);
}

async function actionValidate() {
  const rpc = getRpc(); const beacon = getBeacon();
  const secret = getElValue("btSecret");
  if (!rpc) { log("⚠ validate: RPC required"); return; }
  if (!secret) { log("⚠ validate: Secret required"); return; }
  if (!beacon || typeof api.getValidator !== "function") {
    log("⚠ validate: Beacon not set or getValidator not available — skip 0x01 checks");
  }

  tasks = parseQueue();
  if (!tasks.length) { log("ℹ validate: queue empty"); updateProgress(); return; }

  const stop = startSpinner(`Validate ${tasks.length} items`);
  let ok = 0, bad = 0;

  if (beacon && api.getValidator && api.eip7002AddrFromSecret) {
    for (const t of tasks) {
      try {
        const pre = await withRetry(() => preflightEOA(beacon, t.pubkey, secret), { tries: 2, baseDelayMs: 500 });
        if (!pre.ok) { t.err = pre.reason || `EOA mismatch (expected ${pre.expected}, got ${pre.got})`; bad++; log(`✗ ${t.pubkey.slice(0,12)}… ${t.amountGwei}: ${t.err}`); }
        else { ok++; log(`✓ ${t.pubkey.slice(0,12)}… ${t.amountGwei}: preflight ok`); }
      } catch (e: any) {
        t.err = e?.message || String(e); bad++; log(`✗ ${t.pubkey.slice(0,12)}… ${t.amountGwei}: ${t.err}`);
      }
    }
  } else {
    log("ℹ preflight skipped (no beacon/getValidator/eip7002AddrFromSecret)");
  }

  stop(`ok=${ok}, bad=${bad}`);
  updateProgress();
}
async function actionRun() {
  const rpc = getRpc(); const beacon = getBeacon();
  const secret = getElValue("btSecret");
  if (!rpc) { log("⚠ run: RPC required"); return; }
  if (!secret) { log("⚠ run: Secret required"); return; }

  tasks = parseQueue();
  if (!tasks.length) { log("ℹ run: queue empty"); updateProgress(); return; }

  const conc = Math.max(1, Number(getElValue("btConc") || "3"));
  const retries = Math.max(0, Number(getElValue("btRetries") || "2"));
  const gas = {
    maxFee: getElValue("btMaxFee"),
    maxPrio: getElValue("btMaxPrio"),
    gasLimit: getElValue("btGasLimit"),
  };

  running = true; stopping = false; inflight = 0;
  H<HTMLButtonElement>("btStop")?.removeAttribute("disabled");
  setProg(0);
  updateProgress();
  log(`=== Batch start: total=${tasks.length} conc=${conc} retries=${retries} rpc=${rpc} ===`);

  const next = () => tasks.find(j => !j.done && (!j.err || j.attempts <= retries));

  async function submitJob(j: Job) {
    const stop = startSpinner(`Submit ${j.pubkey.slice(0, 12)}… ${j.amountGwei} gwei`);
    j.attempts++;
    try {
      const res = await api.eip7002Submit({
        rpcUrl: rpc,
        secret,
        validatorPubkey: j.pubkey,
        amountGwei: j.amountGwei,
        gas: {
          maxFeePerGasGwei: gas.maxFee || undefined,
          maxPriorityFeePerGasGwei: gas.maxPrio || undefined,
          gasLimit: gas.gasLimit || undefined,
        },
        sendRetries: 3,
        bumpPercent: 12,
      });
      j.done = true; j.tx = res.txHash;
      stop(`tx=${res.txHash}`);
    } catch (e: any) {
      j.err = e?.message || String(e);
      stop(`failed: ${j.err}`, true);
    }
  }

  async function worker() {
    while (running && !stopping) {
      const j = next(); if (!j) break;

      if (beacon && api.getValidator && api.eip7002AddrFromSecret) {
        try {
          const pre = await withRetry(() => preflightEOA(beacon, j.pubkey, secret), { tries: 2, baseDelayMs: 500 });
          if (!pre.ok) { j.err = pre.reason || "EOA preflight failed"; log(`✗ preflight ${j.pubkey.slice(0,12)}…: ${j.err}`); continue; }
        } catch (e: any) {
          j.err = e?.message || String(e);
          log(`✗ preflight ${j.pubkey.slice(0,12)}…: ${j.err}`); continue;
        }
      }

      inflight++;
      await submitJob(j).finally(() => { inflight--; });

      const doneCnt = tasks.filter(x => x.done).length;
      const okCnt = doneCnt;
      const failCnt = tasks.filter(x => !x.done && x.err && x.attempts > retries).length;
      const left = tasks.filter(x => !x.done).length;

      const pct = (doneCnt / tasks.length) * 100;
      setProg(pct);
      renderStatusBand("warn", "Batch running", `ok=${okCnt} • failed=${failCnt} • pending=${left} • inflight=${inflight}`);
    }
  }

  const workers: Array<Promise<void>> = [];
  for (let i = 0; i < Math.min(conc, tasks.length); i++) workers.push(worker());
  await Promise.all(workers);

  running = false; H<HTMLButtonElement>("btStop")?.setAttribute("disabled", "true");
  const okF = tasks.filter(t => t.done).length;
  const failF = tasks.filter(t => !t.done && t.err && t.attempts > retries).length;
  const leftF = tasks.filter(t => !t.done && (!t.err || t.attempts <= retries)).length;
  setProg((okF / tasks.length) * 100);
  renderStatusBand("ok", "Batch complete", `ok=${okF} • failed=${failF} • pending=${leftF} • inflight=${inflight}`);
  log(`=== Batch complete: ok=${okF} fail=${failF} pending=${leftF} ===`);
}
function actionStop() {
  if (!running) return;
  stopping = true;
  log("‖ Stop requested");
  H<HTMLButtonElement>("btStop")?.setAttribute("disabled", "true");
}
function actionRetryFailed() {
  if (!tasks.length) { log("ℹ retry: no tasks in memory"); return; }
  let cnt = 0;
  tasks.forEach(t => {
    if (!t.done && t.err) { t.err = undefined; t.attempts = 0; cnt++; }
  });
  log(`ℹ retry: ${cnt} tasks reset`);
  rewriteTextareaFromTasks(tasks.filter(t => !t.done));
}
function actionMoveErrorsTop() {
  if (!tasks.length) { log("ℹ move errors: no tasks in memory"); return; }
  const errs = tasks.filter(t => !t.done && t.err);
  const rest = tasks.filter(t => !t.done && !t.err);
  const merged = [...errs, ...rest];
  rewriteTextareaFromTasks(merged);
  log(`ℹ moved ${errs.length} errored to top`);
}
function actionClearDone() {
  if (!tasks.length) {
    const parsed = parseQueue().filter(t => !t.done);
    rewriteTextareaFromTasks(parsed);
    log("ℹ clear done: textarea rewritten");
    return;
  }
  const keep = tasks.filter(t => !t.done);
  rewriteTextareaFromTasks(keep);
  log(`ℹ clear done: kept ${keep.length}`);
}
function actionClearAll() {
  setElValue("btList", "");
  persistNow();
  log("ℹ queue cleared");
}
async function actionExportCsv() {
  const csv = buildCsv();
  const fname = makeFileName("batch_queue", "csv");

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

  try {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
    log(`✓ Exported (downloaded) ${fname}`);
    showToast("CSV downloaded");
  } catch {
    log("✗ Export failed: unable to create download");
    showToast("Export failed");
  }
}

function buildCsv(): string {
  const header = "pubkey,amount_gwei,status,attempts,tx,err\n";
  const rows = tasks.map(t => {
    const status = t.done ? "done" : (t.err ? "error" : "pending");
    return `${t.pubkey},${t.amountGwei},${status},${t.attempts},${t.tx || ""},${(t.err || "").replace(/[\r\n,]/g, " ")}`;
  }).join("\n");
  return "\uFEFF" + header + rows + (rows ? "\n" : "");
}
function makeFileName(prefix: string, ext: string) {
  const ts = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${prefix}_${ts.getFullYear()}-${pad(ts.getMonth()+1)}-${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.${ext}`;
}

function mount(root: HTMLElement) {
  injectStyles();
  root.innerHTML = `
  <div class="grid">
    <div>
      <label>Batch input</label>
      <div class="muted">Format: <span class="mono">0xPubkey48, amountGwei</span> (one job per line).</div>
      <textarea id="btList" placeholder="0x..., 0&#10;0x..., 3200000000"></textarea>

      <div class="row" style="margin-top:8px;">
        <div>
          <label>EOA secret</label>
          <div class="input-wrap"><input id="btSecret" type="password" placeholder="0x... or seed phrase"/></div>
        </div>
        <div>
          <label>RPC</label>
          <div class="input-wrap"><input id="btRpc" placeholder="(auto from top)"/></div>
        </div>
      </div>

      <div class="row" style="margin-top:8px;">
        <div><label>Concurrency</label><div class="input-wrap"><input id="btConc" value="3"/></div></div>
        <div><label>Retries</label><div class="input-wrap"><input id="btRetries" value="2"/></div></div>
      </div>

      <div class="row" style="margin-top:8px;">
        <div><label>maxFeePerGas (gwei)</label><div class="input-wrap"><input id="btMaxFee" placeholder="auto"/></div></div>
        <div><label>maxPriorityFee (gwei)</label><div class="input-wrap"><input id="btMaxPrio" placeholder="auto"/></div></div>
      </div>

      <div class="row" style="margin-top:8px;">
        <div><label>gasLimit</label><div class="input-wrap"><input id="btGasLimit" placeholder="auto"/></div></div>
        <div></div>
      </div>

      <div class="btns" style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn ghost"   id="btValidate" type="button">Validate</button>
        <button class="btn primary" id="btRun"      type="button">Submit all</button>
        <button class="btn"         id="btStop"     type="button" disabled>Stop</button>
        <button class="btn ghost"   id="btRetry"    type="button">Retry failed</button>
        <button class="btn ghost"   id="btMoveErr"  type="button">Move errors to top</button>
        <button class="btn ghost"   id="btClearDone" type="button">Clear done</button>
        <button class="btn ghost"   id="btClearAll" type="button">Clear all</button>
        <button class="btn"         id="btExport"   type="button">Export CSV</button>
      </div>

      <div id="batchProg"><div class="bar" id="batchProgBar"></div></div>
      <div id="batchStatusBox" style="margin-top:10px;"></div>
    </div>
  </div>
  `;

  const externalHost = H("batchConsoleHost");
  if (externalHost && !externalHost.querySelector("#console-batch")) {
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="console" id="console-batch" style="margin-top:0;">
        <div class="toolbar"><button class="btn ghost" id="btCopy" type="button">Copy</button></div>
        <pre id="btOut">—</pre>
      </div>
    `;
    externalHost.appendChild(wrap.firstElementChild!);
  }
  outEl = H<HTMLPreElement>("btOut");
  if (outEl && outEl.textContent === "—") outEl.textContent = "";

  H("btCopy")?.addEventListener("click", async () => {
    const text = (outEl?.textContent || "").toString();
    try { await navigator.clipboard.writeText(text); showToast("Copied to clipboard"); } catch {}
  });

  (function autoRpc() {
    const topRpc = H<HTMLInputElement>("rpcUrl");
    const btRpc = H<HTMLInputElement>("btRpc");
    if (!btRpc) return;
    const setIfEmpty = () => { if (btRpc.value.trim() === "" && topRpc) btRpc.value = topRpc.value.trim(); };
    setIfEmpty();
    topRpc?.addEventListener("change", () => { if (btRpc.dataset.userEdited !== "1") btRpc.value = topRpc!.value.trim(); persistNow(); });
    btRpc.addEventListener("input", () => { btRpc.dataset.userEdited = "1"; persistNow(); });
    document.addEventListener("vt:profile", () => {
      if (btRpc.dataset.userEdited !== "1" && btRpc.value.trim() === "" && topRpc) { btRpc.value = topRpc.value.trim(); persistNow(); }
    });
  })();

  ["btList","btSecret","btRpc","btConc","btRetries","btMaxFee","btMaxPrio","btGasLimit"].forEach(id => {
    H(id)?.addEventListener("input", persistNow);
    H(id)?.addEventListener("change", persistNow);
  });

  H("btValidate")?.addEventListener("click", () => { actionValidate().catch(e => log(String(e))); });
  H("btRun")?.addEventListener("click", () => { actionRun().catch(e => log(String(e))); });
  H("btStop")?.addEventListener("click", () => { actionStop(); });
  H("btRetry")?.addEventListener("click", () => { actionRetryFailed(); });
  H("btMoveErr")?.addEventListener("click", () => { actionMoveErrorsTop(); });
  H("btClearDone")?.addEventListener("click", () => { actionClearDone(); });
  H("btClearAll")?.addEventListener("click", () => { actionClearAll(); });
  H("btExport")?.addEventListener("click", () => { actionExportCsv().catch(e => log(String(e))); });

  loadPersisted();
  renderStatusBand("ok", "Batch idle", "ok=0 • failed=0 • pending=0 • inflight=0");
}

function boot() {
  const host = H("batchRoot");
  if (host) mount(host as HTMLElement);
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true } as AddEventListenerOptions);
} else {
  boot();
}

function showToast(msg: string) {
  const t = H("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1600);
}
