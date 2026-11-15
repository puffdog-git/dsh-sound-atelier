import { readAudioBody, parsePcmWav } from './audio.js'
import { audioResult } from './controls.js'

export function httpError(provider, status) {
  const code = [401, 403].includes(status) ? 'auth' : status === 402 ? 'payment' : status === 429 ? 'rate_limit' : 'http'
  return Object.assign(Error(`${provider} HTTP ${status}`), { status, code })
}
export async function checkedResponse(provider, res) {
  if (!res.ok) { await res.body?.cancel?.(); throw httpError(provider, res.status) }
  return res
}
export async function boundedJson(provider, res, signal, limit = 48 * 1024 * 1024) {
  await checkedResponse(provider, res)
  try { return JSON.parse((await readAudioBody(res, signal, limit)).toString('utf8')) }
  catch { signal?.throwIfAborted(); throw Error(provider + ': invalid or oversized JSON response') }
}
export function decodeAudio(provider, value) {
  if (typeof value !== 'string' || !value.length || value.length > 45 * 1024 * 1024 || value.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw Error(provider + ': invalid base64 audio')
  const bytes = Buffer.from(value, 'base64')
  if (!bytes.length || bytes.length > 32 * 1024 * 1024 || bytes.toString('base64') !== value) throw Error(provider + ': invalid base64 audio')
  return bytes
}
export function nativeAudio(provider, bytes, format, sampleRate) {
  if (!bytes.length) throw Error(provider + ': empty audio')
  if (format === 'wav') parsePcmWav(bytes)
  if (format === 'mp3' && !(bytes.length >= 3 && (bytes.toString('ascii', 0, 3) === 'ID3' || bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0))) throw Error(provider + ': invalid MP3 audio')
  if (format === 'opus' && bytes.toString('ascii', 0, 4) !== 'OggS') throw Error(provider + ': invalid Ogg Opus audio')
  return audioResult(provider, bytes, format, sampleRate)
}
export async function binaryAudio(provider, res, signal, format, sampleRate) {
  await checkedResponse(provider, res)
  if (/json|text\//i.test(res.headers?.get('content-type') || '')) { await res.body?.cancel?.(); throw Error(provider + ': expected audio response') }
  return nativeAudio(provider, await readAudioBody(res, signal), format, sampleRate)
}
export const directionTag = instruction => instruction ? '[' + instruction.replace(/[\[\]\r\n]/g, ' ').slice(0, 200) + '] ' : ''
