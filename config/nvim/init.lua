vim.cmd("syntax on")
vim.cmd("set termguicolors")

local function check_gui_running()
  if not vim.fn.has("gui_running") and vim.fn.expand("%:t") == "screen" or vim.fn.expand("%:t") == "tmux" then
    vim.cmd('let &t_8f = "<Esc>[38;2;%lu;%lu;%lum"')
    vim.cmd('let &t_8b = "<Esc>[48;2;%lu;%lu;%lum"')
  end
end

local function set_default_shell()
  if os.getenv("SHELL") then
    vim.cmd("set shell=" .. os.getenv("SHELL"))
  end
end

local function check_termguicolors()
  if vim.fn.exists("+termguicolors") and vim.fn.getenv("TERM_PROGRAM") ~= "Apple_Terminal" then
    vim.cmd('let &t_8f = "<Esc>[38;2;%lu;%lu;%lum"')
    vim.cmd('let &t_8b = "<Esc>[48;2;%lu;%lu;%lum"')
    vim.cmd("set termguicolors")
  end
end

local function load_runtime_files()
  vim.cmd("runtime OPT general.vim")
  vim.cmd("runtime OPT mapping.vim")
  vim.cmd("runtime OPT abbreviation.vim")
  vim.cmd("runtime OPT colors.vim")
  vim.cmd("runtime OPT packs.vim")
end

local function require_modules()
  require("nvim")
  require("lazy-pkg-m")
  require("lsp")
  require("keymap")
end

local function highlight_matchparen()
  vim.cmd("augroup matchup_matchparen_highlight")
  vim.cmd("autocmd!")
  vim.cmd("autocmd ColorScheme * hi MatchParen guifg=#f6f3e8 guibg=#857b6f gui=none")
  vim.cmd("augroup END")
end

local function setup_keymaps()
  -- Leader + gt to open lazygit
  vim.api.nvim_set_keymap("n", "<leader>gt", ":FloatermNew --title=lazy-git lazygit<CR>", { silent = true })
  vim.api.nvim_set_keymap("i", "<leader>gt", ":FloatermNew --title=lazy-git lazygit<CR>", { silent = true })

  -- Leader + sr to open serpl
  vim.api.nvim_set_keymap("n", "<leader>sr", ":FloatermNew --title=search-&-replace serpl<CR>", { silent = true })
  vim.api.nvim_set_keymap("i", "<leader>sr", ":FloatermNew --title=search-&-replace serpl<CR>", { silent = true })

  -- ToggleTermToggleAll mappings (normal and insert mode)
  vim.api.nvim_set_keymap("t", "<C-\\>", "<C-e>:ToggleTermToggleAll<CR>", { silent = true })
  vim.api.nvim_set_keymap("n", "<C-\\>", ":ToggleTermToggleAll<CR>i", { silent = true })
  vim.api.nvim_set_keymap("i", "<C-\\>", "<ESC>:ToggleTermToggleAll<CR>", { silent = true })

  -- Close popup
  vim.api.nvim_set_keymap("n", "Q", "<C-w><C-w>q", { silent = true })

  vim.api.nvim_set_keymap("i", "<C-f>", "<Esc>la", { silent = true })
  vim.api.nvim_set_keymap("i", "<C-b>", "<Esc>ha", { silent = true })

  -- Yank/delete to black hole register
  vim.api.nvim_set_keymap("n", "<leader>d", '"_d', { silent = true })
  vim.api.nvim_set_keymap("n", "<leader>c", '"_c', { silent = true })
  vim.api.nvim_set_keymap("v", "<leader>d", '"_d', { silent = true })
  vim.api.nvim_set_keymap("v", "<leader>c", '"_c', { silent = true })

  -- Clear search highlighting
  vim.api.nvim_set_keymap("n", "<ESC>", ":nohlsearch<CR>", { silent = true })
  -- ... other keymaps
end

local function setup_autocmds()
  vim.cmd("set autoread")

  vim.api.nvim_create_autocmd("CursorHold", {
    pattern = "*",
    callback = function()
      vim.cmd("checktime")
    end,
  })

  vim.api.nvim_create_autocmd({ "BufNewFile", "BufRead" }, {
    pattern = { "*.json", "*.astro", "*.mdx" },
    callback = function()
      vim.cmd("setlocal filetype=" .. vim.fn.expand("%:t"))
    end,
  })

  vim.api.nvim_create_autocmd("User", {
    pattern = "TelescopePreviewerLoaded",
    callback = function()
      vim.cmd("setlocal wrap")
    end,
  })

  vim.api.nvim_create_autocmd("BufWritePre", {
    pattern = { "*.tsx", "*.ts", "*.jsx", "*.js" },
    callback = function()
      vim.cmd("silent! EslintFixAll")
    end,
  })
end

local function set_options()
  vim.cmd("set background=dark")
  vim.cmd("colorscheme tokyonight")

  -- Disable netrw
  vim.g.loaded_netrw = 1
  vim.g.loaded_netrwPlugin = 1
end

local function check_user_settings()
  if vim.fn.filereadable(vim.fn.glob("~/.config/nvim/lua/user-settings.lua")) then
    require("user-settings")
  end
end

-- Call functions in a logical order
check_gui_running()
set_default_shell()
check_termguicolors()
load_runtime_files()
require_modules()
highlight_matchparen()
setup_keymaps()
setup_autocmds()
set_options()
check_user_settings()
