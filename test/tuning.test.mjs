import test from 'node:test'
import assert from 'node:assert/strict'
import { voiceTuning, pitchHz } from '../lib/tuning.js'
import { edgeNativeSpeak } from '../lib/edge-native.js'
import { makeCloudProviders } from '../lib/providers/cloud.js'

test('role tuning inherits global settings unless explicitly enabled, including mute', () => {
  const cfg = { rate: 1.3, pitch: -10, volume: .7, roles: { coder: { rate: .8, pitch: 20, volume: 0 } } }
  assert.deepEqual(voiceTuning(cfg, 'coder'), { rate: 1.3, pitch: -10, volume: .7 })
  cfg.roles.coder.tuningEnabled = true
  assert.deepEqual(voiceTuning(cfg, 'coder'), { rate: .8, pitch: 20, volume: 0 })
  assert.deepEqual(voiceTuning({ rate: 99, pitch: NaN, volume: -2 }), { rate: 2, pitch: 0, volume: 0 })
  assert.equal(pitchHz(-12.4), '-12Hz')
})

test('Edge parses length-prefixed audio frames, applies pitch and escapes text', async () => {
  let sent = []; let closed = false
  class Socket {
    constructor() { queueMicrotask(() => this.onopen()) }
    send(message) {
      sent.push(message)
      if (!message.includes('Path:ssml')) return
      const header = Buffer.from('Path:audio\r\nContent-Type:audio/mpeg\r\n')
      const size = Buffer.alloc(2); size.writeUInt16BE(header.length)
      queueMicrotask(() => {
        this.onmessage({ data: Buffer.concat([size, header, Buffer.alloc(120, 1)]) })
        this.onmessage({ data: 'Path:turn.end' })
      })
    }
    close() { closed = true }
  }
  const out = await edgeNativeSpeak('A & <B>', { pitch: -15, WebSocketImpl: Socket })
  assert.equal(out.audio.length, 120)
  assert.ok(sent[1].includes('pitch="-15Hz"'))
  assert.ok(sent[1].includes('A &amp; &lt;B&gt;'))
  assert.equal(closed, true)
})

test('Edge cancellation closes the connection and never returns partial audio', async () => {
  let closed = false
  class Socket { close() { closed = true } }
  const controller = new AbortController()
  const promise = edgeNativeSpeak('test', { signal: controller.signal, WebSocketImpl: Socket })
  controller.abort()
  await assert.rejects(promise, /aborted/)
  assert.equal(closed, true)
})

function cloud(cfg, req, capture) {
  return makeCloudProviders({ cfg, resolveKey: async () => 'test-key', fetchImpl: async (url, options) => {
    capture(url, options)
    return new Response(JSON.stringify({ choices: [{ message: { audio: { data: Buffer.alloc(150).toString('base64') } } }] }))
  } }, { text: 'Hello', models: {}, voices: {}, role: 'reply', ...req }, () => ({ signal: new AbortController().signal, cleanup() {} }))
}

test('MiMo Voice Design uses description, instructions and no preset voice', async () => {
  let body
  const providers = cloud({ mimoVoiceDesign: 'A warm narrator', mimoInstruction: 'Speak calmly' }, { models: { mimo: 'mimo-v2.5-tts-voicedesign' }, voices: { mimo: '冰糖' } }, (_, opts) => { body = JSON.parse(opts.body) })
  await providers.mimo()
  assert.equal(body.audio.voice, undefined)
  assert.equal(body.messages[0].content, 'A warm narrator\nSpeak calmly')
  assert.equal(body.messages.at(-1).content, 'Hello')
})

test('MiMo normal voices retain selected voice and role-specific style', async () => {
  let body
  await cloud({ mimoInstruction: 'global', roles: { coder: { instruction: 'role style' } } }, { role: 'coder', voices: { mimo: 'Mia' } }, (_, opts) => { body = JSON.parse(opts.body) }).mimo()
  assert.equal(body.audio.voice, 'Mia')
  assert.equal(body.messages[0].content, 'role style')
})

test('Azure pitch is passed to SSML using the chosen role tuning', async () => {
  let ssml
  await cloud({ azureRegion: 'eastus', roles: { reply: { tuningEnabled: true, pitch: 25 } } }, {}, (_, opts) => { ssml = opts.body }).azure()
  assert.ok(ssml.includes('<prosody pitch="+25Hz">'))
})
