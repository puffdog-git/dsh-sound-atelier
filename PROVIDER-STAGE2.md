# Provider 進階合成整合（2026-11-12）

本文件記錄第二階段的**插件實作與模擬驗證**，不代表已驗證每個帳戶／地域／音色的商業服務。永久聲音建立、訓練、刪除與本機模型管理屬第三階段。Discord 上下文情緒決策屬第四階段。

## 已接入能力

| Provider／模型 | 本批完成的合成能力 | 重要限制 |
| --- | --- | --- |
| 豆包 2.0 | 原生二進位雙向 WebSocket、PCM／MP3、時間戳、取消與成功完成核對 | 克隆音色的 context_texts 限制保留；不將 V1 當作 V3 使用 |
| DeepInfra Kokoro | 原生 inference、混合預設音色、語速、取樣率、逐字時間資訊 | 使用 preset_voice 陣列及 text；不沿用 Orpheus 的 input |
| DeepInfra Orpheus | 原生 input／voice、temperature、top_p、max_tokens、repetition_penalty 與輸出格式 | 單次輸入上限 300 字；不接受 Kokoro 音色欄位 |
| DeepInfra Chatterbox Turbo | 原生 voice_id、exaggeration、cfg、seed、採樣控制 | 必須是已存在的自訂 voice_id；不虛構 audio_prompt 或 multilingual 參數 |
| DeepInfra Qwen | 保留既有 CustomVoice／VoiceDesign、語言及模型專屬指示 | 不把其他模型 native 控制傳給 Qwen |
| Fish S2／Drama | HTTP、MessagePack 參考錄音、S2 原生多人、時間戳 SSE、live WebSocket、詞典及推理控制 | 串流不使用 WAV 容器；字典引用需固定版本；未知模型不套用其他模型契約 |
| Cartesia Sonic 3 | SSE／WebSocket、逐字及音素時間戳、normalization、accent、發音詞典 ID | 原生串流使用 PCM，回傳完整音檔時包裝為 WAV；固定 emotion 僅英文 |
| DashScope | Qwen-Audio 3.0／3.1、CosyVoice 2／3／3.5 雙向 inference；Qwen3 Flash HTTP／SSE；時間戳、SSML、seed、hot_fix | Qwen3 Flash 不沿用 Qwen-Audio 的 WS 協議；SSML 一次只送一份文件；時間戳用 PCM／WAV |
| Amazon Polly | SSML、Lexicon 選用與管理、Speech Marks、generative 雙向 SDK 串流、S3 非同步工作與查詢 | Speech Marks 額外一次請求，可能另計費；generative 不支援 marks；S3 bucket 由用戶指定 |
| Inworld | HTTP NDJSON／WebSocket、word／character／viseme 時間資訊、TTS-2 script 多人、詞典選用與管理、async／batch 工作 | steering 僅 TTS-2 且提示用英文；script 不走單人 WS；詞典更新需 etag 並取代整份內容 |
| Google Cloud TTS | 服務帳號／ADC、SSML mark、Chirp 3 HD 語速／markup／gRPC 串流、自訂發音、Gemini prompt／雙人與 Studio O/Q | gRPC 不接受 SSML／mark；Chirp pitch／volume 不支援；Gemini Cloud 與 Gemini API 分開 |
| Gemini API | 原生雙人對話：3.8 Interactions 的 speaker／speech_metadata、舊 generateContent 的多音色設定 | 兩個預建音色；自訂聲音或更多角色使用逐段模式 |

其他既有 Provider 的既有進階控制保留；本表不宣稱所有上游實驗 API、模型或聲音生命週期都已覆蓋。

## 設定介面

「模型進階能力與多角色」依第一列 Provider、模型、音色及傳輸顯示能力。此處改的是全域 providerOptions；降級候選的獨立 options 仍有優先權。合成使用**已儲存**設定。

可以直接選傳輸、格式、時間戳、ADC／服務帳號、Inworld deliveryMode、採樣率、參考錄音、詞典、自訂發音與模型原生參數。複雜欄位用有界 JSON 編輯；DeepInfra 同時列出所選模型接受的原生欄位。切換模型或傳輸後，先修正不相容的舊欄位再合成。

「多角色語音工作室」提供角色音色、逐段台詞／語氣、增減台詞／角色、合成模式與完整播放／匯出。Polly／Inworld 額外提供詞典與雲端工作操作，展開或選取選單不會自動執行。

## 中立的多角色契約

`POST /dsh-tts/dialogue`：

```json
{
  "mode": "auto",
  "speakers": [{"id":"A","voice":"VOICE_A"},{"id":"B","voice":"VOICE_B"}],
  "turns": [
    {"speaker":"A","text":"你好。","instruction":"warm and calm"},
    {"speaker":"B","text":"很高興見到你。"}
  ]
}
```

- mode 為 auto／native／segments。native 不可用會報錯；auto 在沒有適用原生契約時逐段合成。原生請求失敗不會偷偷重送另一種付費操作。
- 最多 16 角色、100 段；原生模型仍受自身角色數／字數限制。speaker 可加 provider／model 改用跨服務逐段模式；turn.speed 為 0.5–1.5，必要時改走逐段並實際調整音檔速度。
- 回傳完整 audioBase64／mime、dialogueMode、duration、timeline 與可用 timing。原生合成沒有逐角色邊界時，timeline 只標示完整音檔，不猜角色邊界。
- 沒有對齊資料時 timing.available 為 false。逐段時間資訊經實際音訊解碼、調速、串接後位移為 scope: job、unit: seconds。

## 增量文字與 PCM

1. `POST /dsh-tts/live`，body：`{"action":"start","sessionId":"S","clientId":"C","text":"第一段文字"}`，取得 id。
2. `POST` 同路徑：`{"action":"append","id":"ID","sessionId":"S","clientId":"C","text":"後續文字"}`。
3. `GET /dsh-tts/live?id=ID&sessionId=S&clientId=C&after=0` 取得 frames 與 next。以 next 作下次 after；最多一批 32 包。
4. `POST` 同路徑：`{"action":"finish","id":"ID","sessionId":"S","clientId":"C"}`，關閉文字輸入但繼續接收服務音訊。
5. GET 加 `audio=1`，只有 state: complete 才提供完整音檔。DELETE 帶同一組 id／scope 取消。

frames 為有序的單聲道 PCM signed 16-bit LE，附 sampleRate 與 sequence；網路包不一定切在樣本邊界，播放器要保留最後一個未配對 byte。只能由符合 sessionId＋clientId 的整合讀取。此處不使用 Discord 專用介面。

選第一列支援增量的模型；live 強制適合的原生傳輸及 PCM（Polly 16kHz，其餘本批 24kHz），不套用降級鏈重播已消費的文字來源。文字、封包、音訊記憶體、工作數量與逾時均有限制。失敗／中止的封包可被消費端聽到，**不得**視為完成音檔。

一般 DSH「邊生成邊朗讀」選 WebSocket（或 Google Cloud／Polly 的 stream）時，已將 `assistant/message` 後續文字送進同一次原生合成，turn/end 關閉輸入。宿主事件粒度由 DSH 決定，不能宣稱是每個 LLM token。**現有聊天播放器仍等該次合成完成才播放；尚未接成邊收 PCM 邊播放。**外部整合可以用上述 frames 提前播放，完整匯出仍等服務成功完成。

## 明確 SSML 與服務管理

- `/speak` 或 `/preview` 的 ssml 欄位明確啟用 SSML；一般聊天文字不自動當 XML。只允許支援的 Provider，拒絕 DTD／外部實體與超大文件，避免把 SSML 切成破損片段。
- `POST /dsh-tts/provider-operation` 使用 `{provider,action,input}` 與宿主安全憑證，要求已認證的同源請求，不接受 body 金鑰。採第一個同服務候選的獨立憑證／參數。
- Polly actions：lexicon-list/get/put/delete、task-start/get/list。task-start input 為 text、bucket、可選 prefix／ssml；結果寫進用戶 S3。
- Inworld actions：dictionary-list/get/create/update/delete、async-start、batch-start、operation-get/list。詞典參數 workspace／id／displayName／pronunciations；更新／刪除需要當前 etag。phoneSymbols 必須是完整 phone token 陣列，不能把 IPA 字串按字元拆開。
- 非同步回傳工作與狀態，不自動重送提交、不把「已排程」當作完成，也不自動下載／解壓任意結果 URL。

## 驗證與邊界

本批新增 27 組協議／音訊／宿主測試。localhost 真實 WebSocket、分段 UTF-8／SSE、MessagePack、SDK 替身、FFmpeg 實際 PCM 串接、晚到時間戳／錯誤、斷線、取消、未完成回應都納入驗證。瀏覽器測試模擬 DSH 設定與播放界面，不等同實際 DSH 佈景驗證。

未使用真實付費 API、沒有替用戶建立雲端資源，沒有登入／發送 Discord。真實音色效果、服務權限、地域、配額、模型灰度發布仍需帳戶驗證。此次來源更動沒有經受驗證的宿主重載接口載入執行中的 DSH；不能把來源測試成功當作實機載入成功。

## 核對來源

- [Fish OpenAPI](https://docs.fish.audio/api-reference/openapi.json)、[Fish WebSocket](https://docs.fish.audio/api-reference/tts-websocket)
- [Cartesia SSE](https://docs.cartesia.ai/api-reference/tts/sse)、[Cartesia WebSocket](https://docs.cartesia.ai/api-reference/tts/websocket)
- [DeepInfra Kokoro](https://deepinfra.com/hexgrad/Kokoro-82M/api)、[Orpheus](https://deepinfra.com/canopylabs/orpheus-3b-0.1-ft/api)、[Chatterbox](https://deepinfra.com/ResembleAI/chatterbox-turbo/api)
- [DashScope Qwen-Audio client events](https://help.aliyun.com/en/model-studio/qwen-audio-tts-client-events)、[CosyVoice server events](https://help.aliyun.com/zh/model-studio/cosyvoice-websocket-api-server-events)
- [Polly API](https://docs.aws.amazon.com/polly/latest/dg/API_Reference.html)、[Polly IAM](https://docs.aws.amazon.com/service-authorization/latest/reference/list_polly.html)
- [Inworld script](https://docs.inworld.ai/tts/capabilities/script-synthesis)、[發音詞典](https://docs.inworld.ai/tts/capabilities/pronunciation-dictionaries)、[steering](https://docs.inworld.ai/tts/capabilities/steering)
- [Google Cloud streaming](https://docs.cloud.google.com/text-to-speech/docs/create-audio-text-streaming)、[Gemini speech](https://ai.google.dev/gemini-api/docs/speech-generation)
