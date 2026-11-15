import test from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { EventEmitter } from 'node:events'
import { hostFixture } from './host-fixture.mjs'

async function preview(f, body, onResponse) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))])
  Object.assign(req, { method: 'POST', url: '/dsh-tts/preview', headers: { host: '127.0.0.1' }, socket: { remoteAddress: '127.0.0.1' } })
  let status, data
  const res = new EventEmitter(); res.writeHead = n => { status = n }; res.end = s => { data = JSON.parse(s) }
  onResponse?.(res)
  await f.routes.get('/dsh-tts/preview')(req, res)
  return { status, data }
}

test('Edge default preview follows selected voice locale and preserves explicitly entered text', async () => {
  const texts = []
  const f = await hostFixture({ language: 'en' }, (_deps, req) => ({ edge: async () => { texts.push(req.text); return { ok: true, provider: 'edge', audio: Buffer.alloc(100), mime: 'audio/mpeg' } } }))
  try {
    let out = await preview(f, { provider: 'edge', voice: 'zh-TW-HsiaoChenNeural' })
    assert.equal(out.status, 200); assert.equal(out.data.text, '這是語音試聽，請確認這句話能完整播放。')
    f.config.language = 'zh-TW'
    out = await preview(f, { provider: 'edge', voice: 'en-US-AriaNeural' })
    assert.equal(out.data.text, 'This is a voice preview. Please listen to the complete sentence.')
    await preview(f, { provider: 'edge', voice: 'zh-TW-HsiaoChenNeural', text: 'Keep this custom phrase.' })
    assert.equal(texts.at(-1), 'Keep this custom phrase.')
  } finally { f.close() }
})

test('preview uses only the selected provider and disconnect cancels its request', async () => {
  let signal, response
  const f = await hostFixture({}, (deps, req) => {
    assert.equal(deps.cfg.chain.length, 1); assert.equal(deps.cfg.chain[0].provider, 'openai')
    return { openai: () => new Promise((_resolve, reject) => { signal = req.signal; signal.addEventListener('abort', () => reject(Error('aborted')), { once: true }) }) }
  })
  try {
    const p = preview(f, { provider: 'openai', model: 'gpt-4o-mini-tts' }, res => { response = res })
    for (let i = 0; i < 50 && !signal; i++) await new Promise(r => setTimeout(r, 5))
    assert.ok(signal); response.emit('close')
    assert.equal((await p).status, 502); assert.equal(signal.aborted, true)
  } finally { f.close() }
})
