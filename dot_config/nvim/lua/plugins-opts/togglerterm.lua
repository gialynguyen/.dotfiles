require("toggleterm").setup {
  open_mapping = [[<C-t>]],
  size = 20,
  float_opts = {
    winblend = 0,
  },
  highlights = {
    Normal = {
      link = "Normal",
    },
  },
}
