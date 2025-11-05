# Validator Toolkit (Electron + TypeScript)

Desktop GUI for Ethereum validators: BLS→0x01, EIP‑7002 requests (exit/partial), scanner, scheduler, and operator console.

> This app is not a hot wallet. Secrets never leave the machine. You can build the BLS→0x01 message completely offline, export JSON, and broadcast from a separate online host.

---

## Contracts & Protocol Constants

### EIP‑7002 Predeploy (EL)
| Network  | Contract address | Notes |
|---|---|---|
| Mainnet  | `0x00000961Ef480Eb55e80D19ad83579A64c007002` | `msg.value` must equal the fee returned by empty call |
| Holesky  | `0x00000961Ef480Eb55e80D19ad83579A64c007002` | Same predeploy for testing |

### BLS→Execution (Capella)
| Item | Value | Notes |
|---|---|---|
| Signing domain prefix | `0x0A000000` | Concatenate with first 28 bytes of `hash_tree_root(ForkData)` |
| Beacon pool endpoint | `POST /eth/v1/beacon/pool/bls_to_execution_changes` | Send `{{ data: [ ... ] }}` |

### Genesis Validators Root
| Network | `genesis_validators_root` |
|---|---|
| mainnet | `0xcf8e0d4e9587369b2301d0790347320302cc0943d5a1884560367e8208d920f2` |
| holesky | `0x9143aa7c615a7f7115e2b6aac319c03529df8242ae705fba9df39b79c59fa8b1` |

---

## Feature matrix

| Tab / Module | Purpose | Key protocol / endpoints |
|---|---|---|
| **Dashboard** | One‑screen validator view: status, withdrawal creds, EL balance, node health, 7002 fee | Beacon: `GET /eth/v1/beacon/states/head/validators/{{id}}` · EL: `eth_chainId`, `eth_blockNumber` |
| **BLS → 0x01** | Build and sign `BLSToExecutionChange` for switching 0x00→0x01 | Domain `0x0A000000` with `genesis_validators_root`; Beacon: `POST /eth/v1/beacon/pool/bls_to_execution_changes` |
| **Exit / Partial (EIP‑7002)** | Send Exit (amount=0) or Partial (amount>0, gwei) | Predeploy `0x00000961Ef480Eb55e80D19ad83579A64c007002` (fee via empty call; calldata = 48‑byte pubkey ∥ uint64 amount) |
| **Scanner** | Scan recent slots for CL→EL withdrawals to your 0x01 address | Beacon: `GET /eth/v2/beacon/blocks/{{slot}}` (execution_payload.withdrawals) |
| **Watchdog** | Quick validator preflight (status, slashed, creds) | Beacon: `GET /eth/v1/beacon/states/head/validators/{{id}}` |
| **Scheduler** | Conditional automation for 7002 (fee cap, MA‑drop, load ratio) | EL: `eth_call` to predeploy; Beacon: lookback stats for withdrawals per block |
| **ETA** | Estimate time and total 7002 fee for a queue | Same inputs as Scheduler; CSV export |
| **Batch** | Mass 7002 submissions with concurrency & retries | EL 1559 tx send; CSV export |
| **Payout Rules** | Route received ETH from 0x01 address by % to multiple recipients | EL: unlocked RPC account or webhook signer |
| **Settings / Help** | UX, theme, Beacon API key attach; inline docs | — |

---

## Requirements

- Node.js ≥ 18, npm ≥ 9
- Electron runtime (installed via `devDependencies`)
- A Beacon API endpoint and an EL RPC endpoint (public or private)
- OS: Linux / macOS / Windows

## Quick start

```bash
npm i
npm run start         # compiles TS to dist/ and launches Electron
# or live dev:
npm run dev           # two tsc watchers + Electron
```

### Build scripts

| Script | What it does |
|---|---|
| `build:ts` | TypeScript → `dist/` for main and renderer (`tsconfig.main.json`, `tsconfig.renderer.json`) |
| `copy:renderer` | Copies static renderer assets from `src/renderer/` to `dist/renderer/` |
| `build` | `clean` + `build:ts` + `copy:renderer` |
| `start` | `build` + `electron .` |
| `dev` | Watchers for main/renderer + `wait-on` + `electron .` |
| `dist` | Production packaging via `electron-builder` (mac/win/linux) |

---

## Project layout

| Path | Purpose |
|---|---|
| `src/main/` | Electron main process, IPC handlers (EIP‑7002, BLS→0x01, scanners, file save) |
| `src/preload/index.cjs` | Preload bridge that exposes the IPC surface into `window.api` |
| `src/renderer/` | UI (Vanilla/TS + modules). Pages: dashboard, bls, eip7002, scanner, watchdog, scheduler, eta, batch, payout‑rules, settings, help, exit‑tracker |
| `src/common/` | Shared protocol helpers and constants (`constants.ts`, SSZ helpers, BLS message builder) |
| `dist/` | Compiled output used by Electron during `start` / `dev` |
| `LICENSE` | MIT |

---

## Security model (read and review)

- **Secrets stay local**. The app signs locally; nothing is uploaded by default.
- **Offline support** for BLS→0x01: build and export JSON without network access; broadcast later.
- **Node settings** are entered manually; no auto‑discovery. Prefer private RPC/Beacon endpoints in production.
- **Renderer CSP** allows `connect-src *` for node flexibility; `script-src` uses a nonce and enables `unsafe-eval` during development. If you harden the app, tighten CSP.
- **Electron flags**: `contextIsolation: true`, `nodeIntegration: false`. Review BrowserWindow options before production (e.g. `webSecurity`, `allow-file-access-from-files`, `sandbox`) and adjust for your threat model.

---

## Protocol specifics

### BLS → 0x01 (Capella)

- Message type: `BLSToExecutionChange`
- Signing domain: `0x0A000000` concatenated with first 28 bytes of `hash_tree_root(ForkData{{forkVersion, genesisValidatorsRoot}})`
- Payload broadcast: Beacon `POST /eth/v1/beacon/pool/bls_to_execution_changes`
- Typical flow:
  1. Provide BLS **withdrawal** private key (32 bytes), validator BLS pubkey (48 bytes), the target 0x01 address.
  2. Compute domain using the network’s `genesis_validators_root` (Mainnet/Holesky).
  3. Sign, export JSON, optionally broadcast from the app.

### EIP‑7002 (Exit / Partial‑withdraw)

- Predeploy contract: `0x00000961Ef480Eb55e80D19ad83579A64c007002`
- Fee discovery: `eth_call` with empty calldata → returns **wei** to pay as `msg.value`.
- Call data: `48-byte validator_pubkey || uint64 amount (big‑endian)`. Exit ⇒ `amount=0`. Partial ⇒ `amount>0` (gwei).
- The app checks chainId, reads fee, assembles and submits a 1559 tx. Success is reported with tx hash; inclusion can be tracked via the Beacon API.

---

## IPC surface (preload → renderer)

Methods exposed on `window.api` (subset):

| Method | Args → Returns | Purpose |
|---|---|---|
| `getGenesis(base)` | → `{ data }` | Beacon genesis (validators root & time) |
| `getHeader(base, id)` | → `{ data }` | Beacon header by id or `head` |
| `getValidator(base, id)` | → `{ data }` | Validator record by index or pubkey |
| `getWithdrawalsStats({beaconBase, lookback, start?})` | → stats | Samples withdrawals per block over a window |
| `postBlsToExec(base, payload)` | → `ok` | Submit `BLSToExecutionChange` to the pool |
| `buildBlsToExec(args)` | → `{ message, signature }` | Build & sign BLS→0x01 change locally |
| `eip7002GetFee(rpcUrl)` | → `feeWei:string` | Read current 7002 fee from predeploy |
| `eip7002Submit(args)` | → `{ txHash, status }` | Submit Exit/Partial 7002 request |
| `eip7002AddrFromSecret({secret, derivationPath?})` | → `{ address }` | Derive EOA (default `m/44'/60'/0'/0/0`) |
| `eipStaticCall({rpcUrl,to,data?})` | → `{ hex }` | Utility static call (e.g. optional 7251) |
| `scanWithdrawals({beaconBase,address?,validatorIndex?,lookback,start})` | → matches | Pull withdrawals matching address or validator |
| `saveJSON(name,obj)` / `saveText(name,text)` | → path | File export helpers |
| `profileGet/set`, `lockSet/verify/status`, `rpcGetInfo`, `resetAll` | — | Misc helpers used across UI |

---

## Packaging notes

This repo uses a minimal **tsc + electron** setup. For production packaging:

- Ensure the **preload** file is shipped. The app points to `src/preload/index.cjs` from the compiled main process; electron-builder includes it via `build.files`.
- Consider using code signing on your target OS.
- Harden the CSP and BrowserWindow flags for your environment.
- Populate `package.json` fields (`author`, `repository`, `bugs`, `homepage`, `keywords`) and keep the UI “Version” badge in sync with `package.json`.

---

## Troubleshooting

- **“EIP‑7002 predeploy not found”** — wrong network or RPC; check `chainId`, ensure the predeploy exists on the selected chain.
- **“EOA preflight mismatch”** — the derived sender address does not equal the validator’s 0x01 withdrawal address; verify the secret/derivation and the validator record.
- **Public Beacon throttling (429)** — switch provider or reduce lookbacks / concurrency.
- **Scanner returns few rows** — provider may not serve deep history via `/eth/v2/beacon/blocks/{{slot}}`; reduce lookback or use a different Beacon node.

---

## License

MIT. See `LICENSE`.
