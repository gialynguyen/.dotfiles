require("blink.cmp").setup {
  keymap = {
    preset = "enter",
    ["<C-space>"] = {},
    ["<C-e>"] = {},
    ["<C-c>"] = { "hide", "fallback" },
    ["<C-s>"] = { "show", "show_documentation", "hide_documentation" },
    ["<Tab>"] = {
      function(cmp)
        if cmp.snippet_active() then
          return cmp.accept()
        else
          return cmp.select_and_accept()
        end
      end,
      function() -- sidekick next edit suggestion
        return require("sidekick").nes_jump_or_apply()
      end,
      -- function()   -- if you are using Neovim's native inline completions
      --   return vim.lsp.inline_completion.get()
      -- end,
      "fallback",
    },

    ["<S-Tab>"] = { "snippet_backward", "fallback" },
  },

  appearance = {
    use_nvim_cmp_as_default = true,
    nerd_font_variant = "mono",
  },

  completion = {
    ghost_text = {
      enabled = true,
    },
    list = {
      selection = {
        preselect = function(ctx)
          return ctx.mode ~= "cmdline" and not require("blink.cmp").snippet_active { direction = 1 }
        end,
        auto_insert = function(ctx)
          return ctx.mode == "cmdline"
        end,
      },
    },
    menu = {
      border = "single",
      draw = {
        components = {
          kind_icon = {
            ellipsis = false,
            text = function(ctx)
              if ctx.kind == "Copilot" then
                return ""
              end
              local kind_icon, _, _ = require("mini.icons").get("lsp", ctx.kind)
              return kind_icon
            end,
            highlight = function(ctx)
              local _, hl, _ = require("mini.icons").get("lsp", ctx.kind)
              return hl
            end,
          },
        },
      },
    },
    documentation = { window = { border = "single" } },
    trigger = {
      prefetch_on_insert = false,
      show_in_snippet = false,
      show_on_keyword = false
    }
  },

  signature = { enabled = true, window = { border = "single" } },

  sources = {
    default = { "lsp", "snippets", "path", "buffer", "copilot" },
    providers = {
      copilot = {
        name = "copilot",
        module = "blink-cmp-copilot",
        score_offset = 100,
        async = true,
        transform_items = function(_, items)
          local CompletionItemKind = require("blink.cmp.types").CompletionItemKind
          local kind_idx = #CompletionItemKind + 1
          CompletionItemKind[kind_idx] = "Copilot"
          for _, item in ipairs(items) do
            item.kind = kind_idx
          end
          return items
        end,
      },
    },
  },
}
