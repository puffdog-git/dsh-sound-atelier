# 本機語音設定擴充

## 2026-11-12 Provider 第三批

- OpenAI 穩定版 Realtime WebSocket 路徑、逐字稿核對、音訊完成／取消／大小限制；舊 Speech 模型保留。
- MiMo voiceclone 讀取本機參考 WAV／MP3、encoded 10 MB 限制、PCM 封裝及參考檔快取識別；VoiceDesign 關閉文字潤飾。
- DeepInfra Qwen TTS／VoiceDesign 原生參數，語言、音色及語氣；保留其他模型相容路徑。
- 獨立 UI、假 Provider＋真 FFmpeg 模擬流程及本機 WebSocket 測試；真實帳號與宿主載入待驗證。

## 2026-11-12 Provider 第二批

- MiniMax 原生 t2a_v2 HTTP、2.8 模型、情緒／音色修飾與帳號音色目錄；保留無金鑰時的 CLI 相容路徑。
- Groq 200 字元分段、英文 direction、英／阿語音色識別及正確 WAV 合併。
- CosyVoice 官方 multipart、PCM 封裝、指令／參考錄音模式；修正端點 fallback 和 JSON 錯當 WAV。
- 參考檔異動納入快取／同時請求識別；音訊讀取有大小限制與取消處理。
- 使用方式與限制見 PROVIDER-CONTROLS.md。DSH 更新期間僅獨立測試，不呼叫或重啟宿主。

## 2026-11-12 桌機修復

- 新增豆包 Seed-TTS 2.0 V3 HTTP Chunked 合成、語氣／心情提示、半音調整與逐包解析；預置 2.0 使用 API Key，不需舊 App ID。原本 BV 音色保留 V1 合成。
- 豆包選 `seed-tts-2.0`，使用 2.0 音色（例如 `zh_female_vv_uranus_bigtts`），可在調音區填寫語氣。`seed-icl-2.0` 僅支援使用已有克隆音色合成，不含上傳建立音色，也不把自然語氣指令套到標準克隆路徑。
- 修復長回覆因 maxQueue 丟失前面句子，並將逾時起算點移到實際合成開始。HTTP／SSE 的回放保留量與合成並行預算分開。
- 原生 Edge 暫時性失敗重試一次，保留原生與 CLI 的兩段失敗資訊。
- 更新 Groq 預設為 Orpheus／WAV、Deepgram 的 Speak v1 預設為 Aura-2；其餘 Provider 的新協議差異另有核對報告，沒有宣稱全部已升級。
- Discord 適配程式位於 Discord 插件，沿用 TTS 的既有 HTTP API；本插件沒有新增 Discord 專用服務或發送功能。
- 驗證新增豆包 V3 契約、UTF-8／SSE 分片、取消、舊版相容、長文排程與不同語氣的合成隔離。真實豆包帳號尚未配置金鑰，沒有做付費合成。

以下為移轉前的擴充紀錄。

以 @goodandready/dsh-tts 0.4.42 為基礎，加入設定側欄、模型與聲音清單、搜尋、調音與角色設定。

VoAI 使用原生 ConnectAPI：`GET /TTS/GetSpeaker` 及 `POST /TTS/Speech`，API Key 由既有憑證服務保管。請在設定中選擇 voai、儲存 API Key，再選擇帳號可用的模型、配音員與說話風格。支援音調、停頓及 Classic 風格強度；語速、音量透過播放器調整。單次合成限 1000 字，長回覆請使用逐句朗讀。

Edge 使用即時聲音清單及原生連線，保留 CLI 備援。MiMo 加入風格指令與 Voice Design。通用 OpenAI 相容端點只有在提供模型／聲音列表 API 時才能自動列出；內建選項會標示為預設。未加入 RVC、IndexTTS、GPT-SoVITS 等額外引擎或聊天平台整合。

驗證：`npm test`；設定 PLAYWRIGHT_MODULE 後執行 `node test/browser-check.mjs`。VoAI 使用模擬 API 驗證，實際帳號合成需自行儲存金鑰後試聽。

這是本機修改，外掛市集升級可能覆蓋。原版備份及安裝清單存放在工作區的 `.backups` 目錄；測試程式保留於此來源目錄。
