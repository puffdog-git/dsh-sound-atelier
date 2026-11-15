let ChevronIcon = null
try {
  const primitives = require('@deepseek-ai/dsh-client-ui-primitives')
  ChevronIcon = primitives && primitives.IconChevronDownOutline14
} catch (noPrimitives) {
  ChevronIcon = null
}
const NS = 'dsh-sound-atelier'
// Plugins page row seat: key = '<package name>#<row id>', row id as cordis.patch.yml declares it.
const PKG = 'dsh-sound-atelier'
const ROW_ID = 'dsh-sound-atelier'
const ROW_CONFIG_KEY = PKG + '#' + ROW_ID
const PROVIDERS = [
  'local-tts',
  'kokoro',
  'f5',
  'fish',
  'cartesia',
  'dashscope',
  'polly',
  'inworld',
  'google-cloud',
  'voai',
  'openai',
  'elevenlabs',
  'google',
  'azure',
  'groq',
  'deepgram',
  'openrouter',
  'siliconflow',
  'deepinfra',
  'fireworks',
  'mimo',
  'doubao',
  'deepseek-web',
  'custom',
  'edge',
  'piper',
  'espeak',
  'minimax',
  'cosyvoice',
]
const CLOUD = {
  'local-tts': 1,
  fish: 1,
  cartesia: 1,
  dashscope: 1,
  polly: 1,
  inworld: 1,
  'google-cloud': 1,
  voai: 1,
  minimax: 1,
  openai: 1,
  elevenlabs: 1,
  google: 1,
  azure: 1,
  groq: 1,
  deepgram: 1,
  openrouter: 1,
  siliconflow: 1,
  deepinfra: 1,
  fireworks: 1,
  mimo: 1,
  doubao: 1,
  'deepseek-web': 1,
  custom: 1,
}
// Official sources checked 2026-11-12. A valid key alone does not grant model access.
const KEY_GUIDES = {
  fish: 'https://docs.fish.audio/developer-guide/getting-started/quickstart',
  cartesia: 'https://docs.cartesia.ai/api-reference/tts/bytes',
  dashscope: 'https://help.aliyun.com/zh/model-studio/qwen-audio-tts-http-api',
  polly: 'https://docs.aws.amazon.com/service-authorization/latest/reference/list_polly.html',
  inworld: 'https://docs.inworld.ai/api-reference/voiceAPI/voiceservice/list-voices',
  'google-cloud': 'https://docs.cloud.google.com/text-to-speech/docs/authentication',
  elevenlabs: 'https://elevenlabs.io/docs/api-reference/authentication',
  openai: 'https://developers.openai.com/api/docs/guides/rbac',
  google: 'https://ai.google.dev/gemini-api/docs/api-key',
  azure: 'https://learn.microsoft.com/en-us/azure/ai-services/speech-service/regions',
  groq: 'https://console.groq.com/docs/model-permissions',
  deepgram: 'https://developers.deepgram.com/guides/deep-dives/working-with-roles',
  openrouter: 'https://openrouter.ai/docs/guides/features/guardrails',
  siliconflow: 'https://docs.siliconflow.cn/docs/userguide/capabilities/text-to-speech',
  deepinfra: 'https://docs.deepinfra.com/account/authentication',
  minimax: 'https://platform.minimax.io/docs/guides/quickstart-preparation',
  mimo: 'https://mimo.mi.com/docs/en-US/quick-start/error-codes',
  doubao: 'https://docs.volcengine.com/docs/doubao-voice/console-guidance?lang=zh',
  voai: 'https://connect.voai.ai/docs/index.html',
  fireworks: 'https://docs.fireworks.ai/accounts/service-accounts',
  'deepseek-web': 'https://github.com/GooDAnDReaDY/dsh-tts',
}
const providerLabel = (t, provider) =>
  ({
    'local-tts': '本機 TTS 服務（Xinference / GPT-SoVITS）',
    kokoro: 'Kokoro（本機 CPU，英文）',
    f5: 'F5-TTS（本機 Xinference）',
    fish: 'Fish Audio',
    cartesia: 'Cartesia',
    dashscope: 'DashScope',
    polly: 'Amazon Polly',
    inworld: 'Inworld AI',
    'google-cloud': 'Google Cloud TTS',
  })[provider] ||
  (provider === 'custom'
    ? t('providerCustomOpenAI')
    : provider === 'deepseek-web'
      ? t('providerDeepSeekWeb')
      : provider)
const credentialLabel = (provider) =>
  ({
    polly: 'catalogAwsCredential',
    'google-cloud': 'catalogGoogleCredential',
    inworld: 'catalogInworldCredential',
    'deepseek-web': 'catalogWebToken',
  })[provider] || 'catalogKey'
// Hints stay generic: concrete provider model IDs rot quickly.
const MODEL_HINT = {
  openai: 'provider default',
  elevenlabs: 'provider default',
  google: 'provider default',
  azure: 'region voice name',
  groq: 'provider default',
  deepgram: 'provider default (English-only voices)',
  openrouter: 'provider/model id',
  siliconflow: 'model id (e.g. FunAudioLLM/CosyVoice2-0.5B)',
  deepinfra: 'model id (e.g. hexgrad/Kokoro-82M)',
  fireworks: 'model id (e.g. kokoro)',
  mimo: 'model id (e.g. mimo-v2.5-tts)',
  doubao: 'seed-tts-2.0 / seed-tts-1.0',
  'deepseek-web': 'web audio model (e.g. deepseek-chat)',
  custom: 'custom model',
  minimax: 'model id',
  cosyvoice: 'model id (e.g. CosyVoice2-0.5B)',
  edge: 'BCP-47 voice, e.g. en-US-AriaNeural',
  piper: 'path to .onnx',
  espeak: 'language code, e.g. en',
  kokoro: '獨立 CPU 推理；請先在聲音管理準備環境',
  f5: '使用 Xinference；需要參考錄音與逐字稿',
}

function clientFetch(url, options) {
  const opts = options || {}
  const timeoutMs = Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : 15000
  const controller = new AbortController()
  let timer = null
  let parentCleanup = null

  const cleanup = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (parentCleanup) {
      parentCleanup()
      parentCleanup = null
    }
  }

  timer = setTimeout(() => {
    try {
      controller.abort()
    } catch {
      /* already aborted */
    }
  }, timeoutMs)
  if (timer && typeof timer.unref === 'function') timer.unref()

  if (opts.signal) {
    if (opts.signal.aborted) {
      controller.abort()
    } else {
      const onAbort = () => {
        try {
          controller.abort()
        } catch {
          /* already aborted */
        }
      }
      opts.signal.addEventListener('abort', onAbort, { once: true })
      parentCleanup = () => {
        try {
          opts.signal.removeEventListener('abort', onAbort)
        } catch {
          /* listener already removed */
        }
      }
    }
  }

  const fetchOpts = Object.assign({}, opts, { signal: controller.signal })
  delete fetchOpts.timeoutMs

  return fetch(url, fetchOpts).then(
    (res) => {
      if (!res.body || res.bodyUsed) {
        cleanup()
        return res
      }
      const wrap = (orig) => {
        if (typeof orig !== 'function') return orig
        return function (...args) {
          return orig.apply(res, args).finally(cleanup)
        }
      }
      res.json = wrap(res.json)
      res.text = wrap(res.text)
      res.blob = wrap(res.blob)
      res.arrayBuffer = wrap(res.arrayBuffer)
      return res
    },
    (err) => {
      cleanup()
      throw err
    },
  )
}

function getModelHint(provider, t) {
  if (typeof t === 'function') {
    const loc = t('modelHint_' + provider)
    if (loc && !loc.startsWith('modelHint_')) return loc
  }
  return MODEL_HINT[provider] || ''
}

function createErrorBoundary() {
  if (!React || typeof React.Component !== 'function') {
    return function NoopBoundary(props) {
      return (props && props.children) || null
    }
  }
  return class ErrorBoundary extends React.Component {
    constructor(props) {
      super(props)
      this.state = { hasError: false, error: null }
    }
    static getDerivedStateFromError(error) {
      return { hasError: true, error }
    }
    componentDidCatch(error, errorInfo) {
      console.error('[dsh-tts] React Error:', error, errorInfo)
    }
    render() {
      if (this.state.hasError) {
        return React.createElement(
          'div',
          {
            className: 'dts-alert dts-alert-err',
            style: { margin: '12px 0', padding: '14px', borderRadius: '8px' },
          },
          React.createElement(
            'div',
            { style: { fontWeight: 600, marginBottom: '6px' } },
            typeof fallbackDockText === 'function' ? fallbackDockText('ttsUiError') : '⚠️ TTS UI Error:',
          ),
          React.createElement(
            'div',
            { style: { fontSize: '12px', wordBreak: 'break-all' } },
            String((this.state.error && this.state.error.message) || this.state.error),
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'dts-btn',
              style: { marginTop: '10px', fontSize: '12px', padding: '4px 10px' },
              onClick: () => this.setState({ hasError: false, error: null }),
            },
            typeof fallbackDockText === 'function' ? fallbackDockText('retry') : 'Retry',
          ),
        )
      }
      return (this.props && this.props.children) || null
    }
  }
}
const ErrorBoundary = createErrorBoundary()
const SNAPSHOT_READY = Object.freeze({ status: 'ready', value: {} })
const SNAPSHOT_LOADING = Object.freeze({ status: 'loading', value: {} })
// 內建音色包：每個風格各有台灣（zh-TW）與大陸（zh-CN）的免金鑰 Edge 中文音色。
const VOICE_PACK_REGIONS = [
  ['zh-TW', '台灣（zh-TW）'],
  ['zh-CN', '大陸（zh-CN）'],
]
const VOICE_PACKS = [
  {
    id: 'narrator',
    name: 'Narrator',
    nameZh: '專業旁白',
    provider: 'edge',
    voices: { 'zh-TW': 'zh-TW-YunJheNeural', 'zh-CN': 'zh-CN-YunyangNeural' },
    rate: 1.0,
    chime: 'ding',
  },
  {
    id: 'buddy',
    name: 'Energetic Buddy',
    nameZh: '活力搭檔',
    provider: 'edge',
    voices: { 'zh-TW': 'zh-TW-HsiaoYuNeural', 'zh-CN': 'zh-CN-XiaoyiNeural' },
    rate: 1.1,
    chime: 'pop',
  },
  {
    id: 'calm',
    name: 'Calm Lecturer',
    nameZh: '沉穩導師',
    provider: 'edge',
    voices: { 'zh-TW': 'zh-TW-HsiaoChenNeural', 'zh-CN': 'zh-CN-XiaoxiaoNeural' },
    rate: 0.95,
    chime: 'subtle',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Terminal',
    nameZh: '賽博終端',
    provider: 'edge',
    voices: { 'zh-TW': 'zh-TW-YunJheNeural', 'zh-CN': 'zh-CN-YunjianNeural' },
    rate: 1.15,
    chime: 'ding',
  },
  {
    id: 'whisper',
    name: 'Quiet / Night Mode',
    nameZh: '溫和夜讀',
    provider: 'edge',
    voices: { 'zh-TW': 'zh-TW-HsiaoChenNeural', 'zh-CN': 'zh-CN-YunxiNeural' },
    rate: 0.9,
    chime: 'none',
  },
]
