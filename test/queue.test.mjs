import test from 'node:test'
import assert from 'node:assert/strict'
import { hostFixture } from './host-fixture.mjs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
async function waitFor(fn) { for (let i = 0; i < 200; i++) { if (await fn()) return; await delay(20) } throw Error('Timed out waiting for synthesis') }
const success = () => ({ ok: true, provider: 'edge', audio: Buffer.alloc(100), mime: 'audio/mpeg' })

test('SiliconFlow reference mode, transcript and file edits isolate in-flight synthesis', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tts-sf-cache-')), file = path.join(dir, 'reference.wav')
  await fs.writeFile(file, Buffer.alloc(100))
  let count = 0; const releases = [], jobs = []
  const fixture = await hostFixture({ chain: [{ provider: 'siliconflow' }], siliconflowVoiceMode: 'preset', siliconflowReferencePath: file, siliconflowReferenceText: 'first' }, () => ({ siliconflow: () => { count++; return new Promise(resolve => releases.push(() => resolve({ ...success(), provider: 'siliconflow' }))) } }))
  const submit = () => jobs.push(fixture.tools[0].execute({ text: 'Same words.' }, { session: { id: 'sf-reference' } }))
  try {
    submit(); await waitFor(() => count === 1)
    fixture.config.siliconflowVoiceMode = 'reference'; submit(); await waitFor(() => count === 2)
    fixture.config.siliconflowReferenceText = 'second'; submit(); await waitFor(() => count === 3)
    await fs.writeFile(file, Buffer.alloc(120)); submit(); await waitFor(() => count === 4)
    releases.forEach(f => f()); assert.ok((await Promise.all(jobs)).every(r => r.ok))
  } finally { releases.forEach(f => f()); fixture.close(); await fs.rm(dir, { recursive: true, force: true }) }
})

test('a twelve-sentence reply retains its beginning with the default eight-slot budget', async () => {
  const fixture = await hostFixture({ sentenceChars: 10 }, () => ({ edge: async () => { await delay(5); return success() } }))
  try {
    fixture.events.get('session/event')({ id: 'queue' }, { type: 'assistant/message', data: { text: Array.from({ length: 12 }, (_, i) => `Item${String(i + 1).padStart(2, '0')}!`).join(' ') } })
    await waitFor(async () => (await fixture.read('/dsh-tts/pending')).items.filter(p => p.audioBase64).length === 12)
    const rows = (await fixture.read('/dsh-tts/pending')).items
    assert.equal(rows[0].text, 'Item01!'); assert.equal(rows.at(-1).text, 'Item12!')
  } finally { fixture.close() }
})

test('waiting sentences do not use up their synthesis timeout before a slot opens', async () => {
  const fixture = await hostFixture({ maxQueue: 1, sentenceChars: 10, timeoutMs: 1000 }, (_deps, req) => ({ edge: async () => {
    await new Promise((resolve, reject) => { const timer = setTimeout(resolve, 600); req.signal.addEventListener('abort', () => { clearTimeout(timer); reject(Error('aborted')) }, { once: true }) })
    return success()
  } }))
  try {
    fixture.events.get('session/event')({ id: 'slow' }, { type: 'assistant/message', data: { text: 'First01! Second02! Third03!' } })
    await waitFor(async () => (await fixture.read('/dsh-tts/pending')).items.filter(p => p.audioBase64).length === 3)
    assert.equal((await fixture.read('/dsh-tts/pending')).items.some(p => p.error), false)
  } finally { fixture.close() }
})

test('changing Doubao mood does not deduplicate an in-flight synthesis with different instructions', async () => {
  let count = 0
  const releases = []
  const fixture = await hostFixture({ chain: [{ provider: 'doubao', model: 'seed-tts-2.0' }], doubaoInstruction: 'excited' }, () => ({ doubao: () => { count++; return new Promise(resolve => releases.push(() => resolve({ ...success(), provider: 'doubao' }))) } }))
  try {
    const first = fixture.tools[0].execute({ text: 'Same words.' }, { session: { id: 'mood' } })
    await waitFor(() => count === 1)
    fixture.config.doubaoInstruction = 'sad'
    const second = fixture.tools[0].execute({ text: 'Same words.' }, { session: { id: 'mood' } })
    await waitFor(() => count === 2)
    releases.forEach(release => release())
    assert.equal((await first).ok, true); assert.equal((await second).ok, true)
  } finally { releases.forEach(release => release()); fixture.close() }
})

test('new global mood and provider controls never reuse an incompatible in-flight request', async () => {
  let count = 0; const releases = []
  const fixture = await hostFixture({ chain: [{ provider: 'openai', model: 'gpt-4o-mini-tts' }], speechInstruction: 'excited', providerOptions: '{}' }, () => ({ openai: () => { count++; return new Promise(resolve => releases.push(() => resolve({ ...success(), provider: 'openai' }))) } }))
  try {
    const jobs = [fixture.tools[0].execute({ text: 'Same words.' }, { session: { id: 'controls' } })]
    await waitFor(() => count === 1)
    fixture.config.speechInstruction = 'sad'
    jobs.push(fixture.tools[0].execute({ text: 'Same words.' }, { session: { id: 'controls' } }))
    await waitFor(() => count === 2)
    fixture.config.providerOptions = '{"openai":{"speed":1.2}}'
    jobs.push(fixture.tools[0].execute({ text: 'Same words.' }, { session: { id: 'controls' } }))
    await waitFor(() => count === 3)
    releases.forEach(release => release()); assert.ok((await Promise.all(jobs)).every(r => r.ok))
  } finally { releases.forEach(release => release()); fixture.close() }
})

test('editing the CosyVoice reference file separates in-flight requests using the same path', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tts-ref-fingerprint-')), file = path.join(dir, 'reference.wav')
  await fs.writeFile(file, Buffer.alloc(100))
  let count = 0; const releases = []
  const fixture = await hostFixture({ chain: [{ provider: 'cosyvoice' }], cosyvoiceReferencePath: file }, () => ({ cosyvoice: () => { count++; return new Promise(resolve => releases.push(() => resolve({ ...success(), provider: 'cosyvoice' }))) } }))
  try {
    const first = fixture.tools[0].execute({ text: 'Same reference path.' }, { session: { id: 'reference' } })
    await waitFor(() => count === 1); await fs.writeFile(file, Buffer.alloc(120))
    const second = fixture.tools[0].execute({ text: 'Same reference path.' }, { session: { id: 'reference' } })
    await waitFor(() => count === 2); releases.forEach(release => release()); assert.equal((await first).ok, true); assert.equal((await second).ok, true)
  } finally { releases.forEach(release => release()); fixture.close(); await fs.rm(dir, { recursive: true, force: true }) }
})

test('Groq Arabic default voice is selected by the host, including role model overrides', async () => {
  for (const config of [{ chain: [{ provider: 'groq', model: 'canopylabs/orpheus-arabic-saudi' }] }, { chain: [{ provider: 'groq' }], roles: { reply: { model: 'canopylabs/orpheus-arabic-saudi' } } }]) {
    let request
    const fixture = await hostFixture(config, (_deps, req) => ({ groq: async () => { request = req; return { ...success(), provider: 'groq' } } }))
    try { assert.equal((await fixture.tools[0].execute({ text: 'Voice defaults.' }, { session: { id: 'voice-defaults' } })).ok, true); assert.equal(request.voices.groq, 'fahad') }
    finally { fixture.close() }
  }
})

test('DeepInfra Qwen host default uses Vivian instead of the Kokoro default voice', async () => {
  let request
  const fixture = await hostFixture({ chain: [{ provider: 'deepinfra', model: 'Qwen/Qwen3-TTS' }] }, (_deps, req) => ({ deepinfra: async () => { request = req; return { ...success(), provider: 'deepinfra' } } }))
  try { assert.equal((await fixture.tools[0].execute({ text: 'New model voice.' }, { session: { id: 'qwen' } })).ok, true); assert.equal(request.voices.deepinfra, 'Vivian') }
  finally { fixture.close() }
})

test('MiMo reference edits and DeepInfra voice design changes separate in-flight synthesis', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tts-stage4-cache-')), file = path.join(dir, 'reference.wav')
  await fs.writeFile(file, Buffer.alloc(100))
  try {
    for (const provider of ['mimo', 'deepinfra']) {
      let count = 0; const releases = []
      const fixture = await hostFixture({ chain: [{ provider, model: provider === 'mimo' ? 'mimo-v2.5-tts-voiceclone' : 'Qwen/Qwen3-TTS-VoiceDesign' }], mimoReferencePath: file, deepinfraVoiceDesign: 'low male' }, () => ({ [provider]: () => { count++; return new Promise(resolve => releases.push(() => resolve({ ...success(), provider }))) } }))
      try {
        const first = fixture.tools[0].execute({ text: 'Same text, different voice.' }, { session: { id: 'cache' } }); await waitFor(() => count === 1)
        if (provider === 'mimo') await fs.writeFile(file, Buffer.alloc(120)); else fixture.config.deepinfraVoiceDesign = 'bright female'
        const second = fixture.tools[0].execute({ text: 'Same text, different voice.' }, { session: { id: 'cache' } }); await waitFor(() => count === 2)
        releases.forEach(release => release()); assert.equal((await first).ok, true); assert.equal((await second).ok, true)
      } finally { releases.forEach(release => release()); fixture.close() }
    }
  } finally { await fs.rm(dir, { recursive: true, force: true }) }
})
