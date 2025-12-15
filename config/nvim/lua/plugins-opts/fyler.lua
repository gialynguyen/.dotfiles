local fyler = require "fyler"

fyler.setup {
  integrations = {
    winpick = "builtin",
  },
  views = {
    finder = {
      -- confirm_simple = true,
      close_on_select = false,
      default_explorer = true,
      win = {
        kind = "split_left_most",
        kinds = { split_left_most = { width = "30" } },
        win_opts = {
          cursorline = true,
        },
      },
    },
  },
}

vim.keymap.set("n", "<c-l>", function()
  fyler.toggle {
    kind = "split_left_most",
  }
end, { desc = "Open fyler view" })

vim.keymap.set("n", "<c-k>", function()
  fyler.focus()
end, { desc = "Open fyler view" })

vim.keymap.set("n", "<c-g>", function()
  fyler.toggle { kind = "float" }
end, { desc = "Open fyler as float" })
