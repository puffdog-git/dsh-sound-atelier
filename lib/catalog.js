// Read-only discovery. Credentials and endpoint settings stay on the host.
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { DEFAULT_MODELS, DEFAULT_VOICES, OPENAI_COMPATIBLE, PROVIDER_KEYS } from './providers/constants.js'
import { keyEnvName, needsApiKey } from './keys.js'
import { edgeVoices } from './edge-native.js'
import { parseVoAICatalog, voaiRoot } from './providers/voai.js'
import { DOUBAO_V2_VOICE } from './providers/doubao.js'
import { REALTIME_VOICES, isRealtimeModel } from './providers/openai-realtime.js'
import { QWEN_VOICES, isDeepinfraQwen, DEEPINFRA_SCHEMAS } from './providers/deepinfra.js'
import { MINIMAX_MODELS } from './providers/minimax.js'
import { GROQ_ENGLISH_VOICES, GROQ_ARABIC_VOICES } from './providers/groq.js'
import { elevenLabsError } from './providers/elevenlabs-errors.js'
import { PLATFORM_MODELS, platformPresets, platformVoices } from './providers/platform-catalog.js'
import { providerOptions } from './providers/controls.js'
import { localServiceOperation } from './providers/local-service.js'
import { localServiceKey } from './local-credentials.js'

const execFileAsync = promisify(execFile)
const list = (ids) => ids.map(id => ({ id, name: id }))
const OPENAI_VOICES = 'alloy ash ballad coral echo fable nova onyx sage shimmer verse marin cedar'.split(' ')
const GOOGLE_VOICES = 'Zephyr Puck Charon Kore Fenrir Leda Orus Aoede Callirrhoe Autonoe Enceladus Iapetus Umbriel Algieba Despina Erinome Algenib Rasalgethi Laomedeia Achernar Alnilam Schedar Gacrux Pulcherrima Achird Zubenelgenubi Vindemiatrix Sadachbia Sadaltager Sulafat'.split(' ')
const SF_VOICES = 'alex benjamin charles david anna bella claire diana'.split(' ')
const speechModel = (m) => /tts|cosyvoice|kokoro|orpheus|chatterbox|dia-|aura|speech|gpt-realtime(?!.*(?:transcri|whisper|translate))/i.test(m.id || m.name || '')
const unique = (items) => [...new Map(items.filter(v => v && typeof v.id === 'string' && v.id).map(v => [v.id, v])).values()]

export function normalizeList(data, kind) {
  const rows = Array.isArray(data) ? data : data?.[kind] ?? data?.data?.[kind] ?? data?.data ?? data?.result
  if (!Array.isArray(rows)) throw Object.assign(new Error('Unexpected catalog response'), { code: 'invalid_response' })
  return unique(rows.map(v => {
    if (typeof v === 'string') return { id: v, name: v }
    if (!v || typeof v !== 'object') return null
    const id = v.voice_id || v.model_id || v.uri || v.ShortName || v.id || v.name
    return { id, name: v.LocalName || v.displayName || v.customName || v.voice_name || v.name || id,
      language: v.Locale || v.language || v.labels?.language || '',
      gender: v.Gender || v.gender || v.labels?.gender || '',
      ...(Array.isArray(v.StyleList) ? { styles: v.StyleList.filter(x => typeof x === 'string') } : {}),
      ...(Array.isArray(v.RolePlayList) ? { roles: v.RolePlayList.filter(x => typeof x === 'string') } : {}),
      ...(v.model ? { model: v.model } : {}) }
  }))
}

function presets(provider, model, cfg) {
  if(provider==='local-tts'&&cfg.localTtsBackend==='gpt-sovits')return {models:[{id:'GPT-SoVITS',name:'GPT-SoVITS（模型由原生服務管理）'}],voices:[]}
  if (Object.hasOwn(PLATFORM_MODELS, provider)) return platformPresets(provider, model)
  let models = DEFAULT_MODELS[provider] ? list([DEFAULT_MODELS[provider]]) : []
  let voices = DEFAULT_VOICES[provider] ? list([DEFAULT_VOICES[provider]]) : []
  if (provider === 'openai' && new URL(cfg.openaiBaseUrl || 'https://api.openai.com/v1').hostname === 'api.openai.com') {
    models = list(['gpt-4o-mini-tts', 'tts-1', 'tts-1-hd', 'gpt-realtime-2.1-mini', 'gpt-realtime-2.1'])
    voices = list(isRealtimeModel(model) ? REALTIME_VOICES : /^tts-1/.test(model) ? 'alloy ash coral echo fable onyx nova sage shimmer'.split(' ') : OPENAI_VOICES)
  } else if (provider === 'openai') { models = []; voices = [] }
  if (provider === 'google') { models = list(['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts', 'gemini-2.5-flash-preview-tts', 'gemini-2.5-pro-preview-tts']); voices = list(GOOGLE_VOICES) }
  if (provider === 'deepgram') models = list(['flux-alexis-en', 'aura-2-thalia-en'])
  if (provider === 'groq') {
    models = list(['canopylabs/orpheus-v1-english', 'canopylabs/orpheus-arabic-saudi'])
    voices = list(model === 'canopylabs/orpheus-arabic-saudi' ? GROQ_ARABIC_VOICES : GROQ_ENGLISH_VOICES)
  }
  if (provider === 'minimax') { models = list(MINIMAX_MODELS); voices = list(['English_expressive_narrator']) }
  if (provider === 'cosyvoice') { models = []; voices = cfg.cosyvoiceMode && cfg.cosyvoiceMode !== 'sft' && cfg.cosyvoiceMode !== 'instruct' ? [] : list(['中文女', '中文男']) }
  if (provider === 'elevenlabs') models = list(['eleven_v4', 'eleven_v4_turbo', 'eleven_v3', 'eleven_multilingual_v2', 'eleven_flash_v2_5'])
  if (provider === 'mimo') {
    models = list(['mimo-v2.5-tts', 'mimo-v2.5-tts-voicedesign', 'mimo-v2.5-tts-voiceclone'])
    voices = ['mimo-v2.5-tts-voicedesign', 'mimo-v2.5-tts-voiceclone'].includes(model) ? [] : list(['冰糖', '茉莉', '苏打', '白桦', 'Mia', 'Chloe', 'Milo', 'Dean'])
  }
  if (provider === 'doubao') {
    models = list(['seed-tts-2.0', 'seed-tts-1.0', 'seed-icl-2.0'])
    voices = model === 'seed-icl-2.0' ? [] : list([model === 'seed-tts-1.0' ? 'BV001_streaming' : DOUBAO_V2_VOICE])
  }
  if (provider === 'deepinfra') {
    models = list([...Object.keys(DEEPINFRA_SCHEMAS), 'Qwen/Qwen3-TTS', 'Qwen/Qwen3-TTS-VoiceDesign'])
    if (isDeepinfraQwen(model)) voices = model.endsWith('-VoiceDesign') ? [] : list(QWEN_VOICES)
    else if(DEEPINFRA_SCHEMAS[model||DEFAULT_MODELS.deepinfra]){const p=DEEPINFRA_SCHEMAS[model||DEFAULT_MODELS.deepinfra].properties;voices=list(p.preset_voice?.items?.enum||p.voice?.enum||[])}
  }
  if (provider === 'siliconflow') {
    const selected = model || DEFAULT_MODELS.siliconflow
    voices = /cosyvoice/i.test(selected) ? SF_VOICES.map(id => ({ id: `${selected}:${id}`, name: id, model: selected })) : []
  }
  if (provider === 'edge') {
    models = []
    voices = list(['zh-TW-HsiaoChenNeural', 'zh-TW-HsiaoYuNeural', 'zh-TW-YunJheNeural', 'zh-CN-XiaoxiaoNeural', 'zh-CN-YunxiNeural', 'en-US-AriaNeural', 'en-US-GuyNeural']).map(v => ({ ...v, language: v.id.split('-').slice(0, 2).join('-') }))
  }
  if (['espeak', 'azure'].includes(provider)) models = []
  if (provider === 'piper') { models = []; voices = [] }
  if (provider === 'custom') { models = []; voices = [] }
  return { models, voices }
}

export function createCatalogService({ resolveKey, fetchImpl = fetch, execImpl = execFileAsync, now = Date.now, pollyClientFactory, googleAuthFactory } = {}) {
  const cache = new Map()
  const pending = new Map()
  async function discover(provider, cfg, { model = '', refresh = false } = {}) {
    if (!PROVIDER_KEYS.includes(provider)) throw Object.assign(new Error('Unknown provider'), { code: 'provider' })
    const key = provider==='local-tts'?await localServiceKey(cfg,resolveKey):needsApiKey(provider) ? await resolveKey(keyEnvName(cfg, provider)) : ''
    const cacheKey = createHash('sha256').update(JSON.stringify([provider, model, cfg, key])).digest('hex')
    if (!refresh && cache.has(cacheKey) && cache.get(cacheKey).expires > now()) return { ...cache.get(cacheKey).value, cached: true }
    if (pending.has(cacheKey)) return pending.get(cacheKey)
    const job = load(provider, cfg, model, key).then(value => {
      if (cache.size >= 64) cache.delete(cache.keys().next().value)
      cache.set(cacheKey, { expires: now() + (value.warnings.length ? 15000 : 300000), value })
      return value
    }).finally(() => pending.delete(cacheKey))
    pending.set(cacheKey, job)
    return job
  }

  async function load(provider, cfg, model, key) {
    let base
    try { base = presets(provider, model, cfg) } catch { base = { models: [], voices: [] } }
    const out = { ok: true, provider, ...base, sources: { models: 'preset', voices: 'preset' }, warnings: [], fetchedAt: new Date(now()).toISOString() }
    const fail = (field, err) => out.warnings.push({ field, code: err.code || (err.name === 'TimeoutError' || err.name === 'AbortError' ? 'timeout' : 'unreachable'), ...(err.status ? { status: err.status } : {}), ...(err.upstreamCode ? { upstreamCode: err.upstreamCode } : {}), ...(err.permission ? { permission: err.permission } : {}) })
    const signal = AbortSignal.timeout(10000)
    const json = async (url, headers = {}) => {
      const parsed = new URL(url)
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw Object.assign(new Error('Invalid endpoint'), { code: 'endpoint' })
      const res = await fetchImpl(parsed.href, { headers, signal, redirect: 'error' })
      if (!res.ok) {
        if (provider === 'elevenlabs') throw await elevenLabsError(res, signal)
        await res.body?.cancel?.()
        throw Object.assign(new Error('Catalog request failed'), { status: res.status, code: [401, 403].includes(res.status) ? 'auth' : res.status === 429 ? 'rate_limit' : res.status === 404 ? 'unsupported' : 'http' })
      }
      return res.json()
    }
    const field = async (name, fn, merge = false) => {
      try {
        const items = await fn()
        out[name] = unique(merge ? [...out[name], ...items] : items)
        out.sources[name] = merge && base[name].length ? 'mixed' : 'live'
      } catch (err) { fail(name, err) }
    }
    const bearer = key ? { authorization: `Bearer ${key}` } : {}
    const missingKey = needsApiKey(provider) && !key && provider !== 'custom' && !(provider==='google-cloud'&&providerOptions(cfg,provider).auth==='adc')
    if (missingKey) { fail('all', { code: 'missing_key' }); return out }
    if(provider==='local-tts'){
      if(cfg.localTtsBackend==='gpt-sovits')return out
      await field('models',async()=>{const result=await localServiceOperation({cfg,action:'list',signal,fetchImpl,key});if(!Array.isArray(result.data))throw Error('Invalid local model list');return result.data.filter(m=>!m.model_type||m.model_type==='audio').map(m=>({id:m.id,name:(m.model_name||m.id)+' · '+m.id}))})
      out.voices=[];return out
    }
    if (Object.hasOwn(PLATFORM_MODELS, provider)) {
      try {
        const result = await platformVoices({ provider, cfg, key, model, fetchImpl, signal, pollyClientFactory, googleAuthFactory })
        out.voices = unique(result.voices); out.sources.voices = result.preset ? 'preset' : 'live'
        if (result.partial) fail('voices', { code: 'partial' })
      } catch (err) { fail('voices', err) }
      return out
    }
    if (provider === 'minimax') {
      await field('voices', async () => {
        const url = new URL((cfg.minimaxBaseUrl || 'https://api.minimax.io/v1').replace(/\/+$/, '') + '/get_voice')
        if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw Object.assign(Error('Invalid endpoint'), { code: 'endpoint' })
        const res = await fetchImpl(url.href, { method: 'POST', headers: { ...bearer, 'content-type': 'application/json' }, body: JSON.stringify({ voice_type: 'all' }), signal, redirect: 'error' })
        if (!res.ok) { await res.body?.cancel?.(); throw Object.assign(Error('MiniMax catalog failed'), { status: res.status, code: [401, 403].includes(res.status) ? 'auth' : 'http' }) }
        const data = await res.json()
        if (data.base_resp?.status_code !== 0) throw Object.assign(Error('MiniMax catalog failed'), { code: 'api' })
        return ['system_voice', 'voice_cloning', 'voice_generation'].flatMap(category => normalizeList(data[category] || [], 'voices').map(v => ({ ...v, category })))
      })
    } else if (provider === 'voai') {
      try {
        const result = parseVoAICatalog(await json(voaiRoot(cfg) + '/TTS/GetSpeaker', { 'x-api-key': key }), model)
        Object.assign(out, result, { sources: { models: 'live', voices: 'live' } })
      } catch (err) { fail('all', err) }
    } else if (provider === 'elevenlabs') {
      const headers = { 'xi-api-key': key }
      await Promise.all([
        field('models', async () => normalizeList((await json('https://api.elevenlabs.io/v1/models', headers)).filter(v => v.can_do_text_to_speech === true), 'models')),
        field('voices', async () => {
          const all = []; let token = ''; let hasMore = false
          for (let page = 0; page < 20; page++) {
            const data = await json('https://api.elevenlabs.io/v2/voices?page_size=100' + (token ? '&next_page_token=' + encodeURIComponent(token) : ''), headers)
            all.push(...normalizeList(data, 'voices'))
            hasMore = !!data.has_more; token = data.next_page_token
            if (!hasMore || !token) break
          }
          if (hasMore) fail('voices', { code: 'partial' })
          return all
        }),
      ])
    } else if (provider === 'google') {
      await field('models', async () => {
        const all = []; let token = ''
        for (let page = 0; page < 10; page++) {
          const data = await json('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000' + (token ? '&pageToken=' + encodeURIComponent(token) : ''), { 'x-goog-api-key': key })
          all.push(...normalizeList(data, 'models').map(v => ({ ...v, id: v.id.replace(/^models\//, '') })).filter(speechModel))
          token = data.nextPageToken
          if (!token) break
        }
        if (token) fail('models', { code: 'partial' })
        return all
      })
    } else if (provider === 'azure') {
      if (!/^[a-z0-9-]+$/.test(cfg.azureRegion || '')) { fail('voices', { code: 'region' }); return out }
      await field('voices', async () => normalizeList(await json(`https://${cfg.azureRegion}.tts.speech.microsoft.com/cognitiveservices/voices/list`, { 'Ocp-Apim-Subscription-Key': key }), 'voices'))
    } else if (provider === 'edge' || provider === 'espeak') {
      await field('voices', async () => {
        if (provider === 'edge') {
          try { return await edgeVoices({ fetchImpl, signal: AbortSignal.timeout(5000) }) } catch { /* older endpoint: try configured CLI */ }
        }
        const { stdout } = await execImpl(provider === 'edge' ? cfg.edgeBin || 'edge-tts' : cfg.espeakBin || 'espeak-ng', [provider === 'edge' ? '--list-voices' : '--voices'], { windowsHide: true, timeout: 5000, maxBuffer: 2 * 1024 * 1024, encoding: 'utf8' })
        const lines = stdout.split(/\r?\n/)
        const voices = provider === 'edge' ? lines.flatMap(line => {
          const m = line.trim().match(/^(\S+Neural)\s+(Male|Female)\b/)
          return m ? [{ id: m[1], name: m[1], gender: m[2], language: m[1].split('-').slice(0, 2).join('-') }] : []
        }) : lines.flatMap(line => {
          const m = line.trim().match(/^\d+\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)/)
          return m ? [{ id: m[5], name: m[4], language: m[1], gender: m[2] }] : []
        })
        if (!voices.length) throw Object.assign(new Error('No voices'), { code: 'empty' })
        return voices
      })
    } else if (provider === 'piper') {
      await field('models', async () => {
        const selected = cfg.piperModel
        if (!selected) throw Object.assign(new Error('Model directory required'), { code: 'piper_path' })
        const entries = await readdir(path.dirname(selected), { withFileTypes: true })
        return entries.filter(e => e.isFile() && e.name.endsWith('.onnx')).map(e => ({ id: path.join(path.dirname(selected), e.name), name: e.name }))
      })
    } else if (['openai', 'custom', 'siliconflow', 'deepinfra', 'fireworks', 'groq', 'openrouter', 'mimo'].includes(provider)) {
      const roots = { openai: cfg.openaiBaseUrl || 'https://api.openai.com/v1', custom: cfg.customBaseUrl, groq: 'https://api.groq.com/openai/v1', openrouter: 'https://openrouter.ai/api/v1', mimo: cfg.mimoBaseUrl || 'https://api.xiaomimimo.com/v1' }
      const root = (roots[provider] || cfg[provider + 'BaseUrl'] || OPENAI_COMPATIBLE[provider]?.baseUrl || '').replace(/\/+$/, '')
      if (!root) { fail('all', { code: 'endpoint' }); return out }
      const custom = provider === 'custom' || (provider === 'openai' && !/^https:\/\/api\.openai\.com(?:\/|$)/.test(root))
      await Promise.all([
        field('models', async () => {
          const data = await json(root + '/models' + (provider === 'openrouter' ? '?output_modalities=speech' : ''), bearer)
          const models = normalizeList(data, 'models')
          return custom || provider === 'openrouter' ? models : models.filter(speechModel)
        }),
        ...(custom ? [field('voices', async () => {
          try { return normalizeList(await json(root + '/audio/voices', bearer), 'voices') }
          catch (err) { if (err.status !== 404 && err.status !== 405) throw err }
          return normalizeList(await json(root + '/voices', bearer), 'voices')
        })] : []),
        ...(provider === 'siliconflow' ? [field('voices', async () => normalizeList(await json(root + '/audio/voice/list', bearer), 'voices').filter(v => !v.model || v.model === (model || DEFAULT_MODELS.siliconflow)), true)] : []),
      ])
    } else if (provider === 'doubao') {
      // Presets only: account-specific speakers must be entered from the
      // provider console. Do not label a static list as live discovery.
    } else {
      fail('all', { code: ['kokoro', 'f5'].includes(provider) ? 'runtime' : 'unsupported' })
    }
    return out
  }
  return { discover }
}
