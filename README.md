# Validator Tools for Ethereum — Desktop GUI (CL/EL)

[![Electron](https://img.shields.io/badge/Electron-28%2B-47848F?logo=electron&logoColor=white)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](#)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A5%2018-339933?logo=node.js&logoColor=white)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-000000?logo=open-source-initiative&logoColor=white)](#)

> Note: monitoring and scanning require **no validator signing keys**. The app never needs attestation/proposal keystores; 

Desktop toolkit for Ethereum validator operations. Build, sign, and export BLS→Execution (0x00→0x01) changes entirely offline; construct and submit EIP-7002 exit and partial-withdraw requests with on-chain fee discovery, EIP-1559 gas configuration, bounded retries, and batch execution. Run high-throughput withdrawals scanning by 0x01 address or validator index over a configurable lookback window with deadline control and per-block statistics (average, p50/p95). Operate from a single console with Beacon/RPC health checks, utility static calls, structured JSON/CSV export, and local-first security (no secret persistence by default). Mainnet and Holesky supported; flexible Beacon authentication (Bearer / X-API-Key / query).

**Highlights included:**

- **Smart scheduler (7002/7251).** Automatically opens submission windows when dynamic fees drop or the queue thins—under explicit fee-cap guardrails. Pulls on-chain fee getters and queue parameters directly from the 7002/7251 predeploys. Pause/resume safely; no spam, no surprises.

- **ETA calculator for exits/partials.** Protocol-aware forecasts that use `MAX_WITHDRAWAL_REQUESTS_PER_BLOCK`, `TARGET_WITHDRAWAL_REQUESTS_PER_BLOCK`, and current network load to estimate time-to-inclusion and total cost (avg, p50/p95). Export results to CSV for runbooks.

- **Batch master for N validators.** Prepare and submit large 7002 sets (partial/exit) with bounded concurrency, automatic retries, and per-transaction gas/fee caps. Queue-aware ordering to avoid wasting attempts.

- **Multisig workflows (Safe/Gnosis) for 7002/7251.** End-to-end prepare → sign → execute flows through Safe for teams that require shared control and auditability.

- **Explorer integration.** In-app status widgets for 7002/6110/7251 requests, plus REST endpoints you can surface to operators and read-only stakeholders.

- **Multi-client support.** One GUI for Lighthouse, Teku, Prysm, Nimbus, and Lodestar with consistent 7002/7251 flows—no client lock-in or per-client playbooks.

- **MaxEB consolidation optimizer (7251).** Data-driven suggestions on what and when to consolidate, combining APR modeling, operational costs, and “what-if” risk analysis.

- **Scheduled top-ups to MaxEB.** Automated top-ups toward a target effective balance under fee/load ceilings and maintenance windows; auto-pause under adverse conditions.

- **Payout rules.** Route partial withdrawals by percentage across multiple destinations with tagging, audit logs, and webhooks—keep ops, savings, and fee wallets tidy.

- **Dry-run from the GUI.** Record-and-replay scenarios (BLS→0x01, partial/exit, consolidate) on Holesky/local, then promote the same plan to mainnet.

- **Optional 7702 session keys.** Scoped, time-bounded permissions limited to 7002/7251 actions—no broad account control, no long-lived risk.

- **Queue visualizer & builder-aware alerts.** Live pressure graphs and guidance to target favorable inclusion windows for request submission.

---

## Contracts & Protocol Constants

### EIP-7002 Predeploy (Execution Layer)

| Network  | Contract address                                   | Call semantics                                                                 |
|---|---|---|
| Mainnet  | `0x00000961Ef480Eb55e80D19ad83579A64c007002`        | Fee discovery via empty `eth_call`; transaction must include `msg.value = fee (wei)` |
| Holesky  | `0x00000961Ef480Eb55e80D19ad83579A64c007002`        | Same predeploy for testing                                                     |

### BLS→Execution (Capella)

| Item                         | Value                | Notes                                                                                 |
|---|---|---|
| Signing domain prefix        | `0x0A000000`         | Concatenate with first 28 bytes of `hash_tree_root(ForkData{forkVersion, genesisRoot})` |
| Beacon pool endpoint         | `POST /eth/v1/beacon/pool/bls_to_execution_changes` | Payload `{ data: [ BLSToExecutionChange ] }`                                  |

### Genesis Validators Root

| Network  | `genesis_validators_root`                                                         |
|---|---|
| mainnet  | `0xcf8e0d4e9587369b2301d0790347320302cc0943d5a1884560367e8208d920f2`             |
| holesky  | `0x9143aa7c615a7f7115e2b6aac319c03529df8242ae705fba9df39b79c59fa8b1`             |

---

## Feature Matrix

| Module / View      | Purpose                                                                 | Core APIs / Protocol Elements                                   |
|---|---|---|
| **Dashboard**       | Single-screen status for a validator: withdrawal creds, EL balance, node health, current 7002 fee. | Beacon `GET /eth/v1/beacon/states/head/validators/{id}` · EL `eth_chainId`, `eth_blockNumber` |
| **BLS→0x01**        | Build & sign `BLSToExecutionChange` to switch withdrawal credentials from 0x00 to 0x01. | Domain `0x0A000000` with network `genesis_validators_root`; Beacon pool POST |
| **Exit / Partial (EIP-7002)** | Submit Exit (`amount=0`) or Partial (`amount>0` gwei). Automatic fee discovery and EIP-1559 gas handling with retries. | Predeploy `0x…7002`; empty `eth_call` for fee; calldata = 48-byte pubkey ∥ `uint64 amount` |
| **Scanner**         | Parallel scan of recent slots for CL→EL withdrawals to a specific 0x01 address or validator index; lookback window with deadlines. | Beacon `GET /eth/v2/beacon/blocks/{slot}` → `execution_payload.withdrawals` |
| **Watchdog**        | Fast preflight on a validator: status, slashing flags, withdrawal creds. | Beacon `GET /eth/v1/beacon/states/head/validators/{id}` |
| **Scheduler**       | Conditional automation for 7002 submissions (fee cap, queue/ETA inputs). | EL `eth_call` to predeploy; Beacon window stats |
| **ETA**             | Estimate time and aggregate 7002 fee for queues; CSV export.            | Same inputs as Scheduler                                         |
| **Batch**           | Mass 7002 submissions with bounded concurrency and backoff.             | EIP-1559 transactions; CSV import/export                         |
| **Payout Rules**    | Route funds received on the 0x01 address by percentage to multiple recipients. | EL send via unlocked RPC or external signer webhook              |
| **Settings / Help** | Beacon auth attach (Bearer / X-API-Key / query), endpoints, UX/theme, inline docs. | —                                                                |

---

## Requirements

- Node.js ≥ 18, npm ≥ 9  
- Electron runtime (installed via devDependencies)  
- One Beacon API endpoint and one EL RPC endpoint  
- OS: Linux, macOS, or Windows

---

## Quick Start

```bash
npm i
npm run start      # compile TS to dist/ and launch Electron
# live dev:
npm run dev        # watch main/renderer + Electron reload
```

### Build Scripts

| Script           | Function                                                                                  |
|---|---|
| `build:ts`       | Compile TypeScript for main and renderer into `dist/` (`tsconfig.main.json`, `tsconfig.renderer.json`). |
| `copy:renderer`  | Copy static assets from `src/renderer/` to `dist/renderer/`.                              |
| `build`          | `clean` + `build:ts` + `copy:renderer`.                                                   |
| `start`          | `build` + `electron .`.                                                                   |
| `dev`            | Watchers for main/renderer + `wait-on` + `electron .`.                                    |
| `dist`           | Production packaging via `electron-builder` (mac/win/linux).                              |

---

## Project Layout

| Path                         | Purpose                                                                                 |
|---|---|
| `src/main/`                 | Electron main process; IPC for EIP-7002, BLS→0x01, scanners, file exports.              |
| `src/preload/index.cjs`     | Preload bridge exposing the IPC surface to `window.api`.                                |
| `src/renderer/`             | UI (TS modules). Pages: dashboard, bls, eip7002, scanner, watchdog, scheduler, eta, batch, payout-rules, settings, help, exit-tracker. |
| `src/common/`               | Shared helpers and constants (SSZ/BLSToExecution builder, protocol constants).          |
| `dist/`                     | Compiled artifacts for runtime.                                                          |
| `LICENSE`                   | MIT.                                                                                    |

---

## Security Model

- Local-first processing; sensitive material is never transmitted unless explicitly exported by the operator.  
- Offline mode for BLS→Execution: build and sign without network access; export JSON for later broadcast.  
- Electron hardening in production (`contextIsolation: true`, `nodeIntegration: false`, sandbox/webSecurity on).  
- Renderer CSP kept flexible during development; tighten for production by removing `unsafe-eval` and narrowing `connect-src`.  
- Optional session lock with password (derived via `scrypt`, compared with constant-time checks).

---

## Protocol Details

### BLS→Execution (0x00→0x01)

- Container: `BLSToExecutionChange`.  
- Signing domain: `0x0A000000` concatenated with the first 28 bytes of `hash_tree_root(ForkData{forkVersion, genesisValidatorsRoot})`.  
- Broadcast path: Beacon `POST /eth/v1/beacon/pool/bls_to_execution_changes`.  
- Typical flow:
  1. Provide BLS **withdrawal** private key (32 bytes), validator BLS pubkey (48 bytes), and target 0x01 execution address.
  2. Compute domain using the network’s `genesis_validators_root` (Mainnet/Holesky).
  3. Sign locally; export; optionally submit to the Beacon pool.

### EIP-7002 (Exit / Partial Withdraw)

- Predeploy address: `0x00000961Ef480Eb55e80D19ad83579A64c007002`.  
- Fee discovery: empty `eth_call` to the predeploy; returned value (wei) must be passed as `msg.value`.  
- Call data: `validator_pubkey (48 bytes)` ∥ `amount (uint64, big-endian)`. Exit ⇒ `amount=0`; Partial ⇒ `amount>0` (gwei).  
- Sender flow: chainId verification, fee read, gas estimation with EIP-1559 fields, bounded retries and fee bumping; returns tx hash and status.

---

## IPC Surface (Preload → Renderer)

| Method | Args → Returns | Purpose |
|---|---|---|
| `getGenesis(base)` | → `{ data }` | Network genesis (validators root, time). |
| `getHeader(base, id)` | → `{ data }` | Beacon header by id or `head`. |
| `getValidator(base, id)` | → `{ data }` | Validator record by index or pubkey. |
| `getWithdrawalsStats({ beaconBase, lookback, start? })` | → stats | Samples withdrawals per block over a window. |
| `postBlsToExec(base, payload)` | → `ok` | Submit `BLSToExecutionChange` to the pool. |
| `buildBlsToExec(args)` | → `{ message, signature }` | Build & sign BLS→0x01 locally. |
| `eip7002GetFee(rpcUrl)` | → `feeWei: string` | Read current 7002 fee from predeploy. |
| `eip7002Submit(args)` | → `{ txHash, status }` | Submit Exit/Partial 7002 request. |
| `eip7002AddrFromSecret({ secret, derivationPath? })` | → `{ address }` | Derive EOA (default `m/44'/60'/0'/0/0`). |
| `eipStaticCall({ rpcUrl, to, data? })` | → `{ hex }` | Utility static call. |
| `scanWithdrawals({ beaconBase, address?, validatorIndex?, lookback, start })` | → matches | Pull withdrawals by 0x01 address or validator index. |
| `saveJSON(name, obj)` / `saveText(name, text)` | → path | File export helpers. |
| `profileGet/set`, `lockSet/verify/status`, `rpcGetInfo`, `resetAll` | — | Misc system helpers. |

---

## Packaging Notes

- Ensure the preload script ships with production artifacts; electron-builder should include it via `build.files`.  
- Prefer private RPC/Beacon endpoints for production use.  
- Consider OS code signing.  
- Harden CSP and `BrowserWindow` flags per your threat model.  
- Keep `package.json` metadata (`version`, `repository`, `homepage`) in sync with UI “About”/footer.  

---

## Troubleshooting

- **“EIP-7002 predeploy not found”** — wrong network or RPC; verify `chainId` and predeploy availability.  
- **“EOA preflight mismatch”** — derived sender does not match the validator’s 0x01 address; recheck secret/derivation and validator record.  
- **Frequent 429/503** — Beacon provider throttling; reduce lookback/concurrency or switch provider.  
- **Shallow scanner results** — provider may not serve deep `/eth/v2/beacon/blocks/{slot}`; reduce lookback or change Beacon node.

---

## License

MIT.
