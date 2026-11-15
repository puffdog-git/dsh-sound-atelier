import { boundedJson } from './native-http.js'
import { pollyVoices } from './polly.js'
import { googleCloudHeaders } from './google-cloud.js'
import { DEFAULT_VOICES } from './constants.js'
import { dashscopeVoices } from './dashscope.js'
import { providerOptions } from './controls.js'
export const PLATFORM_MODELS = {
  fish: ['s2.1-pro-free', 's2.1-pro', 's2-pro', 'drama-3'], cartesia: ['sonic-3.6', 'sonic-3.5', 'sonic-3'],
  dashscope: ['qwen-audio-3.1-tts-flash', 'qwen-audio-3.1-tts-plus', 'qwen-audio-3.0-tts-flash', 'qwen-audio-3.0-tts-plus','cosyvoice-v3.5-plus','cosyvoice-v3.5-flash','cosyvoice-v3-plus','cosyvoice-v3-flash','cosyvoice-v2','qwen3-tts-flash'],
  polly: ['standard', 'neural', 'long-form', 'generative'], inworld: ['inworld-tts-2','inworld-tts-2-flash', 'inworld-tts-1.5-max', 'inworld-tts-1.5-mini'], 'google-cloud': ['gemini-2.5-flash-tts','gemini-2.5-pro-tts'],
}
export function platformPresets(provider, model) {
  if (provider === 'dashscope') return { models: PLATFORM_MODELS.dashscope.map(id => ({ id, name: id })), voices: dashscopeVoices(model || undefined) }
  if(provider==='google-cloud')return {models:[{id:'',name:'由音色決定（Standard / WaveNet / Neural2 / Chirp 3 HD）'},...PLATFORM_MODELS[provider].map(id=>({id,name:id}))],voices:/^gemini-.*tts/.test(model||'')?['Kore','Puck','Charon','Fenrir','Aoede','Zephyr','Leda','Orus'].map(id=>({id,name:id})):[{id:DEFAULT_VOICES[provider],name:DEFAULT_VOICES[provider]}]}
  return { models: PLATFORM_MODELS[provider].map(id => ({ id, name: id })), voices: DEFAULT_VOICES[provider] ? [{ id: DEFAULT_VOICES[provider], name: DEFAULT_VOICES[provider] }] : [] }
}
export async function platformVoices({ provider, cfg, key, model, fetchImpl = fetch, signal, pollyClientFactory, googleAuthFactory }) {
  if (provider === 'dashscope') return { voices: dashscopeVoices(model || undefined), preset: true }
  if (provider === 'polly') return pollyVoices({ cfg, key, model, signal, pollyClientFactory })
  const headers = provider === 'google-cloud' ? await googleCloudHeaders(key, signal, googleAuthFactory,providerOptions(cfg,'google-cloud').auth==='adc') : provider === 'inworld' ? { authorization: `Basic ${key}` } : { authorization: `Bearer ${key}`, ...(provider === 'cartesia' ? { 'Cartesia-Version': '2026-08-14' } : {}) }
  const json = async url => boundedJson(provider, await fetchImpl(url, { headers, signal, redirect: 'error' }), signal, 4 * 1024 * 1024)
  if (provider === 'google-cloud') {
    if(/^gemini-.*tts/.test(model||''))return {voices:platformPresets(provider,model).voices,preset:true}
    const data = await json('https://texttospeech.googleapis.com/v1/voices')
    if (!Array.isArray(data.voices)) throw Error('Google Cloud: invalid voice catalog')
    return { voices: data.voices.map(v => ({ id: v.name, name: v.name, language: v.languageCodes?.join(', ') || '', gender: v.ssmlGender || '' })) }
  }
  const voices = []; let token = ''
  const fishSources = provider === 'fish' ? ['self=true', 'licensed=true'] : ['']
  let partial = false
  for (const source of fishSources) {
    token = ''
    for (let page = 1; page <= 20; page++) {
      const url = provider === 'fish' ? `https://api.fish.audio/model?page_size=100&page_number=${page}&${source}` : provider === 'cartesia' ? 'https://api.cartesia.ai/voices?limit=100' + (token ? '&starting_after=' + encodeURIComponent(token) : '') : 'https://api.inworld.ai/voices/v1/voices?pageSize=100' + (token ? '&pageToken=' + encodeURIComponent(token) : '')
      const data = await json(url), rows = provider === 'fish' ? data.items : provider === 'cartesia' ? data.data : data.voices
      if (!Array.isArray(rows)) throw Error(provider + ': invalid voice catalog')
      voices.push(...rows.filter(v => provider !== 'fish' || !v.type || v.type === 'tts').map(v => ({ id: v.voiceId || v._id || v.id, name: v.displayName || v.title || v.name || v.voiceId || v._id || v.id, language: v.languageCode || v.language || v.languages?.join(', ') || v.langCode || '', gender: v.gender || '' })))
      const more = provider === 'fish' ? data.total !== undefined ? page * 100 < data.total : rows.length === 100 : provider === 'cartesia' ? data.has_more : !!data.nextPageToken
      if (!more) break
      const next = provider === 'cartesia' ? data.next_page : provider === 'inworld' ? data.nextPageToken : String(page + 1)
      if (!next || next === token || page === 20) { partial = true; break }
      token = next
    }
  }
  return { voices, partial }
}
