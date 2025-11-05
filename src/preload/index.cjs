'use strict';

const { contextBridge, ipcRenderer } = require("electron");
const DEBUG = process.env.DEBUG_PRELOAD === '1' || process.env.NODE_ENV !== 'production';
const dbg = (...a) => { if (DEBUG) console.warn(...a); };

async function safeInvoke(channel, ...args) {
  try {
    const t0 = Date.now();
    const res = await ipcRenderer.invoke(channel, ...args);
    const dt = Date.now() - t0;
    dbg(`[preload] invoke ${channel} (${dt} ms)`);
    return res;
  } catch (e) {
    console.error(`[preload] invoke ${channel} failed:`, e);
    throw e;
  }
}

function on(channel, handler) {
  if (typeof handler !== "function") return () => {};
  const wrapped = (_event, payload) => {
    try { handler(payload); }
    catch (e) { console.error(`[preload] handler for ${channel} failed:`, e); }
  };
  ipcRenderer.on(channel, wrapped);
  return () => ipcRenderer.removeListener(channel, wrapped);
}



contextBridge.exposeInMainWorld("api", {
  getGenesis: (beaconBase) => safeInvoke("beacon:getGenesis", beaconBase),
  getValidator: (beaconBase, id) => safeInvoke("beacon:getValidator", beaconBase, id),
  getHeader: (beaconBase, id) => safeInvoke("beacon:getHeader", beaconBase, id),
  getBlockV2: (beaconBase, id) => safeInvoke("beacon:getBlockV2", beaconBase, id),

  getWithdrawalsStats: (args) => safeInvoke("beacon:getWithdrawalsStats", args),

  postBlsToExec: (beaconBase, payload) => safeInvoke("beacon:postBlsToExec", beaconBase, payload),
  buildBlsToExec: (args) => safeInvoke("bls:buildChange", args),

  scanWithdrawals: (args) => safeInvoke("beacon:scanWithdrawals", args),
  onScannerProgress: (handler) => on("scanner:progress", handler),

  saveJSON: (name, obj) => safeInvoke("file:saveJSON", name, obj),
  saveText: (name, text) => safeInvoke("file:saveText", name, text),

  eip7002GetFee: (rpcUrl) => safeInvoke("eip7002:getFee", rpcUrl),
  eip7002Submit: (args) => safeInvoke("eip7002:submit", args),
  eip7002AddrFromSecret: (args) => safeInvoke("eip7002:addrFromSecret", args),

  eipStaticCall: (args) => safeInvoke("eip:staticcall", args),

  profileGet: () => safeInvoke("profile:get"),
  profileSet: (p) => safeInvoke("profile:set", p),
  lockSet: (args) => safeInvoke("lock:set", args),
  lockVerify: (args) => safeInvoke("lock:verify", args),
  lockStatus: () => safeInvoke("lock:status"),
  navigate: (to) => safeInvoke("app:navigate", to),

  rpcGetInfo: (rpcUrl) => safeInvoke("rpc:getInfo", rpcUrl),

  resetAll: (args) => safeInvoke("reset:all", args),
});

process.nextTick(() => { try { dbg("[preload] ready, api injected"); } catch {} });