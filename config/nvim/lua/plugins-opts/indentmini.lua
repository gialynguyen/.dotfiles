require("indentmini").setup {
  exclude = {
    "help",
    "dashboard",
    "packer",
    "NvimTree",
    "text",
    "terminal",
    "nofile",
  },
  only_current = true,
}

vim.cmd.highlight "IndentLineCurrent guifg=#12564f"
