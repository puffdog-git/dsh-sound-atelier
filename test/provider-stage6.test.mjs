import test from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { PollyClient } from '@aws-sdk/client-polly'
import { makeCloudProviders } from '../lib/providers/cloud.js'
import { makeProviders } from '../lib/providers.js'
import { audioResult, providerOptions } from '../lib/providers/controls.js'
import { createCatalogService } from '../lib/catalog.js'
import { DEFAULT_KEY_ENV, needsApiKey, pendingKeyWrites, publicConfig } from '../lib/keys.js'
import { DEFAULT_MODELS, DEFAULT_VOICES } from '../lib/providers/constants.js'
import { pollyCredentials } from '../lib/providers/polly.js'
import { googleCloudHeaders } from '../lib/providers/google-cloud.js'
import { decodeAudio, nativeAudio } from '../lib/providers/native-http.js'
import { hostFixture } from './host-fixture.mjs'

const pcm = Buffer.alloc(2400), wav = audioResult('fixture', pcm, 'pcm').audio
const awsKey = JSON.stringify({ accessKeyId: 'AKIDEXAMPLE1234567890', secretAccessKey: 'fixture-secret', sessionToken: 'fixture-session' })
const googleKey = suffix => JSON.stringify({ type: 'service_account', client_email: 'fixture@tts-test.iam.gserviceaccount.com', private_key: '-----BEGIN PRIVATE KEY-----' + suffix, token_uri: 'https://evil.invalid/token' })
const native = ['fish', 'cartesia', 'dashscope', 'polly', 'inworld', 'google-cloud']

test('native audio rejects JSON disguised as compressed audio and accepts known container headers', () => {
  for (const format of ['mp3', 'opus', 'wav']) assert.throws(() => nativeAudio('fixture', Buffer.from('{"error":"SECRET"}'), format), e => !e.message.includes('SECRET'))
  assert.equal(nativeAudio('fixture', Buffer.from('ID3fixture'), 'mp3').mime, 'audio/mpeg')
  assert.equal(nativeAudio('fixture', Buffer.from('OggSfixture'), 'opus').mime, 'audio/ogg')
})
function fixture(provider, { cfg = {}, options = {}, mood = '', voice, response, fetchImpl, clientFactory, authFactory } = {}) {
  const calls = []; let cleaned = 0
  const config = { timeoutMs: 1000, dashscopeWorkspace: 'workspace-test', dashscopeRegion: 'cn-beijing', speechInstruction: mood, providerOptions: JSON.stringify({ [provider]: { format: 'wav', ...options } }), ...cfg }
  const req = { text: 'Hello world.', lang: 'en-US', role: 'reply', models: { [provider]: DEFAULT_MODELS[provider] }, voices: { [provider]: voice ?? DEFAULT_VOICES[provider] } }
  const providers = makeCloudProviders({ cfg: config,
    resolveKey: async () => provider === 'polly' ? awsKey : provider === 'google-cloud' ? googleKey(provider + Math.random()) : 'fixture-key',
    pollyClientFactory: clientFactory || (() => ({ send: async command => { calls.push({ command }); return { AudioStream: Readable.from([pcm]) } }, destroy() {} })),
    googleAuthFactory: authFactory || (() => ({ authorize: async () => ({ access_token: 'fixture-access', expiry_date: Date.now() + 3600000 }) })),
    fetchImpl: async (url, opts = {}) => {
      calls.push({ url, opts, body: opts.body ? JSON.parse(opts.body) : undefined })
      if (fetchImpl) return fetchImpl(url, opts)
      if (response) return response()
      if (provider === 'inworld' || provider === 'google-cloud') return Response.json({ audioContent: wav.toString('base64') })
      if (provider === 'dashscope' && opts.method === 'POST') return Response.json({ output: { finish_reason: 'stop', audio: { url: 'https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/audio.wav?signature=fixture' } } })
      return new Response(wav, { headers: { 'content-type': 'audio/wav' } })
    },
  }, req, () => ({ signal: new AbortController().signal, cleanup() { cleaned++ } }))
  return { run: () => providers[provider](), calls, config, req, cleaned: () => cleaned }
}

for (const provider of native) test(provider + ': native synthesis returns WAV and clears timeout', async () => {
  const f = fixture(provider, { voice: provider === 'fish' ? 'voice-fixture' : undefined, mood: ['fish', 'inworld', 'dashscope'].includes(provider) ? 'warm and excited' : '' })
  const out = await f.run()
  assert.equal(out.ok, true); assert.equal(out.provider, provider); assert.equal(out.mime, 'audio/wav'); assert.equal(out.audio.toString('ascii', 0, 4), 'RIFF'); assert.equal(f.cleaned(), 1)
  if (provider === 'fish') {
    assert.equal(f.calls[0].url, 'https://api.fish.audio/v1/tts'); assert.equal(f.calls[0].opts.headers.model, 's2.1-pro-free')
    assert.equal(f.calls[0].body.reference_id, 'voice-fixture'); assert.equal(f.calls[0].body.text, '[warm and excited] Hello world.')
  } else if (provider === 'cartesia') {
    assert.equal(f.calls[0].body.voice, DEFAULT_VOICES.cartesia); assert.equal(f.calls[0].body.transcript, 'Hello world.'); assert.equal(f.calls[0].opts.headers['Cartesia-Version'], '2026-08-14')
  } else if (provider === 'inworld') {
    assert.equal(f.calls[0].opts.headers.authorization, 'Basic fixture-key'); assert.equal(f.calls[0].body.modelId, 'inworld-tts-2'); assert.equal(f.calls[0].body.audioConfig.audioEncoding, 'LINEAR16')
  } else if (provider === 'dashscope') {
    assert.ok(f.calls[0].url.startsWith('https://workspace-test.cn-beijing.maas.aliyuncs.com/'))
    assert.equal(f.calls[0].body.input.text, 'Hello world.'); assert.equal(f.calls[0].body.input.instruction, 'warm and excited')
    assert.equal(f.calls[1].opts.headers, undefined); assert.equal(f.calls[1].opts.redirect, 'error')
  } else if (provider === 'polly') {
    assert.equal(f.calls[0].command.input.Engine, 'neural'); assert.equal(f.calls[0].command.input.OutputFormat, 'pcm')
  } else { assert.equal(f.calls[0].opts.headers.authorization, 'Bearer fixture-access'); assert.equal(f.calls[0].body.voice.languageCode, 'cmn-TW') }
})

test('native options validate and map supported fields; Cartesia refuses non-English emotions', async () => {
  const fish = fixture('fish', { voice: 'id', options: { speed: 1.2, volume: 2, temperature: .5, topP: .8 } }); await fish.run()
  assert.equal(fish.calls[0].body.prosody.speed, 1.2); assert.equal(fish.calls[0].body.top_p, .8)
  const cartesia = fixture('cartesia', { options: { emotion: 'sad', language: 'en', speed: .9, volume: 1.2 } }); await cartesia.run()
  assert.equal(cartesia.calls[0].body.generation_config.emotion, 'sad')
  await assert.rejects(fixture('cartesia', { options: { emotion: 'sad', language: 'zh' } }).run(), /English only/)
  for (const [provider, options] of [['cartesia', { speed: 3 }], ['fish', { temperature: 3 }], ['inworld', { sampleRate: 24000.5 }], ['dashscope', { sampleRate: 12345 }], ['polly', { secretAccessKey: 'never' }], ['google-cloud', { pitch: 30 }]]) assert.throws(() => providerOptions({ providerOptions: JSON.stringify({ [provider]: options }) }, provider))
})

test('missing Fish voice, invalid workspace, oversize input and incompatible PCM rates reject before requests', async () => {
  const fish = fixture('fish'); await assert.rejects(fish.run(), /voice model ID/); assert.equal(fish.calls.length, 0)
  const dash = fixture('dashscope', { cfg: { dashscopeWorkspace: 'secret@evil' } }); await assert.rejects(dash.run(), /workspace ID/); assert.equal(dash.calls.length, 0)
  const polly = fixture('polly', { options: { sampleRate: 24000 } }); await assert.rejects(polly.run(), /sampleRate/); assert.equal(polly.calls.length, 0)
  const g = fixture('google-cloud'); g.req.text = '中'.repeat(1700); await assert.rejects(g.run(), /5000 UTF-8/); assert.equal(g.calls.length, 0)
  const i = fixture('inworld', { mood: 'happy' }); i.req.text = 'a'.repeat(1999); await assert.rejects(i.run(), /2000/); assert.equal(i.calls.length, 0)
})

test('DashScope rejects unfinished synthesis and unsafe result URLs without forwarding credentials', async () => {
  for (const payload of [
    { code: 'error', message: 'SECRET' },
    { output: { finish_reason: 'length', audio: { url: 'https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/a.wav' } } },
    ...['https://127.0.0.1/a', 'https://evil.invalid/audio', 'https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com.evil.invalid/a', 'https://user:secret@dashscope-result-bj.oss-cn-beijing.aliyuncs.com/a'].map(url => ({ output: { finish_reason: 'stop', audio: { url } } })),
  ]) {
    const f = fixture('dashscope', { response: () => Response.json(payload) })
    await assert.rejects(f.run(), e => !e.message.includes('SECRET')); assert.equal(f.calls.length, 1); assert.equal(f.cleaned(), 1)
  }
})

test('native HTTP errors never leak upstream text and malformed audio is refused', async () => {
  for (const p of ['fish', 'cartesia', 'dashscope', 'inworld', 'google-cloud']) {
    const f = fixture(p, { voice: p === 'fish' ? 'id' : undefined, response: () => new Response('SECRET', { status: 403 }) })
    await assert.rejects(f.run(), e => e.status === 403 && !e.message.includes('SECRET')); assert.equal(f.cleaned(), 1)
  }
  await assert.rejects(fixture('fish', { voice: 'id', response: () => Response.json({ error: 'SECRET' }) }).run(), /expected audio/)
  await assert.rejects(fixture('inworld', { response: () => Response.json({ audioContent: 'https://evil.invalid' }) }).run(), /base64/)
  await assert.rejects(fixture('cartesia', { response: () => new Response(Buffer.from('RIFF')) }).run(), /WAV/)
  for (const value of ['', '!!!!', 'Zh==', 'https://evil.invalid']) assert.throws(() => decodeAudio('fixture', value))
})

test('Polly uses real AWS SDK SigV4 with temporary credentials and a single attempt', async () => {
  let request, destroyed = false
  const f = fixture('polly', { clientFactory: options => {
    assert.equal(options.maxAttempts, 1)
    return new PollyClient({ ...options, requestHandler: { handle: async req => {
      request = req
      return { response: { statusCode: 200, headers: { 'content-type': 'audio/pcm' }, body: Readable.from([pcm]) } }
    }, destroy() { destroyed = true } } })
  } })
  assert.equal((await f.run()).ok, true)
  assert.match(request.headers.authorization, /^AWS4-HMAC-SHA256 /); assert.equal(request.headers['x-amz-security-token'], 'fixture-session'); assert.equal(request.hostname, 'polly.us-east-1.amazonaws.com'); assert.equal(destroyed, true)
  assert.throws(() => pollyCredentials('not JSON'), /credentials JSON/)
})

test('Google uses restricted known service-account fields, caches valid tokens and honors cancellation', async () => {
  let seen, authorizations = 0
  const key = googleKey('unique-google-auth'), factory = options => { seen = options; return { authorize: async () => { authorizations++; return { access_token: 'test-token', expiry_date: Date.now() + 3600000 } } } }
  assert.equal((await googleCloudHeaders(key, undefined, factory)).authorization, 'Bearer test-token')
  await googleCloudHeaders(key, undefined, factory); assert.equal(authorizations, 1)
  assert.equal(seen.token_uri, undefined); assert.deepEqual(seen.scopes, ['https://www.googleapis.com/auth/cloud-platform'])
  await assert.rejects(googleCloudHeaders('GEMINI_KEY', undefined, factory), /service-account/)
  const controller = new AbortController(); controller.abort()
  await assert.rejects(googleCloudHeaders(key, controller.signal, factory), { name: 'AbortError' })
})

test('all six providers use credential storage and keep secrets out of public settings', () => {
  for (const provider of native) { assert.equal(needsApiKey(provider), true); assert.ok(DEFAULT_KEY_ENV[provider]); assert.deepEqual(pendingKeyWrites({ [provider]: 'fixture-secret' }), [{ provider, value: 'fixture-secret' }]) }
  assert.equal(JSON.stringify(publicConfig({ keys: { polly: awsKey, 'google-cloud': googleKey('private') } })).includes('fixture-secret'), false)
})

test('new voice catalogs normalize and paginate actual provider formats', async () => {
  const calls = []
  const c = createCatalogService({ resolveKey: async () => 'fixture-key', fetchImpl: async (url, opts) => {
    calls.push(url)
    if (url.includes('cartesia')) return Response.json(url.includes('starting_after=') ? { data: [{ id: 'second', name: 'Two' }], has_more: false } : { data: [{ id: 'first', name: 'One' }], has_more: true, next_page: 'first' })
    if (url.includes('inworld')) { assert.equal(opts.headers.authorization, 'Basic fixture-key'); return Response.json(url.includes('pageToken=') ? { voices: [{ voiceId: 'b', displayName: 'B' }] } : { voices: [{ voiceId: 'a', displayName: 'A' }], nextPageToken: 'next' }) }
    return Response.json({ items: [{ _id: url.includes('self=true') ? 'own' : 'licensed', title: 'Voice', type: 'tts', languages: ['zh'] }], total: 1 })
  } })
  assert.deepEqual((await c.discover('cartesia', {})).voices.map(v => v.id), ['first', 'second'])
  assert.deepEqual((await c.discover('inworld', {})).voices.map(v => v.id), ['a', 'b'])
  assert.deepEqual((await c.discover('fish', {})).voices.map(v => v.id), ['own', 'licensed'])
  assert.equal(calls.length, 6)
  const dash = await c.discover('dashscope', {}); assert.equal(dash.sources.voices, 'preset')
})

test('Polly/Google catalog uses native auth and emits only safe voice metadata', async () => {
  const c = createCatalogService({ resolveKey: async ref => ref === DEFAULT_KEY_ENV.polly ? awsKey : googleKey('catalog'),
    pollyClientFactory: () => ({ send: async command => { assert.equal(command.input.Engine, 'neural'); return { Voices: [{ Id: 'Joanna', Name: 'Joanna', LanguageCode: 'en-US', SupportedEngines: ['neural'] }] } }, destroy() {} }),
    googleAuthFactory: () => ({ authorize: async () => ({ access_token: 'fixture-access', expiry_date: Date.now() + 3600000 }) }),
    fetchImpl: async (_, opts) => { assert.equal(opts.headers.authorization, 'Bearer fixture-access'); return Response.json({ voices: [{ name: 'cmn-TW-Standard-A', languageCodes: ['cmn-TW'], ssmlGender: 'FEMALE' }] }) },
  })
  for (const provider of ['polly', 'google-cloud']) { const out = await c.discover(provider, {}); assert.equal(out.sources.voices, 'live'); assert.equal(out.voices.length, 1); assert.equal(JSON.stringify(out).includes('fixture-access'), false) }
})

test('DashScope workspace and Polly region changes isolate in-flight requests', async () => {
  for (const [provider, field, firstValue, secondValue] of [['dashscope', 'dashscopeWorkspace', 'one', 'two'], ['polly', 'pollyRegion', 'us-east-1', 'ap-northeast-1']]) {
    let count = 0; const releases = []
    const f = await hostFixture({ chain: [{ provider }], [field]: firstValue }, () => ({ [provider]: () => { count++; return new Promise(resolve => releases.push(() => resolve({ ok: true, provider, audio: wav, mime: 'audio/wav' }))) } }))
    try {
      const a = f.tools[0].execute({ text: 'Cache isolation.' }, { session: { id: 'native' } })
      for (let i = 0; !count && i < 100; i++) await new Promise(r => setTimeout(r, 10))
      f.config[field] = secondValue
      const b = f.tools[0].execute({ text: 'Cache isolation.' }, { session: { id: 'native' } })
      for (let i = 0; count < 2 && i < 100; i++) await new Promise(r => setTimeout(r, 10))
      assert.equal(count, 2); releases.forEach(r => r()); assert.ok((await Promise.all([a, b])).every(x => x.ok))
    } finally { releases.forEach(r => r()); f.close() }
  }
})

test('all six native providers abort pending work without starting further requests', async () => {
  for (const provider of native) {
    const controller = new AbortController(); let started = 0, destroyed = false
    const wait = signal => new Promise((_, reject) => { started++; signal.addEventListener('abort', () => reject(signal.reason), { once: true }); if (signal.aborted) reject(signal.reason) })
    const providers = makeProviders({ cfg: { timeoutMs: 5000, dashscopeWorkspace: 'test-workspace' },
      resolveKey: async () => provider === 'polly' ? awsKey : provider === 'google-cloud' ? googleKey('abort-' + Math.random()) : 'fixture',
      fetchImpl: async (_, opts) => wait(opts.signal),
      pollyClientFactory: () => ({ send: async (_, opts) => wait(opts.abortSignal), destroy() { destroyed = true } }),
      googleAuthFactory: options => ({ authorize: async () => wait(options.transporterOptions.signal) }),
    }, { text: 'Cancel me.', lang: 'en-US', models: {}, voices: { fish: 'voice-id' }, signal: controller.signal })
    const pending = providers[provider]()
    for (let i = 0; !started && i < 100; i++) await new Promise(r => setTimeout(r, 5))
    controller.abort(Error('fixture cancelled'))
    await assert.rejects(pending, /fixture cancelled/)
    assert.equal(started, 1)
    if (provider === 'polly') assert.equal(destroyed, true)
  }
})

test('DashScope 3.0 catalog and implicit host defaults select voices for that model', async () => {
  const c = createCatalogService({ resolveKey: async () => '' })
  const out = await c.discover('dashscope', {}, { model: 'qwen-audio-3.0-tts-plus' })
  assert.equal(out.voices[0].id, 'longanlingxin'); assert.ok(out.voices.every(v => !v.id.endsWith('_v3.1')))
  for (const config of [{ chain: [{ provider: 'dashscope', model: 'qwen-audio-3.0-tts-flash' }] }, { chain: [{ provider: 'dashscope' }], roles: { reply: { model: 'qwen-audio-3.0-tts-flash' } } }]) {
    let voice
    const f = await hostFixture(config, (_deps, req) => ({ dashscope: async () => { voice = req.voices.dashscope; return { ok: true, provider: 'dashscope', audio: wav, mime: 'audio/wav' } } }))
    try { assert.equal((await f.tools[0].execute({ text: 'Default voice.' }, { session: { id: 'dash-default' } })).ok, true); assert.equal(voice, 'longanfengyue') }
    finally { f.close() }
  }
})
