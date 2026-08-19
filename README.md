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

Runtime/machine-local state is excluded via `.chezmoiignore`: `.pi/`, `.crush/`, `plugin/`, `setup/node_modules/`, `lazy-lock.json`, `**/user-settings.lua`.

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
| `README.md` | (auto-ignored by chezmoi, repo docs only) |

## Recovery

This repo previously used GNU Stow. The final Stow layout is preserved at git tag **`stow-backup`**:

```bash
git clone git@github.com:gialynguyen/.dotfiles.git
git checkout stow-backup
```

## Not yet managed (add when needed)

- Home dotfiles: `~/.gitconfig`, `~/.tmux.conf` — `chezmoi add <path>`
- Secrets / per-machine templating — `chezmoi add --encrypt` + `age` (`brew install age`), or 1Password CLI template funcs
- `lazy-lock.json` — currently ignored; un-ignore in `.chezmoiignore` to pin plugin versions across machines