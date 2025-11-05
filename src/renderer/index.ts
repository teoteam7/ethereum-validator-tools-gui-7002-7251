export {};

import './authmodal.js';
import './theme-i18n.js';

import './components/dashboard.js';
import './components/eta.js';
import './components/scheduler.js';
import './components/batch.js';
import './components/help.js';
import './components/settings.js';
import './components/payout-rules.js';
import './components/exit-tracker.js';


type Api = {
  getGenesis(beaconBase: string): Promise<any>;
  getValidator(beaconBase: string, id: string): Promise<any>;
  getHeader(beaconBase: string, id: string): Promise<any>;
  getBlockV2(beaconBase: string, id: string): Promise<any>;
  postBlsToExec(beaconBase: string, payload: any): Promise<any>;
  scanWithdrawals(args: {
    beaconBase: string;
    address?: string;
    validatorIndex?: string | number;
    lookback: number;
    start: "head" | number;
  }): Promise<any>;
  buildBlsToExec(args: any): Promise<any>;
  saveJSON(name: string, obj: any): Promise<any>;
  saveText(name: string, text: string): Promise<any>;
  eip7002GetFee(rpcUrl: string): Promise<any>;
  eip7002Submit(args: any): Promise<any>;
  eip7002AddrFromSecret?(args: { secret?: string; privkey?: string; derivationPath?: string }): Promise<{ address: string }>;
  profileGet?(): Promise<{
    pubkey?: string;
    index?: number | string;
    network?: "mainnet" | "holesky";
    beaconUrl?: string;
    rpcUrl?: string;
  } | null>;
  rpcGetInfo?(rpcUrl: string): Promise<{ ok: boolean; chainId: number; blockNumber: number; client?: string | null; latency: number }>;
};

const api = (window as any).api as Api;

const $ = (id: string) => document.getElementById(id) as HTMLInputElement;
const H = (id: string) => document.getElementById(id) as HTMLElement;
const pretty = (o: unknown) => JSON.stringify(o, null, 2);
const sanitizeBase = (u: string) => (!u ? u : (u.endsWith("/") ? u.slice(0, -1) : u));

function setInputValue(id: string, v?: string | number | null) {
  const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
  if (!el) return;
  if (v == null) return;
  el.value = String(v);
}
function setText(id: string, v?: string | number | null) {
  const el = document.getElementById(id) as HTMLElement | null;
  if (!el || v == null) return;
  el.textContent = String(v);
}

function findLabelForInput(inputId: string): HTMLLabelElement | null {
  const input = document.getElementById(inputId);
  if (!input) return null;
  const field = input.closest("div")?.parentElement;
  if (!field) return null;
  const lbl = field.querySelector("label");
  return (lbl as HTMLLabelElement) || null;
}

let lastScan: any[] = [];
let isBusy = false;

let motion: { animate: Function; stagger: Function } | null = null;
async function loadMotion() {
  try {
    motion = (await import('motion')) as any;
  } catch {
    motion = null;
  }
}

type Settings = {
  confirmBeforeSend: boolean;
  maskSensitiveInputs: boolean;
  blockTabSwitchWhileBusy: boolean;
  tooltipDelayMs: number;
  successAutoCloseMs: number;
  defaultLookbackSlots: number;
  persistNodeUrls: boolean;
};

const DEFAULTS: Settings = {
  confirmBeforeSend: true,
  maskSensitiveInputs: true,
  blockTabSwitchWhileBusy: true,
  tooltipDelayMs: 500,
  successAutoCloseMs: 0,
  defaultLookbackSlots: 2048,
  persistNodeUrls: true,
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem("vt.settings");
    if (!raw) return { ...DEFAULTS };
    const j = JSON.parse(raw);
    return { ...DEFAULTS, ...j };
  } catch {
    return { ...DEFAULTS };
  }
}
function saveSettings(s: Settings) {
  localStorage.setItem("vt.settings", JSON.stringify(s));
}
let settings: Settings = loadSettings();

function hideTooltips() {
  const tip = H("tooltip");
  if (tip && !tip.classList.contains("hidden")) tip.classList.add("hidden");
  TipState.clear();
}

function setLoading(on: boolean, label?: string) {
  const scrim = H("loadingScrim");
  const text = H("loadingLabel");
  const nav = document.querySelector(".nav") as HTMLElement | null;
  if (!scrim || !text) return;
  if (label) text.textContent = label;
  if (on) {
    hideTooltips();
    scrim.classList.add("show");
    isBusy = true;
    if (settings.blockTabSwitchWhileBusy) nav?.classList.add("disabled");
  } else {
    scrim.classList.remove("show");
    isBusy = false;
    nav?.classList.remove("disabled");
  }
}

function setLoadingLabel(label: string) {
  const text = H("loadingLabel");
  if (text) text.textContent = label;
}

function showErrorModal(message: string, details?: string, title?: string) {
  const m = H("errorModal");
  const b = H("errorBackdrop");
  const titleEl = H("errorTitle");
  const msgEl = H("errorMessage");
  const detWrap = H("errorDetailsWrap");
  const detPre = H("errorDetails");
  if (!m || !b || !titleEl || !msgEl || !detWrap || !detPre) return;
  titleEl.textContent = title || "Action failed";
  msgEl.textContent = message || "Unknown error";
  if (details && details.trim().length > 0) {
    detWrap.classList.remove("hidden");
    detPre.textContent = details;
  } else {
    detWrap.classList.add("hidden");
    detPre.textContent = "";
  }
  m.classList.add("show");
  b.classList.add("show");
  m.setAttribute("aria-hidden", "false");
}
function closeErrorModal() {
  const m = H("errorModal");
  const b = H("errorBackdrop");
  if (!m || !b) return;
  m.classList.remove("show");
  b.classList.remove("show");
  m.setAttribute("aria-hidden", "true");
}

function notifyError(err: unknown, context?: string) {
  const title = context ? `${context} — error` : "Error";
  type UiErr = { short?: string; details?: string; message?: string; stack?: string };
  const asString = (x: any) => (typeof x === "string" ? x : "");
  const toPretty = (x: any) => {
    try { return typeof x === "string" ? x : pretty(x); } catch { return String(x); }
  };
  const extractByRegex = (src: string, re: RegExp) => {
    const m = src.match(re);
    return m && m[1] ? m[1] : null;
  };
  const shortFromMessage = (msg: string) => {
    const low = msg.toLowerCase();
    if (low.includes("insufficient funds")) return "Insufficient funds: top up the 0x01 address with the fee (msg.value) + gas.";
    if (low.includes("user rejected")) return "Rejected by user.";
    if (low.includes("nonce too low")) return "Nonce too low: there are pending/parallel txs.";
    return msg.length > 180 ? msg.slice(0, 180) + "…" : msg;
  };
  let shortMsg: string | null = null;
  let details = "";
  let rawMessage = "Unknown error";
  if (err && typeof err === "object" && ("short" in (err as any) || "details" in (err as any))) {
    const e = err as UiErr;
    shortMsg = e.short ?? null;
    details = e.details ?? e.stack ?? e.message ?? "";
    rawMessage = e.message || e.short || "Error";
  } else if (typeof err === "string") {
    rawMessage = err;
    details = err;
  } else if (err && typeof err === "object") {
    const e = err as any;
    rawMessage = asString(e?.message) || toPretty(e);
    details = asString(e?.stack) || toPretty(e);
  }
  if (!shortMsg) shortMsg = shortFromMessage(rawMessage);
  const fromAddr = extractByRegex(details + "\n" + rawMessage, /"from"\s*:\s*"(0x[0-9a-fA-F]{40})"/);
  if (shortMsg.startsWith("Insufficient funds") && fromAddr) {
    shortMsg = `Insufficient funds: address ${fromAddr} must have fee (msg.value) + gas.`;
  }
  if (!details || details.trim() === shortMsg.trim()) {
    details = rawMessage;
  }
  showErrorModal(shortMsg, details, title);
}

let successTimer: number | null = null;
function showSuccessModal(contentHtml: string, title?: string, autoCloseMs?: number) {
  const m = H("successModal");
  const b = H("successBackdrop");
  const t = H("successTitle");
  const body = H("successBody");
  if (!m || !b || !t || !body) return;
  t.textContent = title || "Success";
  body.innerHTML = contentHtml;
  m.classList.add("show");
  b.classList.add("show");
  m.setAttribute("aria-hidden", "false");
  const timeout = typeof autoCloseMs === "number" ? autoCloseMs : settings.successAutoCloseMs;
  if (successTimer) window.clearTimeout(successTimer);
  if (timeout > 0) {
    successTimer = window.setTimeout(() => {
      closeSuccessModal();
    }, timeout);
  }
}
function closeSuccessModal() {
  const m = H("successModal");
  const b = H("successBackdrop");
  if (!m || !b) return;
  m.classList.remove("show");
  b.classList.remove("show");
  m.setAttribute("aria-hidden", "true");
  if (successTimer) { window.clearTimeout(successTimer); successTimer = null; }
}

function updateLayoutVars() {
  const header = document.querySelector<HTMLElement>(".topbar");
  const top = header ? header.offsetHeight : 0;
  const workH = Math.max(300, window.innerHeight - top);
  document.documentElement.style.setProperty("--scrim-top", `${top}px`);
  document.documentElement.style.setProperty("--work-h", `${workH}px`);
  const consoleMax = Math.min(520, Math.max(300, Math.round(workH * 0.42)));
  document.documentElement.style.setProperty("--console-maxh", `${consoleMax}px`);
  resizeHelpScroll();
}
function getHelpScrollEl(): HTMLElement | null {
  return document.querySelector(".help-scroll") as HTMLElement | null;
}
function resizeHelpScroll() {
  const ws = document.querySelector(".workspace") as HTMLElement | null;
  const helpScroll = getHelpScrollEl();
  if (!ws || !helpScroll || helpScroll.classList.contains("hidden")) return;
  const rectWS = ws.getBoundingClientRect();
  const rectHS = helpScroll.getBoundingClientRect();
  const avail = Math.max(160, Math.floor(rectWS.bottom - rectHS.top - 16));
  (helpScroll.style as any).height = `${avail}px`;
}

function credsType(wc: string | undefined) {
  if (!wc || !wc.startsWith("0x") || wc.length < 4) return "unknown";
  const pfx = wc.slice(2, 4);
  if (pfx === "00") return "0x00 (BLS)";
  if (pfx === "01") return "0x01 (ETH1 address)";
  if (pfx === "02") return "0x02 (contract / MaxEB)";
  return "unknown";
}
function hexToDec(hex: string | null | undefined): number | null {
  if (!hex) return null;
  try { return parseInt(hex, 16); } catch { return null; }
}
function esc(s: string) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
}

function showTab(name: string) {
  const links = Array.from(document.querySelectorAll<HTMLButtonElement>(".nav button"));
  const tabs = Array.from(document.querySelectorAll<HTMLElement>(".tab"));
  const workspace = document.querySelector(".workspace") as HTMLElement | null;
  const rightrail = document.querySelector(".rightrail") as HTMLElement | null;

  links.forEach(b => b.classList.toggle("active", b.getAttribute("data-tab") === name));
  tabs.forEach(s => s.classList.toggle("hidden", s.id !== `tab-${name}`));

  const fullWidthTabs = new Set(["help","settings","dashboard","exit","payout"]);
  if (fullWidthTabs.has(name)) {
    workspace?.classList.add("onecol");
    if (name === "help") workspace?.classList.add("help-only-scroll");
    else workspace?.classList.remove("help-only-scroll");
    rightrail?.classList.add("hidden");
  } else {
    workspace?.classList.remove("onecol");
    workspace?.classList.remove("help-only-scroll");
    rightrail?.classList.remove("hidden");
  }

  const mapConsole: Record<string, string[]> = {
    dashboard: [],
    bls: ["console-bls"],
    eip7002: ["console-7002"],
    scanner: ["console-overview"],
    watchdog: ["console-watchdog"],
    settings: [],
    help: [],
    eta: [],
    scheduler: [],
    batch: [],
    payout: [],
    exit: []
  };
  const allConsoles = ["console-overview","console-bls","console-7002","console-watchdog"];
  allConsoles.forEach(id => document.getElementById(id)?.classList.add("hidden"));
  (mapConsole[name] || []).forEach(id => document.getElementById(id)?.classList.remove("hidden"));

  const hostIds = ["etaConsoleHost","schedulerConsoleHost","batchConsoleHost"];
  hostIds.forEach(id => document.getElementById(id)?.classList.add("hidden"));
  if (name === "eta") document.getElementById("etaConsoleHost")?.classList.remove("hidden");
  if (name === "scheduler") document.getElementById("schedulerConsoleHost")?.classList.remove("hidden");
  if (name === "batch") document.getElementById("batchConsoleHost")?.classList.remove("hidden");

  document.querySelector("main")?.scrollTo({ top: 0 });

  const motionAny = (window as any).motion;
  if (motionAny) {
    const nodes = document.querySelectorAll(`#tab-${name} input, #tab-${name} select, #tab-${name} .btn, #tab-${name} .title, #tab-${name} table`);
    motionAny?.animate?.(nodes, { opacity: [0, 1], y: [-6, 0] }, { duration: 0.35, delay: motionAny?.stagger?.(0.04) || 0 });
  }

  if (name === "help") {
    const ws = document.querySelector(".workspace") as HTMLElement | null;
    const helpScroll = document.querySelector(".help-scroll") as HTMLElement | null;
    if (ws && helpScroll) {
      const rectWS = ws.getBoundingClientRect();
      const rectHS = helpScroll.getBoundingClientRect();
      const avail = Math.max(160, Math.floor(rectWS.bottom - rectHS.top - 16));
      (helpScroll.style as any).height = `${avail}px`;
    }
  }
}



const TipState = (() => {
  let timer: number | null = null;
  const tip = () => H("tooltip");
  function clear() {
    if (timer) { window.clearTimeout(timer); timer = null; }
    const t = tip();
    if (t && !t.classList.contains("hidden")) t.classList.add("hidden");
  }
  function bindTo(el: HTMLElement) {
    el.addEventListener("mouseenter", (e) => {
      const raw = el.getAttribute("data-tip");
      if (!raw) return;
      const [title, ...rest] = raw.split("|");
      const body = rest.join("|");
      const t = tip();
      if (!t) return;
      t.innerHTML = `<div class="title">${esc(title)}</div>${body ? `<div>${esc(body)}</div>` : ""}`;
      const rect = (e as MouseEvent).clientX ? null : el.getBoundingClientRect();
      const left = (e as MouseEvent).clientX || (rect ? rect.right : 0);
      const top  = (e as MouseEvent).clientY || (rect ? rect.top : 0);
      (t.style as any).left = `${left + 14}px`;
      (t.style as any).top  = `${top  + 18}px`;
      t.classList.remove("hidden");
    });
    el.addEventListener("mouseleave", () => clear());
  }
  return { bindTo, clear };
})();

function initTooltips() {
  const bindAll = () => {
    Array.from(document.querySelectorAll<HTMLElement>("[data-tip]")).forEach(el => TipState.bindTo(el));
  };
  bindAll();
  const mo = new MutationObserver(bindAll);
  mo.observe(document.body, { childList: true, subtree: true });
  document.addEventListener("pointerdown", () => TipState.clear(), true);
  document.addEventListener("wheel", () => TipState.clear(), { passive: true });
  document.addEventListener("scroll", () => TipState.clear(), true);
  document.addEventListener("keydown", () => TipState.clear(), true);
}

function enableGlobalCustomScrollbars() {
  const processed = new WeakSet<HTMLElement>();
  const shouldStyle = (el: Element) => {
    if (!(el instanceof HTMLElement)) return false;
    if (el.classList.contains("help-scroll")) return false;
    const cs = getComputedStyle(el);
    const hasOverflow =
      cs.overflow === "auto" || cs.overflow === "scroll" ||
      cs.overflowY === "auto" || cs.overflowY === "scroll" ||
      cs.overflowX === "auto" || cs.overflowX === "scroll";
    return hasOverflow;
  };
  const MARK_LIMIT = 2000;
  function markTree(root: ParentNode) {
    let count = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let node = walker.currentNode as HTMLElement | null;
    while (node && count < MARK_LIMIT) {
      if (node instanceof HTMLElement && !processed.has(node) && shouldStyle(node)) {
        node.classList.add("custom-scroll");
        processed.add(node);
      }
      count++;
      node = walker.nextNode() as HTMLElement | null;
    }
  }
  function initialPass() {
    const roots: ParentNode[] = [];
    const ws = document.querySelector(".workspace");
    if (ws) roots.push(ws);
    document.querySelectorAll(".console, .modal .box").forEach(el => roots.push(el));
    if (!ws && document.body) roots.push(document.body);
    roots.forEach(r => markTree(r));
  }
  const mo = new MutationObserver((recs) => {
    for (const r of recs) {
      if (r.type === "childList" && (r.addedNodes?.length || 0) > 0) {
        r.addedNodes.forEach(n => {
          if (n instanceof HTMLElement) {
            if (shouldStyle(n) && !processed.has(n)) {
              n.classList.add("custom-scroll");
              processed.add(n);
            }
            markTree(n);
          }
        });
      }
    }
  });
  initialPass();
  mo.observe(document.body || document.documentElement, { childList: true, subtree: true });
  let resizeT: number | null = null;
  window.addEventListener("resize", () => {
    if (resizeT) window.clearTimeout(resizeT);
    resizeT = window.setTimeout(() => {
      initialPass();
      resizeT = null;
    }, 150);
  });
}

function initNav() {
  const links = Array.from(document.querySelectorAll<HTMLButtonElement>(".nav button"));
  links.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (isBusy && settings.blockTabSwitchWhileBusy) { showToast("An operation is in progress—please wait until it finishes"); return; }
      const name = (e.currentTarget as HTMLElement).getAttribute("data-tab") || "overview";
      showTab(name);
    });
  });
  showTab("dashboard");
}

function injectHintStylesOnce() {
  if (document.getElementById("hintIconStyles")) return;
  const css = `
    .hint-icon{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;
      border-radius:50%;font-size:12px;line-height:18px;margin-left:6px;cursor:help;user-select:none;
      border:1px solid var(--c-border, #3a3a3a); opacity:.8}
    .hint-icon:hover{opacity:1}
  `;
  const s = document.createElement("style");
  s.id = "hintIconStyles";
  s.textContent = css;
  document.head.appendChild(s);
}
function ensureScannerHints() {
  injectHintStylesOnce();
  function addIconInInput(inputId: string, tip: string) {
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (!input) return;
    const wrap = input.closest('.input-wrap');
    if (!wrap || wrap.querySelector(`.hint-icon.in-input[data-for='${inputId}']`)) return;
    wrap.classList.add('has-hint');
    const icon = document.createElement('span');
    icon.className = 'hint-icon in-input';
    icon.setAttribute('data-for', inputId);
    icon.setAttribute('data-tip', tip);
    icon.textContent = 'i';
    wrap.appendChild(icon);
  }
  addIconInInput("scanAddr",  "Withdrawal address|0x + 40 hex address that receives withdrawals (0x01/0x02 address).");
  addIconInInput("scanCount", "Lookback (slots)|How many slots to scan backward from the start. 1 slot ≈ 12s. 1h ≈ ~300, 1d ≈ ~7200.");
  addIconInInput("scanStart", "Start slot|Which slot to start from (number) or 'head' — current chain head.");
  addIconInInput("scanValFilter","Validator filter|Optional: index (number) or BLS pubkey (0x + 96 hex). Filters matches.");
}

function showToast(msg: string) {
  const t = H("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1600);
}
function initCopyButtons() {
  Array.from(document.querySelectorAll<HTMLElement>("[data-copy]")).forEach(btn => {
    btn.addEventListener("click", async () => {
      const sel = btn.getAttribute("data-copy");
      if (!sel) return;
      const target = document.querySelector<HTMLElement>(sel);
      if (!target) return;
      const text = target.innerText || target.textContent || "";
      await navigator.clipboard.writeText(text);
      showToast("Copied to clipboard");
    });
  });
}

function applySettings() {
  const sensInputs = Array.from(document.querySelectorAll<HTMLInputElement>("[data-sensitive='true']"));
  sensInputs.forEach(i => { i.type = settings.maskSensitiveInputs ? "password" : "text"; });
  const scanCount = $("scanCount");
  if (scanCount) scanCount.placeholder = String(settings.defaultLookbackSlots);
}
function bindSettingsUi() {
  const legacyPresent =
    document.getElementById("setConfirmSend") ||
    document.getElementById("setMaskSensitive") ||
    document.getElementById("setBlockTabsWhileBusy") ||
    document.getElementById("setPersistNodes") ||
    document.getElementById("setTipDelay") ||
    document.getElementById("setSuccessMs") ||
    document.getElementById("setLookback");
  if (!legacyPresent) {
    window.addEventListener("vt.settings.changed" as any, (e: any) => {
      try {
        const s = e?.detail || {};
        if (typeof s.confirmBeforeSend === "boolean") settings.confirmBeforeSend = s.confirmBeforeSend;
        if (typeof s.maskSensitiveInputs === "boolean") settings.maskSensitiveInputs = s.maskSensitiveInputs;
        if (typeof s.blockTabSwitchWhileRunning === "boolean") settings.blockTabSwitchWhileBusy = s.blockTabSwitchWhileRunning;
        if (typeof s.persistNodeUrls === "boolean") settings.persistNodeUrls = s.persistNodeUrls;
        if (typeof s.tooltipDelayMs === "number") settings.tooltipDelayMs = s.tooltipDelayMs;
        if (typeof s.successAutoCloseMs === "number") settings.successAutoCloseMs = s.successAutoCloseMs;
        else if (typeof s.successAutocloseMs === "number") settings.successAutoCloseMs = s.successAutocloseMs;
        if (typeof s.defaultLookbackSlots === "number") settings.defaultLookbackSlots = s.defaultLookbackSlots;
        saveSettings(settings);
        applySettings();
      } catch {}
    });
    return;
  }
  const el = (id: string) => document.getElementById(id) as HTMLInputElement | null;
  const setConfirm = el("setConfirmSend");
  if (setConfirm) {
    setConfirm.checked = settings.confirmBeforeSend;
    setConfirm.addEventListener("change", (e) => {
      settings.confirmBeforeSend = (e.target as HTMLInputElement).checked; saveSettings(settings);
    });
  }
  const setMask = el("setMaskSensitive");
  if (setMask) {
    setMask.checked = settings.maskSensitiveInputs;
    setMask.addEventListener("change", (e) => {
      settings.maskSensitiveInputs = (e.target as HTMLInputElement).checked; saveSettings(settings); applySettings();
    });
  }
  const setBlock = el("setBlockTabsWhileBusy");
  if (setBlock) {
    setBlock.checked = settings.blockTabSwitchWhileBusy;
    setBlock.addEventListener("change", (e) => {
      settings.blockTabSwitchWhileBusy = (e.target as HTMLInputElement).checked; saveSettings(settings);
    });
  }
  const setPersist = el("setPersistNodes");
  if (setPersist) {
    setPersist.checked = settings.persistNodeUrls;
    setPersist.addEventListener("change", (e) => {
      settings.persistNodeUrls = (e.target as HTMLInputElement).checked; saveSettings(settings);
    });
  }
  const setTip = el("setTipDelay");
  if (setTip) {
    setTip.value = String(settings.tooltipDelayMs);
    setTip.addEventListener("change", (e) => {
      const v = Math.max(0, Number((e.target as HTMLInputElement).value || "0"));
      settings.tooltipDelayMs = v; saveSettings(settings);
    });
  }
  const setSucc = el("setSuccessMs");
  if (setSucc) {
    setSucc.value = String(settings.successAutoCloseMs);
    setSucc.addEventListener("change", (e) => {
      const v = Math.max(0, Number((e.target as HTMLInputElement).value || "0"));
      settings.successAutoCloseMs = v; saveSettings(settings);
    });
  }
  const setLookback = el("setLookback");
  if (setLookback) {
    setLookback.value = String(settings.defaultLookbackSlots);
    setLookback.addEventListener("change", (e) => {
      const v = Math.min(5000, Math.max(1, Number((e.target as HTMLInputElement).value || "2048")));
      settings.defaultLookbackSlots = v; saveSettings(settings); applySettings();
    });
  }
  const btnReset = document.getElementById("btnSettingsReset");
  if (btnReset) {
    btnReset.addEventListener("click", () => {
      settings = { ...DEFAULTS }; saveSettings(settings);
      if (setConfirm) setConfirm.checked = settings.confirmBeforeSend;
      if (setMask) setMask.checked = settings.maskSensitiveInputs;
      if (setBlock) setBlock.checked = settings.blockTabSwitchWhileBusy;
      if (setPersist) setPersist.checked = settings.persistNodeUrls;
      if (setTip) setTip.value = String(settings.tooltipDelayMs);
      if (setSucc) setSucc.value = String(settings.successAutoCloseMs);
      if (setLookback) setLookback.value = String(settings.defaultLookbackSlots);
      applySettings();
      showToast("Settings reset");
    });
  }
}

function confirmModal(title: string, html: string): Promise<boolean> {
  return new Promise((resolve) => {
    const m = H("confirmModal");
    const b = H("confirmBackdrop");
    const t = H("confirmTitle");
    const d = H("confirmBody");
    const cancelBtn = H("confirmCancelBtn");
    const okBtn = H("confirmProceedBtn");
    if (!m || !b || !t || !d || !cancelBtn || !okBtn) return resolve(false);
    t.textContent = title || "Confirm";
    d.innerHTML = html || "";
    const cleanup = () => {
      m.classList.remove("show"); b.classList.remove("show"); m.setAttribute("aria-hidden", "true");
      cancelBtn.removeEventListener("click", onCancel as any);
      okBtn.removeEventListener("click", onOk as any);
      b.removeEventListener("click", onCancel as any);
      document.removeEventListener("keydown", onEsc as any);
    };
    const onCancel = () => { cleanup(); resolve(false); };
    const onOk = () => { cleanup(); resolve(true); };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    cancelBtn.addEventListener("click", onCancel as any, { once: true });
    okBtn.addEventListener("click", onOk as any, { once: true });
    b.addEventListener("click", onCancel as any, { once: true });
    document.addEventListener("keydown", onEsc as any, { once: true });
    m.classList.add("show"); b.classList.add("show"); m.setAttribute("aria-hidden", "false");
  });
}

function bindModalControls() {
  H("errorCloseBtn")?.addEventListener("click", closeErrorModal);
  H("errorBackdrop")?.addEventListener("click", closeErrorModal);
  H("successCloseBtn")?.addEventListener("click", closeSuccessModal);
  H("successBackdrop")?.addEventListener("click", closeSuccessModal);
}

function loadNodeUrls() {
  try {
    const b = localStorage.getItem("vt.node.beaconUrl");
    const r = localStorage.getItem("vt.node.rpcUrl");
    if (b) $("beaconUrl").value = b;
    if (r) $("rpcUrl").value = r;
  } catch {}
}
function bindNodeUrlPersist() {
  const saveIf = () => {
    if (!settings.persistNodeUrls) return;
    localStorage.setItem("vt.node.beaconUrl", $("beaconUrl").value.trim());
    localStorage.setItem("vt.node.rpcUrl", $("rpcUrl").value.trim());
  };
  $("beaconUrl").addEventListener("change", saveIf);
  $("rpcUrl").addEventListener("change", saveIf);
}

const BEACON_MIN_GAP_MS = 450;
let __lastBeaconCall = 0;
let __beaconSeq: Promise<any> = Promise.resolve();
let __warnedTooMany = false;

function withBeaconLimiter<T>(work: () => Promise<T>): Promise<T> {
  const next = __beaconSeq.then(async () => {
    const now = Date.now();
    const wait = Math.max(0, __lastBeaconCall + BEACON_MIN_GAP_MS - now);
    if (wait) await sleep(wait);
    try {
      const r = await work();
      return r;
    } finally {
      __lastBeaconCall = Date.now();
    }
  });
  __beaconSeq = next.catch(() => {});
  return next;
}
function isRetryableBeaconErr(err: any): boolean {
  const msg = String((err && (err.message || err.toString())) || "");
  return /\b429\b|Too Many Requests|ECONNRESET|ETIMEDOUT|NetworkError|EAI_AGAIN|ENETUNREACH|fetch failed|\b5\d\d\b/i.test(msg);
}
async function retry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let last: any;
  for (let i = 0; i <= attempts; i++) {
    try { return await fn(); } catch (e) {
      last = e;
      if (i === attempts || !isRetryableBeaconErr(e)) throw e;
      const delay = Math.min(2600, 600 * (2 ** i)) + (100 + Math.floor(Math.random() * 250));
      await sleep(delay);
    }
  }
  throw last;
}
async function getValidatorSafe(beacon: string, id: string) {
  try {
    return await withBeaconLimiter(() => retry(() => api.getValidator(beacon, id), 3));
  } catch (e) {
    const msg = String((e as any)?.message || e || "");
    if (/\b429\b|Too Many Requests/i.test(msg) && !__warnedTooMany) {
      __warnedTooMany = true;
      showToast("Beacon rate limit (429): populated only known fields; please try again later");
      setTimeout(() => { __warnedTooMany = false; }, 5000);
    }
    throw e;
  }
}

function put(id: string, v?: string, force = false) {
  if (v == null) return;
  const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
  if (!el) return;
  const cur = (el.value ?? "").trim();
  if (force || cur === "") el.value = String(v);
}
function applyProfileIds(pubkey?: string, indexStr?: string, force = false) {
  put("ovPub", pubkey, force);
  put("ovIndex", indexStr, force);
  put("blsPub", pubkey, force);
  put("blsValIndex", indexStr, force);
  put("eip7002Pub", pubkey, force);
  put("wdId", pubkey || indexStr, force);
  put("scanValFilter", indexStr || pubkey, force);
}
function wireOverviewIdSync() {
  const ovPub = document.getElementById("ovPub") as HTMLInputElement | null;
  const ovIndex = document.getElementById("ovIndex") as HTMLInputElement | null;
  if (ovPub) {
    const sync = () => {
      const v = (ovPub.value || "").trim();
      if (v) applyProfileIds(v, undefined, true);
    };
    ovPub.addEventListener("change", sync);
    ovPub.addEventListener("blur", sync);
  }
  if (ovIndex) {
    const sync = () => {
      const v = (ovIndex.value || "").trim();
      if (v) applyProfileIds(undefined, v, true);
    };
    ovIndex.addEventListener("change", sync);
    ovIndex.addEventListener("blur", sync);
  }
}
async function hydrateFromProfile() {
  try {
    if (!api?.profileGet) return;
    const p = await api.profileGet();
    if (!p) {
      (window as any).__VT_PROFILE = null;
      document.dispatchEvent(new CustomEvent("vt:profile", { detail: null }));
      return;
    }
    setInputValue("beaconUrl", p.beaconUrl);
    setInputValue("rpcUrl", p.rpcUrl);
    setInputValue("ovPub", p.pubkey);
    if (p.index != null) setInputValue("ovIndex", String(p.index));
    const idx = p.index != null ? String(p.index) : undefined;
    applyProfileIds(p.pubkey, idx, true);
    if (api?.rpcGetInfo && p.rpcUrl) {
      try {
        const info = await api.rpcGetInfo(p.rpcUrl);
        if (info?.ok) {
          setFooterChain(info.chainId, info.blockNumber);
          setText("chainIdLabel", String(info.chainId));
          setText("blockNumberLabel", String(info.blockNumber));
        }
      } catch {}
    }
    (window as any).__VT_PROFILE = p || null;
    document.dispatchEvent(new CustomEvent("vt:profile", { detail: p || null }));
  } catch {
    (window as any).__VT_PROFILE = null;
    document.dispatchEvent(new CustomEvent("vt:profile", { detail: null }));
  }
}

function setBlsFieldLabels() {
  const lblSk = findLabelForInput("blsSk");
  if (lblSk) lblSk.textContent = "BLS withdrawal privkey (hex, 32 bytes)";
  const lblPub = findLabelForInput("blsPub");
  if (lblPub) lblPub.textContent = "Validator BLS pubkey (48 bytes, 0x + 96 hex)";
  const lblIdx = findLabelForInput("blsValIndex");
  if (lblIdx) lblIdx.textContent = "Validator index";
  const vi = $("blsValIndex"); if (vi) vi.placeholder = "e.g. 123456";
  const pk = $("blsSk"); if (pk) pk.placeholder = "0x… (32 bytes)";
  const pb = $("blsPub"); if (pb) pb.placeholder = "0x… (96 hex)";
}

let __syncLock = false;
const debounce = (fn: any, ms = 300) => {
  let t: any;
  return (...a: any[]) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};
function norm0x(s: string){ return s ? (s.startsWith("0x")?s:("0x"+s)) : s; }
type ValId = { kind: "index" | "pubkey"; value: string };
type ResolvedVal = { index: string; pubkey?: string; withdrawal: string | null };
function parseValidatorId(raw: unknown): ValId | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) return { kind: "index", value: s };
  if (/^0x[0-9a-fA-F]{96}$/.test(s)) return { kind: "pubkey", value: s };
  if (/^[0-9a-fA-F]{96}$/.test(s))   return { kind: "pubkey", value: "0x" + s };
  return null;
}
const __resolveCache = new Map<string, Promise<ResolvedVal>>();
async function resolveValidatorFull(id: unknown): Promise<ResolvedVal> {
  const beacon = ($("beaconUrl")?.value || "").trim();
  if (!beacon) throw new Error("Beacon URL is empty");
  const parsed = parseValidatorId(id);
  if (!parsed) throw new Error("Bad validator id: need index (digits) or pubkey (0x + 96 hex)");
  const key = parsed.kind + "|" + parsed.value.toLowerCase();
  if (__resolveCache.has(key)) return __resolveCache.get(key)!;
  const run = (async () => {
    const q = parsed.value;
    const res = await getValidatorSafe(beacon, q);
    const d = res?.data || res?.data?.data || res || {};
    const v = d.validator || d.data?.validator || {};
    const indexRaw = d.index ?? d.data?.index;
    const index = indexRaw != null ? String(indexRaw) : "";
    const pubkey = typeof v.pubkey === "string" ? v.pubkey : undefined;
    const wc = v.withdrawal_credentials;
    let withdrawal: string | null = null;
    if (typeof wc === "string" && wc.length === 66 && (wc.startsWith("0x01") || wc.startsWith("0x02"))) {
      withdrawal = "0x" + wc.slice(26, 66);
    }
    const out: ResolvedVal = { index, pubkey, withdrawal };
    if (index) __resolveCache.set("index|" + index, Promise.resolve(out));
    if (pubkey) __resolveCache.set("pubkey|" + pubkey.toLowerCase(), Promise.resolve(out));
    return out;
  })();
  __resolveCache.set(key, run);
  try {
    const out = await run;
    __resolveCache.set(key, Promise.resolve(out));
    return out;
  } catch (e) {
    __resolveCache.delete(key);
    throw e;
  }
}
function setVal(id: string, val: string | undefined | null){
  const el = document.getElementById(id) as HTMLInputElement | null;
  if(!el) return;
  const newVal = String(val ?? "");
  if(el.value === newVal) return;
  __syncLock = true;
  el.value = newVal;
  __syncLock = false;
}
function broadcastValidator(payload: ResolvedVal){
  const { index, pubkey, withdrawal } = payload;
  ["blsValIndex","ovIndex"].forEach(id => setVal(id, index));
  ["blsPub","ovPub","eip7002Pub","scanValFilter","wdId"].forEach(id => setVal(id, pubkey || index));
  if (withdrawal){
    ["execAddr","scanAddr","elAddr"].forEach(id => setVal(id, withdrawal));
  }
}
function wireIndexPubkeyPair(indexId: string, pubId: string){
  const idx = document.getElementById(indexId) as HTMLInputElement | null;
  const pub = document.getElementById(pubId)  as HTMLInputElement | null;
  if(!idx || !pub) return;
  const onIdx = debounce(async ()=>{
    if(__syncLock) return;
    const val = (idx.value||"").trim();
    if(!/^\d+$/.test(val)) return;
    try{
      const data = await resolveValidatorFull(val);
      broadcastValidator(data);
    }catch{}
  }, 280);
  const onPub = debounce(async ()=>{
    if(__syncLock) return;
    const raw = (pub.value||"").trim();
    const parsed = parseValidatorId(raw);
    if(!parsed || parsed.kind !== "pubkey") return;
    try{
      const data = await resolveValidatorFull(parsed.value);
      broadcastValidator(data);
    }catch{}
  }, 280);
  idx.addEventListener("input", onIdx);
  idx.addEventListener("blur",  onIdx);
  pub.addEventListener("input", onPub);
  pub.addEventListener("blur",  onPub);
}

async function autofillFromProfileAndResolve(){
  try{
    const p = (await api.profileGet?.()) || (window as any).__VT_PROFILE || null;
    if(!p) return;
    const seed = p.pubkey ?? p.index;
    const parsed = parseValidatorId(seed);
    if(!parsed) return;
    try {
      const data = await resolveValidatorFull(parsed.value);
      broadcastValidator(data);
    } catch (e) {
      const fallback: ResolvedVal = {
        index: parsed.kind === "index" ? parsed.value : "",
        pubkey: parsed.kind === "pubkey" ? parsed.value : undefined,
        withdrawal: null
      };
      broadcastValidator(fallback);
    }
  }catch{}
}

async function onBuildBls() {
  await withUiTask("BLS → 0x01 › Build & Sign", async () => {
    const netEl = document.getElementById("network") as HTMLSelectElement | null;
    if (!netEl) { H("blsOut").textContent = "select#network not found"; return; }
    const network = netEl.value as "mainnet" | "holesky";
    const beacon = sanitizeBase(($("beaconUrl")?.value || "").trim());
    const validatorIndexRaw = $("blsValIndex").value.trim();
    const fromBlsPubkeyRaw = $("blsPub").value.trim();
    const toExecutionAddress = $("execAddr").value.trim();
    const blsWithdrawalPrivkey = $("blsSk").value.trim();
    const overrideGenesisRoot = $("gvr").value.trim();
    const hasIndex = !!validatorIndexRaw;
    const hasPub   = !!fromBlsPubkeyRaw;
    if (!toExecutionAddress || !blsWithdrawalPrivkey) {
      H("blsOut").textContent = "Required: execution address and BLS withdrawal privkey (hex).";
      return;
    }
    if (!hasIndex && !hasPub) {
      H("blsOut").textContent = "Provide either Validator index OR BLS pubkey (48 bytes).";
      return;
    }
    if (!beacon) {
      H("blsOut").textContent = "Beacon URL is required to resolve missing index/pubkey.";
      return;
    }
    const as0x = (s: string) => (s.startsWith("0x") ? s : ("0x" + s));
    const normPub = hasPub ? as0x(fromBlsPubkeyRaw) : "";
    let validatorIndex = validatorIndexRaw;
    let fromBlsPubkey = normPub;
    try {
      if (hasPub && !hasIndex) {
        const data = await resolveValidatorFull(normPub);
        validatorIndex = data.index;
      } else if (!hasPub && hasIndex) {
        const data = await resolveValidatorFull(validatorIndexRaw);
        if (!data.pubkey) throw new Error("Unable to resolve BLS pubkey from index");
        fromBlsPubkey = data.pubkey;
      }
    } catch (e: any) {
      H("blsOut").textContent = "Resolution error: " + (e?.message || String(e));
      return;
    }
    const vhex = fromBlsPubkey.replace(/^0x/i, "");
    if (vhex.length !== 96) {
      H("blsOut").textContent = "Validator pubkey must be 48 bytes hex (96 chars).";
      return;
    }
    if (!validatorIndex) {
      H("blsOut").textContent = "Validator index is missing after resolution.";
      return;
    }
    const signed = await api.buildBlsToExec({
      network,
      validatorIndex,
      fromBlsPubkey,
      toExecutionAddress,
      blsWithdrawalPrivkey,
      overrideGenesisRoot,
    });
    (window as any)._lastSignedBls = signed;
    H("blsOut").textContent = pretty(signed);
  });
}
async function onSaveBls() {
  await withUiTask("BLS → 0x01 › Export JSON", async () => {
    const signed = (window as any)._lastSignedBls;
    if (!signed) { H("blsOut").textContent = "Build & sign first"; return; }
    await api.saveJSON("bls_to_execution_changes.json", { data: [signed] });
    showToast("Saved bls_to_execution_changes.json");
  });
}
async function onPostBls() {
  await withUiTask("BLS → 0x01 › Broadcast", async () => {
    const beacon = sanitizeBase($("beaconUrl").value);
    const signed = (window as any)._lastSignedBls;
    if (!beacon || !signed) { H("blsOut").textContent = "Need Beacon URL and signature"; return; }
    if (settings.confirmBeforeSend) {
      const html = `Send <b>BLS → 0x01</b> to the node pool:<br><code>${esc(beacon)}/eth/v1/beacon/pool/bls_to_execution_changes</code>`;
      const ok = await confirmModal("Broadcast BLS → 0x01", html);
      if (!ok) return;
    }
    try {
      const res = await api.postBlsToExec(beacon, { data: [signed] });
      H("blsOut").textContent = "Broadcast: " + pretty(res);
    } catch (e: any) {
      H("blsOut").textContent = "Broadcast error: " + e.message;
      throw e;
    }
  });
}

async function onFee() {
  await withUiTask("EIP-7002 › Get fee", async () => {
    const rpcUrl = $("rpcUrl").value.trim();
    if (!rpcUrl) { H("w7002Out").textContent = "Set Execution RPC URL"; return; }
    const formatUnits = (value: bigint, decimals: number): string => {
      const neg = value < 0n; let v = neg ? -value : value;
      const base = 10n ** BigInt(decimals);
      const i = v / base;
      const f = v % base;
      let frac = f.toString().padStart(decimals, "0").replace(/0+$/, "");
      return (neg ? "-" : "") + i.toString() + (frac ? "." + frac : "");
    };
    const rpcCall = async (method: string, params: any[] = []) => {
      const r = await fetch(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      const j = await r.json();
      if (j?.error) throw new Error(j.error?.message || "RPC error");
      return j.result;
    };
    const feeWeiStr = await api.eip7002GetFee(rpcUrl);
    const feeWei = BigInt(feeWeiStr || "0");
    const feeGwei = formatUnits(feeWei, 9);
    const feeEth  = formatUnits(feeWei, 18);
    let netLine = "";
    try {
      const chainHex = await rpcCall("eth_chainId");
      const chainId = parseInt(String(chainHex), 16);
      setFooterChain(chainId ?? null, null);
      const netEl = document.getElementById("network") as HTMLSelectElement | null;
      const selected = (netEl?.value || "mainnet") as "mainnet" | "holesky";
      const expected = selected === "mainnet" ? 1 : 17000;
      const ok = chainId === expected;
      netLine = ok
        ? `RPC network: chainId ${chainId} • OK`
        : `RPC network: chainId ${chainId} • WARNING: expected ${expected} (${selected})`;
    } catch (e: any) {
      netLine = `RPC network: check failed (${e?.message || "error"})`;
    }
    const out = [
      "EIP-7002 fee (msg.value requirement):",
      `  wei : ${feeWei.toString()}`,
      `  gwei: ${feeGwei}`,
      `  ETH : ${feeEth}`,
      "",
      netLine,
      "",
      "Note:",
      "  • This value must be provided as msg.value when submitting EIP-7002.",
      "  • Gas for the transaction is paid separately.",
    ].join("\n");
    H("w7002Out").textContent = out;
  });
}
async function onSubmit7002() {
  await withUiTask("EIP-7002 › Submit", async () => {
    const rpcUrl = $("rpcUrl").value.trim();
    const secret = $("eoaSk").value.trim();
    const validatorPubkey = $("eip7002Pub").value.trim();
    const amountGwei = $("eip7002Amt").value.trim() || "0";
    const beacon = ($("beaconUrl").value || "").trim();
    if (!rpcUrl) { notifyError("Execution RPC URL is required", "EIP-7002 › Submit"); return; }
    if (!secret) { notifyError("EOA secret is required: private key (0x…) OR 12/24-word mnemonic.", "EIP-7002 › Submit"); return; }
    if (!validatorPubkey) { notifyError("Validator BLS pubkey (48 bytes) is required.", "EIP-7002 › Submit"); return; }
    const vhex = validatorPubkey.startsWith("0x") ? validatorPubkey.slice(2) : validatorPubkey;
    if (vhex.length !== 96) { notifyError("Validator pubkey must be 48 bytes hex (96 chars).", "EIP-7002 › Submit"); return; }
    try {
      const who = await (api as any).eip7002AddrFromSecret?.({ secret });
      const fromAddr = String(who?.address || "");
      if (!fromAddr) { notifyError("Failed to derive sender address from secret.", "EIP-7002 › Submit"); return; }
      if (!beacon) { notifyError("Beacon URL is required to verify withdrawal address.", "EIP-7002 › Submit"); return; }
      const v = await getValidatorSafe(beacon, "0x" + vhex);
      const wc = v?.data?.validator?.withdrawal_credentials || v?.data?.data?.validator?.withdrawal_credentials;
      if (!wc || typeof wc !== "string" || wc.length !== 66) {
        notifyError("Unable to read validator withdrawal_credentials from Beacon.", "EIP-7002 › Submit");
        return;
      }
      if (!wc.startsWith("0x01")) {
        notifyError("Validator does not have 0x01 withdrawal credentials. EIP-7002 requires 0x01.", "EIP-7002 › Submit");
        return;
      }
      const addrHex = "0x" + wc.slice(26, 66);
      if (addrHex.toLowerCase() !== fromAddr.toLowerCase()) {
        notifyError(
          {
            short: "Incorrect secret: EOA does not match validator's 0x01 address.",
            details: `Sender ${fromAddr} ≠ validator 0x01 address ${addrHex}. Use the correct withdrawal EOA.`,
          },
          "EIP-7002 › Submit"
        );
        return;
      }
    } catch (e) {
      notifyError(e, "EIP-7002 › Preflight");
      return;
    }
    if (settings.confirmBeforeSend) {
      const html = `Send <b>EIP-7002</b> tx to predeploy:<br><code>0x00000961Ef480Eb55e80D19ad83579A64c007002</code><br/>Calldata: pubkey(48b)+amount(${esc(amountGwei)} Gwei)`;
      const ok = await confirmModal("Submit EIP-7002", html);
      if (!ok) return;
    }
    const res = await api.eip7002Submit({ rpcUrl, secret, validatorPubkey, amountGwei });
    H("w7002Out").textContent = pretty(res);
  });
}

const raf = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

async function onScan() {
  await withUiTask("Scanner › Scan", async () => {
    const beacon = sanitizeBase(($("beaconUrl") as HTMLInputElement).value);
    const addr = (($("scanAddr") as HTMLInputElement).value || "").trim().toLowerCase();
    const lookbackRaw = ($("scanCount") as HTMLInputElement).value.trim();
    const lookbackTotalInput = Number(lookbackRaw || String(settings.defaultLookbackSlots || 2048));
    const startStr = ($("scanStart") as HTMLInputElement).value.trim() || "head";
    const valFilterRaw = ($("scanValFilter") as HTMLInputElement)?.value?.trim() || "";
    let filterValidatorIndex: number | null = null;
    const summary = H("scanSummary");
    const outEl = H("ovOut");
    if (outEl) outEl.textContent = "";
    if (!beacon) { summary.textContent = "Set Beacon URL."; return; }
    if (!addr)    { summary.textContent = "Set withdrawal address."; return; }
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) { summary.textContent = "Bad address format (need 0x…40 hex)."; return; }
    if (valFilterRaw) {
      const isNumber = /^\d+$/.test(valFilterRaw);
      const isHex96  = /^0x[0-9a-fA-F]{96}$/.test(valFilterRaw) || /^[0-9a-fA-F]{96}$/.test(valFilterRaw);
      if (isNumber) {
        filterValidatorIndex = Number(valFilterRaw);
      } else if (isHex96) {
        const hex = valFilterRaw.startsWith("0x") ? valFilterRaw : ("0x" + valFilterRaw);
        try {
          const v = await getValidatorSafe(beacon, hex);
          const idx = v?.data?.index ?? v?.data?.data?.index;
          if (idx == null) { notifyError({ short: "Failed to resolve pubkey → validator index." }, "Scanner › Validator filter"); return; }
          filterValidatorIndex = Number(idx);
          if (!Number.isFinite(filterValidatorIndex)) { notifyError({ short: "Invalid validator index after resolving pubkey." }, "Scanner › Validator filter"); return; }
        } catch (e: any) {
          notifyError(e, "Scanner › Validator filter");
          return;
        }
      } else {
        notifyError({ short: "Enter a number (index) or 0x + 96 hex (BLS pubkey)." }, "Scanner › Validator filter");
        return;
      }
    }
    lastScan = [];
    let totalGwei = 0n;
    const tbody = document.querySelector<HTMLTableSectionElement>("#scanTable tbody")!;
    if (tbody) tbody.innerHTML = "";
    const formatUnits = (value: bigint, decimals: number): string => {
      const neg = value < 0n; let v = neg ? -value : value;
      const base = 10n ** BigInt(decimals);
      const i = v / base;
      const f = v % base;
      let frac = f.toString().padStart(decimals, "0").replace(/0+$/, "");
      return (neg ? "-" : "") + i.toString() + (frac ? "." + frac : "");
    };
    const gweiToEth = (gwei: bigint) => formatUnits(gwei * 1_000_000_000n, 18);
    const trimDecimals = (s: string, max: number): string => {
      if (!s.includes(".")) return s;
      const [i, f] = s.split(".");
      const t = f.slice(0, Math.max(0, max)).replace(/0+$/, "");
      return t ? `${i}.${t}` : i;
    };
    let currentStart: "head" | number = (startStr.toLowerCase() === "head") ? "head" : Number(startStr);
    if (typeof currentStart === "number" && (!Number.isFinite(currentStart) || currentStart <= 0)) {
      summary.textContent = "Bad start slot."; return;
    }
    let headSlot: number | null = null;
    try {
      const head = await api.getHeader(beacon, "head");
      headSlot = Number(head?.data?.header?.message?.slot ?? head?.data?.slot ?? head?.slot ?? null);
      setFooterHead(headSlot);
    } catch {}
    const lookbackTotal = headSlot ? Math.min(lookbackTotalInput, headSlot) : lookbackTotalInput;
    const chooseBatch = (total: number) => {
      if (total >= 8192) return 1024;
      if (total >= 4096) return 512;
      if (total >= 1024) return 256;
      return 128;
    };
    let remaining = Math.max(1, Math.min(100_000, lookbackTotal));
    const BATCH = chooseBatch(remaining);
    setLoading(true, `Scanner › Scan (0/${lookbackTotal})`);
    let visScanned = 0;
    let targetScanned = 0;
    let progressRAF = 0;
    const progressLoop = () => {
      if (visScanned < targetScanned) {
        visScanned += 1;
        setLoadingLabel(`Scanner › Scan (${visScanned}/${lookbackTotal})`);
        progressRAF = requestAnimationFrame(progressLoop);
      } else {
        progressRAF = 0;
      }
    };
    const bumpProgress = (to: number) => {
      targetScanned = Math.max(targetScanned, to);
      if (!progressRAF) progressRAF = requestAnimationFrame(progressLoop);
    };
    const finishProgress = (to: number) => {
      targetScanned = to;
      visScanned = to;
      setLoadingLabel(`Scanner › Scan (${visScanned}/${lookbackTotal})`);
      if (progressRAF) cancelAnimationFrame(progressRAF);
      progressRAF = 0;
    };
    async function appendRowsChunked(matches: any[]) {
      if (!tbody || matches.length === 0) return;
      const CHUNK = 200;
      let i = 0;
      while (i < matches.length) {
        const frag = document.createDocumentFragment();
        for (let j = 0; j < CHUNK && i < matches.length; j++, i++) {
          const r = matches[i];
          const gwei = BigInt(r.amount_gwei || "0");
          const ethShort = trimDecimals(gweiToEth(gwei), 6);
          r.amount_eth = ethShort;
          const tr = document.createElement("tr");
          tr.innerHTML =
            `<td>${r.slot}</td>` +
            `<td>${r.index ?? ""}</td>` +
            `<td>${r.validator_index ?? ""}</td>` +
            `<td>${r.amount_gwei ?? ""}</td>` +
            `<td>${ethShort}</td>` +
            `<td>${r.address ?? ""}</td>`;
          frag.appendChild(tr);
        }
        tbody.appendChild(frag);
        await raf();
      }
    }
    let totalScanned = 0;
    while (remaining > 0) {
      const ask = Math.min(BATCH, remaining);
      setLoadingLabel(`Scanner › Scan (${visScanned}/${lookbackTotal})`);
      let res: any;
      const t0 = performance.now();
      try {
        res = await api.scanWithdrawals({
          beaconBase: beacon,
          address: addr,
          lookback: ask,
          start: currentStart,
          validatorIndex: filterValidatorIndex ?? undefined,
        });
      } catch (e) {
        notifyError(e, "Scanner › Scan");
        break;
      }
      const dt = Math.round(performance.now() - t0);
      const scannedNow = Number(res?.scanned || ask);
      const rawMatches: any[] = Array.isArray(res?.matches) ? res.matches : [];
      for (const m of rawMatches) {
        try { totalGwei += BigInt(m.amount_gwei || "0"); } catch {}
      }
      lastScan.push(...rawMatches);
      await appendRowsChunked(rawMatches);
      totalScanned += scannedNow;
      bumpProgress(totalScanned);
      const totalEthStr = trimDecimals(gweiToEth(totalGwei), 6);
      if (summary) {
        summary.textContent =
          `Scanned ${totalScanned}/${lookbackTotal} slots from start=${res?.startSlot}. ` +
          `Matches: ${lastScan.length}. Total: ${totalGwei} gwei (${totalEthStr} ETH).` +
          ` (batch ${dt} ms${res?.timedOut ? ", partial due to timeout" : ""})`;
      }
      if (outEl) outEl.textContent = summary?.textContent || "";
      remaining -= scannedNow;
      if (remaining <= 0) break;
      if (currentStart === "head") {
        currentStart = Number(res?.startSlot) - scannedNow;
      } else {
        currentStart = Number(currentStart) - scannedNow;
      }
      if (!Number.isFinite(currentStart) || Number(currentStart) <= 0) break;
    }
    finishProgress(totalScanned);
    setLoadingLabel(`Scanner › Done (${totalScanned}/${lookbackTotal})`);
    await sleep(150);
    setLoading(false);
  });
}
async function onScanExport() {
  await withUiTask("Scanner › Export CSV", async () => {
    if (!lastScan || lastScan.length === 0) { showToast("Nothing to export"); return; }
    const header = "slot,withdrawal_index,validator_index,amount_gwei,amount_eth,address\n";
    const rows = lastScan.map(r => {
      const eth = (typeof r.amount_eth === "string") ? r.amount_eth : "";
      return `${r.slot},${r.index ?? ""},${r.validator_index ?? ""},${r.amount_gwei ?? ""},${eth},${r.address ?? ""}`;
    }).join("\n");
    await api.saveText("withdrawals.csv", header + rows);
    showToast("CSV saved");
  });
}

async function onWatchdog() {
  await withUiTask("Watchdog › Check", async () => {
    const beacon = sanitizeBase($("beaconUrl").value);
    const rpcUrl = $("rpcUrl").value.trim();
    const id = $("wdId").value.trim();
    if (!beacon || !id) {
      H("wdOut").textContent = "Please set Beacon URL and validator id.";
      return;
    }
    const v = await getValidatorSafe(beacon, id);
    const d = v?.data;
    const val = d?.validator ?? d?.data?.validator ?? {};
    const wc = (val?.withdrawal_credentials ?? "") as string;
    const wcType = credsType(wc);
    let withdrawal_address: string | null = null;
    if (typeof wc === "string" && wc.length === 66 && (wc.startsWith("0x01") || wc.startsWith("0x02"))) {
      withdrawal_address = "0x" + wc.slice(26, 66);
    }
    const formatUnits = (value: bigint, decimals: number): string => {
      const neg = value < 0n; let v = neg ? -value : value;
      const base = 10n ** BigInt(decimals);
      const i = v / base;
      const f = v % base;
      let frac = f.toString().padStart(decimals, "0").replace(/0+$/, "");
      return (neg ? "-" : "") + i.toString() + (frac ? "." + frac : "");
    };
    const trimDecimals = (s: string, max: number): string => {
      if (!s.includes(".")) return s;
      const [i, f] = s.split(".");
      const t = f.slice(0, Math.max(0, max)).replace(/0+$/, "");
      return t ? `${i}.${t}` : i;
    };
    const gweiStrToEthShort = (gwei: string): string => {
      try {
        const eth = formatUnits(BigInt(gwei) * 1_000_000_000n, 18);
        return trimDecimals(eth, 6);
      } catch { return ""; }
    };
    let el_balance_wei: string | null = null;
    let el_balance_eth_full: string | null = null;
    let el_balance_eth_short: string | null = null;
    let el_balance_wei_compact: string | null = null;
    if (rpcUrl && withdrawal_address) {
      try {
        const res = await fetch(rpcUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "eth_getBalance",
            params: [withdrawal_address, "latest"],
          }),
        });
        const j = await res.json();
        if (!j?.error && typeof j?.result === "string") {
          const wei = BigInt(j.result);
          el_balance_wei = wei.toString();
          el_balance_eth_full = formatUnits(wei, 18);
          el_balance_eth_short = trimDecimals(el_balance_eth_full, 6);
          el_balance_wei_compact = (() => {
            const s = wei.toString();
            if (s.length <= 12) return s;
            const mant = s.slice(0, 1) + (s.length > 1 ? "." + s.slice(1, 4) : "");
            const exp = s.length - 1;
            return `${mant}e${exp}`;
          })();
        }
      } catch {}
    }
    const effective_gwei = String(val?.effective_balance ?? "");
    const effective_eth_short = gweiStrToEthShort(effective_gwei);
    const info = {
      index: d?.index ?? d?.data?.index,
      status: d?.status,
      slashed: val?.slashed,
      effective_balance_gwei: effective_gwei,
      withdrawal_credentials: wc,
      withdrawal_creds_type: wcType,
      withdrawal_address,
      el_balance_wei,
      el_balance_wei_compact,
      el_balance_eth: el_balance_eth_full,
      el_balance_eth_short,
      pubkey: val?.pubkey,
      activation_epoch: val?.activation_epoch,
      exit_epoch: val?.exit_epoch,
      withdrawable_epoch: val?.withdrawable_epoch,
    };
    const summarize = () => {
      const idx = String(info.index ?? "—");
      const status = String(info.status ?? "—");
      const sl = info.slashed ? " • SLASHED" : "";
      const wcLine = `${info.withdrawal_creds_type || "unknown"}`;
      const waddr = info.withdrawal_address ? String(info.withdrawal_address) : "—";
      const elBal = (info.el_balance_eth_short && info.el_balance_wei_compact)
        ? `${info.el_balance_eth_short} ETH (${info.el_balance_wei_compact} wei)`
        : (info.el_balance_eth_short ? `${info.el_balance_eth_short} ETH` : "—");
      const eff = effective_eth_short
        ? `${effective_eth_short} ETH (${info.effective_balance_gwei} Gwei)`
        : `${info.effective_balance_gwei ?? "—"} Gwei`;
      const lines = [
        "┌──────────────────────── Watchdog ────────────────────────",
        `│ Index: ${idx}  •  Status: ${status}${sl}`,
        `│ Withdrawal creds: ${wcLine}`,
        `│ 0x01/0x02 address: ${waddr}`,
        `│ EL balance: ${elBal}`,
        `│ Effective balance: ${eff}`,
        "└──────────────────────────────────────────────────────────",
      ];
      return lines.join("\n");
    };
    H("wdOut").textContent = summarize() + "\n\n" + pretty(info);
  });
}

function setInlineStatus(which: "beacon"|"rpc", ok: boolean, labelExtra?: string) {
  const chip = H(which === "beacon" ? "beaconStatus" : "rpcStatus");
  const input = which === "beacon" ? $("beaconUrl") : $("rpcUrl");
  if (!chip || !input) return;
  input.classList.add("has-status");
  chip.classList.remove("hidden", "ok", "danger");
  chip.classList.add(ok ? "ok" : "danger");
  const iconOk = `<svg class="icon" viewBox="0 0 24 24"><path d="M4 12l6 6L20 6"/></svg>`;
  const iconFail = `<svg class="icon" viewBox="0 0 24 24"><path d="M6 6l12 12M6 18L18 6"/></svg>`;
  chip.innerHTML = (ok ? iconOk + "OK" : iconFail + "FAIL") + (labelExtra ? `&nbsp;${esc(labelExtra)}` : "");
}
async function onCheckNodes() {
  await withUiTask("Nodes › Check", async () => {
    const beaconBase = sanitizeBase($("beaconUrl").value);
    const rpcUrl = $("rpcUrl").value.trim();
    async function checkBeacon(base: string) {
      if (!base) throw new Error("Beacon URL not set");
      let ok = false, latency = 0, gvr = "", headSlot = "", httpCode = 0;
      try {
        const t0 = performance.now();
        const r = await fetch(new URL("/eth/v1/node/health", base).toString(), { method: "GET" });
        const t1 = performance.now();
        latency = Math.round(t1 - t0);
        httpCode = r.status;
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        ok = true;
      } catch {
        const t0 = performance.now();
        const r2 = await fetch(new URL("/eth/v1/beacon/genesis", base).toString(), { method: "GET" });
        const t1 = performance.now();
        latency = Math.round(t1 - t0);
        httpCode = r2.status;
        if (!r2.ok) throw new Error(`HTTP ${r2.status}`);
        const j = await r2.json().catch(() => ({}));
        gvr = j?.data?.genesis_validators_root || "";
        ok = true;
      }
      try {
        const r = await fetch(new URL("/eth/v1/beacon/headers/head", base).toString());
        const j = await r.json().catch(() => ({}));
        headSlot = j?.data?.header?.message?.slot || j?.data?.slot || "";
      } catch {}
      return { ok, latency, httpCode, gvr, headSlot };
    }
    async function rpcCall(url: string, method: string, params: any[] = []) {
      const t0 = performance.now();
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      const t1 = performance.now();
      const latency = Math.round(t1 - t0);
      const j = await r.json();
      if (j?.error) throw new Error(j?.error?.message || "RPC error");
      return { result: j?.result, latency };
    }
    async function checkRpc(url: string) {
      if (!url) throw new Error("RPC URL not set");
      const chain = await rpcCall(url, "eth_chainId");
      const block = await rpcCall(url, "eth_blockNumber");
      let client: string | null = null;
      try {
        const ver = await rpcCall(url, "web3_clientVersion");
        client = typeof ver.result === "string" ? ver.result : null;
      } catch { client = null; }
      return {
        ok: true,
        chainIdHex: chain.result as string,
        chainId: hexToDec(chain.result as string),
        blockHex: block.result as string,
        blockNumber: hexToDec(block.result as string),
        latency: block.latency,
        client,
      };
    }
    let beaconRes: any = null, beaconErr: any = null;
    let rpcRes: any = null, rpcErr: any = null;
    try { beaconRes = await checkBeacon(beaconBase); } catch (err) { beaconErr = err; }
    try { rpcRes = await checkRpc(rpcUrl); } catch (err) { rpcErr = err; }
    if (beaconRes?.headSlot) setFooterHead(beaconRes.headSlot);
    if (rpcRes?.chainId != null || rpcRes?.blockNumber != null) {
      setFooterChain(rpcRes?.chainId ?? null, rpcRes?.blockNumber ?? null);
    }
    if (beaconRes && beaconRes.ok) setInlineStatus("beacon", true);
    else setInlineStatus("beacon", false);
    if (rpcRes && rpcRes.ok) setInlineStatus("rpc", true);
    else setInlineStatus("rpc", false);
    if (beaconRes?.ok && rpcRes?.ok) {
      const lines = [
        `<b>Beacon</b> • latency ${beaconRes.latency} ms` + (beaconRes.headSlot ? ` • head #${beaconRes.headSlot}` : ""),
        `<b>RPC</b> • chainId ${esc(String(rpcRes.chainId))} • block ${esc(String(rpcRes.blockNumber))} • latency ${rpcRes.latency} ms` + (rpcRes.client ? ` • ${esc(rpcRes.client)}` : ""),
      ];
showSuccessModal(lines.join("\n"), "Nodes are healthy");
    } else {
      const parts: string[] = [];
      if (!beaconRes?.ok) {
        const msg = (beaconErr && (beaconErr as any).message) ? String((beaconErr as any).message) : "Beacon error";
        parts.push(`Beacon • ${msg}`);
      }
      if (!rpcRes?.ok) {
        const msg = (rpcErr && (rpcErr as any).message) ? String((rpcErr as any).message) : "RPC error";
        parts.push(`RPC • ${msg}`);
      }
      notifyError(parts.join("\n"), "Nodes › Check");
    }
  });
}

async function withUiTask<T>(label: string, fn: () => Promise<T>): Promise<T | undefined> {
  setLoading(true, label);
  try {
    const v = await fn();
    return v;
  } catch (e) {
    notifyError(e, label);
    return undefined;
  } finally {
    setLoading(false);
  }
}

;(window as any).showErrorModal    = showErrorModal;
;(window as any).notifyError       = notifyError;
;(window as any).confirmModal      = confirmModal;
;(window as any).withUiTask        = withUiTask;
;(window as any).setLoading        = setLoading;
;(window as any).showSuccessModal  = showSuccessModal;


function flipConsoleTo(which: "overview" | "bls" | "7002" | "watchdog" | "scanner") {
  const all = ["console-overview","console-bls","console-7002","console-watchdog"];
  all.forEach(id => H(id)?.classList.add("hidden"));
  const map: Record<string,string> = {
    bls: "console-bls",
    "7002": "console-7002",
    watchdog: "console-watchdog",
    scanner: "console-overview",
    overview: "console-overview",
  };
  const id = map[which];
  if (id) H(id)?.classList.remove("hidden");
  if (motion) {
    const box = H(id!);
    if (box) (motion as any)?.animate?.(box, { opacity: [0, 1] }, { duration: 0.22 });
  }
}

function ensureFooterProbes() {
  const ensure = (id: string) => {
    let el = H(id);
    if (!el) {
      el = document.createElement("span");
      el.id = id;
      (el.style as any).position = "absolute";
      (el.style as any).width = "1px";
      (el.style as any).height = "1px";
      (el.style as any).overflow = "hidden";
      (el.style as any).clip = "rect(0 0 0 0)";
      (el.style as any).whiteSpace = "nowrap";
      el.setAttribute("aria-hidden", "true");
      document.body.appendChild(el);
    }
    return el;
  };
  ensure("beaconHead");
  ensure("rpcInfo");
}
function setFooterHead(headSlot: number | string | null) {
  const el = H("beaconHead");
  if (!el || headSlot == null) return;
  el.textContent = "#" + String(headSlot);
}
function setFooterChain(chainId: number | null, blockNumber: number | null) {
  const el = H("rpcInfo");
  if (!el) return;
  const cid = chainId == null ? "" : String(chainId);
  const blk = blockNumber == null ? "" : String(blockNumber);
  el.textContent = `chainId ${cid} block ${blk}`.trim();
}

function initAll() {
  loadMotion();
  enableGlobalCustomScrollbars();
  setBlsFieldLabels();
  hydrateFromProfile().then(() => { wireOverviewIdSync(); });
  ensureFooterProbes();
  loadNodeUrls();
  ensureScannerHints();
  initTooltips();
  bindModalControls();
  wireIndexPubkeyPair("blsValIndex","blsPub");
  wireIndexPubkeyPair("ovIndex","ovPub");
  wireIndexPubkeyPair("eip7002Pub","eip7002Pub");
  wireIndexPubkeyPair("wdId","wdId");
  autofillFromProfileAndResolve();
  document.addEventListener("vt:profile", () => { autofillFromProfileAndResolve(); });
  updateLayoutVars();
  window.addEventListener("resize", () => { updateLayoutVars(); });
  initNav();
  initCopyButtons();
  bindSettingsUi();
  applySettings();
  bindNodeUrlPersist();
  H("btnBuildBls").addEventListener("click", onBuildBls);
  H("btnSaveBls").addEventListener("click", onSaveBls);
  H("btnPostBls").addEventListener("click", onPostBls);
  H("btnFee").addEventListener("click", onFee);
  H("btnSubmit7002").addEventListener("click", onSubmit7002);
  H("btnScan").addEventListener("click", onScan);
  H("btnScanExport").addEventListener("click", onScanExport);
  H("btnWdCheck").addEventListener("click", onWatchdog);
  H("btnCheckNodes").addEventListener("click", onCheckNodes);
}

(function attachFatalGuards(){
  const show = (title: string, details: string) => {
    const box = document.getElementById("bootError") as HTMLDivElement | null;
    const pre = document.getElementById("bootErrorMsg") as HTMLPreElement | null;
    if (!box || !pre) { console.error("[BootError]", title, details); return; }
    pre.textContent = `${title}\n\n${details}`.trim();
    box.style.display = "flex";
  };
  window.addEventListener("error", (e) => {
    const msg = e?.message || "Uncaught error";
    const det = (e?.error && (e.error.stack || e.error.toString())) ||
                (e?.filename ? `${e.filename}:${e.lineno}:${e.colno}` : "");
    show(msg, det);
  });
  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    const reason: any = (e && (e as any).reason) || e;
    const msg = (reason && (reason.message || reason.toString())) || "Unhandled promise rejection";
    const det = reason && reason.stack ? reason.stack : (typeof pretty === "function" ? pretty(reason) : String(reason));
    show(msg, det);
  });
})();

function safeBoot() {
  try {
    initAll();
  } catch (err: any) {
    const evt = new ErrorEvent("error", { message: err?.message || String(err), error: err });
    window.dispatchEvent(evt);
  }
}

window.addEventListener("DOMContentLoaded", safeBoot);
