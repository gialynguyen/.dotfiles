local conform = require "conform"

-- State management for disabling/enabling formatting
local is_format_disabled = 0

conform.setup {
  default_format_opts = { lsp_format = "prefer" },
  formatters_by_ft = {
    -- Filetypes with NO LSP formatter in this config. Because
    -- `default_format_opts.lsp_format = "prefer"`, LSP formatting still wins
    -- where an LSP formatter exists; these only fill the gaps.
    lua = { "stylua" },
    python = { "ruff_format", "ruff_organize_imports" },
    sh = { "shfmt" },
    yaml = { "prettier" },
    markdown = { "prettier" },

    -- JS/TS/CSS/HTML/JSON are handled by LSP (vtsls/eslint/cssls/html/jsonls);
    -- leave them to the LSP formatter. Enable prettier for them here if desired.
    -- javascript = { "prettier" },
    -- typescript = { "prettier" },
    -- typescriptreact = { "prettier" },
    -- javascriptreact = { "prettier" },
    -- json = { "prettier" },
    -- jsonc = { "prettier" },
    -- html = { "prettier" },
    -- css = { "prettier" },
    -- scss = { "prettier" },
  },

  -- Customize stylelint formatter to only run when config files exist
  formatters = {
    stylelint = {
      condition = function(self, ctx)
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
            return true
          end
        end

        return false
      end,
    },
    oxfmt = {
      command = "oxfmt",
      args = { "$FILENAME" },
      stdin = false,
      -- When stdin=false, use this template to generate the temporary file that gets formatted
      tmpfile_format = ".conform.$RANDOM.$FILENAME",
    },
  },

  -- Format on save with async formatting
  -- format_after_save = function(bufnr)
  --   if is_format_disabled == 1 then
  --     return nil
  --   end
  --
  --   -- Skip if buffer is modified
  --   if vim.api.nvim_buf_get_option(bufnr, "modified") then
  --     return nil
  --   end
  --
  --   return {
  --     timeout_ms = 500,
  --     lsp_format = "fallback",
  --     async = true,
  --     quiet = false,
  --   }
  -- end,

  -- Notify on errors
  notify_on_error = true,
  notify_no_formatters = false,

  -- Set log level
  log_level = vim.log.levels.WARN,
}

-- Optional: Create a command to format the current buffer manually
vim.api.nvim_create_user_command("Format", function(args)
  local range = nil
  if args.count ~= -1 then
    local end_line = vim.api.nvim_buf_get_lines(0, args.line2 - 1, args.line2, true)[1]
    range = {
      start = { args.line1, 0 },
      ["end"] = { args.line2, end_line:len() },
    }
  end

  conform.format { async = false, range = range }
end, { range = true })

local function organize_imports()
  local ft = vim.bo.filetype:gsub("react$", "")
  if not vim.tbl_contains({ "javascript", "typescript" }, ft) then
    return
  end
  local ok = vim.lsp.buf_request_sync(0, "workspace/executeCommand", {
    command = (ft .. ".organizeImports"),
    arguments = { vim.api.nvim_buf_get_name(0) },
  }, 3000)
  if not ok then
    print "Command timeout or failed to complete."
  end
end

vim.api.nvim_create_autocmd("BufWritePre", {
  pattern = "*",
  callback = function(args)
    if is_format_disabled == 1 then
      return
    end


    -- local filetype = vim.bo[args.buf].filetype
    --
    -- if
    --   filetype == "typescript"
    --   or filetype == "typescriptreact"
    --   or filetype == "javascript"
    --   or filetype == "javascriptreact"
    -- then
    --   organize_imports()
    -- end

    conform.format {
      bufnr = args.buf,
      async = false,
      quiet = false,
      timeout_ms = 2000,
      -- filter = function(client)
      --   return client.name == "eslint"
      -- end,
    }
  end,
})

local disable_format = function()
  is_format_disabled = 1
end

local enable_format = function()
  is_format_disabled = 0
end

-- Create user commands for toggling formatting
vim.api.nvim_create_user_command("FormatDisable", disable_format, {})
vim.api.nvim_create_user_command("FormatEnable", enable_format, {})
