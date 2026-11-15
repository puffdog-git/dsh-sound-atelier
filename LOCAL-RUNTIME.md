> 本機工作室、RVC、完整功能對齊與實測限制：見 [STAGE3-WORKSHOP.md](STAGE3-WORKSHOP.md)。

# 本機模型與參考錄音：第三階段第一批

本批已完成可使用的錄音資產、獨立 Kokoro 推理、Xinference 合成與管理接入、GPT-SoVITS 基本原生合成。後續已加入八家雲端音色／訓練管理，見 [雲端音色指南](CLOUD-VOICES.md)。**第三階段仍在進行**：其他服務的專屬聲音訓練、RVC、參考插件其他功能與更多模型的真機驗證尚未完成。

## 開源使用方式

Xinference 是選配後端。雲端／Edge 使用者不需要安裝；本機模型使用者可以連接自己的服務，或另外準備隔離環境。插件安裝包不包含 Python、CUDA、模型權重、帳號或憑證。

Windows 提供環境準備腳本（需要已有 Node/npm 或 uv）：

```powershell
powershell -File tools/setup-local-runtime.ps1 -Backend kokoro
powershell -File tools/setup-local-runtime.ps1 -Backend xinference -Device cu128
# 沒有適合的 NVIDIA GPU，改用 -Device cpu；模型本身仍須支援 CPU。
```

腳本鎖定 kokoro-js 1.2.1、Xinference 4.1.0、Python 3.12.13、Torch/TorchAudio 2.11.0、TorchCodec 0.17.0；Xinference 路徑另準備 SHA256 核對的 Windows FFmpeg 9 shared libraries。上游 latest 資產若更動，摘要不符會停止，不解壓未知內容。它是**準備腳本**，不是已在所有全新 Windows 環境驗證的一鍵安裝產品。

腳本不建立帳號，不啟動服務，也不自動下載所有模型。第一次載入某個模型時，可能另裝該模型依賴與下載權重。設定頁的「啟動本機 Xinference」只啟動已準備的環境；首次帳號設定依 Xinference 官方流程完成。

一般使用者可將自己建立的 API Key／存取權杖存入 DSH 安全憑證欄。API Key 用於查詢與合成；**Xinference 4.1 的模型載入／卸載要求帳號登入權杖，API Key 不能執行這些操作**。本機代管連線可分別使用受限 client 帳號與 API Key，不需要把管理員密碼放進插件設定。

## 本批實際驗證的路徑

| 路徑 | 實作與驗證 |
| --- | --- |
| `kokoro` | 獨立 Node worker、ONNX CPU 推理、q8、預設英文音色；已真實生成並解碼 WAV。此 JS 版本只作英文路徑，不宣稱支援中文或參考複製。 |
| `f5` | 使用獨立 Xinference F5 模型與已驗證參考錄音／逐字稿；已在 RTX 5080 產生英文及中文 WAV。 |
| `local-tts` + Xinference | 模型 UID、參考 multipart bytes、JSON-string kwargs、按家族驗證；F5 有真機驗證，其他家族目前是契約／音訊替身驗證。 |
| `local-tts` + GPT-SoVITS | 直接 `/tts`、驗證錄音路徑、逐字稿／語言、WAV、speed_factor、cut0；契約驗證，未部署實際 GPT-SoVITS 模型。 |

Xinference 家族包括 Kokoro、F5、Qwen3、IndexTTS2／2.5、Breeze、Fish、Irodori、CosyVoice。UID 不含家族名稱時，在設定頁明確選家族。支援的原生參數放在 `providerOptions["local-tts"].native`；不把一家的參數直接套到另一家。音訊格式目前統一 WAV／非串流。

Index 情緒文字／八維向量與強度可透過 Xinference REST 契約傳遞。獨立情緒音檔需要另一條受驗證的原生／SDK 適配，**本批未把任意檔案路徑偽裝成已支援的情緒上傳**。dots.TTS 尚未接入；Irodori 等家族存在適配不代表本機已安裝或驗證。

## 錄音資產

在「角色音色、發音字典與整合 → 本機模型與參考音色」新增或拖放錄音，填名稱與逐字稿：

- 上傳不超過 10 MiB，解碼成單聲道 24kHz WAV，接受 0.25–120 秒；拒絕無法解碼及近乎靜音的檔案。
- 使用 UUID 保存，不以使用者名稱拼接檔案路徑；檢查 SHA256 後才用於合成。最多 500 份／512 MiB。
- 音訊驗證只代表格式、長度及訊號檢查通過，不代表逐字稿正確，也不代表完成聲音訓練。
- `kind: reference`、`state: validated`、`cloned: false` 明確區分參考錄音與永久音色。每個 Provider／服務／模型實際合成成功後，另外記錄 binding 及時間。
- 可以改名稱／逐字稿；逐字稿變更會清除舊合成成功紀錄。刪除只刪本機錄音與紀錄，不會刪除遠端音色／模型。
- 全域「目前參考錄音」只套用本機 `local-tts`／F5／CosyVoice。Fish／MiMo／SiliconFlow **必須在該候選明確選錄音**，才會將錄音送至雲端；不因全域本機選擇或降級而自動上傳。

`GET/POST/PATCH/DELETE /dsh-tts/voice/assets` 管理資產；`GET /dsh-tts/voice/reference?id=UUID` 讀 WAV，均要求已認證同源請求。舊 `/voice/clone` 保留入口，但只回傳 assetId、voiceId:null、cloned:false；不接受客戶端 rootDir，不再把保存 bytes 說成已完成複製。

## 服務與資源管理

`GET/POST /dsh-tts/local/service`：

- kokoro-load／kokoro-unload：載入／釋放獨立 worker；閒置五分鐘卸載。停止 worker 不保留待執行工作；取消當前請求不會讓其他會話的取消訊號互相共用。
- start-service／stop-service：啟停插件自己啟動的 Xinference；不接管或終止原本已在跑的外部服務。Windows 停止會處理已擁有的程序樹。
- list／launch／unload：查詢與明確載入／卸載 audio 模型，卸載保留權重。launch input 為 name、uid、gpus:0或1。沒有自動一次安裝所有模型。
- 模型存在、HTTP 200、套件已安裝都不等於成功推理。Kokoro 使用 unloaded／loading／loaded／verified／failed；錄音的模型驗證另存 binding。
- 本機服務 URL 限 loopback，不接受帳密、query、redirect。對使用者既有服務只進行明確請求。
- Kokoro 能以停止 worker 中斷正在進行的工作。Xinference REST 取消只保證停止客戶端等待／傳輸，**不宣稱上游所有模型都會立即停止 GPU 計算**；統一的原生工作取消與閒置模型卸載仍待補。
- 代管服務的診斷事件只記啟停與狀態，不將上游完整日誌、提示詞或權杖回傳至設定介面。

本機代管憑證使用 Windows DPAPI CurrentUser 加密檔，位於使用者 `.dsh/tts-runtimes/credentials`，綁定精確 loopback 服務地址。插件設定／開源套件／診斷報告不包含密碼或 API token。其他作業系統可使用宿主安全憑證與既有服務，不套用 Windows DPAPI。

需要自行登入代管服務的 Web UI 時，可在同一 Windows 帳號執行 `powershell -File tools/show-local-login.ps1 -RevealPassword`，只在本機終端顯示管理員登入資料；該工具不顯示插件 API token，也不透過 HTTP 傳送密碼。

## 模型與授權

Kokoro ONNX 鎖定 revision `1939ad2a8e416c0acfeecc08a694d14ef25f2231`，該模型卡標示 Apache-2.0。本次 F5 checkpoint 鎖定 revision `4dcc16f297f2ff98a17b3726b16f5de5a5e45672`，檔案 SHA256 `4180310f91d592cee4bc14998cd37c781f779cf105e8ca8744d9bd48ca7046ae`，大小 1,348,645,281 bytes。

插件程式與模型權重有不同授權。本次 F5 權重標示 **CC-BY-NC-4.0**，其程式碼則是 MIT；不可因插件開源就將該權重視為可任意商用。插件不將這些權重打包分發。[F5 模型卡](https://huggingface.co/SWivid/F5-TTS/blob/4dcc16f297f2ff98a17b3726b16f5de5a5e45672/README.md)、[Kokoro ONNX 模型卡](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX)。

## 後續仍需完成

永久雲端音色建立／訓練／查詢／刪除的 Provider 生命週期、RVC 轉換與模型／索引／音色包、Index 獨立情緒音訊、更多模型真機部署、dots、完整原生串流與 GPU 工作取消、閒置模型卸載、首次安裝／帳號設定 UI，以及參考插件的選取朗讀／Web Audio 排程／通知策略／用量估算／診斷對齊。這批不是第三階段全數完成。
