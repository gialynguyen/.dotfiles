# dotfiles

macOS app configs, managed with [chezmoi](https://www.chezmoi.io).

## Managed

| Path | App |
|------|-----|
| `~/.config/nvim` | Neovim (lazy.nvim, 20+ plugins) |
| `~/.config/kitty` | Kitty terminal (+ themes) |
| `~/.config/alacritty` | Alacritty terminal |
| `~/.config/aerospace` | AeroSpace window manager |
| `~/.config/starship.toml` | Starship prompt |
| `~/.config/herdr/` | Herdr (terminal workspace manager: `config.toml`, `plugins.json` plugin registry) |
| `~/.pi/agent/` | Pi coding agent (settings, keybindings, zentui, custom agents/prompts/skills, authored + dev-checkout extensions) |

Runtime/machine-local state is excluded via `.chezmoiignore`:
- nvim: `.pi/`, `.crush/`, `plugin/`, `setup/node_modules/`, `lazy-lock.json`, `**/user-settings.lua`
- pi agent: `auth.json` (secrets — re-auth per machine via `pi login`), `sessions/`, `input-history/` (the runtime dir `~/.pi/agent/input-history`, **not** the tracked `extensions/input-history/`), `run-history.jsonl`, `skill-gate-analytics.json` (self-incrementing runtime counter), caches (`models-store.json`, `cursor-*-cache.json`, `mcp-cache.json`), `npm/`
- general: `**/node_modules`, `**/.git` (never track nested-repo metadata), `**/*.bak`, `.DS_Store`

**Pi extensions — own vs external** (classify before `chezmoi add`): check the `packages` array in `~/.pi/agent/settings.json`. Listed there (e.g. `npm:@guneriu/pi-files`) → external; its code is reinstalled by the package manager, so ignore the code and track only user-config files (`settings.json`/`config.json`) in the local dir. **Not** listed → the user's own; track source + config. Dev-checkout extensions that carry their own `.git` (e.g. `pi-clinepass-provider`) are tracked minus `.git/` + `node_modules/` (both excluded globally above).

## Bootstrap a new machine

```bash
brew install chezmoi
chezmoi init --apply git@github.com:gialynguyen/.dotfiles.git
```

`chezmoi init --apply` clones the source to `~/.local/share/chezmoi` and writes all managed files to `$HOME`.

## Daily workflow

chezmoi keeps **source state** (`~/.local/share/chezmoi`) separate from **live files** (`~/.config/...`). Edit through chezmoi so source stays in sync:

```bash
# edit source + apply to live in one shot
chezmoi edit --apply ~/.config/nvim/init.lua

# commit + push from the source dir
chezmoi cd
git add -A && git commit -m "nvim: tweak" && git push
```

Drift check (shows live files that differ from source):

```bash
chezmoi diff
chezmoi re-add ~/.config/nvim/init.lua   # re-import a file edited directly
```

## Source layout

chezmoi encodes metadata in filenames:

| Source | Target |
|--------|--------|
| `dot_config/` | `~/.config/` (`dot_` → `.`) |
| `private_dot_claude/` | `.claude/` with `0600` perms (`private_`) |
| `executable_on-ws-change.sh` | `on-ws-change.sh` with `+x` (`executable_`) |
| `.chezmoiignore` | (control file, not applied) |
| `README.md` | (ignored via `.chezmoiignore`, repo docs only) |

## Recovery

This repo previously used GNU Stow. The final Stow layout is preserved at git tag **`stow-backup`**:

```bash
git clone git@github.com:gialynguyen/.dotfiles.git
git checkout stow-backup
```

## Not yet managed (add when needed)

- Home dotfiles: `~/.gitconfig`, `~/.tmux.conf` — `chezmoi add <path>`
- `~/.agents/skills/` (29) — mixed authored + installed packs; add selectively if you decide any are yours to version
- `auth.json` — intentionally skipped (provider tokens); encrypt with `chezmoi add --encrypt` + `age` (`brew install age`) if you ever want it backed up
- Per-machine templating — `chezmoi add --template` + `~/.config/chezmoi/chezmoi.toml`
- `lazy-lock.json` — currently ignored; un-ignore in `.chezmoiignore` to pin plugin versions across machines