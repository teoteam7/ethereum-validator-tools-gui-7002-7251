export {};

(() => {
  type TopicKey =
    | 'ui'
    | 'bls'
    | 'eip7002'
    | 'scanner'
    | 'watchdog'
    | 'scheduler'
    | 'eta'
    | 'batch'
    | 'payout'
    | 'signer'
    | 'settings';

  interface Topic {
    key: TopicKey;
    label: string;
  }

  const STORAGE_KEY = 'validator_tools.help.selected_topic.v8.en';

  const TOPICS: Topic[] = [
    { key: 'ui',        label: 'UI & Console' },
    { key: 'bls',       label: 'BLS → 0x01' },
    { key: 'eip7002',   label: 'Exit / Partial (EIP-7002)' },
    { key: 'scanner',   label: 'Scanner' },
    { key: 'watchdog',  label: 'Watchdog' },
    { key: 'scheduler', label: 'Scheduler' },
    { key: 'eta',       label: 'ETA' },
    { key: 'batch',     label: 'Batch' },
    { key: 'payout',    label: 'Payout Rules' },
    { key: 'signer',    label: 'Signer & Webhooks' },
    { key: 'settings',  label: 'Settings' }
  ];

  const $ = <T extends Element>(sel: string, root?: ParentNode): T | null =>
    (root ?? document).querySelector<T>(sel);

  function saveSelectedTopic(key: TopicKey): void {
    try { localStorage.setItem(STORAGE_KEY, key); } catch {}
  }

  function readSelectedTopic(): TopicKey {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) as TopicKey | null;
      if (raw && TOPICS.some(t => t.key === raw)) return raw;
    } catch {}
    return TOPICS[0].key;
  }

  function injectStyles(): void {
    if ($('#helpStylesEN')) return;

    const css = `
#helpRoot .help-grid{
  display:grid;
  grid-template-columns: 320px 1fr;
  grid-template-rows: auto auto;
  grid-template-areas:
    "panel intro"
    "wide  wide";
  gap:16px;
  align-items:start;
}
@media (max-width:1100px){
  #helpRoot .help-grid{
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
    grid-template-areas:
      "panel"
      "intro"
      "wide";
  }
}
#helpRoot .panel { grid-area: panel; }
#helpRoot .intro { grid-area: intro; }
#helpRoot .wide  { grid-area: wide; }
#helpRoot .muted { color: var(--muted); font-size: 12.5px; }
#helpRoot .mono  { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
#helpRoot .h{
  font-weight:900; letter-spacing:.2px;
  margin:0 0 8px 0; font-size:16px;
  display:flex; align-items:center; gap:10px;
}
#helpRoot .h .icon{ width:18px; height:18px; stroke:var(--icon); stroke-width:1.5; fill:none; }
#helpRoot .panel{
  border: 1px solid var(--border);
  background: var(--panel);
  padding: var(--pad);
}
#helpRoot .select-wrap{ position: relative; margin-top:6px; }
#helpRoot .select-wrap select{
  width:100%;
  padding:10px 32px 10px 10px;
  background: var(--select-bg);
  color: var(--select-color);
  border:1px solid var(--select-border);
  appearance:none; -webkit-appearance:none; -moz-appearance:none;
  background-image: var(--select-arrow);
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 14px 14px;
}
#helpRoot .intro{ padding-top: 2px; }
#helpRoot .intro p{ margin: 0 0 10px 0; }
#helpRoot .intro .lead{ font-weight:800; }
#helpRoot .wide .section{
  padding: 0;
  margin: 0 0 18px 0;
  background: transparent;
  border: none;
}
#helpRoot .wide .section .s-title{
  font-weight: 900; margin: 0 0 8px 0; font-size: 14px;
  display:flex; align-items:center; gap:8px;
}
#helpRoot .wide .section .s-title .icon{
  width:16px; height:16px; stroke:var(--icon); stroke-width:1.6; fill:none;
}
#helpRoot .wide .section p{ margin: 8px 0; }
#helpRoot .wide .section ul,
#helpRoot .wide .section ol{ margin: 6px 0 0 18px; }
#helpRoot .divider{
  height:1px;
  background: var(--border);
  margin: 14px 0;
}
#helpRoot .grid-2{ display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
@media (max-width:1100px){ #helpRoot .grid-2{ grid-template-columns: 1fr; } }
#helpRoot .grid-3{ display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; }
@media (max-width:1100px){ #helpRoot .grid-3{ grid-template-columns: 1fr; } }
#helpRoot .band{
  display:flex; gap:10px; align-items:flex-start;
  padding:10px 12px;
  border: 1px solid var(--border);
  margin: 10px 0 12px 0;
  background:
    linear-gradient(90deg, rgba(34,211,238,.12), transparent 40%),
    linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,0));
}
html[data-theme="light"] #helpRoot .band,
html[data-theme="neutral"] #helpRoot .band{
  background:
    linear-gradient(90deg, rgba(34,211,238,.12), transparent 40%),
    linear-gradient(180deg, rgba(0,0,0,.04), rgba(0,0,0,0));
}
#helpRoot .band.warn{
  background:
    linear-gradient(90deg, rgba(245,158,11,.18), transparent 40%),
    linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,0));
}
#helpRoot .band.danger{
  background:
    linear-gradient(90deg, rgba(239,68,68,.18), transparent 40%),
    linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,0));
}
#helpRoot .band .icon{
  width:16px; height:16px; stroke: var(--icon); stroke-width:1.6; fill:none;
}
#helpRoot .tbl{
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
  table-layout: fixed;
  border: 1px solid var(--border);
}
#helpRoot .tbl caption{
  text-align: left;
  font-weight: 900;
  margin-bottom: 6px;
}
#helpRoot .tbl thead th{
  position: sticky;
  top: -1px;
  z-index: 1;
  text-align: left;
  font-weight: 900;
  padding: 10px 8px;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,0));
  color: var(--text);
}
#helpRoot .tbl tbody td{
  padding: 10px 8px;
  vertical-align: top;
  color: var(--text);
  border-bottom: 1px solid var(--border);
  border-right: 1px solid var(--border);
}
#helpRoot .tbl tbody tr:last-child td{ border-bottom: none; }
#helpRoot .tbl thead th:last-child,
#helpRoot .tbl tbody td:last-child{ border-right: none; }
#helpRoot .tbl.striped tbody tr:nth-child(odd) td{ background: rgba(255,255,255,.02); }
#helpRoot .badge{
  display:inline-block; padding:2px 6px; font-size:11px; font-weight:800; letter-spacing:.2px;
  border:1px solid var(--border);
  background: rgba(255,255,255,.04);
  margin-left: 4px;
}
#helpRoot .badge.ok{ border-color:#22c55e; color:#7ae6b8; }
#helpRoot .badge.warn{ border-color:#f59e0b; color:#f5d087; }
#helpRoot .badge.bad{ border-color:#ef4444; color:#ffbdbd; }
#helpRoot code{
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  padding: 0 4px;
  border:1px solid var(--border);
  background: rgba(255,255,255,.04);
}
    `.trim();

    const style = document.createElement('style');
    style.id = 'helpStylesEN';
    style.textContent = css;
    document.head.appendChild(style);
  }

  const iconLine    = () => `<svg class="icon" viewBox="0 0 24 24"><path d="M3 12h18"/></svg>`;
  const iconScreen  = () => `<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12"/></svg>`;
  const iconCircle  = () => `<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg>`;
  const iconList    = () => `<svg class="icon" viewBox="0 0 24 24"><path d="M3 4h18M3 10h18M3 16h18"/></svg>`;
  const iconRows    = () => `<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="6"/><rect x="3" y="10" width="18" height="6"/><rect x="3" y="17" width="18" height="4"/></svg>`;
  const iconSearch  = () => `<svg class="icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>`;
  const iconCheck   = () => `<svg class="icon" viewBox="0 0 24 24"><path d="M4 12l6 6 10-10"/></svg>`;
  const iconPlus    = () => `<svg class="icon" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`;
  const iconClose   = () => `<svg class="icon" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
  const iconInfo    = () => `<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M12 6h.01"/></svg>`;
  const iconWarn    = () => `<svg class="icon" viewBox="0 0 24 24"><path d="M12 2l10 18H2L12 2z"/><path d="M12 8v5"/><path d="M12 17h.01"/></svg>`;
  const iconGrid    = () => `<svg class="icon" viewBox="0 0 24 24"><path d="M21 8v8M8 21h8M3 8v8M8 3h8"/></svg>`;
  const iconAxis    = () => `<svg class="icon" viewBox="0 0 24 24"><path d="M3 12h18M12 3v18"/></svg>`;

  function getContent(topicKey: TopicKey): { intro: string; wide: string } {
    switch (topicKey) {
      case 'ui': {
        const intro = `
          <p class="lead"><b>UI & Console</b> — how to read status bands, the right-hand console, and footer metrics.</p>
          <p>Keep this reference open while you work across other tabs.</p>
        `;

        const wide = `
          <div class="section grid-2">
            <div>
              <div class="s-title">
                ${iconLine()}
                Status bands (per feature tab)
              </div>
              <ul>
                <li><span class="badge ok">OK</span> — prerequisites satisfied or the flow completed successfully.</li>
                <li><span class="badge warn">Monitoring</span> — waiting on triggers or conditions to become true.</li>
                <li><span class="badge bad">Error</span> — action required; inspect the right-hand console.</li>
              </ul>
              <p class="muted">Bands include compact progress bars for <b>ok / failed / pending / in-flight</b>.</p>
            </div>
            <div>
              <div class="s-title">
                ${iconScreen()}
                Right-hand console
              </div>
              <ul>
                <li>Time-stamped entries for each network call and decision hop.</li>
                <li>Spinner → checkmark/cross transition makes phases obvious at a glance.</li>
                <li><b>Copy</b> exports the current view for incident reports, change tickets, and compliance.</li>
              </ul>
            </div>
          </div>

          <div class="divider"></div>

          <div class="section grid-2">
            <div>
              <div class="s-title">
                ${iconCircle()}
                Footer metrics (always visible)
              </div>
              <table class="tbl striped">
                <thead>
                  <tr><th style="width:200px;">Badge</th><th>Meaning</th><th>Notes</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="mono">Head</td>
                    <td>Latest consensus head as <span class="mono">#slot (eEpoch)</span>.</td>
                    <td>Updated via DOM observers (~12s cadence).</td>
                  </tr>
                  <tr>
                    <td class="mono">Chain</td>
                    <td><span class="mono">chainId • block</span> (from your RPC).</td>
                    <td>Warns if the <span class="mono">chainId</span> does not match the selected network.</td>
                  </tr>
                  <tr>
                    <td class="mono">Refreshed</td>
                    <td>Seconds since the last UI update.</td>
                    <td><span class="badge ok">OK</span> ≤ 5s, <span class="badge warn">Warn</span> ≤ 20s, <span class="badge bad">Bad</span> otherwise.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div>
              <div class="s-title">
                ${iconList()}
                Top bar “Node Panel”
              </div>
              <ul>
                <li>Beacon / RPC / Network fields drive defaults across feature tabs.</li>
                <li>Some tabs auto-read the selected RPC from the top bar.</li>
                <li>Tooltip delay is configurable in <b>Settings</b>.</li>
              </ul>
            </div>
          </div>

          <div class="divider"></div>

          <div class="section">
            <div class="s-title">
              ${iconSearch()}
              Troubleshooting matrix
            </div>
            <table class="tbl striped">
              <thead>
                <tr><th style="width:320px;">Symptom</th><th>Likely cause</th><th>Action</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>“preflight mismatch: EOA does not match 0x01”</td>
                  <td>Wrong secret / derivation or the validator uses another 0x01 address.</td>
                  <td>Re-derive locally; verify the expected 0x01 in <b>Watchdog</b>. Do not force-send.</td>
                </tr>
                <tr>
                  <td>“eligibility failed” (Exit)</td>
                  <td>Not <b>active</b>, slashed, or already exiting/exited.</td>
                  <td>Check <b>status/slashed/exit epoch</b> in <b>Watchdog</b>.</td>
                </tr>
                <tr>
                  <td>Intermittent RPC errors</td>
                  <td>Rate limit, fee spikes, or chain mismatch.</td>
                  <td>Reduce concurrency, increase retries, set fee caps, verify <span class="mono">chainId</span>.</td>
                </tr>
                <tr>
                  <td>Scanner returns fewer rows than expected</td>
                  <td>Non-archival Beacon provider or overly large lookback.</td>
                  <td>Reduce the window or switch provider; re-run after finalization.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="divider"></div>

          <div class="section grid-2">
            <div>
              <div class="s-title">
                ${iconInfo()}
                Using your Beacon API key
              </div>
              <ul>
                <li>Set up in <b>Settings → Beacon API Key</b>. Choose how the key is attached:
                  <span class="mono">Authorization: Bearer &lt;key&gt;</span>, custom header (e.g. <span class="mono">X-API-Key</span>), or query param (e.g. <span class="mono">?apikey=</span>).</li>
                <li>Applied automatically to requests whose URL starts with the <b>Beacon URL</b> from the top bar.</li>
                <li>Force-apply to any probe by adding header <span class="mono">X-Use-Beacon-Key: 1</span> (used by the built‑in Test button).</li>
                <li>By default the key is session‑only; enable <b>Persist</b> to save it locally.</li>
              </ul>
              <p class="muted">The key affects Beacon requests only; RPC traffic is not modified.</p>
            </div>
            <div>
              <div class="s-title">
                ${iconCheck()}
                Quick steps
              </div>
              <ol>
                <li>Enter the <b>Beacon URL</b> in the top bar.</li>
                <li>Open <b>Settings → Beacon API Key</b>, enable the key, paste it, choose attach mode.</li>
                <li>Click <b>Test</b> to probe <span class="mono">/eth/v1/node/health</span> and related endpoints.</li>
                <li>Return to feature tabs; the console will use your key for Beacon calls.</li>
              </ol>
            </div>
          </div>
        `;

        return { intro, wide };
      }

      case 'bls': {
        const intro = `
          <p class="lead"><b>BLS → 0x01 (Update Withdrawal Credentials)</b> — one-time migration from BLS (0x00) to execution address (0x01).</p>
          <div class="band warn">
            ${iconWarn()}
            <div><b>One-time change.</b> After switching to <b>0x01</b> the withdrawal address becomes permanent. Verify everything before signing.</div>
          </div>
          <p class="muted mono">The signed <span>BLSToExecutionChange</span> is assembled locally. No secrets are stored.</p>
        `;

        const wide = `
          <div class="section">
            <div class="s-title">
              ${iconCheck()}
              Required fields
            </div>
            <table class="tbl striped">
              <thead><tr><th style="width:260px;">Field</th><th>Purpose</th><th>Format / Notes</th></tr></thead>
              <tbody>
                <tr>
                  <td class="mono">BLS withdrawal private key</td>
                  <td>Signs the change message.</td>
                  <td class="mono">0x… (32 bytes). This is the withdrawal secret, not the validator signing key.</td>
                </tr>
                <tr>
                  <td class="mono">Validator BLS public key</td>
                  <td>Identifies the validator.</td>
                  <td class="mono">0x… (48 bytes, 96 hex characters).</td>
                </tr>
                <tr>
                  <td class="mono">Execution withdrawal address</td>
                  <td>Final CL → EL destination for withdrawals.</td>
                  <td class="mono">0x… (20 bytes). Verify checksum if supported.</td>
                </tr>
                <tr>
                  <td class="mono">Genesis Validators Root (optional)</td>
                  <td>Domain separation for signing.</td>
                  <td class="mono">0x… (32 bytes), must match the selected network.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="divider"></div>

          <div class="section grid-2">
            <div>
              <div class="s-title">${iconPlus()} Process</div>
              <ol>
                <li>Fill out fields; double-check the 20-byte address.</li>
                <li>Click <b>Build &amp; Sign</b> to produce the signed payload.</li>
                <li>Use <b>Export JSON</b> to save <span class="mono">{ data:[…] }</span> for your submission pipeline.</li>
                <li>Where available, use <b>Broadcast</b> for immediate submission.</li>
              </ol>
            </div>
            <div>
              <div class="s-title">${iconCircle()} Sanity checklist</div>
              <ul>
                <li>Lengths: 48-byte pubkey, 32-byte GVR, 20-byte address.</li>
                <li>GVR matches the network (Mainnet or Holesky).</li>
                <li>In the exported JSON visually confirm <span class="mono">to_execution_address</span>.</li>
              </ul>
            </div>
          </div>

          <div class="divider"></div>

          <div class="section">
            <div class="s-title">${iconClose()} Out of scope</div>
            <ul>
              <li>Reverting 0x01 → 0x00 is not possible.</li>
              <li>Hardware wallet signing inside this particular UI.</li>
              <li>Mass signing in this tab (use external tooling if needed).</li>
            </ul>
          </div>
        `;

        return { intro, wide };
      }

      case 'eip7002': {
        const intro = `
          <p class="lead"><b>EIP-7002</b> — assembling and submitting requests: <b>Exit</b> (Amount = 0 Gwei) or <b>Partial</b> (Amount &gt; 0 Gwei).</p>
          <div class="band">
            ${iconInfo()}
            <div>
              Predeploy: <code>0x00000961Ef480Eb55e80D19ad83579A64c007002</code>. Confirm <b>chainId</b> and fee caps before submitting.<br/>
              <b>Exit</b> = Amount <b>0</b>. <b>Partial</b> = Amount <b>&gt; 0</b> (Gwei).
            </div>
          </div>
          <p class="muted">Fees are read from your RPC. Signing is local; the EOA secret is not persisted.</p>
        `;

        const wide = `
          <div class="section">
            <div class="s-title">${iconLine()} Fields</div>
            <table class="tbl striped">
              <thead><tr><th style="width:260px;">Field</th><th>Purpose</th><th>Format / Notes</th></tr></thead>
              <tbody>
                <tr>
                  <td class="mono">EOA secret</td>
                  <td>Locally signs the transaction.</td>
                  <td class="mono">Private key (0x…) or mnemonic. Never stored.</td>
                </tr>
                <tr>
                  <td class="mono">Validator BLS public key</td>
                  <td>Target validator.</td>
                  <td class="mono">0x… (48 bytes).</td>
                </tr>
                <tr>
                  <td class="mono">Amount (Gwei)</td>
                  <td>Selects the request type.</td>
                  <td><b>0</b> → Exit; <b>&gt;0</b> → Partial, subject to protocol and policy rules.</td>
                </tr>
                <tr>
                  <td class="mono">RPC</td>
                  <td>Fee discovery and broadcasting.</td>
                  <td>Defaults to the top-bar RPC value.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="divider"></div>

          <div class="section grid-2">
            <div>
              <div class="s-title">${iconPlus()} Eligibility — Exit</div>
              <ul>
                <li>Status: <b>active</b>, not slashed, not already exiting/exited.</li>
                <li>Withdrawal credentials must be <span class="mono">0x01</span>.</li>
              </ul>
            </div>
            <div>
              <div class="s-title">${iconCheck()} Eligibility — Partial</div>
              <ul>
                <li>Status: <b>active</b> or <b>withdrawal_possible</b> (fork dependent).</li>
                <li>Not slashed; credentials = <span class="mono">0x01</span>.</li>
                <li>Amount aligns with network rules and your internal policy.</li>
              </ul>
            </div>
          </div>

          <div class="divider"></div>

          <div class="section grid-2">
            <div>
              <div class="s-title">${iconScreen()} Console output</div>
              <ul>
                <li><b>Get fee</b> — current cost estimate for the request.</li>
                <li>On success the console prints the transaction hash. Confirmations are external (explorer / EL client).</li>
              </ul>
            </div>
            <div>
              <div class="s-title">${iconClose()} Important nuances</div>
              <ul>
                <li>Chain mismatch and sudden fee spikes are common. Keep conservative fee caps.</li>
                <li>Public RPC endpoints enforce rate limits; prefer private endpoints in production.</li>
              </ul>
            </div>
          </div>
        `;

        return { intro, wide };
      }

      case 'scanner': {
        const intro = `
          <p class="lead"><b>Scanner</b> — locates CL → EL payouts to your execution address. Suitable for audit, finance, and compliance.</p>
          <p class="muted mono">Output columns: slot • withdrawal index • validator index • amount (Gwei &amp; ETH) • address</p>
        `;

        const wide = `
          <div class="section">
            <div class="s-title">${iconLine()} Parameters</div>
            <table class="tbl striped">
              <thead><tr><th style="width:260px;">Parameter</th><th>Purpose</th><th>Format / Notes</th></tr></thead>
              <tbody>
                <tr>
                  <td class="mono">Execution address</td>
                  <td>Destination address to match.</td>
                  <td class="mono">0x… (20 bytes). Required.</td>
                </tr>
                <tr>
                  <td class="mono">Lookback (slots)</td>
                  <td>Window size from <span class="mono">head</span>, if start is “head”.</td>
                  <td>Recommended 1,024–8,192. Larger → slower.</td>
                </tr>
                <tr>
                  <td class="mono">Start slot</td>
                  <td>Anchor for scanning.</td>
                  <td><span class="mono">head</span> or explicit slot number.</td>
                </tr>
                <tr>
                  <td class="mono">Validator filter</td>
                  <td>Narrows results to a single validator.</td>
                  <td>Index or 48-byte BLS pubkey (0x…96).</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="divider"></div>

          <div class="section grid-2">
            <div>
              <div class="s-title">${iconScreen()} Output columns</div>
              <ul>
                <li><b>Slot</b> — consensus slot.</li>
                <li><b>Withdrawal Index</b> — global index within Beacon withdrawals.</li>
                <li><b>Validator Index</b> — validator identifier.</li>
                <li><b>Amount</b> — shown in Gwei and ETH.</li>
                <li><b>Address</b> — matched execution address.</li>
              </ul>
            </div>
            <div>
              <div class="s-title">${iconCircle()} Practical tips</div>
              <ul>
                <li>Export CSV by reporting periods.</li>
                <li>Re-run recent windows after finalization for completeness.</li>
                <li>If your provider is non-archival, shrink the lookback or switch provider.</li>
              </ul>
            </div>
          </div>
        `;

        return { intro, wide };
      }

      case 'watchdog': {
        const intro = `
          <p class="lead"><b>Watchdog (light)</b> — targeted validator diagnostics before Exit/Partial/Batch.</p>
          <div class="band warn">
            ${iconWarn()}
            <div>
              Before sending, verify: <b>withdrawal credentials = 0x01</b> and the validator is <b>not slashed</b>. Otherwise requests will be rejected.
            </div>
          </div>
          <p class="muted">Enter a <b>validator index</b> or a <b>BLS public key</b> and click <b>Check</b>. The right-hand console contains a detailed trace.</p>
        `;

        const wide = `
          <div class="section">
            <div class="s-title">${iconCircle()} Signals and interpretation</div>
            <table class="tbl striped">
              <thead><tr><th style="width:260px;">Signal</th><th>What it means</th><th>Why it matters</th></tr></thead>
              <tbody>
                <tr>
                  <td><b>Status</b> <span class="badge ok">core</span></td>
                  <td class="mono">pending_initialized • pending_queued • active_ongoing • active_exiting • exited_unslashed • exited_slashed • withdrawal_possible • withdrawal_done</td>
                  <td>Exit is possible from <b>active</b>; Partial from <b>active</b> / <b>withdrawal_possible</b>.</td>
                </tr>
                <tr>
                  <td><b>Slashed</b> <span class="badge bad">risk</span></td>
                  <td>Boolean flag on the validator record.</td>
                  <td>Exit/Partial are blocked by policy or protocol if slashed.</td>
                </tr>
                <tr>
                  <td><b>Effective balance</b></td>
                  <td>Rounded CL balance.</td>
                  <td>Sanity check for Partial amounts and withdrawable expectations.</td>
                </tr>
                <tr>
                  <td><b>Withdrawal credentials</b> <span class="badge warn">must check</span></td>
                  <td class="mono">0x00 • 0x01 • 0x02</td>
                  <td>EIP-7002 requires <span class="mono">0x01</span>. If <span class="mono">0x00</span>, migrate in <b>BLS → 0x01</b> first.</td>
                </tr>
                <tr>
                  <td><b>Exit / Withdrawable epoch</b></td>
                  <td>Current exit progress and when funds become withdrawable.</td>
                  <td>Prevents duplicate requests and guides operational SLAs.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="divider"></div>

          <div class="section grid-2">
            <div>
              <div class="s-title">${iconCheck()} Pre-flight</div>
              <ul>
                <li>Beacon reachable with stable latency.</li>
                <li>Credentials = <span class="mono">0x01</span>; if <span class="mono">0x00</span>, migrate first.</li>
                <li>Not slashed; for Exit: status <b>active</b>, not exiting/exited.</li>
                <li>EOA used in <b>Batch/Scheduler</b> equals the validator’s <b>0x01</b> address.</li>
              </ul>
            </div>
            <div>
              <div class="s-title">${iconScreen()} Action gating</div>
              <table class="tbl">
                <thead><tr><th style="width:180px;">Action</th><th>Allowed states</th><th>Blocked by</th></tr></thead>
                <tbody>
                  <tr>
                    <td>Exit (Amount = 0)</td>
                    <td class="mono">active_ongoing</td>
                    <td class="mono">slashed • active_exiting • exited_* • withdrawal_done</td>
                  </tr>
                  <tr>
                    <td>Partial (Amount &gt; 0)</td>
                    <td class="mono">active_ongoing • withdrawal_possible</td>
                    <td class="mono">slashed • exited_* • withdrawal_done</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="divider"></div>

          <div class="section">
            <div class="s-title">${iconClose()} Scope and edge cases</div>
            <ul>
              <li>Watchdog is a lightweight probe; it does not compute historical deltas or slash reasons.</li>
              <li>No persistent alerting — wire this UI into your own observability stack if needed.</li>
            </ul>
          </div>
        `;

        return { intro, wide };
      }

      case 'scheduler': {
        const intro = `
          <p class="lead"><b>Smart Scheduler</b> — automation for EIP-7002 (with optional 7251 hints) with production-grade gating.</p>
          <div class="band">
            ${iconList()}
            <div>
              Production rule: start in <b>monitor-only</b>, tune triggers, then enable submissions gradually.<br/>
              <b>Dynamic fee ramp modelling</b> must be handled by the <b>Scheduler</b> with triggers, not by static estimates. The layout includes extra spacing so this note does not visually merge with adjacent headers.
            </div>
          </div>
          <p class="muted mono">Triggers: (fee ≤ cap) <b>OR</b> (fee ≤ moving average × (1 − X%)) <b>OR</b> (avg/target ≤ threshold).</p>
        `;

        const wide = `
          <div class="section">
            <div class="s-title">${iconLine()} Core settings</div>
            <table class="tbl striped">
              <thead><tr><th style="width:260px;">Setting</th><th>Purpose</th><th>Guidance</th></tr></thead>
              <tbody>
                <tr>
                  <td class="mono">Check period (seconds)</td>
                  <td>Cadence for monitoring and dispatch ticks.</td>
                  <td>8–20s for public RPCs; 5–10s for private RPCs.</td>
                </tr>
                <tr>
                  <td class="mono">Fee cap (wei)</td>
                  <td>Hard ceiling per request.</td>
                  <td>Combine with the moving-average drop trigger.</td>
                </tr>
                <tr>
                  <td class="mono">Drop threshold (%)</td>
                  <td>Dispatch when fee is X% below the moving average.</td>
                  <td>Typical: 10–20%, depending on volatility.</td>
                </tr>
                <tr>
                  <td class="mono">Moving average window (samples)</td>
                  <td>Smoothing depth.</td>
                  <td>10–30. Larger is smoother but slower to react.</td>
                </tr>
                <tr>
                  <td class="mono">Lookback (slots)</td>
                  <td>Window for load metrics (avg, p50, p95).</td>
                  <td>≥256 for a steady signal.</td>
                </tr>
                <tr>
                  <td class="mono">Target per block</td>
                  <td>Used for <span class="mono">avg/target</span> gating.</td>
                  <td>Leave empty to use p50; override only if policy requires.</td>
                </tr>
                <tr>
                  <td class="mono">Load ratio threshold</td>
                  <td>Allow when <span class="mono">avg/target ≤ threshold</span>.</td>
                  <td>0.50–0.75 is a common choice.</td>
                </tr>
                <tr>
                  <td class="mono">maxFee / maxPriority / gasLimit</td>
                  <td>Caps and gas limits for EL.</td>
                  <td>Useful during noisy EL pricing.</td>
                </tr>
                <tr>
                  <td class="mono">Optional 7251 predeploy</td>
                  <td>Static-call for an extra on-chain hint.</td>
                  <td>Optional; safe to leave empty.</td>
                </tr>
                <tr>
                  <td class="mono">Concurrency / Retries</td>
                  <td>Parallelism and retry budget.</td>
                  <td>1–3 for public RPCs; 2–5 for private RPCs.</td>
                </tr>
                <tr>
                  <td class="mono">Max partial amount (Gwei)</td>
                  <td>Safety rail for accidental large partials.</td>
                  <td>Over-limit items are rejected with reasons.</td>
                </tr>
                <tr>
                  <td class="mono">Autosave</td>
                  <td>Persist queue and settings in localStorage.</td>
                  <td>Disable on shared or ephemeral machines.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="divider"></div>

          <div class="section grid-3">
            <div>
              <div class="s-title">${iconRows()} Queue format</div>
              <p class="mono">0xBLS48Pubkey, AmountGwei</p>
              <ul>
                <li>One item per line. <b>0</b> = Exit; <b>&gt;0</b> = Partial.</li>
                <li>Duplicates are removed; junk lines are reported in the console.</li>
              </ul>
            </div>
            <div>
              <div class="s-title">${iconCheck()} Eligibility &amp; preflight</div>
              <ul>
                <li>Status active/withdrawable; not slashed; not already exiting (unless intentional).</li>
                <li>Withdrawal credentials = <span class="mono">0x01</span>.</li>
                <li>Derived EOA address equals the validator’s <span class="mono">0x01</span> address (hard check).</li>
              </ul>
            </div>
            <div>
              <div class="s-title">${iconCircle()} Runbook</div>
              <ul>
                <li>Start in <b>monitor-only</b> (empty queue) to tune triggers safely.</li>
                <li>Dispatch a small pilot wave at low fees; export logs.</li>
                <li>Increase concurrency gradually within rate limits.</li>
              </ul>
            </div>
          </div>

          <div class="divider"></div>

          <div class="section grid-2">
            <div>
              <div class="s-title">${iconScreen()} Error taxonomy</div>
              <ul>
                <li><b>eligibility failed</b> — blocked by status / slashed / WC rule.</li>
                <li><b>preflight mismatch</b> — EOA ≠ validator’s 0x01 address (stop and investigate).</li>
                <li><b>RPC send error</b> — transient (retryable) or fatal (nonce / chainId mismatch).</li>
              </ul>
            </div>
            <div>
              <div class="s-title">${iconClose()} Caveats</div>
              <ul>
                <li>Fees can move quickly; keep conservative caps.</li>
                <li>Public endpoints have strict rate limits; private endpoints are recommended.</li>
                <li>Rare reorgs happen — always confirm externally.</li>
              </ul>
            </div>
          </div>
        `;

        return { intro, wide };
      }

      case 'eta': {
        const intro = `
          <p class="lead"><b>ETA</b> — estimates total time and cost for the queue given current load and fees.</p>
          <div class="band">
            ${iconAxis()}
            <div>
              This model is static (does not predict market dynamics). For adaptive production timing use the <b>Scheduler</b>.
            </div>
          </div>
          <p class="muted">Assumes ~12-second blocks. Use this to plan windows and batch sizes.</p>
        `;

        const wide = `
          <div class="section">
            <div class="s-title">${iconLine()} Inputs and controls</div>
            <table class="tbl striped">
              <thead><tr><th style="width:260px;">Control</th><th>Purpose</th><th>Notes</th></tr></thead>
              <tbody>
                <tr>
                  <td class="mono">Lookback (slots)</td>
                  <td>Window for measuring withdrawals per block.</td>
                  <td>Larger windows are steadier but cost more I/O.</td>
                </tr>
                <tr>
                  <td class="mono">Queue size</td>
                  <td>Number of requests.</td>
                  <td>Include a small retry buffer for safety.</td>
                </tr>
                <tr>
                  <td class="mono">TARGET / MAX per block</td>
                  <td>Throughput constraints.</td>
                  <td>Empty → use p50 and max from measurements.</td>
                </tr>
                <tr>
                  <td class="mono">Current fee (wei)</td>
                  <td>Price per request used for total cost.</td>
                  <td><b>Fetch fee</b> to sync with the console.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="divider"></div>

          <div class="section grid-2">
            <div>
              <div class="s-title">${iconCircle()} Model</div>
              <ul>
                <li><b>Effective throughput</b> = min(MAX, TARGET, round(avg)).</li>
                <li><b>Blocks</b> = ceil(queue_size / effective_throughput).</li>
                <li><b>Time</b> = blocks × 12s; hours rounded to 2 decimals.</li>
                <li><b>Total fee</b> = fee_per_request × queue_size (in wei and ETH).</li>
              </ul>
            </div>
            <div>
              <div class="s-title">${iconClose()} Scope</div>
              <ul>
                <li><b>Dynamic fee ramp</b> is intentionally not simulated — rely on the <b>Scheduler</b> with moving-average triggers and caps.</li>
                <li>Cross-network scenarios are out of scope; use the target network’s RPC.</li>
              </ul>
            </div>
          </div>

          <div class="divider"></div>

          <div class="section">
            <div class="s-title">${iconScreen()} Export</div>
            <p><b>Export CSV</b> includes timestamp, inputs, measured metrics, and computed time and cost. Attach to change tickets.</p>
          </div>
        `;

        return { intro, wide };
      }

      case 'batch': {
        const intro = `
          <p class="lead"><b>Batch Master</b> — mass-submits EIP-7002 requests with concurrency, retries, and CSV status export.</p>
          <p class="muted">Use this for planned waves. For continuous automation see <b>Scheduler</b>.</p>
        `;

        const wide = `
          <div class="section">
            <div class="s-title">${iconLine()} Fields and controls</div>
            <table class="tbl striped">
              <thead><tr><th style="width:260px;">Item</th><th>Purpose</th><th>Notes</th></tr></thead>
              <tbody>
                <tr>
                  <td class="mono">EOA secret</td>
                  <td>Locally signs each request.</td>
                  <td class="mono">0x… or mnemonic. Not stored.</td>
                </tr>
                <tr>
                  <td class="mono">RPC</td>
                  <td>Fee discovery and broadcasting.</td>
                  <td>Overrides the top-bar RPC.</td>
                </tr>
                <tr>
                  <td class="mono">Job list</td>
                  <td>Defines the workload.</td>
                  <td class="mono">0xBLS48Pubkey, AmountGwei — one per line.</td>
                </tr>
                <tr>
                  <td class="mono">Concurrency / Retries</td>
                  <td>Parallelism and retry budget.</td>
                  <td>Keep conservative on public RPCs.</td>
                </tr>
                <tr>
                  <td class="mono">maxFee / maxPriority / gasLimit</td>
                  <td>Optional caps.</td>
                  <td>Fees in Gwei; gasLimit is integer.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="divider"></div>

          <div class="section grid-2">
            <div>
              <div class="s-title">${iconPlus()} Actions</div>
              <ul>
                <li><b>Validate</b> — parse, de-duplicate, and preflight (if Beacon and derivation are available).</li>
                <li><b>Submit all</b> — progress with inline spinners per item.</li>
                <li><b>Stop</b> — graceful halt (waits for in-flight items).</li>
                <li><b>Retry failed</b> / <b>Move errors to top</b> — recovery helpers.</li>
                <li><b>Clear done</b> / <b>Clear all</b> — queue hygiene.</li>
                <li><b>Export CSV</b> — attempts, tx hashes, and errors for audit.</li>
              </ul>
            </div>
            <div>
              <div class="s-title">${iconScreen()} Console and progress</div>
              <ul>
                <li>Time-stamped entries and phase spinners.</li>
                <li>Progress bar: OK / failed / pending / in-flight.</li>
                <li>Copy output for post-mortems and compliance.</li>
              </ul>
            </div>
          </div>

          <div class="divider"></div>

          <div class="section grid-2">
            <div>
              <div class="s-title">${iconCircle()} Operational advice</div>
              <ul>
                <li>Chunk very large lists by epoch or time windows to limit blast radius.</li>
                <li>Monitor RPC health and backpressure — scale concurrency thoughtfully.</li>
                <li>Attach the CSV from each wave to your change tickets.</li>
              </ul>
            </div>
            <div>
              <div class="s-title">${iconClose()} Pitfalls</div>
              <ul>
                <li>Wrong EOA secret — hard preflight block by design.</li>
                <li>Fee spikes and chain mismatch — review the console and adjust caps/network.</li>
              </ul>
            </div>
          </div>
        `;

        return { intro, wide };
      }

      case 'payout': {
        const intro = `
          <p class="lead"><b>Payout Rules</b> — routes new funds arriving to your withdrawal (0x01) address to multiple destinations by percentages, with logs and webhooks.</p>
          <div class="band">
            ${iconInfo()}
            <div>
              This tab handles <b>routing of received ETH</b>. It does not initiate <b>Exit</b>. Splits are calculated after reserving a conservative gas budget. The last rule receives the remainder so totals stay exact.
            </div>
          </div>
          <p class="muted">Buttons <b>Run now</b> and <b>Start</b> are enabled only when the total equals <b>100.00%</b> and at least one rule is present.</p>
        `;

        const wide = `
          <div class="section">
            <div class="s-title">${iconLine()} Core fields (top)</div>
            <table class="tbl striped">
              <thead><tr><th style="width:260px;">Field</th><th>Purpose</th><th>Notes</th></tr></thead>
              <tbody>
                <tr>
                  <td class="mono">Execution RPC URL</td>
                  <td>Network calls and gas/fee discovery.</td>
                  <td>Can be prefilled from the top bar. Use a private RPC for steady throughput.</td>
                </tr>
                <tr>
                  <td class="mono">From address</td>
                  <td>The 0x01 withdrawal address to watch and route from.</td>
                  <td>Must be a checksummed 0x…40. Balance deltas are sampled on each tick.</td>
                </tr>
                <tr>
                  <td class="mono">Min threshold (ETH)</td>
                  <td>Ignore tiny deltas below this value.</td>
                  <td>Useful to batch micro‑payouts; set to 0 for immediate routing.</td>
                </tr>
                <tr>
                  <td class="mono">Confirmations</td>
                  <td>Wait N blocks after send.</td>
                  <td>0 = do not wait. Shown in status after completion.</td>
                </tr>
                <tr>
                  <td class="mono">Poll interval (ms)</td>
                  <td>Cadence for the background loop.</td>
                  <td>15000–30000 on public RPCs; can be lower on private endpoints.</td>
                </tr>
                <tr>
                  <td class="mono">Status</td>
                  <td>Current state and last summary.</td>
                  <td>Updates after tests, runs, and loop ticks.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="divider"></div>

          <div class="section grid-2">
            <div>
              <div class="s-title">${iconRows()} Rules table</div>
              <ul>
                <li>Columns: <b>Label</b>, <b>Address</b>, <b>Percent</b>, <b>Type</b>, <b>Remove</b>.</li>
                <li>Total must be exactly <b>100.00%</b>. The last rule receives the rounding remainder.</li>
                <li>Types are for your own tagging (operational/savings/fee/custom) and do not affect math.</li>
              </ul>
            </div>
            <div>
              <div class="s-title">${iconGrid()} Gas &amp; Signer</div>
              <ul>
                <li><b>Gas mode</b>: <b>Auto</b> (from <span class="mono">feeHistory / gasPrice</span>) or <b>Manual</b> (enter <span class="mono">maxFee</span>/<span class="mono">maxPriority</span> in Gwei).</li>
                <li><b>Signer</b>: <b>RPC Unlocked Account</b> (node signs) or <b>Webhook Signer</b> (external service/API). See <b>Signer &amp; Webhooks</b> tab.</li>
                <li>When using a signer service, set <b>Signer Webhook URL</b> and optional <b>Auth header</b>.</li>
              </ul>
            </div>
          </div>

          <div class="divider"></div>

          <div class="section grid-2">
            <div>
              <div class="s-title">${iconScreen()} Console &amp; Activity Log</div>
              <ul>
                <li>Console shows <b>delta</b>, <b>gas budget</b>, split plan, tx hashes, and receipts gating.</li>
                <li>Activity Log is exportable as CSV and summarizes events for audit.</li>
                <li>Use <b>Test connection</b> for chainId, head block, and balance sanity.</li>
              </ul>
            </div>
            <div>
              <div class="s-title">${iconPlus()} Webhooks</div>
              <ul>
                <li>Optional per-route callbacks with <b>Enabled</b> toggle and custom secret header.</li>
                <li>Emitted types: <span class="mono">route_start</span> and <span class="mono">route_complete</span>.</li>
              </ul>
              <table class="tbl striped">
                <thead><tr><th style="width:220px;">Type</th><th>Payload (high‑level)</th><th>Notes</th></tr></thead>
                <tbody>
                  <tr>
                    <td class="mono">route_start</td>
                    <td class="mono">{ from, amountWei, rules:[{to, valueWei, label,id}], ts }</td>
                    <td>Sent before dispatch.</td>
                  </tr>
                  <tr>
                    <td class="mono">route_complete</td>
                    <td class="mono">{ from, txHashes:[…], ts }</td>
                    <td>Sent after all tx are sent and optional confirmations.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="divider"></div>

          <div class="section">
            <div class="s-title">${iconSearch()} Troubleshooting</div>
            <table class="tbl striped">
              <thead><tr><th style="width:320px;">Symptom</th><th>Cause</th><th>Fix</th></tr></thead>
              <tbody>
                <tr>
                  <td><span class="mono">Run</span>/<span class="mono">Start</span> disabled</td>
                  <td>Total percent ≠ 100% or no rules.</td>
                  <td>Edit Percent to total 100.00%; add at least one rule.</td>
                </tr>
                <tr>
                  <td>Status shows “Insufficient for gas”</td>
                  <td>Delta balance ≤ estimated gas budget for N transfers.</td>
                  <td>Lower rule count, increase Min threshold, or top up for gas.</td>
                </tr>
                <tr>
                  <td>“No new funds (Δ … ETH)”</td>
                  <td>Balance has not increased since last processed state.</td>
                  <td>Send funds to the source address or reset state manually in storage.</td>
                </tr>
                <tr>
                  <td>Signer errors</td>
                  <td>Webhook endpoint rejected or returned unexpected format.</td>
                  <td>See <b>Signer &amp; Webhooks</b> for contract and examples.</td>
                </tr>
              </tbody>
            </table>
          </div>
        `;

        return { intro, wide };
      }

      case 'signer': {
        const intro = `
          <p class="lead"><b>Signer &amp; Webhooks</b> — integrate an external signer/HSM via HTTP and push route events to your observability stack.</p>
          <div class="band warn">
            ${iconWarn()}
            <div>
              Treat your signer endpoint as a privileged system. Require authentication, rate-limit, and keep it on a private network. Never log raw secrets.
            </div>
          </div>
          <p class="muted">This applies to the <b>Payout Rules</b> tab. Use it when your execution keys are not available on the RPC node.</p>
        `;

        const wide = `
          <div class="section">
            <div class="s-title">${iconLine()} Webhook Signer — request</div>
            <table class="tbl striped">
              <thead><tr><th style="width:260px;">Property</th><th>Value</th><th>Notes</th></tr></thead>
              <tbody>
                <tr>
                  <td class="mono">Method / Headers</td>
                  <td class="mono">POST application/json + your Auth header</td>
                  <td>Auth header is set in the UI’s <b>Signer Webhook</b> box (e.g. <span class="mono">Authorization: Bearer …</span>).</td>
                </tr>
                <tr>
                  <td class="mono">Body.action</td>
                  <td class="mono">"sign-and-send-batch"</td>
                  <td>Single batch per call.</td>
                </tr>
                <tr>
                  <td class="mono">Body.txs[]</td>
                  <td class="mono">[{ chainId, from, to, value, data:"0x", nonce, maxFeePerGas?, maxPriorityFeePerGas? }]</td>
                  <td>Nonces are preallocated sequentially. Type‑2 EIP‑1559.</td>
                </tr>
              </tbody>
            </table>
            <p class="muted">Gas is pre‑estimated in the UI; you may override per policy.</p>
          </div>

          <div class="divider"></div>

          <div class="section grid-2">
            <div>
              <div class="s-title">${iconCheck()} Webhook Signer — response</div>
              <ul>
                <li><b>Preferred</b>: <span class="mono">{ txHashes:[ "0x…" ] }</span> if your service also broadcasts.</li>
                <li><b>Alternative</b>: <span class="mono">{ signedRawTransactions:[ "0x…" ] }</span> and the UI will broadcast each raw tx.</li>
                <li>Any non‑2xx or missing fields are treated as errors and printed in the console.</li>
              </ul>
            </div>
            <div>
              <div class="s-title">${iconCircle()} Nonce &amp; idempotency</div>
              <ul>
                <li>Nonces are allocated from the current <b>eth_getTransactionCount</b> and incremented per item.</li>
                <li>On retries, duplicate submissions should be idempotent (<span class="mono">already known</span>/<span class="mono">nonce too low</span> are acceptable outcomes).</li>
                <li>Include an internal idempotency key: hash of <span class="mono">from + firstNonce + count</span>.</li>
              </ul>
            </div>
          </div>

          <div class="divider"></div>

          <div class="section">
            <div class="s-title">${iconGrid()} Event Webhooks — callback schema</div>
            <table class="tbl striped">
              <thead><tr><th style="width:220px;">Type</th><th>Example payload</th><th>Notes</th></tr></thead>
              <tbody>
                <tr>
                  <td class="mono">route_start</td>
                  <td>
                    <pre class="mono">{ "type":"route_start", "ts":1711111111111,
  "payload": { "from":"0x…", "amountWei":"123400000000000000",
    "rules":[{"id":"rule1","label":"Ops","to":"0x…","valueWei":"70000000000000000"},
             {"id":"rule2","label":"Save","to":"0x…","valueWei":"53400000000000000"}] } }</pre>
                  </td>
                  <td>Send a custom secret header (e.g. <span class="mono">X-Webhook-Secret: …</span>) from the UI.</td>
                </tr>
                <tr>
                  <td class="mono">route_complete</td>
                  <td>
                    <pre class="mono">{ "type":"route_complete", "ts":1711111112233,
  "payload": { "from":"0x…", "txHashes":["0xabc…","0xdef…"] } }</pre>
                  </td>
                  <td>Delivery is best‑effort; failures do not block routing.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="divider"></div>

          <div class="section grid-2">
            <div>
              <div class="s-title">${iconScreen()} Security checklist</div>
              <ul>
                <li>Authenticate every call; rotate tokens. Avoid long‑lived tokens in browsers.</li>
                <li>Allowlist source IPs where possible; terminate TLS at the edge.</li>
                <li>Log tx metadata, never raw secrets or mnemonics.</li>
              </ul>
            </div>
            <div>
              <div class="s-title">${iconClose()} Failure handling</div>
              <ul>
                <li>Return structured errors and HTTP status ≥400.</li>
                <li>Keep responses small; large payloads slow down the UI loop.</li>
                <li>Document your rate limits; the UI will respect backoff configured by you.</li>
              </ul>
            </div>
          </div>
        `;

        return { intro, wide };
      }

      case 'settings':
      default: {
        const intro = `
          <p class="lead"><b>Settings</b> — UX behavior, persistence, theme, and language.</p>
          <p class="muted">Settings live in localStorage. Sensitive secrets from other tabs are not stored by default.</p>
        `;

        const wide = `
          <div class="section">
            <div class="s-title">${iconLine()} Options</div>
            <table class="tbl striped">
              <thead><tr><th style="width:280px;">Setting</th><th>Effect</th><th>Notes</th></tr></thead>
              <tbody>
                <tr>
                  <td><b>Confirm before sending</b></td>
                  <td>Requires a confirmation modal before submissions.</td>
                  <td>Recommended in demos and shared environments.</td>
                </tr>
                <tr>
                  <td><b>Mask sensitive inputs</b></td>
                  <td>Hides secrets directly in inputs.</td>
                  <td>Reduces shoulder-surfing risk.</td>
                </tr>
                <tr>
                  <td><b>Block tab switching while tasks run</b></td>
                  <td>Prevents navigation that could disrupt batch/scheduler.</td>
                  <td>Useful during production windows.</td>
                </tr>
                <tr>
                  <td><b>Persist Beacon/RPC</b></td>
                  <td>Saves node URLs to localStorage.</td>
                  <td>Disable on ephemeral or untrusted machines.</td>
                </tr>
                <tr>
                  <td><b>Tooltip delay</b></td>
                  <td>Controls how fast tooltips appear.</td>
                  <td>Lower is snappier; higher reduces accidental hovers.</td>
                </tr>
                <tr>
                  <td><b>Success auto-close</b></td>
                  <td>Auto-closes success modals after N milliseconds.</td>
                  <td>Use 0 to never auto-close.</td>
                </tr>
                <tr>
                  <td><b>Default lookback (slots)</b></td>
                  <td>Default window for Scanner/ETA.</td>
                  <td>Tune for your node and reporting cadence.</td>
                </tr>
                <tr>
                  <td><b>Theme / Language</b></td>
                  <td>Appearance and locale.</td>
                  <td>Applies without reload.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="divider"></div>

          <div class="section">
            <div class="s-title">${iconGrid()} Data and privacy</div>
            <ul>
              <li>Secrets reside in memory only (unless you explicitly export files).</li>
              <li>CSV/JSON are produced locally — follow your internal security policy.</li>
              <li>Clearing localStorage removes local preferences and node URLs.</li>
            </ul>
          </div>

          <div class="divider"></div>

          <div class="section">
            <div class="s-title">${iconInfo()} Beacon API Key</div>
            <table class="tbl striped">
              <thead><tr><th style="width:260px;">Setting</th><th>Effect</th><th>Notes</th></tr></thead>
              <tbody>
                <tr>
                  <td class="mono">Enable custom Beacon API key</td>
                  <td>Turns on the fetch hook that attaches your key to Beacon requests.</td>
                  <td>Applies to URLs that start with the <b>Beacon URL</b> from the top bar.</td>
                </tr>
                <tr>
                  <td class="mono">Persist key</td>
                  <td>Stores the key in localStorage.</td>
                  <td>Off by default; otherwise session‑only (kept in memory).</td>
                </tr>
                <tr>
                  <td class="mono">Attach mode</td>
                  <td>Choose how to attach: <span class="mono">Authorization</span>, custom header, or query param.</td>
                  <td>Preview shows the exact header or URL shape.</td>
                </tr>
                <tr>
                  <td class="mono">Authorization prefix / Header name / Query name</td>
                  <td>Fine‑tune for your provider.</td>
                  <td>Examples: <span class="mono">Bearer </span>, <span class="mono">X-API-Key</span>, <span class="mono">apikey</span>.</td>
                </tr>
                <tr>
                  <td class="mono">Test</td>
                  <td>Probes health/identity/headers endpoints with <span class="mono">X-Use-Beacon-Key: 1</span>.</td>
                  <td>Copy results from the console on the right.</td>
                </tr>
              </tbody>
            </table>
            <div class="grid-2" style="margin-top:8px;">
              <div>
                <ul>
                  <li>To force-apply the key to an ad‑hoc fetch, add header <span class="mono">X-Use-Beacon-Key: 1</span>.</li>
                  <li>The hook does not modify EL RPC requests.</li>
                </ul>
              </div>
              <div>
                <ul>
                  <li>Masking in Settings hides the key in inputs; it is still sent on the wire as configured.</li>
                  <li>Use a provider‑scoped key with limited permissions where possible.</li>
                </ul>
              </div>
            </div>
          </div>
        `;

        return { intro, wide };
      }
    }
  }

  function mount(root: HTMLElement): void {
    injectStyles();

    const selected = readSelectedTopic();

    root.innerHTML = `
      <div class="help-grid">
        <aside class="panel">
          <div class="h">
            ${iconList()}
            <span>Section</span>
          </div>
          <div class="select-wrap">
            <select id="helpSelect" aria-label="Choose a Help section">
              ${TOPICS.map(t => `<option value="${t.key}" ${t.key === selected ? 'selected' : ''}>${t.label}</option>`).join('')}
            </select>
          </div>
        </aside>
        <section class="intro">
          <div id="helpIntro"></div>
        </section>
        <section class="wide">
          <div id="helpWide"></div>
        </section>
      </div>
    `;

    const selectEl = $('#helpSelect', root) as HTMLSelectElement | null;
    const introEl  = $('#helpIntro', root) as HTMLElement | null;
    const wideEl   = $('#helpWide', root) as HTMLElement | null;

    const render = (topicKey: TopicKey) => {
      const { intro, wide } = getContent(topicKey);
      if (introEl) introEl.innerHTML = intro;
      if (wideEl)  wideEl.innerHTML  = wide;
    };

    render(selected);

    if (selectEl) {
      selectEl.addEventListener('change', () => {
        const key = (selectEl.value as TopicKey) || TOPICS[0].key;
        saveSelectedTopic(key);
        render(key);
      });
    }
  }

  function boot(): void {
    const host = $('#helpRoot') as HTMLElement | null;
    if (host) mount(host);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
