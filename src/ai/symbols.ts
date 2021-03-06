import { show, SymbolMode } from '../components/symbols'
import { supports } from '../langserv/server-features'
import { symbols } from '../langserv/adapter'
import nvim from '../core/neovim'

nvim.onAction('symbols', async () => {
  if (!supports.symbols(nvim.state.cwd, nvim.state.filetype)) return

  const listOfSymbols = await symbols(nvim.state)
  listOfSymbols && show(listOfSymbols, SymbolMode.Buffer)
})

nvim.onAction('workspace-symbols', () => {
  if (supports.workspaceSymbols(nvim.state.cwd, nvim.state.filetype)) show([], SymbolMode.Workspace)
})
