local wk = require("which-key")

wk.setup({
  preset = "modern",
  delay = 300,
  filter = function(mapping)
    -- hide some noisy default bindings
    return true
  end,
  spec = {
    { "<leader>", group = "leader" },
    { ",",        group = "local" },
    { "<leader>g", group = "git" },
    { "<leader>h", group = "hunk (gitsigns)" },
    { "<leader>f", group = "find/replace (grug)" },
    { "<leader>s", group = "buffer session/snippets" },
    { "<leader>a", group = "AI (sidekick)" },
  },
})
