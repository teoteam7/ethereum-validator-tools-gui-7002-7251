/// <reference types="node" />

import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { ethers } from 'ethers';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { EIP7002_PREDEPLOY, KNOWN_GENESIS_VALIDATORS_ROOT } from '../common/constants.js';

const IS_DEV = !app.isPackaged;
if (IS_DEV) app.commandLine.appendSwitch("allow-file-access-from-files");
process.env.NODE_ENV = IS_DEV ? 'development' : 'production';
process.env.DEBUG_PRELOAD = IS_DEV ? '1' : '';

const APP_ROOT = app.isPackaged ? app.getAppPath() : process.cwd();
const PRELOAD_PATH = app.isPackaged
  ? path.join(APP_ROOT, "src", "preload", "index.cjs")
  : path.join(APP_ROOT, "src", "preload", "index.cjs");
const INDEX_HTML = app.isPackaged
  ? path.join(APP_ROOT, "dist", "renderer", "index.html")
  : path.join(APP_ROOT, "dist", "renderer", "index.html");

let mainWindow: BrowserWindow | null = null;

app.on("web-contents-created", (_event, contents) => {
  contents.on("render-process-gone", (_e, details) => console.error("[render-process-gone]", details));
  contents.on("did-fail-load", (_e, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.error("[did-fail-load]", { errorCode, errorDescription, validatedURL, isMainFrame });
  });
  if (IS_DEV) {
    contents.on("console-message", (_e, level, message, line, sourceId) => {
      const levels = ["log", "warn", "error", "debug", "info"];
      console.log("[renderer]", { level: levels[level] ?? level, message, line, sourceId });
    });
  }
});

const USER_DATA = app.getPath("userData");
const PROFILE_PATH = path.join(USER_DATA, "vt.profile.json");
const LOCK_PATH = path.join(USER_DATA, "vt.lock.json");
let SESSION_UNLOCKED = false;

type Profile = {
  pubkey?: string;
  index?: number | string;
  network?: "mainnet" | "holesky";
  beaconUrl?: string;
  rpcUrl?: string;
};

function readJson<T = any>(p: string): T | null {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}
function writeJson(p: string, v: any) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(v, null, 2));
}
function lockEnabled() {
  const lock = readJson<any>(LOCK_PATH);
  return !!lock?.enabled;
}

function ensureDevRendererArtifacts() {
  if (!IS_DEV) return;
  const distDir = path.join(APP_ROOT, "dist", "renderer");
  const idx = path.join(distDir, "index.html");
  if (!fs.existsSync(idx)) {
    const srcDir = path.join(APP_ROOT, "src", "renderer");
    fs.mkdirSync(distDir, { recursive: true });
    for (const name of fs.readdirSync(srcDir)) {
      const s = path.join(srcDir, name);
      const d = path.join(distDir, name);
      try { fs.cpSync(s, d, { recursive: true }); } catch {}
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    minWidth: 1330,
    minHeight: 820,
    width: 1330,
    height: 820,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: !IS_DEV,
      sandbox: !IS_DEV
    },
    show: true
  });

  ensureDevRendererArtifacts();

  if (!fs.existsSync(INDEX_HTML)) {
    console.error("[Main] index.html not found:", INDEX_HTML);
  }

  mainWindow.loadFile(INDEX_HTML).catch((e) => console.error("[Main] loadFile failed:", e));

  mainWindow.on("closed", () => (mainWindow = null));
}

async function httpJson(url: string, init?: any) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(()=>"")}`);
  return res.json();
}
async function httpJsonTimeout(url: string, timeoutMs = 1500) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const text = await res.text().catch(()=>""); let json: any = null; try { json = text ? JSON.parse(text) : null; } catch {}
    return { ok: res.ok, status: res.status, json, aborted: false };
  } catch (e: any) {
    if (e?.name === "AbortError") return { ok:false, status:0, aborted:true };
    return { ok:false, status:0, error:String(e?.message||e), aborted:false };
  } finally { clearTimeout(t); }
}
const is404 = (e: unknown) => typeof (e as any)?.message === "string" && (e as any).message.trim().startsWith("404");

let BEACON_AUTH: null | {
  enabled: boolean;
  mode: "auth_bearer" | "x_api_key" | "query_apikey";
  key: string;
  headerName?: string;
  authPrefix?: string;
  queryName?: string;
} = null;

ipcMain.handle("beacon:setAuth", async (_evt, cfg) => {
  BEACON_AUTH = cfg || null;
  return { ok: true };
});

async function fetchBeacon(url: string, init?: any, tries = 3, backoffMs = 800): Promise<any> {
  let headers = new Headers(init?.headers || {});
  if (BEACON_AUTH?.enabled && BEACON_AUTH.key) {
    if (BEACON_AUTH.mode === "auth_bearer") {
      if (!headers.has("Authorization")) headers.set("Authorization", (BEACON_AUTH.authPrefix ?? "Bearer ") + BEACON_AUTH.key);
    } else if (BEACON_AUTH.mode === "x_api_key") {
      headers.set(BEACON_AUTH.headerName ?? "X-API-Key", BEACON_AUTH.key);
    } else {
      const u = new URL(url);
      u.searchParams.set(BEACON_AUTH.queryName ?? "apikey", BEACON_AUTH.key);
      url = u.toString();
    }
  }
  let attempt = 0;
  while (true) {
    const res = await fetch(url, { ...init, headers });
    if (res.status !== 429 && res.status !== 503) return res;
    attempt++;
    if (attempt >= tries) return res;
    await new Promise(r => setTimeout(r, backoffMs * attempt));
  }
}

async function httpJsonBeacon(url: string, init?: any) {
  const res = await fetchBeacon(url, init);
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(()=> "")}`);
  return res.json();
}

ipcMain.removeHandler?.("beacon:getValidator");
ipcMain.handle("beacon:getValidator", async (_evt, base: string, id: string) =>
  httpJsonBeacon(new URL(`/eth/v1/beacon/states/head/validators/${id}`, base).toString())
);

ipcMain.removeHandler?.("beacon:getGenesis");
ipcMain.handle("beacon:getGenesis", async (_evt, base: string) =>
  httpJsonBeacon(new URL("/eth/v1/beacon/genesis", base).toString())
);

ipcMain.removeHandler?.("beacon:getHeader");
ipcMain.handle("beacon:getHeader", async (_evt, base: string, id: string) => {
  const u1 = new URL(`/eth/v1/beacon/headers/${encodeURIComponent(id)}`, base).toString();
  try { return await httpJsonBeacon(u1); }
  catch (e) {
    if (is404(e)) {
      const u2 = new URL(`/eth/v1/beacon/headers?slot=${encodeURIComponent(id)}`, base).toString();
      return httpJsonBeacon(u2);
    }
    throw e;
  }
});

ipcMain.removeHandler?.("beacon:getBlockV2");
ipcMain.handle("beacon:getBlockV2", async (_evt, base: string, blockId: string) =>
  httpJsonBeacon(new URL(`/eth/v2/beacon/blocks/${blockId}`, base).toString())
);

ipcMain.removeHandler?.("beacon:postBlsToExec");
ipcMain.handle("beacon:postBlsToExec", async (_evt, beaconBase: string, payload: any) => {
  const url = new URL("/eth/v1/beacon/pool/bls_to_execution_changes", (beaconBase || "").trim()).toString();
  const res = await fetchBeacon(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} ${text || ""}`);
  try { return JSON.parse(text); } catch { return { ok: true, raw: text }; }
});

ipcMain.handle("beacon:getWithdrawalsStats", async (_evt, args: { beaconBase: string; lookback: number; start?: "head" | number }) => {
  const base = (args?.beaconBase || "").trim();
  if (!base) throw new Error("Beacon URL is required");
  const MAX = 8192;
  const lookback = Math.max(1, Math.min(MAX, Number(args?.lookback || 256)));
  let startSlot: number;
  {
    const head = await httpJsonTimeout(new URL("/eth/v1/beacon/headers/head", base).toString(), 2500);
    if (!head.ok) throw new Error(`Beacon not reachable (headers/head)`);
    startSlot = Number(head.json?.data?.header?.message?.slot ?? head.json?.data?.slot ?? head.json?.slot ?? 0);
    if (!Number.isFinite(startSlot) || startSlot <= 0) throw new Error("Could not resolve head slot");
  }
  let start = startSlot;
  if (args?.start !== undefined && args?.start !== "head") {
    const s = Number(args?.start);
    if (Number.isFinite(s) && s > 0) start = Math.min(startSlot, s);
  }
  const count = Math.min(lookback, start);
  const slots: number[] = [];
  for (let i = 0; i < count; i++) {
    const s = start - i; if (s <= 0) break; slots.push(s);
  }
  const cpuCount = typeof os.cpus === "function" ? os.cpus().length : 8;
  const CONCURRENCY = Math.min(12, Math.max(4, Math.floor(cpuCount || 8)));
  const REQ_TIMEOUT_MS = 1800;
  const DEADLINE_MS = Math.min(35_000, Math.max(4_000, slots.length * 80));
  const deadlineAt = Date.now() + DEADLINE_MS;
  const counts: number[] = [];
  let processed = 0;
  let i = 0;
  async function worker() {
    while (true) {
      if (Date.now() > deadlineAt) break;
      const cur = i++; if (cur >= slots.length) break;
      const slot = slots[cur];
      const r = await httpJsonTimeout(new URL(`/eth/v2/beacon/blocks/${slot}`, base).toString(), REQ_TIMEOUT_MS);
      processed++;
      if (!r.ok) continue;
      const j = r.json;
      const w = j?.data?.message?.body?.execution_payload?.withdrawals ??
                j?.data?.execution_payload?.withdrawals ??
                j?.data?.message?.body?.withdrawals ?? [];
      counts.push(Array.isArray(w) ? w.length : 0);
    }
  }
  const workers = Array.from({ length: Math.min(CONCURRENCY, slots.length) }, () => worker());
  await Promise.all(workers);
  const N = counts.length || 1;
  const sorted = counts.slice().sort((a,b)=>a-b);
  const sum = counts.reduce((a,b)=>a+b,0);
  const avg = sum / N;
  const idx = (p: number) => Math.min(N-1, Math.max(0, Math.floor(p*(N-1))));
  const p50 = sorted[idx(0.50)];
  const p95 = sorted[idx(0.95)];
  const min = sorted[0] ?? 0;
  const max = sorted[sorted.length-1] ?? 0;
  return {
    startSlot: start,
    scanned: processed,
    samples: N,
    avgPerBlock: avg,
    p50, p95, min, max
  };
});

function hexStrip0x(h: string) { return h.startsWith("0x") ? h.slice(2) : h; }
function hexToBytes(h: string): Uint8Array {
  const s = hexStrip0x(h); if (s.length % 2 !== 0) throw new Error(`Hex odd length: ${h}`);
  const out = new Uint8Array(s.length / 2); for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i*2, i*2+2), 16);
  return out;
}
function bytesToHex(b: Uint8Array) { return "0x" + Buffer.from(b).toString("hex"); }
function assertLen(hex: string, bytes: number, label: string) { const s = hexStrip0x(hex); if (s.length !== bytes * 2) throw new Error(`${label} must be ${bytes} bytes`); }
const CAPELLA_FORK_VERSION: Record<string, string> = { mainnet: "0x03000000", holesky: "0x01017000" };
const DOMAIN_BLS_TO_EXECUTION_CHANGE = new Uint8Array([0x0a, 0x00, 0x00, 0x00]);

ipcMain.handle("bls:buildChange", async (_evt, args: {
  network: "mainnet" | "holesky";
  validatorIndex: string;
  fromBlsPubkey: string;
  toExecutionAddress: string;
  blsWithdrawalPrivkey: string;
  overrideGenesisRoot?: string;
}) => {
  const network = args.network || "mainnet";
  const validatorIndex = BigInt(args.validatorIndex);
  assertLen(args.fromBlsPubkey, 48, "fromBlsPubkey");
  assertLen(args.toExecutionAddress, 20, "toExecutionAddress");
  assertLen(args.blsWithdrawalPrivkey, 32, "blsWithdrawalPrivkey");
  const ssz = await import("@chainsafe/ssz") as any;
  const { ContainerType, ByteVectorType, BigIntUintType } = ssz;
  const T_BLSToExec = new ContainerType({ fields: {
    validator_index: new BigIntUintType(8),
    from_bls_pubkey: new ByteVectorType(48),
    to_execution_address: new ByteVectorType(20)
  }});
  const T_SigningData = new ContainerType({ fields: {
    object_root: new ByteVectorType(32),
    domain: new ByteVectorType(32)
  }});
  const T_ForkData = new ContainerType({ fields: {
    current_version: new ByteVectorType(4),
    genesis_validators_root: new ByteVectorType(32)
  }});
  const forkVersionHex = CAPELLA_FORK_VERSION[network] || CAPELLA_FORK_VERSION.mainnet;
  const genesisRootHex = (args.overrideGenesisRoot && args.overrideGenesisRoot.length > 0)
    ? args.overrideGenesisRoot
    : KNOWN_GENESIS_VALIDATORS_ROOT[network] || KNOWN_GENESIS_VALIDATORS_ROOT.mainnet;
  const forkDataRoot = T_ForkData.hashTreeRoot({
    current_version: hexToBytes(forkVersionHex),
    genesis_validators_root: hexToBytes(genesisRootHex)
  });
  const domain = new Uint8Array(32);
  domain.set(DOMAIN_BLS_TO_EXECUTION_CHANGE, 0);
  domain.set(forkDataRoot.slice(0, 28), 4);
  const msg = {
    validator_index: validatorIndex,
    from_bls_pubkey: hexToBytes(args.fromBlsPubkey),
    to_execution_address: hexToBytes(args.toExecutionAddress)
  };
  const objectRoot = T_BLSToExec.hashTreeRoot(msg);
  const T_Signing = T_SigningData;
  const signingRoot = T_Signing.hashTreeRoot({ object_root: objectRoot, domain });
  const { bls12_381: bls } = await import("@noble/curves/bls12-381");
  const signature = await bls.sign(signingRoot, hexToBytes(args.blsWithdrawalPrivkey));
  return {
    message: {
      validator_index: args.validatorIndex,
      from_bls_pubkey: bytesToHex(msg.from_bls_pubkey),
      to_execution_address: bytesToHex(msg.to_execution_address)
    },
    signature: bytesToHex(signature)
  };
});

ipcMain.removeHandler?.("eip7002:getFee");
ipcMain.handle("eip7002:getFee", async (_evt, rpcUrl: string) => {
  try {
    const url = (rpcUrl || "").trim();
    if (!url) throw new Error("RPC URL is required");
    const provider = new ethers.JsonRpcProvider(url);
    let chainId: number | null = null;
    let blockNum: number | null = null;
    try {
      const [cidHex, blkHex] = await Promise.all([
        provider.send("eth_chainId", []),
        provider.send("eth_blockNumber", [])
      ]);
      chainId = Number(cidHex);
      blockNum = Number(blkHex);
      setFooterChain(chainId, blockNum);
    } catch (e: any) {
      const msg = e?.message || e?.shortMessage || String(e);
      throw new Error(`RPC not reachable: ${msg}`);
    }
    let code: string;
    try {
      code = await provider.getCode(EIP7002_PREDEPLOY);
    } catch (e: any) {
      const msg = e?.message || e?.shortMessage || String(e);
      throw new Error(`Failed to read predeploy code: ${msg}`);
    }
    if (!code || code === "0x" || code === "0x0") {
      throw new Error(`EIP-7002 predeploy ${EIP7002_PREDEPLOY} not found on chainId ${chainId ?? "unknown"}.`);
    }
    try {
      const res = await provider.call({ to: EIP7002_PREDEPLOY, data: "0x" });
      const fee = ethers.toBigInt(res);
      return fee.toString();
    } catch (e: any) {
      const msg = e?.info?.error?.message || e?.shortMessage || e?.message || String(e);
      throw new Error(`Failed to read 7002 fee: ${msg}`);
    }
  } catch (err: any) {
    throw new Error(err?.message ? String(err.message) : String(err));
  }
});

ipcMain.removeHandler?.("eip7002:submit");
ipcMain.handle("eip7002:submit", async (_evt, args: {
  rpcUrl: string;
  secret?: string; privkey?: string;
  validatorPubkey: string; amountGwei: string;
  derivationPath?: string;
  gas?: { maxFeePerGasGwei?: string | number; maxPriorityFeePerGasGwei?: string | number; gasLimit?: string | number };
  nonce?: number;
  sendRetries?: number;
  bumpPercent?: number;
}) => {
  const provider = new ethers.JsonRpcProvider(args.rpcUrl);
  const rawSecret = (args.secret ?? args.privkey ?? "").trim();
  if (!rawSecret) throw new Error("EOA secret is required: paste a private key (0x…) or a 12/24-word mnemonic.");
  const hdPath = args.derivationPath || "m/44'/60'/0'/0/0";
  const maybePk = rawSecret.startsWith("0x") ? rawSecret : ("0x" + rawSecret);
  const signer =
    ethers.isHexString(maybePk, 32)
      ? new ethers.Wallet(maybePk, provider)
      : (() => { try { return ethers.HDNodeWallet.fromPhrase(rawSecret, undefined, hdPath).connect(provider); }
                 catch { throw new Error("Invalid EOA secret: provide a 32-byte private key or a valid BIP-39 mnemonic."); } })();
  let chainId: number | null = null;
  try {
    const cidHex = await provider.send("eth_chainId", []);
    chainId = Number(cidHex);
    setFooterProbe && setFooterProbe("rpcInfo", `chainId ${chainId} block `);
  } catch {}
  const code = await provider.getCode(EIP7002_PREDEPLOY);
  if (!code || code === "0x" || code === "0x0") {
    throw new Error(`EIP-7002 predeploy ${EIP7002_PREDEPLOY} not found on chainId ${chainId ?? "unknown"}.`);
  }
  let fee: bigint;
  try {
    const feeHexCall = await provider.call({ to: EIP7002_PREDEPLOY, data: "0x" });
    fee = ethers.toBigInt(feeHexCall);
  } catch (e: any) {
    const msg = e?.info?.error?.message || e?.shortMessage || e?.message || String(e);
    throw new Error(`Failed to read 7002 fee: ${msg}`);
  }
  let pub = args.validatorPubkey.startsWith("0x") ? args.validatorPubkey.slice(2) : args.validatorPubkey;
  if (pub.length !== 96) throw new Error("validatorPubkey must be 48 bytes hex (96 chars).");
  const amount = BigInt(args.amountGwei || "0");
  if (amount < 0n) throw new Error("amountGwei must be >= 0");
  if (amount > 0xFFFF_FFFF_FFFF_FFFFn) throw new Error("amountGwei overflows uint64");
  const amountHex = ethers.toBeHex(amount, 8);
  const data = "0x" + pub + amountHex.slice(2).toLowerCase();
  const from = await signer.getAddress();
  const parseMaybeGweiToWeiLocal = (value?: string | number | null) => {
    if (value == null) return undefined;
    const s = String(value).trim();
    if (!s) return undefined;
    const n = BigInt(s);
    return n * 1_000_000_000n;
  };
  let maxFeePerGas = parseMaybeGweiToWeiLocal(args?.gas?.maxFeePerGasGwei);
  let maxPriorityFeePerGas = parseMaybeGweiToWeiLocal(args?.gas?.maxPriorityFeePerGasGwei);
  let gasLimit = args?.gas?.gasLimit != null ? BigInt(String(args.gas.gasLimit)) : undefined;
  let nonce: number;
  if (args?.nonce != null) {
    nonce = Number(args.nonce);
  } else {
    nonce = await provider.getTransactionCount(from, "pending");
  }
  const txBase: ethers.TransactionRequest = {
    to: EIP7002_PREDEPLOY,
    from,
    value: fee,
    data,
    nonce
  };
  if (maxFeePerGas != null) txBase.maxFeePerGas = maxFeePerGas;
  if (maxPriorityFeePerGas != null) txBase.maxPriorityFeePerGas = maxPriorityFeePerGas;
  if (gasLimit != null) txBase.gasLimit = gasLimit;
  try {
    if (txBase.gasLimit == null) {
      const est = await provider.estimateGas(txBase);
      txBase.gasLimit = est + (est / 10n);
    }
  } catch (e: any) {
    const raw = e?.info?.error?.message || e?.shortMessage || e?.message || "simulation failed";
    const low = String(raw).toLowerCase();
    let hint = "";
    if (low.includes("revert")) hint = "Likely causes: wrong sender (not validator 0x01), wrong network, or validator not eligible.";
    else if (low.includes("insufficient") || low.includes("funds")) hint = "Fund the sender with (fee + gas).";
    throw new Error(`Preflight (estimateGas) failed: ${raw}${hint ? " — " + hint : ""}`);
  }
  const maxRetries = Math.max(0, Number(args?.sendRetries ?? 3));
  const bumpPct = Math.max(1, Number(args?.bumpPercent ?? 12));
  const bump = (v: bigint) => (v + (v * BigInt(bumpPct)) / 100n);
  let lastError: any = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0 && /nonce too low|already known/i.test(String(lastError || ""))) {
        nonce = await provider.getTransactionCount(from, "pending");
        txBase.nonce = nonce;
      }
      if (attempt > 0 && /replacement fee too low|underpriced/i.test(String(lastError || ""))) {
        if (txBase.maxFeePerGas && txBase.maxPriorityFeePerGas) {
          txBase.maxPriorityFeePerGas = bump(txBase.maxPriorityFeePerGas as bigint);
          txBase.maxFeePerGas = bump(txBase.maxFeePerGas as bigint);
        } else {
          const feeData = await provider.getFeeData();
          const mf = feeData.maxFeePerGas ?? feeData.gasPrice ?? 2_000_000_000n;
          const mp = feeData.maxPriorityFeePerGas ?? 1_500_000_000n;
          txBase.maxPriorityFeePerGas = bump(mp);
          txBase.maxFeePerGas = bump(mf);
        }
      }
      const tx = await signer.sendTransaction(txBase);
      const receipt = await tx.wait();
      return { txHash: tx.hash, status: receipt?.status ?? null };
    } catch (e: any) {
      lastError = e?.info?.error?.message || e?.shortMessage || e?.message || String(e);
      if (/insufficient funds/i.test(lastError)) throw new Error(`Insufficient funds: need msg.value(fee) + gas. Details: ${lastError}`);
      if (/intrinsic gas too low|gas limit reached/i.test(lastError)) throw new Error(`Gas config error: ${lastError}`);
      if (attempt === maxRetries) throw new Error(`Send failed after ${maxRetries+1} attempts: ${lastError}`);
      const sleepMs = 600 + Math.floor(Math.random()*400) + attempt*400;
      await new Promise(r => setTimeout(r, sleepMs));
      continue;
    }
  }
  throw new Error(lastError || "Unknown send error");
});

ipcMain.removeHandler?.("file:saveText");
ipcMain.handle("file:saveText", async (_evt, name: string, text: string) => {
  try {
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0] || null;
    const { filePath, canceled } = await dialog.showSaveDialog(win ?? undefined, {
      title: "Save CSV",
      defaultPath: path.join(app.getPath("downloads"), name || "export.csv"),
      buttonLabel: "Save",
      filters: [
        { name: "CSV file", extensions: ["csv"] },
        { name: "All files", extensions: ["*"] }
      ],
      properties: ["createDirectory", "showOverwriteConfirmation"]
    });
    if (canceled || !filePath) {
      throw new Error("SAVE_CANCELED");
    }
    await fs.promises.writeFile(filePath, text, "utf8");
    return { ok: true, path: filePath };
  } catch (e: any) {
    throw new Error(e?.message || String(e));
  }
});

ipcMain.handle("eip7002:addrFromSecret", async (_evt, args: { secret?: string; privkey?: string; derivationPath?: string }) => {
  const rawSecret = (args.secret ?? args.privkey ?? "").trim();
  if (!rawSecret) throw new Error("secret required");
  const hdPath = args.derivationPath || "m/44'/60'/0'/0/0";
  const maybePk = rawSecret.startsWith("0x") ? rawSecret : ("0x" + rawSecret);
  const wallet =
    ethers.isHexString(maybePk, 32)
      ? new ethers.Wallet(maybePk)
      : ethers.HDNodeWallet.fromPhrase(rawSecret, undefined, hdPath);
  return { address: await wallet.getAddress() };
});

ipcMain.handle("eip:staticcall", async (_evt, args: { rpcUrl: string; to: string; data?: string }) => {
  const provider = new ethers.JsonRpcProvider(args.rpcUrl);
  const to = (args?.to || "").trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(to)) throw new Error("Bad `to` address");
  const data = (args?.data && args.data.trim().length > 0) ? args.data.trim() : "0x";
  const res = await provider.call({ to, data });
  return { hex: res };
});

async function preflightBlocks(base: string, startSlot: number) {
  const SAMPLES = 16, TIMEOUT = 1200;
  const step = Math.max(1, Math.floor(Math.min(512, startSlot) / SAMPLES));
  const samples: number[] = [];
  for (let i = 0; i < SAMPLES; i++) { const s = startSlot - i * step; if (s > 0) samples.push(s); }
  const reqs = samples.map((s) => httpJsonTimeout(new URL(`/eth/v2/beacon/blocks/${s}`, base).toString(), TIMEOUT));
  const res = await Promise.all(reqs);
  const ok = res.filter(r => r.ok).length;
  const timeouts = res.filter(r => !r.ok && (r.aborted || r.status === 0)).length;
  return { samples: samples.length, ok, timeouts, fail: res.length - ok };
}
ipcMain.handle("beacon:scanWithdrawals", async (_evt, args: {
  beaconBase: string; address?: string; validatorIndex?: string | number; lookback: number; start: "head" | number;
}) => {
  const base = (args.beaconBase || "").trim();
  const addr = (args.address || "").toLowerCase().trim();
  const viArg = args.validatorIndex != null ? String(args.validatorIndex).trim() : "";
  const byAddr = !!addr, byVi = !!viArg;
  if (!base) throw new Error("Beacon URL is required");
  if (!byAddr && !byVi) throw new Error("Provide address or validatorIndex");
  if (byAddr && !/^0x[0-9a-fA-F]{40}$/.test(addr)) throw new Error("Withdrawal address looks invalid");
  let startSlot: number;
  {
    const head = await httpJsonTimeout(new URL("/eth/v1/beacon/headers/head", base).toString(), 2500);
    if (!head.ok) {
      const m = (head as any).aborted ? "timeout" : ((head as any).error || `HTTP ${head.status}`);
      throw new Error(`Beacon not reachable (headers/head): ${m}`);
    }
    startSlot = Number( head.json?.data?.header?.message?.slot ?? head.json?.data?.slot ?? head.json?.slot ?? 0 );
    if (!Number.isFinite(startSlot) || startSlot <= 0) throw new Error("Could not resolve head slot");
  }
  if (args.start !== "head") { const s = Number(args.start); if (!Number.isFinite(s) || s <= 0) throw new Error("Invalid start slot"); startSlot = Math.min(startSlot, s); }
  const pf = await preflightBlocks(base, startSlot);
  if (pf.ok <= 1 && pf.timeouts >= Math.floor(pf.samples * 0.6)) {
    throw new Error(`Beacon node is too slow or not serving /eth/v2/beacon/blocks/* (ok=${pf.ok}/${pf.samples}, timeouts=${pf.timeouts}).`);
  }
  const MAX_LOOKBACK_PER_CALL = 10_000;
  const lookback = Math.max(1, Math.min(MAX_LOOKBACK_PER_CALL, Number(args.lookback || 2048)));
  const count = Math.min(lookback, startSlot);
  const slots: number[] = [];
  for (let i = 0; i < count; i++) { const s = startSlot - i; if (s <= 0) break; slots.push(s); }
  const cpuCount = typeof os.cpus === "function" ? os.cpus().length : 8;
  const CONCURRENCY = Math.min(12, Math.max(4, Math.floor(cpuCount || 8)));
  const REQ_TIMEOUT_MS = 1800;
  const DEADLINE_MS = Math.min(45_000, Math.max(4_000, slots.length * 120));
  const deadlineAt = Date.now() + DEADLINE_MS;
  const matches: Array<{ slot: number; index?: string; validator_index?: string; amount_gwei?: string; address?: string; }> = [];
  let i = 0, processed = 0;
  async function worker() {
    while (true) {
      if (Date.now() > deadlineAt) break;
      const cur = i++; if (cur >= slots.length) break;
      const slot = slots[cur];
      const r = await httpJsonTimeout(new URL(`/eth/v2/beacon/blocks/${slot}`, base).toString(), REQ_TIMEOUT_MS);
      processed++;
      if (!r.ok) continue;
      const j = r.json;
      const w = j?.data?.message?.body?.execution_payload?.withdrawals ??
                j?.data?.execution_payload?.withdrawals ??
                j?.data?.message?.body?.withdrawals ?? [];
      for (const it of w) {
        const wAddr = String(it.address ?? it?.withdrawalAddress ?? "").toLowerCase();
        const itVi  = String(it.validator_index ?? it?.validatorIndex ?? "");
        const byAddrOk = byAddr && wAddr === addr;
        const byViOk   = byVi && itVi === viArg;
        if ((byAddr && byAddrOk) || (byVi && byViOk)) {
          matches.push({ slot, index: String(it.index ?? ""), validator_index: itVi || "", amount_gwei: String(it.amount ?? ""), address: it.address ?? "" });
        }
      }
    }
  }
  const workers = Array.from({ length: Math.min(CONCURRENCY, slots.length) }, () => worker());
  await Promise.all(workers);
  const timedOut = Date.now() > deadlineAt;
  return { startSlot, scanned: processed, matches, timedOut, requested: slots.length };
});

ipcMain.handle("profile:get", async () => readJson(PROFILE_PATH));
ipcMain.handle("profile:set", async (_e, prof: Profile) => { writeJson(PROFILE_PATH, prof || {}); return { ok: true }; });

ipcMain.handle("lock:set", async (_e, args: { enabled?: boolean; password?: string }) => {
  if (!args?.enabled) { writeJson(LOCK_PATH, { enabled: false }); SESSION_UNLOCKED = true; return { ok: true }; }
  const pwd = String(args.password || ""); if (pwd.length < 6) throw new Error("Password must be at least 6 characters");
  const salt = randomBytes(16); const hash = scryptSync(pwd, salt, 64);
  writeJson(LOCK_PATH, { enabled: true, salt: salt.toString("hex"), hash: hash.toString("hex") });
  SESSION_UNLOCKED = true; return { ok: true };
});
ipcMain.handle("lock:verify", async (_e, args: { password: string }) => {
  const lock = readJson<any>(LOCK_PATH);
  if (!lock?.enabled) { SESSION_UNLOCKED = true; return { ok: true }; }
  const salt = Buffer.from(String(lock.salt || ""), "hex");
  const expect = Buffer.from(String(lock.hash || ""), "hex");
  const got = scryptSync(String(args.password || ""), salt, 64);
  const ok = expect.length > 0 && timingSafeEqual(got, expect);
  SESSION_UNLOCKED = ok; return { ok };
});
ipcMain.handle("lock:status", async () => {
  const enabled = lockEnabled();
  const needUnlock = enabled && !SESSION_UNLOCKED;
  return { enabled, needUnlock };
});

ipcMain.handle("app:navigate", async () => {
  if (!mainWindow) return { ok: false };
  await mainWindow.loadFile(INDEX_HTML);
  return { ok: true };
});

ipcMain.handle("rpc:getInfo", async (_evt, rpcUrl: string) => {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const t0 = Date.now();
  const [chainIdHex, blockHex, client] = await Promise.all([
    provider.send("eth_chainId", []),
    provider.send("eth_blockNumber", []),
    provider.send("web3_clientVersion", []).catch(() => null)
  ]);
  const latency = Date.now() - t0;
  return { ok: true, chainIdHex, chainId: Number(chainIdHex), blockNumber: Number(blockHex), client: typeof client === "string" ? client : null, latency };
});

ipcMain.handle("reset:all", async (_e, args: { wipeProfile?: boolean } = {}) => {
  try {
    if (fs.existsSync(LOCK_PATH)) fs.unlinkSync(LOCK_PATH);
    if (args?.wipeProfile && fs.existsSync(PROFILE_PATH)) fs.unlinkSync(PROFILE_PATH);
    const ONBOARD_FLAG = path.join(USER_DATA, "vt.onboarded.flag");
    try { if (fs.existsSync(ONBOARD_FLAG)) fs.unlinkSync(ONBOARD_FLAG); } catch {}
    SESSION_UNLOCKED = false;
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
});

ipcMain.removeHandler?.("file:saveJSON");
ipcMain.handle("file:saveJSON", async (_evt, name: string, obj: any) => {
  try {
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0] || null;
    const { filePath, canceled } = await dialog.showSaveDialog(win ?? undefined, {
      title: "Save JSON",
      defaultPath: path.join(app.getPath("downloads"), name || "export.json"),
      buttonLabel: "Save",
      filters: [
        { name: "JSON file", extensions: ["json"] },
        { name: "All files", extensions: ["*"] }
      ],
      properties: ["createDirectory", "showOverwriteConfirmation"]
    });
    if (canceled || !filePath) {
      throw new Error("SAVE_CANCELED");
    }
    const data = JSON.stringify(obj ?? {}, null, 2);
    await fs.promises.writeFile(filePath, data, "utf8");
    return { ok: true, path: filePath };
  } catch (e: any) {
    throw new Error(e?.message || String(e));
  }
});

function setFooterProbe(id: string, text: string) {
  if (!mainWindow) return;
  mainWindow.webContents.executeJavaScript(`
    (function(){
      var el = document.getElementById(${JSON.stringify(id)});
      if(!el){
        el = document.createElement('span');
        el.id=${JSON.stringify(id)};
        el.style.position='absolute';el.style.width='1px';el.style.height='1px';
        el.style.overflow='hidden';el.style.clip='rect(0 0 0 0)';el.setAttribute('aria-hidden','true');
        document.body.appendChild(el);
      }
      el.textContent = ${JSON.stringify(text)};
    })();
  `).catch(()=>{});
}
function setFooterChain(chainId: number | null, blockNumber: number | null) {
  const cid = chainId == null ? "" : String(chainId);
  const blk = blockNumber == null ? "" : String(blockNumber);
  setFooterProbe("rpcInfo", `chainId ${cid} block ${blk}`.trim());
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
