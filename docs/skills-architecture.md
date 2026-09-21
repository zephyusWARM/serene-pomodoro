# Project skill architecture

`.agents/skills/<name>/SKILL.md` is the only maintained skill tree. Open Agent Skills frontmatter keeps discovery portable. `node scripts/skills-bootstrap.mjs` creates only Claude Code adapters; `node scripts/skills-check.mjs` rejects independent copies, broken links, unexpected skill folders and unreviewed content drift.

## Agent discovery and limits

| Agent | Project discovery | Evidence (2026-09-21) |
|---|---|---|
| Claude Code (Windows CLI) | `.claude/skills/<name>` junctions to canonical folders | **Live**: headless `claude -p` (bridge task `claude:skills`) listed all 13 model-invocable project skills. `security-best-practices` is correctly absent from the model's list (`disable-model-invocation`, explicit `/security-best-practices` only). |
| Antigravity IDE (Gemini 3.8 Flash High) | `.agents/skills` | **Live**: asked via the bridge (`antigravity:ask`), the agent listed the same 13 skills from its registry, reported `security-best-practices` as explicit-only, and applied `code-review-and-quality`/`security-best-practices` in the independent review. The `/` menu in its panel also lists project skills. |
| Codex | `.agents/skills` | Earlier session saw existing skills; skills added later need a fresh task. No `codex` CLI on PATH and the account was rate-limited, so not re-verified live today. |
| Gemini CLI | `.agents/skills` native alias | Documentation only; Gemini CLI is not installed. |
| Claude Cowork | Host-managed skills/plugins | Project folders are **not** auto-loaded as Cowork skills. A Cowork session reads the canonical files directly (as this one did) and can run gates via `docs/agent-bridge.md`. |

The upstream [skills agent table](https://github.com/vercel-labs/skills#supported-agents) uses `.agents/skills` for Codex, Gemini and Antigravity. [Gemini documentation](https://geminicli.com/docs/cli/skills/) confirms the alias has precedence. No redundant `.gemini/skills` or `.agent/skills` is necessary.

True directory symlink creation returned EPERM on this Windows host. Bootstrap falls back to directory junctions, verified to resolve to canonical files without copying. Junctions embed absolute paths and must be regenerated after moving/cloning the repository; they are ignored, not portable tracked artifacts. Bootstrap refuses to replace an existing independent skill directory. Do not install a second copy to resolve a link failure.

## Selection and routing

| Capability | Decision and scope |
|---|---|
| Impeccable 4.3.1 | Primary product UI craft/review; retained canonical references and Codex metadata; preserved Claude invocation metadata and `.claude/agents` helper definitions. |
| minimalist-ui, high-end-visual-design, redesign-existing-projects | Retained requested visual references; consult the relevant one, do not combine competing styles. Incumbent product decisions and CONSTRAINTS take priority. |
| design-taste-frontend | Retained as reference only. Description narrowed so it does not become the product UI authority. |
| UI UX Pro Max 2.13.0 | Refreshed from official NextLevelBuilder checkout. Searchable UX/accessibility/design data complements craft; use focused queries rather than generating a conflicting design system. |
| web-design-guidelines | Focused renderer usability audit, not a mandate to turn Electron into a website. |
| vercel-react-best-practices | Installed because package.json actually uses React 19. Apply client React guidance; Next.js/SSR rules do not apply to this Vite renderer. |
| constraint-driven-development | Durable quality contract and anti-weakening review. |
| code-review-and-quality | Independent review dimensions. |
| accessibility | Semantics, keyboard, focus and assistive technology guidance for the actual renderer. |
| ui-screenshots | Its Electron section explicitly uses Node Playwright `_electron`; ordinary browser/Python examples are not desktop acceptance. |
| security-best-practices | Explicit review only: upstream description, Claude `disable-model-invocation`, Codex `allow_implicit_invocation: false`. Other agents must follow the explicit-only routing instruction; equivalent enforcement is untested. |
| serene-electron-qa | Project-owned repeatable Electron acceptance workflow; consult its live SKILL.md and scripts. |

Not installed after reading upstream: `frontend-ui-engineering` substantially overlaps retained craft/accessibility/React capabilities; `composition-patterns` is premature for the current small app and is intended for reusable component API architecture; `browser-testing-with-devtools` assumes a Chrome DevTools MCP runtime absent here and duplicates Node Electron inspection; `web-quality-audit` includes public-web SEO/Lighthouse/CrUX measurements that are not acceptance for this desktop shell. Its measurement-first principle is useful, but the project QA workflow covers the real target. Existing Claude `image-to-code` was archived as unrequested overlapping capability.

## Provenance and updates

`skills-lock.json` is the upstream skills CLI lock for CLI-managed installs. `.agents/skill-provenance.json` adds local tree SHA256, known versions/commits, and intentional adaptations. Existing Taste/Impeccable installs lacked commit provenance; this is explicitly recorded rather than inventing one. Hashes exclude downloaded executable caches and Python bytecode.

Current install tooling: `vercel-labs/skills` CLI 1.7.0; requires Node >=22.20. The machine system Node 22.11 is too old for its stated requirement. On this host use the bundled Node 24.19 executable with the npm CLI script (calling npx.cmd selects its adjacent old Node):

```powershell
& 'C:/Users/j9902/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' 'C:/Program Files/nodejs/node_modules/npm/bin/npx-cli.js' --yes skills@1.7.0 list --json
```

On a machine with supported Node, `npx skills@1.7.0 add <owner/repo> --skill <selected-name> --agent codex --yes` updates the canonical location. Do not pass `--all`. Review the upstream diff and local adaptations before accepting an update. Run bootstrap, relevant executable smoke checks, and review/update only the affected provenance hash. Never regenerate hashes solely to make validation green. The CLI lock covers only CLI-managed skills; it is not a full reconstruction manifest for existing local skills. The committed canonical tree is the reproducible source.

UI UX Pro Max source: [official upstream](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), commit `0d2b646cb6f48d8478f41417b2e8a5a30fd59175`, version 2.13.0. Copied its complete official skill tree, then replaced Claude plugin-specific `${CLAUDE_PLUGIN_ROOT}` paths with `.agents/skills/ui-ux-pro-max` for project execution. The unrelated Desktop/my-website copy was not read or changed.

Reconciliation backups are in ignored `.skill-work.local/pre-reconcile/`, outside agent discovery: original Claude skill tree plus original canonical tree. They are a rollback aid, not active maintained installations. Root skill discovery should never recurse into that folder.

## Windows checks performed

- 2026-09-21, via the local bridge on Windows: `npm run quality` passed end to end (skills check with 14 canonical skills, ESLint 0 warnings, 3 unit tests, Vite build, 5/5 real Electron acceptance tests).

- `node scripts/skills-bootstrap.mjs` twice (idempotent), then `node scripts/skills-check.mjs`: pass.
- `skills@1.7.0 list --json` (Codex session): all 13 selected shared skills mapped to Codex, Claude Code, Gemini CLI and Antigravity discovery paths. This is installer inventory evidence, not proof of live model activation.
- `.agents/skills/impeccable/scripts/impeccable.cmd context`: executes successfully; reports missing PRODUCT.md/design context, permits scoped existing-UI refinement.
- `python .agents/skills/ui-ux-pro-max/scripts/search.py 'keyboard focus modal' --domain ux -n 1`: executes successfully and returns the focus-state guideline.
- Real Electron acceptance and screenshots belong to the project QA command; do not substitute these skill smoke tests for product verification.
