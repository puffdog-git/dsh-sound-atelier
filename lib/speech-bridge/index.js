// 通訊語音交付與外部語音辨識橋接。
//
// 原本是獨立插件 dsh-speech-bridge（同一位維護者），1.0.2 起併入聲音工坊，使用者不必另外安裝。
// 這一層只做三件事：
//   1. 在 OneBot／QQBot／dsh-im 的對話裡提供 send_speech_reply 工具（合成後交給原通訊插件的正式工具送出）
//   2. 提供狀態端點給「語音交付」頁顯示通道能力與最近交付結果
//   3. 把外部 dsh-voice 的聽寫功能登記成一個語音辨識來源
// 不儲存通訊帳號憑證，也不修改其他插件。
import { defineTool } from '@deepseek-ai/dsh-tools'
import { createBridge } from './bridge.js'
import { createVoiceProvider } from './voice-provider.js'
import { channelCatalog } from './catalog.js'
import { createDiagnostics } from './diagnostics.js'
import { isLocalRequest } from './local-request.js'
import { registerRoute } from '../http-util.js'

export const SPEECH_BRIDGE_TOOL = 'send_speech_reply'
export const SPEECH_BRIDGE_STATUS_PATH = '/dsh-sound-atelier/speech-bridge/status'
const DOWNSTREAM_TOOLS = ['qq_send_voice', 'send_media', 'dsh_im_return_file']

/**
 * @param ctx 插件的 ctx（需要 tools、webServer）
 * @param options.tts 聲音工坊自己的語音服務（提供 exportAudio）
 * @param options.enabled 讀取目前「語音交付」開關的函式
 * @param options.externalVoice 啟動當下是否登記外部 dsh-voice 辨識來源
 */
export function applySpeechBridge(ctx, { tts, enabled = () => true, externalVoice = true, define = defineTool } = {}) {
  const status = { deliveryReady: false, externalSttRegistered: false, imLoaded: false, standalone: false }
  const diagnostics = createDiagnostics()
  let reported = []

  ctx.effect(() =>
    registerRoute(ctx.webServer, {
      kind: 'exact',
      path: SPEECH_BRIDGE_STATUS_PATH,
      handler: (req, res) => {
        const allowed = isLocalRequest(req)
        res.writeHead(!allowed ? 403 : req.method !== 'GET' ? 405 : 200, {
          'content-type': 'application/json',
          'cache-control': 'no-store',
        })
        res.end(
          JSON.stringify(
            allowed && req.method === 'GET'
              ? {
                  ok: true,
                  ...status,
                  deliveryEnabled: enabled() !== false,
                  externalVoiceEnabled: externalVoice !== false,
                  automaticAllReplies: false,
                  sttProviderId: 'external:dsh-voice',
                  channels: { onebot: 'native-voice', qqbot: 'native-voice', im: 'native-when-supported' },
                  catalog: channelCatalog({ imLoaded: status.imLoaded, reported }),
                  recent: diagnostics.snapshot(),
                }
              : { ok: false },
          ),
        )
      },
    }),
  )

  // 同一台電腦上如果還裝著舊的獨立橋接，工具已經由它提供；這裡不重複註冊，交給它處理。
  const existing = typeof ctx.tools.get === 'function' ? ctx.tools.get(SPEECH_BRIDGE_TOOL) : undefined
  if (existing) {
    status.standalone = true
  } else {
    const bridge = createBridge({
      tools: ctx.tools,
      tts,
      enabled: () => enabled() !== false,
      onEvent: (event) => diagnostics.record(event),
    })
    status.deliveryReady = true
    ctx.effect(() => () => {
      status.deliveryReady = false
      bridge.close()
    })
    ctx.tools.register(
      define({
        name: SPEECH_BRIDGE_TOOL,
        description:
          '將文字轉成語音並交付目前 OneBot／QQBot／dsh-im 會話。使用者要求語音回覆時呼叫。支援的平台使用原生語音泡泡；其餘使用音訊附件。dsh-im 成功登記僅表示排程，不代表已送達。不要另呼叫 speak_text 或媒體工具重送。不能指定其他收件人。',
        parameters: {
          text: { type: 'string', required: true, description: '要朗讀的完整回覆' },
          channel: { type: 'string', enum: ['auto', 'onebot', 'qqbot', 'im'], description: '預設自動選擇目前會話唯一的出口' },
          instruction: { type: 'string', description: '選用的語氣提示' },
        },
        timeoutMs: 180000,
        output: {
          schema: { type: 'json' },
          render: (_, value) => [
            {
              type: 'text',
              text:
                value.state === 'staged'
                  ? '音訊已交由 dsh-im 本回合附件流程處理（尚非送達確認）'
                  : '語音已由目前通訊插件送出',
            },
          ],
        },
        execute: (args, exec) => bridge.send(args, exec),
      }),
      // 只在目前對話真的有對應的通訊工具時才讓模型看到，沒裝通訊插件的人不會多出這個工具。
      { when: ({ agent }) => enabled() !== false && DOWNSTREAM_TOOLS.some((name) => ctx.tools.executable(name, agent)) },
    )
  }

  ctx.inject(['imNativeVoice'], (sctx) => {
    status.imLoaded = true
    reported = sctx.imNativeVoice.capabilities()
    sctx.effect(() => sctx.imNativeVoice.subscribe((event) => diagnostics.record(event)))
    sctx.effect(() => () => {
      status.imLoaded = false
      reported = []
    })
  })

  if (externalVoice !== false && !existing)
    ctx.inject(['speechToText'], (sctx) => {
      sctx.effect(() => sctx.speechToText.register(createVoiceProvider({ origin: () => sctx.webServer.getOrigin() })))
      status.externalSttRegistered = true
      sctx.effect(() => () => {
        status.externalSttRegistered = false
      })
    })

  return { status, diagnostics }
}
