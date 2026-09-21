# Serene Pomodoro (package: serene-guardian)

Electron + React 19 + Vite floating desktop widget (glass / iOS-style, ~340x480, always-on-top) with a Pomodoro timer,
20-20-20 eye reminders, break overlay + 4-7-8 breathing, and a small stats/"zen garden". Windows and macOS builds via electron-builder.

## Layout
- `src/` React UI (`App.jsx`, `App.css`, `components/*`, `hooks/useTimer.js`, `utils/notifications.js`)
- `electron/` main/preload processes and the standalone HTML windows (`overlay.html`, `eye-reminder.html`, `break-glow.html`)
- Dev: `npm run electron:dev` | Build: `npm run build`, `npm run electron:build:win`
- The working tree usually has uncommitted work. Never commit, reset, stash or discard changes unless asked.

## UI/UX skills (project-level, in `.claude/skills/`)
- `impeccable` - primary design skill. `/impeccable init` (writes PRODUCT.md) -> `audit` / `critique` -> `polish`, `layout`, `typeset`, `colorize`, `animate`, `harden`.
  Re-run the detector on changed UI when done: `.claude/skills/impeccable/scripts/impeccable detect --json <files>` (on Windows use `impeccable.cmd`).
- `redesign-existing-projects` - audit-first upgrade of the existing UI without breaking behaviour.
- `ui-ux-pro-max` - REFERENCE library only (styles, palettes, typography, UX guidelines). Query with `python .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain style|color|typography|ux`.
  It is the user's own copy from Desktop\my-website; do not overwrite it.
- `design-taste-frontend` (v2 experimental) is for landing pages/portfolios; this app is product UI (Operate mode), so treat its dials as guidance, not law.
  `high-end-visual-design` / `minimalist-ui` are optional direction packs; use one at most, only after the direction is chosen.
- `image-to-code` needs an image-generation tool; skip unless one is available.
- Do not stack all skills in one pass. Order: audit -> direction -> implement -> detect -> verify.

## Guardrails for UI work
- Preserve the calm, quiet identity, timer behaviour, notification logic, IPC contracts (`electron/preload.cjs`) and copy unless told otherwise.
- Respect `prefers-reduced-motion`, keep text contrast >= 4.5:1, keyboard focus visible, hit targets >= 44px on the widget.
- Verify in the real Electron window (`npm run electron:dev`), not only the Vite page: transparency, `backdrop-filter`, dragging regions and always-on-top matter here.
