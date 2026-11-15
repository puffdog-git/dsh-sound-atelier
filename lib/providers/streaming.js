import WebSocket from 'ws'
import { checkedResponse, decodeAudio, nativeAudio } from './native-http.js'
import { joinPcmWavs } from './audio.js'

export async function* jsonEvents(response, signal, { sse = false, limit = 64 * 1024 * 1024 } = {}) {
  await checkedResponse('TTS stream', response)
  const reader = response.body?.getReader()
  if (!reader) throw Error('TTS stream has no body')
  const decoder = new TextDecoder(); let buffer = '', size = 0, event = '', data = []
  const abort = () => { void reader.cancel().catch(() => {}) }
  signal?.addEventListener('abort', abort, { once: true })
  function parse(value) { if (value === '[DONE]') return { event: 'done', data: { done: true } }; try { return { event, data: JSON.parse(value) } } catch { throw Error('Invalid TTS streaming JSON') } }
  try {
    for (;;) {
      signal?.throwIfAborted()
      const part = await reader.read(); signal?.throwIfAborted()
      buffer += part.done ? decoder.decode() : decoder.decode(part.value, { stream: true })
      size += part.value?.length || 0
      if (size > limit || buffer.length > 8 * 1024 * 1024) throw Error('TTS stream exceeds size limit')
      let at
      while ((at = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, at).replace(/\r$/, ''); buffer = buffer.slice(at + 1)
        if (!sse) { if (line.trim()) yield parse(line); continue }
        if (!line) { if (data.length) yield parse(data.join('\n')); event = ''; data = []; continue }
        if (line.startsWith('event:')) event = line.slice(6).trim()
        if (line.startsWith('data:')) data.push(line.slice(5).trimStart())
      }
      if (part.done) {
        if (sse) {
          if (buffer.trim()) throw Error('Truncated TTS SSE event')
          if (data.length) throw Error('TTS SSE ended without an event delimiter')
        } else if (buffer.trim()) yield parse(buffer)
        break
      }
    }
  } finally { signal?.removeEventListener('abort', abort); await reader.cancel().catch(() => {}); reader.releaseLock() }
}

export function timingCollector(provider) {
  const entries = new Map(); let size = 0
  function set(id, items, type = 'word', offset = 0) {
    if (!Array.isArray(items)) return
    const words = items.map(w => ({ word: String(w.word ?? w.text ?? w.markName ?? '').slice(0, 2000), start: Number(w.start ?? w.timeSeconds) + offset, end: Number(w.end ?? w.start ?? w.timeSeconds) + offset })).filter(w => w.word && Number.isFinite(w.start) && Number.isFinite(w.end) && w.start >= 0 && w.end >= w.start)
    const value = { type, words }; size += JSON.stringify(value).length - (JSON.stringify(entries.get(id))?.length || 0)
    if (size > 4 * 1024 * 1024 || entries.size > 10000) throw Error('TTS alignment exceeds size limit')
    entries.set(id, value)
  }
  function arrays(id, values, start, end, type = 'word', offset = 0) {
    if (!Array.isArray(values) || !Array.isArray(start) || !Array.isArray(end) || values.length !== start.length || values.length !== end.length) throw Error('Invalid TTS alignment arrays')
    set(id, values.map((word, i) => ({ word, start: start[i], end: end[i] })), type, offset)
  }
  return { set, arrays, result() { return { provider, unit: 'seconds', scope: 'segment', available: [...entries.values()].some(e => e.words.length), alignments: [...entries.values()] } } }
}

export function audioCollector(provider, format, sampleRate, onAudioChunk) {
  const parts = []; let size = 0
  return {
    add(raw, { base64 = true, independentWav = false } = {}) {
      const bytes = base64 ? decodeAudio(provider, raw) : Buffer.from(raw)
      size += bytes.length
      if (size > 32 * 1024 * 1024) throw Error('TTS audio exceeds size limit')
      if (bytes.length) { parts.push({ bytes, independentWav }); onAudioChunk?.(bytes, { format, sampleRate }) }
    },
    result() {
      if (!parts.length) throw Error(provider + ': empty streamed audio')
      const audio = format === 'wav' && parts.every(p => p.independentWav) ? joinPcmWavs(parts.map(p => p.bytes)) : Buffer.concat(parts.map(p => p.bytes))
      return nativeAudio(provider, audio, format, sampleRate)
    },
  }
}

export function socketSession({ provider, url, headers, signal, timeoutMs = 60000, encode = JSON.stringify, decode = raw => JSON.parse(raw.toString()), onOpen, onMessage, onCancel, WebSocketImpl = WebSocket }) {
  signal?.throwIfAborted()
  return new Promise((resolve, reject) => {
    const lifecycle = new AbortController()
    let socket, finished = false
    const finish = (error, value) => {
      if (finished) return
      finished = true; lifecycle.abort(); clearTimeout(timer); signal?.removeEventListener('abort', abort)
      try { socket?.close() } catch {}
      if (error) reject(error); else resolve(value)
    }
    const send = value => { if (finished || socket.readyState !== 1) throw Error(provider + ': connection closed'); socket.send(encode(value)) }
    const abort = () => { try { onCancel?.(send) } catch {}; finish(Error(provider + ': synthesis cancelled')) }
    const timer = setTimeout(() => { try { onCancel?.(send) } catch {}; finish(Error(provider + ': stream timed out')) }, timeoutMs)
    const api = { send, complete: value => finish(null, value), fail: () => finish(Error(provider + ': stream failed')), signal:signal?AbortSignal.any([signal,lifecycle.signal]):lifecycle.signal, get closed() { return finished } }
    signal?.addEventListener('abort', abort, { once: true })
    try {
      socket = new WebSocketImpl(url, { headers, maxPayload: 8 * 1024 * 1024, followRedirects: false, perMessageDeflate: false })
      socket.on('open', () => { if (!finished) Promise.resolve().then(() => onOpen(api)).catch(e => finish(e)) })
      socket.on('message', (raw,isBinary) => { if (finished) return; try { onMessage(decode(raw,isBinary), api) } catch (e) { finish(e) } })
      socket.on('error', e => { const code = String(e?.message || '').match(/response:\s*(\d{3})/i)?.[1]; finish(Error(provider + ': WebSocket connection failed' + (code ? ' (HTTP ' + code + ')' : ''))) })
      socket.on('close', () => { if (!finished) finish(Error(provider + ': connection closed before synthesis completed')) })
      if (signal?.aborted) abort()
    } catch { finish(Error(provider + ': WebSocket unavailable')) }
  })
}

export async function sendTextChunks(req, send, signal) {
  let size = 0
  const source=req.textChunks||[req.text],iterator=source[Symbol.asyncIterator]?.()||source[Symbol.iterator]()
  let abort
  const cancelled=new Promise((_,reject)=>{abort=()=>reject(signal.reason||Error('TTS input cancelled'));signal?.addEventListener('abort',abort,{once:true})})
  // A stopped native transport must not keep awaiting the caller's next token.
  try { for (;;) {
    signal?.throwIfAborted()
    const next=await Promise.race([Promise.resolve(iterator.next()),cancelled]);if(next.done)break
    const text=next.value
    signal?.throwIfAborted()
    if (typeof text !== 'string') throw Error('TTS text chunks must be strings')
    size += Buffer.byteLength(text)
    if (size > 256 * 1024) throw Error('TTS streaming text exceeds size limit')
    const points = Array.from(text)
    for (let at = 0; at < points.length; at += 500) { signal?.throwIfAborted(); await send(points.slice(at, at + 500).join('')) }
  }} finally {signal?.removeEventListener('abort',abort);Promise.resolve(iterator.return?.()).catch(()=>{})}
}
