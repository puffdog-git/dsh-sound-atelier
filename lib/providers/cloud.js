import { DEFAULT_MODELS, DEFAULT_VOICES, OPENAI_COMPATIBLE } from "./constants.js"
import { voiceTuning, pitchHz } from '../tuning.js'
import { synthesizeVoAI } from './voai.js'
import { synthesizeDoubaoV3 } from './doubao.js'
import { providerOptions, speechInstruction, audioResult } from './controls.js'
import { synthesizeMiniMax } from './minimax.js'
import { synthesizeGroq } from './groq.js'
import { synthesizeOpenAIRealtime, isRealtimeModel } from './openai-realtime.js'
import { readReferenceDataUrl } from './reference-audio.js'
import { synthesizeDeepinfraQwen, isDeepinfraQwen, synthesizeDeepinfraNative, DEEPINFRA_SCHEMAS } from './deepinfra.js'
import { readAudioBody } from './audio.js'
import { elevenLabsError } from './elevenlabs-errors.js'
import { synthesizeSiliconFlow } from './siliconflow.js'
import { synthesizeVoicePlatform } from './voice-platforms.js'
import { synthesizeDashScope } from './dashscope.js'
import { synthesizePolly } from './polly.js'
import { synthesizeGoogleCloud } from './google-cloud.js'
import { keyEnvName } from '../keys.js'

function pick(map, models, key) {
  const chosen = models && typeof models[key] === "string" ? models[key].trim() : ""
  return chosen || map[key]
}

function asBuffer(body) {
  if (Buffer.isBuffer(body)) return body
  return Buffer.from(body)
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function pcmToWav(pcmBuffer, sampleRate = 24000, channels = 1) {
  if (pcmBuffer.length >= 4 && pcmBuffer.toString('ascii', 0, 4) === 'RIFF') {
    return pcmBuffer
  }
  const header = Buffer.alloc(44)
  const byteRate = sampleRate * channels * 2
  const blockAlign = channels * 2
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + pcmBuffer.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(pcmBuffer.length, 40)
  return Buffer.concat([header, pcmBuffer])
}

export function makeCloudProviders(deps, req, withCloudTimeout) {
  const { resolveKey, fetchImpl, cfg } = deps
  const { text, lang, models, voices, role } = req

  async function openai() {
    const key = await resolveKey(cfg.openaiKeyEnv)
    if (!key) return { ok: false, provider: 'openai', reason: `no ${cfg.openaiKeyEnv}` }
    const model = pick(DEFAULT_MODELS, models, 'openai')
    if (isRealtimeModel(model)) {
      const { signal, cleanup } = withCloudTimeout(Number(cfg.timeoutMs) || 60000)
      try { return await synthesizeOpenAIRealtime({ cfg, req: { ...req, models: { ...models, openai: model } }, key, signal, connect: deps.realtimeConnect }) }
      finally { cleanup() }
    }
    if (/realtime/.test(model)) throw Error('Unsupported legacy OpenAI Realtime protocol')
    const options = providerOptions(cfg, 'openai')
    const instruction = speechInstruction(cfg, role, 'openai')
    const format = options.format || 'mp3'
    const { signal, cleanup } = withCloudTimeout(Number(cfg.timeoutMs) || 60000)
    try {
      const res = await fetchImpl((cfg.openaiBaseUrl || 'https://api.openai.com/v1') + '/audio/speech', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        input: text,
        voice: pick(DEFAULT_VOICES, voices, 'openai'),
        response_format: format,
        ...(instruction && !/^tts-1(?:-hd)?$/.test(model) ? { instructions: instruction } : {}),
        ...(options.speed !== undefined ? { speed: options.speed } : {}),
      }),
      signal,
    })
    if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`)
    const audio = asBuffer(await readAudioBody(res))
    return audioResult('openai', audio, format)
    } finally {
      cleanup()
    }
  }
  function openaiCompatible(key) {
    const spec = OPENAI_COMPATIBLE[key]
    return async function speak() {
      const keyEnv = (cfg[key + 'KeyEnv'] || spec.keyEnv)
      const token = await resolveKey(keyEnv)
      if (!token) return { ok: false, provider: key, reason: `no ${keyEnv}` }
      const base = cfg[key + 'BaseUrl'] || spec.baseUrl
      if (!base) return { ok: false, provider: key, reason: 'no base url configured' }
      if (key === 'siliconflow') {
        const { signal, cleanup } = withCloudTimeout(Number(cfg.timeoutMs) || 60000)
        try { return await synthesizeSiliconFlow({ cfg, req, key: token, fetchImpl, signal }) } finally { cleanup() }
      }
      if (key === 'deepinfra' && isDeepinfraQwen(pick(DEFAULT_MODELS, models, key))) {
        const { signal, cleanup } = withCloudTimeout(Number(cfg.timeoutMs) || 60000)
        try { return await synthesizeDeepinfraQwen({ cfg, req, key: token, fetchImpl, signal }) } finally { cleanup() }
      }
      if (key === 'deepinfra' && DEEPINFRA_SCHEMAS[pick(DEFAULT_MODELS, models, key)]) {
        const { signal, cleanup } = withCloudTimeout(Number(cfg.timeoutMs) || 60000)
        try { return await synthesizeDeepinfraNative({ cfg, req: { ...req, models: { ...models, deepinfra: pick(DEFAULT_MODELS, models, key) } }, key: token, fetchImpl, signal }) } finally { cleanup() }
      }
      const options = providerOptions(cfg, key)
      if (key === 'deepinfra' && (options.language !== undefined || options.pcmSampleRate !== undefined)) throw Error('DeepInfra language and PCM rate controls require a Qwen3-TTS model')
      const format = options.format || 'mp3'
      const model = pick(DEFAULT_MODELS, models, key)
      const instruction = key === 'siliconflow' && /cosyvoice/i.test(model) ? speechInstruction(cfg, role, key) : ''
      const sampleRate = options.sampleRate || (format === 'opus' ? 48000 : 24000)
      if (key === 'siliconflow' && options.sampleRate !== undefined && !(format === 'opus' ? [48000] : format === 'mp3' ? [32000, 44100] : [8000, 16000, 24000, 32000, 44100]).includes(sampleRate)) throw Error('SiliconFlow sampleRate is unsupported for this format')
      const { signal, cleanup } = withCloudTimeout(Number(cfg.timeoutMs) || 60000)
      try {
        const res = await fetchImpl(base + '/audio/speech', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          input: instruction ? instruction + '<|endofprompt|>' + text : text,
          voice: pick(DEFAULT_VOICES, voices, key),
          response_format: format,
          ...(options.speed !== undefined ? { speed: options.speed } : {}),
          ...(key === 'siliconflow' && options.gain !== undefined ? { gain: options.gain } : {}),
          ...(key === 'siliconflow' && (options.sampleRate !== undefined || ['pcm', 'wav'].includes(format)) ? { sample_rate: sampleRate } : {}),
        }),
        signal,
      })
      if (!res.ok) throw new Error(`${key} HTTP ${res.status}`)
      const audio = asBuffer(await readAudioBody(res))
      return audioResult(key, audio, format, sampleRate)
      } finally {
        cleanup()
      }
    }
  }
  async function mimo() {
    const key = await resolveKey(cfg.mimoKeyEnv)
    if (!key) return { ok: false, provider: 'mimo', reason: `no ${cfg.mimoKeyEnv}` }
    const base = (cfg.mimoBaseUrl || 'https://api.xiaomimimo.com/v1').replace(/\/+$/, '')
    const format = ['wav', 'pcm', 'pcm16'].includes(cfg.mimoFormat) ? cfg.mimoFormat : 'mp3'
    const model = pick(DEFAULT_MODELS, models, 'mimo')
    const design = model === 'mimo-v2.5-tts-voicedesign'
    const instruction = speechInstruction(cfg, req.role, 'mimo')
    const clone = model === 'mimo-v2.5-tts-voiceclone'
    const voiceDesign = cfg.roles?.[req.role]?.voiceDesign || cfg.mimoVoiceDesign || ''
    if (design && !voiceDesign.trim()) throw Error('MiMo VoiceDesign requires a voice description')
    const context = [design ? voiceDesign : '', instruction].filter(Boolean).join('\n')
    const messages = [...(context || clone ? [{ role: 'user', content: context }] : []), { role: 'assistant', content: text }]
    const { signal, cleanup } = withCloudTimeout(Number(cfg.timeoutMs) || 60000)
    try {
      signal?.throwIfAborted()
      const cloneVoice = clone ? await readReferenceDataUrl(cfg.mimoReferencePath || '') : ''
      signal?.throwIfAborted()
      const res = await fetchImpl(base + '/chat/completions', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        audio: design ? { format, optimize_text_preview: false } : { format, voice: clone ? cloneVoice : pick(DEFAULT_VOICES, voices, 'mimo') },
        stream: false,
      }),
      signal,
    })
    if (!res.ok) { await res.body?.cancel?.(); throw Error('MiMo HTTP ' + res.status) }
    let data
    try { data = JSON.parse((await readAudioBody(res, signal, 48 * 1024 * 1024)).toString('utf8')) } catch (e) { signal?.throwIfAborted(); throw Error('MiMo returned invalid or oversized JSON audio') }
    if (data.error || data.choices?.[0]?.finish_reason && data.choices[0].finish_reason !== 'stop') throw Error('MiMo did not complete audio generation')
    const encoded = data && data.choices && data.choices[0]
      && data.choices[0].message && data.choices[0].message.audio
      && data.choices[0].message.audio.data
    if (typeof encoded !== 'string' || !encoded) {
      return { ok: false, provider: 'mimo', reason: 'response missing choices[0].message.audio.data' }
    }
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) throw Error('MiMo returned invalid audio encoding')
    return audioResult('mimo', Buffer.from(encoded, 'base64'), format === 'pcm16' ? 'pcm' : format)
    } finally {
      cleanup()
    }
  }
  async function elevenlabs() {
    const key = await resolveKey(cfg.elevenlabsKeyEnv)
    if (!key) return { ok: false, provider: 'elevenlabs', reason: `no ${cfg.elevenlabsKeyEnv}` }
    const voice = pick(DEFAULT_VOICES, voices, 'elevenlabs')
    const model = pick(DEFAULT_MODELS, models, 'elevenlabs')
    const options = providerOptions(cfg, 'elevenlabs')
    if (/^eleven_v4/.test(model) && ['style', 'speed', 'use_speaker_boost'].some(k => options[k] !== undefined)) throw Error('Eleven v4 only supports stability and similarity_boost voice settings; use audio tags for delivery')
    const instruction = /^eleven_v[34](?:_|$)/.test(model) ? speechInstruction(cfg, role, 'elevenlabs') : ''
    const taggedText = instruction ? '[' + instruction.replace(/[\[\]\r\n]/g, ' ').slice(0, 200) + '] ' + text : text
    const { signal, cleanup } = withCloudTimeout()
    try {
      const res = await fetchImpl(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({
        text: taggedText,
        model_id: model,
        ...(Object.keys(options).length ? { voice_settings: options } : {}),
      }),
      signal,
    })
    if (!res.ok) throw await elevenLabsError(res, signal)
    const audio = asBuffer(await readAudioBody(res))
    return { ok: audio.length > 0, provider: 'elevenlabs', audio, mime: 'audio/mpeg', reason: audio.length ? '' : 'empty audio' }
    } finally {
      cleanup()
    }
  }
  async function google() {
    const key = await resolveKey(cfg.googleKeyEnv)
    if (!key) return { ok: false, provider: 'google', reason: `no ${cfg.googleKeyEnv}` }
    const model = pick(DEFAULT_MODELS, models, 'google')
    const voiceName = pick(DEFAULT_VOICES, voices, 'google')
    const instruction = speechInstruction(cfg, role, 'google')
    const dialogue=req.dialogue
    if(dialogue&&(dialogue.speakers.length!==2||dialogue.speakers.some(s=>/^(?:voice_|voicekey_)/.test(s.voice))))throw Error('Gemini native dialogue requires exactly two prebuilt voices')
    if (/^gemini-3\.8-.*tts/.test(model)) {
      const { signal, cleanup } = withCloudTimeout(Number(cfg.timeoutMs) || 60000)
      try {
        const res = await fetchImpl('https://generativelanguage.googleapis.com/v1beta/interactions', {
          method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, signal,
          body: JSON.stringify({ model, input: [{ type: 'user_input', content: dialogue?dialogue.turns.map(t=>({type:'text',text:t.text,annotations:[{type:'speech_metadata',speaker:t.speaker,...(t.instruction||instruction?{style:t.instruction||instruction}:{})}]})):[{ type: 'text', text, ...(instruction ? { annotations: [{ type: 'speech_metadata', style: instruction }] } : {}) }] }], response_format: { type: 'audio' }, generation_config: { speech_config: dialogue?{speakers:dialogue.speakers.map(s=>({speaker:s.id,voice:s.voice}))}:[{ voice: voiceName }] } }),
        })
        if (!res.ok) throw Error('Google Interactions HTTP ' + res.status)
        const data = await res.json()
        const inline = data.output_audio || data.steps?.filter(s => s.type === 'model_output').flatMap(s => s.content || []).filter(c => c.type === 'audio').at(-1)
        if (!inline?.data || data.status && !['completed', 'succeeded'].includes(data.status)) throw Error('Google Interactions did not complete audio generation')
        const raw = Buffer.from(inline.data, 'base64')
        if (raw.toString('ascii', 0, 4) !== 'RIFF' || raw.toString('ascii', 8, 12) !== 'WAVE') throw Error('Google Interactions response is not WAV audio')
        return audioResult('google', raw, 'wav')
      } finally { cleanup() }
    }
    const { signal, cleanup } = withCloudTimeout()
    try {
      const res = await fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: dialogue?[instruction,dialogue.turns.map((t,i)=>t.instruction?'Turn '+(i+1)+' ('+t.speaker+') delivery: '+t.instruction:'').filter(Boolean).join('\n'),'Read the dialogue below:',dialogue.turns.map(t=>t.speaker+': '+t.text).join('\n')].filter(Boolean).join('\n'):instruction ? instruction + '\nRead exactly the following text:\n' + text : text }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: dialogue?{multiSpeakerVoiceConfig:{speakerVoiceConfigs:dialogue.speakers.map(s=>({speaker:s.id,voiceConfig:{prebuiltVoiceConfig:{voiceName:s.voice}}}))}}:{ voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
          },
        }),
        signal,
      },
    )
    if (!res.ok) throw new Error(`Google HTTP ${res.status}`)
    const data = await res.json()
    if(data.candidates?.[0]?.finishReason&&data.candidates[0].finishReason!=='STOP')throw Error('Gemini speech generation did not complete')
    const inline = data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData
    if (!inline?.data) return { ok: false, provider: 'google', reason: 'no inline audio' }
    const raw = Buffer.from(inline.data, 'base64')
    const mimeType = String(inline.mimeType || '')
    let sampleRate = 24000
    const m = mimeType.match(/rate=(\d+)/i)
    if (m) sampleRate = parseInt(m[1], 10)
    const isWavAlready = raw.length >= 4 && raw.toString('ascii', 0, 4) === 'RIFF'
    let audio = null
    const lowerMime = mimeType.toLowerCase()
    if (isWavAlready || lowerMime.includes('wav')) {
      audio = raw
    } else if (!lowerMime || lowerMime.includes('pcm') || lowerMime.includes('raw') || lowerMime.includes('l16')) {
      audio = pcmToWav(raw, sampleRate, 1)
    } else {
      return { ok: false, provider: 'google', reason: `unsupported Google TTS MIME: ${mimeType}` }
    }
    return { ok: audio.length > 0, provider: 'google', audio, mime: 'audio/wav', reason: audio.length ? '' : 'empty audio' }
    } finally {
      cleanup()
    }
  }
  async function azure() {
    const key = await resolveKey(cfg.azureKeyEnv)
    if (!key) return { ok: false, provider: 'azure', reason: `no ${cfg.azureKeyEnv}` }
    const region = (cfg.azureRegion || '').trim()
    if (!region) return { ok: false, provider: 'azure', reason: 'azureRegion is empty' }
    const voice = pick(DEFAULT_VOICES, voices, 'azure')
    const roleCfg = req.role && cfg.roles && cfg.roles[req.role]
    const tuning = voiceTuning(cfg, req.role)
    const options = providerOptions(cfg, 'azure')
    if (!/^[a-z0-9-]+$/.test(region)) throw Error('Invalid Azure region')
    const style = roleCfg?.ssmlStyle || options.style
    const safeStyle = style ? String(style).replace(/["<>&]/g, '') : ''
    const inner = safeStyle
      ? `<mstts:express-as style="${safeStyle}"${options.styleDegree !== undefined ? ' styledegree="' + options.styleDegree + '"' : ''}${options.role ? ' role="' + escapeXml(options.role) + '"' : ''}>${escapeXml(text)}</mstts:express-as>`
      : escapeXml(text)
    const safeLang = escapeXml(lang || 'en-US')
    const safeVoice = escapeXml(voice)
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${safeLang}">`
      + `<voice xml:lang="${safeLang}" name="${safeVoice}">`
      + `<prosody pitch="${pitchHz(tuning.pitch)}">${inner}</prosody></voice></speak>`
    const { signal, cleanup } = withCloudTimeout()
    try {
      const res = await fetchImpl(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
      },
      body: cfg._inputType==='ssml'?text:ssml,
      signal,
    })
    if (!res.ok) throw new Error(`Azure HTTP ${res.status}`)
    const audio = asBuffer(await readAudioBody(res))
    return { ok: audio.length > 0, provider: 'azure', audio, mime: 'audio/mpeg', reason: audio.length ? '' : 'empty audio' }
    } finally {
      cleanup()
    }
  }
  async function groq() {
    const key = await resolveKey(cfg.groqKeyEnv || 'GROQ_API_KEY')
    if (!key) return { ok: false, provider: 'groq', reason: 'no Groq key configured' }
    const { signal, cleanup } = withCloudTimeout(Number(cfg.timeoutMs) || 60000)
    try { return await synthesizeGroq({ cfg, req, key, fetchImpl, signal }) } finally { cleanup() }
  }
  async function minimax() {
    const key = await resolveKey(cfg.minimaxKeyEnv || 'MINIMAX_API_KEY')
    if (!key) return { ok: false, provider: 'minimax', reason: 'no MiniMax key configured' }
    const { signal, cleanup } = withCloudTimeout(Number(cfg.timeoutMs) || 60000)
    try { return await synthesizeMiniMax({ cfg, req, key, fetchImpl, signal }) } finally { cleanup() }
  }
  async function deepgram() {
    const key = await resolveKey(cfg.deepgramKeyEnv)
    if (!key) return { ok: false, provider: 'deepgram', reason: `no ${cfg.deepgramKeyEnv}` }
    const model = pick(DEFAULT_MODELS, models, 'deepgram')
    const options = providerOptions(cfg, 'deepgram')
    const flux = model.startsWith('flux-')
    if (!flux && Object.keys(options).length) throw Error('Deepgram speed/expressivity controls require a Flux model')
    const query = new URLSearchParams({ model, encoding: 'mp3' })
    for (const [k, v] of Object.entries(options)) query.set(k, String(v))
    const { signal, cleanup } = withCloudTimeout()
    try {
      const res = await fetchImpl(`https://api.deepgram.com/${flux ? 'v2' : 'v1'}/speak?${query}`, {
      method: 'POST',
      headers: { authorization: `Token ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
      signal,
    })
    if (!res.ok) throw new Error(`Deepgram HTTP ${res.status}`)
    if (res.headers?.get('content-type')?.includes('json')) throw Error('Deepgram returned metadata instead of audio')
    const audio = asBuffer(await readAudioBody(res))
    return { ok: audio.length > 0, provider: 'deepgram', audio, mime: 'audio/mpeg', reason: audio.length ? '' : 'empty audio' }
    } finally {
      cleanup()
    }
  }
  async function openrouter() {
    const key = await resolveKey(cfg.openrouterKeyEnv)
    if (!key) return { ok: false, provider: 'openrouter', reason: `no ${cfg.openrouterKeyEnv}` }
    const model = pick(DEFAULT_MODELS, models, 'openrouter')
    const options = providerOptions(cfg, 'openrouter')
    const format = options.format || (/^(google|heygen)\//.test(model) ? 'pcm' : 'mp3')
    const instruction = speechInstruction(cfg, role, 'openrouter')
    if (/^(google|heygen)\//.test(model) && format !== 'pcm') throw Error('This OpenRouter model requires PCM output')
    if (/^minimax\//.test(model) && format !== 'mp3') throw Error('MiniMax on OpenRouter requires MP3 output')
    if (format === 'pcm' && !options.pcmSampleRate) throw Error('Configure openrouter.pcmSampleRate for this PCM model')
    const { signal, cleanup } = withCloudTimeout()
    try {
      const res = await fetchImpl('https://openrouter.ai/api/v1/audio/speech', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        input: text,
        voice: pick(DEFAULT_VOICES, voices, 'openrouter'),
        response_format: format,
        ...(instruction ? { instructions: instruction } : {}),
        ...(options.speed !== undefined ? { speed: options.speed } : {}),
      }),
      signal,
    })
    if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`)
    const audio = asBuffer(await readAudioBody(res))
    return audioResult('openrouter', audio, format, options.pcmSampleRate || 24000)
    } finally {
      cleanup()
    }
  }

  async function doubao() {
    const key = await resolveKey(cfg.doubaoKeyEnv)
    if (!key) return { ok: false, provider: 'doubao', reason: `no ${cfg.doubaoKeyEnv}` }
    if (pick(DEFAULT_MODELS, models, 'doubao') !== 'seed-tts-1.0') {
      const { signal, cleanup } = withCloudTimeout(Math.min(Number(cfg.timeoutMs) || 60000, 60000))
      try { return await synthesizeDoubaoV3({ cfg, req, key, fetchImpl, signal, WebSocketImpl: deps.doubaoWebSocket }) } finally { cleanup() }
    }
    const controls = providerOptions(cfg, 'doubao')
    if (controls.timestamps || controls.transport === 'websocket') throw Error('Doubao streaming controls require a 2.0 model; clear them for legacy V1')
    const appId = (cfg.doubaoAppId || '').trim()
    if (!appId) return { ok: false, provider: 'doubao', reason: 'no doubaoAppId configured' }
    const base = (cfg.doubaoBaseUrl || 'https://openspeech.bytedance.com/api/v1/tts').replace(/\/+$/, '')
    const cluster = (cfg.doubaoCluster || 'volcano_tts').trim()
    const voice = voices?.doubao || 'BV001_streaming'
    const format = 'mp3'
    const { signal, cleanup } = withCloudTimeout()
    try {
      const reqId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('req-' + Date.now())
      const res = await fetchImpl(base, {
        method: 'POST',
        headers: {
          authorization: `Bearer; ${key}`,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          app: { appid: appId, token: key, cluster },
          user: { uid: 'dsh_user' },
          audio: {
            voice_type: voice,
            encoding: format,
            speed_ratio: 1.0,
            volume_ratio: 1.0,
            pitch_ratio: 1.0,
          },
          request: {
            reqid: reqId,
            text,
            text_type: 'plain',
            operation: 'query',
          },
        }),
        signal,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const detail = data && data.message
        throw new Error(`Doubao HTTP ${res.status}${detail ? ': ' + detail : ''}`)
      }
      if (data.code && data.code !== 3000) {
        throw new Error(`Doubao error ${data.code}: ${data.message || 'unknown error'}`)
      }
      const encoded = data && data.data
      if (typeof encoded !== 'string' || !encoded) {
        return { ok: false, provider: 'doubao', reason: 'response missing data' }
      }
      const audio = Buffer.from(encoded, 'base64')
      return {
        ok: audio.length > 0,
        provider: 'doubao',
        audio,
        mime: 'audio/mpeg',
        reason: audio.length ? '' : 'empty audio',
      }
    } finally {
      cleanup()
    }
  }

  async function deepseekWeb() {
    const token = await resolveKey(cfg.deepseekWebKeyEnv)
    if (!token) return { ok: false, provider: 'deepseek-web', reason: `no ${cfg.deepseekWebKeyEnv}` }
    const base = (cfg.deepseekWebBaseUrl || 'https://chat.deepseek.com/api/v0/chat/voice').replace(/\/+$/, '')
    const voice = pick(DEFAULT_VOICES, voices, 'deepseek-web')
    const { signal, cleanup } = withCloudTimeout()
    try {
      const res = await fetchImpl(base, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          accept: 'audio/mpeg, audio/wav, application/json',
        },
        body: JSON.stringify({
          text,
          voice,
          speed: 1.0,
        }),
        signal,
      })
      if (!res.ok) {
        const errBody = await res.text().catch(() => '')
        throw new Error(`DeepSeek Web HTTP ${res.status}${errBody ? ': ' + errBody.slice(0, 100) : ''}`)
      }
      const ctype = res.headers && typeof res.headers.get === 'function' ? (res.headers.get('content-type') || '') : ''
      let audio
      let mime = 'audio/mpeg'
      if (ctype.includes('application/json')) {
        const data = await res.json().catch(() => ({}))
        const encoded = (data && (data.audio || data.data)) || ''
        if (!encoded) return { ok: false, provider: 'deepseek-web', reason: 'response missing audio data' }
        audio = Buffer.from(encoded, 'base64')
      } else {
        audio = asBuffer(await readAudioBody(res))
        if (ctype.includes('audio/wav')) mime = 'audio/wav'
      }
      return {
        ok: audio.length > 0,
        provider: 'deepseek-web',
        audio,
        mime,
        reason: audio.length ? '' : 'empty audio',
      }
    } finally {
      cleanup()
    }
  }

  const compatible = {}
  for (const key of Object.keys(OPENAI_COMPATIBLE)) {
    compatible[key] = openaiCompatible(key)
  }

  async function voai() {
    const { signal, cleanup } = withCloudTimeout(Number(cfg.timeoutMs) || 60000)
    try { return await synthesizeVoAI({ cfg, req, resolveKey, fetchImpl, signal }) }
    finally { cleanup() }
  }
  const native = {}
  for (const provider of ['fish', 'cartesia', 'dashscope', 'polly', 'inworld', 'google-cloud']) native[provider] = async () => {
    const key = await resolveKey(keyEnvName(cfg, provider))
    if (!key && !(provider==='google-cloud'&&providerOptions(cfg,provider).auth==='adc')) return { ok: false, provider, reason: 'no ' + keyEnvName(cfg, provider) }
    const { signal, cleanup } = withCloudTimeout(Number(cfg.timeoutMs) || 60000)
    const args = { cfg, req, key, fetchImpl, signal, provider, pollyClientFactory: deps.pollyClientFactory, googleAuthFactory: deps.googleAuthFactory,googleAdcFactory:deps.googleAdcFactory,googleTtsClientFactory:deps.googleTtsClientFactory,WebSocketImpl:deps.platformWebSocket }
    try {
      return await (provider === 'dashscope' ? synthesizeDashScope : provider === 'polly' ? synthesizePolly : provider === 'google-cloud' ? synthesizeGoogleCloud : synthesizeVoicePlatform)(args)
    } finally { cleanup() }
  }
  return { ...native, minimax, voai, openai, elevenlabs, google, azure, groq, deepgram, openrouter, mimo, doubao, 'deepseek-web': deepseekWeb, ...compatible }
}
