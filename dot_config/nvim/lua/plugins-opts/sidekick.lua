require("sidekick").setup {
  nes = {
    clear = {
      -- events that clear the current next edit suggestion
      events = { "TextChangedI", "InsertEnter" },
      esc = true, -- clear next edit suggestions when pressing <Esc>
    },
  },
}

vim.api.nvim_create_autocmd("BufWritePost", {
  pattern = "*",
  callback = function()
    local nes = require "sidekick.nes"
    nes.disable()
  end,
})

vim.api.nvim_create_autocmd("InsertEnter", {
  pattern = "*",
  callback = function()
    local nes = require "sidekick.nes"
    nes.enable()
  end,
})
