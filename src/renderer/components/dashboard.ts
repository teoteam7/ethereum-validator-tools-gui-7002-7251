export {};

type Api = {
  getValidator(beaconBase: string, id: string): Promise<any>;
  getHeader(beaconBase: string, id: string): Promise<any>;
  rpcGetInfo?(rpcUrl: string): Promise<{
    ok: boolean;
    chainId: number;
    blockNumber: number;
    client?: string | null;
    latency: number;
  }>;
  eip7002GetFee(rpc: string): Promise<any>;
  profileGet?(): Promise<{ pubkey?: string; index?: number | string } | null>;
};

const api = (globalThis as any).api as Api;

function qs<T extends HTMLElement = HTMLElement>(
  selector: string,
  root: Document | HTMLElement = document
) {
  return root.querySelector(selector) as T | null;
}
function getInputValue(id: string): string {
  const el = document.getElementById(id) as HTMLInputElement | null;
  return (el?.value || "").trim();
}
function setText(el: Element | null, text: string) {
  if (!el) return;
  el.textContent = text;
  if (text && text !== "—") (el as HTMLElement).title = text;
  else (el as HTMLElement).removeAttribute("title");
}
function setHtml(el: Element | null, html: string) {
  if (!el) return;
  (el as HTMLElement).innerHTML = html;
  const plain = (el as HTMLElement).textContent || "";
  if (plain && plain !== "—") (el as HTMLElement).title = plain;
  else (el as HTMLElement).removeAttribute("title");
}

async function rpcCall(rpcUrl: string, method: string, params: any[] = []) {
  const r = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const j = await r.json();
  if (j?.error) throw new Error(j.error?.message || "RPC error");
  return j.result;
}

function injectStyles() {
  if (document.getElementById("dashStyles")) return;
  const css = `
:root{ --card-row-h: 168px; }
#tab-dashboard > .title{ display:none !important; }
#tab-dashboard{ overflow:hidden !important; }
.dash{ display:flex; flex-direction:column; gap:12px; min-height: calc(var(--work-h) - 24px); overflow:hidden; }
.dash .controls{ display:grid; grid-template-columns: 1fr auto; gap:10px; align-items:end; }
.dash .controls .field .wrap{ position:relative; }
.dash .controls .field .float-label{ position:absolute; left:12px; top:4px; font-size:10px; color:var(--muted); pointer-events:none; opacity:.9; }
.dash .controls .field input{ width:100%; height:38px; padding:15px 12px 5px; background:var(--input-bg); color:var(--input-color); border:1px solid var(--input-border); }
.dash .controls .field input[readonly]{ color: var(--muted); cursor: default; }
.btn{ position:relative; display:inline-flex; align-items:center; justify-content:center; gap:8px; height:38px; padding:0 14px; }
.btn .btnspin{ display:none; width:14px; height:14px; border-radius:50%; border:2px solid rgba(255,255,255,.35); border-top-color: var(--accent); }
.btn.loading .btnspin{ display:inline-block; animation:dashspin .8s linear infinite; }
@keyframes dashspin{ to{ transform: rotate(360deg); } }
.dash .cards{ display:grid; grid-template-columns: repeat(3, minmax(260px, 1fr)); grid-auto-rows: var(--card-row-h); gap:12px; align-items:stretch; align-content:start; overflow:hidden; }
@media (max-width:1200px){ .dash .cards{ grid-template-columns: repeat(2, minmax(260px, 1fr)); } }
@media (max-width:800px){ .dash .cards{ grid-template-columns: 1fr; } }
.dash .card{ border:1px solid var(--border); background: var(--panel); padding:10px 12px; display:flex; flex-direction:column; height:100%; min-height:0; }
.dash .card h4{ margin:0 0 8px 0; font-size:13px; font-weight:900; letter-spacing:.2px; display:flex; align-items:center; gap:8px; color: var(--icon); }
.dash .card h4 svg{ width:16px; height:16px; stroke: currentColor; stroke-width:1.8; fill:none; }
.dash .kvs{ flex:1 1 auto; display:grid; grid-template-columns: 120px 1fr; column-gap:10px; row-gap:3px; min-height:0; overflow:hidden; }
#card-wc .kvs{ row-gap:4px; grid-template-columns: 1fr; }
#card-7002 .kvs{ grid-template-columns: 120px 1fr; }
#card-7002 .kvs .v{ justify-self: end; text-align: right; }
.rowline{ margin-top:6px; }
#wcAction, #feeAction, #nodesAction{ margin-top:auto; display:flex; justify-content:flex-end; }
.dash .kvs .k{ color: var(--muted); font-size:11.5px; line-height:15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dash .kvs .v{ font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size:12px; line-height:15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dash .kvs .v.full{ white-space: normal !important; overflow: visible !important; word-break: break-word; }
.dash .kvs .v.full.mono{ word-break: break-all; }
.dash .loading{ opacity:.6; filter:saturate(.85); }
.v .eth{ color:#f59e0b; font-weight:800; letter-spacing:.1px; }
.v .gwei{ color:#22d3ee; font-weight:800; }
.v .wei{ color:#60a5fa; font-weight:700; }
.v .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.ok-badge, .warn-badge, .danger-badge{ display:inline-block; padding:2px 7px; font-size:12px; border-radius:999px; background:transparent; }
.ok-badge{ color:#16a34a; border:1px solid rgba(34,197,94,.55); }
.warn-badge{ color:#b45309; border:1px solid rgba(245,158,11,.55); }
.danger-badge{ color:#b91c1c; border:1px solid rgba(239,68,68,.55); }
#gfValBadge{ margin-left:auto; }
.workspace:has(#tab-dashboard:not(.hidden)){ overflow:hidden !important; }
#health{ display:inline-flex; align-items:center; min-height:20px; }
#health .ok-badge, #health .warn-badge, #health .danger-badge{ line-height:1; padding:3px 8px 2px; }
#health .ok-badge, #health .warn-badge, #health .danger-badge{ position:relative; top:1px; }
#health .ok-badge, #health .warn-badge, #health .danger-badge{ display:inline-flex; align-items:center; height:20px; padding:2px 8px 1px; line-height:12px; vertical-align:middle; transform: translateY(0.5px); }
#card-el #elWei{ white-space:normal !important; }
#card-el #elWei .wei{ display:block; margin-top:2px; }
.leftrail:has(#tab-dashboard:not(.hidden)){ overflow:hidden !important; }
.val-badge{ display:inline-flex; align-items:center; gap:8px; padding:6px 10px; height: calc(var(--global-footer-h) - 10px); border:1px solid rgba(139,92,246,.45); background: rgba(139,92,246,.12); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size:12px; white-space:nowrap; }
.val-badge .dot{ width:8px; height:8px; border-radius:999px; background:#a78bfa; box-shadow:0 0 8px rgba(167,139,250,.35); }
`;
  const s = document.createElement("style");
  s.id = "dashStyles";
  s.textContent = css;
  document.head.appendChild(s);
}

function formatUnits(value: bigint, decimals: number): string {
  const neg = value < 0n;
  let v = neg ? -value : value;
  const base = 10n ** BigInt(decimals);
  const i = v / base;
  const f = v % base;
  const frac = f.toString().padStart(decimals, "0").replace(/0+$/, "");
  return (neg ? "-" : "") + i.toString() + (frac ? "." + frac : "");
}
function trimDecimals(s: string, max: number): string {
  if (!s.includes(".")) return s;
  const parts = s.split(".");
  const i = parts[0];
  const f = parts[1] || "";
  const t = f.slice(0, Math.max(0, max)).replace(/0+$/, "");
  return t ? i + "." + t : i;
}
function gweiToEth(gwei: bigint): string {
  const wei = gwei * 1_000_000_000n;
  return formatUnits(wei, 18);
}
function parseWc(
  wc: string | null | undefined
): { kind: "0x00" | "0x01" | "0x02" | "unknown"; address?: string } {
  if (!wc || typeof wc !== "string" || wc.length !== 66 || !wc.startsWith("0x"))
    return { kind: "unknown" };
  const pfx = wc.slice(2, 4);
  let kind: "0x00" | "0x01" | "0x02" | "unknown" = "unknown";
  if (pfx === "00") kind = "0x00";
  if (pfx === "01") kind = "0x01";
  if (pfx === "02") kind = "0x02";
  let address: string | undefined;
  if (kind === "0x01" || kind === "0x02") address = "0x" + wc.slice(26, 66);
  return { kind, address };
}
function friendlyError(e: unknown): string {
  const raw = (e as any)?.message ? String((e as any).message) : String(e ?? "Error");
  const lower = raw.toLowerCase();
  if (lower.includes("429"))
    return "Public Beacon throttled (429). Change the Beacon URL or try again later.";
  if (lower.includes("fetch failed") || lower.includes("network"))
    return "Beacon not reachable. Check URL or network.";
  return raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 140);
}

type CacheEntry<T> = { t: number; ttl: number; v: T };
const now = () => Date.now();
const caches = {
  store: new Map<string, CacheEntry<any>>(),
  inflight: new Map<string, Promise<any>>(),
  get<T>(k: string): T | null {
    const e = this.store.get(k);
    if (!e) return null;
    if (now() - e.t > e.ttl) return null;
    return e.v as T;
  },
  set<T>(k: string, v: T, ttl: number) {
    this.store.set(k, { t: now(), ttl, v });
  },
  dedupe<T>(k: string, fn: () => Promise<T>): Promise<T> {
    const p = this.inflight.get(k);
    if (p) return p as Promise<T>;
    const run = fn().finally(() => this.inflight.delete(k));
    this.inflight.set(k, run);
    return run as Promise<T>;
  },
};

const TTL = {
  validator: 60_000,
  head: 6_000,
  rpc: 20_000,
  fee: 30_000,
  elbal: 20_000,
};

let lastBeaconCallAt = 0;
const BEACON_COOLDOWN_MS = 1500;
function beaconCooldownDelay(): Promise<void> {
  const elapsed = now() - lastBeaconCallAt;
  const jitter = Math.floor(Math.random() * 250);
  const need = Math.max(0, BEACON_COOLDOWN_MS - elapsed) + jitter;
  return new Promise((res) => setTimeout(res, need));
}
async function withBeaconCooldown<T>(fn: () => Promise<T>): Promise<T> {
  await beaconCooldownDelay();
  try {
    const v = await fn();
    lastBeaconCallAt = now();
    return v;
  } catch (e) {
    lastBeaconCallAt = now();
    throw e;
  }
}

const metrics = {
  lastRefreshMs: 0,
  lastBeaconLatency: 0,
  lastRpcLatency: 0,
  cooldownLeftMs(): number {
    const elapsed = now() - lastBeaconCallAt;
    return Math.max(0, BEACON_COOLDOWN_MS - elapsed);
  },
  cacheHits: { validator: 0, head: 0, rpc: 0, fee: 0, elbal: 0 },
};
function classifyLatency(ms: number): "ok" | "warn" | "bad" {
  if (ms <= 400) return "ok";
  if (ms <= 1200) return "warn";
  return "bad";
}
function expectedChainId(): number {
  const sel = document.getElementById("network") as HTMLSelectElement | null;
  const v = sel?.value || "mainnet";
  return v === "holesky" ? 17000 : 1;
}

function renderGlobalFooter() {
  const elBeacon = qs("#gfBeacon");
  const elRpc = qs("#gfRpc");
  const elCool = qs("#gfCooldown");
  const vBeacon = qs("#gfBeaconLat");
  const vRpc = qs("#gfRpcLat");
  const vCool = qs("#gfCooldownVal");
  const barFill = qs<HTMLDivElement>("#gfCoolFill");

  if (vBeacon) vBeacon.textContent = metrics.lastBeaconLatency ? String(metrics.lastBeaconLatency) + " ms" : "—";
  if (vRpc) vRpc.textContent = metrics.lastRpcLatency ? String(metrics.lastRpcLatency) + " ms" : "—";

  const bClass = classifyLatency(metrics.lastBeaconLatency);
  const rClass = classifyLatency(metrics.lastRpcLatency);
  if (elBeacon) {
    elBeacon.classList.remove("ok", "warn", "bad");
    elBeacon.classList.add(bClass);
  }
  if (elRpc) {
    elRpc.classList.remove("ok", "warn", "bad");
    elRpc.classList.add(rClass);
  }

  const left = metrics.cooldownLeftMs();
  const pct = Math.max(0, Math.min(100, Math.round(100 - (left / 1500) * 100)));
  if (barFill) barFill.style.width = String(pct) + "%";
  if (vCool) vCool.textContent = String(left) + " ms";
  if (elCool) {
    const cls = left === 0 ? "ok" : left < 800 ? "warn" : "bad";
    elCool.classList.remove("ok", "warn", "bad");
    elCool.classList.add(cls);
  }
}

let coolTimer: number | null = null;
function ensureCooldownTicker() {
  if (coolTimer != null) return;
  coolTimer = window.setInterval(renderGlobalFooter, 120);
}

async function getValidatorCached(beacon: string, id: string) {
  const key = "val|" + beacon + "|" + id;
  const cached = caches.get<any>(key);
  if (cached) { metrics.cacheHits.validator++; return cached; }
  return caches.dedupe(key, async () => {
    const t0 = now();
    const data = await withBeaconCooldown(function () { return api.getValidator(beacon, id); });
    caches.set(key, data, TTL.validator);
    metrics.lastBeaconLatency = now() - t0;
    return data;
  });
}
async function getHeadCached(beacon: string) {
  const key = "head|" + beacon;
  const cached = caches.get<any>(key);
  if (cached) { metrics.cacheHits.head++; return cached; }
  return caches.dedupe(key, async () => {
    const t0 = now();
    const data = await withBeaconCooldown(function () { return api.getHeader(beacon, "head"); });
    caches.set(key, data, TTL.head);
    metrics.lastBeaconLatency = now() - t0;
    return data;
  });
}
async function getRpcInfoCached(rpc: string) {
  const key = "rpc|" + rpc;
  const cached = caches.get<any>(key);
  if (cached) { metrics.cacheHits.rpc++; return cached; }
  return caches.dedupe(key, async () => {
    const t0 = now();
    let res: any;
    if (api.rpcGetInfo) res = await api.rpcGetInfo(rpc);
    else {
      const cidHex = await rpcCall(rpc, "eth_chainId");
      const blkHex = await rpcCall(rpc, "eth_blockNumber");
      res = {
        ok: true,
        chainId: parseInt(String(cidHex), 16),
        blockNumber: parseInt(String(blkHex), 16),
        client: null,
        latency: 0,
      };
    }
    caches.set(key, res, TTL.rpc);
    metrics.lastRpcLatency = now() - t0;
    return res;
  });
}
async function getFeeCached(rpc: string) {
  const key = "fee|" + rpc;
  const cached = caches.get<any>(key);
  if (cached) { metrics.cacheHits.fee++; return cached; }
  return caches.dedupe(key, async () => {
    const feeStr = await api.eip7002GetFee(rpc);
    const v = { feeWei: BigInt(feeStr || "0") };
    caches.set(key, v, TTL.fee);
    return v;
  });
}
async function getElBalanceCached(rpc: string, addr: string) {
  const key = "el|" + rpc + "|" + addr.toLowerCase();
  const cached = caches.get<any>(key);
  if (cached) { metrics.cacheHits.elbal++; return cached; }
  return caches.dedupe(key, async () => {
    const resHex = await rpcCall(rpc, "eth_getBalance", [addr, "latest"]);
    const v = { wei: BigInt(resHex) };
    caches.set(key, v, TTL.elbal);
    return v;
  });
}

function mount(root: HTMLElement) {
  injectStyles();

  const ico = {
    validator:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4"></path><path d="M2 20a8 8 0 0 1 16 0Z"></path></svg>',
    consensus:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v12"></path><path d="M6 12h12"></path></svg>',
    wc:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h13a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H3z"></path><path d="M16 10h4v4h-4z"></path><circle cx="7" cy="12" r="1"></circle></svg>',
    el:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h14a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H3z"></path><path d="M7 7V5a3 3 0 0 1 3-3h6"></path></svg>',
    nodes:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="3" width="20" height="6" rx="2"></rect><rect x="2" y="9" width="20" height="6" rx="2"></rect><rect x="2" y="15" width="20" height="6" rx="2"></rect></svg>',
    fee:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M8 9h8"></path><path d="M8 13h6"></path><path d="M8 17h4"></path></svg>',
  };

  root.innerHTML =
    ''
    + '<div class="dash">'
    + '  <div class="controls">'
    + '    <div class="field">'
    + '      <div class="wrap">'
    + '        <span class="float-label">Validator ID (pubkey or index)</span>'
    + '        <input id="dashId" placeholder="" readonly />'
    + '      </div>'
    + '    </div>'
    + '    <div class="actions">'
    + '      <button class="btn" id="dashRefresh"><span class="btnspin" aria-hidden="true"></span><span class="label">Refresh</span></button>'
    + '    </div>'
    + '  </div>'
    + '  <div class="cards">'
    + '    <div class="card" id="card-val">'
    + '      <h4>' + ico.validator + ' Validator</h4>'
    + '      <div class="kvs">'
    + '        <div class="k">Index</div><div class="v" id="valIndex">—</div>'
    + '        <div class="k">Status</div><div class="v" id="valStatus">—</div>'
    + '        <div class="k">Slashed</div><div class="v" id="valSlashed">—</div>'
    + '        <div class="k">Pubkey</div><div class="v full mono" id="valPub">—</div>'
    + '      </div>'
    + '    </div>'
    + '    <div class="card" id="card-cl">'
    + '      <h4>' + ico.consensus + ' Consensus balance</h4>'
    + '      <div class="kvs">'
    + '        <div class="k">Effective</div><div class="v" id="valEffEth">—</div>'
    + '        <div class="k">Effective (gwei)</div><div class="v" id="valEffGwei">—</div>'
    + '        <div class="k">Activation epoch</div><div class="v" id="valAct">—</div>'
    + '        <div class="k">Exit / Withdrawable</div><div class="v full" id="valExitWdr">—</div>'
    + '      </div>'
    + '    </div>'
    + '    <div class="card" id="card-wc">'
    + '      <h4>' + ico.wc + ' Withdrawal credentials</h4>'
    + '      <div class="kvs">'
    + '        <div class="k">Type</div><div class="v" id="wcType">—</div>'
    + '        <div class="k">Address</div><div class="v full mono" id="wcAddr">—</div>'
    + '      </div>'
    + '      <div id="wcAction" class="rowline"></div>'
    + '    </div>'
    + '    <div class="card" id="card-el">'
    + '      <h4>' + ico.el + ' EL balance (withdrawal address)</h4>'
    + '      <div class="kvs">'
    + '        <div class="k">Address</div><div class="v full mono" id="elAddr">—</div>'
    + '        <div class="k">ETH</div><div class="v" id="elEth">—</div>'
    + '        <div class="k">Wei</div><div class="v" id="elWei">—</div>'
    + '      </div>'
    + '    </div>'
    + '    <div class="card" id="card-nodes">'
    + '      <h4>' + ico.nodes + ' Nodes</h4>'
    + '      <div class="kvs">'
    + '        <div class="k">Beacon head</div><div class="v" id="beaconHead">—</div>'
    + '        <div class="k">RPC</div><div class="v full" id="rpcInfo">—</div>'
    + '        <div class="k">Health</div><div class="v" id="health">—</div>'
    + '      </div>'
    + '      <div id="nodesAction" class="rowline"></div>'
    + '    </div>'
    + '    <div class="card" id="card-7002">'
    + '      <h4>' + ico.fee + ' EIP-7002 fee</h4>'
    + '      <div class="kvs">'
    + '        <div class="k">wei</div><div class="v" id="feeWei">—</div>'
    + '        <div class="k">gwei</div><div class="v" id="feeGwei">—</div>'
    + '        <div class="k">ETH</div><div class="v" id="feeEth">—</div>'
    + '      </div>'
    + '      <div id="feeAction" class="rowline"></div>'
    + '    </div>'
    + '  </div>'
    + '</div>';

  const els = {
    id: qs<HTMLInputElement>("#dashId", root)!,
    refresh: qs<HTMLButtonElement>("#dashRefresh", root)!,

    cardAll: Array.from(root.querySelectorAll(".dash .card")) as HTMLElement[],

    valIndex: qs("#valIndex", root),
    valStatus: qs("#valStatus", root),
    valSlashed: qs("#valSlashed", root),
    valPub: qs("#valPub", root),
    valEffEth: qs("#valEffEth", root),
    valEffGwei: qs("#valEffGwei", root),
    valAct: qs("#valAct", root),
    valExitWdr: qs("#valExitWdr", root),
    wcType: qs("#wcType", root),
    wcAddr: qs("#wcAddr", root),
    wcAction: qs("#wcAction", root),
    elAddr: qs("#elAddr", root),
    elEth: qs("#elEth", root),
    elWei: qs("#elWei", root),
    beaconHead: qs("#beaconHead", root),
    rpcInfo: qs("#rpcInfo", root),
    health: qs("#health", root),
    feeWei: qs("#feeWei", root),
    feeGwei: qs("#feeGwei", root),
    feeEth: qs("#feeEth", root),
    feeAction: qs("#feeAction", root),
    nodesAction: qs("#nodesAction", root),
  };

  const setCardsLoading = function (on: boolean) { els.cardAll.forEach(function (c) { c.classList.toggle("loading", on); }); };
  const setBtnLoading = function (on: boolean) { if (els.refresh) els.refresh.classList.toggle("loading", on); };

  let isRefreshing = false;
  const HARD_MIN_INTERVAL = 1500;
  let lastNetRefreshAt = 0;

  function renderWcAction(kind: "0x00" | "0x01" | "0x02" | "unknown") {
    const cont = els.wcAction;
    if (!cont) return;
    cont.innerHTML = "";
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = "BLS → 0x01";
    if (kind === "0x00") {
      btn.onclick = function () {
        const tab = document.querySelector<HTMLButtonElement>('.nav button[data-tab="bls"]');
        if (tab) tab.click();
      };
      btn.disabled = false;
    } else {
      btn.disabled = true;
    }
    cont.appendChild(btn);
  }

  function renderActionButtons() {
    if (els.nodesAction) {
      els.nodesAction.innerHTML = "";
      const b = document.createElement("button");
      b.className = "btn";
      b.textContent = "Settings";
      b.onclick = function () {
        const tab = document.querySelector<HTMLButtonElement>('.nav button[data-tab="settings"]');
        if (tab) tab.click();
      };
      els.nodesAction.appendChild(b);
    }
    if (els.feeAction) {
      els.feeAction.innerHTML = "";
      const b = document.createElement("button");
      b.className = "btn";
      b.textContent = "Scanner ›";
      b.onclick = function () {
        const tab = document.querySelector<HTMLButtonElement>('.nav button[data-tab="scanner"]');
        if (tab) tab.click();
      };
      els.feeAction.appendChild(b);
    }
  }

  function renderFromCache(beacon: string, rpc: string, id: string) {
    try {
      const vKey = "val|" + beacon + "|" + id;
      const vRes = caches.get<any>(vKey);
      if (vRes) {
        const d = vRes?.data;
        const val = d?.validator ?? d?.data?.validator ?? {};
        const idx = d?.index ?? d?.data?.index ?? null;
        const wcRaw = String(val?.withdrawal_credentials || "");
        const wc = parseWc(wcRaw);

        if (idx != null) setHtml(els.valIndex, '<span class="violet mono">' + String(idx) + "</span>");
        else setText(els.valIndex, "—");

        setText(els.valStatus, String(d?.status ?? "—"));
        setText(els.valSlashed, String(val?.slashed ?? "—"));
        setText(els.valPub, String(val?.pubkey ?? "—"));

        const effGweiStr = String(val?.effective_balance ?? "");
        if (effGweiStr) {
          setHtml(els.valEffGwei, effGweiStr + ' <span class="gwei">gwei</span>');
          try {
            const eth = trimDecimals(gweiToEth(BigInt(effGweiStr || "0")), 6);
            setHtml(els.valEffEth, String(eth) + ' <span class="eth">ETH</span>');
          } catch { setText(els.valEffEth, "—"); }
        } else {
          setText(els.valEffGwei, "—");
          setText(els.valEffEth, "—");
        }

        setText(els.valAct, String(val?.activation_epoch ?? "—"));
        setText(els.valExitWdr, String(val?.exit_epoch ?? "—") + " / " + String(val?.withdrawable_epoch ?? "—"));

        setText(els.wcType, wc.kind === "unknown" ? "unknown" : wc.kind);
        setText(els.wcAddr, wc.address || "—");
        renderWcAction(wc.kind);

        if (rpc && wc.address) {
          const bal = caches.get<any>("el|" + rpc + "|" + wc.address.toLowerCase());
          if (bal?.wei != null) {
            const wei: bigint = BigInt(bal.wei);
            setText(els.elAddr, wc.address);
            setHtml(els.elEth, trimDecimals(formatUnits(wei, 18), 6) + ' <span class="eth">ETH</span>');
            setHtml(els.elWei, wei.toString() + ' <span class="wei">wei</span>');
          }
        }
      }

      const hKey = "head|" + beacon;
      const head = caches.get<any>(hKey);
      if (head) {
        const headSlot = Number(head?.data?.header?.message?.slot ?? head?.data?.slot ?? head?.slot ?? 0) || null;
        setText(els.beaconHead, headSlot != null ? "#" + String(headSlot) : "—");
      }

      const rKey = "rpc|" + rpc;
      const rInf = caches.get<any>(rKey);
      if (rInf?.ok) {
        const okChain = rInf.chainId === expectedChainId();
        setText(els.rpcInfo, "chainId " + String(rInf.chainId) + " • block " + String(rInf.blockNumber) + (rInf.client ? " • " + String(rInf.client) : ""));
        if (els.health) {
          els.health.innerHTML = okChain ? '<span class="ok-badge">RPC OK</span>' : '<span class="warn-badge">RPC ≠ expected network</span>';
        }
      }

      const fKey = "fee|" + rpc;
      const fee = caches.get<any>(fKey);
      if (fee?.feeWei != null) {
        const fw = BigInt(fee.feeWei);
        setHtml(els.feeWei, fw.toString() + ' <span class="wei">wei</span>');
        setHtml(els.feeGwei, trimDecimals(formatUnits(fw, 9), 9) + ' <span class="gwei">gwei</span>');
        setHtml(els.feeEth, trimDecimals(formatUnits(fw, 18), 9) + ' <span class="eth">ETH</span>');
      }

      renderActionButtons();
    } catch {}
  }

  async function refresh() {
    const beacon = getInputValue("beaconUrl");
    const rpc = getInputValue("rpcUrl");
    const id = (els.id.value || "").trim();
    if (!beacon || !id) return;

    renderFromCache(beacon, rpc, id);

    if (isRefreshing) return;
    const since = now() - lastNetRefreshAt;
    if (since < HARD_MIN_INTERVAL) {
      setTimeout(function () { if (!isRefreshing) { void refresh(); } }, HARD_MIN_INTERVAL - since + 10);
      return;
    }

    isRefreshing = true;
    lastNetRefreshAt = now();
    setBtnLoading(true);
    setCardsLoading(true);

    try {
      let vRes: any = null;
      try { vRes = await getValidatorCached(beacon, id); }
      catch (e) { console.warn("[dashboard] validator error:", friendlyError(e)); }

      const headRes = await getHeadCached(beacon).catch(function () { return null; });

      let rpcLabel = "—";
      let healthLabel = "—";
      try {
        if (rpc) {
          const info = await getRpcInfoCached(rpc);
          if (info?.ok) {
            const okChain = info.chainId === expectedChainId();
            rpcLabel = "chainId " + String(info.chainId) + " • block " + String(info.blockNumber) + (info.client ? " • " + String(info.client) : "");
            healthLabel = okChain ? '<span class="ok-badge">RPC OK</span>' : '<span class="warn-badge">RPC ≠ expected network</span>';
          }
        }
      } catch {
        rpcLabel = "RPC error";
        healthLabel = '<span class="danger-badge">RPC error</span>';
      }

      let feeWei: bigint | null = null;
      if (rpc) {
        try {
          const fee = await getFeeCached(rpc);
          feeWei = fee?.feeWei ?? null;
        } catch {}
      }

      if (vRes) {
        const d = vRes?.data;
        const val = d?.validator ?? d?.data?.validator ?? {};
        const idx = d?.index ?? d?.data?.index ?? null;
        const wcRaw = String(val?.withdrawal_credentials || "");
        const wc = parseWc(wcRaw);

        if (idx != null) setHtml(els.valIndex, '<span class="violet mono">' + String(idx) + "</span>");
        else setText(els.valIndex, "—");

        setText(els.valStatus, String(d?.status ?? "—"));
        setText(els.valSlashed, String(val?.slashed ?? "—"));
        setText(els.valPub, String(val?.pubkey ?? "—"));

        const effGweiStr = String(val?.effective_balance ?? "");
        if (effGweiStr) {
          setHtml(els.valEffGwei, `${effGweiStr} <span class="gwei">gwei</span>`);
          try {
            const eth = trimDecimals(gweiToEth(BigInt(effGweiStr || "0")), 6);
            setHtml(els.valEffEth, String(eth) + ' <span class="eth">ETH</span>');
          } catch { setText(els.valEffEth, "—"); }
        } else {
          setText(els.valEffGwei, "—");
          setText(els.valEffEth, "—");
        }

        setText(els.valAct, String(val?.activation_epoch ?? "—"));
        setText(els.valExitWdr, String(val?.exit_epoch ?? "—") + " / " + String(val?.withdrawable_epoch ?? "—"));

        setText(els.wcType, wc.kind === "unknown" ? "unknown" : wc.kind);
        setText(els.wcAddr, wc.address || "—");

        if (rpc && wc.address) {
          try {
            const bal = await getElBalanceCached(rpc, wc.address);
            const wei: bigint = bal?.wei ?? 0n;
            setText(els.elAddr, wc.address);
            setHtml(els.elEth, trimDecimals(formatUnits(wei, 18), 6) + ' <span class="eth">ETH</span>');
            setHtml(els.elWei, wei.toString() + ' <span class="wei">wei</span>');
          } catch {}
        }

        renderWcAction(wc.kind);
      }

      const headSlot = headRes
        ? Number(headRes?.data?.header?.message?.slot ?? headRes?.data?.slot ?? headRes?.slot ?? 0) || null
        : null;
      setText(els.beaconHead, headSlot != null ? "#" + String(headSlot) : "—");
      setText(els.rpcInfo, rpcLabel);
      if (els.health) els.health.innerHTML = healthLabel;

      if (feeWei != null) {
        setHtml(els.feeWei, feeWei.toString() + ' <span class="wei">wei</span>');
        setHtml(els.feeGwei, trimDecimals(formatUnits(feeWei, 9), 9) + ' <span class="gwei">gwei</span>');
        setHtml(els.feeEth, trimDecimals(formatUnits(feeWei, 18), 9) + ' <span class="eth">ETH</span>');
      }

      renderActionButtons();
    } finally {
      setBtnLoading(false);
      setCardsLoading(false);
      isRefreshing = false;
    }
  }

  async function resolveProfileId() {
    try {
      const cache = (globalThis as any).__VT_PROFILE || null;
      if (cache && (cache.pubkey || cache.index != null)) {
        els.id.value = cache.pubkey ? String(cache.pubkey) : String(cache.index);
      } else if (api?.profileGet) {
        const p = await api.profileGet();
        if (p?.pubkey) els.id.value = p.pubkey;
        else if (p?.index != null) els.id.value = String(p.index);
      }
    } catch {}
    try {
      els.id.readOnly = true;
      els.id.addEventListener("keydown", function (e) { e.preventDefault(); });
      els.id.addEventListener("paste", function (e) { e.preventDefault(); });
      els.id.addEventListener("drop", function (e) { e.preventDefault(); });
      els.id.addEventListener("beforeinput", function (e) { e.preventDefault(); });
      els.id.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    } catch {}
  }

  document.addEventListener("vt:profile", (ev: any) => {
    try {
      const p = ev && ev.detail ? ev.detail : (globalThis as any).__VT_PROFILE || null;
      if (!p) return;
      if (p.pubkey) els.id.value = String(p.pubkey);
      else if (p.index != null) els.id.value = String(p.index);
      void refresh();
    } catch {}
  });

  els.refresh.addEventListener("click", function () { void refresh(); });

  ensureCooldownTicker();
  resolveProfileId().then(function () { void refresh(); });
}

function boot() {
  const host = document.getElementById("dashboardRoot");
  if (host) mount(host as HTMLElement);
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true } as AddEventListenerOptions);
} else {
  boot();
}
