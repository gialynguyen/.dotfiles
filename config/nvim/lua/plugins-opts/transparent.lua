vim.g.transparent_enabled = true

if vim.g.transparent_enabled == true then
  local transparent = require "transparent"

  transparent.setup {
    extra_groups = {
      "NormalFloat",
      "NeoTreeNormal",
      "NeoTreeNormalNC",
      "FloatBorder",
      "FloatTitle",
      "BufferLine",
      "WildMenu",
      "TabLine",
    },
  }

  transparent.clear_prefix "BufferLine"
  transparent.clear_prefix "NeoTree"
  transparent.clear_prefix "lualine"
  transparent.clear_prefix "Ufo"
  transparent.clear_prefix "Fold"
  -- transparent.clear_prefix "Blink"
  transparent.clear_prefix "WildMenu"
  transparent.clear_prefix "TabLine"
end
