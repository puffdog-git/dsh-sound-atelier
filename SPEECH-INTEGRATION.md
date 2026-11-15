# DSH 中立語音服務、人格音色與日文配音

2026-11-13。本插件只合成與交付音訊，不登入 Discord、Telegram、QQ，也不決定聊天目的地。舊 voiceDuplexEnabled、messengerTtsEnabled、通訊軟體設定頁及 integrations 路由已移除；舊設定中的這些欄位不再生效。

## 設定頁

目前主入口為「設定 → 語音」，分成「朗讀與聲音」和「語音交付」。交付頁需啟用獨立 dsh-speech-bridge；未啟用時會提示，不影響單獨朗讀。人格頁的「在聊天軟體中使用語音」提供一般使用者操作說明，下列保留給插件作者的接口契約。

全繁中介面分為「語音來源」「聲音管理」「人格與語言」「進階設定」。先選線上語音服務或本機部署，再選主要服務、模型、聲音與試聽。分類切換只更換主要服務列，備援列仍可混用線上與本機；設定需按儲存。服務的模型 ID、音色 ID、API 協議名稱、第三方回傳內容與診斷 JSON 保留原文。

聲音管理保留錄音、八家雲端永久音色、本機推理服務、模型／索引／音色包、RVC、背景工作及診斷。安裝與載入需明確操作，開啟頁面不會下載模型或建立付費音色。

## 人格與音色方案

先在語音來源調整設定，再在「人格與語言」將目前服務鏈、音色、語氣、本機參考、RVC 及配音語言存成具名方案。方案只保存安全憑證槽名稱，不保存 API Key。選擇人格、工作區或會話後套用綁定，表格會列出使用的方案及主要聲音。方案與綁定立即儲存，與全域設定的儲存按鈕分開；刪除方案只解除本機綁定，不刪除雲端聲音、錄音或權重。

優先順序為單次指定方案／聲音 → 會話 → 工作區 → 人格 → 全域。每次合成取得快照，變更設定不改動已在執行的語音。工作區來自實際 workspaceRegistry，會話來自 sessionPersistence，不依據瀏覽器目前顯示的工作區猜測。

內建大肥魚人格套件適配器，讀取該插件公開的本機狀態，只使用 ID、名稱及生效狀態。未安裝該套件仍可綁定工作區／會話；其他人格插件可在宿主註冊：

```js
const off = ctx.dshTts.registerPersonaAdapter({
  id: 'my-persona', name: '我的人格插件',
  async snapshot({sessionId, workspaceId, cwd}, signal) {
    return {available:true, personas:[{id:'a',name:'小葵'}],
      effective:{id:'a',name:'小葵'}}
  }
})
```

適配器應遵守 signal，不回傳完整人格提示詞或密碼。多個適配器同時回報生效人格時不猜測；請指定 personaAdapter，或直接綁定工作區／會話。儲存在 DSH_HOME/data/dsh-tts/voice-profiles.json，有版本檢查、原子寫入與損毀保護。

## 中文正文、日文配音

TTS 的 spokenLanguage 預設 original；選 ja 時，先收齊整段正文，再透過 DSH llm.stream 翻譯一次，可另指定 translationModel 與 JSON 用語表。來源文字、配音文字與時間戳分開；時間軸對應實際說出的日文。翻譯可能增加模型用量及延遲。成功結果按模型、用語表與會話快取；取消屬於各自請求，失敗不默默讀回中文。

Discord 端優先讓同一次回覆同時產生中文正文與隱藏的日文 spokenText，減少額外模型呼叫。缺少日文、正文遭裁切／遮蔽或審稿修改時，才對最後核准的正文補翻一次，沿用 Discord 的模型及 Token 預算。隱藏資料不送入公開訊息。中文公開回覆不因翻譯失敗而撤回。

這項流程參考 [AnimaVN](https://github.com/JayziLi/AnimaVN/tree/046970399d5083f9e745bf98c6408a07ca0b79ba) 的中日配音思路；其 lang.ts 是同次生成中日配對及日文片假名判斷，並非插件內載入一個獨立翻譯模型。本實作使用結構化資料，不引入 VN、人物圖像或遊戲功能，也沒有複製其資產。

請選支援日文的模型／音色，例如 Edge 日文聲音、Irodori 或相容多語服務。獨立英文 Kokoro、F5、Index2、Breeze、dots 等不會被宣稱具有日文能力；Index2.5／Qwen／GPT-SoVITS 依其語言欄位處理。翻譯輸出會做格式、長度與日文假名檢查，這不是語義品質評分，仍需聆聽確認角色稱呼及發音。JA 模式不接受原文 SSML，也不在文字尚未完整時逐字翻譯；已翻譯日文可指定 original 使用增量介面。

## 宿主服務

永遠提供命名服務 dshTts，不覆蓋其他插件的 speechSynthesis。若宿主已有支援 registerProvider 的 speechSynthesis，登記 external:dsh-tts；宿主是否允許外部引擎接管仍由其設定決定。舊宿主的標準外部供應商契約只保留 text/model/voice/speechInstruction，不能保證會話、人格或結構化情緒穿過該包裝。需要完整上下文的插件請直接使用 dshTts：

```js
const audio = await ctx.dshTts.synthesize({
  text:'歡迎回來。', sessionId:agent.session.id,
  spokenLanguage:'ja', spokenText:'おかえりなさい。',
  speechDirection:{emotion:'happy',intensity:0.5,pace:'normal'},
  format:'wav', maxDurationMs:60000, signal
})
// audio.data / format / contentType / text / sourceText / voiceBinding
// 目的地、權限、播放與傳送由呼叫插件管理。
```

若 text 已是日文，可另外提供 sourceText 中文；兩種表示方式擇一。明確的 speechInstruction 優先於 speechDirection。TTS 只依服務商契約映射語氣；不在 TTS 端讀取聊天上下文做情緒決策。支援值 neutral/happy/excited/sad/calm/angry/afraid/surprised/whisper；pace 為 normal/slow/fast。模型不支援時回報限制並保留聲音。Index 的興奮為開心＋驚訝近似，獨立情緒錄音優先，並非每家皆有相同的情緒強度欄位。

聲音合成完成後才回傳完整 WAV／MP3，套用播放速度及音量；不把半成品當成功。signal 取消、10 分鐘整段期限、大小與時長上限均有檢查。exportAudio 回傳本機 path 與 remove()，檔案最長保留 24 小時，呼叫者應用完即移除。

中立交付適配器採宿主的參數順序及權限分工：

```js
const off = ctx.dshTts.registerDelivery({
  id:'my-transport', format:'wav',
  async check(context) { /* 檢查登入、目的地、發言權限 */ },
  async send(audio, context) { /* 插件自行傳送 audio.data */
    return {adapter:'my-transport',messageId:'actual-message-id'}
  }
})
await ctx.dshTts.deliver({text:'你好。'}, 'my-transport', {agent,signal})
```

自動交付預設關閉，需 setAutomaticDeliveryEnabled(id,true)。停用交付會取消該適配器進行中的工作；停用自動交付只取消自動工作。check 在合成前及傳送前各檢查一次，並發出 speech/delivered 或 speech/failed 宿主事件。im-bot／qq-bridge 必須自行註冊適配器，不能只安裝 TTS 就假稱已相容。此版未加入它們的實際傳送實作。

已另外檢查實際下載的 dsh-onebot-qq 0.10.0、@zaofan/dsh-qqbot 1.12.26、@xmanrui/dsh-im 5.10.0：中立音訊具備接入基礎，但尚未安裝自動橋接。目錄授權、原生語音與檔案附件差異、QQBot純語音標記限制與隔離實測，見 [通訊插件相容性](COMMUNICATION-COMPATIBILITY.md)。

## HTTP

### 中立 PCM 串流

`capabilities().extensions.pcmStream=true` 表示提供 `dshTts.streamPcm(request, async pcm => ...)`。參數與完整合成共用會話、人格、日文、語氣、取消及時長上限；固定輸出 PCM16LE／24kHz／單聲道。回呼必須等消費完再完成，以提供背壓。`pcmFrames(request)` 是對等的 AsyncIterable；註冊到宿主外部供應商的 `streamPcm(request)` 也採 AsyncIterable。可選 `onPrepared(meta)` 在開始前回傳實際正文、配音文字、語言與音色綁定，不含金鑰。

先準備完整翻譯及音色快照；符合原生串流能力且速度／音量為1時使用原生 PCM，其他情況逐句合成及轉換。完成回傳 mode、firstAudioMs、durationMs、bytes；中途錯誤直接拋出，不把部分聲音當完成，也不重送已開始的音訊。整段大小最多32MiB，整段期限十分鐘。`resolveVoice(request)` 可唯讀取得安全音色中繼資料，不啟動合成。

HTTP 使用 **POST `/dsh-tts/speech/stream`**，由 `/config` 的 `speechApi.streamEndpoint` 宣告，來源與認證規則同完整合成。傳回 `application/x-ndjson`：先 `prepared`，接續多筆 `{type:'pcm',sampleRate:24000,channels:1,audioBase64}`，最後 `complete` 與統計。錯誤可能是 HTTP 400，或已開始串流後的 `error`。消費者必須取得非空音訊及 `complete` 才視為完整；取消連線會中止上游。舊 **GET `/dsh-tts/stream`** 是聊天播放器的 SSE 訂閱，與中立 PCM 路徑分開，請勿混用。

POST /dsh-tts/synthesize 為同一中立服務，回傳 audioBase64、mime 與中繼資料；需要通過宿主認證及來源檢查。GET /dsh-tts/config 的 speechApi.version=1 表示支援，endpoint 是固定中立路徑。Discord 偵測後使用新版路徑，不再用全域試聽設定覆蓋會話音色；仍保留對舊版 TTS 與原參考插件的適配。

GET/POST /dsh-tts/voice/profiles 管理方案及綁定，修改必須附 revision。既有 /speak、/preview、/live、/dialogue、音訊工作／下載介面仍保留；/speak 不再要求通訊軟體類型開關。API 不包含 Discord／Telegram 專用欄位或目的地。
