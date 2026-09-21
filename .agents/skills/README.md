# 🌿 Serene Pomodoro - Project-Scoped Agent Skills

This workspace is configured with standard **Agent Skills** located in `./.agents/skills/<skill-name>/SKILL.md`.
These skills are compatible across **Google Antigravity**, **Claude Code**, **Codex**, **Cursor**, and any agent supporting the standard Agent Skills specification.

---

## 📦 Installed Skills & Upstream Repositories

| Skill Name | Upstream Repository | Version / Source | Purpose |
| :--- | :--- | :--- | :--- |
| **`impeccable`** | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | v4.3.1 (Official) | Complete design review, audit, typography, polish, and UI critique engine. |
| **`design-taste-frontend`** | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | Taste Skill v2 (Official) | Anti-slop frontend framework for landing pages, portfolios, and redesigns. |
| **`high-end-visual-design`** | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | Soft Skill (Official) | Awwwards-tier visual craft, spatial rhythm, haptic depth, and fluid motion. |
| **`minimalist-ui`** | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | Minimalist Skill (Official) | Premium utilitarian minimalism, warm monochrome, bento grids, and editorial UI. |
| **`redesign-existing-projects`** | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | Redesign Skill (Official) | Non-destructive audit and incremental upgrade for existing codebases. |

---

## 🛠️ Antigravity Compatibility Notes

The installed skills conform strictly to upstream without breaking modifications. Below is the mapping for tools when executed within **Antigravity**:

1. **CLI & Windows Launcher**:
   - Impeccable provides a self-contained Windows batch launcher:
     ```cmd
     .agents\skills\impeccable\scripts\impeccable.cmd context
     ```
   - Antigravity executes this natively via PowerShell / cmd without needing a bash / sh environment.
   - If the launcher is ever unavailable, Impeccable gracefully falls back to reading `PRODUCT.md` and `DESIGN.md` directly.

2. **Browser & Live Inspection**:
   - Claude Code uses `tabs_context` / `navigate`.
   - In Antigravity, browser automation and visual capture are powered by `browser_subagent`.

3. **Dev Server Execution**:
   - Claude Code uses `preview_start` / `preview_list`.
   - In Antigravity, dev servers are launched via `run_command` with `IsDaemon: true` and managed through `manage_task`.

4. **Interactive Inquiries**:
   - In Antigravity, user design decisions and option selection can use `ask_question`.

5. **Visual Asset Generation**:
   - For UI references, moodboards, or icon concepts, Antigravity provides the native `generate_image` tool.
