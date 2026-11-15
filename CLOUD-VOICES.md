# 雲端音色與訓練管理：第三階段第二、三批

設定頁 →「角色音色、發音字典與整合」→「雲端音色與訓練管理」。先儲存服務列、金鑰及必要的地域／Workspace，再重新讀取。管理的是服務商帳戶內可重用的 voice ID；部分服務的未啟用音色有保留期限，不能一概視為永久保存。單次合成參考錄音仍由本機錄音資產管理，兩者不混用。

| 服務 | 已接入生命週期 | 狀態處理 |
| --- | --- | --- |
| ElevenLabs | Instant Voice Cloning、匯入 ID、查詢、改名、刪除、指定 ID 試聽 | 保留要求驗證、模型訓練中、受限狀態；需至服務商完成驗證，不在插件冒充通過 |
| Fish Audio | fast 模型建立、匯入 ID、查詢、改名、刪除、指定 ID 試聽 | private 建立；created/training、trained、failed 與下架狀態分開 |
| Cartesia | clone、匯入 ID、查詢、改名、刪除、指定 ID 試聽 | 使用 2026-08-14 契約、private 建立、語言必填，archived 不標為可用 |
| Inworld | IVC、匯入 ID、查詢、改名、刪除、指定 ID 試聽 | 使用 workspace-prefixed voiceId；PATCH display_name mask；可設定語言及逐字稿 |
| DashScope | Qwen-Audio 3.0/3.1、CosyVoice v2/v3/v3.5 enrollment 建立、查詢、刪除、更換參考錄音、指定 ID 試聽 | Workspace／地域／目標模型綁定；DEPLOYING、OK、UNDEPLOYED 分開；僅本機標籤改名 |
| MiniMax | 上傳原始錄音、以自訂 ID 複製、查詢、刪除音色、刪除上傳檔、指定 ID 試聽 | 先保存精確 int64 file ID；未啟用音色清單可能不顯示，7 天內須正式使用；僅本機標籤改名 |
| SiliconFlow | CosyVoice2 上傳、URI 匯入、清單查詢、刪除、指定 URI 試聽 | 使用完整 speech: URI 及逐字稿；僅本機標籤改名，不偽造 rename API |
| 豆包 | V3 預付槽訓練、後付費 ID 建立、查詢、預付槽重新訓練、升級 ICL 2.0、指定 ID 合成 | 剩餘訓練次數、未訓練／訓練／成功／失敗／啟用分開；此適配器未接遠端刪除或改名，需至控制台處理 |

目前管理端只接經驗證的官方服務端點；MiniMax 支援 io/cn，SiliconFlow 支援 cn/com，DashScope 使用已設定 Workspace 與地域的官方域名。沒有接入的 Provider、聲音設計或專屬訓練流程不會因為出現錄音上傳 UI 就被宣稱為完成。ElevenLabs 本批是 IVC，未接 Professional Voice Cloning 的樣本編輯／本人驗證／訓練送件；DashScope Qwen3 flash 不硬套 Qwen-Audio enrollment 契約，SiliconFlow 永久複製目前限 CosyVoice2。

## 使用流程

1. 在本機錄音管理上傳並驗證參考檔；必要時補逐字稿。
2. 選擇已儲存服務列。這會綁定 Provider、官方端點、模型及安全憑證槽名稱，不會把 API Key 寫進音色紀錄。
3. 明確勾選上傳確認後建立；可能使用服務商的方案額度。Fish/Cartesia 採私有建立。也可只匯入已有 voice ID，不重新上傳錄音。DashScope 前綴需 1–10 個英文／數字；MiniMax 自訂 ID 與豆包後付費 ID 可留空，由插件產生；豆包預付槽必須填已購買的 S_ ID，且另確認覆寫／消耗訓練次數。
4. 查詢至服務可用後，點擊合成試聽；可修改試聽文字語言。只使用該服務和 voice ID，沒有降級鏈、角色覆蓋、參考錄音覆蓋或快取。取得該服務的音訊才寫入「曾成功合成」時間；這不是聲紋相似度評分或聽感品質保證。
5. 可將 voice ID 填回原服務列，再儲存設定。原憑證槽／模型已變動、或 Fish 仍有其他參考音訊選項時會提示先修正。

MiniMax 首次正式合成、豆包後付費音色首次正式合成可能產生複製／轉正費，管理頁另有啟用確認。建立時不附帶 MiniMax text 或豆包 demo_text，不自動觸發試聽合成；「合成試聽」是正式 TTS 請求，與服務商提供的 demo 音訊不同。未啟用 MiniMax 音色不在 get_voice 清單，不代表已刪除；若建立回應遺失或匯入未啟用 ID，可明確勾選風險說明後嘗試一次正式合成來驗證，不會重新上傳或重新建立。

MiniMax 原始錄音至少 10 秒，受共用錄音資產目前 120 秒上限限制；SiliconFlow 需 ≤30 秒及 1–2000 字逐字稿；本批 DashScope enrollment 使用 3–30 秒；豆包限制 ≤25 秒避免上游按時長截短。DashScope 語言提示依模型支持清單驗證；CosyVoice v2 不傳不適用的 language_hints。

DashScope／豆包預付槽可選新參考錄音並明確確認「重新訓練」。這會替換遠端音色並清除舊的合成驗證；逾時仍保留待確認，不自動再消耗次數。豆包僅有舊版效果的音色可明確升級到 ICL 2.0。後付費音色不提供盲目覆寫已啟用 ID 的操作。

## 失敗、逾時及刪除

- 建立前先保存固定 UUID 請求紀錄。同一 ID 不會再次送出建立；按鈕連點／重新連線不會自動重複建立。
- 送出後斷線、HTTP 5xx、408/429、或無法辨識成功回應時，保留「結果待確認」。不盲目重試，先到服務商控制台確認；可查詢並補登已建立的 ID。程序中斷時，未完成操作也顯示待確認。
- 改名／刪除對同一紀錄互斥；查詢 404 可記錄遠端不存在，401/403 不會被誤當刪除成功。
- 「永久刪除遠端」需要勾選對應 ID；「僅移除本機紀錄」另有確認，且保留遠端音色及原始參考錄音。刪除遠端後，降級鏈裡手填的舊 ID 不會自動改成其他音色，應自行修改服務列。
- MiniMax 原始上傳檔與克隆音色是兩個資源。先保存 file ID 再複製，複製失敗仍能看到並單獨刪除上傳錄音；音色刪除或本機忘記不會替你刪除上傳檔。file ID 以不損失精度的方式保存並按 int64 發送，避免 JavaScript Number 捨入。
- DashScope、MiniMax、SiliconFlow、豆包沒有在本適配器內提供遠端名稱編輯，按鈕明示「本機標籤」。豆包遠端刪除未接入，介面不顯示假的刪除按鈕；請在服務商控制台處理。
- 管理紀錄是本機追蹤資料，不是完整雲端控制台：未提供全帳戶遠端搜尋、樣本編輯、公開分享／發布、專屬訓練審核，或自動識別同一憑證槽換成另一帳戶的情況。更換槽內 API Key 後應重新查詢核對。

API 權限提示放在服務選擇下方：ElevenLabs voices_read / voices_write；Inworld 查詢需 Read，異動需 Write。各服務還須有相應方案、音色存取及合成額度；未經文件確認的權限代號不自行捏造。

## HTTP 與儲存

`GET /dsh-tts/voice/cloud` 回傳本機音色紀錄及已儲存候選。`POST` 使用 action：create、import、attach、refresh、rename、rename-local、replace-reference、upgrade、delete-remote、delete-upload、forget、test。所有操作使用同源設定頁授權，拒絕客戶端提供根目錄或 API Key；實際金鑰由服務端安全憑證槽解析。服務商不支援的操作在服務端也會拒絕，不只隱藏按鈕。

資料置於 `DSH_HOME/data/dsh-tts/cloud-voices`（未設定時使用使用者的 `.dsh`）。永久音色紀錄不包含 API Key／密碼／遠端原始錯誤內容，不內嵌或複製參考音檔；開源插件封裝不包含使用者資料。

## 驗證範圍

第二批 20 組＋第三批 24 組測試涵蓋八家 HTTP 契約、重複提交、狀態、異常恢復、憑證槽／地域隔離、刪除、授權、int64、重新訓練及宿主合成流程串接；上游回應使用替身。獨立瀏覽器驗證八家管理頁、覆寫／啟用／刪除確認、本機標籤、套用模式與手機排版。唯讀本機 API 已確認實際 DSH 回傳八家管理服務，但未執行真實付費雲端建立／訓練／合成。

官方契約核對：

- [ElevenLabs IVC](https://elevenlabs.io/docs/api-reference/voices/ivc/create)、[查詢](https://elevenlabs.io/docs/api-reference/voices/get)、[改名](https://elevenlabs.io/docs/api-reference/voices/update)、[刪除](https://elevenlabs.io/docs/api-reference/voices/delete)
- [Fish Audio 建立模型](https://docs.fish.audio/api-reference/endpoint/model/create-model)、[OpenAPI](https://docs.fish.audio/api-reference/openapi.json) `/model` 與 `/model/{id}`
- [Cartesia clone](https://docs.cartesia.ai/api-reference/voices/clone)、[update](https://docs.cartesia.ai/api-reference/voices/update)、[delete](https://docs.cartesia.ai/api-reference/voices/delete)
- [Inworld clone](https://docs.inworld.ai/api-reference/voiceAPI/voiceservice/clone-voice)、[get](https://docs.inworld.ai/api-reference/voiceAPI/voiceservice/get-voice)、[update](https://docs.inworld.ai/api-reference/voiceAPI/voiceservice/update-voice)、[delete](https://docs.inworld.ai/api-reference/voiceAPI/voiceservice/delete-voice)
- [DashScope enrollment HTTP](https://help.aliyun.com/en/model-studio/voice-clone-design-http-api)
- [MiniMax clone](https://platform.minimax.io/docs/api-reference/voice-cloning-clone)、[upload](https://platform.minimaxi.com/docs/api-reference/voice-cloning-uploadcloneaudio)、[voice list](https://platform.minimaxi.com/docs/api-reference/voice-management-get)、[voice delete](https://platform.minimaxi.com/docs/api-reference/voice-management-delete)、[file delete](https://platform.minimaxi.com/docs/api-reference/file-management-delete)
- [SiliconFlow 官方 OpenAPI](https://github.com/siliconflow-inc/siliconflow-api/blob/main/openapi.yaml)：uploads/audio/voice、audio/voice/list、audio/voice/deletions
- [豆包註冊](https://docs.volcengine.com/docs/doubao-voice/tone-training-http?lang=zh)、[查詢](https://docs.volcengine.com/docs/doubao-voice/tone-query-http?lang=zh)、[升級](https://docs.volcengine.com/docs/doubao-voice/tone-upgrade-http?lang=zh)、[後付費 V3 說明](https://docs.volcengine.com/docs/doubao-voice/sound-replica-api-v3?lang=zh)
