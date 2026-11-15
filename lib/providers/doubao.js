import { randomUUID } from 'node:crypto'
import { clamp } from '../tuning.js'
import { providerOptions, audioResult } from './controls.js'
import { createDoubaoTiming } from './doubao-timing.js'
import { synthesizeDoubaoBidirectional } from './doubao-ws.js'

export const DOUBAO_V3_URL = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional'
export const DOUBAO_V2_VOICE = 'zh_female_vv_uranus_bigtts'
const LEGACY_URL = 'https://openspeech.bytedance.com/api/v1/tts'

export function doubaoSelection(entry = {}) {
  const model = entry.model || (/^BV\d+/.test(entry.voice || '') ? 'seed-tts-1.0' : 'seed-tts-2.0')
  return { model, voice: entry.voice || (model === 'seed-tts-1.0' ? 'BV001_streaming' : model === 'seed-icl-2.0' ? '' : DOUBAO_V2_VOICE) }
}

// HTTP chunked JSON and SSE both carry JSON objects. Parse incrementally so
// split UTF-8 and transport boundaries never split or drop an audio packet.
export async function readDoubaoAudio(response, signal, onPacket) {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Doubao returned no response body')
  const decoder = new TextDecoder(), audio = []
  const onAbort = () => { void reader.cancel(signal.reason).catch(() => {}) }
  signal?.addEventListener('abort', onAbort, { once: true })
  let buffer = '', bytes = 0, wireBytes = 0, complete = false
  const consume = () => {
    for (;;) {
      buffer = buffer.replace(/^\s+/, '')
      if (!buffer) return
      if (buffer.startsWith('data:')) { buffer = buffer.slice(5).trimStart(); continue }
      if (/^(?:event|id|retry):/.test(buffer) || buffer[0] === ':') {
        const end = buffer.indexOf('\n'); if (end < 0) return
        buffer = buffer.slice(end + 1); continue
      }
      if (buffer.startsWith('[DONE]')) { complete = true; buffer = buffer.slice(6); continue }
      if (buffer[0] !== '{') {
        if (['data:', 'event:', 'id:', 'retry:', '[DONE]'].some(prefix => prefix.startsWith(buffer))) return
        throw new Error('Invalid Doubao audio response')
      }
      let depth = 0, quoted = false, escaped = false, end = -1
      for (let i = 0; i < buffer.length; i++) {
        const c = buffer[i]
        if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false }
        else if (c === '"') quoted = true
        else if (c === '{' || c === '[') depth++
        else if (c === '}' || c === ']') { depth--; if (depth === 0) { end = i + 1; break } }
      }
      if (end < 0) return
      let packet
      try { packet = JSON.parse(buffer.slice(0, end)) } catch { throw new Error('Invalid Doubao audio packet') }
      buffer = buffer.slice(end)
      if (packet.code !== undefined && packet.code !== 0 && packet.code !== 20000000) throw new Error(`Doubao API error ${Number(packet.code) || 'unknown'}`)
      if (complete && packet.data) throw new Error('Doubao audio arrived after session completion')
      if (packet.code === 20000000) complete = true
      onPacket?.(packet)
      if (packet.data) {
        if (typeof packet.data !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(packet.data)) throw new Error('Invalid Doubao audio data')
        const part = Buffer.from(packet.data, 'base64'); bytes += part.length
        if (bytes > 32 * 1024 * 1024) throw new Error('Doubao audio exceeds size limit')
        audio.push(part)
      }
    }
  }
  try {
    for (;;) {
      if (signal?.aborted) throw signal.reason || new Error('Doubao synthesis cancelled')
      const { value, done } = await reader.read()
      if (done) break
      wireBytes += value.length
      if (wireBytes > 64 * 1024 * 1024) throw new Error('Doubao response exceeds size limit')
      buffer += decoder.decode(value, { stream: true })
      if (buffer.length > 8 * 1024 * 1024) throw new Error('Doubao packet exceeds size limit')
      consume()
    }
    buffer += decoder.decode(); consume()
    if (buffer.trim()) throw new Error('Doubao response ended before a complete packet')
    if (signal?.aborted) throw signal.reason || new Error('Doubao synthesis cancelled')
    if (!complete) throw new Error('Doubao response ended before session completion')
    if (!bytes) throw new Error('Doubao returned empty audio')
    return Buffer.concat(audio)
  } finally { signal?.removeEventListener('abort', onAbort); await reader.cancel().catch(() => {}); reader.releaseLock() }
}

export async function synthesizeDoubaoV3({ cfg, req, key, fetchImpl = fetch, signal, WebSocketImpl }) {
  const { model, voice } = doubaoSelection({ model: req.models?.doubao, voice: req.voices?.doubao })
  if (!['seed-tts-2.0', 'seed-icl-2.0'].includes(model)) throw new Error('Select seed-tts-2.0 or seed-icl-2.0 for Doubao V3')
  if (!voice) throw new Error('Select a Doubao voice for this model')
  if (/^BV\d+/.test(voice)) throw new Error('Legacy Doubao BV voices require seed-tts-1.0; choose a 2.0 speaker')
  const role = cfg.roles?.[req.role] || {}
  const instruction = String(role.instruction || cfg.doubaoInstruction || '').trim().slice(0, 2000)
  if (model === 'seed-icl-2.0' && instruction) throw new Error('Doubao standard cloned voices do not support context_texts; clear the style instruction or select a 2.0 preset voice')
  const tuning = role.tuningEnabled ? role : cfg
  const additions = { post_process: { pitch: Math.round(clamp(tuning.doubaoPitch, -12, 12, 0)) }, ...(instruction ? { context_texts: [instruction] } : {}) }
  const options = providerOptions(cfg, 'doubao')
  const params = { speaker: voice, ...(model === 'seed-icl-2.0' ? { model: 'seed-tts-2.0-standard' } : {}), audio_params: { format: options.format||'mp3', sample_rate: 24000, ...(options.timestamps ? { enable_timestamp: true } : {}) }, additions: JSON.stringify(additions) }
  if (options.transport === 'websocket') return synthesizeDoubaoBidirectional({ cfg, req: { ...req, models: { ...req.models, doubao: model } }, key, params, signal, WebSocketImpl, timestamps: options.timestamps })
  const timing = createDoubaoTiming(options.timestamps)
  const configuredUrl = cfg.doubaoBaseUrl?.trim()
  const url = new URL(!configuredUrl || configuredUrl === LEGACY_URL ? DOUBAO_V3_URL : configuredUrl)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash || url.search) throw new Error('Invalid Doubao API address')
  const response = await fetchImpl(url.href, {
    method: 'POST', redirect: 'error', signal,
    headers: { 'content-type': 'application/json', 'X-Api-Key': key, 'X-Api-Resource-Id': model, 'X-Api-Request-Id': randomUUID() },
    body: JSON.stringify({ user: { uid: 'dsh-tts' }, req_params: { ...params, text: req.text } }),
  })
  if (!response.ok) { await response.body?.cancel?.(); throw new Error(`Doubao HTTP ${response.status}`) }
  return { ...audioResult('doubao',await readDoubaoAudio(response, signal, p => timing.add(p.sentence)),options.format||'mp3'), timing: timing.result() }
}
