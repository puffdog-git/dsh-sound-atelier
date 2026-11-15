# 安裝說明

**中文** · [English](INSTALL.en.md)

目標：聽到它唸出第一句話。大約五分鐘，不需要申請任何帳號。

## 你需要準備

- 已安裝的 **DeepSeek Harness（DSH）**
- 網路
- Windows（目前只在 Windows 上測試過）

## 第 1 步：安裝

**方法一：插件市集（最簡單）**
在 DSH 的插件市集搜尋 `dsh-sound-atelier`，按安裝。桌面版請從應用程式的「設定 → 插件」進去。

**方法二：指令**

```powershell
dsh plugin --profile web add dsh-sound-atelier
```

`web` 是一般 dsh web 的 profile 名稱；你的不一樣就換掉。

裝完**重新啟動 DSH**。在設定裡看到「DSH 聲音工坊」就成功了。

第一次啟動時，插件會自己下載 FFmpeg（處理聲音的工具），需要網路，不用你動手。

> 市集上的 `@goodandready/dsh-tts` 是上游的另一個插件，不是這個，請不要兩個一起裝。

## 第 2 步：聽聽看

打開「設定 → DSH 聲音工坊」：

1. 語音服務選 **Edge**。
2. 挑一個音色，例如 `zh-TW-HsiaoChenNeural`。
3. 打一句話，按試聽。
4. 聽到聲音就完成了。🎉

之後再打開自動朗讀，AI 的回覆就會自己唸出來。

## 想要更多功能

| 想要 | 怎麼做 |
| --- | --- |
| 在 Discord 語音房講話 | 再安裝姊妹作 Discord 賽博群友（`dsh-discord-cyberfriend`），在它的語音設定裡選用本插件。兩個是設計來搭配的。 |
| 用其他語音服務 | 到該服務申請金鑰，在設定頁選它並貼上金鑰，先用短句試聽。**會收費。** 各家細節見 [PROVIDER-CONTROLS](PROVIDER-CONTROLS.md)。 |
| 複製聲音 | 見 [CLOUD-VOICES](CLOUD-VOICES.md)。建立音色可能收費。 |
| 在自己電腦上跑模型 | 在設定頁的本機模型區安裝。會下載不少東西，大型模型需要 NVIDIA 顯示卡。見 [STAGE3-WORKSHOP](STAGE3-WORKSHOP.md)。 |
| RVC 變聲 | 同上，另外匯入你自己的聲線模型。只載入你信任來源的模型檔。 |

## 常見問題

**設定裡沒有出現插件** → 確認裝到的是 DSH 實際在用的 profile，而且有重新啟動。桌面版請從應用程式裡安裝，不要對 `web` 下指令。

**Edge 沒聲音** → Edge 是線上服務，確認網路正常，稍後再試。

**雲端服務顯示 401 或 403** → 金鑰填錯、過期，或沒有語音功能的權限。

**Piper、eSpeak 顯示不可用** → 它們需要另外安裝，沒在用可以忽略。

**有兩個朗讀插件同時在唸** → 上游的舊插件還在，停用其中一個。

**轉檔或變聲失敗，提示找不到 FFmpeg** → 第一次啟動時自動下載失敗了，多半是網路問題。網路正常後重新啟動 DSH，它會再試一次。

## 更新與移除

- **更新**：在插件市集或插件的設定頁按更新，或執行 `dsh plugin --profile web update dsh-sound-atelier`。
- **移除**：在插件市集移除，或執行 `dsh plugin --profile web remove dsh-sound-atelier`。

## 你的資料放在哪

錄音、音色資料、快取和本機模型都放在你的使用者資料夾：

```
~/.dsh/data/dsh-tts
~/.dsh/tts-runtimes
```

資料夾沿用舊名稱是為了相容，不是寫錯。

- **更新插件不會動到這裡。**
- **不要把這些資料夾分享給別人。**
- **移除插件不會刪掉它們**，也不會刪除你在雲端平台上建立的音色或讓金鑰失效，那些要到各平台自己處理。

## 從資料夾安裝（給開發者）

手上是原始碼資料夾的話，在資料夾裡依序執行這三行，**一行都不能少**：

```powershell
npm ci --legacy-peer-deps --ignore-scripts
```

```powershell
node node_modules/ffmpeg-static/install.js
```

```powershell
npm install --ignore-scripts --no-audit --no-fund
```

再加進 DSH 並重新啟動：

```powershell
dsh plugin --profile <你的profile> add 'link:<資料夾的完整路徑>'
```

市集版和資料夾版不要同時安裝；從資料夾安裝的版本不提供一鍵更新。找不到 `dsh` 指令時，桌面版的在 DSH 安裝資料夾的 `resources/runtime/cli/bin/dsh.cmd`。
