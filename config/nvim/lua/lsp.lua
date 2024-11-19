require("mason").setup {
  ui = {
    border = "rounded",
  },
}

require("mason-lspconfig").setup {
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
  },
  automatic_installation = true,
}

require("mason-lspconfig").setup_handlers {
  function(server_name)
    local lspconfig = require "lspconfig"

    local capabilities = require("cmp_nvim_lsp").default_capabilities(vim.lsp.protocol.make_client_capabilities())

    capabilities.textDocument.completion.completionItem.snippetSupport = true
    capabilities.textDocument.foldingRange = {
      dynamicRegistration = false,
      lineFoldingOnly = true,
    }

    local setup_server = {
      tailwindcss = {
        autostart = false,
      },
      ['ts_ls'] = {
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

    local default_opts = {
      on_attach = function(client, bufnr)
        vim.api.nvim_buf_set_option(bufnr, "omnifunc", "v:lua.vim.lsp.omnifunc")
      end,
      autostart = true,
      capabilities = capabilities,
    }
    --
    -- if server_name == "tsserver" then
    --   require("typescript").setup {
    --     disable_commands = false,
    --     debug = false,
    --     go_to_source_definition = {
    --       fallback = true,
    --     },
    --     server = {
    --       on_attach = function(client, bufnr)
    --         vim.api.nvim_buf_set_option(bufnr, "omnifunc", "v:lua.vim.lsp.omnifunc")
    --       end,
    --       autostart = true,
    --       capabilities = capabilities,
    --       root_dir = function(fname)
    --         return lspconfig.util.root_pattern ".git"(fname)
    --       end,
    --     },
    --   }
    --   return
    -- end
    --
    local opts = vim.tbl_deep_extend("force", default_opts, setup_server[server_name] or {})

    lspconfig[server_name].setup(opts)
  end,
}

vim.diagnostic.config {
  virtual_text = false,
  signs = false,
  underline = true,
  virtual_lines = false,
}