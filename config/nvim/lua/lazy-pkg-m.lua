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
    opts = {},
    lazy = true,
    specs = {
      { "nvim-tree/nvim-web-devicons", enabled = false, optional = true },
    },
    init = function()
      package.preload["nvim-web-devicons"] = function()
        require("mini.icons").mock_nvim_web_devicons()
        return package.loaded["nvim-web-devicons"]
      end
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
    "f-person/auto-dark-mode.nvim",
    opts = {},
  },

  {
    "sainnhe/gruvbox-material",
    lazy = false,
    priority = 1000,
  },

  {
    "projekt0n/github-nvim-theme",
    name = "github-theme",
    lazy = false,
    priority = 1000,
  },

  {
    "navarasu/onedark.nvim",
    lazy = false,
    priority = 1000,
  },

  {
    "rose-pine/neovim",
    lazy = false,
    priority = 1000,
    name = "rose-pine",
  },

  {
    "folke/tokyonight.nvim",
    lazy = false,
    priority = 1000,
  },

  {
    "catppuccin/nvim",
    lazy = false,
    name = "catppuccin",
    priority = 1000,
  },

  {
    "EdenEast/nightfox.nvim",
    lazy = false,
    priority = 1000,
  },

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
  -- {
  --   "oxfist/night-owl.nvim",
  --   lazy = false,    -- make sure we load this during startup if it is your main colorscheme
  --   priority = 1000, -- make sure to load this before all the other start plugins
  -- },
  --
  -- { "nyoom-engineering/oxocarbon.nvim", lazy = false,  priority = 1000 },
  --
  --
  -- {
  --   "baliestri/aura-theme",
  --   lazy = false,
  --   priority = 1000,
  --   config = function(plugin)
  --     vim.opt.rtp:append(plugin.dir .. "/packages/neovim")
  --   end,
  -- },
  --
  -- {
  --   "AlexvZyl/nordic.nvim",
  --   lazy = false,
  --   priority = 1000,
  --   config = function()
  --     require("nordic").setup {
  --       -- transparent_bg = true,
  --     }
  --   end,
  -- },

  {
    "nvim-treesitter/nvim-treesitter",
    config = function()
      require "plugins-opts.treesitter"
    end,
    dependencies = {
      "nvim-treesitter/nvim-treesitter-textobjects",
    },
    lazy = vim.fn.argc(-1) == 0,
    event = { "VeryLazy", "BufReadPost", "BufWritePost", "BufNewFile" },
    build = ":TSUpdate",
  },

  {
    "windwp/nvim-ts-autotag",
    config = function()
      require("nvim-ts-autotag").setup {
        opts = {
          enable_close = true, -- Auto close tags
          enable_rename = true, -- Auto rename pairs of tags
          enable_close_on_slash = false, -- Auto close on trailing </
        },
      }
    end,
    event = "InsertEnter",
  },

  {
    "smoka7/hop.nvim",
    config = function()
      require "plugins-opts.hop"
    end,
    version = "*",
    opts = {
      keys = "etovxqpdygfblzhckisuran",
    },
    -- event = "BufReadPost",
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
    "MagicDuck/grug-far.nvim",
    cmd = "GrugFar",
    keys = {
      {
        "<leader>sr",
        function()
          local grug = require "grug-far"
          local ext = vim.bo.buftype == "" and vim.fn.expand "%:e"
          grug.open {
            transient = true,
            prefills = {
              filesFilter = ext and ext ~= "" and "*." .. ext or nil,
            },
          }
        end,
        mode = { "n", "v" },
        desc = "Search and Replace",
      },
    },
    -- Note (lazy loading): grug-far.lua defers all it's requires so it's lazy by default
    -- additional lazy config to defer loading is not really needed...
    config = function()
      -- optional setup call to override plugin options
      -- alternatively you can set options with vim.g.grug_far = { ... }
      require("grug-far").setup {
        -- options, see Configuration section below
        -- there are no required options atm
      }
    end,
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
    "folke/sidekick.nvim",
    event = "VeryLazy",
    opts = {
      -- add any options here
      cli = {
        -- mux = {
        --   backend = "zellij",
        --   enabled = true,
        -- },
      },
    },
    keys = {
      {
        "<tab>",
        function()
          -- if there is a next edit, jump to it, otherwise apply it if any
          if not require("sidekick").nes_jump_or_apply() then
            return "<Tab>" -- fallback to normal tab
          end
        end,
        expr = true,
        desc = "Goto/Apply Next Edit Suggestion",
      },
      {
        "<c-.>",
        function()
          require("sidekick.cli").toggle()
        end,
        desc = "Sidekick Toggle",
        mode = { "n", "t", "i", "x" },
      },
      {
        "<leader>aa",
        function()
          require("sidekick.cli").toggle()
        end,
        desc = "Sidekick Toggle CLI",
      },
      {
        "<leader>as",
        function()
          require("sidekick.cli").select()
        end,
        -- Or to select only installed tools:
        -- require("sidekick.cli").select({ filter = { installed = true } })
        desc = "Select CLI",
      },
      {
        "<leader>at",
        function()
          require("sidekick.cli").send { msg = "{this}" }
        end,
        mode = { "x", "n" },
        desc = "Send This",
      },
      {
        "<leader>af",
        function()
          require("sidekick.cli").send { msg = "{file}" }
        end,
        desc = "Send File",
      },
      {
        "<leader>av",
        function()
          require("sidekick.cli").send { msg = "{selection}" }
        end,
        mode = { "x" },
        desc = "Send Visual Selection",
      },
      {
        "<leader>ap",
        function()
          require("sidekick.cli").prompt()
        end,
        mode = { "n", "x" },
        desc = "Sidekick Select Prompt",
      },
      -- Open Crush directly
      {
        "<leader>ac",
        function()
          require("sidekick.cli").toggle { name = "crush", focus = true }
        end,
        desc = "Sidekick Crush",
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

  -- {
  --   "yetone/avante.nvim",
  --   keys = {
  --     { "<leader>aa", "<cmd>AvanteToggle<cr>" },
  --     { "<leader>ae", "<cmd>AvanteEdit<cr>" },
  --   },
  --   version = false, -- set this if you want to always pull the latest change
  --   opts = {
  --     provider = "copilot",
  --     providers = {
  --       copilot = {
  --         model = "claude-sonnet-4",
  --       },
  --     },
  --   },
  --   -- if you want to build from source then do `make BUILD_FROM_SOURCE=true`
  --   build = "make",
  --   -- build = "powershell -ExecutionPolicy Bypass -File Build.ps1 -BuildFromSource false" -- for windows
  --   dependencies = {
  --     "nvim-treesitter/nvim-treesitter",
  --     "stevearc/dressing.nvim",
  --     "nvim-lua/plenary.nvim",
  --     "MunifTanjim/nui.nvim",
  --     "echasnovski/mini.icons",
  --     "zbirenbaum/copilot.lua",
  --     {
  --       -- support for image pasting
  --       "HakonHarnes/img-clip.nvim",
  --       event = "VeryLazy",
  --       opts = {
  --         -- recommended settings
  --         default = {
  --           embed_image_as_base64 = false,
  --           prompt_for_file_name = false,
  --           drag_and_drop = {
  --             insert_mode = true,
  --           },
  --           -- required for Windows users
  --           use_absolute_path = true,
  --         },
  --       },
  --     },
  --     {
  --       -- Make sure to set this up properly if you have lazy=true
  --       "MeanderingProgrammer/render-markdown.nvim",
  --       opts = {
  --         file_types = { "markdown", "Avante" },
  --       },
  --       ft = { "markdown", "Avante" },
  --     },
  --   },
  -- },

  {
    "saghen/blink.cmp",
    version = "*",
    dependencies = {
      "fang2hou/blink-copilot",
      {
        "rafamadriz/friendly-snippets",
      },
      {
        "L3MON4D3/LuaSnip",
        version = "v2.*",
      },
    },

    config = function()
      require "plugins-opts.blink"
    end,

    opts_extend = { "sources.default" },
  },

  {
    "stevearc/oil.nvim",
    dependencies = { { "echasnovski/mini.icons", opts = {} } },
    config = function()
      require "plugins-opts.oil"
    end,
    lazy = false,
  },

  {
    "kyazdani42/nvim-tree.lua",
    config = function()
      require "plugins-opts.nvim-tree"
    end,
    lazy = false,
    enabled = false,
  },

  {
    "neovim/nvim-lspconfig",
    event = { "BufReadPost", "BufNewFile" },
    dependencies = {
      "onsails/lspkind-nvim",
      "yioneko/nvim-vtsls",
    },
  },

  {
    "yioneko/nvim-vtsls",
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
    lazy = false, -- This plugin is already lazy
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

  { "akinsho/git-conflict.nvim", version = "*", config = true, lazy = false },

  {
    "tpope/vim-fugitive",
    cmd = {
      "G",
      "Git",
    },
  },
  {
    "mfussenegger/nvim-lint",
    event = { "BufReadPost", "BufNewFile" },
    config = function()
      require "plugins-opts.nvim-lint"
    end,
  },

  {
    "stevearc/conform.nvim",
    event = { "BufReadPost", "BufNewFile" },
    config = function()
      require "plugins-opts.conform"
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
      "echasnovski/mini.icons",
    },
    event = { "BufReadPost" },
  },

  {
    "xiyaowong/nvim-transparent",
    config = function()
      require "plugins-opts.transparent"
    end,
    lazy = false,
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
