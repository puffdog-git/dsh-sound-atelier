// Protocol adapted from @memef1f1y/dsh-plugin-tts (MIT).
// Copyright (c) 2026 dsh-plugin-tts contributors. See THIRD-PARTY-NOTICES.md.
// Uses ws for required handshake headers; no Python, subprocess or model download.
import { createHash, randomBytes } from 'node:crypto'
import WebSocket from 'ws'
import { pitchHz } from './tuning.js'

const TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4'
const VERSION = '143.0.3650.75'
const ROOT = 'speech.platform.bing.com/consumer/speech/synthesize/readaloud'
function query() {
  const ticks = (BigInt(Math.floor(Date.now() / 1000)) + 11644473600n) * 10000000n
  const rounded = ticks - ticks % 3000000000n
  const gec = createHash('sha256').update(String(rounded) + TOKEN, 'ascii').digest('hex').toUpperCase()
  return `TrustedClientToken=${TOKEN}&Sec-MS-GEC=${gec}&Sec-MS-GEC-Version=2-${VERSION}`
}
const escapeXml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c])

export async function edgeVoices({ fetchImpl = fetch, signal } = {}) {
  const res = await fetchImpl(`https://${ROOT}/voices/list?${query()}`, { signal: signal || AbortSignal.timeout(5000), redirect: 'error', headers: {
    'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/143.0.0.0 Safari/537.36 Edg/${VERSION}`,
    Cookie: `muid=${randomBytes(16).toString('hex').toUpperCase()};`,
  } })
  if (!res.ok) { await res.body?.cancel?.(); throw new Error('Edge voice list HTTP ' + res.status) }
  const data = await res.json()
  if (!Array.isArray(data)) throw new Error('Invalid Edge voice list')
  return data.map(v => ({ id: v.ShortName, name: v.FriendlyName || v.LocalName || v.ShortName, language: v.Locale, gender: v.Gender })).filter(v => v.id)
}

export function edgeNativeSpeak(text, { voice = 'en-US-AriaNeural', pitch = 0, signal, timeoutMs = 20000, WebSocketImpl = WebSocket } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new Error('Edge synthesis aborted')); return }
    if (!WebSocketImpl) { reject(new Error('Native WebSocket requires Node 22 or newer')); return }
    let ws; let timer; let finished = false; let bytes = 0
    const chunks = []
    const end = (err) => {
      if (finished) return
      finished = true; clearTimeout(timer); signal?.removeEventListener('abort', abort)
      try { ws?.close() } catch {}
      if (err) reject(err)
      else if (bytes < 100) reject(new Error('Edge returned empty audio'))
      else resolve({ audio: Buffer.concat(chunks), mime: 'audio/mpeg' })
    }
    const abort = () => end(new Error('Edge synthesis aborted'))
    signal?.addEventListener('abort', abort, { once: true })
    timer = setTimeout(() => end(new Error('Edge synthesis timed out')), timeoutMs)
    try {
      const speechQuery = query().replace('TrustedClientToken=', 'Ocp-Apim-Subscription-Key=').replace('Sec-MS-GEC-Version=2-', 'Sec-MS-GEC-Version=1-')
      ws = new WebSocketImpl(`wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1?${speechQuery}&ConnectionId=${randomBytes(16).toString('hex')}`, {
        headers: { Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold', Cookie: `muid=${randomBytes(16).toString('hex').toUpperCase()};`, 'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/143.0.0.0 Safari/537.36 Edg/${VERSION}` },
      })
      ws.binaryType = 'arraybuffer'
      ws.onopen = () => {
        if (finished) return
        const id = randomBytes(16).toString('hex')
        const lang = voice.split('-').slice(0, 2).join('-')
        const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${escapeXml(lang)}"><voice name="${escapeXml(voice)}"><prosody rate="+0%" pitch="${pitchHz(pitch)}" volume="+0%">${escapeXml(text)}</prosody></voice></speak>`
        try {
          ws.send('Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n' + JSON.stringify({ context: { synthesis: { audio: { metadataoptions: { sentenceBoundaryEnabled: 'false', wordBoundaryEnabled: 'false' }, outputFormat: 'audio-24khz-48kbitrate-mono-mp3' } } } }))
          ws.send(`X-RequestId:${id}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`)
        } catch { end(new Error('Edge connection closed while sending')) }
      }
      ws.onmessage = event => {
        if (finished) return
        if (typeof event.data === 'string') { if (event.data.includes('Path:turn.end')) end(); return }
        const raw = Buffer.from(event.data)
        if (raw.length < 2) return
        const headerLength = raw.readUInt16BE(0)
        if (headerLength + 2 > raw.length) { end(new Error('Invalid Edge audio frame')); return }
        const header = raw.subarray(2, 2 + headerLength).toString()
        if (!header.includes('Path:audio')) return
        const body = raw.subarray(2 + headerLength)
        bytes += body.length
        if (bytes > 32 * 1024 * 1024) { end(new Error('Edge audio exceeds size limit')); return }
        chunks.push(body)
      }
      // Keep transport diagnostics: callers need to distinguish a rejected
      // handshake from a transient disconnect before considering CLI fallback.
      ws.onerror = event => {
        const cause = event?.error || event
        const status = Number(String(cause?.message || event?.message || '').match(/(?:response:|HTTP)\s*(\d{3})/i)?.[1])
        const code = typeof cause?.code === 'string' && /^[A-Z_0-9]+$/.test(cause.code) ? cause.code : ''
        end(Object.assign(new Error(`Edge connection failed${status ? ` (HTTP ${status})` : code ? ` (${code})` : ''}`), { status: status || undefined, cause }))
      }
      ws.onclose = event => {
        if (!finished) end(Object.assign(new Error(`Edge connection closed before audio completed (code ${Number(event?.code) || 0})`), { closeCode: event?.code }))
      }
    } catch (cause) { end(new Error('Native Edge connection unavailable', { cause })) }
  })
}
