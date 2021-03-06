import { supports } from '../langserv/server-features'
import { definition } from '../langserv/adapter'
import nvim from '../core/neovim'

nvim.onAction('definition', async () => {
  if (!supports.definition(nvim.state.cwd, nvim.state.filetype)) return

  const { path, line, column } = await definition(nvim.state)
  if (!line || !column) return
  nvim.jumpTo({ path, line, column })
})
