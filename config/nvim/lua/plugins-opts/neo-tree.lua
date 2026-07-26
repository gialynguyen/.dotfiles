-- neo-tree.nvim — migrated from fyler.nvim.
-- Replicates the fyler setup: persistent left file-tree sidebar (width 40),
-- a floating variant, netrw replacement, built-in window picker, and the
-- explorer stays open after opening a file (close_on_select=false).
require("neo-tree").setup({
  close_if_last_window = false, -- keep the tree open (fyler close_on_select=false)
  popup_border_style = "rounded",
  enable_git_status = true,
  enable_diagnostics = true,
  open_files_do_not_replace_types = { "terminal", "Trouble", "trouble", "qf", "edgy" },
  default_component_configs = {
    indent = { with_expanders = true },
    -- icons: neo-tree defaults use nvim-web-devicons (mocked by mini.icons)
    modified = { symbol = "" },
    git_status = {
      symbols = {
        added = "+",
        modified = "~",
        deleted = "_",
        renamed = "r",
        untracked = "?",
        ignored = "i",
        staged = "s",
        conflict = "!",
      },
    },
  },
  window = {
    position = "left", -- fyler split_left_most
    width = 40, -- fyler split_left_most width 40
    cursorline = "auto", -- fyler win_opts.cursorline = true
    window_picker = {
      enable = true, -- fyler winpick = "builtin"
      picker = "default",
    },
    mappings = {
      -- keep neo-tree defaults; they already cover fyler's select / vsplit /
      -- tabedit / refresh / visit-parent / toggle-hidden / close actions.
    },
  },
  popup = {
    size = { width = "50%", height = "80%" }, -- fyler float (40 wide, 80% height)
    position = "50%",
    border = "rounded",
  },
  filesystem = {
    hijack_netrw_behavior = "open_default", -- fyler default_explorer = true (netrw disabled in init.lua)
    follow_current_file = { enabled = true, leave_dirs_open = true },
    filtered_items = {
      visible = false, -- fyler ui.hidden_items.switches = { "dotfiles" }
      hide_dotfiles = true,
      hide_gitignored = false,
      hide_by_name = {},
    },
    window = {
      mappings = {
        ["g."] = "toggle_hidden", -- fyler g. toggle hidden_items
        ["-"] = "navigate_up", -- fyler - visit parent
        ["<bs>"] = "navigate_up", -- fyler <BS> shrink parent
        ["<c-r>"] = "refresh", -- fyler <C-R> refresh
      },
    },
  },
})

-- Explorer keymaps (mirrors the old fyler keymaps)
vim.keymap.set("n", "<c-l>", "<cmd>Neotree toggle<cr>", { desc = "Toggle file tree sidebar" })
vim.keymap.set("n", "<c-k>", "<cmd>Neotree focus<cr>", { desc = "Focus/open file tree" })
vim.keymap.set("n", "<c-g>", "<cmd>Neotree float<cr>", { desc = "Open file tree (float)" })
