export {};

type ExitState = {
  beacon: string;
  validatorId: string;
  withdrawalAddress: string;
  payoutTsSec: number;
  lastHeadSlot?: number;
  lastUpdated?: number;
};

const STATE_KEY = "vt.exitTracker.state.v2";

function H<T extends HTMLElement = HTMLElement>(id: string){ return document.getElementById(id) as T | null }
function V(id: string){ const el = H<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(id); return (el?.value ?? "").trim() }
function S(id: string, val: string){ const el = H<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(id); if (el) el.value = val }
function pad2(n: number){ return n < 10 ? "0" + n : String(n) }
function fmtDate(ts: number){ const d = new Date(ts * 1000); return d.toISOString().replace("T", " ").replace(".000Z", " UTC") }
function fmtDelta(ms: number){ const neg = ms < 0; const t = Math.abs(ms); const s = Math.floor(t / 1000); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60; return `${neg ? "-" : ""}${pad2(h)}:${pad2(m)}:${pad2(sec)}` }
function hexToAddr(wc: string){ if (!wc || wc.length < 66) return ""; const body = wc.slice(26, 66); return "0x" + body.toLowerCase() }
function formatEth(wei: bigint){ const s = wei.toString(); const pad = s.length <= 18 ? "0".repeat(18 - s.length) + s : s; const i = pad.slice(0, pad.length - 18).replace(/^0+(?=\d)/, ""); const f = pad.slice(-18).replace(/0+$/, ""); return f ? `${i}.${f}` : i }

async function beaconFetch(base: string, path: string){ const r = await fetch(base.replace(/\/+$/, "") + path, { method: "GET" }); if (!r.ok) throw new Error(`Beacon ${r.status}`); return await r.json() }
async function getGenesis(base: string){ const j = await beaconFetch(base, "/eth/v1/beacon/genesis"); const t = Number(j?.data?.genesis_time ?? j?.genesis_time ?? 0); return { genesisTime: t } }
async function getHeader(base: string){ const j = await beaconFetch(base, "/eth/v1/beacon/headers/head"); const d = j?.data || j; const slot = Number(d?.header?.message?.slot ?? d?.slot ?? 0); return { slot } }
async function getValidator(base: string, id: string){ const r = await beaconFetch(base, `/eth/v1/beacon/states/head/validators/${encodeURIComponent(id)}`); const d = r?.data || r; const v = d?.validator || d; const status = String(d?.status || v?.status || ""); const index = String(d?.index || v?.index || ""); const exit_epoch = Number(v?.exit_epoch ?? v?.exitEpoch ?? 0); const withdrawable_epoch = Number(v?.withdrawable_epoch ?? v?.withdrawableEpoch ?? 0); const wc = String(v?.withdrawal_credentials ?? v?.withdrawalCredentials ?? ""); return { status, index, exit_epoch, withdrawable_epoch, wc } }
function epochToTs(genesis: number, epoch: number){ const SLOT_SEC = 12, EPOCH_SLOTS = 32; return genesis + epoch * EPOCH_SLOTS * SLOT_SEC }
function slotToEpoch(slot: number){ return Math.floor(slot / 32) }
async function rpcGetBalance(url: string, addr: string){ const r = await fetch(V("rpcUrl") || url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [addr, "latest"] }) }); const j = await r.json(); if (j?.error) throw new Error(j.error.message || "RPC error"); return BigInt(j.result) }

const UI = {
  error(msg: string, details?: string, title?: string){ const w = window as any; if (w && typeof w.showErrorModal === "function") w.showErrorModal(msg, details, title); else alert((title? title + "\n\n" : "") + msg + (details? "\n\n" + details : "")) },
  notify(err: any, ctx?: string){ const w = window as any; if (w && typeof w.notifyError === "function") w.notifyError(err, ctx); else UI.error(ctx ? `${ctx} — error` : "Error", String(err && (err.message || err))) },
  setLoading(on: boolean, label?: string){ const w = window as any; if (w && typeof w.setLoading === "function") w.setLoading(on, label) }
};

let liveTimer: any = null;
let countdownTimer: any = null;

function loadState(): ExitState | null{
  try{
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw);
    const s: ExitState = {
      beacon: String(j?.beacon || ""),
      validatorId: String(j?.validatorId || ""),
      withdrawalAddress: String(j?.withdrawalAddress || ""),
      payoutTsSec: Number(j?.payoutTsSec || 0),
      lastHeadSlot: j?.lastHeadSlot != null ? Number(j.lastHeadSlot) : undefined,
      lastUpdated: j?.lastUpdated != null ? Number(j.lastUpdated) : undefined
    };
    return s;
  }catch{ return null }
}
function saveState(s: ExitState){
  try{ localStorage.setItem(STATE_KEY, JSON.stringify(s)); }catch{}
}
function mergeState(patch: Partial<ExitState>){
  const cur = loadState() || { beacon: "", validatorId: "", withdrawalAddress: "", payoutTsSec: 0 } as ExitState;
  const next: ExitState = { ...cur, ...patch, lastUpdated: Date.now() };
  saveState(next);
  return next;
}

function startCountdown(tsSec: number){
  if (countdownTimer){ clearInterval(countdownTimer); countdownTimer = null }
  const el = H("etCountdown"); if (!el) return;
  const tick = () => { if (!tsSec){ el.textContent = "—"; return } const ms = tsSec * 1000 - Date.now(); el.textContent = ms > 0 ? fmtDelta(ms) : "Eligible" };
  tick();
  countdownTimer = setInterval(tick, 1000);
}

async function trackOnce(){
  const base = V("etBeacon") || V("beaconUrl");
  const idRaw = V("etVal");
  if (!base){ UI.error("Beacon URL is required", "Fill the 'Beacon API base URL' field at the top or in Exit Tracker."); throw new Error("Beacon URL required") }
  if (!idRaw){ UI.error("Validator ID is required", "Enter validator index (digits) or BLS pubkey (0x + 96 hex)."); throw new Error("Validator ID required") }
  const id = (/^0x[0-9a-fA-F]{96}$/.test(idRaw) || /^\d+$/.test(idRaw)) ? idRaw : "";
  if (!id){ UI.error("Validator ID format invalid", "Use index (e.g. 123456) or 0x + 96 hex pubkey."); throw new Error("Validator ID format invalid") }

  UI.setLoading(true, "Exit Tracker › Fetch");
  try{
    const genesis = await getGenesis(base);
    const head = await getHeader(base);
    const vinfo = await getValidator(base, id);

    const wdInput = H<HTMLInputElement>("etWd");
    const autoAddr = vinfo.wc && vinfo.wc.startsWith("0x01") ? hexToAddr(vinfo.wc) : "";
    const wdAddr = (wdInput?.value?.trim()) || autoAddr;
    if (wdInput && !wdInput.value && wdAddr) wdInput.value = wdAddr;

    const headCell = H("etHead"); if (headCell) headCell.textContent = `#${head.slot} (e${slotToEpoch(head.slot)})`;
    const statusCell = H("etSt"); if (statusCell) statusCell.textContent = vinfo.status || "—";
    const exitCell = H("etExit"); if (exitCell) exitCell.textContent = vinfo.exit_epoch > 0 ? String(vinfo.exit_epoch) : "—";
    const wdEpochCell = H("etWdEpoch"); if (wdEpochCell) wdEpochCell.textContent = vinfo.withdrawable_epoch > 0 ? String(vinfo.withdrawable_epoch) : "—";

    const earliestTs = vinfo.withdrawable_epoch > 0 ? epochToTs(genesis.genesisTime, vinfo.withdrawable_epoch) : 0;
    const earliestCell = H("etEarliest"); if (earliestCell) earliestCell.textContent = earliestTs ? fmtDate(earliestTs) : "—";
    const addrCell = H("etAddr"); if (addrCell) addrCell.textContent = wdAddr || "—";

    mergeState({ beacon: base, validatorId: id, withdrawalAddress: wdAddr, payoutTsSec: earliestTs, lastHeadSlot: head.slot });
    startCountdown(earliestTs);
  }catch(e: any){
    UI.notify(e, "Exit Tracker › Fetch");
    throw e;
  }finally{
    UI.setLoading(false);
  }
}

async function refreshBalance(){
  const addr = V("etWd") || "";
  if (!addr || !/^0x[0-9a-fA-F]{40}$/.test(addr)){ UI.error("Withdrawal address required", "Enter a valid 0x + 40 hex address in 'Withdrawal address'."); throw new Error("Withdrawal address required") }
  const rpc = V("rpcUrl") || "";
  if (!rpc){ UI.error("Execution RPC URL required", "Fill 'Execution RPC URL' in the top node panel."); throw new Error("Execution RPC URL required") }
  try{
    const bal = await rpcGetBalance(rpc, addr);
    const balCell = H("etBal"); if (balCell) balCell.textContent = `${formatEth(bal)} ETH`;
    const key = "vt.exitTracker.bal." + addr.toLowerCase();
    const prevRaw = localStorage.getItem(key);
    const prevWei = prevRaw ? BigInt(prevRaw) : 0n;
    if (bal > prevWei){
      const delta = bal - prevWei;
      const lastCred = H("etLastCred"); if (lastCred) lastCred.textContent = `+${formatEth(delta)} ETH at ${new Date().toISOString()}`;
      if (delta >= 31n * 10n**18n) { const w = window as any; if (w && typeof w.showSuccessModal === "function") w.showSuccessModal(`Received ~${formatEth(delta)} ETH to withdrawal address`, "Payout detected", 1800) }
    }
    localStorage.setItem(key, bal.toString());
  }catch(e:any){
    UI.notify(e, "Exit Tracker › Balance");
    throw e;
  }
}

function hydrateFromState(){
  const st = loadState();
  if (!st) return;
  if (st.beacon) S("etBeacon", st.beacon);
  if (st.validatorId) S("etVal", st.validatorId);
  if (st.withdrawalAddress) S("etWd", st.withdrawalAddress);
  const earliestCell = H("etEarliest");
  if (st.payoutTsSec && st.payoutTsSec > 0){
    if (earliestCell) earliestCell.textContent = fmtDate(st.payoutTsSec);
    startCountdown(st.payoutTsSec);
  }
  const headCell = H("etHead");
  if (st.lastHeadSlot != null && headCell){
    headCell.textContent = `#${st.lastHeadSlot} (e${slotToEpoch(st.lastHeadSlot)})`;
  }
  const addrCell = H("etAddr"); if (addrCell && st.withdrawalAddress) addrCell.textContent = st.withdrawalAddress;
}

function mount(root: HTMLElement){
  root.innerHTML = `
    <div class="band" style="margin-bottom:10px;">
      <div class="muted">Track exit → withdrawable epoch and countdown to the ~32 ETH payout, watch the withdrawal address balance.</div>
    </div>

    <div class="row-3">
      <div>
        <label>Beacon API base URL</label>
        <div class="input-wrap"><input id="etBeacon" placeholder="http://127.0.0.1:5052"/></div>
      </div>
      <div>
        <label>Validator ID (index or 0xpubkey)</label>
        <div class="input-wrap"><input id="etVal" placeholder="123456 or 0x..."/></div>
      </div>
      <div>
        <label>Withdrawal address</label>
        <div class="input-wrap"><input id="etWd" placeholder="auto"/></div>
      </div>
    </div>

    <div class="btns" style="margin-top:10px;">
      <button class="btn" id="etTrack" type="button">Track</button>
      <button class="btn ghost" id="etLive" type="button">Start live</button>
      <span id="etStatus" class="muted" style="margin-left:auto;">Idle</span>
    </div>

    <div class="grid" style="grid-template-columns:1fr 1fr; gap:16px; margin-top:10px;">
      <div class="box">
        <div class="subtitle">Timeline</div>
        <table class="table" id="etTimelineTable">
          <thead>
            <tr>
              <th>Head</th>
              <th>Status</th>
              <th>Exit epoch</th>
              <th>Withdrawable epoch</th>
              <th>Earliest payout</th>
              <th>Countdown</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td id="etHead">—</td>
              <td id="etSt">—</td>
              <td id="etExit">—</td>
              <td id="etWdEpoch">—</td>
              <td id="etEarliest">—</td>
              <td id="etCountdown">—</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="box">
        <div class="subtitle">Credit Watch</div>
        <table class="table" id="etCreditTable">
          <thead>
            <tr>
              <th>Withdrawal address</th>
              <th>Last balance</th>
              <th>Last credit</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td id="etAddr">—</td>
              <td id="etBal">—</td>
              <td id="etLastCred">—</td>
            </tr>
          </tbody>
        </table>
        <div class="btns" style="margin-top:10px;">
          <button class="btn ghost" id="etCheckBal" type="button">Refresh balance</button>
        </div>
      </div>
    </div>
  `;

  const headerBeacon = H<HTMLInputElement>("beaconUrl");
  if (headerBeacon && !V("etBeacon")) S("etBeacon", headerBeacon.value);

  hydrateFromState();

  H("etTrack")?.addEventListener("click",()=>{ trackOnce().then(()=>{ const st=H("etStatus"); if(st) st.textContent="OK" }).catch(()=>{}) });
  H("etCheckBal")?.addEventListener("click",()=>{ refreshBalance().then(()=>{ const st=H("etStatus"); if(st) st.textContent="Balance updated" }).catch(()=>{}) });
  H("etLive")?.addEventListener("click",()=>{ const btn=H<HTMLButtonElement>("etLive"); if(liveTimer){ clearInterval(liveTimer); liveTimer=null; if(btn) btn.textContent="Start live"; const st=H("etStatus"); if(st) st.textContent="Live stopped"; return } if(btn) btn.textContent="Stop live"; const loop=async()=>{ try{ await trackOnce(); await refreshBalance(); const st=H("etStatus"); if(st) st.textContent="Live" }catch(e:any){ const st=H("etStatus"); if(st) st.textContent=String(e?.message||e) } }; loop(); liveTimer=setInterval(loop,8000) });
}

function boot(){ const host=H("exitRoot"); if(host) mount(host) }
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot, {once:true} as AddEventListenerOptions); else boot();
