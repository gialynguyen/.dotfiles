local oil = require "oil"
oil.setup {
  delete_to_trash = true,
  float = {
    -- Padding around the floating window
    padding = 2,
    -- max_width and max_height can be integers or a float between 0 and 1 (e.g. 0.4 for 40%)
    max_width = 0.2,
    max_height = 0,
    border = "rounded",
    win_options = {
      winblend = 0,
    },
    -- optionally override the oil buffers window title with custom function: fun(winid: integer): string
    get_win_title = nil,
    -- preview_split: Split direction: "auto", "left", "right", "above", "below".
    preview_split = "auto",
    -- This is the config that will be passed to nvim_open_win.
    -- Change values here to customize the layout
    override = function(conf)
      return conf
    end,
  },

  keymaps = {
    -- create a new mapping, gs, to search and replace in the current directory
    gf = {
      callback = function()
        -- get the current directory
        local prefills = { paths = oil.get_current_dir() }

        local grug_far = require "grug-far"
        -- instance check
        if not grug_far.has_instance "explorer" then
          grug_far.open {
            instanceName = "explorer",
            prefills = prefills,
            staticTitle = "Find and Replace from Explorer",
          }
        else
          grug_far.get_instance("explorer"):open()
          -- updating the prefills without clearing the search and other fields
          grug_far.get_instance("explorer"):update_input_values(prefills, false)
        end
      end,
      desc = "oil: Search in directory",
    },
  },
}
vim.keymap.set("n", "<c-g>", require("oil").toggle_float)
vim.keymap.set("n", "<c-l>", "<cmd>Oil<CR>")
