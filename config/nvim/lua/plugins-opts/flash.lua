require("flash").setup({
  -- keep labels readable on a transparent background
  label = { uppercase = false, rainbow = { enabled = true } },
  modes = {
    -- enhance f/F/t/T with labelled jumps (replaces hop's hint_char1 motions)
    char = { enabled = true, autohide = true },
    search = { enabled = false },
  },
  -- prompt-style highlight groups, subtle
  highlight = {
    backdrop = false,
    matches = true,
  },
})
