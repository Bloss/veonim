import { cmd, onFile } from '../neovim'
import { sub } from '../../dispatch'
const watch = require('node-watch')

const sessions = new Map<number, Set<string>>()
const watchers = new Map<string, any>()
let currentSession: Set<string>

const anySessionsHaveFile = (file: string) => [...sessions.values()].some(s => s.has(file))

sub('session:switch', (id: number) => {
  if (sessions.has(id)) currentSession = sessions.get(id)!
  else sessions.set(id, currentSession = new Set<string>())
  cmd(`checktime`)
})

onFile.load(file => {
  if (!file) return
  currentSession.add(file)
  const w = watch(file, () => currentSession.has(file) && cmd(`checktime ${file}`))
  watchers.set(file, w)
})

onFile.unload(file => {
  if (!file) return
  currentSession.delete(file)
  if (anySessionsHaveFile(file)) return
  watchers.has(file) && watchers.get(file)!.close()
})

