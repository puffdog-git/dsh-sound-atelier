import test from 'node:test'
import assert from 'node:assert/strict'
import { createCatalogService, normalizeList } from '../lib/catalog.js'
const response = data => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } })

test('custom catalogs accept OpenAI models and voices, cache and refresh', async () => {
  const calls = []
  const catalog = createCatalogService({ resolveKey: async () => 'test-secret', fetchImpl: async (url, options) => {
    calls.push(url); assert.equal(options.headers.authorization, 'Bearer test-secret')
    return response(url.endsWith('/models') ? { data: [{ id: 'voai-voice-model' }] } : { voices: ['alice', 'bob'] })
  } })
  const config = { customBaseUrl: 'http://localhost:9999/v1/' }
  const first = await catalog.discover('custom', config)
  assert.deepEqual(first.models.map(v => v.id), ['voai-voice-model'])
  assert.deepEqual(first.voices.map(v => v.id), ['alice', 'bob'])
  assert.equal(first.sources.voices, 'live')
  assert.equal(JSON.stringify(first).includes('test-secret'), false)
  assert.equal((await catalog.discover('custom', config)).cached, true)
  assert.equal(calls.length, 2)
  await catalog.discover('custom', config, { refresh: true })
  assert.equal(calls.length, 4)
})

test('custom voice endpoint fallback is only used for missing endpoints', async () => {
  const calls = []
  const catalog = createCatalogService({ resolveKey: async () => '', fetchImpl: async url => {
    calls.push(url)
    if (url.endsWith('/audio/voices')) return new Response('', { status: 404 })
    return response(url.endsWith('/models') ? { data: ['local-model'] } : { data: [{ voice_id: 'voice-1', name: 'Alice' }] })
  } })
  const out = await catalog.discover('custom', { customBaseUrl: 'http://localhost:9999/v1' })
  assert.equal(out.voices[0].id, 'voice-1')
  assert.ok(calls.some(url => url.endsWith('/v1/voices')))
})

test('missing credentials never call upstream and presets are explicitly identified', async () => {
  const catalog = createCatalogService({ resolveKey: async () => '', fetchImpl: () => assert.fail('should not call upstream') })
  const out = await catalog.discover('openai', {})
  assert.equal(out.sources.voices, 'preset')
  assert.equal(out.warnings[0].code, 'missing_key')
  assert.ok(out.voices.length > 1)
})

test('custom endpoint does not inherit OpenAI voices or unrelated model names', async () => {
  const catalog = createCatalogService({ resolveKey: async () => 'secret', fetchImpl: async () => new Response('token secret', { status: 403 }) })
  const out = await catalog.discover('openai', { openaiBaseUrl: 'https://example.test/v1' })
  assert.deepEqual(out.voices, [])
  assert.equal(out.warnings[0].code, 'auth')
  assert.equal(JSON.stringify(out).includes('secret'), false)
})

test('ElevenLabs filters synthesis models and follows voice pagination', async () => {
  const catalog = createCatalogService({ resolveKey: async () => 'key', fetchImpl: async url => {
    if (url.endsWith('/models')) return response([{ model_id: 'speech', can_do_text_to_speech: true }, { model_id: 'transcribe', can_do_text_to_speech: false }])
    return response(url.includes('next_page_token=') ? { voices: [{ voice_id: 'b', name: 'Bob' }], has_more: false } : { voices: [{ voice_id: 'a', name: 'Alice' }], has_more: true, next_page_token: 'next' })
  } })
  const out = await catalog.discover('elevenlabs', {})
  assert.deepEqual(out.models.map(v => v.id), ['speech'])
  assert.deepEqual(out.voices.map(v => v.id), ['a', 'b'])
})

test('one failed catalog does not discard the other successful catalog', async () => {
  const catalog = createCatalogService({ resolveKey: async () => 'key', fetchImpl: async url => url.endsWith('/models') ? response([{ model_id: 'tts', can_do_text_to_speech: true }]) : new Response('', { status: 429 }) })
  const out = await catalog.discover('elevenlabs', {})
  assert.equal(out.models[0].id, 'tts')
  assert.equal(out.sources.models, 'live')
  assert.equal(out.warnings[0].code, 'rate_limit')
})

test('Google models are paginated and prefixed names are normalized', async () => {
  const catalog = createCatalogService({ resolveKey: async () => 'key', fetchImpl: async url => response(url.includes('pageToken=') ? { models: [{ name: 'models/gemini-new-tts' }] } : { models: [{ name: 'models/gemini-chat' }], nextPageToken: 'more' }) })
  const out = await catalog.discover('google', {})
  assert.deepEqual(out.models.map(v => v.id), ['gemini-new-tts'])
})

test('Azure region validation prevents malformed destinations', async () => {
  const catalog = createCatalogService({ resolveKey: async () => 'key', fetchImpl: () => assert.fail('invalid region must not be fetched') })
  const out = await catalog.discover('azure', { azureRegion: 'evil.test/path' })
  assert.equal(out.warnings[0].code, 'region')
})

test('model dependent voices are kept separate', async () => {
  const catalog = createCatalogService({ resolveKey: async () => '' })
  const out = await catalog.discover('siliconflow', {}, { model: 'FunAudioLLM/CosyVoice2-0.5B' })
  assert.ok(out.voices.every(v => v.id.startsWith('FunAudioLLM/CosyVoice2-0.5B:')))
  const legacy = await catalog.discover('openai', {}, { model: 'tts-1' })
  assert.ok(!legacy.voices.some(v => v.id === 'marin'))
})

test('normalization rejects unrelated payloads and deduplicates voice IDs', () => {
  assert.throws(() => normalizeList({ error: 'bad' }, 'voices'), { code: 'invalid_response' })
  assert.equal(normalizeList({ voices: ['a', 'a', null, { voice_id: 'b', name: 'Bee' }] }, 'voices').length, 2)
})

test('unknown provider and embedded URL credentials are rejected', async () => {
  const catalog = createCatalogService({ resolveKey: async () => '', fetchImpl: () => assert.fail('must not fetch') })
  await assert.rejects(catalog.discover('not-a-provider', {}), { code: 'provider' })
  const out = await catalog.discover('custom', { customBaseUrl: 'http://user:password@localhost/v1' })
  assert.equal(out.warnings[0].code, 'endpoint')
})
