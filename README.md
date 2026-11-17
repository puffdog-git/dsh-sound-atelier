# DSH-sound-atelier（DSH 聲音工坊）

**中文** · [English](README.en.md)

> 👋 **Hello，我是 puffdog。**
> 因為想做一個真正適合 Discord 環境的 AI 插件，於是生出了這兩個孩子。
> 我的程式基礎只有 Python「Hello World」等級，全程靠 vibe coding。遇到 bug 歡迎直接找 AI 處理，別找我 XD
>
> **特別致謝**
> - **DeepSeek 大肥魚**：基本程式建立
> - **GPT Sol**：程式開發
> - **GPT Astra 大人**：進階程式開發、實機測試員
> - **Claude Fable 大人**：除錯、屎山程式碼效率化、UI 開發

---

> 讓你的 AI 不只會打字，還會開口。
> 新聞主播、深夜電台、還是日文配音加中文字幕——聲音你挑，工坊負責把字變成聲音。

這是 [DeepSeek Harness（DSH）](https://dshmarket.com/)的插件。裝好之後，AI 的回覆可以直接唸給你聽；聲音可以從二十多種語音服務裡挑，也可以用自己電腦上的模型，甚至複製一個專屬音色。

**版本 1.0.0** · 作者 [puffdog-git](https://github.com/puffdog-git) · MIT 授權
以 GooDAnDReaDY 的 [dsh-tts](https://github.com/GooDAnDReaDY/dsh-tts) 0.4.42 為基礎修改。

## 🌟 它會做什麼

- 🔊 **把回覆唸出來**：自動朗讀或點一下才唸；有播放器可以暫停、重播、下載。
- 🆓 **免註冊就能用**：內建 Edge 線上語音，不用申請任何帳號，裝好就有聲音（需要網路）。
- ☁️ **二十多種語音服務任你換**：OpenAI、ElevenLabs、Google、Azure、MiniMax、豆包、Fish Audio 等等，填入自己的金鑰就能用。
- 💻 **也能在自己電腦上跑**：Kokoro、F5-TTS、IndexTTS、GPT-SoVITS 等本機模型，不必把文字送到雲端。
- 🎭 **每個角色有自己的聲音**：不同人格、不同對話可以綁不同音色。
- 🇯🇵 **中日配音**：畫面顯示中文，嘴巴講日文，角色扮演很對味。
- 🧬 **複製聲音**：用一段錄音建立專屬音色；也支援 RVC 變聲。
- 🛟 **壞了會自動換**：第一個語音服務失敗時，依你排好的順序換下一個。
- 💬 **在聊天軟體送語音訊息**：搭配 QQ（OneBot、QQBot）或 dsh-im 通訊插件時，你說一聲，AI 就把回覆合成語音、當成語音訊息送出。

## 💞 和 Discord 賽博群友是天生一對

**DSH 聲音工坊**和 **Discord 賽博群友（`dsh-discord-cyberfriend`）**是同一位作者做的姊妹作，彼此完美適配：

- 群友負責聊天，工坊負責出聲。兩個都裝，你的 AI 就能在 Discord 語音房開口說話。
- 角色在工坊裡綁好的音色，到了 Discord 直接沿用，不用設定兩次。
- 邊想邊說、你一插話就停、回傳語音訊息，這些都是兩邊一起設計、一起實際測過的。

各自單獨裝也能用；兩個一起裝才是完整體驗。

## 🚀 安裝

在 DSH 的**插件市集**搜尋 `dsh-sound-atelier`，按安裝就好。

喜歡用指令的話：

```powershell
dsh plugin --profile web add dsh-sound-atelier
```

裝完重新啟動 DSH，在設定裡看到「DSH 聲音工坊」就成功了。選 Edge、挑個音色、按試聽，五分鐘內就能聽到聲音。

詳細步驟 👉 [安裝說明](INSTALL.md)

## 🤖 給 AI 助理：幫使用者安裝時請務必照做

如果你是被請來安裝這個插件的 AI，請**完整照下面做**，不要憑經驗省略或「改良」步驟。

**安裝步驟**

1. **先問使用者**：用的是桌面版還是 dsh web？profile 叫什麼名字？不要猜。
2. **桌面版**：請使用者在應用程式的「設定 → 插件」搜尋 `dsh-sound-atelier` 並安裝（或使用宿主提供的插件市集工具）。**不要**對 `web` profile 下指令，那樣會裝到桌面版看不到的地方。
3. **dsh web**：執行 `dsh plugin --profile <profile> add dsh-sound-atelier`。套件名稱必須一字不差。
4. 請使用者**正常重新啟動 DSH**，確認設定裡出現「DSH 聲音工坊」。
5. 第一次啟動時插件會自己下載 FFmpeg（需要網路），不需要你手動處理。
6. 請使用者選 **Edge** 試聽一句話。Edge 不需要金鑰，這是確認安裝成功最快的方法。

**絕對不要做**

- ❌ 不要安裝名稱相似的其他套件。只有 `dsh-sound-atelier` 是這個插件；`@goodandready/dsh-tts` 是上游的另一個插件，兩個一起裝會衝突。
- ❌ 不要改指令：不加版本號或其他參數、不改用 `npm install`、不手動複製檔案到 profile。
- ❌ 下載失敗時不要關閉 TLS／憑證驗證。
- ❌ 不要請使用者把 API 金鑰貼到對話裡，也不要代填；只能由使用者自己在設定頁輸入。
- ❌ 不要讀取、列印、複製或刪除資料資料夾（`~/.dsh/data/dsh-tts`、`~/.dsh/tts-runtimes`）。
- ❌ 不要強制結束或強制重啟 DSH，也不要把插件裝兩次（市集版和資料夾版不能同時存在）。
- ❌ 不要自行替使用者啟用會收費的雲端語音服務、建立音色或下載大型本機模型；這些只在使用者明確要求時才做。
- ❌ 任何一步失敗就**停下來**，把完整錯誤訊息給使用者，不要自己換別的做法。

**完成後**：告訴使用者執行了什麼、每一步的結果、用的 profile。沒有實際確認的事不要說成已完成。

使用者手上是原始碼資料夾而不是從市集安裝？請改照[安裝說明](INSTALL.md)的「從資料夾安裝」，那裡的三行指令一行都不能少。

## ⚠️ 用之前先知道

- **雲端語音服務會收費。** 朗讀、試聽、建立音色都可能計費，帳單在你自己的帳號上。Edge 是免費的。
- **本機模型要自己準備。** 插件不附模型，大型模型需要 NVIDIA 顯示卡；一鍵安裝只在 Windows 上測試過。
- **不是每一家都實際付費測過。** 換新的語音服務時，先用一句短句試聽。
- **聊天軟體的語音訊息只做過模擬測試。** QQ 和其他平台的實際送達還沒有真人驗證過。
- **複製別人的聲音前請取得同意。** 模型本身也各有授權，有些不能商用。
- **請不要同時安裝上游的 `@goodandready/dsh-tts`。** 兩個會打架。

## 📖 更多說明

- [安裝說明](INSTALL.md)
- [各家語音服務的設定](PROVIDER-CONTROLS.md) · [雲端音色管理](CLOUD-VOICES.md)
- [本機模型與 RVC](STAGE3-WORKSHOP.md) · [給其他插件用的介面](SPEECH-INTEGRATION.md)
- [安全與資料](SECURITY.md) · [版本紀錄](CHANGELOG.md)

## 🙏 程式碼來源與致謝

| 來源 | 授權 | 用在哪 |
| --- | --- | --- |
| [GooDAnDReaDY/dsh-tts](https://github.com/GooDAnDReaDY/dsh-tts) 0.4.42 | MIT | 整個插件的基礎，本專案由它修改而來。原著作權保留在 [LICENSE](LICENSE)。 |
| [1624318455/dsh-plugin-tts](https://github.com/1624318455/dsh-plugin-tts) | MIT | Edge 語音的連線方式（`lib/edge-native.js`）與本機 RVC 服務（`tools/rvc-server.py`）改寫自這個專案。 |
| [ppy-web/dsh-plugin-xiaomi-mimo-tts](https://github.com/ppy-web/dsh-plugin-xiaomi-mimo-tts) v5.2.2 | MIT | 小米 MiMo 的預設音色資料與請求格式。 |
| [nk2028/opencc-js](https://github.com/nk2028/opencc-js) 1.4.2 | MIT；字典資料 Apache-2.0 | 設定介面的繁簡轉換，程式碼直接內嵌在 `lib/client-src/02-opencc.vendor.js`。授權全文在 [lib/UI-LOCALE-NOTICE.md](lib/UI-LOCALE-NOTICE.md)。 |

中日配音的做法參考過 [JayziLi/AnimaVN](https://github.com/JayziLi/AnimaVN)，但沒有使用它的程式碼。本機模型、RVC、FFmpeg 等是你選用時才下載的，沒有放進本套件。完整聲明見 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)。

這裡不是上游的官方版本，有問題請不要回報到上游。

## 📜 授權

[MIT](LICENSE)。模型和聲音素材各有自己的授權，不在此範圍內。
