# Contributing

Thanks for helping improve **Validator Tools**!

## Quick Start (Dev)
```bash
npm i
npm run dev   # TS watchers + Electron (opens the app)
```

## Production Build
```bash
npm run dist  # electron-builder for macOS/Windows/Linux
```
`src/preload/index.cjs` is **packaged** via `build.files` in `package.json`, so it works in production without extra steps.

## Project Structure
- `src/main/` — Electron main process & IPC (BLS→0x01, EIP‑7002, scanners, file export).
- `src/preload/index.cjs` — Preload bridge exposing `window.api`.
- `src/renderer/` — UI modules (dashboard, bls, eip7002, scanner, watchdog, scheduler, eta, batch, payout‑rules, settings, help, exit‑tracker).
- `src/common/` — Shared protocol helpers (SSZ, BLS, constants).

## Coding Guidelines
- TypeScript (ES2022), strict-enough TS config; prefer small modules.
- Keep renderer free from Node APIs; all privileged ops go through IPC.
- Follow conventional commits when possible (`feat:`, `fix:`, `docs:`, `chore:`).
- Include tests or a simple repro for tricky bugfixes.

## Pull Requests
- One logical change per PR.
- Update docs/README if behavior or scripts change.
- Ensure `npm run build` passes.

## Authors / Maintainers
- **Daniel Thermons**, **Alex Girin**, **Vincent Brook**
