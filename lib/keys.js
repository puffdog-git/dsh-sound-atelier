export const CLOUD_PROVIDERS = [
  'local-tts', // Optional credentials for an authenticated loopback service.
  'fish', 'cartesia', 'dashscope', 'polly', 'inworld', 'google-cloud',
  'voai', 'minimax',
  'openai', 'elevenlabs', 'google', 'azure', 'groq', 'deepgram', 'openrouter', 'custom',
  'siliconflow', 'deepinfra', 'fireworks', 'mimo', 'doubao', 'deepseek-web',
]

export const KEY_ENV_FIELD = {
  'local-tts':'localTtsKeyEnv',
  fish: 'fishKeyEnv', cartesia: 'cartesiaKeyEnv', dashscope: 'dashscopeKeyEnv', polly: 'pollyKeyEnv', inworld: 'inworldKeyEnv', 'google-cloud': 'googleCloudKeyEnv',
  voai: 'voaiKeyEnv',
  minimax: 'minimaxKeyEnv',
  openai: 'openaiKeyEnv',
  elevenlabs: 'elevenlabsKeyEnv',
  google: 'googleKeyEnv',
  azure: 'azureKeyEnv',
  groq: 'groqKeyEnv',
  deepgram: 'deepgramKeyEnv',
  openrouter: 'openrouterKeyEnv',
  custom: 'customKeyEnv',
  siliconflow: 'siliconflowKeyEnv',
  deepinfra: 'deepinfraKeyEnv',
  fireworks: 'fireworksKeyEnv',
  mimo: 'mimoKeyEnv',
  doubao: 'doubaoKeyEnv',
  'deepseek-web': 'deepseekWebKeyEnv',
}

export const DEFAULT_KEY_ENV = {
  'local-tts':'LOCAL_TTS_API_KEY',
  fish: 'FISH_AUDIO_API_KEY', cartesia: 'CARTESIA_API_KEY', dashscope: 'DASHSCOPE_API_KEY', polly: 'AWS_POLLY_CREDENTIALS', inworld: 'INWORLD_API_KEY', 'google-cloud': 'GOOGLE_CLOUD_TTS_CREDENTIALS',
  voai: 'VOAI_API_KEY',
  minimax: 'MINIMAX_API_KEY',
  openai: 'OPENAI_API_KEY',
  elevenlabs: 'ELEVENLABS_API_KEY',
  google: 'GEMINI_API_KEY',
  azure: 'AZURE_SPEECH_KEY',
  groq: 'GROQ_API_KEY',
  deepgram: 'DEEPGRAM_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  custom: 'CUSTOM_TTS_API_KEY',
  siliconflow: 'SILICONFLOW_API_KEY',
  deepinfra: 'DEEPINFRA_API_KEY',
  fireworks: 'FIREWORKS_API_KEY',
  mimo: 'MIMO_API_KEY',
  doubao: 'DOUBAO_API_KEY',
  'deepseek-web': 'DEEPSEEK_WEB_TOKEN',
}

const REF_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

export function needsApiKey(provider) {
  if(provider==='local-tts')return false
  return Object.prototype.hasOwnProperty.call(KEY_ENV_FIELD, provider)
}

export function keyEnvName(cfg, provider) {
  const field = KEY_ENV_FIELD[provider]
  if (!field) return ''
  const name = String((cfg && cfg[field]) || '').trim()
  return name || DEFAULT_KEY_ENV[provider] || ''
}

export function assertCredentialRef(ref) {
  if (!REF_PATTERN.test(ref)) {
    throw new Error('credential ref must be an environment variable name')
  }
  return ref
}

/** Drop write-only key material so it never lands in plugin settings. */
export function stripSecretsFromConfig(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {}
  const config = { ...payload }
  delete config.voiceDuplexEnabled
  delete config.messengerTtsEnabled
  delete config.keys
  delete config.credentials
  delete config.revision
  for (const key of Object.keys(config)) {
    if (/KeyEnv$/.test(key)) continue
    if (/(^|.*)(apiKey|api_key|secret|token|password)$/i.test(key) || /Key$/.test(key)) {
      delete config[key]
    }
  }
  return config
}

export function pendingKeyWrites(keys) {
  const out = []
  if (!keys || typeof keys !== 'object') return out
  for (const provider of Object.keys(keys)) {
    if (!Object.hasOwn(KEY_ENV_FIELD,provider)) continue
    const value = typeof keys[provider] === 'string' ? keys[provider].trim() : ''
    if (!value) continue
    out.push({ provider, value })
  }
  return out
}

export function publicConfig(cfg) {
  return stripSecretsFromConfig(cfg)
}
