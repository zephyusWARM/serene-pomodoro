# Serene Guardian agent guide

Read `CONSTRAINTS.md` for quality gates and `docs/skills-architecture.md` for skill routing, provenance and adapters.

React 19 + Vite renderer: `src/`; Electron main/preloads/native windows: `electron/`. Preserve the calm floating widget and Chinese UI. Work cycle: inspect -> improve -> independent review -> real Electron verification -> fix -> accept.

Canonical skills: `.agents/skills`. Impeccable is the primary product UI authority. Taste frontend and UI UX Pro Max are references; choose at most one optional visual direction pack. Security review is explicit-only. Use `serene-electron-qa` for acceptance; ordinary web Playwright is insufficient.

Run `npm run quality`. Agents without a Windows shell can use the local bridge (`docs/agent-bridge.md`). `npm run qa:electron` rebuilds before desktop testing. Node 22.20+ or 24+ is required; scripts can use the existing supported Codex runtime on Windows. No paid services, credits or purchases. Do not commit/reset/stash or modify unrelated projects without instruction.
