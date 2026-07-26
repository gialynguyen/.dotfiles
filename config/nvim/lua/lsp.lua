require("mason").setup({
  ui = {
    border = "rounded",
  },
})

require("mason-lspconfig").setup({
  automatic_enable = true,
  ensure_installed = {},
  automatic_installation = false,
})

-- Build LSP capabilities without loading blink.cmp at startup so that
-- blink can be lazy-loaded on InsertEnter. These mirror
-- `vim.lsp.protocol.make_client_capabilities()` plus the fields blink's
-- `get_lsp_capabilities()` adds, so completion quality is unchanged.
local capabilities = vim.lsp.protocol.make_client_capabilities()
capabilities.textDocument.completion.completionItem.snippetSupport = true
capabilities.textDocument.completion.completionItem.documentationFormat = { "markdown", "plaintext" }
capabilities.textDocument.completion.completionItem.deprecatedSupport = true
capabilities.textDocument.completion.completionItem.tagSupport = { valueSet = { 1 } }
capabilities.textDocument.completion.completionItem.insertReplaceSupport = true
capabilities.textDocument.completion.completionItem.resolveSupport = {
  properties = { "documentation", "detail", "additionalTextEdits", "command", "data" },
}
capabilities.textDocument.completion.completionItem.insertTextModeSupport = { valueSet = { 1 } }
capabilities.textDocument.completion.completionItem.labelDetailsSupport = true
capabilities.textDocument.completion.completionList = {
  itemDefaults = { "commitCharacters", "editRange", "insertTextFormat", "insertTextMode", "data" },
}
capabilities.textDocument.completion.contextSupport = true
capabilities.textDocument.completion.insertTextMode = 1
capabilities.textDocument.foldingRange = {
  dynamicRegistration = false,
  lineFoldingOnly = true,
}

local default_opts = {
  autostart = true,
  capabilities = capabilities,
  inlay_hints = {
    enabled = false,
  },
}

local mason_lspconfig = require("mason-lspconfig")
local lspconfig = require("lspconfig")

local setup_server = {
  tailwindcss = {
    autostart = false,
  },
  ["ts_ls"] = {
    enabled = false,
    autostart = false,
  },
  ["vtsls"] = {
    filetypes = {
      "javascript",
      "javascriptreact",
      "javascript.jsx",
      "typescript",
      "typescriptreact",
      "typescript.tsx",
    },
    settings = {
      complete_function_calls = true,
      vtsls = {
        enableMoveToFileCodeAction = true,
        autoUseWorkspaceTsdk = true,
        experimental = {
          completion = {
            enableServerSideFuzzyMatch = true,
          },
        },
      },
      typescript = {
        updateImportsOnFileMove = { enabled = "always" },
        suggest = {
          completeFunctionCalls = true,
        },
        inlayHints = {
          enumMemberValues = { enabled = true },
          functionLikeReturnTypes = { enabled = true },
          parameterNames = { enabled = "literals" },
          parameterTypes = { enabled = true },
          propertyDeclarationTypes = { enabled = true },
          variableTypes = { enabled = false },
        },
      },
    },
    capabilities = capabilities,
  },
  cssmodules_ls = {
    autostart = false,
  },
  denols = {
    root_dir = lspconfig.util.root_pattern("deno.json", "deno.jsonc"),
  },
  volar = {
    filetypes = {
      "vue",
    },
  },
  eslint = {
    handlers = {
      ["window/showMessageRequest"] = function(_, result, _)
        return result
      end,
    },
    settings = {
      workingDirectories = { mode = "auto" },
      validate = "on",
      format = true,
      codeActionsOnSave = {
        enable = true,
        mode = "all",
      },
    },
  },
  lua_ls = {
    settings = {
      Lua = {
        diagnostics = {
          globals = { "vim" },
        },
      },
    },
  },
}

for _, server_name in ipairs(mason_lspconfig.get_installed_servers()) do
  local opts = vim.tbl_deep_extend("force", default_opts, setup_server[server_name] or {})
  vim.lsp.config(server_name, opts)
end

vim.diagnostic.config({
  update_in_insert = false,
  virtual_text = false,
  signs = {
    text = {
      [vim.diagnostic.severity.ERROR] = "\u{f057}",
      [vim.diagnostic.severity.WARN] = "\u{f071}",
      [vim.diagnostic.severity.INFO] = "\u{f05a}",
      [vim.diagnostic.severity.HINT] = "\u{f0339}",
    },
  },
  virtual_lines = false,
  float = {
    show_header = true,
    source = "if_many",
    border = "rounded",
    focusable = false,
  },
  severity_sort = true,
})

-- Silence the noisy textDocument/diagnostic failed LSP error notifications
vim.notify = function(msg, log_level, _)
  if log_level == vim.log.levels.ERROR and type(msg) == "string" and msg:match("textDocument/diagnostic failed") then
    return
  end
  print(msg)
end

vim.lsp.log.set_level("off")
