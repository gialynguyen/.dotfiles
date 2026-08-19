require("fff").setup({
  grep = {
    -- modes[1] is the initial mode when the grep picker opens; <S-Tab> cycles modes in this order
    modes = { "fuzzy", "plain", "regex" },
  },
})
