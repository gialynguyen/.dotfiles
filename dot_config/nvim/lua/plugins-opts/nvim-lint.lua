local lint = require "lint"

-- Configure linters by filetype
lint.linters_by_ft = {
  -- Spell checking with cspell
  html = { "cspell" },
  css = { "cspell", "stylelint" },
  scss = { "cspell", "stylelint" },
  javascript = { "cspell" },
  typescript = { "cspell" },
  typescriptreact = { "cspell" },
  javascriptreact = { "cspell" },
  liquid = { "cspell" },
  rust = { "cspell" },
  go = { "cspell" },

  -- Python linting
  python = { "ruff" },
}

-- Customize cspell linter to show diagnostics as HINT severity
lint.linters.cspell = require("lint.util").wrap(lint.linters.cspell, function(diagnostic)
  diagnostic.severity = vim.diagnostic.severity.HINT
  return diagnostic
end)

-- Customize stylelint to only run when config files exist
local stylelint = lint.linters.stylelint
local original_condition = stylelint.condition
stylelint.condition = function(ctx)
  local root_files = {
    "stylelint.config.js",
    ".stylelintrc.js",
    ".stylelintrc",
    ".stylelintrc.json",
    ".stylelintrc.yml",
    ".stylelintrc.yaml",
  }

  -- Check if any of the config files exist in the project root
  for _, file in ipairs(root_files) do
    if vim.fn.findfile(file, ".;") ~= "" then
      if original_condition then
        return original_condition(ctx)
      end
      return true
    end
  end

  return false
end

-- State management for disabling/enabling linting
local is_lint_disabled = 0

local disable_lint = function()
  is_lint_disabled = 1
end

local enable_lint = function()
  is_lint_disabled = 0
end

-- Create user commands for toggling linting
vim.api.nvim_create_user_command("LintDisable", disable_lint, {})
vim.api.nvim_create_user_command("LintEnable", enable_lint, {})

-- Set up autocommands to trigger linting
local augroup = vim.api.nvim_create_augroup("NvimLint", { clear = true })

vim.api.nvim_create_autocmd({ "BufWritePost", "BufReadPost", "InsertLeave" }, {
  group = augroup,
  callback = function()
    if is_lint_disabled == 0 then
      lint.try_lint()
    end
  end,
})
