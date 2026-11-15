import { providerOptions, speechInstruction, audioResult } from './controls.js'
import { DEFAULT_MODELS, DEFAULT_VOICES } from './constants.js'
import { readReferenceDataUrl } from './reference-audio.js'
import { readAudioBody, parsePcmWav } from './audio.js'

export async function synthesizeSiliconFlow({ cfg, req, key, fetchImpl = fetch, signal }) {
  signal?.throwIfAborted()
  const model = req.models?.siliconflow || DEFAULT_MODELS.siliconflow
  const mode = cfg.siliconflowVoiceMode || 'preset'
  if (!['preset', 'reference'].includes(mode)) throw Error('SiliconFlow: unsupported voice mode')
  const options = providerOptions(cfg, 'siliconflow'), format = options.format || 'mp3'
  const sampleRate = options.sampleRate || (format === 'opus' ? 48000 : format === 'mp3' ? 44100 : 24000)
  if (!(format === 'opus' ? [48000] : format === 'mp3' ? [32000, 44100] : [8000, 16000, 24000, 32000, 44100]).includes(sampleRate)) throw Error('SiliconFlow sampleRate is unsupported for this format')
  const instruction = /cosyvoice/i.test(model) ? speechInstruction(cfg, req.role, 'siliconflow') : ''
  const body = {
    model, input: instruction ? instruction + '<|endofprompt|>' + req.text : req.text,
    response_format: format,
    ...(options.speed !== undefined ? { speed: options.speed } : {}),
    ...(options.gain !== undefined ? { gain: options.gain } : {}),
    ...(options.sampleRate !== undefined || ['pcm', 'wav'].includes(format) ? { sample_rate: sampleRate } : {}),
  }
  if (mode === 'reference') {
    if (model !== 'FunAudioLLM/CosyVoice2-0.5B') throw Error('SiliconFlow reference mode currently supports FunAudioLLM/CosyVoice2-0.5B only')
    const text = String(cfg.siliconflowReferenceText || '').trim()
    if (!text || text.length > 2000) throw Error('SiliconFlow reference requires a transcript of 1–2000 characters')
    const audio = await readReferenceDataUrl(cfg.siliconflowReferencePath || '', { provider: 'SiliconFlow', wavOnly: true, maxSeconds: 30, signal })
    body.references = [{ audio, text }]
    // The official API defines voice and references as mutually exclusive.
  } else body.voice = req.voices?.siliconflow || DEFAULT_VOICES.siliconflow
  signal?.throwIfAborted()
  const base = new URL(cfg.siliconflowBaseUrl || 'https://api.siliconflow.cn/v1')
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw Error('SiliconFlow: invalid API address')
  const res = await fetchImpl(base.href.replace(/\/+$/, '') + '/audio/speech', {
    method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify(body), signal, redirect: 'error',
  })
  if (!res.ok) { await res.body?.cancel?.(); throw Error(`SiliconFlow HTTP ${res.status}`) }
  if (/json|text\/html/i.test(res.headers?.get('content-type') || '')) { await res.body?.cancel?.(); throw Error('SiliconFlow returned a non-audio response') }
  const audio = await readAudioBody(res, signal)
  if (format === 'wav') parsePcmWav(audio)
  return audioResult('siliconflow', audio, format, sampleRate)
}
