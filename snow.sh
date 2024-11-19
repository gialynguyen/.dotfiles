#!/bin/bash
# stow.sh

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOTFILES="$SCRIPT_DIR"
CONFIG_DIR="$HOME/.config"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_msg() {
    local color="$1"
    local msg="$2"
    echo -e "${color}${msg}${NC}"
}

confirm() {
    local msg="$1"
    while true; do
        read -p "$(echo -e "${YELLOW}$msg [y/N]:${NC} ")" yn
        case $yn in
            [Yy]* ) return 0;;
            [Nn]* | "" ) return 1;;
            * ) echo "Please answer yes or no.";;
        esac
    done
}

check_stow() {
    if ! command -v stow >/dev/null 2>&1; then
        print_msg "$RED" "Error: stow is not installed"
        exit 1
    fi
}

# Sync from ~/.config/kitty to ./config/kitty
sync_config() {
    local name="$1"
    local src="$CONFIG_DIR/$name"
    local dst="$DOTFILES/config/$name"

    if [ ! -d "$src" ]; then
        print_msg "$RED" "Source config not found: $src"
        return 1
    fi

    if [ -d "$dst" ]; then
        if ! confirm "Config '$name' already exists in dotfiles. Overwrite?"; then
            print_msg "$BLUE" "Skipping $name"
            return 0
        fi
    fi

    print_msg "$BLUE" "Syncing $name from ~/.config to dotfiles..."
    mkdir -p "$(dirname "$dst")"
    rsync -av --delete "$src/" "$dst/"
    print_msg "$GREEN" "Synced $name from ~/.config"
}

# Stow from ./config/kitty to ~/.config/kitty
stow_config() {
    local name="$1"
    local src="$DOTFILES/config/$name"
    local target_dir="$CONFIG_DIR/$name"

    if [ ! -d "$src" ]; then
        print_msg "$RED" "Source config not found: $src"
        return 1
    fi

    if [ -e "$target_dir" ] || [ -L "$target_dir" ]; then
        if ! confirm "Config '$name' already exists in ~/.config. Overwrite?"; then
            print_msg "$BLUE" "Skipping $name"
            return 0
        fi
        rm -rf "$target_dir"
        print_msg "$BLUE" "Removed existing $target_dir"
    fi

    mkdir -p "$CONFIG_DIR"
    cd "$DOTFILES" || exit 1
    stow -t "$CONFIG_DIR" config
    print_msg "$GREEN" "Stowed $name to ~/.config"
}

show_usage() {
    echo "Usage: $0 {sync|stow} <package_name>"
    echo "Examples:"
    echo "  $0 sync kitty    # Sync from ~/.config/kitty to ./config/kitty"
    echo "  $0 stow kitty    # Stow from ./config/kitty to ~/.config/kitty"
}

if [ $# -lt 2 ]; then
    show_usage
    exit 1
fi

action="$1"
package="$2"

check_stow

case "$action" in
    "sync")
        sync_config "$package"
        ;;
    "stow")
        stow_config "$package"
        ;;
    *)
        show_usage
        exit 1
        ;;
esac
