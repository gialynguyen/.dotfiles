require("mason").setup {
  ui = {
    border = "rounded",
  },
}

require("mason-lspconfig").setup {
  automatic_enable = false,
  ensure_installed = {
    "bashls",
    "clangd",
    "cssls",
    "cssmodules_ls",
    "gopls",
    "html",
    "eslint",
    "pyright",
    "tailwindcss",
    "astro",
    "vtsls",
    "lua_ls",
  },
  automatic_installation = true,
}

local capabilities = require("blink.cmp").get_lsp_capabilities()

local default_opts = {
  on_attach = function(client, bufnr)
    vim.api.nvim_buf_set_option(bufnr, "omnifunc", "v:lua.vim.lsp.omnifunc")
  end,
  autostart = true,
  capabilities = capabilities,
}

capabilities.textDocument.completion.completionItem.snippetSupport = true
capabilities.textDocument.foldingRange = {
  dynamicRegistration = false,
  lineFoldingOnly = true,
}

local mason_lspconfig = require "mason-lspconfig"
local lspconfig = require "lspconfig"

local setup_server = {
  tailwindcss = {
    autostart = false,
  },
  ["ts_ls"] = {
    enabled = false,
    autostart = false,
  },
  vtsls = {
    filetypes = {
      "javascript",
      "javascriptreact",
      "javascript.jsx",
      "typescript",
      "typescriptreact",
      "typescript.tsx",
    },
    single_file_support = true,
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
    on_attach = function(client, bufnr)
      vim.api.nvim_buf_set_option(bufnr, "omnifunc", "v:lua.vim.lsp.omnifunc")

      -- You can also define keybindings here
      local opts = { noremap = true, silent = true }
      vim.api.nvim_buf_set_keymap(bufnr, "n", ",vs", "<cmd>VtsExec source_actions<CR>", opts)
    end,

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
      ["window/showMessageRequest"] = function(_, result, params)
        return result
      end,
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
  svelte = {
    on_attach = function(client, bufnr)
      vim.api.nvim_create_autocmd("BufWritePost", {
        pattern = { "*.js", "*.ts" },
        group = vim.api.nvim_create_augroup("svelte_ondidchangetsorjsfile", { clear = true }),
        callback = function(ctx)
          -- Here use ctx.match instead of ctx.file
          client.notify("$/onDidChangeTsOrJsFile", { uri = ctx.match })
        end,
      })
      vim.api.nvim_buf_set_option(bufnr, "omnifunc", "v:lua.vim.lsp.omnifunc")
    end,
  },
}

for _, server_name in ipairs(mason_lspconfig.get_installed_servers()) do
  local opts = vim.tbl_deep_extend("force", default_opts, setup_server[server_name] or {})

  lspconfig[server_name].setup(opts)
end

vim.diagnostic.config {
  update_in_insert = false,
  virtual_text = false,
  signs = {
    text = {
      [vim.diagnostic.severity.ERROR] = "",
      [vim.diagnostic.severity.WARN] = "",
      [vim.diagnostic.severity.INFO] = "",
      [vim.diagnostic.severity.HINT] = "󰌵",
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
}

vim.notify = function(msg, log_level, _)
  if log_level == vim.log.levels.ERROR and msg:match "textDocument/diagnostic failed" then
    return
  end
  print(msg)
end
