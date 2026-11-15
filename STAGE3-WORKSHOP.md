# 第三步完成：聲音管理與本機工作室

本階段在 2026-11-13 完成來源實作與獨立驗證。聲音參考檔、雲端 voice ID、訓練權重與成功推理紀錄分開保存；上傳或模型清單存在均不代表聲音已完成複製。雲端八家生命週期及付費／審核限制見 CLOUD-VOICES.md。

## 使用方式

設定頁的本機模型區可上傳／拖放／驗證錄音及逐字稿，安裝獨立環境、啟動 Xinference、建立本機專用帳號、查詢／載入／卸載模型。長時間安裝和載入以背景工作呈現，可查看進度或取消。帳密與音訊 API Key 由 Windows DPAPI 保護，不寫入插件或診斷報告。

「本機服務」支援 Xinference、GPT-SoVITS 原生 API、dots 原生 worker、Index 原生 worker。Index 原生模式可分開選聲線錄音及情緒錄音；情緒音訊、八維向量與文字三擇一。Index 2.5 另有語言及 duration factor 對應；GPT-SoVITS 原生取樣、切句、批次與 cache-dit 參數透過 local-tts.native 設定，未知欄位會拒絕。

RVC 為合成後處理：先由選定 Provider 產生聲音，再以可信 .pth 轉聲線。可匯入／改名／刪除 .pth、.index、音色 ZIP，從 SHA256 固定的 schema 1/2 registry 安裝音色與索引版本，匯出可攜音色包及壓縮索引。無索引模式會把 index_rate 設為 0；轉換後清除不再準確的原始時間戳。可明確啟用「RVC 失敗時播放原始合成」，不會另外送文字至另一服務。權重可能包含 pickle，僅載入可信來源。

安裝環境選項 rvc-portable 可建立離線 Windows x64 RVC 資料夾，含真實 Python、套件、RVC 來源及必要通用推理資源，不含使用者音色或帳密。也可用已準備的 RVC Python 執行 tools/package-rvc-runtime.py --output <新的外部資料夾>。整個資料夾搬移後執行 start-rvc.ps1，再將插件設為外部 RVC。其他系統可連接自行準備的本機服務；內建一鍵安裝及可攜打包目前針對 Windows。

## 本機合成實測

下列為這台 RTX 5080 16 GB 桌機的實際輸出；不是 HTTP 替身或模型清單推論。

| 路線 | 輸出與範圍 |
| --- | --- |
| Kokoro ONNX | 真實英文合成／解碼／播放；獨立 runtime 僅英文 |
| F5-TTS | GPU 中文及英文真實合成、暖機重測 |
| Qwen3-TTS 0.6B Base | 中文 WAV 3.04 秒，合成約 21.5 秒 |
| IndexTTS2 / Xinference | 中文 WAV 約 3.59 秒 |
| IndexTTS2 / 原生 | 獨立情緒錄音接口真合成約 3.55 秒；不等於已評測情緒相似度 |
| IndexTTS 2.5 / 原生 | 獨立情緒錄音接口真合成約 4.11 秒 |
| Breeze-TTS-2 | 中文 WAV 3.28 秒，合成約 28.4 秒 |
| Irodori v4.1 Small | 日文 WAV 4.68 秒，合成約 7 秒 |
| dots.tts-mf | 原生 GPU WAV 3.2 秒；其餘檢查點為介面驗證，未逐個下載試聽 |
| CosyVoice2 0.5B | 零樣本參考合成 WAV 3.64 秒，約 18.9 秒 |
| RVC | 公開 VCTK 預訓練基線轉換 5.06 秒音訊；不是使用者訓練的克隆音色 |
| RVC 可攜 runtime | 搬到不同目錄後真實 CPU 轉換成功，未接管外部程序 |
| Fish S2 Pro | 模型可載入，但短句合成在 16 GB 顯存接近滿載時超過 5 分鐘；不標為推理已驗證。可連接資源充足的外部服務，或選其他已通過模型 |

RVC 真實 FAISS 測試將 4000 向量索引由 12288045 bytes 降至 1536045 bytes，來源雜湊保持不變，生成的暫存檔會清除。另修正 FAISS 在 Windows 中文路徑讀寫的問題及 deserialize_index 重入快取鎖造成的阻塞。

## 參考插件功能對齊

對照 1624318455/dsh-plugin-tts e8d1edd2（0.7.2）的功能群，保留 MIT 來源註記；並非覆蓋原插件或複製其整個介面。

| 功能 | 本插件對應 |
| --- | --- |
| Edge 原生協議、重試、手動及自動朗讀 | 原有協議與工作佇列；新增輸入框常駐自動朗讀開關 |
| 選區朗讀 | 同一則助理訊息範圍的浮動按鈕，避開輸入框與跨訊息選區 |
| 長文分段／預熱／無縫播放 | 依實測合成延遲校準分段，既有並行預合成，WebAudio 預解碼／三段提前排程；不足時顯示緩衝，不製造音訊或裁尾 |
| mini player | 訊息所有權、分段計數、時間軸、暫停／繼續／停止／跳段／倍速 |
| 重播、下載 | 完整訊息音訊合併及匯出，避免只保留末句；比上游分段長文不可匯出的限制更完整 |
| Markdown | 清理／原始文字選項；自動事件與 API 可保留原文，畫面手動／選區朗讀只能取得實際可見文字，不宣稱還原已渲染的 Markdown |
| 批准通知 | asked／decided／question，依會話及 approval ID 去重；要求可插隊，結果僅閒置時播放；獨立 Edge 聲音，不受 RVC 卡住 |
| RVC | 後處理、可信權重／索引、無索引、參數、壓縮、registry、音色 ZIP、Windows 可攜 runtime |
| Index / Cosy / GPT-SoVITS | 參考資產及專屬契約；Index 原生情緒參考分離、Cosy 原生模式與 Xinference、GPT-SoVITS 官方 /tts |
| Google 月用量 | 持久的插件提交字元估算，按 Standard/WaveNet/Neural2/Chirp3/Studio/Gemini 分類；非服務商帳單，不假設其他程式用量或固定免費額度 |
| 診斷／引導 | 安裝與首次帳號流程、背景工作、硬體／程序／模型狀態、可下載 JSON；不包含金鑰／密碼／逐字稿或環境變數 |
| 歸檔與播放錯誤 | 實際 useWorkspaces 歸檔集合守衛；主題化錯誤提示、HTMLAudio 降級 |

「無縫」指後續音訊已備妥時按取樣時鐘接續。服務生成速度若慢於播放，仍可能緩衝；原生即時文字連線的聊天播放仍等待該次合成完成，外部 /live 的即時 PCM 不受此限制。WebAudio 倍速會改變音高；HTMLAudio 的 preservesPitch 可保留音高，兩者不冒稱完全相同。

## 生命週期與版本

只會停止插件自己啟動的程序，或卸載自己明確建立的模型 UID。外部模型取消僅停止傳輸，不假稱 GPU 已停止；取消自管推理會卸載／停止 worker，後續會話重新載入，閒置預設五分鐘釋放。關閉插件會取消背景工作並釋放自管資源，模型權重保留。

已處理 Windows TorchCodec 索引優先序、Index 缺少套件與不完整 BigVGAN 快取、第三方 MLX 命名空間誤判，以及 Python UTF-8 IPC。模型與依賴安裝在 ~/.dsh/tts-runtimes 和 ~/.dsh/tts-xinference，插件封裝不帶模型、帳號或使用者資產。Breeze、Fish S2、F5 的權重授權另有非商用限制；套件程式碼授權不代表模型或生成用途不受限制。詳見 LOCAL-RUNTIME.md、THIRD-PARTY-NOTICES.md。

## 驗證分界

238 組 TTS 測試、獨立桌面／手機 UI、28 Provider 共用播放器格式測試、跨會話／同會話所有權／auto OFF 手動試聽回歸，以及真實 AudioContext 三段取樣時鐘排程、暫停／跳轉／倍速／停止測試已通過。上述多家雲端的 API 契約採替身，沒有使用付費帳戶建立或合成，也沒有對真正 Discord 房間送音訊。執行中 DSH 的最後載入版本需在整體後續工作收尾時另行確認。
