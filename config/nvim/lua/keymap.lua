-- Lazy telescope accessor so telescope stays lazy-loaded (event = "VeryLazy")
-- and is not required at startup.
local function tb()
  return require("telescope.builtin")
end

vim.keymap.set("n", ",tt", "<cmd>Telescope<CR>")
vim.keymap.set("n", ",ff", function() tb().find_files() end)
vim.keymap.set("n", ",fd", function() tb().find_files({ hidden = true }) end)
vim.keymap.set("n", ",gs", function() tb().git_status() end)
vim.keymap.set("n", ",gf", function() tb().git_files() end)
vim.keymap.set("n", ",ts", function() tb().treesitter() end)
vim.keymap.set("n", ",ws", function() tb().lsp_dynamic_workspace_symbols() end)
vim.keymap.set("n", ",b", function() tb().buffers() end)
vim.keymap.set("n", ",rg", function() require("telescope").extensions.live_grep_args.live_grep_args() end)
vim.keymap.set("n", ",rr", function() tb().resume() end)
vim.keymap.set("n", ",re", function() tb().oldfiles({ only_cwd = true }) end)

local virtual_text = false
--- LSP keymap
vim.api.nvim_create_autocmd("LspAttach", {
  desc = "LSP actions",
  callback = function(event)
    local opts = { noremap = true, silent = true, buffer = event.buf }

    vim.keymap.set("n", "K", vim.lsp.buf.hover, opts)
    vim.keymap.set("n", "gd", function() tb().lsp_definitions() end, opts)
    vim.keymap.set("n", "gr", function() tb().lsp_references() end, opts)
    vim.keymap.set("n", ",rn", vim.lsp.buf.rename, opts)
    vim.keymap.set("n", ",ac", vim.lsp.buf.code_action, opts)
    vim.keymap.set("n", ",Ac", function()
      vim.lsp.buf.code_action({ context = { only = { "source", "refactor", "quickfix" } } })
    end, opts)

    vim.keymap.set("n", "gi", function() tb().lsp_implementations() end, opts)
    vim.keymap.set("n", "gt", function() tb().lsp_type_definitions() end, opts)

    vim.keymap.set("n", ",Do", function() tb().diagnostics({ bufnr = 0 }) end, opts)
    vim.keymap.set("n", ",do", vim.diagnostic.open_float, opts)

    vim.keymap.set("n", "<leader>[", function() vim.diagnostic.goto_prev() end, opts)
    vim.keymap.set("n", "<leader>]", function() vim.diagnostic.goto_next() end, opts)

    vim.keymap.set("n", ",dt", function()
      virtual_text = not virtual_text
      vim.diagnostic.config({
        virtual_text = virtual_text,
        virtual_lines = virtual_text,
      })
    end, { silent = true, noremap = true })

    -- Display diagnostics as virtual text only outside of insert mode
    vim.api.nvim_create_autocmd("InsertEnter", {
      buffer = event.buf,
      callback = function()
        if virtual_text ~= false then
          vim.diagnostic.config({ virtual_text = false })
        end
      end,
    })

    vim.api.nvim_create_autocmd("InsertLeave", {
      buffer = event.buf,
      callback = function()
        vim.diagnostic.config({
          virtual_text = virtual_text,
          virtual_lines = virtual_text,
        })
      end,
    })

    vim.keymap.set("n", "[e", function()
      vim.diagnostic.goto_prev({ severity = vim.diagnostic.severity.ERROR })
    end, opts)
    vim.keymap.set("n", "]e", function()
      vim.diagnostic.goto_next({ severity = vim.diagnostic.severity.ERROR })
    end, opts)
  end,
})

-- Terminal Keymap
function _G.set_terminal_keymaps()
  local opts = { noremap = true }
  vim.api.nvim_buf_set_keymap(0, "t", "<C-e>", [[<C-\><C-n>]], opts)
  vim.api.nvim_buf_set_keymap(0, "t", "<C-h>", [[<C-\><C-n><C-W>h]], opts)
  vim.api.nvim_buf_set_keymap(0, "t", "<C-j>", [[<C-\><C-n><C-W>j]], opts)
  vim.api.nvim_buf_set_keymap(0, "t", "<C-k>", [[<C-\><C-n><C-W>k]], opts)
  vim.api.nvim_buf_set_keymap(0, "t", "<C-l>", [[<C-\><C-n><C-W>l]], opts)
  vim.api.nvim_buf_set_keymap(0, "t", "<C-z>", [[<C-\><C-n><cmd>resize 15<CR>a]], opts)
  vim.api.nvim_buf_set_keymap(0, "n", "<C-z>", [[<C-\><C-n><cmd>resize 15<CR>a]], opts)
end

vim.cmd("autocmd! TermOpen term://* lua set_terminal_keymaps()")

-- Buffers Keymap (bufferline provides cycle + goto-by-index; mini.bufremove
-- deletes buffers. Replaces the stale vim-bufsurf + nvim-smartbufs plugins.)
local function ensure_bufferline()
  pcall(require, "bufferline")
end

local function buf_remove(buf, force)
  local ok, bufremove = pcall(require, "mini.bufremove")
  if ok then
    pcall(bufremove.delete, buf, force)
  else
    pcall(vim.cmd, "bdelete " .. buf)
  end
end

local goBackBuffer = function()
  ensure_bufferline()
  vim.cmd("BufferLineCyclePrev")
  pcall(vim.cmd, [[execute "normal! g`"zz"]])
end

local goForwardBuffer = function()
  ensure_bufferline()
  vim.cmd("BufferLineCycleNext")
  pcall(vim.cmd, [[execute "normal! g`"zz"]])
end

local goBackAndCloseCurrentBuf = function()
  local buf_id = vim.api.nvim_get_current_buf()
  goBackBuffer()
  buf_remove(buf_id, true)
end

local closeHiddenBuffers = function()
  local non_hidden = {}
  for _, win in ipairs(vim.api.nvim_list_wins()) do
    non_hidden[vim.api.nvim_win_get_buf(win)] = true
  end
  for _, buffer in ipairs(vim.api.nvim_list_bufs()) do
    local bo = vim.bo[buffer]
    if
      vim.api.nvim_buf_is_valid(buffer)
      and bo.buflisted
      and not bo.modified
      and non_hidden[buffer] == nil
      and bo.buftype ~= "terminal"
    then
      buf_remove(buffer, false)
    end
  end
end

vim.keymap.set("n", "<Leader>w", closeHiddenBuffers)
vim.keymap.set("n", "<c-x>", goBackAndCloseCurrentBuf)
vim.keymap.set("n", "]b", goForwardBuffer)
vim.keymap.set("n", "[b", goBackBuffer)

vim.keymap.set("n", ",q", "<cmd>bp<CR><cmd>bd #<CR>")
vim.keymap.set("n", ",x", "<cmd>bp<CR><cmd>bd #<CR><cmd>q<CR>")
vim.keymap.set("n", ",[", "<cmd>bprevious<CR>")
vim.keymap.set("n", ",]", "<cmd>bnext<CR>")

-- Go to / close the buffer shown at bufferline tab `index`
_G.GotoBuffer = function(index)
  ensure_bufferline()
  vim.cmd("BufferLineGoToBuffer " .. index)
end

_G.CloseBuffer = function(index)
  ensure_bufferline()
  vim.cmd("BufferLineGoToBuffer " .. index)
  vim.schedule(function() buf_remove(0, false) end)
end

vim.api.nvim_create_user_command("CloseBuffer", function(opts)
  _G.CloseBuffer(tonumber(opts.args))
end, { nargs = 1 })

for i = 1, 9 do
  vim.keymap.set("n", string.format("<Leader>%d", i), string.format("<Cmd>lua GotoBuffer(%d)<CR>", i), { silent = true })
  vim.keymap.set("n", string.format("<Leader>s%d", i), string.format("<Cmd>lua CloseBuffer(%d)<CR>", i), { silent = true })
end

-- Others

vim.api.nvim_create_user_command("Wrapline", function() vim.wo.wrap = true end, {})
vim.api.nvim_create_user_command("Nowrapline", function() vim.wo.wrap = false end, {})

vim.keymap.set("n", "<leader>db", "<cmd>Dashboard<CR>")
-- neo-tree is the active explorer (netrw is disabled), so <leader>e reveals the current file in the tree
vim.keymap.set("n", "<leader>e", "<cmd>Neotree reveal toggle<cr>", { noremap = true, silent = true, desc = "Open file explorer (reveal)" })

vim.keymap.set("n", "<leader>Q", "<cmd>tabc<CR>", { noremap = true, silent = true })
vim.keymap.set("n", "<leader>za", "<cmd>ZenMode<CR>", { noremap = true, silent = true })

--- illuminate keymap for MacOS (option-tilde / option-pi) ---
vim.keymap.set("n", "\xcb\x9c", function() require("illuminate").goto_next_reference() end, { desc = "Move to next reference" })
vim.keymap.set("n", "\xcf\x80", function() require("illuminate").goto_prev_reference() end, { desc = "Move to previous reference" })

vim.keymap.set("n", "<Leader>o", "<cmd>DashboardNewFile<CR>", { silent = true })
