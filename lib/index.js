import {createSpeechService} from './speech-service.js'
import {directionForEngine,supportsInstruction} from './expression.js'
import {createVoiceProfiles} from './voice-profiles.js'
import {createVoiceContext} from './voice-context.js'
import {withSpokenLanguage} from './speech-language.js'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { chainCandidates } from './candidates.js'
import { createSpeechJobs, createPlaybackLeases } from './speech-jobs.js'
import { runChain } from './chain.js'
import { makeProviders, PROVIDER_KEYS, DEFAULT_MODELS, DEFAULT_VOICES } from './providers.js'
import { applyNarrationFilters, applyPronunciation, assistantText, computeAdaptiveRate, detectLang, extractTldr, speechPhrases, splitSentences, splitSentencesWithOffsets, stripForSpeech } from './text.js'
import { cacheKey, createSpeechCache } from './cache.js'
import os from 'node:os'
import path from 'node:path'
import { createModelManager } from './engines/manager.js'
import { registerHttpRoutes } from './routes.js'
import { broadcastStream, clearStreamSubscribers } from './stream-hub.js'
import { writeJson } from './http-util.js'
import { createProviderBreaker } from './breaker.js'
import { voiceTuning } from './tuning.js'
import { providerOptions } from './providers/controls.js'
import { synthesizeDialogue } from './dialogue.js'
import { createLiveSpeech, liveSpeechConfig } from './live-speech.js'
import { createVoiceAssets } from './voice-assets.js'
import { createLocalModelRuntime } from './engines/local-model-runtime.js'
import { createUsageLedger } from './usage-ledger.js'
import { createApprovalNotifications } from './approval-notifications.js'
import {createVoiceModels} from './voice-models.js'
import {createRvcRuntime} from './engines/rvc-runtime.js'
import {createNativeRuntime} from './engines/native-runtime.js'
import {createMaintenanceJobs,installRuntime} from './maintenance-jobs.js'
import {diagnosticReport} from './diagnostics.js'
import {provisionLocal} from './local-provision.js'
import {createSpeechTranslator} from './speech-translation.js'
import { createCloudVoices } from './cloud-voices.js'
import { createKokoroRuntime } from './engines/kokoro-runtime.js'
import { createXinferenceRuntime } from './engines/xinference-runtime.js'
import { voaiTuning } from './providers/voai.js'
import { referenceFingerprint } from './providers/cosyvoice.js'
import { fileFingerprint } from './providers/reference-audio.js'
import { trimReplayWindow } from './replay-window.js'
import { ensureFfmpeg } from './ffmpeg-ensure.js'
import {
  CLOUD_PROVIDERS,
  assertCredentialRef,
  keyEnvName,
  needsApiKey,
  pendingKeyWrites,
  publicConfig,
  stripSecretsFromConfig,
} from './keys.js'

// Scoped identity matching package.json and cordis.patch.yml
export const name = 'dsh-sound-atelier'
export const inject = ['tools', 'credentials', 'llm', 'webServer']

// 設定命名空間等於 DSH 的列 ID。改名前是 'dsh-tts'（下面的 LEGACY_NAMES 仍認得）。
const NS = 'dsh-sound-atelier'

const ChainEntry = z.object({
  referenceAsset:z.string().default(''),
  baseUrl: z.string().default(''),
  keyEnv: z.string().default(''),
  options: z.string().default(''),
  style: z.string().default(''),
  provider: z.string().default('espeak')
    .description(`Provider key. One of: ${PROVIDER_KEYS.join(', ')}.`),
  model: z.string().default('')
    .description('Model override. Empty means the provider default.'),
  voice: z.string().default('')
    .description('Voice override. Empty means the provider default.'),
})

const RoleOverride = z.object({
  style: z.string().default(''),
  voaiPitch: z.number().min(-5).max(5).default(0),
  doubaoPitch: z.number().min(-12).max(12).default(0),
  styleWeight: z.number().min(0).max(1).default(0.5),
  breathPause: z.number().min(0).max(10).default(0),
  provider: z.string().default(''),
  model: z.string().default(''),
  voice: z.string().default(''),
  chime: z.string().default(''),
  ssmlStyle: z.string().default(''),
  instruction: z.string().default(''),
  voiceDesign: z.string().default(''),
  tuningEnabled: z.boolean().default(false),
  rate: z.number().min(0.5).max(2).default(1),
  pitch: z.number().min(-50).max(50).default(0),
  volume: z.number().min(0).max(1).default(1),
})

// Unwrap Volatile boxes before any caller reads a value. A volatile field holds a
// box rather than its value, and the Loader mutates those boxes in place.
export function plainConfig(value) {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(plainConfig)
  if (typeof value.get === 'function') return plainConfig(value.get())
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, plainConfig(v)]))
}

export const Config = z.object({
  speakReplies: z.boolean().volatile().default(false)
    .description('When on, speak each finished agent reply in the Web UI.'),
  enableLocalEngines: z.boolean().volatile().default(false)
    .description('已無作用：本機引擎是否使用由服務順序決定。保留此鍵只為了相容舊設定檔。'),
  localTtsBackend:z.string().volatile().default('xinference'),
  localTtsBaseUrl:z.string().volatile().default('http://127.0.0.1:9997'),
  localTtsFamily:z.string().volatile().default(''),
  localTtsReferenceAsset:z.string().volatile().default(''),
  localTtsKeyEnv:z.string().volatile().default('LOCAL_TTS_API_KEY'),
  localTtsPromptLanguage:z.string().volatile().default('zh'),
  localTtsLanguage:z.string().volatile().default('auto'),
  localTtsIdleSeconds:z.number().min(0).max(86400).volatile().default(300),
  localTtsDevice:z.union(['cpu','cuda:0']).volatile().default('cpu'),
  localTtsModelPath:z.string().volatile().default(''),
  localTtsNativeModel:z.string().volatile().default('dots-studio/dots.tts-mf'),
  localTtsNativeTrusted:z.boolean().volatile().default(false),
  localTtsEmotionAsset:z.string().volatile().default(''),
  textMode:z.union(['clean','raw']).volatile().default('clean'),
  personaAdapter:z.string().volatile().default('auto'),
  spokenLanguage:z.union(['original','ja']).volatile().default('original'),
  translationModel:z.string().volatile().default(''),
  translationGlossary:z.string().volatile().default('{}'),
  translationMaxTokens:z.number().min(256).max(12000).volatile().default(4096),
  announceApprovalDecided:z.boolean().volatile().default(false),
  approvalDecidedText:z.string().volatile().default('已收到批准決定'),
  approvalInterrupt:z.boolean().volatile().default(true),
  rvcEnabled:z.boolean().volatile().default(false),
  rvcManaged:z.boolean().volatile().default(true),
  rvcBaseUrl:z.string().volatile().default('http://127.0.0.1:4892'),
  rvcDevice:z.union(['cpu','cuda:0']).volatile().default('cpu'),
  rvcModelAsset:z.string().volatile().default(''),
  rvcIndexAsset:z.string().volatile().default(''),
  rvcOptions:z.string().volatile().default('{}'),
  rvcBypassOnFailure:z.boolean().volatile().default(false),
  kokoroEnabled: z.boolean().volatile().default(false)
    .description('已無作用：在服務順序選 Kokoro 即可。保留此鍵只為了相容舊設定檔。'),
  f5Enabled: z.boolean().volatile().default(false)
    .description('已無作用：在服務順序選 F5 即可。保留此鍵只為了相容舊設定檔。'),
  streamingEnabled: z.boolean().volatile().default(true)
    .description('Deliver completed speech pieces over SSE while the rest of a reply is synthesized.'),
  skipCode: z.boolean().volatile().default(true)
    .description('Replace fenced code blocks with a short spoken notice instead of reading them aloud.'),
  skipTables: z.boolean().volatile().default(true)
    .description('Replace tables with a short spoken notice instead of reading cells.'),
  cleanUrls: z.boolean().volatile().default(true)
    .description('Replace long web links with clean domain names.'),
  keepInlineCode: z.boolean().volatile().default(false)
    .description('Speak text inside inline code backticks instead of dropping it.'),
  adaptiveRate: z.boolean().volatile().default(false)
    .description('Automatically increase speech rate for long responses.'),
  tldrDefault: z.boolean().volatile().default(false)
    .description('Speak only the summary or conclusion section of the response by default.'),
  cache: z.boolean().volatile().default(true)
    .description('Reuse synthesized audio for repeated phrases instead of paying and waiting again.'),
  cacheMaxMb: z.number().volatile().default(100)
    .description('Disk limit for the synthesis cache; least recently used items are evicted first.'),
  narrateQuotesOnly: z.boolean().volatile().default(false)
    .description('Speak only quoted fragments.'),
  skipActions: z.boolean().volatile().default(false)
    .description('Drop *asterisk action* blocks instead of reading them.'),
  removeRegex: z.string().volatile().default('')
    .description('Custom global regex whose matches are removed before synthesis.'),
  autoDetect: z.boolean().volatile().default(false)
    .description('Guess ru/en per spoken piece instead of using the language setting.'),
  customBaseUrl: z.string().volatile().default('')
    .description('Origin of an OpenAI-compatible /audio/speech endpoint; empty skips it.'),
  customKeyEnv: z.string().volatile().default('CUSTOM_TTS_API_KEY'),
  pronunciation: z.array(z.object({
    from: z.string().default(''),
    to: z.string().default(''),
    whole: z.boolean().default(false),
    lang: z.string().default(''),
  })).volatile().default([])
    .description('Say this instead of that. Applied top-down; /regex/ form allowed in from.'),
  enableItDictionary: z.boolean().volatile().default(true)
    .description('Auto-correct common IT terminology pronunciation (SQL, Nginx, K8s, etc.).'),
  longReply: z.string().volatile().default('truncate')
    .description('What to do when a reply exceeds the length limit.'),
  summaryModel: z.string().volatile().default('')
    .description('provider/model for the spoken retelling; empty uses the conversation default.'),
  summarySentences: z.number().volatile().default(3)
    .description('Sentences in the spoken retelling.'),
  roles: z.dict(RoleOverride).volatile().default({
    reply: { provider: '', model: '', voice: '', chime: '', ssmlStyle: '' },
    approval: { provider: '', model: '', voice: '', chime: '', ssmlStyle: '' },
    error: { provider: '', model: '', voice: '', chime: '', ssmlStyle: '' },
  })
    .description('Per-role and subagent overrides; empty fields inherit the main chain.'),
  eventChimes: z.object({
    onTurnComplete: z.string().default('ding'),
    onApprovalRequired: z.string().default('pop'),
    onError: z.string().default('none'),
    onSubagentStart: z.string().default('none'),
    onSubagentDone: z.string().default('ding'),
  }).volatile().default({
    onTurnComplete: 'ding',
    onApprovalRequired: 'pop',
    onError: 'none',
    onSubagentStart: 'none',
    onSubagentDone: 'ding',
  }).description('Chime sounds for agent lifecycle events.'),
  vadBargeIn: z.boolean().volatile().default(true)
    .description('Mute speech synthesis immediately when voice activity is detected.'),
  autoDetectSubagent: z.boolean().volatile().default(true)
    .description('Auto-detect subagent roles in multi-agent sessions and route to dedicated voice profiles.'),
  language: z.string().volatile().default('zh-TW'),
  speakAsItGoes: z
    .boolean()
    .volatile()
    .description('Speak each reply as it lands instead of waiting for the whole turn to finish. '
      + 'Long answers start sounding almost at once because they are synthesized sentence by sentence.')
    .default(true),
  sentenceChars: z
    .number()
    .step(1)
    .min(10)
    .volatile()
    .description('Upper bound of one spoken piece when speaking as it goes.')
    .default(320),
  adaptiveChunks:z.boolean().volatile().default(true),
  rate: z
    .number()
    .min(0.1)
    .max(5)
    .volatile()
    .description('Playback speed, 0.5 to 2. Synthesis is untouched; the browser plays faster or slower.')
    .default(1),
  pitch: z.number().min(-50).max(50).volatile().default(0),
  speechInstruction: z.string().volatile().default(''),
  fishKeyEnv: z.string().volatile().default('FISH_AUDIO_API_KEY'),
  cartesiaKeyEnv: z.string().volatile().default('CARTESIA_API_KEY'),
  dashscopeKeyEnv: z.string().volatile().default('DASHSCOPE_API_KEY'),
  pollyKeyEnv: z.string().volatile().default('AWS_POLLY_CREDENTIALS'),
  inworldKeyEnv: z.string().volatile().default('INWORLD_API_KEY'),
  googleCloudKeyEnv: z.string().volatile().default('GOOGLE_CLOUD_TTS_CREDENTIALS'),
  dashscopeRegion: z.union(['cn-beijing', 'ap-southeast-1']).volatile().default('cn-beijing'),
  dashscopeWorkspace: z.string().volatile().default(''),
  pollyRegion: z.string().volatile().default('us-east-1'),
  providerOptions: z.string().volatile().default('{}').description('Provider synthesis controls as JSON, separate from playback tuning. See PROVIDER-CONTROLS.md.'),
  mimoInstruction: z.string().volatile().default(''),
  doubaoInstruction: z.string().volatile().default(''),
  doubaoPitch: z.number().min(-12).max(12).volatile().default(0),
  mimoVoiceDesign: z.string().volatile().default(''),
  mimoReferencePath: z.string().volatile().default(''),
  siliconflowVoiceMode: z.union(['preset', 'reference']).volatile().default('preset'),
  siliconflowReferencePath: z.string().volatile().default(''),
  siliconflowReferenceText: z.string().volatile().default(''),
  deepinfraVoiceDesign: z.string().volatile().default(''),
  deepinfraBaseUrl: z.string().volatile().default('https://api.deepinfra.com/v1/openai'),
  voaiPitch: z.number().min(-5).max(5).volatile().default(0),
  styleWeight: z.number().min(0).max(1).volatile().default(0.5),
  breathPause: z.number().min(0).max(10).volatile().default(0),
  voaiKeyEnv: z.string().volatile().default('VOAI_API_KEY'),
  voaiBaseUrl: z.string().volatile().default('https://connect.voai.ai'),
  volume: z.number().min(0).max(1).volatile().default(1),
  bargeIn: z
    .boolean()
    .volatile()
    .description('Fall silent the moment the microphone opens. Listening to a reply and talking over it '
      + 'at the same time does not work, and the reply would be recorded along with the voice.')
    .default(true),
  duckOnTyping: z
    .string()
    .volatile()
    .description('Playback response when user types in chat input: duck (lower volume to 20%), pause, stop, or off.')
    .default('duck'),
  announceApproval: z
    .boolean()
    .volatile()
    .description('Say out loud when the agent stops and waits for an approval, and play a short chime. '
      + 'Useful when you walk away from a long run.')
    .default(true),
  approvalText: z
    .string()
    .volatile()
    .description('What to say when an approval is asked for. The tool name is appended.')
    .default('需要你的批准'),
  questionText: z
    .string()
    .volatile()
    .description('What to say when the agent asks a question. Empty disables it.')
    .default('助理有問題想問你'),
  chime: z
    .string()
    .volatile()
    .description('Short sound before an announcement: ding, beep or none.')
    .default('ding'),
  maxChars: z.number().step(1).min(0).volatile().default(4000)
    .description('Longer replies are truncated before synthesis.'),
  chain: z.array(ChainEntry).volatile()
    .default([
      { provider: 'edge', model: '', voice: 'zh-TW-HsiaoChenNeural' },
      { provider: 'piper', model: '', voice: '' },
      { provider: 'espeak', model: '', voice: 'en' },
    ])
    .description('Fallback chain. Order is the order of attempts. A provider without a key is skipped.'),
  openaiKeyEnv: z.string().volatile().default('OPENAI_API_KEY'),
  openaiBaseUrl: z.string().volatile().default('https://api.openai.com/v1'),
  elevenlabsKeyEnv: z.string().volatile().default('ELEVENLABS_API_KEY'),
  googleKeyEnv: z.string().volatile().default('GEMINI_API_KEY'),
  azureKeyEnv: z.string().volatile().default('AZURE_SPEECH_KEY'),
  azureRegion: z.string().volatile().default('')
    .description('Azure Speech region, e.g. eastus. Required for the azure provider.'),
  mimoKeyEnv: z.string().volatile().description('Credential holding the Xiaomi MiMo key.').default('MIMO_API_KEY'),
  mimoBaseUrl: z.string().volatile().description('MiMo API root. Synthesis goes through its chat endpoint.').default('https://api.xiaomimimo.com/v1'),
  mimoFormat: z.string().volatile().description('MiMo output format: mp3, wav, pcm or pcm16. PCM is wrapped as WAV for playback.').default('mp3'),
  doubaoKeyEnv: z.string().volatile().description('Credential holding the Doubao (Volcengine) API key.').default('DOUBAO_API_KEY'),
  doubaoAppId: z.string().volatile().description('Volcengine TTS App ID.').default(''),
  doubaoCluster: z.string().volatile().description('Volcengine TTS Cluster.').default('volcano_tts'),
  doubaoBaseUrl: z.string().volatile().description('Doubao TTS endpoint URL. Empty selects V3 for 2.0 or V1 for legacy voices.').default(''),
  deepseekWebKeyEnv: z.string().volatile().description('Credential holding DeepSeek user session token.').default('DEEPSEEK_WEB_TOKEN'),
  deepseekWebBaseUrl: z.string().volatile().description('DeepSeek Web Audio endpoint or bridge URL.').default('https://chat.deepseek.com/api/v0/chat/voice'),
  cosyvoiceUrl: z.string().volatile().description('CosyVoice local service URL.').default('http://127.0.0.1:9233'),
  minimaxTransport: z.union(['auto', 'http', 'cli']).volatile().default('auto'),
  minimaxKeyEnv: z.string().volatile().default('MINIMAX_API_KEY'),
  minimaxBaseUrl: z.string().volatile().default('https://api.minimax.io/v1'),
  cosyvoiceApiMode: z.union(['auto', 'official', 'bridge']).volatile().default('auto'),
  cosyvoiceMode: z.union(['sft', 'instruct', 'instruct2', 'zero-shot', 'cross-lingual']).volatile().default('sft'),
  cosyvoiceSampleRate: z.number().min(8000).max(48000).step(1).volatile().default(24000),
  cosyvoiceReferencePath: z.string().volatile().default(''),
  cosyvoiceReferenceText: z.string().volatile().default(''),
  minimaxBin: z.string().volatile()
    .description('MiniMax CLI, looked up in PATH unless absolute. Install and log in separately; '
      + 'without it the provider declines and the chain moves on.')
    .default('mmx'),
  siliconflowKeyEnv: z.string().volatile().description('Credential holding the SiliconFlow key.').default('SILICONFLOW_API_KEY'),
  deepinfraKeyEnv: z.string().volatile().description('Credential holding the DeepInfra key.').default('DEEPINFRA_API_KEY'),
  fireworksKeyEnv: z.string().volatile().description('Credential holding the Fireworks key.').default('FIREWORKS_API_KEY'),
  groqKeyEnv: z.string().volatile().default('GROQ_API_KEY'),
  deepgramKeyEnv: z.string().volatile().default('DEEPGRAM_API_KEY'),
  openrouterKeyEnv: z.string().volatile().default('OPENROUTER_API_KEY'),
  edgeBin: z.string().volatile().default('edge-tts')
    .description('edge-tts CLI. Looked up in PATH unless an absolute path is given.'),
  piperBin: z.string().volatile().default('piper'),
  piperModel: z.string().volatile().default('')
    .description('Path to a Piper ONNX model. The piper provider is skipped while this is empty.'),
  espeakBin: z.string().volatile().default('espeak-ng'),
  timeoutMs: z.number().step(1).min(1000).volatile().default(60000),
  maxQueue: z.number().step(1).min(0).volatile().default(8)
    .description('Synthesis queue budget (up to four parallel requests). Zero disables automatic speech. Completed audio has a separate replay window.'),
})

const LEGACY_NAMES = ['dsh-sound-atelier', 'goodandready/dsh-tts', 'dsh-tts', '@goodandready/dsh-tts']
export function extractRevision(desc, targetNs = NS) {
  if (!desc) return undefined
  if (typeof desc.revision === 'number' || typeof desc.revision === 'string') {
    return desc.revision
  }
  let list = null
  if (Array.isArray(desc)) {
    list = desc
  } else if (Array.isArray(desc.namespaces)) {
    list = desc.namespaces
  } else if (Array.isArray(desc.entries)) {
    list = desc.entries
  }
  if (list) {
    const match = list.find((item) => {
      if (!item || typeof item !== 'object') return false
      const name = item.name || item.id || item.ns || item.namespace || item.key
      return name === targetNs || LEGACY_NAMES.includes(name)
    })
    if (match && (typeof match.revision === 'number' || typeof match.revision === 'string')) {
      return match.revision
    }
    if (list.length === 1 && (typeof list[0].revision === 'number' || typeof list[0].revision === 'string')) {
      return list[0].revision
    }
  }
  if (typeof desc === 'object') {
    for (const k of [targetNs, ...LEGACY_NAMES]) {
      if (desc[k] && (typeof desc[k].revision === 'number' || typeof desc[k].revision === 'string')) {
        return desc[k].revision
      }
    }
  }
  return undefined
}

let utteranceSeq = 0

export function cleanOpts(cfg, overrides = {}) {
  return {
    skipCode: overrides.skipCode !== undefined ? overrides.skipCode : cfg.skipCode !== false,
    skipTables: overrides.skipTables !== undefined ? overrides.skipTables : cfg.skipTables !== false,
    cleanUrls: overrides.cleanUrls !== undefined ? overrides.cleanUrls : cfg.cleanUrls !== false,
    keepInlineCode: overrides.keepInlineCode !== undefined ? overrides.keepInlineCode : cfg.keepInlineCode === true,
    tldrOnly: overrides.tldrOnly !== undefined ? overrides.tldrOnly : cfg.tldrDefault === true,
    phrases: speechPhrases(cfg.language),
  }
}

export function cleanText(raw, cfg, maxChars = 0, overrides = {}) {
  raw=String(raw||'').replace(/(?:^|\n)\s*<speech_meta>\s*\{[\s\S]*?<\/speech_meta>\s*$/gi,'')
  if((overrides.textMode||cfg.textMode)==='raw')return String(raw||'').slice(0,maxChars>0?maxChars:undefined)
  return applyPronunciation(
    applyNarrationFilters(stripForSpeech(raw, maxChars, cleanOpts(cfg, overrides)), cfg),
    cfg.pronunciation,
    cfg.language,
    cfg.enableItDictionary !== false,
  )
}

export async function prepareSpeechText(raw, cfg, signal, overrides = {}, summarizeFn = null) {
  let sourceText = raw
  const wantTldr = overrides.tldrOnly !== undefined ? overrides.tldrOnly : cfg.tldrDefault
  if (wantTldr) {
    sourceText = extractTldr(sourceText, cfg.language)
  }
  let text = cleanText(sourceText, cfg, 0, overrides)
  if (!text) return ''
  const maxChars = Number(cfg.maxChars) > 0 ? Number(cfg.maxChars) : 0
  const overLimit = maxChars > 0 && text.length > maxChars
  if (overLimit && cfg.longReply !== 'full') {
    if (cfg.longReply === 'summarize' && typeof summarizeFn === 'function') {
      try {
        const retold = await summarizeFn(text.slice(0, 8000), cfg, signal)
        if (retold) {
          return speechPhrases(cfg.language).summaryIntro + ' ' + retold
        }
      } catch (_err) { /* quiet fallback to truncation */ }
    }
    return text.slice(0, maxChars)
  }
  return text
}

const SPEECH_EVENT_TYPES = new Set(['assistant/message', 'turn/end', 'approval/asked', 'approval/decided', 'question/requested'])

export function apply(ctx, config) {
  // 市集安裝不會執行依賴的安裝腳本，FFmpeg 可能還沒下載；背景補一次，不擋啟動。
  ensureFfmpeg().then((state) => {
    if (state.downloaded) console.info('[dsh-sound-atelier] 已下載音訊處理需要的 FFmpeg')
    else if (!state.ok) console.warn('[dsh-sound-atelier] 找不到 FFmpeg，音訊轉檔暫時無法使用：' + (state.error || state.reason))
  })
  const providerBreaker = createProviderBreaker()

  const live = () => {
    const fromBoxes = plainConfig(config)
    return plainConfig(Config(fromBoxes))
  }

  const settingsApi = {
    get: () => live(),
    replace: async (next, expectedRevision) => {
      const plain = plainConfig(next)
      delete plain.revision
      const svc = ctx?.get?.('settings') ?? ctx?.settings ?? ctx?.get?.('settingsForms') ?? ctx?.settingsForms
      if (!svc) {
        throw new Error('Settings service is unavailable')
      }
      let rev = expectedRevision
      if (rev === undefined && typeof svc.describe === 'function') {
        try {
          const desc = await svc.describe(NS)
          rev = extractRevision(desc, NS)
        } catch (_err) {
          // ignore describe error
        }
      }
      if (typeof svc.replace === 'function') {
        await svc.replace(NS, plain, rev)
      } else if (typeof svc.update === 'function') {
        await svc.update(NS, plain, rev)
      } else {
        throw new Error('Settings service does not support replace or update')
      }

      // Mutate volatile boxes directly so runtime dynamically reflects new settings (#152)
      if (config && typeof config === 'object') {
        for (const [k, v] of Object.entries(plain)) {
          if (config[k] && typeof config[k] === 'object') {
            const sym = Object.getOwnPropertySymbols(config[k]).find((s) => String(s).includes('volatile.write'))
            if (sym && typeof config[k][sym] === 'function') {
              try { config[k][sym](v) } catch (_wErr) { /* best effort */ }
            } else if ('value' in config[k]) {
              config[k].value = v
            }
          } else if (config[k] !== undefined) {
            config[k] = v
          }
        }
      }
      return plain
    },
  }

  // settings.register was removed before 0.1.7-rc.2. The host hands the profile entry
  // config to apply() directly; live() below re-resolves it through the schema and
  // unwraps, so the Loader's in-place box updates are picked up without a service.

  const pending = []
  const collectors = new Map(),preparations=new Map()
  function cancelPreparations(sid){for(const controller of preparations.get(sid)||[])controller.abort();preparations.delete(sid);collectors.delete(sid)}
  function retainPreparation(sid,controller){const group=preparations.get(sid)||new Set();group.add(controller);preparations.set(sid,group);return()=>{group.delete(controller);if(!group.size&&preparations.get(sid)===group)preparations.delete(sid)}}

  const modelManager = createModelManager({
    root: process.env.DSH_HOME || path.join(os.homedir(), '.dsh'),
  })
  const voiceAssets=createVoiceAssets()
  const voiceModels=createVoiceModels(),rvcRuntime=createRvcRuntime({models:voiceModels})
  const nativeRuntime=createNativeRuntime(),maintenanceJobs=createMaintenanceJobs()
  const voiceProfiles=createVoiceProfiles(),voiceContext=createVoiceContext({ctx,profiles:voiceProfiles})
  const kokoroRuntime=createKokoroRuntime()
  const xinferenceRuntime=createXinferenceRuntime()
  const localModelRuntime=createLocalModelRuntime({resolveKey}),usageLedger=createUsageLedger(),approvalNotifications=createApprovalNotifications()

  async function resolveKey(ref) {
    try {
      const resolved = await ctx.credentials.resolve(credentialRef(ref))
      if (resolved && resolved.value) return resolved.value
    } catch (_err) { /* fall through to env */ }
    return process.env[ref] || ''
  }

  async function describeProvider(provider) {
    const ref = keyEnvName(live(), provider)
    const base = { provider, ref, configured: false, writable: true }
    if (!ref) return base
    try {
      if (typeof ctx.credentials.describe === 'function') {
        const d = await ctx.credentials.describe(credentialRef(ref))
        return {
          provider,
          ref,
          configured: !!(d && d.configured),
          writable: d && d.writable === false ? false : true,
        }
      }
      const resolved = await ctx.credentials.resolve(credentialRef(ref))
      return { provider, ref, configured: !!(resolved && resolved.value), writable: true }
    } catch (_err) {
      return base
    }
  }

  async function credentialsView() {
    const out = {}
    for (const provider of CLOUD_PROVIDERS) {
      out[provider] = await describeProvider(provider)
    }
    return out
  }

  async function storeProviderKey(provider, value) {
    if (!needsApiKey(provider)&&provider!=='local-tts') {
      throw new Error(`${provider} does not take an API key`)
    }
    const trimmed = String(value || '').trim()
    if (!trimmed) {
      throw new Error('an empty key cannot be stored')
    }
    if (typeof ctx.credentials.set !== 'function') {
      throw new Error('no credentials service is mounted')
    }
    const ref = assertCredentialRef(keyEnvName(live(), provider))
    await ctx.credentials.set(credentialRef(ref), trimmed)
    return ref
  }

  async function clearProviderKey(provider) {
    if (!needsApiKey(provider)&&provider!=='local-tts') {
      throw new Error(`${provider} does not take an API key`)
    }
    if (typeof ctx.credentials.unset !== 'function') {
      throw new Error('no credentials service is mounted')
    }
    const ref = assertCredentialRef(keyEnvName(live(), provider))
    await ctx.credentials.unset(credentialRef(ref))
    return ref
  }

  async function configResponse() {
    let revision = null
    const svc = ctx?.get?.('settings') ?? ctx?.settings ?? ctx?.get?.('settingsForms') ?? ctx?.settingsForms
    if (svc && typeof svc.describe === 'function') {
      try {
        const desc = await svc.describe(NS)
        revision = extractRevision(desc, NS) ?? null
      } catch (_err) {
        // best effort describe
      }
    }
    return {
      ok: true,
      config: publicConfig(live()),
      speechApi:{version:1,endpoint:'/dsh-sound-atelier/synthesize',streamEndpoint:'/dsh-sound-atelier/speech/stream',contextRouting:true,expression:true},
      credentials: await credentialsView(),
      revision,
    }
  }

  const llm = ctx.llm

  // In-memory synthesis counters; reset on restart or DELETE /stats.
  const stats = { total: 0, cacheHits: 0, errors: 0, providers: {} }

  // In-flight synthesis deduplication (cache-stampede protection)

  // Synthesis cache lives next to other harness data.
  const speechCache = createSpeechCache({
    root: process.env.DSH_HOME || path.join(os.homedir(), '.dsh'),
    maxBytes: () => {
      const mb = Number(live().cacheMaxMb)
      return mb > 0 ? mb * 1024 * 1024 : 100 * 1024 * 1024
    },
  })
  // Cache only short repeatable phrases; long unique streaming chunks skip the cache.
  // Otherwise the cache fills with garbage that never repeats.
  const CACHE_MAX_TEXT = 200

  // Canonical text preparation (#156, #157): delegates to exported prepareSpeechText
  const speechTranslator=createSpeechTranslator({llm})
  async function prepareSpokenText(text,cfg,signal,provided){
    delete cfg._speechSourceText;delete cfg._speechTarget;delete cfg._translationOrigin
    const result=await speechTranslator.translate(text,cfg,signal,{spokenText:provided})
    if(result.translated){cfg._speechSourceText=result.sourceText;cfg._speechTarget=result.language;cfg._translationOrigin=result.origin}
    return result.text
  }
  const prepareSpeechTextBound = async(raw,cfg,signal,overrides={})=>{
    if(!cfg._voiceResolved)Object.assign(cfg,await voiceContext.resolve(cfg,{sessionId:cfg._sessionId,workspaceId:cfg._workspaceId,profileId:cfg._requestedProfileId},signal))
    return prepareSpokenText(await prepareSpeechText(raw,cfg,signal,overrides,summarizeReply),cfg,signal,cfg._providedSpokenText)
  }

  function synthesisFingerprint(text, provider, model, voice, role, ssmlStyle, cfg, lang) {
    const credRef = needsApiKey(provider) ? (keyEnvName(cfg, provider) || '') : ''
    const parts = [text, provider, model || '', voice || '', role || '', ssmlStyle || '', lang || '', credRef, cfg.speechInstruction || '', cfg.providerOptions || '{}', cfg.roles?.[role]?.instruction || '',cfg._speechTarget||'']
    if (['edge', 'azure'].includes(provider)) parts.push(voiceTuning(cfg, role).pitch)
    if (provider === 'voai') parts.push(cfg.voaiBaseUrl, JSON.stringify(voaiTuning(cfg, role)), cfg.roles?.[role]?.style || cfg.chain?.find(e => e.provider === 'voai')?.style || '')
    if (provider === 'doubao') parts.push(cfg.doubaoBaseUrl, cfg.doubaoInstruction, cfg.doubaoPitch, cfg.roles?.[role]?.instruction, cfg.roles?.[role]?.doubaoPitch, cfg.roles?.[role]?.tuningEnabled)
    if (provider === 'deepinfra') parts.push(cfg.deepinfraBaseUrl, cfg.deepinfraVoiceDesign, cfg.roles?.[role]?.voiceDesign)
    if (provider === 'dashscope') parts.push(cfg.dashscopeRegion, cfg.dashscopeWorkspace)
    if (provider === 'polly') parts.push(cfg.pollyRegion)
    if (provider === 'siliconflow') parts.push(cfg.siliconflowBaseUrl, cfg.siliconflowVoiceMode, cfg.siliconflowReferencePath, cfg.siliconflowReferenceText, cfg._siliconflowReferenceFingerprint)
    if (provider === 'minimax') parts.push(cfg.minimaxBaseUrl, cfg.minimaxTransport, cfg.minimaxBin)
    if (provider === 'cosyvoice') parts.push(cfg.cosyvoiceUrl, cfg.cosyvoiceApiMode, cfg.cosyvoiceMode, cfg.cosyvoiceSampleRate, cfg.cosyvoiceReferencePath, cfg.cosyvoiceReferenceText, cfg._cosyvoiceReferenceFingerprint)
    if (provider === 'custom') parts.push(cfg.customBaseUrl || '')
    if (['local-tts','f5'].includes(provider)) parts.push(cfg.localTtsBaseUrl,cfg.localTtsBackend,cfg.localTtsFamily,cfg.localTtsReferenceAsset,cfg.localTtsPromptLanguage,cfg.localTtsLanguage,cfg.localTtsKeyEnv,cfg.localTtsModelPath,cfg.localTtsNativeModel,cfg.localTtsDevice,cfg.localTtsEmotionAsset)
    else if (provider === 'openai') parts.push(cfg.openaiBaseUrl || '')
    else if (provider === 'mimo') parts.push(cfg.mimoBaseUrl || '', cfg.mimoFormat || '', cfg.mimoReferencePath, cfg._mimoReferenceFingerprint, cfg.mimoInstruction || '', cfg.mimoVoiceDesign || '', cfg.roles?.[role]?.instruction || '', cfg.roles?.[role]?.voiceDesign || '')
    else if (provider === 'azure') parts.push(cfg.azureRegion || '')
    else if (provider === 'piper') parts.push(cfg.piperModel || '', cfg.piperBin || '')
    else if (provider === 'edge') parts.push(cfg.edgeBin || '')
    else if (provider === 'espeak') parts.push(cfg.espeakBin || '')
    return cacheKey(parts)
  }

  // Fast-model summary. Any failure returns an empty string and the caller
  // silently falls back to truncation.
  async function summarizeReply(text, cfg, signal) {
    const sentences = Number(cfg.summarySentences) > 0 ? Number(cfg.summarySentences) : 3
    if (!llm || typeof llm.stream !== 'function') return ''
    const opts = {
      messages: [{ role: 'user', content: 'Summarize the text in ' + sentences + ' sentences in the same language as the text. Summary only, no preamble:\n\n' + text }],
      signal,
    }
    const m = String(cfg.summaryModel || '')
    if (m) {
      const slash = m.indexOf('/')
      if (slash > 0) { opts.provider = m.slice(0, slash); opts.model = m.slice(slash + 1) }
      else opts.model = m
    }
    const parts = []
    for await (const chunk of llm.stream(opts)) {
      const piece = chunk && (chunk.text || (chunk.delta && chunk.delta.text)) || ''
      if (piece) parts.push(piece)
    }
    return parts.join('').trim()
  }

  async function synthesize(rawText, cfg, signal, role = 'reply', { skipClean = false,dialogue,textChunks,onAudioChunk } = {}) {
    if(cfg.rvcEnabled)onAudioChunk=undefined
    if (cfg.cosyvoiceReferencePath && (cfg.chain?.some(e => e.provider === 'cosyvoice') || cfg.roles?.[role]?.provider === 'cosyvoice')) cfg = { ...cfg, _cosyvoiceReferenceFingerprint: await referenceFingerprint(cfg) }
    if (cfg.mimoReferencePath && (cfg.chain?.some(e => e.provider === 'mimo') || cfg.roles?.[role]?.provider === 'mimo')) cfg = { ...cfg, _mimoReferenceFingerprint: await fileFingerprint(cfg.mimoReferencePath) }
    if (cfg.siliconflowVoiceMode === 'reference' && cfg.siliconflowReferencePath && (cfg.chain?.some(e => e.provider === 'siliconflow') || cfg.roles?.[role]?.provider === 'siliconflow')) cfg = { ...cfg, _siliconflowReferenceFingerprint: await fileFingerprint(cfg.siliconflowReferencePath) }
    let text = skipClean ? String(rawText || '') : cleanText(rawText, cfg, 0)
    if (!text) throw new Error('nothing to speak')
    const effectiveLang = cfg.autoDetect ? detectLang(text) : cfg.language
    const candidates = chainCandidates(cfg, role).filter(c=>cfg._inputType!=='ssml'||['polly','google-cloud','azure','dashscope'].includes(c.provider))
    const ov = cfg.roles?.[role] || {}
    const providers = {},expressionWarnings=new Map()
    for (const candidate of candidates) {
      const { id, provider, model, voice, style } = candidate
      let config = candidate.cfg
      const explicitReference=config.chain?.[0]?.referenceAsset
      const cosyReferenceMode=['instruct2','zero-shot','cross-lingual'].includes(config.cosyvoiceMode)
      if(explicitReference&&(!['local-tts','f5','cosyvoice','fish','mimo','siliconflow'].includes(provider)||provider==='mimo'&&model!=='mimo-v2.5-tts-voiceclone'||provider==='cosyvoice'&&!cosyReferenceMode))throw Error('Selected model/mode does not accept this reference recording')
      const selectedReference=explicitReference||(['local-tts','f5'].includes(provider)||provider==='cosyvoice'&&cosyReferenceMode?config.localTtsReferenceAsset:'')
      if(dialogue&&selectedReference)throw Error('Native dialogue references must be supplied per speaker using segmented mode')
      if(selectedReference&&['local-tts','f5','cosyvoice','fish','mimo','siliconflow'].includes(provider)){
        const reference=await voiceAssets.reference(selectedReference)
        config={...config,_voiceReference:reference}
        if(provider==='fish'){const all=JSON.parse(config.providerOptions||'{}');config.providerOptions=JSON.stringify({...all,fish:{...all.fish,referencePath:reference.path,referenceText:reference.asset.transcript}})}
        if(provider==='cosyvoice')Object.assign(config,{cosyvoiceReferencePath:reference.path,cosyvoiceReferenceText:reference.asset.transcript})
        if(provider==='mimo')config.mimoReferencePath=reference.path
        if(provider==='siliconflow')Object.assign(config,{siliconflowVoiceMode:'reference',siliconflowReferencePath:reference.path,siliconflowReferenceText:reference.asset.transcript})
      }
      if(config._speechDirection){const mapped=directionForEngine(config._speechDirection,{provider,model,cfg:config,text,engine:{speechInstruction:supportsInstruction(provider,model,config)}});if(mapped.options){const all=JSON.parse(config.providerOptions||'{}');config={...config,providerOptions:JSON.stringify({...all,[provider]:mapped.options}),speechInstruction:'',doubaoInstruction:'',mimoInstruction:'',roles:{...config.roles,[role]:{...config.roles?.[role],instruction:''}}}}else if(mapped.instruction)config={...config,speechInstruction:mapped.instruction,doubaoInstruction:mapped.instruction,mimoInstruction:mapped.instruction,roles:{...config.roles,[role]:{...config.roles?.[role],instruction:mapped.instruction}}};config._expressionWarning=mapped.warning;if(mapped.warning)expressionWarnings.set(provider,mapped.warning)}
      let languageError;try{config=withSpokenLanguage(config,provider,model,voice)}catch(e){languageError=e.message}
      const opts=JSON.parse(config.providerOptions||'{}')[provider]||{}
      const cacheAllowed = config.cache !== false && !config._voiceReference && text.length <= CACHE_MAX_TEXT && !dialogue && !textChunks && !onAudioChunk && !opts.timestamps && !opts.phonemes && !opts.marks?.length && !config._inputType && !opts.referencePath && !opts.native?.return_timestamps
      const fingerprint = synthesisFingerprint(text, provider, model, voice, role, ov.ssmlStyle, config, effectiveLang)
      const fp = cacheKey([fingerprint, style])
      const breakerId = provider + ':' + id.split(':')[0] + ':' + cacheKey([id, model, voice, style, keyEnvName(config, provider), config.providerOptions, Object.entries(config).filter(([k]) => /(?:BaseUrl|Url|Region|Workspace)$/.test(k))])
      providers[id] = async () => {
        signal?.throwIfAborted()
        if(languageError)return {ok:false,provider,reason:languageError}
        if (cacheAllowed) {
          const hit = await speechCache.get(fp)
          if (hit) { stats.cacheHits++; return { ok: true, provider, ...hit } }
        }
        if (providerBreaker.isOpen(breakerId)) return { ok: false, provider, reason: 'circuit open (cooldown)' }
        // A caller owns its cancellation. Do not share an AbortSignal between
        // unrelated sessions merely because they requested identical text.
        const all = makeProviders({ resolveKey, fetchImpl: fetch, cfg: config, modelManager, voiceAssets, kokoroRuntime, localModelRuntime, nativeRuntime }, {
          text, lang: effectiveLang, signal, models: { [provider]: model }, voices: { [provider]: voice }, styles: { [provider]: style }, role,
          dialogue,textChunks,onAudioChunk,
        })
        try {
          const out = await all[provider]()
          signal?.throwIfAborted()
          if (out?.ok) {
            // 用量估算與快取寫入不該擋住音訊交付：背景進行，失敗不影響合成結果。錄音驗證仍等待（一小時內已驗證過時只讀不寫）。
          void usageLedger.record({provider,model,voice,text,submitted:true,success:true}).catch(()=>{})
            if(config._voiceReference)await voiceAssets.verify(config._voiceReference.asset.id,{provider,backend:['local-tts','f5'].includes(provider)?config.localTtsBaseUrl:provider==='cosyvoice'?config.cosyvoiceUrl:config[provider+'BaseUrl']||provider,model}).catch(()=>{})
            providerBreaker.recordSuccess(breakerId)
            if (cacheAllowed) void speechCache.put(fp, out.mime, out.audio).catch(() => {})
          } else {providerBreaker.recordFailure(breakerId, out?.reason);void usageLedger.record({provider,model,voice,text,submitted:true}).catch(()=>{})}
          return out
        } catch (e) { void usageLedger.record({provider,model,voice,text,submitted:true}).catch(()=>{});if (!signal?.aborted) providerBreaker.recordFailure(breakerId, e); throw e }
      }
    }
    let out = await runChain(candidates.map(c => c.id), providers)
    if(expressionWarnings.has(out.provider))out.warning=expressionWarnings.get(out.provider)
    if(cfg.rvcEnabled){try{out=await rvcRuntime.convert(out,cfg,signal)}catch(e){if(signal?.aborted||!cfg.rvcBypassOnFailure)throw e;out={...out,conversion:{kind:'rvc',bypassed:true,reason:'RVC conversion failed; original synthesis retained'}}}}
    signal?.throwIfAborted()
    stats.total++
    const ps = stats.providers[out.provider] || (stats.providers[out.provider] = { n: 0, e: 0, ms: 0 })
    ps.n++; ps.ms += out.tookMs || 0
    return cfg._speechTarget?{...out,sourceText:cfg._speechSourceText,spokenText:text,spokenLanguage:cfg._speechTarget}:out
  }

  // Active reservations map and concurrency throttler (#174)
  const activeReservations = new Map() // id -> { controller, timer, dropped }
  let activeSyntheses = 0
  const synthesisQueue = []

  function getEffectiveConcurrency(cfg) {
    const maxQ = typeof cfg.maxQueue === 'number' && cfg.maxQueue > 0 ? cfg.maxQueue : 8
    return Math.max(1, Math.min(maxQ, 4))
  }

  function runThrottledSynthesis(id, signal, fn) {
    if (signal && signal.aborted) {
      return Promise.reject(new Error('aborted'))
    }
    return new Promise((resolve, reject) => {
      let isQueued = true
      const onAbort = () => {
        if (isQueued) {
          const idx = synthesisQueue.findIndex((item) => item.id === id)
          if (idx >= 0) synthesisQueue.splice(idx, 1)
          reject(new Error('aborted'))
        }
      }
      if (signal) {
        signal.addEventListener('abort', onAbort, { once: true })
      }

      const execute = async () => {
        isQueued = false
        if (signal) signal.removeEventListener('abort', onAbort)
        if (signal && signal.aborted) {
          reject(new Error('aborted'))
          pumpSynthesisQueue()
          return
        }
        const resv = activeReservations.get(id)
        if (resv && resv.dropped) {
          reject(new Error('dropped from queue'))
          pumpSynthesisQueue()
          return
        }
        activeSyntheses++
        try {
          const result = await fn()
          resolve(result)
        } catch (err) {
          reject(err)
        } finally {
          activeSyntheses--
          pumpSynthesisQueue()
        }
      }

      const maxLimit = getEffectiveConcurrency(live())
      if (activeSyntheses < maxLimit) {
        execute()
      } else {
        synthesisQueue.push({ id, run: execute })
      }
    })
  }

  function pumpSynthesisQueue() {
    const maxLimit = getEffectiveConcurrency(live())
    while (activeSyntheses < maxLimit && synthesisQueue.length > 0) {
      const next = synthesisQueue.shift()
      if (next) next.run()
    }
  }

  // Synthesize one phrase with queue reservation. The id is issued immediately,
  // not when the provider answers, so short phrases cannot overtake long ones.
  function speakPiece(sid, text, cfg, kind, meta = {}) {
    const role = kind === 'notice' ? 'approval' : kind === 'error' ? 'error' : (kind && kind !== 'speech' ? kind : 'reply')
    const id = 'u' + (++utteranceSeq)
    const controller = new AbortController()
    let timer
    const abort = () => controller.abort()
    meta.signal?.addEventListener('abort', abort, { once: true })
    if (meta.signal?.aborted) abort()
    activeReservations.set(id, { controller, timer: null, dropped: false, sessionId:sid })
    const identity = { sessionId: sid, jobId: meta.jobId, messageId: meta.messageId, clientId: meta.clientId || '', sentenceIndex: meta.sentenceIndex, totalSentences: meta.totalSentences, charStart: meta.charStart, charEnd: meta.charEnd }
    if (meta.publish !== false) reserve(id, identity)
    const tuning = voiceTuning(cfg, role)
    return runThrottledSynthesis(id, controller.signal, async () => {
      timer = setTimeout(abort, cfg.timeoutMs)
      const reservation = activeReservations.get(id)
      if (reservation) reservation.timer = timer
      return synthesize(text, cfg, controller.signal, role, { skipClean: true, textChunks:meta.textChunks })
    }).then(out => {
      controller.signal.throwIfAborted()
      if(meta.getText){text=meta.getText();identity.charEnd=text.length}
      const item = { id, ...identity, kind: kind === 'notice' || kind === 'error' ? kind : 'speech', role, text,
        ...(cfg._speechTarget?{sourceText:cfg._speechSourceText,spokenLanguage:cfg._speechTarget}:{}),rate: cfg.adaptiveRate ? computeAdaptiveRate(text.length, tuning.rate) : tuning.rate, volume: tuning.volume,
        provider: out.provider,...(out.warning?{warning:out.warning}:{}), mime: out.mime, audioBase64: Buffer.from(out.audio).toString('base64'), tookMs: out.tookMs, ...(cfg._noticePolicy?{noticePolicy:cfg._noticePolicy,noticeId:cfg._noticeId,cancelledJobs:cfg._cancelledJobs}:{}), ...(out.timing ? { timing: out.timing } : {}) }
      if (meta.publish !== false) settle(id, item)
      return item
    }).catch(err => {
      stats.errors++
      if (meta.publish !== false) settle(id, { id, ...identity, kind: 'error', text, cancelled: controller.signal.aborted, error: String(err?.message || err) })
      throw err
    }).finally(() => {
      clearTimeout(timer); meta.signal?.removeEventListener('abort', abort); activeReservations.delete(id)
    })
  }
  const speechJobs = createSpeechJobs(speakPiece,{liveConfig:(cfg,role)=>{
    const first=chainCandidates(cfg,role)[0]
    if(!first)return null
    const transport=JSON.parse(first.cfg.providerOptions||'{}')[first.provider]?.transport
    if(transport!=='websocket'&&!(transport==='stream'&&['polly','google-cloud'].includes(first.provider)))return null
    try{return liveSpeechConfig(cfg,role)}catch{return null}
  }})
  const liveSpeech = createLiveSpeech(synthesize)
  const playbackLeases = createPlaybackLeases()
  function startSpeechJob(sid, text, cfg, role, messageId, extra = {}) {
    return speechJobs.start({ sessionId: sid, messageId, text, cfg, role, ...extra })
  }

  // Announcement: short chime then phrase. The chime is drawn by the browser,
  // so nothing is downloaded or stored.
  function roleChime(cfg, role) {
    const ov = (cfg.roles && cfg.roles[role]) || {}
    return ov.chime || cfg.chime
  }

  function announce(sid, text, cfg, notice) {
    if(notice)cfg={...cfg,_noticePolicy:notice.policy,_noticeId:'notice-'+(++utteranceSeq),rvcEnabled:false,spokenLanguage:'original',chain:[{provider:'edge',voice:cfg.roles?.approval?.voice||'zh-TW-HsiaoChenNeural'}],roles:{notice:{provider:'edge',voice:cfg.roles?.approval?.voice||'zh-TW-HsiaoChenNeural'}}}
    const chime = roleChime(cfg, 'approval')
    if (chime && chime !== 'none') {
      enqueue({ id: `u${++utteranceSeq}`, sessionId: sid, kind: 'chime', chime,...(notice?{noticePolicy:notice.policy,noticeId:cfg._noticeId,cancelledJobs:cfg._cancelledJobs}:{}) })
    }
    startSpeechJob(sid, text, cfg, 'notice')
  }

  function enqueue(item) {
    pending.push(item)
    const max = Math.max(0, typeof live().maxQueue === 'number' ? live().maxQueue : 32)
    if (max === 0) {
      for (const p of pending) {
        if (p && p.id && activeReservations.has(p.id)) {
          const resv = activeReservations.get(p.id)
          resv.dropped = true
          try { resv.controller.abort() } catch (_abortErr) { /* ignore aborted controller */ }
          clearTimeout(resv.timer)
          activeReservations.delete(p.id)
        }
      }
      pending.length = 0
      return
    }
    trimReplay()
    if (live().streamingEnabled && item.kind === 'chime') {
      item._streamEmitted = true
      broadcastStream('chime', item)
    }
  }

  // Reserve the queue slot before synthesis so phrase order matches
  // speech order, not arrival race.
  function reserve(id, identity = {}) {
    enqueue({ id, ...identity, kind: 'reserved' })
  }

  // maxQueue bounds synthesis concurrency, not the number of sentences in a
  // reply. Keep a separate replay window for polling/reconnecting browsers.
  // Never remove a pending reservation or a completed item blocked behind it.
  function trimReplay() {
    trimReplayWindow(pending, { limit: Math.max(256, Number(live().maxQueue) || 0) })
  }

  function flushReadyStream() {
    if (!live().streamingEnabled) return
    const blocked = new Set()
    for (const item of pending) {
      if (blocked.has(item.sessionId)) continue
      if (item.kind === 'reserved') {
        blocked.add(item.sessionId); continue
      }
      if (!item._streamEmitted) {
        item._streamEmitted = true
        if (item.audioBase64 || item.error) {
          broadcastStream('utterance', item)
        }
      }
    }
  }

  function settle(id, item) {
    activeReservations.delete(id)
    const at = pending.findIndex((row) => row.id === id)
    if (at === -1) {
      // Dropped reservation: do NOT re-enqueue (#174)
      return
    }
    pending[at] = item
    flushReadyStream()
    trimReplay()
  }

  ctx.effect(() => ctx.on('session/event', (session, event) => {
    // 宿主每個會話事件（含模型串流片段、工具呼叫）都會進來；只有這幾種與朗讀有關，
    // 其餘直接略過，不重新解析整份設定。
    if (!SPEECH_EVENT_TYPES.has(event?.type)) return
    const cfg = live()
    const sid = session && session.id
    if (!sid) return
    cfg._sessionId=sid
    const notification=approvalNotifications.accept(sid,event,cfg)
    if(notification){
      if(notification.policy==='idle-only'&&[...activeReservations.values()].some(r=>r.sessionId===sid))return
      if(notification.policy==='interrupt')cancelPreparations(sid)
      const cancelledJobs=notification.policy==='interrupt'?speechJobs.cancelSession(sid):[]
      announce(sid,notification.text,{...cfg,speakReplies:true,_cancelledJobs:cancelledJobs},notification);return
    }
    if (['approval/asked','approval/decided','question/requested'].includes(event.type))return
    if(!cfg.speakReplies){if(event.type==='turn/end')cancelPreparations(sid);return}
    if(event.type==='assistant/message'){
      const text=assistantText(event.data&&(event.data.message??event.data.text??event.data))
      const agentName=event.data?.subagent||event.data?.agent||event.data?.message?.subagent||event.data?.message?.agent||session.subagent||session.agent||''
      const role=cfg.autoDetectSubagent!==false&&agentName&&cfg.roles?.[agentName]&&(cfg.roles[agentName].provider||cfg.roles[agentName].voice)?agentName:'reply'
      let cur=collectors.get(sid)
      if(!cur){
        const controller=new AbortController(),release=retainPreparation(sid,controller)
        cur={cfg,role,controller,release,parts:[],streaming:false}
        cur.queue=voiceContext.resolve(cfg,{sessionId:sid},controller.signal).then(resolved=>{Object.assign(cur.cfg,resolved);cur.streaming=cur.cfg.spokenLanguage!=='ja'&&cur.cfg.speakAsItGoes})
        collectors.set(sid,cur)
      }
      cur.queue=cur.queue.then(async()=>{
        cur.controller.signal.throwIfAborted()
        if(cur.streaming){const ready=await prepareSpeechTextBound(text,cur.cfg,cur.controller.signal);if(!ready)return;cur.job||=startSpeechJob(sid,'',cur.cfg,cur.role,event.data?.messageId||event.data?.message?.id,{open:true,signal:cur.controller.signal});speechJobs.append(cur.job,ready)}
        else cur.parts.push(text)
      }).catch(()=>{cur.controller.abort();cur.release()})
      return
    }
    if(event.type!=='turn/end')return
    const cur=collectors.get(sid);collectors.delete(sid);if(!cur)return
    cur.queue.then(async()=>{
      cur.controller.signal.throwIfAborted();if(!live().speakReplies)return
      if(cur.streaming){if(cur.job)await speechJobs.seal(cur.job)}
      else{const text=await prepareSpeechTextBound(cur.parts.join('\n'),cur.cfg,cur.controller.signal);cur.controller.signal.throwIfAborted();if(text&&live().speakReplies){const job=startSpeechJob(sid,text,cur.cfg,cur.role,undefined,{signal:cur.controller.signal});await job.promise}}
    }).catch(()=>{}).finally(cur.release)
  }), 'dsh-tts: speak finished replies')


  const nativePcm=async function*(text,cfg,signal){
    const job=liveSpeech.start({sessionId:cfg._sessionId||'',clientId:'service-'+(++utteranceSeq),text,cfg});liveSpeech.seal(job);let cursor=0
    const abort=()=>job.controller.abort();signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort()
    try{while(true){signal.throwIfAborted();while(cursor<job.frames.length){const frame=job.frames[cursor++];if(frame.sampleRate!==24000||frame.channels!==1)throw Error('此原生串流不是 24kHz 單聲道 PCM，請使用完整音訊模式');yield Buffer.from(frame.audioBase64,'base64')}if(job.state!=='running'){if(job.state!=='complete')throw Error(job.error||'原生串流中斷');break}await new Promise(r=>setTimeout(r,15))}}finally{signal.removeEventListener('abort',abort);liveSpeech.release(job)}
  }
  const speechService=createSpeechService({usage:usageLedger.snapshot,nativeStream:nativePcm,canNative:cfg=>{try{const selected=liveSpeechConfig(cfg),provider=selected.chain[0]?.provider;return provider!=='polly'}catch{return false}},live,resolve:voiceContext.resolve,prepare:prepareSpeechTextBound,start:startSpeechJob,jobs:speechJobs,expression:voiceContext.register,onDelivered:p=>ctx.emit?.('speech/delivered',p),onFailed:p=>ctx.emit?.('speech/failed',p)})
  if(typeof ctx.provide==='function')ctx.provide('dshTts',speechService)
  let hostSpeech;try{hostSpeech=ctx.get?.('speechSynthesis')||ctx.speechSynthesis}catch{}
  if(typeof hostSpeech?.registerProvider==='function')ctx.effect(()=>hostSpeech.registerProvider({apiVersion:1,id:'external:dsh-tts',getSnapshot:()=>({name:'DSH 聲音工坊',ready:!!live().chain?.length,formats:['wav','mp3'],maxTextLength:100000,managementBundle:name}),streamPcm:r=>speechService.pcmFrames(r),subscribe:listener=>{let previous=JSON.stringify(live().chain);const timer=setInterval(()=>{const next=JSON.stringify(live().chain);if(next!==previous){previous=next;listener()}},2000);timer.unref?.();return()=>clearInterval(timer)},synthesize:async r=>{const a=await speechService.synthesize(r);return {data:a.data,format:a.format}}}),'dsh-tts: host speech provider')
  ctx.effect(()=>()=>void speechService.close(),'dsh-tts: neutral service cleanup')
  const cloudVoices=createCloudVoices({voiceAssets,resolveKey,synthesize})
  registerHttpRoutes(ctx, {
    speechService,resolveKey,
    breakerSnapshot: () => providerBreaker.snapshot(),

    live,
    modelManager,
    stats,
    speechCache,
    cleanText,
    prepareSpeechText: prepareSpeechTextBound,
    prepareSpokenText,voiceProfiles,voiceContext,cancelPreparations,isPreparing:sid=>(preparations.get(sid)?.size||0)>0,
    synthesize,
    synthesizeDialogue:(value,cfg,signal)=>synthesizeDialogue(value,cfg,signal,synthesize),
    credentialsView,
    configResponse,
    storeProviderKey,
    clearProviderKey,
    pending,
    speechJobs, playbackLeases, startSpeechJob, liveSpeech, voiceAssets, cloudVoices, kokoroRuntime, xinferenceRuntime, localModelRuntime, usageLedger, voiceModels, rvcRuntime, nativeRuntime, maintenanceJobs,
    installRuntime,provisionLocal:(cfg,signal)=>provisionLocal(cfg,xinferenceRuntime,signal),diagnostics:()=>diagnosticReport(live(),{kokoroRuntime,xinferenceRuntime,localModelRuntime,rvcRuntime,nativeRuntime,voiceAssets,voiceModels,usageLedger}),
    getSettingsApi: () => settingsApi,
    validateConfig: (obj) => Config(obj),
  })

  ctx.effect(() => () => {
    for (const reservation of activeReservations.values()) {
      reservation.dropped = true
      reservation.controller.abort()
      clearTimeout(reservation.timer)
    }
    pending.length = 0
    for(const sid of preparations.keys())cancelPreparations(sid)
    speechJobs.close()
    speechTranslator.clear()
    liveSpeech.close()
    kokoroRuntime.stop()
    maintenanceJobs.close()
    void localModelRuntime.close().finally(()=>xinferenceRuntime.close())
    void rvcRuntime.close()
    void nativeRuntime.stop()
    clearStreamSubscribers()
  }, 'dsh-tts: cleanup stream subscribers')

  ctx.tools.register(
    defineTool({
      name: 'speak_text',
      description:
        'Synthesize speech from text using the dsh-tts provider fallback chain. '
        + 'Returns audio as base64 plus the provider that succeeded. '
        + 'Use when the user asks to hear text; do not dump the audio into the model context.',
      parameters: {
        text: { type: 'string', required: true, description: 'Text to speak.' },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            ok: { type: 'boolean' },
            id: { type: 'string' },
            provider: { type: 'string' },
            mime: { type: 'string' },
            bytes: { type: 'number' },
            tookMs: { type: 'number' },
            error: { type: 'string' },
          },
        },
        render: (_args, value) => [{
          type: 'text',
          text: value && value.ok
            ? `Spoken with ${value.provider} (${value.mime}, ${value.bytes || 0} bytes).`
            : `TTS failed: ${value && value.error ? value.error : 'unknown'}`,
        }],
      },
      execute: async (args, exec) => {
        const cfg = live();cfg._sessionId=exec?.session?.id
        const rawText = String(args.text || '').trim()
        if (!rawText) return { ok: false, error: 'empty text' }
        const sid = exec?.session?.id || 'tool'
        try {
          const text = await prepareSpeechTextBound(rawText, cfg, exec.signal)
          const job = startSpeechJob(sid, text, cfg, 'reply', undefined, { signal: exec.signal })
          await job.promise
          if (job.state !== 'complete') throw Error(job.error || job.state)
          const item = job.segments[0]
          return { ok: true, id: job.id, provider: item.provider, mime: item.mime, bytes: job.bytes, tookMs: job.segments.reduce((n, s) => n + (s.tookMs || 0), 0) }
        } catch (e) { return { ok: false, error: String(e?.message || e) } }
      },
    }),
  )
}
