# Security Policy

## Supported Versions
We currently support the **0.1.x** line (this repository is pre-1.0). Latest release: **0.1.7**.

## Threat Model (high-level)
- **Keys stay local.** The app signs BLS→0x01 messages locally; no keys are uploaded by default.
- **Offline flow supported.** You can build and export BLS→0x01 JSON fully offline and broadcast later.
- **Connectivity is user-configured.** You explicitly provide Beacon/EL endpoints (prefer private RPC in production).
- **Electron hardening.** `contextIsolation: true`, `nodeIntegration: false`. Development builds relax some settings (`webSecurity: false`, `sandbox: false`) for convenience; **review and harden for production**.
- **CSP.** The renderer uses a permissive CSP during development (`connect-src *`, `'unsafe-eval'`). In production, restrict to your endpoints and disable `unsafe-eval`.

## Reporting a Vulnerability
- Please open a **GitHub Security Advisory** (privately) in this repository or create an issue labeled `security`.
- If disclosure must be private, contact the maintainers via GitHub profiles of **Daniel Thermons**, **Alex Girin**, **Vincent Brook**.

## Dependencies
We aim to keep runtime deps minimal. Notable cryptography libs: `@chainsafe/ssz`, `@noble/bls12-381`, `ethers`.

## Build & Packaging Notes Relevant to Security
- The preload script is explicitly packaged from `src/preload/index.cjs` (see `build.files` in `package.json`).
- Packaged app uses `asar` by default; audit any modules requiring `asarUnpack`.
