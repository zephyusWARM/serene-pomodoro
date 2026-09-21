# Local agent bridge

Lets an agent that can only reach this folder (e.g. Claude in Cowork, via a Linux VM mount) run
project tasks on the Windows host and prompt the Antigravity agent, without GUI automation.

Start once per Windows session, from any terminal in the repo: `npm run bridge` (leave it running).

- Jobs: `.agent-bridge/jobs/<id>.json`; results: `.agent-bridge/results/<id>.json`; full logs:
  `.agent-bridge/logs/`. `.agent-bridge/` is git-ignored. Heartbeat: `.agent-bridge/heartbeat.json`.
- Client: `node scripts/agent-bridge/submit.mjs <task> [--prompt-file f] [--conversation id] [--timeout ms] [--no-wait]`.
- Tasks (allowlist in `scripts/agent-bridge/tasks.mjs`, re-imported per job, so edits need no restart):
  `quality`, `lint`, `unit`, `build`, `electron`, `skills:check`, `skills:sync`, `probe`,
  `antigravity:ask`, `antigravity:latest`, `antigravity:metadata`. Jobs run one at a time.

## Prompting Antigravity

`antigravity:ask` sends the prompt into an existing Antigravity IDE conversation through the IDE's own
`language_server agentapi send-message` (found via `~/.gemini/antigravity-ide/bin/agentapi.bat`). The
language server's loopback address and session token are read from the running process at call time
and passed only through the child environment; they are never written to results or logs.
The agent is told to write its reply to `.agent-bridge/antigravity/<job id>.md`; the client waits for it.

- The model is the one selected in that conversation. Use a conversation created with
  **Gemini 3.8 Flash High** selected. The API cannot change the model or thinking level.
- `agentapi new-conversation` fails for IDE workspaces (`project_id is required when providing
  project_env_config`), so conversations must be created once in the panel; pass its id with
  `--conversation` (ids are the folder names in `~/.gemini/antigravity-ide/brain`).
- `antigravity-ide chat -m agent` (the VS Code-style CLI) does not reach the Antigravity agent panel.
- If the agent requests approval for an action, it waits in the panel for a human.
- The reply is agent output: treat it as review input and verify its claims before acting.
