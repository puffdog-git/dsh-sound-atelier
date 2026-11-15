import test from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { EventEmitter } from 'node:events'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { hostFixture } from './host-fixture.mjs'
import { createSpeechJobs, createPlaybackLeases } from '../lib/speech-jobs.js'
import { joinAudio } from '../lib/audio-join.js'

const sleep = ms => new Promise(r => setTimeout(r, ms))
async function waitFor(fn) { for (let i = 0; i < 150; i++) { if (await fn()) return; await sleep(20) } throw Error('Timed out') }
function wav(value = 100, length = 240) {
  const b = Buffer.alloc(44 + length * 2)
  b.write('RIFF'); b.writeUInt32LE(b.length - 8, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16)
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(24000, 24); b.writeUInt32LE(48000, 28)
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(length * 2, 40)
  for (let i = 44; i < b.length; i += 2) b.writeInt16LE(value, i)
  return b
}
const success = (provider = 'edge', value) => ({ ok: true, provider, mime: 'audio/wav', audio: wav(value) })
async function request(f, url, method = 'GET', body, onResponse) {
  const req = Readable.from(body ? [Buffer.from(JSON.stringify(body))] : [])
  Object.assign(req, { method, url, headers: { host: '127.0.0.1' }, socket: { remoteAddress: '127.0.0.1' } })
  let status = 200, data
  const res = new EventEmitter()
  res.writeHead = code => { status = code }; res.end = text => { data = JSON.parse(text) }
  onResponse?.(res)
  await f.routes.get(url.split('?')[0])(req, res)
  return { status, data }
}
const scoped = (sid, client = 'a') => '/dsh-tts/pending?sessionId=' + sid + '&clientId=' + client

test('repeated provider rows retain model, voice, style, endpoint, credential slot and options; breaker is per row', async () => {
  const calls = []
  const f = await hostFixture({ chain: [
    { provider: 'custom', model: 'bad', voice: 'first', style: 'sad', baseUrl: 'http://first/v1', keyEnv: 'FIRST_KEY', options: '{"speed":0.8}' },
    { provider: 'custom', model: 'good', voice: 'second', style: 'happy', baseUrl: 'http://second/v1', keyEnv: 'SECOND_KEY', options: '{"speed":1.2}' },
  ] }, (deps, req) => ({ custom: async () => {
    calls.push([req.models.custom, req.voices.custom, req.styles.custom, deps.cfg.customBaseUrl, deps.cfg.customKeyEnv, JSON.parse(deps.cfg.providerOptions).custom.speed])
    return req.models.custom === 'bad' ? { ok: false, reason: 'bad model', provider: 'custom' } : success('custom')
  } }))
  try {
    for (let i = 0; i < 4; i++) assert.equal((await f.tools[0].execute({ text: 'Try fallback.' }, { session: { id: 'fallback' } })).ok, true)
    assert.deepEqual(calls[0], ['bad', 'first', 'sad', 'http://first/v1', 'FIRST_KEY', .8])
    assert.deepEqual(calls[1], ['good', 'second', 'happy', 'http://second/v1', 'SECOND_KEY', 1.2])
    assert.equal(calls.filter(c => c[0] === 'bad').length, 3)
    assert.equal(calls.filter(c => c[0] === 'good').length, 4)
  } finally { f.close() }
})

test('role overrides affect only the leading attempt, not its same-provider fallback', async () => {
  const voices = []
  const f = await hostFixture({ chain: [{ provider: 'edge', voice: 'first' }, { provider: 'edge', voice: 'second' }], roles: { reply: { voice: 'role' } } }, (_deps, req) => ({ edge: async () => {
    voices.push(req.voices.edge); return req.voices.edge === 'role' ? { ok: false } : success()
  } }))
  try { assert.equal((await f.tools[0].execute({ text: 'A reply.' }, { session: { id: 'role' } })).ok, true); assert.deepEqual(voices, ['role', 'second']) }
  finally { f.close() }
})

test('voice, style, endpoint and per-entry options edits never reuse incompatible cached audio', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tts-entry-cache-')), previous = process.env.DSH_HOME
  process.env.DSH_HOME = dir
  let calls = 0
  const f = await hostFixture({ cache: true, chain: [{ provider: 'custom', model: 'fixture', voice: 'a', baseUrl: 'http://one/v1' }] }, () => ({ custom: async () => success('custom', ++calls * 100) }))
  try {
    const speak = () => f.tools[0].execute({ text: 'Cached reply.' }, { session: { id: 'cache' } })
    assert.equal((await speak()).ok, true); assert.equal((await speak()).ok, true); assert.equal(calls, 1)
    for (const [key, value] of [['voice', 'b'], ['style', 'happy'], ['baseUrl', 'http://two/v1'], ['options', '{"speed":1.2}'], ['keyEnv', 'ANOTHER_CREDENTIAL']]) {
      f.config.chain[0][key] = value; assert.equal((await speak()).ok, true)
    }
    assert.equal(calls, 6)
    await speak(); assert.equal(calls, 6)
  } finally { f.close(); if (previous === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = previous; await fs.rm(dir, { recursive: true, force: true }) }
})

test('identical text in two sessions has independent cancellation', async () => {
  const controllers = [], releases = []
  const f = await hostFixture({}, (_deps, req) => ({ edge: () => new Promise((resolve, reject) => {
    controllers.push(req.signal); releases.push(() => resolve(success()))
    req.signal.addEventListener('abort', () => reject(Error('aborted')), { once: true })
  }) }))
  const abort = new AbortController()
  try {
    const a = f.tools[0].execute({ text: 'Same reply.' }, { session: { id: 'a' }, signal: abort.signal })
    const b = f.tools[0].execute({ text: 'Same reply.' }, { session: { id: 'b' } })
    await waitFor(() => controllers.length === 2); abort.abort(); releases.forEach(fn => fn())
    assert.equal((await a).ok, false); assert.equal((await b).ok, true)
    assert.notEqual(controllers[0], controllers[1])
  } finally { releases.forEach(fn => fn()); f.close() }
})

test('pending fails closed without scope and only one window owns a session', async () => {
  const f = await hostFixture({}, () => ({ edge: async () => success() }))
  try {
    await f.tools[0].execute({ text: 'Session A.' }, { session: { id: 'a' } })
    await f.tools[0].execute({ text: 'Session B.' }, { session: { id: 'b' } })
    assert.deepEqual((await request(f, '/dsh-tts/pending')).data.items, [])
    const a = (await request(f, scoped('a'))).data
    assert.equal(a.owner, true); assert.ok(a.items.every(i => i.sessionId === 'a')); assert.equal(a.items.length, 1)
    assert.deepEqual((await request(f, scoped('a', 'other'))).data, { ok: true, owner: false, items: [] })
    assert.equal((await request(f, scoped('b', 'other'))).data.items[0].text, 'Session B.')
    await request(f, '/dsh-tts/playback', 'POST', { action: 'release', sessionId: 'a', clientId: 'a' })
    assert.equal((await request(f, scoped('a', 'other'))).data.owner, true)
  } finally { f.close() }
})

test('SSE filters by session and live ownership; a blocked session does not block others', async () => {
  let release
  const f = await hostFixture({ streamingEnabled: true }, (_deps, req) => ({ edge: () => req.text === 'Blocked.' ? new Promise(r => { release = () => r(success()) }) : Promise.resolve(success()) }))
  const chunks = []
  const req = new EventEmitter(); Object.assign(req, { method: 'GET', url: '/dsh-tts/stream?sessionId=b&clientId=reader', headers: { host: '127.0.0.1' }, socket: { remoteAddress: '127.0.0.1' } })
  const res = new EventEmitter(); res.writeHead = () => {}; res.write = p => { chunks.push(p); return true }; res.end = () => {}
  try {
    await request(f, scoped('b', 'reader'))
    await f.routes.get('/dsh-tts/stream')(req, res)
    const a = f.tools[0].execute({ text: 'Blocked.' }, { session: { id: 'a' } })
    await waitFor(() => release)
    await f.tools[0].execute({ text: 'Ready.' }, { session: { id: 'b' } })
    assert.ok(chunks.join('').includes('Ready.')); assert.ok(!chunks.join('').includes('Blocked.'))
    release(); await a
    assert.ok(!chunks.join('').includes('Blocked.'))
    await request(f, '/dsh-tts/playback', 'POST', { action: 'claim', takeover: true, sessionId: 'b', clientId: 'next' })
    await f.tools[0].execute({ text: 'New owner.' }, { session: { id: 'b' } })
    assert.ok(!chunks.join('').includes('New owner.'))
  } finally { release?.(); req.emit('close'); f.close() }
})

test('complete long reply exports every segment in order, without new provider requests', async () => {
  let calls = 0
  const f = await hostFixture({ sentenceChars: 10, longReply: 'full' }, () => ({ edge: async () => success('edge', ++calls * 100) }))
  try {
    f.events.get('session/event')({ id: 'long' }, { type: 'assistant/message', data: { text: 'First01! Second02! Third03!' } })
    f.events.get('session/event')({ id: 'long' }, { type: 'turn/end' })
    await waitFor(async () => (await f.read('/dsh-tts/pending')).items.filter(i => i.audioBase64).length === 3)
    const items = (await f.read('/dsh-tts/pending')).items
    assert.equal(new Set(items.map(i => i.jobId)).size, 1)
    const url = '/dsh-tts/job?id=' + items[0].jobId + '&sessionId=long&clientId=fixture&audio=1'
    const { status, data } = await request(f, url)
    assert.equal(status, 200); assert.equal(data.state, 'complete'); assert.equal(data.totalSegments, 3)
    assert.ok(data.text.startsWith('First01!')); assert.ok(data.text.endsWith('Third03!'))
    const audio = Buffer.from(data.audioBase64, 'base64')
    assert.equal(audio.length, 44 + 3 * 480)
    assert.equal(audio.readInt16LE(44), 100); assert.equal(audio.readInt16LE(44 + 480), 200); assert.equal(audio.readInt16LE(44 + 960), 300)
    await request(f, url); assert.equal(calls, 3)
    assert.equal((await request(f, url.replace('sessionId=long', 'sessionId=other'))).status, 404)
  } finally { f.close() }
})

test('progressive reply appends multiple messages to one ordered job and seals at turn end', async () => {
  const f = await hostFixture({ speakAsItGoes: true, sentenceChars: 10 }, () => ({ edge: async () => success() }))
  try {
    const emit = (type, text) => f.events.get('session/event')({ id: 'stream' }, { type, data: { text } })
    emit('assistant/message', 'Opening01!'); emit('assistant/message', 'Ending02!')
    await waitFor(async () => (await f.read('/dsh-tts/pending')).items.filter(i => i.audioBase64).length === 2)
    const items = (await f.read('/dsh-tts/pending')).items
    assert.equal(items[0].jobId, items[1].jobId); assert.deepEqual(items.map(i => i.sentenceIndex), [0, 1])
    const url = '/dsh-tts/job?id=' + items[0].jobId + '&sessionId=stream&clientId=fixture&audio=1'
    assert.equal((await request(f, url)).status, 409)
    emit('turn/end'); await sleep(10)
    const out = (await request(f, url)).data
    assert.equal(out.state, 'complete'); assert.equal(out.totalSegments, 2); assert.match(out.text, /Opening01![\s\S]*Ending02!$/)
  } finally { f.close() }
})

test('settings changed during a progressive reply apply to the next job, not its remaining segments', async () => {
  const voices = []
  const f = await hostFixture({ speakAsItGoes: true, sentenceChars: 10 }, (_deps, req) => ({ edge: async () => { voices.push(req.voices.edge); return success() } }))
  try {
    const emit = (type, text) => f.events.get('session/event')({ id: 'snapshot' }, { type, data: { text } })
    emit('assistant/message', 'Opening01!'); await waitFor(() => voices.length === 1)
    f.config.chain[0].voice = 'new'; f.config.speakAsItGoes = false
    emit('assistant/message', 'Ending02!'); emit('turn/end'); await waitFor(() => voices.length === 2)
    assert.deepEqual(voices, ['fixture', 'fixture'])
    const rows = (await f.read('/dsh-tts/pending')).items
    const view = await request(f, '/dsh-tts/job?id=' + rows[0].jobId + '&sessionId=snapshot&clientId=fixture')
    assert.equal(view.data.state, 'complete')
    emit('assistant/message', 'Next03!'); emit('turn/end'); await waitFor(() => voices.length === 3)
    assert.equal(voices[2], 'new')
  } finally { f.close() }
})

test('manual HTTP and tool reads use the same complete-message segmentation', async () => {
  let calls = 0
  const f = await hostFixture({ sentenceChars: 10 }, () => ({ edge: async () => success('edge', ++calls) }))
  try {
    const { status, data } = await request(f, '/dsh-tts/speak', 'POST', { channel: 'web', text: 'First01! Second02! Third03!', sessionId: 'manual', clientId: 'reader' })
    assert.equal(status, 200); assert.equal(data.totalSegments, 3); assert.equal(data.state, 'complete'); assert.equal(calls, 3)
    assert.equal(Buffer.from(data.audioBase64, 'base64').length, 44 + 3 * 480)
    assert.equal((await request(f, '/dsh-tts/job?id=' + data.jobId + '&sessionId=manual&clientId=other')).status, 404)
    assert.equal((await request(f, scoped('manual', 'reader'))).data.items.length, 0, 'HTTP speech must not also enter auto playback')
  } finally { f.close() }
})

test('a failed segment prevents full export and cancels remaining work', async () => {
  const f = await hostFixture({ sentenceChars: 10, maxQueue: 1 }, (_deps, req) => ({ edge: async () => req.text === 'Second02!' ? { ok: false, reason: 'fixture failure' } : success() }))
  try {
    const out = await f.tools[0].execute({ text: 'First01! Second02! Third03!' }, { session: { id: 'failed' } })
    assert.equal(out.ok, false)
    const items = (await f.read('/dsh-tts/pending')).items
    const exported = await request(f, '/dsh-tts/job?id=' + items[0].jobId + '&sessionId=failed&clientId=fixture&audio=1')
    assert.equal(exported.status, 409); assert.equal(exported.data.state, 'failed'); assert.equal(exported.data.audioBase64, undefined)
  } finally { f.close() }
})

test('owner cancellation rejects late provider success and does not interrupt another session', async () => {
  let release
  const f = await hostFixture({}, (_deps, req) => ({ edge: () => req.text === 'Delayed.' ? new Promise(r => { release = () => r(success()) }) : Promise.resolve(success()) }))
  try {
    const pending = f.tools[0].execute({ text: 'Delayed.' }, { session: { id: 'cancel' } })
    await waitFor(() => release)
    const items = (await request(f, scoped('cancel', 'owner'))).data.items
    const url = '/dsh-tts/job?id=' + items[0].jobId + '&sessionId=cancel&clientId='
    assert.equal((await request(f, url + 'intruder', 'DELETE')).status, 409)
    assert.equal((await request(f, url + 'owner', 'DELETE')).status, 200)
    release(); assert.equal((await pending).ok, false)
    assert.equal((await request(f, url + 'owner' + '&audio=1')).status, 409)
    assert.equal((await f.tools[0].execute({ text: 'Other reply.' }, { session: { id: 'other' } })).ok, true)
    assert.ok((await request(f, scoped('cancel', 'owner'))).data.items.every(i => !i.audioBase64))
  } finally { release?.(); f.close() }
})

test('disconnecting an HTTP caller cancels its synthesis', async () => {
  let signal, response
  const f = await hostFixture({}, (_deps, req) => ({ edge: () => new Promise((resolve, reject) => {
    signal = req.signal; signal.addEventListener('abort', () => reject(Error('aborted')), { once: true })
  }) }))
  try {
    const p = request(f, '/dsh-tts/speak', 'POST', { channel: 'web', text: 'Cancelled.' }, res => { response = res })
    await waitFor(() => signal); response.emit('close'); await p
    assert.equal(signal.aborted, true)
  } finally { f.close() }
})

test('session stop cancels jobs even before the first audio segment reaches the browser', async () => {
  let release
  const f = await hostFixture({}, () => ({ edge: () => new Promise(r => { release = () => r(success()) }) }))
  try {
    await request(f, scoped('waiting', 'owner'))
    const p = f.tools[0].execute({ text: 'Waiting.' }, { session: { id: 'waiting' } })
    await waitFor(() => release)
    assert.equal((await request(f, '/dsh-tts/playback', 'POST', { action: 'stop', sessionId: 'waiting', clientId: 'other' })).status, 409)
    const stopped = await request(f, '/dsh-tts/playback', 'POST', { action: 'stop', sessionId: 'waiting', clientId: 'owner' })
    assert.equal(stopped.data.ignoredJobs.length, 1)
    release(); assert.equal((await p).ok, false)
    assert.ok((await request(f, scoped('waiting', 'owner'))).data.items.every(i => !i.audioBase64))
  } finally { release?.(); f.close() }
})

test('playback lease expiry and explicit handoff are deterministic', () => {
  let time = 0
  const leases = createPlaybackLeases({ now: () => time, ttl: 5000 })
  assert.equal(leases.claim('a', 'one'), true); assert.equal(leases.claim('a', 'two'), false)
  assert.equal(leases.claim('b', 'two'), true); time = 5001
  assert.equal(leases.claim('a', 'two'), true); assert.equal(leases.owns('a', 'one'), false)
  leases.release('a', 'one'); assert.equal(leases.owns('a', 'two'), true)
  assert.equal(leases.claim('a', 'three', true), true); assert.equal(leases.owns('a', 'two'), false)
})

test('retained jobs expire and memory limits fail without returning partial audio', async () => {
  let time = 0
  const jobs = createSpeechJobs(async () => ({ audioBase64: wav().toString('base64'), mime: 'audio/wav' }), { maxBytes: 1000, now: () => time })
  const job = jobs.start({ sessionId: 's', text: 'Small.', cfg: {} }); await job.promise
  assert.equal(job.state, 'complete'); time = 31 * 60000; assert.equal(jobs.get(job.id, 's'), null)
  const tooLarge = jobs.start({ sessionId: 's', text: 'One sentence. Another sentence.', cfg: { sentenceChars: 15 } }); await tooLarge.promise
  assert.equal(tooLarge.state, 'failed'); await assert.rejects(jobs.audio(tooLarge), /failed/)
  jobs.close()
})

test('joining audio rejects corrupt segments and cancellation instead of producing a partial file', async () => {
  const valid = { audioBase64: wav().toString('base64'), mime: 'audio/wav' }
  await assert.rejects(joinAudio([valid, { audioBase64: Buffer.from('invalid audio').toString('base64'), mime: 'audio/mpeg' }]), /decode/)
  const controller = new AbortController(); controller.abort()
  await assert.rejects(joinAudio([valid, valid], controller.signal))
})
