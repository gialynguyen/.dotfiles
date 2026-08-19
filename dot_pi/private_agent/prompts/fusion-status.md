---
description: Fusion health check - verify the agent team is installed, loadable, and enforcing
---

Run a Fusion health check and report the result as a table. Change nothing - this command only reports.

Check each of the following and report PASS or FAIL with the evidence:

1. **Agent files present.** Confirm these exist in `~/.pi/agent/agents/`: `sidekick.md`, `explore.md`, `research.md`, `reviewer.md`, `design.md`, `vision.md`. Report any that are missing.

2. **Agent types registered.** List the `subagent_type` values your `Agent` tool actually accepts. Every file above should appear as a type. A file that exists but is not an accepted type means its frontmatter failed to parse - say so.

3. **Model pins resolve.** Read the `model:` line from each agent file and check it against `pi --list-models`. Flag any pin that does not resolve, because an unresolvable pin silently falls back to inheriting the parent model instead of failing loudly.

4. **Build prompt present.** Confirm `~/.pi/agent/fusion-build-prompt.md` exists and is non-empty.

5. **Slash commands present.** Confirm `fusion-agent.md`, `fusion-plan.md`, and `fusion-status.md` exist in `~/.pi/agent/prompts/`.

6. **Enforcement mode.** Report which mode this session is in:
   - **STRICT** if `edit`, `write`, `grep`, `find`, and `ls` are absent from your own toolset (started via `pi-fusion`). Enforcement is mechanical.
   - **SOFT** if you do have those tools. The Fusion boundary is then prompt-level discipline only, held by `/fusion-agent`. Say this plainly rather than reporting a false pass.

7. **Nested delegation.** State that subagents are leaf nodes - they do not receive the `Agent` tool - so all orchestration must stay with the main session.

Finish with a one-line verdict: whether Fusion is ready to use, and the single most useful thing to fix if not.
