import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import os from 'node:os'
import { pathToFileURL } from 'node:url'
const require = createRequire(import.meta.url)
let schema
try { schema = require.resolve('@deepseek-ai/schemastery') }
catch { schema = createRequire(path.join(process.env.DSH_TEST_PROFILE || path.join(os.homedir(), '.dsh/profiles/desktop'), 'package.json')).resolve('@deepseek-ai/schemastery') }
let seq = 0

export async function hostFixture(overrides = {}, providerFactory, {root,services={}}={}) {
  let source = await fs.readFile(new URL('../lib/index.js', import.meta.url), 'utf8')
  const key = `__ttsTestProviders${++seq}`
  globalThis[key] = providerFactory
  if(root)source=source.replace('const voiceAssets=createVoiceAssets()',`const voiceAssets=createVoiceAssets({root:${JSON.stringify(root)}})`)
  if(root)source=source.replace('voiceModels=createVoiceModels()',`voiceModels=createVoiceModels({root:${JSON.stringify(root)}})`)
  if(root)source=source.replace('createCloudVoices({voiceAssets,resolveKey,synthesize})',`createCloudVoices({root:${JSON.stringify(root)},voiceAssets,resolveKey,synthesize})`)
  source=source.replace('voiceProfiles=createVoiceProfiles()',`voiceProfiles=createVoiceProfiles({root:${JSON.stringify(root||path.join(os.tmpdir(),'dsh-tts-host-profiles-'+process.pid+'-'+seq))}})`)
  source=source.replace('usageLedger=createUsageLedger()',`usageLedger=createUsageLedger({root:${JSON.stringify(root||path.join(os.tmpdir(),'dsh-tts-host-fixture-'+process.pid+'-'+seq))}})`)
  source = source.replace("import z from '@deepseek-ai/schemastery'", `import z from '${pathToFileURL(schema).href}'`)
    .replace("import { defineTool } from '@deepseek-ai/dsh-tools'", 'const defineTool = x => x')
    .replace("import { credentialRef } from '@deepseek-ai/dsh-credentials'", 'const credentialRef = x => x')
  if (providerFactory) source = source.replace("import { makeProviders, PROVIDER_KEYS, DEFAULT_MODELS, DEFAULT_VOICES } from './providers.js'", `import { PROVIDER_KEYS, DEFAULT_MODELS, DEFAULT_VOICES } from './providers.js'; const makeProviders = (...args) => globalThis['${key}'](...args)`)
  source = source.replace(/from '(\.\/.+?)'/g, (_, rel) => `from '${new URL('../lib/' + rel, import.meta.url).href}'`)
  const { apply, Config, plainConfig } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))
  const config = plainConfig(Config({ speakReplies: true, cache: false, chain: [{ provider: 'edge', voice: 'fixture' }], ...overrides }))
  const routes = new Map(), events = new Map(), tools = [], cleanup = []
  const ctx = {
    provide(name,value){services[name]=value},llm:services.llm,get:name=>services[name],credentials: { resolve: async () => null }, tools: { register: tool => tools.push(tool) },
    effect(fn) { const dispose = fn(); if (typeof dispose === 'function') cleanup.push(dispose) },
    on(name, callback) { events.set(name, callback); return () => {} },
    webServer: { register(route) { routes.set(route.path, route.handler); return () => {} } },
  }
  apply(ctx, config)
  let sessionId = ''
  for (const [name, fn] of events) events.set(name, (session, ...args) => { sessionId = session?.id || sessionId; return fn(session, ...args) })
  for (const tool of tools) {
    const execute = tool.execute
    tool.execute = (args, exec) => { sessionId = exec?.session?.id || sessionId; return execute(args, exec) }
  }
  async function read(route) {
    let body
    const url = route === '/dsh-tts/pending' ? route + '?sessionId=' + encodeURIComponent(sessionId) + '&clientId=fixture' : route
    await routes.get(route.split('?')[0])({ method: 'GET', url, headers: { host: '127.0.0.1' }, socket: { remoteAddress: '127.0.0.1' } }, { writeHead() {}, end(text) { body = JSON.parse(text) } })
    return body
  }
  return { config, events, tools, routes, read, close() { for (const fn of cleanup.reverse()) fn(); delete globalThis[key] } }
}
