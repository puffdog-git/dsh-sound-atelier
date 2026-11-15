# 合成控制（2026-11-12 第一批）

> 第二階段整批整合已補上；目前能力、使用方式、限制與驗證範圍以 [PROVIDER-STAGE2.md](./PROVIDER-STAGE2.md) 為準。以下保留前批歷史說明。

## 最新補充：豆包 V3 WebSocket／時間戳

`providerOptions` 可設定 `{"doubao":{"transport":"websocket","timestamps":true}}`。預設 `transport` 為 `http`；兩者均支援時間戳解析。WebSocket 走原生二進位雙向協議，處理 StartConnection／StartSession／TaskRequest／FinishSession、取消、字幕 364、gzip 及完整完成檢查。支援傳入 textChunks 與接收 onAudioChunk；不會失敗後自動換另一種傳輸重做計費請求。

需要時間戳時略過舊音訊快取。輸出 timing／工作 timings 明確標示 `unit: seconds`、`scope: segment`、`available`；沒有字幕就回不可用，不補造時間。此設定只適用 2.0，V1 不相容時會拒絕。UI 可選傳輸及開關字幕。

目前宿主後續 assistant/message 可送入同一原生連線，完整匯出已合併可用時間戳為全域時間軸；聊天播放器仍在該次合成完成後播放，反白仍按句子。外部 /live 整合可增量讀取 PCM。未做付費豆包帳戶驗證。

來源：[官方 WebSocket V3](https://docs.volcengine.com/docs/doubao-voice/websocket-bidirectional-streaming-v3?lang=zh)、[官方協議附件](https://portal.volccdn.com/obj/volcfe/cloud-universal-doc/upload_5ec6e28945592c909158dc1e2cf9a89c.zip)。

---

「語氣／心情提示」現在支援 MiMo、豆包 2.0、OpenAI mini TTS、Google、Eleven v3/v4、OpenRouter 的 OpenAI/Gemini/Fish、SiliconFlow CosyVoice。角色的 instruction 優先；MiMo／豆包沿用原本專屬設定，其他家使用 speechInstruction。Discord 的單次提示透過 preview 傳入，不改寫儲存設定，也不放進 Discord 顯示文字。

Google 3.8 使用 Interactions：文字保持逐字稿，語氣放 speech_metadata。舊版 Gemini 保留 generateContent 路徑。Eleven v3/v4 把提示轉成文字前方的 audio tag，因此使用簡短描述最合適；Multilingual v2 不會加上這些標籤。OpenAI tts-1/tts-1-hd 不傳 instructions。

進階設定頁的 providerOptions 是 JSON。這是**合成**控制；原本 rate/volume 是**播放**控制，兩者分別生效。

```json
{
  "openai": { "speed": 1.05, "format": "mp3" },
  "elevenlabs": { "stability": 0.5, "similarity_boost": 0.75 },
  "deepgram": { "speed": 1.05, "expressivity": 1, "normalize_volume": true },
  "azure": { "style": "cheerful", "styleDegree": 1.2, "role": "YoungAdultFemale" },
  "siliconflow": { "speed": 1.05, "gain": 2, "format": "mp3" }
}
```

- Eleven v4／Turbo 只傳 stability、similarity_boost；v2/v3 可用 style、speed、use_speaker_boost。v4 的其他控制在送出前拒絕。
- Deepgram 的新參數需要選 Flux 模型，例如 flux-alexis-en，使用 /v2/speak；Aura 維持 /v1/speak。expressivity 為整數 -2..2，speed 為 0.5..1.5、每格 0.05。非零 expressivity 屬上游 beta，效果仍需試聽。
- Azure 的 style/role 須選該 voice 實際支援項目；目錄已保留 styles/roles 資訊，尚未改成專用選單。
- OpenRouter 的 Google／HeyGen 需要 PCM，MiniMax 需要 MP3。選 PCM 必須指定該模型實際 pcmSampleRate，例如 `"openrouter":{"format":"pcm","pcmSampleRate":24000}`；插件包成 WAV 供瀏覽器及 Discord 解碼，不猜未知模型的取樣率。
- SiliconFlow 的 PCM 會明確要求 24000 Hz 並包成 WAV；可用 sampleRate 選上游允許的值。CosyVoice 的語氣會轉成 endofprompt 前的指示。
- 不接受任意 request body／header／金鑰欄位。格式、數值和模型限制在送出前驗證，避免已計費後才發現本機設定不合法。

語氣效果取決於模型與音色，不代表已完成自動情緒判斷。新增控制已加入快取及同時請求識別，避免同一句不同情緒拿到舊音訊。

驗證為請求契約、錯誤處理、音訊封裝、瀏覽器與 Discord 模擬；桌機未配置雲端金鑰，不能把這些結果當成各家帳號已成功合成。

官方依據：[Google](https://aistudio.google.com/docs/speech-generation)、[OpenAI](https://developers.openai.com/api/docs/guides/text-to-speech)、[ElevenLabs](https://elevenlabs.io/docs/help-center/product/core-capabilities/text-to-speech/how-do-audio-tags-work-with-eleven-v3-and-v4)、[Deepgram](https://developers.deepgram.com/reference/speak/v-2/audio/generate)、[Azure](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup-voice)、[OpenRouter](https://openrouter.ai/docs/guides/overview/multimodal/tts)、[SiliconFlow](https://docs.siliconflow.cn/docs/api/audio-speech-post)。

## 第二批：MiniMax、Groq、CosyVoice

MiniMax 可在介面選「自動／原生 HTTP／既有 CLI」。自動模式有 MINIMAX_API_KEY 時走原生 API，沒有才保留 CLI；HTTP 合成失敗不會再跑 CLI。金鑰使用原本憑證儲存介面。HTTP 預設 speech-2.8-hd，支援 2.8 Turbo 與較舊模型，並可讀取帳號下的系統、已啟用複製與設計音色。這是讀取及使用既有音色，沒有新建或訓練音色。

MiniMax 情緒已有下拉選單，2.8 可選 happy/sad/angry/fearful/disgusted/surprised/calm；fluent/whisper 僅允許 2.6。其他參數範例：

```json
{"minimax":{"emotion":"sad","speed":0.95,"pitch":-1,"vol":1,"format":"mp3","modifyPitch":-10,"intensity":5,"timbre":10,"normalization":"quality"}}
```

pitch 是 -12..12 整數；modifyPitch/intensity/timbre 是 -100..100 整數。音色修飾不支援 PCM。soundEffects 可選 spacious_echo/auditorium_echo/lofi_telephone/robotic。CLI 不會套用這些 HTTP 參數。MiniMax 目前支援結構化情緒選項，不宣稱能理解 Discord 任意自然語言提示。

Groq 英文 Orpheus 可使用語氣提示，轉成簡短方括號 direction；最多 100 字元，建議英文。合成會扣除 direction 長度後，把逐字稿切成每次最多 200 字元，保留 Unicode 與完整 inline tags，再合併各段的 WAV 音訊資料。任一段失敗不回傳半段音訊。阿拉伯模型使用另一組音色，且不注入英文 direction。

CosyVoice 現在有獨立服務設定：

- API：auto（先官方表單，只在 SFT 404/405 時嘗試 JSON /tts）、official、bridge。
- 合成模式：sft、instruct、instruct2、zero-shot、cross-lingual。須確認服務載入的模型實際支援該模式；CosyVoice 2/3 常使用參考音訊模式。
- instruct 使用內建音色與語氣；instruct2 使用參考 WAV 與語氣；zero-shot 還需錄音逐字稿。
- 參考錄音必須是本機絕對路徑、10 MiB 以下的有效 PCM WAV，會送往設定的 CosyVoice 服務。沒有下載或啟動 GPU 推理引擎。
- 官方回傳原始 PCM，依設定的實際取樣率包成 WAV，預設 24000 Hz。取樣率與服務不同會改變音速，務必依模型設定。
- 儲存設定後再試聽。更換同一路徑的參考檔會改變快取識別；不把 HTTP 200 JSON 錯誤當音訊。

第二批以請求契約與完整模擬流程驗證，並未呼叫真實雲端帳號或啟動 CosyVoice 服務。依使用者要求，DSH 更新期間不進行宿主操作／實機驗證。

官方依據：[MiniMax 合成](https://platform.minimax.io/docs/api-reference/speech-t2a-http)、[音色目錄](https://platform.minimax.io/docs/api-reference/voice-management-get)、[Groq Orpheus](https://console.groq.com/docs/text-to-speech/orpheus)、[CosyVoice 官方 FastAPI](https://github.com/FunAudioLLM/CosyVoice/blob/main/runtime/python/fastapi/server.py)。

## 第三批：OpenAI Realtime、MiMo voiceclone、DeepInfra Qwen

OpenAI 模型選單新增 gpt-realtime-2.1-mini 與 gpt-realtime-2.1。選用後自動走 WebSocket，每次合成建立獨立 session，傳入逐字稿及語氣提示，只要求朗讀，不掛載工具或對話上下文。完成後回傳 24 kHz PCM 封裝的 WAV。

- Realtime 不沿用舊 Speech API 的 MP3／其他壓縮格式與 speed 參數；providerOptions.openai.format 請移除或設 wav/pcm，speed 請移除或設 1。播放速度仍可用原本滑桿。
- 內建音色為 alloy、ash、ballad、coral、echo、sage、shimmer、verse、marin、cedar；亦可填入帳號已可用的 voice_ 開頭 ID。不會建立自訂音色。
- 依模型回傳的逐字稿比對輸入，忽略大小寫與標點，保留英文詞界。改寫、漏讀、增加回答、半段輸出或逾時均拒絕音訊。這是逐字稿檢查，並非另外執行 ASR 檢驗聲音；數字展開、繁簡轉換等差異也可能被保守拒絕。
- Realtime 是生成式模型，帳號權限、成本與合成品質仍需真實帳號驗證。既有預設模型、主要 Provider 和付費憑證未被自動修改。

MiMo 新增 mimo-v2.5-tts-voiceclone。選擇後可填本機參考 WAV／MP3 絕對路徑；合成時以 data URI 上傳至設定的 MiMo API。整個 Base64 字串限制在 10 MB 內，原始檔約需小於 7.5 MB；拒絕 URL、網路分享及無效檔頭。WAV 另驗證 PCM 結構，MP3 做容器檔頭檢查，是否能解碼仍取決於上游。更換同一路徑的檔案會改變快取識別。

MiMo voiceclone 的語氣仍放 user message，欲朗讀文字放 assistant message。VoiceDesign 明確關閉 optimize_text_preview，避免自動潤飾 Discord 已產生的文字。mp3/wav/pcm/pcm16 輸出均可使用，PCM 封成 WAV。這批沒有加入即時串流播放。

DeepInfra 新增兩種原生 Qwen 路徑：

- Qwen/Qwen3-TTS：預設 Vivian，可選九種預設音色或手動填入帳號既有 voice ID，語氣放 instruct。
- Qwen/Qwen3-TTS-VoiceDesign：用「描述想要的聲音」欄位生成音色；以 voice 描述帶入語氣，不傳此模型沒有的 instruct 欄位。
- 可設 `"deepinfra":{"format":"wav","language":"Chinese"}`。PCM 必須明確填 pcmSampleRate，不能猜未知模型的輸出取樣率。
- 原本 Kokoro 等 OpenAI 相容路徑保留。上述 language/pcmSampleRate 是這批 Qwen 路徑的設定，不套到其他模型。尚未新增音色上傳／建立／刪除管理。

此批通過本機 WebSocket 伺服器、請求替身、UI 與完整 Discord 音訊流程測試；尚未連真實雲端帳號驗證。DSH API 檢查顯示仍是前一批設定，需要正常重載後才能使用新功能。本次未操作 DSH 畫面或強行重啟。

官方依據：[OpenAI Realtime](https://developers.openai.com/api/docs/guides/realtime-conversations)、[WebSocket 協定](https://developers.openai.com/api/docs/guides/voice-websockets?api=realtime)、[MiMo 語音合成](https://mimo.mi.com/docs/en-US/quick-start/usage-guide/audio/speech-synthesis-v2.5)、[DeepInfra Qwen](https://deepinfra.com/Qwen/Qwen3-TTS/api)、[DeepInfra VoiceDesign](https://deepinfra.com/Qwen/Qwen3-TTS-VoiceDesign/api)。

## 第四批：SiliconFlow 參考錄音與各平台權限提示

設定頁在使用 SiliconFlow 時顯示「SiliconFlow 聲線來源」：

- 選擇的音色／既有 ID：維持原本 voice 合成方式。
- 本機參考錄音：目前僅支援 `FunAudioLLM/CosyVoice2-0.5B`。填入本機 PCM WAV 絕對路徑與逐字稿，儲存後試聽。參考錄音少於 30 秒，建議 8–10 秒，單人、清晰且沒有背景干擾；插件本機限制為 Base64 編碼後 10 MB。錄音及逐字稿會在合成時傳給所設定的 SiliconFlow 服務。
- 參考模式會取代聲音選單及單次 voice 覆寫；請求送 references 且不送互斥的 voice。語氣仍使用既有 `<|endofprompt|>` 路徑。這是單次參考，不建立或刪除平台音色。
- 切回一般模式即可繼續使用原本音色。檔案、逐字稿及模式變更會隔離快取與進行中的合成，避免重用不同聲線的音訊。
- 現階段只接 WAV 參考以便在本機驗證長度；不宣稱平台其他格式或 MOSS 多講者已完成適配。

所有雲端服務金鑰欄位下方現有各平台授權提醒及官方說明連結。只有官方已確認的項目使用明確的 scope 名稱；專案／資源型授權依其實際機制說明。Fireworks、DeepSeek Web 的 TTS 接口仍標為待核實。

驗證：TTS 82/82、Discord 153/153、client 語法與獨立瀏覽器桌面／手機檢查通過。SiliconFlow 合成替身 → 真實 FFmpeg → 攔截 Opus 流程成功（8,362 bytes、約 494 ms），未呼叫真實雲端、LLM 或 Discord。宿主目前尚無 siliconflowVoiceMode schema，需正常重載後使用；原本主要 Provider 仍為 Edge，未更改使用者設定。

官方依據：[SiliconFlow 合成 API](https://docs.siliconflow.cn/docs/api/audio-speech-post)、[參考音訊用法](https://docs.siliconflow.cn/docs/userguide/capabilities/text-to-speech)。

## 第五批：六個新增的原生 API Provider

Provider 選單新增 Fish Audio、Cartesia、DashScope、Amazon Polly、Inworld AI、Google Cloud TTS；原本的 `google` 仍為 Gemini API，與 `google-cloud` 分開。MiniMax 沒有變更。這批為單人、完整音檔合成接入；新增服務尚未以真實雲端帳戶驗證。

### 設定與憑證

1. Fish Audio：在安全金鑰欄保存 API Key，重新偵測後選擇帳戶音色或已授權公開音色，也可手動填入聲音模型 ID。預設 `s2.1-pro-free`；其他已列模型為 `s2.1-pro`、`s2-pro`、`drama-3`。聲音 ID 必須由使用者選擇。自然語氣會轉為獨立的方括號 direction，正文保持原樣。
2. Cartesia：保存 API Key，選取 Sonic 3 系列與音色。新增合成語言及情感選單；情感控制僅英文，請將合成語言設為 `en`。任意自然語言語氣不會自動轉換為 Cartesia 固定情感。
3. DashScope：保存同地域、同業務空間的百煉 API Key，填入業務空間 ID，選北京或新加坡。支援 Qwen-Audio 3.0/3.1 Flash/Plus HTTP，音色清單會隨模型切換；內建選項僅為部分官方系統音色，可填既有設計／複製音色 ID。自然語氣以 input.instruction 傳送。回傳的音檔網址僅允許指定格式的 DashScope OSS 結果網域，使用 HTTPS、禁止轉址，下載時不附 API Key。
4. Amazon Polly：安全憑證欄需填 JSON，包含 `accessKeyId`、`secretAccessKey`，臨時憑證另填 `sessionToken`。例如欄位格式為 `{"accessKeyId":"YOUR_ACCESS_KEY_ID","secretAccessKey":"YOUR_SECRET_ACCESS_KEY","sessionToken":"OPTIONAL_SESSION_TOKEN"}`；沒有 session token 時刪除該欄。不要將 secretAccessKey 填到一般設定。設定 AWS Region 後重新偵測，模型欄選 standard/neural/long-form/generative 引擎，再選相容音色。需 IAM `polly:SynthesizeSpeech`、`polly:DescribeVoices`。官方 SDK 負責 SigV4；自動重試關閉以免重複合成。同步純文字最多 3000 字；本版沒有 SSML、speech marks、S3 非同步任務。
5. Inworld AI：安全欄位貼入 Portal 複製的 Base64 憑證，不要再次 Base64 編碼。音色查詢需讀取權限，合成需寫入權限。`inworld-tts-2` 可用方括號語氣指令；1.5 系列維持基本合成。非串流請求包含指令最多 2000 UTF-16 單位；Discord 適配層仍會切段。
6. Google Cloud TTS：在安全憑證欄貼入完整服務帳號 JSON；啟用其專案的 Cloud Text-to-Speech API、計費及合成權限。使用官方 google-auth-library 取得 cloud-platform scope 的 OAuth token，token 僅存記憶體；不使用傳入 JSON 的自訂 token_uri。此欄不是 Gemini API Key，也不是憑證檔路徑。從原生 /v1/voices 選取音色，模型由聲音 ID 決定。原生請求最多 5000 UTF-8 bytes；Chirp HD 本版未啟用合成 speed/pitch/volume 控制，可使用播放器調音。沒有新增任意 prompt、聲音複製或即時文字串流。

所有金鑰／憑證都走原有宿主安全憑證儲存；UI 不讀回明文。請先儲存設定再試聽，尤其是地域與工作區。新增合成格式選單可選 MP3／WAV；適用服務另支援 Ogg Opus，進階 JSON 可選原始 PCM（Google Cloud 除外）。

### 進階合成範例

```json
{"fish":{"format":"wav","speed":1.1,"temperature":0.7},"cartesia":{"format":"wav","language":"en","emotion":"sad","speed":0.9},"dashscope":{"format":"wav","sampleRate":24000,"speed":0.95,"pitch":1,"volume":50},"polly":{"format":"mp3","sampleRate":24000},"inworld":{"format":"wav","sampleRate":24000},"google-cloud":{"format":"wav","speed":0.95,"pitch":-1}}
```

Polly 的 WAV 是將 API PCM 封成 WAV，僅能選 8000 或 16000 Hz；Polly Opus 僅 48000 Hz。Fish PCM 必須明確指定 sampleRate。所有選項使用白名單校驗，不會直接將任意 JSON 展開到雲端請求。

### 驗證範圍

TTS 101/101、Discord 154/154、前端語法與六個 Provider 的桌面／手機設定操作通過；另以正式 Provider 程式、合成替身、真實 FFmpeg 與攔截 Opus 驗證六條完整 Discord 流程。AWS 簽章測試使用真正 AWS SDK 與替身 HTTP handler。Google 授權以替身 token provider 驗證。未使用真實帳戶、付費雲端、LLM 或 Discord 發送；不代表新增平台都已實機試聽。DSH 尚未載入本批 schema。

官方依據：[Fish TTS](https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech)、[Fish 表達](https://docs.fish.audio/developer-guide/core-features/emotions)、[Cartesia](https://docs.cartesia.ai/api-reference/tts/bytes)、[Cartesia 控制](https://docs.cartesia.ai/build-with-cartesia/capability-guides/volume-speed-emotion)、[DashScope HTTP](https://help.aliyun.com/zh/model-studio/qwen-audio-tts-http-api)、[DashScope 音色](https://help.aliyun.com/zh/model-studio/qwen-audio-tts-voice-list)、[Polly API](https://docs.aws.amazon.com/polly/latest/APIReference/API_SynthesizeSpeech.html)、[Polly IAM](https://docs.aws.amazon.com/service-authorization/latest/reference/list_polly.html)、[Inworld 合成](https://docs.inworld.ai/api-reference/ttsAPI/texttospeech/synthesize-speech)、[Inworld 音色與授權](https://docs.inworld.ai/api-reference/voiceAPI/voiceservice/list-voices)、[Google Cloud 合成](https://docs.cloud.google.com/text-to-speech/docs/reference/rest/v1/text/synthesize)、[Google Cloud 驗證](https://docs.cloud.google.com/text-to-speech/docs/authentication)。
