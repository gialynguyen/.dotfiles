vim.cmd("syntax on")
vim.cmd("set termguicolors")

local function set_default_shell()
  if os.getenv("SHELL") then
    vim.opt.shell = os.getenv("SHELL")
  end
end

local function require_modules()
  require("nvim")
  require("lazy-pkg-m")
  require("lsp")
  require("keymap")
end

local function highlight_matchparen()
  vim.api.nvim_create_augroup("matchup_matchparen_highlight", { clear = true })
  vim.api.nvim_create_autocmd("ColorScheme", {
    group = "matchup_matchparen_highlight",
    pattern = "*",
    command = "hi MatchParen guifg=#f6f3e8 guibg=#857b6f gui=none",
  })
end

local function setup_keymaps()
  -- Leader + gt to open lazygit
  vim.keymap.set({ "n", "i" }, "<leader>gt", ":FloatermNew --title=lazy-git lazygit<CR>", { silent = true })

  -- Leader + sr to open serpl
  vim.keymap.set({ "n", "i" }, "<leader>sr", ":FloatermNew --title=search-&-replace serpl<CR>", { silent = true })

  -- ToggleTermToggleAll mappings (normal and insert mode)
  vim.keymap.set("t", "<C-\\>", "<C-e>:ToggleTermToggleAll<CR>", { silent = true })
  vim.keymap.set("n", "<C-\\>", ":ToggleTermToggleAll<CR>i", { silent = true })
  vim.keymap.set("i", "<C-\\>", "<ESC>:ToggleTermToggleAll<CR>", { silent = true })

  -- Close popup / window
  vim.keymap.set("n", "Q", "<C-w><C-w>q", { silent = true })

  -- In-insert cursor movement (C-f / C-b = right / left)
  vim.keymap.set("i", "<C-f>", "<Esc>la", { silent = true })
  vim.keymap.set("i", "<C-b>", "<Esc>ha", { silent = true })

  -- Yank/delete to black hole register
  vim.keymap.set({ "n", "v" }, "<leader>d", '"_d', { silent = true })
  vim.keymap.set({ "n", "v" }, "<leader>c", '"_c', { silent = true })

  -- Clear search highlighting
  vim.keymap.set("n", "<ESC>", ":nohlsearch<CR>", { silent = true })
end

local function setup_autocmds()
  vim.opt.autoread = true

  -- Reload files changed outside of neovim
  vim.api.nvim_create_autocmd("CursorHold", {
    pattern = "*",
    command = "checktime",
  })

  -- Filetype detection for files neovim does not detect by default
  vim.api.nvim_create_autocmd({ "BufNewFile", "BufRead" }, {
    pattern = { "*.mdx" },
    command = "setlocal filetype=markdown",
  })

  vim.api.nvim_create_autocmd("User", {
    pattern = "TelescopePreviewerLoaded",
    command = "setlocal wrap",
  })
end

local function set_options()
  vim.opt.background = "dark"
  vim.cmd("colorscheme tokyonight")

  -- Disable netrw (fyler is the file explorer)
  vim.g.loaded_netrw = 1
  vim.g.loaded_netrwPlugin = 1
end

local function check_user_settings()
  local path = vim.fn.glob("~/.config/nvim/lua/user-settings.lua")
  if vim.fn.filereadable(path) == 1 then
    require("user-settings")
  end
end

-- Call functions in a logical order
set_default_shell()
require_modules()
highlight_matchparen()
setup_keymaps()
setup_autocmds()
set_options()
check_user_settings()
