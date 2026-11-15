import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { synthesizeSiliconFlow } from '../lib/providers/siliconflow.js'
import { audioResult } from '../lib/providers/controls.js'
import { makeCloudProviders } from '../lib/providers/cloud.js'
const wav = seconds => audioResult('fixture', Buffer.alloc(24000 * 2 * seconds), 'pcm').audio
const req = { text: '今天終於成功了。', role: 'reply', models: { siliconflow: 'FunAudioLLM/CosyVoice2-0.5B' }, voices: { siliconflow: 'selected-voice' } }

test('SiliconFlow reference replaces voice, retains transcript and mood, and uses bounded WAV output', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sf-ref-')), file = path.join(dir, 'sample.wav')
  await fs.writeFile(file, wav(1))
  try {
    let sent
    const out = await synthesizeSiliconFlow({ cfg: { siliconflowVoiceMode: 'reference', siliconflowReferencePath: file, siliconflowReferenceText: '這是參考錄音。', speechInstruction: '開心，帶笑意', providerOptions: '{"siliconflow":{"format":"wav","speed":0.9,"gain":2}}' }, req, key: 'fixture', fetchImpl: async (url, options) => {
      assert.equal(url, 'https://api.siliconflow.cn/v1/audio/speech'); assert.equal(options.redirect, 'error')
      assert.equal(options.headers.authorization, 'Bearer fixture'); sent = JSON.parse(options.body)
      return new Response(wav(1), { headers: { 'content-type': 'audio/wav' } })
    } })
    assert.equal(out.ok, true); assert.equal(out.mime, 'audio/wav')
    assert.equal(sent.voice, undefined); assert.equal(sent.references.length, 1)
    assert.equal(sent.references[0].text, '這是參考錄音。')
    assert.deepEqual(Buffer.from(sent.references[0].audio.split(',')[1], 'base64'), wav(1))
    assert.equal(sent.input, '開心，帶笑意<|endofprompt|>' + req.text)
    assert.equal(sent.speed, .9); assert.equal(sent.gain, 2); assert.equal(sent.sample_rate, 24000)
  } finally { await fs.rm(dir, { recursive: true, force: true }) }
})

test('SiliconFlow refuses incomplete, remote, oversized-duration and incompatible reference settings before HTTP', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sf-invalid-')), file = path.join(dir, 'sample.wav')
  const base = { siliconflowVoiceMode: 'reference', siliconflowReferencePath: file, siliconflowReferenceText: '逐字稿' }
  const run = (cfg, request = req) => synthesizeSiliconFlow({ cfg, req: request, key: 'fixture', fetchImpl: () => assert.fail('must reject before network') })
  try {
    await fs.writeFile(file, wav(30))
    await assert.rejects(run(base), /shorter than 30/)
    await assert.rejects(run({ ...base, siliconflowReferenceText: '' }), /transcript/)
    await assert.rejects(run({ ...base, siliconflowReferenceText: '字'.repeat(2001) }), /transcript/)
    await assert.rejects(run({ ...base, siliconflowReferencePath: 'https://example.com/a.wav' }), /absolute local/)
    await assert.rejects(run(base, { ...req, models: { siliconflow: 'fnlp/MOSS-TTSD-v0.5' } }), /currently supports/)
    await fs.writeFile(file, Buffer.alloc(100))
    await assert.rejects(run(base), /PCM WAV/)
    const malformed = wav(1); malformed.writeUInt32LE(1, 28); await fs.writeFile(file, malformed)
    await assert.rejects(run(base), /byte rate/)
  } finally { await fs.rm(dir, { recursive: true, force: true }) }
})

test('SiliconFlow normal mode preserves voice; rejects JSON, truncated WAV, invalid rates and oversized bodies', async () => {
  let sent
  const cfg = { siliconflowVoiceMode: 'preset', siliconflowReferencePath: 'unused', providerOptions: '{}' }
  await synthesizeSiliconFlow({ cfg, req, key: 'fixture', fetchImpl: async (_, o) => { sent = JSON.parse(o.body); return new Response(Buffer.from('MP3')) } })
  assert.equal(sent.voice, 'selected-voice'); assert.equal(sent.references, undefined)
  for (const [config, response, pattern] of [
    [cfg, Response.json({ message: 'not audio' }), /non-audio/],
    [{ providerOptions: '{"siliconflow":{"format":"wav"}}' }, new Response(Buffer.from('RIFF')), /Invalid WAV/],
    [cfg, new Response('', { headers: { 'content-length': String(33 * 1024 * 1024) } }), /size limit/],
    [{ providerOptions: '{"siliconflow":{"format":"opus","sampleRate":24000}}' }, null, /sampleRate/],
  ]) await assert.rejects(synthesizeSiliconFlow({ cfg: config, req, key: 'fixture', fetchImpl: async () => { assert.ok(response); return response } }), pattern)
})

test('SiliconFlow cloud dispatch cleans its timeout after failure and observes cancellation', async () => {
  let cleaned = 0
  const providers = makeCloudProviders({ cfg: {}, resolveKey: async () => 'fixture', fetchImpl: async () => new Response('', { status: 403 }) }, req, () => ({ cleanup() { cleaned++ } }))
  await assert.rejects(providers.siliconflow(), /HTTP 403/); assert.equal(cleaned, 1)
  const c = new AbortController(); c.abort()
  await assert.rejects(synthesizeSiliconFlow({ cfg: {}, req, key: 'fixture', signal: c.signal, fetchImpl: () => assert.fail('cancelled') }), { name: 'AbortError' })
})
