import test from 'node:test'
import assert from 'node:assert/strict'
import { parseVoAICatalog, synthesizeVoAI, voaiTuning } from '../lib/providers/voai.js'
import { createCatalogService } from '../lib/catalog.js'
import { needsApiKey, keyEnvName } from '../lib/keys.js'

const fixture = { data: { models: [
  { info: { version: 'Neo' }, speakers: [{ name: '佑希', styles: ['預設', '聊天'], gender: '女', category: '溫柔' }] },
  { info: { version: 'Sota+' }, speakers: [{ name: '子墨', styles: ['沉穩'], gender: '男' }] },
] } }

test('VoAI dynamically filters speakers and styles by model, without inventing options', () => {
  const neo = parseVoAICatalog(fixture, 'Neo')
  assert.deepEqual(neo.models.map(v => v.id), ['Neo', 'Sota+'])
  assert.deepEqual(neo.voices.map(v => v.id), ['佑希'])
  assert.deepEqual(neo.voices[0].styles, ['預設', '聊天'])
  assert.equal(parseVoAICatalog(fixture).voices[0].id, '子墨')
  assert.deepEqual(parseVoAICatalog(fixture, 'missing').voices, [])
})

test('VoAI discovery uses x-api-key and returns account-specific options', async () => {
  const service = createCatalogService({ resolveKey: async ref => { assert.equal(ref, 'VOAI_API_KEY'); return 'hidden' }, fetchImpl: async (url, options) => {
    assert.equal(url, 'https://connect.voai.ai/TTS/GetSpeaker')
    assert.equal(options.headers['x-api-key'], 'hidden')
    return new Response(JSON.stringify(fixture))
  } })
  const out = await service.discover('voai', {}, { model: 'Neo' })
  assert.equal(out.sources.models, 'live')
  assert.equal(out.voices[0].id, '佑希')
  assert.equal(JSON.stringify(out).includes('hidden'), false)
  assert.equal(needsApiKey('voai'), true)
  assert.equal(keyEnvName({}, 'voai'), 'VOAI_API_KEY')
})

test('VoAI synthesis sends selected model, speaker, style and native controls', async () => {
  let payload
  const result = await synthesizeVoAI({ cfg: { voaiPitch: -2, styleWeight: .8, breathPause: .5 }, req: { text: '你好', role: 'reply', models: { voai: 'Neo' }, voices: { voai: '佑希' }, styles: { voai: '聊天' } }, resolveKey: async () => 'secret', fetchImpl: async (url, options) => {
    assert.equal(url, 'https://connect.voai.ai/TTS/Speech')
    assert.equal(options.headers['x-api-key'], 'secret')
    assert.equal(options.headers['x-output-format'], 'mp3')
    payload = JSON.parse(options.body)
    return new Response(Buffer.alloc(100), { headers: { 'content-type': 'audio/mpeg' } })
  } })
  assert.equal(result.ok, true)
  assert.equal(payload.version, 'Neo'); assert.equal(payload.speaker, '佑希'); assert.equal(payload.style, '聊天')
  assert.equal(payload.pitch_shift, -2); assert.equal(payload.breath_pause, .5)
  assert.equal(payload.speed, 1) // Playback applies the speed exactly once.
})

test('VoAI blank selections resolve to a valid account combination', async () => {
  let payload
  await synthesizeVoAI({ cfg: {}, req: { text: '你好' }, resolveKey: async () => 'secret', fetchImpl: async (url, options) => {
    if (url.endsWith('/GetSpeaker')) return new Response(JSON.stringify(fixture))
    payload = JSON.parse(options.body)
    return new Response(Buffer.alloc(100))
  } })
  assert.equal(payload.version, 'Sota+'); assert.equal(payload.speaker, '子墨'); assert.equal(payload.style, '沉穩')
})

test('VoAI error response does not expose upstream content or keys', async () => {
  await assert.rejects(synthesizeVoAI({ cfg: {}, req: { text: 'Test', models: { voai: 'Neo' }, voices: { voai: '佑希' }, styles: { voai: '聊天' } }, resolveKey: async () => 'secret', fetchImpl: async () => new Response('secret', { status: 529 }) }), err => err.message.includes('529') && !err.message.includes('secret'))
  assert.deepEqual(voaiTuning({ voaiPitch: 99, styleWeight: -3, breathPause: 20 }), { pitch_shift: 5, style_weight: 0, breath_pause: 10 })
})
