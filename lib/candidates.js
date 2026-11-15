import { PROVIDER_KEYS, DEFAULT_MODELS, DEFAULT_VOICES } from './providers.js'
import { doubaoSelection } from './providers/doubao.js'
import { dashscopeDefaultVoice } from './providers/dashscope.js'
import { KEY_ENV_FIELD, assertCredentialRef } from './keys.js'
import { deepinfraDefaultVoice } from './providers/deepinfra.js'

const endpoints = { 'local-tts':'localTtsBaseUrl', openai: 'openaiBaseUrl', custom: 'customBaseUrl', voai: 'voaiBaseUrl', doubao: 'doubaoBaseUrl', mimo: 'mimoBaseUrl', deepinfra: 'deepinfraBaseUrl', siliconflow: 'siliconflowBaseUrl', minimax: 'minimaxBaseUrl', cosyvoice: 'cosyvoiceUrl' }

// Each row is an independent attempt, including repeated providers. Old rows
// need no migration: their array position supplies a deterministic identity.
export function chainCandidates(cfg, role) {
  const rows = (cfg.chain || []).filter(e => PROVIDER_KEYS.includes(e.provider)).map(e => ({ ...e }))
  const ov = cfg.roles?.[role] || {}
  if (PROVIDER_KEYS.includes(ov.provider)) rows.unshift({ ...(rows.find(e => e.provider === ov.provider) || {}), provider: ov.provider })
  if (rows[0]) for (const key of ['model', 'voice', 'style']) if (ov[key]) rows[0][key] = ov[key]
  return rows.map((entry, index) => {
    const provider = entry.provider
    let model = entry.model || DEFAULT_MODELS[provider]
    let voice = entry.voice || DEFAULT_VOICES[provider]
    if (provider === 'doubao') ({ model, voice } = doubaoSelection(entry))
    if (!entry.voice) {
      if (provider === 'groq') voice = model === 'canopylabs/orpheus-arabic-saudi' ? 'fahad' : 'hannah'
      if (provider === 'deepinfra') voice = deepinfraDefaultVoice(model)
      if (provider === 'dashscope') voice = dashscopeDefaultVoice(model)
    }
    const config = { ...cfg, chain: [{ ...entry, model, voice }] }
    if(entry.referenceAsset)config.localTtsReferenceAsset=entry.referenceAsset
    if (entry.baseUrl && endpoints[provider]) {
      const url = new URL(entry.baseUrl)
      const protocols = provider === 'doubao' ? ['http:', 'https:', 'ws:', 'wss:'] : ['http:', 'https:']
      if (!protocols.includes(url.protocol) || url.username || url.password || url.search || url.hash) throw Error('Chain endpoint must be a service URL without embedded credentials or query')
      config[endpoints[provider]] = entry.baseUrl.replace(/\/$/, '')
    }
    if (entry.keyEnv && KEY_ENV_FIELD[provider]) config[KEY_ENV_FIELD[provider]] = assertCredentialRef(entry.keyEnv)
    if (entry.options) {
      const all = JSON.parse(cfg.providerOptions || '{}')
      const options = JSON.parse(entry.options)
      if (!options || Array.isArray(options) || typeof options !== 'object') throw Error('Chain entry options must be a JSON object')
      config.providerOptions = JSON.stringify({ ...all, [provider]: { ...all[provider], ...options } })
    }
    return { id: `${index}:${provider}`, provider, model, voice, style: entry.style || '', cfg: config }
  })
}
