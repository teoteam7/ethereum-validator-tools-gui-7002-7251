# Security Policy

## Supported Versions
We currently support the **0.1.x** line (pre‑1.0). Latest release: **0.1.7**. Security fixes will be back‑ported to the latest 0.1.x when feasible.

## Scope & Non‑Goals
- This is a **desktop, local‑first** application. There is **no** server‑side component operated by the authors, no telemetry, and no auto‑update channel.
- The app is **not a hot wallet**. It **never requires validator signing keys/keystores** (attestation/proposal keys) for monitoring or scanning.  
- For BLS→Execution (0x00→0x01), the **withdrawal key** may be used **offline** to build/sign the change; you can export JSON and broadcast from a separate online host.
- For EIP‑7002 (exit/partial), an EOA that controls the 0x01 address may be loaded **in memory only** (not persisted) or provided via an **external signer** (e.g., Safe or an RPC that performs signing).

## Threat Model (high‑level)
- **Keys stay local.** Secrets are processed in memory; by default they are **not persisted** to disk. We do not upload keys or JSON keystores.
- **Offline flow supported.** BLS→Execution changes can be fully built and signed offline; export JSON and broadcast elsewhere.
- **User‑defined connectivity.** Operators explicitly configure Beacon and EL RPC endpoints. Production deployments should prefer private endpoints.
- **Electron hardening.** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true` in production builds.
- **Minimal surface.** The renderer talks to the main process through a minimal, explicit **preload bridge** (`window.api`) with narrowly scoped IPC handlers.
- **CSP discipline.** Development CSP is permissive for DX; **production must be tightened** (see below). No dynamic code injection is used by the app.

## Data Handling
**Stored on disk (under `app.getPath("userData")`):**
- `vt.profile.json` — non‑secret profile (network, endpoints, UX settings).
- `vt.lock.json` — password lock state: random salt and `scrypt` hash; no plaintext secrets.

**Not stored by default:**
- Validator signing keys/keystores (attestation/proposal).  
- EOA secrets (private keys or mnemonics) used for EIP‑7002 submissions.  
- Beacon API keys (Bearer/X‑API‑Key/query) — kept in memory only during the session.

**Deletion & reset:**
- Use the in‑app `reset:all` action to remove lock state and, optionally, the profile. This clears `vt.lock.json`, the onboarding flag, and (if selected) `vt.profile.json`.

## IPC & Process Isolation
- The app uses a **preload script** to expose a restricted API surface; `contextIsolation` is enabled and `nodeIntegration` is disabled.
- IPC handlers validate inputs (address formats, sizes, ranges) and do not eval dynamic code.
- The Electron `remote` module is not used.
- Renderer exceptions and console logs are **suppressed in production**; verbose logging is limited to development builds.

## Network & CSP
- Development builds relax some settings for convenience (e.g., `'unsafe-eval'` and `connect-src *`). Production builds **must** use a restrictive CSP and trusted endpoints.
- Recommended production CSP (adjust endpoints as needed):

  ```http
  Content-Security-Policy:
    default-src 'self';
    script-src 'self' 'nonce-__NONCE__';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data:;
    connect-src 'self' https://YOUR-BEACON https://YOUR-RPC;
    frame-ancestors 'none';
    base-uri 'self';
    object-src 'none';
  ```

## Build & Packaging Notes
- `IS_DEV` gates development convenience flags. In production builds we set `sandbox: true`, `webSecurity: true`, and **do not** enable `allow-file-access-from-files`.
- The preload script (`src/preload/index.cjs`) is explicitly included in packaging; audit any changes to the preload bridge.
- The packaged app uses `asar` by default; review any `asarUnpack` exceptions.
- Consider **code signing** on target platforms and distributing checksummed artifacts.
- Use a lockfile (`npm ci`) and run `npm audit` / `npm audit signatures` during CI to reduce supply‑chain risk.

## Dependencies
We keep the runtime set lean. Notable cryptography and protocol libraries include:
- `@chainsafe/ssz` (SSZ containers and hashing),
- `@noble/curves` (BLS12‑381),
- `ethers` (EL RPC, EIP‑1559 transactions).

## Operational Hardening Checklist
- Prefer private RPC/Beacon endpoints; restrict public endpoints to read‑only where possible.
- Tighten CSP (remove `'unsafe-eval'`, narrow `connect-src`), and avoid loading any remote UI resources.
- Run on a dedicated operator workstation with OS disk encryption and screen lock enabled.
- Use an **external signer** (e.g., Safe) for EIP‑7002 where organizational policy requires split control.
- Keep Electron/Node.js/TypeScript updated to patched versions; rebuild when security advisories are published.
- Disable verbose logging in production; do not share logs that might contain endpoint URLs or tokens.
- Review `window.api`/IPC changes during code review to ensure the surface remains narrow and typed.

## Known Limitations
- Secrets are processed in memory; operating systems, debuggers, or malware with local access can still exfiltrate process memory.
- Using untrusted RPC/Beacon endpoints may leak metadata (IP, timing). Prefer private endpoints behind TLS, and avoid embedding tokens in repository code.

## Reporting a Vulnerability
Please report security issues privately via a **GitHub Security Advisory** for this repository or open an issue labeled `security` with minimal detail and request a private channel. If direct contact is required, reach out to the maintainers via their GitHub profiles: **Daniel Thermons**, **Alex Girin**, **Vincent Brook**. We aim to acknowledge within 72 hours and provide a remediation timeline within 14 days.
