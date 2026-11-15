import WebSocket from 'ws'
import { randomUUID } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import { createDoubaoTiming } from './doubao-timing.js'
import { audioResult } from './controls.js'
import { sendTextChunks } from './streaming.js'

export const DOUBAO_WS_URL = 'wss://openspeech.bytedance.com/api/v3/tts/bidirection'
const MAX_FRAME = 8 * 1024 * 1024
const connectionEvents = new Set([1, 2, 50, 51, 52])
const u32 = n => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b }
export function doubaoFrame(event, data = {}, sessionId = '') {
  const payload = Buffer.from(JSON.stringify(data))
  const id = Buffer.from(sessionId)
  return Buffer.concat([Buffer.from([0x11, 0x14, 0x10, 0]), u32(event), ...(connectionEvents.has(event) ? [] : [u32(id.length), id]), u32(payload.length), payload])
}

export function parseDoubaoFrame(raw) {
  const b = Buffer.from(raw)
  if (b.length < 8 || b.length > MAX_FRAME || b[0] >> 4 !== 1 || !(b[0] & 15)) throw Error('Invalid Doubao frame header')
  let offset = (b[0] & 15) * 4
  const type = b[1] >> 4, flags = b[1] & 15, serialization = b[2] >> 4, compression = b[2] & 15
  const number = () => { if (offset + 4 > b.length) throw Error('Truncated Doubao frame'); const n = b.readUInt32BE(offset); offset += 4; return n }
  const field = () => { const n = number(); if (n > MAX_FRAME || offset + n > b.length) throw Error('Invalid Doubao frame length'); const value = b.subarray(offset, offset + n); offset += n; return value }
  if (![1, 9, 11, 15].includes(type) || ![0, 1].includes(serialization) || ![0, 1].includes(compression)) throw Error('Unsupported Doubao frame')
  if (type === 15) {
    const code = number(); field()
    throw Error('Doubao API error ' + code)
  }
  if (flags !== 4) throw Error('Doubao response requires event framing')
  const event = number()
  const id = connectionEvents.has(event) ? ([50, 51, 52].includes(event) ? field().toString('utf8') : '') : field().toString('utf8')
  let payload = field()
  if (offset !== b.length) throw Error('Unexpected data after Doubao frame')
  if (compression === 1) { try { payload = gunzipSync(payload, { maxOutputLength: MAX_FRAME }) } catch { throw Error('Invalid Doubao compressed frame') } }
  let data
  if (serialization === 1) { try { data = JSON.parse(payload.toString('utf8')) } catch { throw Error('Invalid Doubao JSON frame') } }
  return { event, id, type, payload, data }
}

function socketUrl(configured) {
  if (!configured || /\/api\/v[13]\/tts(?:\/unidirectional(?:\/sse)?)?\/?$/.test(configured)) {
    if (!configured) return DOUBAO_WS_URL
    const u = new URL(configured)
    u.protocol = u.protocol === 'http:' ? 'ws:' : 'wss:'; u.pathname = '/api/v3/tts/bidirection'
    configured = u.href
  }
  const url = new URL(configured)
  if (!['ws:', 'wss:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw Error('Invalid Doubao WebSocket address')
  if (url.protocol === 'ws:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw Error('Doubao credentials require a secure WebSocket')
  return url.href
}

// Native bidirectional transport. The normal synthesis contract supplies text;
// integrations can supply textChunks (AsyncIterable<string>) without changing
// session settings, while onAudioChunk observes packets as they arrive.
export function synthesizeDoubaoBidirectional({ cfg, req, key, params, signal, WebSocketImpl = WebSocket, timestamps = false }) {
  const url = socketUrl(cfg.doubaoBaseUrl?.trim())
  return new Promise((resolve, reject) => {
    const lifecycle=new AbortController(),inputSignal=signal?AbortSignal.any([signal,lifecycle.signal]):lifecycle.signal
    if (signal?.aborted) { reject(Error('Doubao synthesis cancelled')); return }
    const sid = randomUUID(), timing = createDoubaoTiming(timestamps), chunks = []
    let ws, timer, bytes = 0, done = false, started = false, finishSent = false, phase = 'connecting'
    const send = (event, data = {}, id = '') => { if (ws.readyState !== 1) throw Error('Doubao connection is not open'); ws.send(doubaoFrame(event, data, id)) }
    const finish = (error) => {
      if (done) return
      done = true; lifecycle.abort(); clearTimeout(timer); signal?.removeEventListener('abort', abort)
      if (!error && !bytes) error = Error('Doubao returned empty audio')
      try { if (!error) send(2) } catch { /* synthesis already finished */ }
      try { ws?.close() } catch {}
      if (error) reject(error)
      else resolve({ ...audioResult('doubao',Buffer.concat(chunks),params.audio_params.format,params.audio_params.sample_rate), timing: timing.result() })
    }
    const abort = () => {
      try { if (started && !finishSent) send(101, {}, sid) } catch {}
      finish(Error('Doubao synthesis cancelled'))
    }
    signal?.addEventListener('abort', abort, { once: true })
    timer = setTimeout(() => { try { if (started && !finishSent) send(101, {}, sid) } catch {}; finish(Error('Doubao synthesis timed out')) }, Math.min(Number(cfg.timeoutMs) || 60000, 60000))
    const pump = async () => {
      await sendTextChunks(req,async text=>{
        if (done || signal?.aborted) return
        const points = Array.from(text)
        for (let at = 0; at < points.length; at += 200) {
          while ((ws.bufferedAmount || 0) > 1024 * 1024) { await new Promise(r => setTimeout(r, 10)); if (done || signal?.aborted) return }
          if (done || signal?.aborted) return
          send(200, { user: { uid: 'dsh-tts' }, namespace: 'BidirectionalTTS', event: 200, req_params: { ...params, text: points.slice(at, at + 200).join('') } }, sid)
        }
      },inputSignal)
      if (!done) { finishSent = true; phase = 'finishing'; send(102, {}, sid) }
    }
    try {
      ws = new WebSocketImpl(url, { headers: { 'X-Api-Key': key, 'X-Api-Resource-Id': req.models.doubao, 'X-Api-Connect-Id': randomUUID() }, maxPayload: MAX_FRAME, followRedirects: false, perMessageDeflate: false })
      ws.on('open', () => { if (!done) { phase = 'connection'; try { send(1) } catch (e) { finish(e) } } })
      ws.on('message', (raw, isBinary) => {
        if (done) return
        try {
          if (isBinary === false) throw Error('Expected Doubao binary frame')
          const packet = parseDoubaoFrame(raw)
          if (!connectionEvents.has(packet.event) && packet.id !== sid) throw Error('Doubao session ID mismatch')
          const code = packet.data?.status_code ?? packet.data?.code
          if (code !== undefined && ![0, 20000000].includes(code)) throw Error('Doubao API error ' + (Number(code) || 'unknown'))
          if ([51, 151, 153].includes(packet.event)) throw Error('Doubao session failed (' + packet.event + ')')
          if (packet.event === 50) {
            if (phase !== 'connection') throw Error('Unexpected Doubao connection event')
            phase = 'session'
            send(100, { user: { uid: 'dsh-tts' }, namespace: 'BidirectionalTTS', event: 100, req_params: params }, sid)
          } else if (packet.event === 150) {
            if (phase !== 'session') throw Error('Unexpected Doubao session event')
            started = true; phase = 'streaming'; pump().catch(finish)
          } else if (packet.event === 352) {
            if (!started || packet.type !== 11 || packet.data !== undefined) throw Error('Unexpected Doubao audio event')
            bytes += packet.payload.length
            if (bytes > 32 * 1024 * 1024) throw Error('Doubao audio exceeds size limit')
            chunks.push(packet.payload); req.onAudioChunk?.(packet.payload, {format:params.audio_params.format,sampleRate:params.audio_params.sample_rate})
          } else if (packet.event === 351 || packet.event === 364) {
            if (!started) throw Error('Unexpected Doubao timestamp event')
            timing.add(packet.data)
          } else if (packet.event === 152) {
            if (!finishSent) throw Error('Doubao session finished before text input completed')
            finish()
          } else if (packet.event === 52) finish(Error('Doubao connection ended before session completion'))
        } catch (e) { finish(e) }
      })
      ws.on('error', error => {
        const status = String(error?.message || '').match(/(?:response:|HTTP)\s*(\d{3})/i)?.[1]
        finish(Error('Doubao WebSocket connection failed' + (status ? ' (HTTP ' + status + ')' : '')))
      })
      ws.on('close', () => { if (!done) finish(Error('Doubao connection closed before session completed')) })
      if (signal?.aborted) abort()
    } catch { finish(Error('Doubao WebSocket connection unavailable')) }
  })
}
