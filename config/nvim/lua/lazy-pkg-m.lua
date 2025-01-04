local lazypath = vim.fn.stdpath "data" .. "/lazy/lazy.nvim"

if not vim.loop.fs_stat(lazypath) then
  vim.fn.system {
    "git",
    "clone",
    "--filter=blob:none",
    "https://github.com/folke/lazy.nvim.git",
    "--branch=stable", -- latest stable release
    lazypath,
  }
end

vim.opt.rtp:prepend(lazypath)

local lazy_opts = {
  defaults = { lazy = true },
  performance = {
    cache = { enabled = true },
    rtp = {
      disabled_plugins = {},
    },
  },
  checker = {
    enabled = true,
    frequency = 86400,
  },
}

require("lazy").setup({
  {
    "nvim-lua/plenary.nvim",
    lazy = false,
  },
  {
    "echasnovski/mini.icons",
    lazy = false,
    version = false,
    config = function()
      require("mini.icons").setup()
      require("mini.icons").mock_nvim_web_devicons()
    end,
  },

  -- Colors
  {
    "nvimdev/dashboard-nvim",
    config = function()
      require "plugins-opts.dashboard"
    end,
    event = "VimEnter",
  },

  {
    "sainnhe/gruvbox-material",
    lazy = false,
    priority = 1000,
  },

  { "projekt0n/github-nvim-theme", lazy = false, priority = 1000 },

  { "navarasu/onedark.nvim",       lazy = false, priority = 1000 },
  -- {
  --   "0xstepit/flow.nvim",
  --   lazy = false,
  --   priority = 1000,
  --   opts = {
  --     theme = {
  --       style = "dark",
  --       contrast = "high", -- "default" | "high"
  --       transparent = true,
  --     },
  --   },
  -- },
  --
  -- {
  --   "rebelot/kanagawa.nvim",
  --   lazy = false,
  --   priority = 1000,
  --   opts = {
  --     transparent = true,
  --     dimInactive = true,
  --   },
  -- },
  {
    "oxfist/night-owl.nvim",
    lazy = false,    -- make sure we load this during startup if it is your main colorscheme
    priority = 1000, -- make sure to load this before all the other start plugins
  },

  { "nyoom-engineering/oxocarbon.nvim", lazy = false,  priority = 1000 },

  {
    "folke/tokyonight.nvim",
    lazy = false,
    priority = 1000,
  },

  {
    "baliestri/aura-theme",
    lazy = false,
    priority = 1000,
    config = function(plugin)
      vim.opt.rtp:append(plugin.dir .. "/packages/neovim")
    end,
  },

  {
    "AlexvZyl/nordic.nvim",
    lazy = false,
    priority = 1000,
    config = function()
      require("nordic").setup {
        -- transparent_bg = true,
      }
    end,
  },

  {
    "nvim-treesitter/nvim-treesitter",
    config = function()
      require "plugins-opts.treesitter"
    end,
    dependencies = {
      "nvim-treesitter/nvim-treesitter-textobjects",
    },
    event = "VeryLazy",
    build = ":TSUpdate",
  },

  {
    "windwp/nvim-ts-autotag",
    config = function()
      require("nvim-ts-autotag").setup {
        opts = {
          enable_close = true,           -- Auto close tags
          enable_rename = true,          -- Auto rename pairs of tags
          enable_close_on_slash = false, -- Auto close on trailing </
        },
      }
    end,
    event = "InsertEnter",
  },

  {
    "phaazon/hop.nvim",
    config = function()
      require "plugins-opts.hop"
    end,
    event = "BufReadPost",
  },

  {
    "machakann/vim-sandwich",
    event = "BufReadPost",
  },

  {
    "mg979/vim-visual-multi",
    init = function()
      vim.g.VM_theme = "purplegray"
      vim.g.VM_mouse_mappings = 1
      -- vim.schedule(function()
      vim.g.VM_maps = {
        ["I BS"] = "",
        ["Goto Next"] = "]v",
        ["Goto Prev"] = "[v",
        ["I CtrlB"] = "<M-b>",
        ["I CtrlF"] = "<M-f>",
        ["I Return"] = "<S-CR>",
        ["I Down Arrow"] = "",
        ["I Up Arrow"] = "",
      }
      -- end)
    end,
    event = "BufReadPost",
  },

  {
    "JoosepAlviste/nvim-ts-context-commentstring",
    config = function()
      require("ts_context_commentstring").setup {
        enable_autocmd = false,
      }
    end,
  },

  {
    "echasnovski/mini.comment",
    opts = {
      options = {
        custom_commentstring = function()
          return require("ts_context_commentstring.internal").calculate_commentstring() or vim.bo.commentstring
        end,
      },
    },
    version = false,
    event = "VeryLazy",
  },

  {
    "nvim-telescope/telescope.nvim",
    config = function()
      require "plugins-opts.telescope"
    end,
    dependencies = {
      "nvim-telescope/telescope-ui-select.nvim",
      "nvim-telescope/telescope-live-grep-args.nvim",
      "nvim-telescope/telescope-file-browser.nvim",
      { "nvim-telescope/telescope-fzf-native.nvim", build = "make" },
    },
    event = "VeryLazy",
  },

  {
    "stevearc/dressing.nvim",
    opts = {},
    lazy = false,
    config = function()
      require "plugins-opts.dressing"
    end,
  },

  {
    "Shatur/neovim-session-manager",
    config = function()
      require "plugins-opts.session_manager"
    end,
    lazy = false,
  },

  {
    "nvimdev/indentmini.nvim",
    config = function()
      require "plugins-opts.indentmini"
    end,
    event = "BufReadPost",
  },

  {
    "windwp/nvim-autopairs",
    config = function()
      require "plugins-opts.autopairs"
    end,
    event = "InsertEnter",
  },

  {
    "nvim-lualine/lualine.nvim",
    config = function()
      require "plugins-opts.lualine"
    end,
    event = "VeryLazy",
  },

  {
    "zbirenbaum/copilot.lua",
    cmd = "Copilot",
    build = ":Copilot auth",
    opts = {
      suggestion = { enabled = false },
      panel = { enabled = false },
      filetypes = {
        markdown = true,
        help = true,
      },
    },
  },

  {
    "OXY2DEV/markview.nvim",
    ft = "markdown",

    dependencies = {
      "nvim-treesitter/nvim-treesitter",
      "echasnovski/mini.icons",
    },
  },

  {
    "yetone/avante.nvim",
    event = "BufReadPost",
    version = false, -- set this if you want to always pull the latest change
    opts = {
      provider = "copilot",
    },
    -- if you want to build from source then do `make BUILD_FROM_SOURCE=true`
    build = "make",
    -- build = "powershell -ExecutionPolicy Bypass -File Build.ps1 -BuildFromSource false" -- for windows
    dependencies = {
      "nvim-treesitter/nvim-treesitter",
      "stevearc/dressing.nvim",
      "nvim-lua/plenary.nvim",
      "MunifTanjim/nui.nvim",
      "echasnovski/mini.icons",
      "zbirenbaum/copilot.lua",
      {
        -- support for image pasting
        "HakonHarnes/img-clip.nvim",
        event = "VeryLazy",
        opts = {
          -- recommended settings
          default = {
            embed_image_as_base64 = false,
            prompt_for_file_name = false,
            drag_and_drop = {
              insert_mode = true,
            },
            -- required for Windows users
            use_absolute_path = true,
          },
        },
      },
      {
        -- Make sure to set this up properly if you have lazy=true
        "MeanderingProgrammer/render-markdown.nvim",
        opts = {
          file_types = { "markdown", "Avante" },
        },
        ft = { "markdown", "Avante" },
      },
    },
  },

  {
    "saghen/blink.cmp",
    dependencies = {
      {
        "rafamadriz/friendly-snippets",
      },
      {
        "L3MON4D3/LuaSnip",
        version = "v2.*",
      },
      {
        "giuxtaposition/blink-cmp-copilot",
      },
    },

    opts = {
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
          "snippet_forward",
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
          selection = function(ctx)
            return ctx.mode == "cmdline" and "auto_insert" or "preselect"
          end,
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
    },
    opts_extend = { "sources.default" },
  },

  {
    "kyazdani42/nvim-tree.lua",
    config = function()
      require "plugins-opts.nvim-tree"
    end,
    lazy = false,
  },

  {
    "neovim/nvim-lspconfig",
    event = { "BufReadPost", "BufNewFile" },
    dependencies = {
      "onsails/lspkind-nvim",
    },
  },

  {
    "yioneko/nvim-vtsls",
    dependencies = {
      "neovim/nvim-lspconfig",
    },
    lazy = false,
  },

  {
    "williamboman/mason.nvim",
    config = function()
      require "plugins-opts.mason"
    end,
    dependencies = {
      { "williamboman/mason-lspconfig.nvim", event = "VeryLazy" },
    },
    event = "VeryLazy",
  },

  {
    "mrcjkb/rustaceanvim",
    version = "^5", -- Recommended
    lazy = false,   -- This plugin is already lazy
    init = function()
      vim.g.rustaceanvim = {
        -- Plugin configuration
        tools = {},
        -- LSP configuration
        server = {
          on_attach = function(client, bufnr)
            local format_sync_grp = vim.api.nvim_create_augroup("RustaceanFormat", {})
            vim.api.nvim_create_autocmd("BufWritePre", {
              buffer = bufnr,
              callback = function()
                vim.lsp.buf.format()
              end,
              group = format_sync_grp,
            })
          end,
          default_settings = {
            ["rust-analyzer"] = {},
          },
        },
        -- DAP configuration
        dap = {},
      }
    end,
  },

  {
    "lewis6991/gitsigns.nvim",
    config = function()
      require "plugins-opts.gitsign"
    end,
    event = {
      "BufReadPost",
    },
  },

  { "akinsho/git-conflict.nvim",        version = "*", config = true,  lazy = false },

  {
    "tpope/vim-fugitive",
    cmd = {
      "G",
      "Git",
    },
  },
  {
    "nvimtools/none-ls.nvim",
    dependencies = { "davidmh/cspell.nvim", "nvimtools/none-ls-extras.nvim" },
    event = { "BufReadPost", "BufNewFile" },
    config = function()
      require "plugins-opts.none-ls"
    end,
  },

  {
    "voldikss/vim-floaterm",
    init = function()
      require "plugins-opts.floaterm"
    end,
    -- lazy = false,
    event = "VeryLazy",
  },

  {
    "akinsho/bufferline.nvim",
    config = function()
      require "plugins-opts.bufferline"
    end,
    dependencies = {
      "famiu/bufdelete.nvim",
    },
    event = { "BufReadPost" },
  },

  {
    "xiyaowong/nvim-transparent",
    config = function()
      require "plugins-opts.transparent"
    end,
    lazy = false,
    enabled = false,
  },

  {
    "akinsho/toggleterm.nvim",
    config = function()
      require "plugins-opts.togglerterm"
    end,
    event = "VeryLazy",
  },

  {
    "folke/zen-mode.nvim",
    config = function()
      require "plugins-opts.zen-mode"
    end,
    cmd = "ZenMode",
  },

  {
    "johann2357/nvim-smartbufs",
    event = "BufReadPost",
  },

  {
    "ton/vim-bufsurf",
    event = "BufReadPost",
  },

  {
    "famiu/bufdelete.nvim",
  },

  {
    "RRethy/vim-illuminate",
    config = function()
      require "plugins-opts.illuminate"
    end,
    event = "BufReadPost",
  },

  {
    "karb94/neoscroll.nvim",
    config = function()
      require "plugins-opts.neoscroll"
    end,
    event = "VeryLazy",
  },

  {
    "kevinhwang91/nvim-ufo",
    config = function()
      require "plugins-opts.ufo"
    end,
    dependencies = {
      "kevinhwang91/promise-async",
    },
    event = "VeryLazy",
  },
}, lazy_opts)
