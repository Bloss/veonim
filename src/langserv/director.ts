import { startServerFor, hasServerFor } from './server-loader'
import defaultCapabs from './capabilities'
import { Server } from '@veonim/jsonrpc'
import { onFnCall } from '../utils'

type ProxyFn = { [index: string]: Function }
type QueryableObject = { [index: string]: any }

interface Result {
  capabilities: QueryableObject
}

interface ActiveServer extends Server {
  canDo: Result & QueryableObject
}

const derp = (e: any) => console.error(e)
const servers = new Map<string, ActiveServer>()
const startingServers = new Set<string>()
const serverStartCallbacks = new Set<Function>()
const saveOpts = new Map<string, string>([
  ['textDocument/didOpen', 'openClose'],
  ['textDocument/didClose', 'openClose'],
  ['textDocument/didChange', 'change'],
  ['textDocument/didSave', 'save'],
  ['textDocument/willSave', 'willSave'],
  ['textDocument/willSaveWaitUntil', 'willSaveWaitUntil'],
])

const runningServers = {
  get: (cwd: string, type: string) => servers.get(`${cwd}::${type}`),
  add: (cwd: string, type: string, server: ActiveServer) => servers.set(`${cwd}::${type}`, server),
}

const startServer = async (cwd: string, filetype: string): Promise<ActiveServer> => {
  startingServers.add(cwd + filetype)
  const server = await startServerFor(filetype)
  const { error, capabilities: canDo } = await server.request.initialize(defaultCapabs(cwd)).catch(derp)
  if (error) throw `failed to initalize server ${filetype} -> ${JSON.stringify(error)}`
  server.notify.initialized()
  runningServers.add(cwd, filetype, { ...server, canDo })
  startingServers.delete(cwd + filetype)
  serverStartCallbacks.forEach(fn => fn(filetype))
  return { ...server, canDo }
}

const canDoMethod = ({ canDo }: ActiveServer, ns: string, fn: string) => {
  const save = saveOpts.get(`${ns}/${fn}`)

  return canDo[`${fn}Provider`]
    || canDo[`${ns + fn}Provider`]
    || save && (canDo || {}).textDocumentSync[save]
}

const registerDynamicCaller = (namespace: string): ProxyFn => onFnCall(async (method, args: any[]) => {
  const { cwd, filetype } = args[0]
  if (!hasServerFor(filetype) || startingServers.has(cwd + filetype)) return

  const server = runningServers.get(cwd, filetype) || await startServer(cwd, filetype)
  if (!server) return derp(`could not load server type:${filetype} cwd:${cwd}`)
  if (!canDoMethod(server, namespace, method)) return derp(`server does not support ${namespace}/${method}`)

  console.log(`LS --> ${method} ${JSON.stringify(args)}`)
  const result = await server.request[`${namespace}/${method}`](...args).catch(derp)
  console.log(`LS <-- ${result}`)
  return result
})

export const onServerStart = (fn: (filetype: string) => void) => serverStartCallbacks.add(fn)
export const client = registerDynamicCaller('client')
export const workspace = registerDynamicCaller('workspace')
export const completionItem = registerDynamicCaller('completionItem')
export const codeLens = registerDynamicCaller('codeLens')
export const documentLink = registerDynamicCaller('documentLink')
export const window = registerDynamicCaller('window')
export const textDocument = registerDynamicCaller('textDocument')
export const telemetry = registerDynamicCaller('telemetry')
export const cancelRequest = (cwd: string, language: string, id: string | number) => {
  const m = registerDynamicCaller('$')
  m.cancelRequest({ cwd, language, id })
}