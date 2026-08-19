# pi-subagent-profiles

`pi-subagent-profiles` is a pi extension that gives subagent spawns a named,
ordered model fallback chain and an optional thinking level. It handles Agent
tool calls from pi-subagents and pi's built-in Agent tool. The profile is read
from disk on each state lookup, so nested sessions that load the global
extensions see the same activation state.

## Features

- Named YAML profiles under `<agentDir>/subagent-profiles/profiles/`.
- Fuzzy model matching with provider/model, exact model id, id substring, and
  display-name substring matching.
- Fallback chains are checked against authenticated models and the current
  model scope before injection.
- Per-agent overrides match `subagent_type` case-insensitively.
- Profile values replace caller `model` and `thinking` values when a valid
  profile value exists.
- Optional per-rule worktree isolation for subagent spawns (git projects only).
- Agent frontmatter pins are removed line-by-line when a profile is activated,
  at session start, or during resource discovery.
- A machine-owned `imported` profile records the first stripped pin for each
  agent without activating that profile.
- Global and project activation layers, with project state taking precedence.
- `/profiles` command, TUI menu, and profile creation wizard.

## Profile YAML format

A profile has a default rule, optional per-agent rules, and an optional main
model. `models` is ordered from preferred to least preferred. Unknown top-level
keys are tolerated when parsing.

```yaml
name: fast-review
description: Fast models for review work
default:
  models:
    - anthropic/claude-sonnet-4
    - openai/gpt-4o
  thinking: medium
  isolation: true
overrides:
  Explore:
    models:
      - anthropic/claude-haiku-4
    thinking: low
mainModel: anthropic/claude-sonnet-4
mainThinking: high
```

`thinking` and `mainThinking` may be `off`, `minimal`, `low`, `medium`,
`high`, `xhigh`, or `max`. A rule must contain at least one model string.
`mainModel` uses the same fuzzy matching rules and is subject to model scope.
`mainThinking` is independent of `mainModel`, so it applies to whichever main
model is current even when no main model is configured. It is clamped to the
active model's capabilities. On deactivation, the previous main-session level
is restored only when it has not been changed manually in the meantime.

`isolation` is an optional per-rule boolean, default false. When true, spawns
matched by that rule run in a temporary git worktree (pi's
`isolation: "worktree"`). Injection requires the project to be a git
repository; otherwise it is skipped with a one-time warning. Unlike model and
thinking, `isolation: true` only ever adds worktree isolation, and false or
omitted never touches a caller-provided `isolation` value.

## Activation and injection

Global state is stored at:

```text
<agentDir>/subagent-profiles/state.json
```

The project override is stored at:

```text
<cwd>/.pi/subagent-profiles.json
```

The project file wins. An `active` string selects a project profile; an
explicit `active: null` disables the global profile for that project. Removing
the project key returns resolution to the global state. The project override
file is intentionally a normal, committable project file for team sharing.

When a profile is active, the `tool_call` handler selects the matching agent
override or the default rule. It resolves each model string in order against
pi's authenticated model catalogue and then checks the scoped model set. The
first valid model is injected as `provider/modelId`. If no model validates, no
new model value is injected and the spawn inherits its parent model. A
configured profile thinking level is injected as well.

If `mainModel` resolves, activation attempts to switch pi's main model. The
previous main model is backed up for deactivation. A failed switch is
reported but does not prevent profile activation. If `mainThinking` is set, it
is applied after any main-model switch so model capability clamping is final.
Its previous level is backed up for deactivation and restored only when the
profile scope is deactivated and the level has not been changed manually.

When a pi session starts with a profile already active (the project override
wins over global), the extension re-applies the profile's `mainModel` and
`mainThinking`. The same availability and model-scope checks and failure
warnings apply as at activation, previous values are still backed up for
deactivation restore, and a failed switch warns without blocking startup.

## Imported frontmatter pins

Agent files are discovered in these flat directories:

```text
<cwd>/.pi/agents/*.md
<cwd>/.agents/agents/*.md
<agentDir>/agents/*.md
```

At activation and lifecycle refresh, top-level zero-indentation `model:` and
`thinking:` lines in YAML frontmatter are removed without YAML round-tripping
the agent file. Line endings, comments, nested mappings, and the rest of the
file are retained byte-for-byte. A blank scalar followed by an indented line
is treated as a multiline value and is skipped rather than modified.

Captured values are merged into:

```text
<agentDir>/subagent-profiles/profiles/imported.yaml
```

The imported profile has a default `inherit` sentinel and one override per
captured agent. Existing override keys win forever; later captures do not
replace them. In a model chain, `inherit` means that the profile has no model
opinion and the caller's model is left untouched; it is a valid chain outcome,
not a model to resolve. The profile is never auto-activated.

## Command reference

```text
/profiles
/profiles list
/profiles use <name> [--global|--project]
/profiles off [--global|--project]
/profiles show <name>
/profiles validate [name]
/profiles strip
/profiles create
/profiles delete <name>
```

Bare `/profiles` opens a TUI select-loop menu. `list` marks the resolved
profile with `*`. `show` reports the YAML path and a parsed summary. `validate`
checks model resolution, scope, thinking levels, and `mainModel`. `strip` runs
the frontmatter pass without changing activation. `use` activates for the
current project by default; `--global` activates for all projects, and
`--project` is accepted for explicitness. `create` writes a profile and
optionally activates it for the current project. Deletion requires
confirmation and an active profile cannot be deleted. In the create wizard,
model choices use a floating overlay with fuzzy search and provider-grouped
results; multi-pick selections build the ordered chain shown in the footer,
while Esc finishes a chain (or skips the optional main model) without aborting
the wizard. The wizard also asks about worktree isolation per rule.

All notifications are prefixed with `profiles: `. Headless sessions perform
state reads, injection, and quiet stripping but do not attempt UI dialogs or
notifications.

## Known gaps

- Scheduled agents and `subagents:rpc:spawn` spawns are profile-exempt. They
  bypass pi's `tool_call` event, so models, thinking, and isolation are never
  injected for them.
- pi-subagents' built-in agents with compiled-in model pins (for example,
  Explore pins a haiku model in pi-subagents' own code) ignore profile model
  injection. Only unpinned or custom agents are controllable; shadow a built-in
  with a same-named custom `.md` file to control it.
- Thinking is injected even when no chain model validates; the profile owns
  thinking independently.
- State and profile files use atomic writes, but there is no cross-process
  locking, so the last writer wins.
- A hand-added frontmatter pin wins until the next strip pass.
- The `inherit` model-chain sentinel means no model opinion: the input model is
  left untouched and no warning is logged.
- The project override file `<cwd>/.pi/subagent-profiles.json` is committable;
  this is intentional for team sharing.
