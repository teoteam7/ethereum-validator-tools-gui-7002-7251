export {};

type Rule = { id: string; label: string; address: string; percent: number; kind: "operational"|"savings"|"fee"|"custom" };
type Webhook = { id: string; url: string; secretHeader?: string; enabled: boolean };
type GasMode = "auto"|"manual";
type SignerMode = "rpc-unlocked"|"webhook-signer";
type PayoutConfig = {
  fromAddress: string;
  rpcUrl: string;
  minThresholdWei: string;
  gasMode: GasMode;
  maxFeePerGasGwei?: number;
  maxPriorityFeePerGasGwei?: number;
  confirmations: number;
  signerMode: SignerMode;
  signerWebhookUrl?: string;
  signerWebhookAuth?: string;
  pollMs: number;
  rules: Rule[];
  webhooks: Webhook[];
  enabled: boolean;
};
type PayoutState = { lastProcessedBalanceWei: string; lastProcessedBlock?: string; running: boolean; lastRunAt?: number };

const STORE_KEY = "vt.payoutRules.v1";
const STATE_PREFIX = "vt.payoutRules.state.";

function H<T extends HTMLElement=HTMLElement>(id: string){ return document.getElementById(id) as T | null }
function asInput<T extends HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>(el: HTMLElement|null){ if(!el) return null as any; const t=el.tagName.toLowerCase(); return (t==="input"||t==="textarea"||t==="select")? el as any as T : null as any }
function v(id: string){ const el=asInput<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>(H(id)); return (el?.value??"").trim() }
function s(id: string, val: string){ const el=asInput<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>(H(id)); if(el) el.value = val }

function nowShort(){ const d=new Date(); const p=(n:number,w=2)=>String(n).padStart(w,"0"); return `${p(d.getDate())}.${p(d.getMonth()+1)} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(),3)}` }
function rndId(p="id"){ return p+Math.random().toString(36).slice(2) }
function hex(b: bigint){ return "0x"+b.toString(16) }
function weiFromEth(x: string){ const [a,b=""]=String(x||"0").split("."); const pad=(b+"000000000000000000").slice(0,18); return BigInt(a||"0")*10n**18n + BigInt(pad||"0") }
function ethFromWei(w: bigint){ const s=w.toString(); const pad=s.length<=18? "0".repeat(18-s.length)+s : s; const i=pad.slice(0,pad.length-18).replace(/^0+(?=\d)/,""); const f=pad.slice(-18).replace(/0+$/,""); return f? `${i}.${f}`:i }
function fromGwei(n?: number){ if(n==null) return undefined; return BigInt(Math.round(n))*10n**9n }
function stateKey(addr: string){ return STATE_PREFIX+(addr||"__").toLowerCase() }
function persisted<T>(k:string, def:T){ try{ const raw=localStorage.getItem(k); if(!raw) return def; return JSON.parse(raw) as T }catch{ return def } }
function persist<T>(k:string, val:T){ try{ localStorage.setItem(k, JSON.stringify(val)) }catch{} }

const UI = {
  error(msg: string, details?: string, title?: string){ const w=window as any; if(w && typeof w.showErrorModal==="function") w.showErrorModal(msg, details, title); else alert((title? title+"\n\n": "")+msg+(details? "\n\n"+details:"")) },
  notify(err: any, ctx?: string){ const w=window as any; if(w && typeof w.notifyError==="function") w.notifyError(err, ctx); else UI.error(ctx? `${ctx} — error`: "Error", String(err && (err.message || err))) },
  success(html: string, title?: string, ms?: number){ const w=window as any; if(w && typeof w.showSuccessModal==="function") w.showSuccessModal(html, title, ms) },
  setLoading(on:boolean,label?:string){ const w=window as any; if(w && typeof w.setLoading==="function") w.setLoading(on,label) },
  confirm(title:string, html:string){ const w=window as any; if(w && typeof w.confirmModal==="function") return w.confirmModal(title, html); return Promise.resolve(true) }
};

async function rpc(url:string, method:string, params:any[]=[]){ const r=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})}); const j=await r.json(); if(j?.error) throw new Error(j.error?.message||"RPC error"); return {result:j.result} }
async function rpcChainId(url:string){ const {result}=await rpc(url,"eth_chainId"); return Number(result) }
async function rpcBlockNumber(url:string){ const {result}=await rpc(url,"eth_blockNumber"); return BigInt(result) }
async function rpcGetBalance(url:string, addr:string){ const {result}=await rpc(url,"eth_getBalance",[addr,"latest"]); return BigInt(result) }
async function rpcGetNonce(url:string, addr:string){ const {result}=await rpc(url,"eth_getTransactionCount",[addr,"pending"]); return Number(result) }
async function rpcEstimateGas(url:string, tx:any){ const {result}=await rpc(url,"eth_estimateGas",[tx]); return BigInt(result) }
async function rpcSendTx(url:string, tx:any){ const {result}=await rpc(url,"eth_sendTransaction",[tx]); return String(result) }
async function rpcSendRaw(url:string, raw:string){ const {result}=await rpc(url,"eth_sendRawTransaction",[raw]); return String(result) }
async function rpcMaxPriority(url:string){ try{ const {result}=await rpc(url,"eth_maxPriorityFeePerGas"); return BigInt(result) }catch{ return null } }
async function rpcFeeHistory(url:string){ try{ const {result}=await rpc(url,"eth_feeHistory",[1,"latest",[50]]); const base=result?.baseFeePerGas?.[0]; return base? BigInt(base):null }catch{ return null } }
async function rpcGasPrice(url:string){ try{ const {result}=await rpc(url,"eth_gasPrice"); return BigInt(result) }catch{ return null } }

let out: HTMLPreElement|null=null, logBuf:string[]=[];
function attachOut(){ out = H<HTMLPreElement>("payoutOut") }
function renderOut(){ if(!out) return; out.textContent = logBuf.join("\n"); out.scrollTop = out.scrollHeight }
function log(line:string){ logBuf.push(`[${nowShort()}] ${line}`); if(logBuf.length>4000) logBuf=logBuf.slice(-2500); renderOut() }

function injectCompactStyles(){
  if (document.getElementById("payoutCompactStyles")) return;
  const css = `
    #tab-payout{ padding-left:8px; padding-right:8px; }
    @media (max-width: 1200px){ #tab-payout{ padding-left:10px; padding-right:10px; } }
    #tab-payout .row-3{ grid-template-columns: 1fr 1fr !important; }
    #tab-payout .row-1{ display:grid; grid-template-columns: 1fr; gap: var(--gap); }
    #tab-payout .input-wrap input, #tab-payout .input-wrap select{ padding: 8px 10px; font-size: 12px; }
    #tab-payout .btn{ padding: 8px 10px; }
    #tab-payout table.table{ font-size: 12px; table-layout: fixed; }
    #tab-payout #prRulesTbl thead th:last-child, 
    #tab-payout #prRulesTbl tbody td:last-child{ width: 84px !important; }
    #tab-payout #prRulesTbl tbody td:last-child{ text-align: right; }
    #tab-payout .btn-del{ padding:6px 8px; font-size:11px; width:100%; line-height:1.2; }
    #tab-payout .table-wrap{ max-height: 300px; overflow:auto; }
    #tab-payout .subtitle{ font-size: 13px; letter-spacing:.2px; }
    #payoutConsoleWrap{ margin-top:12px; }
    #payoutConsoleWrap summary{ cursor:pointer; font-weight:900; font-size:12px; letter-spacing:.2px; }
    #payoutConsoleWrap pre{ background:#000; border:1px solid #222; padding:10px; max-height:260px; overflow:auto; margin:6px 0 0 0; }
    #payoutConsoleWrap .toolbar{ display:flex; gap:8px; justify-content:flex-end; margin-top:6px; }
    #tab-payout .band{ padding:8px 10px; }
  `;
  const s = document.createElement("style");
  s.id = "payoutCompactStyles";
  s.textContent = css;
  document.head.appendChild(s);
}

function loadConfig(): PayoutConfig{
  const def:PayoutConfig = { fromAddress:"", rpcUrl: v("rpcUrl") || "", minThresholdWei: hex(weiFromEth("0.01")), gasMode:"auto", confirmations:1, signerMode:"rpc-unlocked", pollMs:15000, rules:[], webhooks:[], enabled:false };
  const cfg = persisted<PayoutConfig>(STORE_KEY, def);
  cfg.rules = (cfg.rules||[]).filter(r=>r && r.address);
  cfg.webhooks = (cfg.webhooks||[]).filter(h=>h && h.url);
  return cfg;
}
function saveConfig(cfg:PayoutConfig){ persist(STORE_KEY,cfg) }

function loadState(addr:string): PayoutState { const def:PayoutState={lastProcessedBalanceWei:"0x0",running:false}; return persisted<PayoutState>(stateKey(addr), def) }
function saveState(addr:string, st:PayoutState){ persist(stateKey(addr), st) }

function planAmounts(totalWei: bigint, rules: Rule[]){ const out:{to:string;value:bigint;ruleId:string}[]=[]; let acc=0n; for(let i=0;i<rules.length;i++){ const r=rules[i]; const v= i===rules.length-1 ? (totalWei-acc) : (totalWei*BigInt(Math.round(r.percent*100))/10000n); acc+=v; out.push({to:r.address,value:v,ruleId:r.id}); } return out }

async function resolveFees(cfg:PayoutConfig, rpcUrl:string){ if(cfg.gasMode==="manual"){ return { maxFeePerGas: fromGwei(cfg.maxFeePerGasGwei!), maxPriorityFeePerGas: fromGwei(cfg.maxPriorityFeePerGasGwei!) } } const [base,prio,gasP]=await Promise.all([rpcFeeHistory(rpcUrl),rpcMaxPriority(rpcUrl),rpcGasPrice(rpcUrl)]); let maxPriority = prio ?? (gasP? (gasP/10n) : 2n*10n**9n); if(maxPriority<1n*10n**9n) maxPriority=1n*10n**9n; let maxFee = base ? (base*2n + maxPriority) : (gasP? gasP : 20n*10n**9n); return { maxFeePerGas:maxFee, maxPriorityFeePerGas:maxPriority } }

async function waitReceipt(rpcUrl:string, hash:string, confs:number){ for(;;){ const {result}=await rpc(rpcUrl,"eth_getTransactionReceipt",[hash]); if(result && result.blockNumber){ const cur=await rpcBlockNumber(rpcUrl); const bn=BigInt(result.blockNumber); if(cur>=bn+BigInt(confs)) return result; } await new Promise(r=>setTimeout(r,2200)); } }

async function doSendRpcUnlocked(cfg:PayoutConfig, from:string, rpcUrl:string, items:{to:string;value:bigint}[], fees:{maxFeePerGas?:bigint|null;maxPriorityFeePerGas?:bigint|null}){ let nonce=await rpcGetNonce(rpcUrl,from); const hashes:string[]=[]; for(const it of items){ const base:any={from,to:it.to,value:hex(it.value)}; const gas=await rpcEstimateGas(rpcUrl,{...base,data:"0x"}).catch(()=>21000n); const tx:any={...base,gas:hex(gas),nonce:"0x"+nonce.toString(16),type:"0x2"}; if(fees.maxFeePerGas) tx.maxFeePerGas=hex(fees.maxFeePerGas); if(fees.maxPriorityFeePerGas) tx.maxPriorityFeePerGas=hex(fees.maxPriorityFeePerGas); const h=await rpcSendTx(rpcUrl,tx); hashes.push(h); nonce++ } if((cfg.confirmations||0)>0){ for(const h of hashes){ await waitReceipt(rpcUrl,h,cfg.confirmations||0) } } return hashes }

async function doSendWebhookSigner(cfg:PayoutConfig, from:string, rpcUrl:string, items:{to:string;value:bigint}[], fees:{maxFeePerGas?:bigint|null;maxPriorityFeePerGas?:bigint|null}){ const chainId=await rpcChainId(rpcUrl); let nonce=await rpcGetNonce(rpcUrl,from); const txs=items.map(it=>({chainId,from,to:it.to,value:hex(it.value),data:"0x",nonce:nonce++,maxFeePerGas:fees.maxFeePerGas?hex(fees.maxFeePerGas):undefined,maxPriorityFeePerGas:fees.maxPriorityFeePerGas?hex(fees.maxPriorityFeePerGas):undefined})); const headers:any={"content-type":"application/json"}; if(cfg.signerWebhookAuth && cfg.signerWebhookAuth.includes(":")){ const i=cfg.signerWebhookAuth.indexOf(":"); headers[cfg.signerWebhookAuth.slice(0,i).trim()]=cfg.signerWebhookAuth.slice(i+1).trim() } const r=await fetch(String(cfg.signerWebhookUrl),{method:"POST",headers,body:JSON.stringify({action:"sign-and-send-batch",txs})}); const j=await r.json(); const hashes:string[]=[]; if(Array.isArray(j?.txHashes)&&j.txHashes.length){ hashes.push(...j.txHashes.map((x:any)=>String(x))) } else if(Array.isArray(j?.signedRawTransactions)){ for(const raw of j.signedRawTransactions){ const h=await rpcSendRaw(rpcUrl,String(raw)); hashes.push(h) } } else { throw new Error("Webhook signer response missing txHashes or signedRawTransactions") } if((cfg.confirmations||0)>0){ for(const h of hashes){ await waitReceipt(rpcUrl,h,cfg.confirmations||0) } } return hashes }

async function fireHooks(cfg:PayoutConfig, type:string, payload:any){ const hooks=(cfg.webhooks||[]).filter(h=>h.enabled); await Promise.all(hooks.map(async h=>{ try{ const headers:any={"content-type":"application/json"}; if(h.secretHeader && h.secretHeader.includes(":")){ const i=h.secretHeader.indexOf(":"); headers[h.secretHeader.slice(0,i).trim()]=h.secretHeader.slice(i+1).trim() } await fetch(h.url,{method:"POST",headers,body:JSON.stringify({type,ts:Date.now(),payload})}) }catch{} })) }

function updateActionsEnabled(total:number, count:number){
  const ok = count>0 && Math.abs(total-100) <= 0.0001;
  const runBtn = H<HTMLButtonElement>("prRun"); if(runBtn) runBtn.disabled = !ok;
  const startBtn = H<HTMLButtonElement>("prToggle"); if(startBtn) startBtn.disabled = !ok;
  const totEl = H("prTotalPct");
  if(totEl){ totEl.textContent = `Total: ${total.toFixed(2)}%`; (totEl.style as any).color = ok ? "" : "var(--danger)" }
}

function collectConfig(opts?: { require100?: boolean }): PayoutConfig{
  const cfg=loadConfig();
  const rpc=v("prRpc")||cfg.rpcUrl;
  const from=v("prFrom")||cfg.fromAddress;
  const min=v("prMin")||"0";
  const conf=Number(v("prConf")||cfg.confirmations);
  const poll=Number(v("prPoll")||cfg.pollMs);
  const gm=(v("prGasMode") as GasMode)||"auto";
  const mf=v("prMaxFee"); const mp=v("prMaxPrio");
  const sm=(v("prSigner") as SignerMode)||"rpc-unlocked";
  const sUrl=v("prSignerUrl"); const sAuth=v("prSignerAuth");
  const rules:Rule[]=[]; document.querySelectorAll("#prRulesTbl tbody tr").forEach(tr=>{ const t=tr as HTMLElement; const ins=t.querySelectorAll("input"); const sel=t.querySelector("select") as HTMLSelectElement|null; const label=(ins[0] as HTMLInputElement).value.trim(); const address=(ins[1] as HTMLInputElement).value.trim(); const percent=Number((ins[2] as HTMLInputElement).value||"0"); const kind=(sel?.value as any)||"custom"; const id=t.dataset.id||rndId("rule"); if(address && percent>0) rules.push({id,label,address,percent,kind}) });
  const hooks:Webhook[]=[]; document.querySelectorAll("#prHooks .row-3").forEach(row=>{ const el=row as HTMLElement; const id=el.dataset.id||rndId("wh"); const url=(el.querySelector("input:nth-of-type(1)") as HTMLInputElement)?.value.trim()||""; const sh=(el.querySelector("input:nth-of-type(2)") as HTMLInputElement)?.value.trim()||""; const en=(el.querySelector("select") as HTMLSelectElement)?.value==="1"; if(url) hooks.push({id,url,secretHeader:sh,enabled:en}) });
  const tot=rules.reduce((a,b)=>a+Number(b.percent||0),0);
  updateActionsEnabled(tot, rules.length);
  if(opts?.require100 && rules.length>0 && Math.abs(tot-100)>0.0001) throw new Error("Rules total must be 100%");
  if(opts?.require100 && rules.length===0) throw new Error("Add at least one rule");
  return {...cfg,rpcUrl:rpc,fromAddress:from,minThresholdWei:hex(weiFromEth(min)),confirmations:Math.max(0,Math.floor(conf||0)),pollMs:Math.max(1000,Math.floor(poll||15000)),gasMode:gm,maxFeePerGasGwei:mf?Number(mf):undefined,maxPriorityFeePerGasGwei:mp?Number(mp):undefined,signerMode:sm,signerWebhookUrl:sUrl||undefined,signerWebhookAuth:sAuth||undefined,rules,webhooks:hooks}
}

function explainErrorForModal(e: any){
  const msg = String(e && e.message ? e.message : e || "");
  if (/Rules total must be 100%/.test(msg)){
    let total = 0;
    try{
      const c = collectConfig();
      total = c.rules.reduce((a,b)=>a+(b.percent||0),0);
    }catch{}
    return { short:"Rules total must be 100%", details:`Sum of Percent must be exactly 100.0%. Current total: ${total.toFixed ? total.toFixed(2) : String(total)}%. Edit the Percent column so the total reaches 100.00%. 'Run' and 'Start' are enabled only at 100%.` }
  }
  if (/Add at least one rule/.test(msg)) return { short:"No rules configured", details:"Add at least one destination via 'Add rule', set address and percent. Total must reach 100%." }
  if (/From address is required/.test(msg)) return { short:"From address required", details:"Fill the 'From address' field with a 0x + 40 hex address that holds the funds to route." }
  if (/RPC URL is required/.test(msg)) return { short:"Execution RPC URL required", details:"Fill 'Execution RPC URL' in the top node panel or in Payout Rules." }
  if (/Insufficient for gas/.test(msg)) return { short:"Insufficient for gas", details:"New received amount is not enough to cover gas for split transfers. Lower Min threshold, add ETH to the source, or reduce number of rules." }
  return { short:"Error", details: msg }
}

async function runOnce(){
  const cfg=collectConfig({require100:true});
  if(!/^0x[0-9a-fA-F]{40}$/.test(cfg.fromAddress)) throw new Error("From address is required");
  if(!cfg.rpcUrl) throw new Error("RPC URL is required");
  const st=loadState(cfg.fromAddress);
  const bal=await rpcGetBalance(cfg.rpcUrl,cfg.fromAddress);
  const min=BigInt(cfg.minThresholdWei||"0x0");
  const prev=BigInt(st.lastProcessedBalanceWei||"0x0");
  const delta= bal>prev ? (bal-prev) : 0n;
  if(delta<=0n || delta<min){ s("prStatus", `No new funds (Δ ${ethFromWei(delta)} ETH)`); log(`no-op delta=${ethFromWei(delta)} ETH`); return }
  const fees=await resolveFees(cfg,cfg.rpcUrl);
  const perGas=22000n; const gasBudget=(fees.maxFeePerGas||0n)*perGas*BigInt(Math.max(1,cfg.rules.length));
  const transferable = delta>gasBudget ? (delta-gasBudget) : 0n;
  if(transferable<=0n){ s("prStatus","Insufficient for gas"); log("insufficient for gas"); throw new Error("Insufficient for gas") }
  const plan=planAmounts(transferable,cfg.rules);
  await fireHooks(cfg,"route_start",{from:cfg.fromAddress,amountWei:transferable.toString(),rules:cfg.rules});
  log(`split ${ethFromWei(transferable)} ETH into ${plan.length} tx`);
  const sender = cfg.signerMode==="webhook-signer" ? doSendWebhookSigner : doSendRpcUnlocked;
  const hashes = await sender(cfg,cfg.fromAddress,cfg.rpcUrl,plan,fees);
  await fireHooks(cfg,"route_complete",{from:cfg.fromAddress,txHashes:hashes});
  log(`sent ${hashes.length} tx: ${hashes.join(", ")}`);
  const curBlock=await rpcBlockNumber(cfg.rpcUrl);
  const newBal=await rpcGetBalance(cfg.rpcUrl,cfg.fromAddress);
  const newState:PayoutState={lastProcessedBalanceWei:hex(newBal),lastProcessedBlock:hex(curBlock),running:loadState(cfg.fromAddress).running,lastRunAt:Date.now()};
  saveState(cfg.fromAddress,newState);
  s("prStatus", `Last run ok • ${hashes.length} tx`);
  UI.success(`Routed ${ethFromWei(transferable)} ETH in ${hashes.length} tx`, "Payout complete", 1800)
}

let loopTimer:any=null;

async function toggleLoop(){
  try{
    const cfg=collectConfig({require100:true});
    const st=loadState(cfg.fromAddress);
    if(loopTimer){
      clearInterval(loopTimer); loopTimer=null; st.running=false; saveState(cfg.fromAddress,st); s("prStatus","Stopped"); H("prToggle")!.textContent="Start"; log("loop stopped"); return
    }
    if(!cfg.fromAddress){ const ex=explainErrorForModal(new Error("From address is required")); UI.error(ex.short, ex.details, "Payout Rules"); return }
    if(!cfg.rpcUrl){ const ex=explainErrorForModal(new Error("RPC URL is required")); UI.error(ex.short, ex.details, "Payout Rules"); return }
    st.running=true; saveState(cfg.fromAddress,st); s("prStatus","Running"); H("prToggle")!.textContent="Stop"; log("loop started");
    const tick=async()=>{ try{ await runOnce() }catch(e:any){ const ex=explainErrorForModal(e); UI.error(ex.short, ex.details, "Payout Loop"); log(String(e?.message||e)) } };
    await tick(); loopTimer=setInterval(tick, Math.max(1000,cfg.pollMs||15000));
  }catch(e:any){
    const ex=explainErrorForModal(e);
    UI.error(ex.short, ex.details, "Payout Rules");
  }
}

function exportJson(){ try{ const cfg=collectConfig(); const st=loadState(cfg.fromAddress); const data={exportedAt:new Date().toISOString(),config:cfg,state:st}; const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}); const a=document.createElement("a"); a.download=`payout-rules-${Date.now()}.json`; a.href=URL.createObjectURL(blob); document.body.appendChild(a); a.click(); setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(a.href) },0) }catch(e:any){ const ex=explainErrorForModal(e); UI.error(ex.short, ex.details, "Export JSON") } }
function exportCsv(){ try{ const logEl=H("payoutLog"); if(!logEl) return; const rows=Array.from(logEl.querySelectorAll(".log-entry")).map(el=>{ const t=(el.querySelector(".muted")?.textContent||"").trim(); const m=(el.querySelector("div:nth-of-type(2)")?.textContent||"").trim(); return `"${t.replace(/"/g,'""')}","${m.replace(/"/g,'""')}"` }); const blob=new Blob([["time,message"].concat(rows).join("\n")],{type:"text/csv"}); const a=document.createElement("a"); a.download=`payout-log-${Date.now()}.csv`; a.href=URL.createObjectURL(blob); document.body.appendChild(a); a.click(); setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(a.href) },0) }catch(e:any){ UI.notify(e,"Export CSV") } }
function pushLog(kind:string,msg:string,extra?:any){ const logEl=H("payoutLog"); if(!logEl) return; const time=new Date().toISOString(); const entry=document.createElement("div"); entry.className="log-entry"; entry.innerHTML=`<div class="muted">${time} • ${kind}</div><div>${msg}</div>`; if(extra){ const pre=document.createElement("pre"); pre.textContent=JSON.stringify(extra,null,2); entry.appendChild(pre) } logEl.prepend(entry) }

function bindTable(){
  const tbody=H("prRulesTbl")?.querySelector("tbody"); if(!tbody) return;
  const recalc=()=>{ try{ const rules:number[]=[]; tbody.querySelectorAll("tr").forEach(tr=>{ const input=tr.querySelectorAll("input")[2] as HTMLInputElement; const val=Number((input?.value||"0")); if(Number.isFinite(val)) rules.push(val) }); const tot=rules.reduce((a,b)=>a+(b||0),0); updateActionsEnabled(tot, rules.length) }catch{} };
  tbody.addEventListener("input",recalc);
  tbody.addEventListener("click",(e)=>{ const t=e.target as HTMLElement; if(t && t.matches('button[data-cmd="del"]')){ const tr=t.closest("tr"); if(tr) tr.remove(); recalc() } })
}

function mount(root: HTMLElement){
  injectCompactStyles();

  root.innerHTML=`
    <div class="band" style="margin-bottom:10px;">
      <div class="muted">Route partial withdrawals from your withdrawal address to multiple destinations by percentages with logs and webhooks.</div>
    </div>

    <div class="row-3">
      <div><label>Execution RPC URL</label><div class="input-wrap"><input id="prRpc" placeholder="https://..."/></div></div>
      <div><label>From address</label><div class="input-wrap"><input id="prFrom" placeholder="0x..."/></div></div>
      <div><label>Min threshold (ETH)</label><div class="input-wrap"><input id="prMin" type="number" min="0" step="0.0001" value="0.01"/></div></div>
    </div>

    <div class="row-3" style="margin-top:8px;">
      <div><label>Confirmations</label><div class="input-wrap"><input id="prConf" type="number" min="0" step="1" value="1"/></div></div>
      <div><label>Poll interval (ms)</label><div class="input-wrap"><input id="prPoll" type="number" min="1000" step="500" value="15000"/></div></div>
      <div><label>Status</label><div class="input-wrap"><input id="prStatus" value="Idle" disabled/></div></div>
    </div>

    <div class="grid" style="grid-template-columns:1fr 1fr; gap:14px; margin-top:10px;">
      <div class="box">
        <div class="subtitle">Rules</div>
        <div class="table-wrap">
          <table class="table" id="prRulesTbl">
            <thead><tr><th style="width:24%">Label</th><th>Address</th><th style="width:16%">Percent</th><th style="width:18%">Type</th><th style="width:84px"></th></tr></thead>
            <tbody></tbody>
          </table>
          <div class="btns" style="margin-top:8px;">
            <button class="btn ghost" id="prAddRule" type="button">Add rule</button>
            <div id="prTotalPct" class="muted" style="margin-left:auto;">Total: 0%</div>
          </div>
        </div>
      </div>

      <div class="box">
        <div class="subtitle">Settings</div>

        <div class="row-3">
          <div>
            <div class="muted" style="margin-bottom:6px;">Gas</div>
            <div class="input-wrap" style="margin-bottom:6px;">
              <select id="prGasMode"><option value="auto">Auto (feeHistory)</option><option value="manual">Manual</option></select>
            </div>
            <div class="row-3">
              <div><label>Max Fee (Gwei)</label><div class="input-wrap"><input id="prMaxFee" type="number" step="0.1" placeholder="auto"/></div></div>
              <div><label>Max Priority (Gwei)</label><div class="input-wrap"><input id="prMaxPrio" type="number" step="0.1" placeholder="auto"/></div></div>
              <div></div>
            </div>
          </div>

          <div>
            <div class="muted" style="margin-bottom:6px;">Signer</div>
            <div class="input-wrap" style="margin-bottom:6px;">
              <select id="prSigner"><option value="rpc-unlocked">RPC Unlocked Account</option><option value="webhook-signer">Webhook Signer</option></select>
            </div>
            <div class="row-1" id="prSignerWebhookBox" style="display:none;">
              <div><label>Signer Webhook URL</label><div class="input-wrap"><input id="prSignerUrl" placeholder="https://example.com/sign"/></div></div>
              <div><label>Auth header (optional)</label><div class="input-wrap"><input id="prSignerAuth" placeholder="Authorization: Bearer ..."/></div></div>
            </div>
          </div>
        </div>

        <details id="prHooksDetails" style="margin-top:10px;">
          <summary class="muted">Webhooks (optional)</summary>
          <div id="prHooks" style="margin-top:8px;"></div>
          <div class="btns" style="margin-top:8px;"><button class="btn ghost" id="prAddHook" type="button">Add webhook</button></div>
        </details>
      </div>
    </div>

    <div class="btns" style="margin-top:12px;">
      <button class="btn" id="prSave" type="button">Save</button>
      <button class="btn ghost" id="prTest" type="button">Test connection</button>
      <button class="btn ghost" id="prRun" type="button" disabled>Run now</button>
      <button class="btn warn" id="prToggle" type="button" disabled>Start</button>
    </div>

    <details id="payoutConsoleWrap">
      <summary>Log</summary>
      <div class="toolbar"><button class="btn ghost" id="payoutCopy" type="button">Copy</button></div>
      <pre id="payoutOut">—</pre>
    </details>

    <div class="box" style="margin-top:12px;">
      <div class="subtitle">Activity Log</div>
      <div id="payoutLog" class="log" style="max-height:260px; overflow:auto;"></div>
      <div class="btns" style="margin-top:8px;">
        <button class="btn ghost" id="prExportJson" type="button">Export JSON</button>
        <button class="btn ghost" id="prExportCsv" type="button">Export CSV</button>
      </div>
    </div>
  `;

  const cfg=loadConfig();
  if(!v("prRpc")) s("prRpc", v("rpcUrl")||"");
  fillConfig(cfg);

  H("prAddRule")?.addEventListener("click",()=>{ const c=collectConfig(); c.rules.push({id:rndId("rule"),label:"",address:"",percent:0,kind:"custom"}); refreshRulesUI(c); bindTable(); const tot=c.rules.reduce((a,b)=>a+(Number(b.percent)||0),0); updateActionsEnabled(tot,c.rules.length) });
  H("prAddHook")?.addEventListener("click",()=>{ const c=collectConfig(); c.webhooks.push({id:rndId("wh"),url:"",enabled:true}); refreshHooksUI(c) });
  H("prGasMode")?.addEventListener("change",toggleSignerBox);
  H("prSigner")?.addEventListener("change",toggleSignerBox);

  H("prSave")?.addEventListener("click",()=>{ try{ const c=collectConfig(); saveConfig(c) }catch(e:any){ const ex=explainErrorForModal(e); UI.error(ex.short, ex.details, "Payout Rules › Save") } });

  H("prTest")?.addEventListener("click", async () => {
    try{
      const c=collectConfig();
      const [cid,blk,bal]=await Promise.all([rpcChainId(c.rpcUrl),rpcBlockNumber(c.rpcUrl),rpcGetBalance(c.rpcUrl,c.fromAddress)]);
      s("prStatus", `RPC ok • chainId ${cid} • block ${blk.toString()} • balance ${ethFromWei(bal)} ETH`);
      pushLog("rpc","OK",{chainId:cid,block:blk.toString(),balanceEth:ethFromWei(bal)});
      UI.success(`RPC ✓<br>chainId <b>${cid}</b> • block <b>${blk.toString()}</b><br>balance <b>${ethFromWei(bal)} ETH</b>`,"Connection OK",1500)
    }catch(e:any){
      const ex=explainErrorForModal(e); UI.error(ex.short, ex.details, "Payout Rules › Test connection")
    }
  });

  H("prRun")?.addEventListener("click", async ()=>{ try{ UI.setLoading(true,"Payout Rules › Run"); await runOnce() }catch(e:any){ const ex=explainErrorForModal(e); UI.error(ex.short, ex.details, "Payout Rules › Run") } finally { UI.setLoading(false) } });
  H("prToggle")?.addEventListener("click", async ()=>{ try{ await toggleLoop() }catch(e:any){ const ex=explainErrorForModal(e); UI.error(ex.short, ex.details, "Payout Rules › Start/Stop") } });

  H("prExportJson")?.addEventListener("click",exportJson);
  H("prExportCsv")?.addEventListener("click",exportCsv);

  bindTable();

  attachOut();
  H("payoutCopy")?.addEventListener("click",async()=>{ if(!out) return; try{ await navigator.clipboard.writeText(out.textContent||"") }catch{} });

  const totInit=(cfg.rules||[]).reduce((a,b)=>a+(Number(b.percent)||0),0); updateActionsEnabled(totInit,(cfg.rules||[]).length)
}

function fillConfig(c:PayoutConfig){
  if(H("prRpc")) s("prRpc", c.rpcUrl||v("rpcUrl")||"");
  if(H("prFrom")) s("prFrom", c.fromAddress||"");
  if(H("prMin")) s("prMin", ethFromWei(BigInt(c.minThresholdWei||"0x0")));
  if(H("prConf")) s("prConf", String(c.confirmations||0));
  if(H("prPoll")) s("prPoll", String(c.pollMs||15000));
  if(H("prGasMode")) (H<HTMLSelectElement>("prGasMode")!.value=c.gasMode);
  if(H("prMaxFee")) s("prMaxFee", c.maxFeePerGasGwei!=null? String(c.maxFeePerGasGwei):"");
  if(H("prMaxPrio")) s("prMaxPrio", c.maxPriorityFeePerGasGwei!=null? String(c.maxPriorityFeePerGasGwei):"");
  if(H("prSigner")) (H<HTMLSelectElement>("prSigner")!.value=c.signerMode);
  if(H("prSignerUrl")) s("prSignerUrl", c.signerWebhookUrl||"");
  if(H("prSignerAuth")) s("prSignerAuth", c.signerWebhookAuth||"");
  refreshRulesUI(c);
  refreshHooksUI(c);
  toggleSignerBox();
  const tot=(c.rules||[]).reduce((a,b)=>a+(Number(b.percent)||0),0);
  updateActionsEnabled(tot,(c.rules||[]).length)
}

function refreshRulesUI(cfg:PayoutConfig){
  const tb=H("prRulesTbl")?.querySelector("tbody") as HTMLElement; if(!tb) return;
  tb.innerHTML=""; (cfg.rules||[]).forEach(r=>tb.appendChild(uiRuleRow(r)));
  const tot=(cfg.rules||[]).reduce((a,b)=>a+(Number(b.percent)||0),0);
  const t=H("prTotalPct"); if(t) t.textContent=`Total: ${tot.toFixed(2)}%`
}

function uiRuleRow(r:Rule){
  const tr=document.createElement("tr"); tr.dataset.id=r.id;
  tr.innerHTML=`<td><input value="${r.label??""}" placeholder="Label"/></td><td><input value="${r.address??""}" placeholder="0x..."/></td><td><input type="number" min="0" max="100" step="0.01" value="${String(r.percent??0)}"/></td><td><select><option value="operational"${r.kind==="operational"?" selected":""}>Operational</option><option value="savings"${r.kind==="savings"?" selected":""}>Savings</option><option value="fee"${r.kind==="fee"?" selected":""}>Fee donor</option><option value="custom"${r.kind==="custom"?" selected":""}>Custom</option></select></td><td><button class="btn ghost btn-del" data-cmd="del" type="button">Remove</button></td>`;
  return tr
}

function refreshHooksUI(cfg:PayoutConfig){
  const wrap=H("prHooks"); if(!wrap) return; wrap.innerHTML="";
  (cfg.webhooks||[]).forEach(w=>{ const row=document.createElement("div"); row.className="row-3"; row.dataset.id=w.id; row.innerHTML=`<div><label>URL</label><div class="input-wrap"><input value="${w.url}" placeholder="https://..."/></div></div><div><label>Secret header</label><div class="input-wrap"><input value="${w.secretHeader||""}"/></div></div><div><label>Enabled</label><div class="input-wrap"><select><option value="1"${w.enabled?" selected":""}>Yes</option><option value="0"${!w.enabled?" selected":""}>No</option></select></div></div>`; wrap.appendChild(row) })
}

function toggleSignerBox(){ const sm=H<HTMLSelectElement>("prSigner"); const box=H("prSignerWebhookBox"); if(!sm||!box) return; box.style.display = sm.value==="webhook-signer" ? "grid":"none" }

function boot(){ const host=H("payoutRoot"); if(host) mount(host) }
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot, {once:true} as AddEventListenerOptions); else boot();
