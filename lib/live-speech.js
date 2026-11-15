import { randomUUID } from 'node:crypto'
import { chainCandidates } from './candidates.js'
import { providerCapabilities } from './capabilities.js'
import { textChannel } from './text-channel.js'

export function liveSpeechConfig(cfg, role = 'reply') {
  if(cfg.rvcEnabled)throw Error('RVC requires completed audio before conversion; use segmented speech jobs instead of raw PCM live sessions')
  const first = chainCandidates(cfg, role)[0]
  if (!first || !providerCapabilities(first.provider, first.model, first.voice).liveInput) throw Error('Selected model has no incremental text synthesis transport')
  const all = JSON.parse(first.cfg.providerOptions || '{}')
  const provider = first.provider
  const transport = ['google-cloud', 'polly'].includes(provider) ? 'stream' : 'websocket'
  const format = provider === 'google-cloud' ? 'wav' : 'pcm'
  const rate = provider === 'polly' ? 16000 : 24000
  return { ...first.cfg, roles: {[role]:{instruction:first.cfg.roles?.[role]?.instruction||''}}, cache: false, providerOptions: JSON.stringify({ ...all, [provider]: { ...all[provider], transport, format, ...(provider==='doubao'?{}:{sampleRate:rate}) } }), chain: [{...first.cfg.chain[0], provider, model: first.model, voice: first.voice, style: first.style,options:'' }] }
}

// Provider-neutral live sessions: callers append text and poll PCM packets. The
// complete file is exposed only after the native transport acknowledges success.
export function createLiveSpeech(synthesize, { now = Date.now, maxBytes = 64 * 1024 * 1024 } = {}) {
  const jobs = new Map()
  function prune() {
    for (const [id, job] of jobs) if (now() - job.created > 10 * 60000) { job.controller.abort(); job.input.close(); jobs.delete(id) }
  }
  function start({ sessionId, clientId, text, cfg, role = 'reply' }) {
    prune()
    if (jobs.size >= 32) throw Error('Live session limit reached')
    if (typeof text !== 'string' || !text.trim()) throw Error('Initial text is required')
    const config = liveSpeechConfig(cfg, role), controller = new AbortController()
    const input = textChannel(controller.signal); input.push(text)
    const job = { id: randomUUID(), sessionId, clientId, controller, input, state: 'running', text, frames: [], bytes: 0, created: now(), sealed: false }
    jobs.set(job.id, job)
    const timer = setTimeout(() => controller.abort(), Math.min(Number(cfg.timeoutMs) || 60000, 10 * 60000))
    job.promise = synthesize(text, config, controller.signal, 'reply', { skipClean: true, textChunks: input, onAudioChunk(bytes, metadata) {
      controller.signal.throwIfAborted()
      if (metadata?.format !== 'pcm' || !Number.isFinite(metadata.sampleRate)) throw Error('Live synthesis requires declared PCM packets')
      job.bytes += bytes.length
      if ([...jobs.values()].reduce((n, j) => n + j.bytes, 0) > maxBytes || job.frames.length >= 10000) { controller.abort(); throw Error('Live audio exceeds memory limit') }
      job.frames.push({ sequence: job.frames.length, format: 'pcm_s16le', sampleRate: metadata.sampleRate, channels: 1, audioBase64: Buffer.from(bytes).toString('base64') })
    } }).then(out => { controller.signal.throwIfAborted(); if (!job.sealed) throw Error('Provider completed before input was sealed'); job.output = out; job.state = 'complete' }).catch(() => { job.state = controller.signal.aborted ? 'cancelled' : 'failed'; job.error = 'Live synthesis did not complete; no complete audio is available' }).finally(() => { clearTimeout(timer); controller.abort(); input.close() })
    return job
  }
  function get(id, sessionId, clientId) { prune(); const job = jobs.get(id); return job?.sessionId === sessionId && job?.clientId === clientId ? job : null }
  function view(job, after = 0, audio = false) {
    if (!Number.isInteger(after) || after < 0) throw Error('Invalid live audio cursor')
    const frames = job.frames.slice(after, after + 32)
    return { id: job.id, state: job.state, error: job.error, next: after + frames.length, frames, ...(audio && job.state === 'complete' ? { mime: job.output.mime, audioBase64: job.output.audio.toString('base64'), timing: job.output.timing } : {}) }
  }
  function append(job, text) { job.input.push(text); job.text += text }
  function seal(job) { if (!job.sealed) { job.sealed = true; job.input.end() } }
  function close() { for (const j of jobs.values()) { j.controller.abort(); j.input.close() }; jobs.clear() }
  return { start, get, view, append, seal, close,release(job){job.controller.abort();job.input.close();jobs.delete(job.id)} }
}
