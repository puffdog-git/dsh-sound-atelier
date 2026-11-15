import test from 'node:test'
import assert from 'node:assert/strict'
import { synthesizeDoubaoV3, readDoubaoAudio, doubaoSelection, DOUBAO_V3_URL } from '../lib/providers/doubao.js'
import { makeCloudProviders } from '../lib/providers/cloud.js'
import { makeLocalProviders } from '../lib/providers/local.js'
import { audioResult } from '../lib/providers/controls.js'

function streamed(text, size = 7) {
  const bytes = Buffer.from(text)
  return new Response(new ReadableStream({ start(c) { for (let i = 0; i < bytes.length; i += size) c.enqueue(bytes.subarray(i, i + size)); c.close() } }))
}
const packet = (bytes, code = 0) => JSON.stringify({ code, message: '成功', data: Buffer.from(bytes).toString('base64') })

test('Doubao 2.0 sends V3 API-key auth, separate mood instruction and role pitch', async () => {
  let captured
  const out = await synthesizeDoubaoV3({ cfg: { doubaoBaseUrl: 'https://openspeech.bytedance.com/api/v1/tts', roles: { reply: { instruction: '驚喜、帶笑意', tuningEnabled: true, doubaoPitch: 3 } } }, req: { text: '你來了！', models: { doubao: 'seed-tts-2.0' }, voices: {}, role: 'reply' }, key: 'test-key', fetchImpl: async (url, opts) => {
    captured = { url, ...opts, body: JSON.parse(opts.body) }
    return streamed(packet('first') + '\n' + packet('second') + '\n' + JSON.stringify({ code: 20000000 }))
  } })
  assert.equal(captured.url, DOUBAO_V3_URL)
  assert.equal(captured.headers['X-Api-Key'], 'test-key')
  assert.equal(captured.headers['X-Api-Resource-Id'], 'seed-tts-2.0')
  assert.equal(captured.body.req_params.text, '你來了！')
  assert.deepEqual(JSON.parse(captured.body.req_params.additions), { post_process: { pitch: 3 }, context_texts: ['驚喜、帶笑意'] })
  assert.equal(captured.body.app, undefined)
  assert.equal(out.audio.toString(), 'firstsecond')
})

test('Doubao reads SSE split at every byte, including UTF-8 and framing prefixes', async () => {
  const out = await readDoubaoAudio(streamed('event: audio\r\ndata: ' + packet('A') + '\r\n\r\ndata: ' + packet('B') + '\n\ndata: [DONE]\n', 1))
  assert.equal(out.toString(), 'AB')
})

test('Doubao rejects late API errors, truncated packets and cancellation instead of returning partial audio', async () => {
  await assert.rejects(readDoubaoAudio(streamed(packet('A') + '\n' + JSON.stringify({ code: 45000000, message: 'secret-key-upstream' }))), error => /45000000/.test(error.message) && !error.message.includes('secret-key'))
  await assert.rejects(readDoubaoAudio(streamed(packet('A') + '\n{"code":')), /complete packet/)
  const controller = new AbortController()
  const response = new Response(new ReadableStream({ start(c) { c.enqueue(Buffer.from(packet('A'))); setTimeout(() => controller.abort(), 5) } }))
  await assert.rejects(readDoubaoAudio(response, controller.signal), /abort/i)
})

test('legacy BV configuration selects V1 and still uses the old request contract', async () => {
  assert.deepEqual(doubaoSelection({ voice: 'BV001_streaming' }), { model: 'seed-tts-1.0', voice: 'BV001_streaming' })
  let captured
  const cfg = { doubaoKeyEnv: 'KEY', doubaoAppId: 'app-id', roles: {} }
  const providers = makeCloudProviders({ cfg, resolveKey: async () => 'test-key', fetchImpl: async (url, opts) => { captured = { url, body: JSON.parse(opts.body) }; return Response.json({ code: 3000, data: Buffer.from('legacy').toString('base64') }) } }, { text: '舊聲音', models: { doubao: 'seed-tts-1.0' }, voices: {}, role: 'reply' }, () => ({ cleanup() {} }))
  assert.equal((await providers.doubao()).audio.toString(), 'legacy')
  assert.equal(captured.body.app.appid, 'app-id')
  assert.equal(captured.body.audio.voice_type, 'BV001_streaming')
})

test('Doubao rejects incompatible cloned-voice instructions before sending a request', async () => {
  await assert.rejects(synthesizeDoubaoV3({ cfg: { doubaoInstruction: '開心' }, req: { text: '你好', models: { doubao: 'seed-icl-2.0' }, voices: { doubao: 'clone-id' } }, key: 'key', fetchImpl: () => { throw Error('should not call') } }), /cloned voices/)
})

test('native Edge retries a transient failure and preserves both errors if CLI fallback fails', async () => {
  let calls = 0
  const deps = { cfg: {}, edgeNativeSpeak: async () => { if (++calls === 1) throw Error('transient'); return { audio: Buffer.alloc(100), mime: 'audio/mpeg' } } }
  assert.equal((await makeLocalProviders(deps, { text: 'hello', models: {}, voices: {} }).edge({ nativeRetryDelayMs: 0 })).ok, true)
  assert.equal(calls, 2)
  deps.edgeNativeSpeak = async () => { throw Object.assign(Error('HTTP 403'), { status: 403 }) }
  deps.edgeSpeak = async () => { throw Error('CLI missing') }
  const failed = await makeLocalProviders(deps, { text: 'hello', models: {}, voices: {} }).edge()
  assert.match(failed.reason, /native: HTTP 403; CLI: CLI missing/)
})

test('Groq defaults use a current Orpheus model, voice and WAV output', async () => {
  let body
  const providers = makeCloudProviders({ cfg: { groqKeyEnv: 'KEY' }, resolveKey: async () => 'key', fetchImpl: async (_url, opts) => { body = JSON.parse(opts.body); return new Response(audioResult('fixture', Buffer.alloc(100), 'pcm').audio) } }, { text: 'Hello', models: {}, voices: {} }, () => ({ cleanup() {} }))
  const out = await providers.groq()
  assert.equal(body.model, 'canopylabs/orpheus-v1-english'); assert.equal(body.voice, 'hannah'); assert.equal(body.response_format, 'wav'); assert.equal(out.mime, 'audio/wav')
})
