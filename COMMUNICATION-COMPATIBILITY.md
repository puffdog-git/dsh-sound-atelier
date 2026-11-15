# 外部通訊插件相容性檢查

> **1.0.2 更新**：下文提到的獨立 `dsh-speech-bridge` 已併入聲音工坊，不必另外安裝。用法與開關見 [SPEECH-INTEGRATION.md](SPEECH-INTEGRATION.md) 的「通訊語音交付」。以下保留併入前的檢查紀錄。

## 後續實作已加入

使用者後續要求原生語音泡泡並以模擬驗收：已新增本機 `dsh-im-voice` 5.10.0-voice.1 分支，透過語音意圖協商接入 10 個通道的原生語音路徑，詳見該分支 NATIVE-VOICE.md。Slack／Email／iMessage 維持音訊附件。原版 dsh-im 備份保留，TTS 本身未納入通訊協定。以下「dsh-im 只附件」敘述適用原版與不支援的新通道，不再代表本機語音分支的完整能力。

2026-11-13 已建立並載入獨立 `dsh-speech-bridge`。Agent 的 `send_speech_reply` 現可合成 MP3 並經原插件的正式工具交付：OneBot／QQBot 使用原生語音，dsh-im 使用本回合音訊附件。TTS 核心無通訊帳號或目的地設定。這是使用者要求語音時的工具流程，不是把所有文字回覆強制改成語音。

目前三套實際已安裝工具＋免費 Edge 音訊的隔離測試已通過，最終傳輸被攔截；QQ／其他 IM 平台的實際送達及聽感尚未驗收。OneBot 與 dsh-im 原本停用狀態保留。詳細使用方式見獨立橋接套件 README。

下方保留橋接前的檢查與上游限制，表中的「尚缺」由上述工具流程補足；平台原生語音及最終送達限制仍適用。

2026-11-13，依這台電腦實際下載版本與隔離交付測試。TTS提供中立合成服務，不登入通訊帳號、不自行選擇目的地。以下不是開箱即用的自動語音回覆，也不代表已在真實QQ／其他平台成功發送。

| 通訊插件 | 本機版本／狀態 | 音訊交付基礎 | 尚缺的連接 |
| --- | --- | --- | --- |
| dsh-onebot-qq | 0.10.0，未啟用 | `qq_send_voice`以OneBot `record`段發送，轉成base64後交給NapCat等後端 | 自動從TTS取音檔、放入允許目錄、使用真正會話與原有權限呼叫工具 |
| @zaofan/dsh-qqbot | 1.12.26，已載入 | `send_media(kind=voice)`、sender.sendMedia voice、出站擴充；SDK可用VOICE類型上傳MP3 bytes | 擴充內呼叫中立TTS並明確指定voice；處理回合、去重、取消、被動回覆時效與確認 |
| @xmanrui/dsh-im | 5.10.0，未啟用 | 管理式artifact檔案交付；錄音可作檔案附件 | TTS→artifact／present橋接；要原生語音泡泡須各通道另外提供語音交付接口 |

## OneBot

真實TTS exportAudio產生的系統暫存路徑，不在OneBot預設媒體白名單，直接呼叫qq_send_voice會拒絕。複製到該次會話允許的工作區／插件媒體目錄後，實際工具可產生與原MP3相同的 `base64://` 語音段。遠端NapCat不必讀取DSH本機路徑。

工具亦遵守原本成員／管理者限制，不能只偽造會話ID或繞過工具授權來達成自動語音。適配器應在讀檔及發送完成後清理暫存副本，不提早刪除排隊待發的資料。

## QQBot

一般host present的DeliverablesDeliverer固定用`kind=file`，不會因副檔名.mp3就變成QQ原生語音。使用者需要原生語音時，必須走`voice`媒體類型。

已驗證兩個已下載版本的限制：

1. 純 `[MEDIA:voice|path]` 沒有正文時，sendRichOutbound的空白正文檢查會提前返回；加正文才會送媒體。適配宜走正式send_media／sender接口，不以純文字標記作唯一管線。
2. 出站擴充的`ctx.sendMedia({path})`預設kind是image。傳音訊必須明確帶kind=voice，不能照圖片擴充範例只傳path。此版本型別提示未列kind，但執行器會保留它；更穩定的方式是使用捕獲的sender與target，呼叫sendMedia(target,'voice',source)。

實際SDK MediaApi已驗證file_type=3與MP3 base64內容正確，攔截最後HTTP。SDK工具宣告MP3／WAV／SILK為直傳格式；平台是否接受、帳號權限與真實播放仍需真帳戶驗收。冷啟動合成應使用擴充background，避免卡住正文或超過出站鏈期限；務必捕獲當次帳號／目的地／回合，不使用全域last()猜會話。

## dsh-im

實際artifact registry要求正在進行的會話／回合及該回合的IM delivery consumer；普通Web會話不能憑一個路徑就發到任意IM。成功登記後會建立內容快照，已驗證TTS原檔移除後仍可交付。

共用artifact路徑只特別處理image，其餘走sendFile。以真TelegramBotClient與API替身驗證：MP3會呼叫sendDocument，mediaType目前為application/octet-stream；不是sendVoice。包內存在個別SDK的audio能力，不代表dsh-im所有通道都已接上。公開主動delivery service目前以sendText為主要契約，不能當成已提供通用sendAudio。

## 建議接法

最符合現有架構的是獨立、可選的「通訊語音交付橋接層」，或各通訊插件自身的出站擴充：

`該通訊插件產生最後回覆 → 中立dshTts合成 → 橋接層按平台格式與權限交付`

TTS仍只保留synthesize／exportAudio／registerDelivery等中立接口；OneBot／QQ／Telegram登入、目的地和原生語音格式由通訊側管理。統一顯示「合成完成／排隊／平台已確認」；一般檔案附件與原生語音須分別標示。預設不自動對所有回覆朗讀、不跨會話回退，不把queued當平台已收到。

若先求最少修改，可先做通用MP3附件；若要像Discord一樣的原生語音體驗，優先OneBot與QQBot，dsh-im再按需要逐通道接原生語音。

## 驗證界線

開發工作區 `.audit/tts-im-compatibility.mjs`／`.json` 使用真TTS服務與免費Edge音訊、真宿主工具schema、真OneBot工具／目錄檢查、真QQBot媒體與present處理器／SDK MediaApi、真dsh-im artifact快照與Telegram client。會話與權限容器、最後網路發送是替身。沒有啟用未載入插件、沒有更改通訊設定、沒有讀取帳密或對外送訊息。本輪只有檢查與報告，未安裝橋接擴充，也未修改第三方插件程式。

上游：[OneBot插件](https://github.com/mario841859784/dsh-onebot)、[QQBot插件](https://github.com/zaofan-make/dsh-qqbot)、[dsh-im](https://github.com/xmanrui/dsh-im)、[QQ SDK用法](https://github.com/tencent-connect/qqbot-nodejs/blob/main/USAGE.md)。
