import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { applySpeechBridge, SPEECH_BRIDGE_STATUS_PATH, SPEECH_BRIDGE_TOOL } from '../lib/speech-bridge/index.js'
import { Config } from '../lib/index.js'

function fakeCtx({ existingTool, services = {} } = {}) {
  const registered = []
  const routes = new Map()
  const cleanups = []
  const executable = new Set()
  const injected = []
  const ctx = {
    effect(fn) {
      const undo = fn()
      if (typeof undo === 'function') cleanups.push(undo)
    },
    webServer: {
      register(spec) {
        routes.set(spec.path, spec.handler)
        return () => routes.delete(spec.path)
      },
      getOrigin: () => 'http://127.0.0.1:1234',
    },
    tools: {
      get: (name) => (name === SPEECH_BRIDGE_TOOL ? existingTool : undefined),
      register: (tool, options) => registered.push({ tool, options }),
      executable: (name) => (executable.has(name) ? {} : undefined),
    },
    inject(names, callback) {
      injected.push(names[0])
      if (services[names[0]]) callback({ ...ctx, [names[0]]: services[names[0]] })
    },
  }
  return { ctx, registered, routes, cleanups, executable, injected }
}

function read(handler, { method = 'GET', remote = '127.0.0.1', host = '127.0.0.1:1234' } = {}) {
  let status
  let body
  handler(
    { method, socket: { remoteAddress: remote }, headers: { host } },
    { writeHead: (code) => (status = code), end: (text) => (body = JSON.parse(text)) },
  )
  return { status, body }
}

const define = (spec) => spec

test('內建語音交付：註冊工具與狀態端點，工具只在對話有通訊出口時出現', () => {
  let on = true
  const f = fakeCtx()
  applySpeechBridge(f.ctx, { tts: {}, enabled: () => on, define })
  assert.equal(f.registered.length, 1)
  assert.equal(f.registered[0].tool.name, SPEECH_BRIDGE_TOOL)
  const when = f.registered[0].options.when
  assert.equal(when({ agent: {} }), false, '沒裝通訊插件的人看不到這個工具')
  f.executable.add('send_media')
  assert.equal(when({ agent: {} }), true)
  on = false
  assert.equal(when({ agent: {} }), false, '關掉開關後工具立刻消失，不必重啟')

  const handler = f.routes.get(SPEECH_BRIDGE_STATUS_PATH)
  const ok = read(handler)
  assert.equal(ok.status, 200)
  assert.equal(ok.body.deliveryReady, true)
  assert.equal(ok.body.deliveryEnabled, false)
  assert.equal(ok.body.standalone, false)
  assert.ok(ok.body.catalog.length >= 15)
  assert.deepEqual(ok.body.recent, [])
  assert.equal(read(handler, { remote: '10.0.0.5' }).status, 403)
  assert.equal(read(handler, { host: 'evil.example' }).status, 403)
  assert.equal(read(handler, { method: 'POST' }).status, 405)
})

test('內建語音交付：電腦上還有舊的獨立橋接時不重複註冊工具與辨識來源', () => {
  const stt = []
  const f = fakeCtx({ existingTool: { name: SPEECH_BRIDGE_TOOL }, services: { speechToText: { register: (p) => stt.push(p) } } })
  applySpeechBridge(f.ctx, { tts: {}, define })
  assert.equal(f.registered.length, 0)
  assert.equal(stt.length, 0)
  const status = read(f.routes.get(SPEECH_BRIDGE_STATUS_PATH)).body
  assert.equal(status.standalone, true)
  assert.equal(status.deliveryReady, false)
})

test('內建語音交付：外部 dsh-voice 辨識來源依設定登記，卸載時還原狀態', () => {
  const stt = []
  const services = { speechToText: { register: (p) => (stt.push(p), () => stt.pop()) } }
  const off = fakeCtx({ services })
  applySpeechBridge(off.ctx, { tts: {}, externalVoice: false, define })
  assert.equal(stt.length, 0)
  assert.equal(read(off.routes.get(SPEECH_BRIDGE_STATUS_PATH)).body.externalVoiceEnabled, false)

  const on = fakeCtx({ services })
  const { status } = applySpeechBridge(on.ctx, { tts: {}, define })
  assert.equal(stt.length, 1)
  assert.equal(stt[0].info.id, 'external:dsh-voice')
  assert.equal(status.externalSttRegistered, true)
  for (const undo of on.cleanups.reverse()) undo()
  assert.equal(status.externalSttRegistered, false)
  assert.equal(status.deliveryReady, false)
})

test('內建語音交付：兩個設定預設開啟，進入點有接上而且失敗不會拖垮朗讀', () => {
  const config = Config({})
  const plain = (value) => (value && typeof value.get === 'function' ? value.get() : value)
  assert.equal(plain(config.speechBridgeEnabled), true)
  assert.equal(plain(config.speechBridgeExternalVoice), true)
  const entry = fs.readFileSync(new URL('../lib/index.js', import.meta.url), 'utf8')
  assert.match(entry, /try \{\s+applySpeechBridge\(ctx, \{/)
  assert.match(entry, /語音交付橋接沒有啟動/)
})
