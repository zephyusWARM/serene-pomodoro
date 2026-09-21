---
name: serene-electron-qa
description: Verify Serene Guardian changes against its actual Electron main process, preload IPC, built React renderer, timer lifecycle, persisted preferences, keyboard access and desktop windows. Use for this project's acceptance or regression checks, not a browser-only preview.
---

Read `CONSTRAINTS.md` first. Run from repository root on an interactive Windows desktop. Agents without a Windows shell run the same gates through the local bridge: `node scripts/agent-bridge/submit.mjs quality` (see `docs/agent-bridge.md`).

1. `npm run skills:check`, `npm run lint`, `npm test`.
2. `npm run qa:electron` builds the production renderer and launches the installed Electron using Playwright's Node `_electron.launch`. `tests/electron/launch.cjs` assigns a fresh temporary user-data directory before requiring the real `electron/main.cjs`. Never attach to the user's existing app or alter their saved data.
3. Inspect `artifacts/electron/results.json`, axe JSON and screenshots. Open images; creating a PNG does not constitute visual review. Screenshots are in device pixels (Windows scaling may produce 680x960 for the 340x480 DIP widget).
4. Review the implementation independently, fix demonstrated issues, rerun affected checks and the final complete gate. Report unresolved failures honestly; follow the anti-weakening rule in CONSTRAINTS.

Acceptance source: `tests/electron/acceptance.spec.mjs`. It uses real renderer controls, real BrowserWindow inspection and IPC. Its wall-clock offset accelerates long timers while leaving production interval callbacks and IPC intact. Never replace the timer hook or mock Electron APIs to make product acceptance pass.

Product behavior: focus defaults to 25m, short break 5m, long break 15m; every fourth completed focus gets a long break. Focus completion starts real perimeter glow windows; break completion removes glow and waits for explicit continuation. Pause/reset/mode change remove glow. Main close hides to tray. Settings, daily stats and morning intention persist; current countdown and cycle position intentionally restart with a new process. Background hide is not sleep; suspend pauses focus instead of earning completed sessions. Eye reminder follows 20 elapsed focus minutes when the session is long enough.

Check relevant states: idle/running/paused focus; short/long break and glow; break-complete dialog; Settings; morning-intention dialog; reminder window; hide/show and suspend/resume IPC; invalid saved data; accessible labels, focus trap/restore and native Space activation; zero runtime errors.

Layout probes are part of acceptance: the break quote (longest shipped text injected into the real DOM) must stay inside the ring and above the mode tabs without truncation; the eye-reminder card and countdown must fit the 360x200 window after entrance animations settle. Any remote request (for example web fonts) is a failure: the desktop app must render identically offline, so fonts are bundled in `electron/fonts`.

Fast iteration off Windows: a Linux mirror under Xvfb (Linux Electron, same spec) finds most renderer and timing defects, but it is not acceptance. Emoji render as boxes there, and Windows-only behavior (topmost style after show, tray, DPI) differs. Only the Windows run accepts.

Use axe-core injected into the existing Electron page. The default @axe-core/playwright new-page aggregation is unsupported by Electron's Target.createTarget. Do not disable accessibility rules to work around that transport issue.

Manual boundaries: Node inspection and renderer screenshots do not prove Windows notification delivery, audible chime quality, actual suspend hardware behavior, multi-monitor physical click-through, OS tray clicks, packaged installer/signature or macOS. Mark these unverified unless exercised. Do not claim universal agent/runtime support from a valid SKILL.md alone.
