local grug_far = require "grug-far"

grug_far.setup {
  showCompactInputs = true,
}

vim.keymap.set("n", "<leader>fa", function()
  grug_far.open()
end, { desc = "Grug: Open" })

vim.keymap.set("n", "<leader>fw", function()
  grug_far.open { prefills = { search = vim.fn.expand "<cword>", paths = vim.fn.expand "%" } }
end, { desc = "Grug: Word" })

vim.keymap.set("n", "<leader>fW", function()
  grug_far.open { prefills = { search = vim.fn.expand "<cword>", paths = vim.fn.expand "%" } }
end, { desc = "Grug: Word Globally" })

vim.keymap.set("n", "<leader>ff", function()
  grug_far.open { prefills = { paths = vim.fn.expand "%" } }
end, { desc = "Grug: File" })

vim.keymap.set("n", "<leader>fv", function()
  grug_far.with_visual_selection { prefills = { paths = vim.fn.expand "%" } }
end, { desc = "Grug: Selected" })

vim.keymap.set("n", "<leader>fV", function()
  grug_far.with_visual_selection()
end, { desc = "Grug: Selected Globally" })
