import { fullBufferUpdate, partialBufferUpdate, references, definition } from './langserv/adapter'
import { ex, action, autocmd, cwdir, call, expr, getCurrentLine } from './ui/neovim'
import { cc, debounce, merge } from './utils'

// TODO: when renaming and such
let pauseUpdate = false
const cache = { filetype: '', file: '', revision: -1, cwd: '' }

const updateServer = async (lineChange = false) => {
  // TODO: better, more async
  const [ , line, column ] = await call.getpos('.')

  if (lineChange) partialBufferUpdate({
    ...cache,
    line,
    column,
    buffer: [ await getCurrentLine() ]
    //buffer: [ await call.getline('.') as string ]
  })

  else fullBufferUpdate({
    ...cache,
    line,
    column,
    // TODO: buffer.getLines api built-in
    buffer: await call.getline(1, '$') as string[]
  })
}

const attemptUpdate = async (lineChange = false) => {
  if (pauseUpdate) return
  // TODO: buffer.changedtick api built-in
  const chg = await expr('b:changedtick')
  if (chg > cache.revision) updateServer(lineChange)
  cache.revision = chg
}

autocmd.bufEnter(debounce(async () => {
  const [ cwd, file, filetype ] = await cc(cwdir(), call.expand(`%f`), expr(`&filetype`))
  merge(cache, { cwd, file, filetype, revision: -1 })
  updateServer()
}, 100))

autocmd.textChanged(debounce(() => attemptUpdate(), 200))
autocmd.textChangedI(() => attemptUpdate(true))

action('references', async () => {
  const [ , line, column ] = await call.getpos('.')
  const refs = await references({ ...cache, line, column })

  await call.setloclist(0, refs.map(m => ({
    lnum: m.line,
    col: m.column,
    text: m.desc
  })))

  ex('lopen')
  ex('wincmd p')
})

action('definition', async () => {
  const [ , line, column ] = await call.getpos('.')
  const loc = await definition({ ...cache, line, column })
  if (!loc || !loc.line || !loc.column) return
  await call.cursor(loc.line, loc.column)
})