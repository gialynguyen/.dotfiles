require("indentmini").setup {
  exclude = {
    "help",
    "dashboard",
    "packer",
    "neo-tree",
    "text",
    "terminal",
    "nofile",
  },
  only_current = true,
}

vim.cmd.highlight "IndentLineCurrent guifg=#12564f"
