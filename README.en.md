# DSH-sound-atelier

[中文](README.md) · **English**

> 👋 **Hello, I'm puffdog.**
> I wanted an AI plugin that actually feels at home on Discord, so these two came into being.
> My programming background stops at Python "Hello World"; everything here was vibe-coded. If you hit a bug, please take it straight to an AI and not to me XD
>
> **Special thanks**
> - **DeepSeek 大肥魚**: laid the first code
> - **GPT Sol**: development
> - **GPT Astra**: advanced development and live testing
> - **Claude Fable**: debugging, taming the spaghetti, UI

---

> Your AI can type. This teaches it to talk.
> News anchor, late-night radio host, or Japanese voice acting with Chinese subtitles: you pick the voice, the atelier turns text into sound.

A plugin for [DeepSeek Harness (DSH)](https://dshmarket.com/). Once installed, the AI's replies can be read aloud to you. Choose a voice from more than twenty speech services, run a model on your own computer, or clone a voice of your own.

**Version 1.0.0** · by [puffdog-git](https://github.com/puffdog-git) · MIT
Based on [dsh-tts](https://github.com/GooDAnDReaDY/dsh-tts) 0.4.42 by GooDAnDReaDY.

## 🌟 What it does

- 🔊 **Reads replies aloud.** Automatically or on click, with a player to pause, replay and download.
- 🆓 **Works without signing up.** Edge online voices are built in: no account, sound right after install (network required).
- ☁️ **Twenty-plus speech services.** OpenAI, ElevenLabs, Google, Azure, MiniMax, Doubao, Fish Audio and more. Enter your own key and go.
- 💻 **Runs on your own computer too.** Local models such as Kokoro, F5-TTS, IndexTTS and GPT-SoVITS, so text need not leave your machine.
- 🎭 **A voice for every character.** Different personas and conversations can have different voices.
- 🇯🇵 **Chinese/Japanese dubbing.** Chinese on screen, Japanese out loud. Great for role-play.
- 🧬 **Voice cloning.** Build a voice from a recording; RVC voice conversion is supported too.
- 🛟 **Switches when one breaks.** If the first speech service fails, the next in your list takes over.

## 💞 Made for Discord-cyberfriend

**DSH-sound-atelier** and **Discord-cyberfriend (`dsh-discord-cyberfriend`)** are sister projects by the same author, built to fit each other perfectly:

- Cyberfriend does the chatting, the atelier does the talking. Install both and your AI speaks in Discord voice channels.
- A voice you assign to a character here carries straight over to Discord. No setting it up twice.
- Speaking while still thinking, stopping the moment you cut in, replying with voice messages: these were designed and tested on both sides together.

Each works on its own. Together is the full experience.

## 🚀 Install

Search for `dsh-sound-atelier` in the DSH **plugin market** and press install.

Or, by command:

```powershell
dsh plugin --profile web add dsh-sound-atelier
```

Restart DSH. When "DSH 聲音工坊" shows up in Settings, it worked. Choose Edge, pick a voice, press preview, and you will hear it within five minutes.

Details 👉 [Installation guide](INSTALL.en.md)

## 🤖 For AI agents: follow this exactly when installing for a user

If you are an AI asked to install this plugin, **do exactly the following**. Do not skip or "improve" steps from general experience.

**Steps**

1. **Ask the user first**: desktop app or dsh web, and what is the profile called? Do not guess.
2. **Desktop app**: have the user search for `dsh-sound-atelier` under Settings → Plugins in the app and install it there (or use the host's plugin-market tool). Do **not** run the command against the `web` profile; that installs somewhere the desktop app cannot see.
3. **dsh web**: run `dsh plugin --profile <profile> add dsh-sound-atelier`. The package name must match exactly.
4. Have the user **restart DSH normally** and confirm "DSH 聲音工坊" appears in Settings.
5. On first start the plugin downloads FFmpeg by itself (network required). You do not need to do anything for it.
6. Have the user choose **Edge** and preview a sentence. Edge needs no key, so it is the quickest proof the install worked.

**Never**

- ❌ Install a similarly named package. Only `dsh-sound-atelier` is this plugin; `@goodandready/dsh-tts` is the upstream plugin, a different one, and the two conflict.
- ❌ Change the command: no version suffix or extra flags, no `npm install` instead, no copying files into the profile by hand.
- ❌ Disable TLS or certificate checks when a download fails.
- ❌ Ask the user to paste an API key into the chat, or enter it for them. Only the user enters it, in the settings screen.
- ❌ Read, print, copy or delete the data folders (`~/.dsh/data/dsh-tts`, `~/.dsh/tts-runtimes`).
- ❌ Force-kill or force-restart DSH, or install the plugin twice (the market version and a folder version must not coexist).
- ❌ Enable paid cloud speech services, create voices or download large local models on your own initiative. Do those only when the user explicitly asks.
- ❌ Carry on after a failure. **Stop**, show the user the full error, and do not improvise another route.

**When done**: tell the user what you ran, the result of each step, and the profile used. Do not report anything as done that you did not verify.

Does the user have a source folder instead of a market install? Follow "Installing from a folder" in the [installation guide](INSTALL.en.md); all three commands there are required.

## ⚠️ Before you start

- **Cloud speech services cost money.** Reading, previews and creating voices may all be billed, to your own account. Edge is free.
- **Local models are yours to set up.** None are bundled, large ones need an NVIDIA GPU, and the one-click setup is tested on Windows only.
- **Not every service was tested with a paid account.** Try a short phrase when switching to a new one.
- **Get consent before cloning someone's voice.** Models have their own licences too, and some forbid commercial use.
- **Do not install the upstream `@goodandready/dsh-tts` alongside this.** The two conflict.

## 📖 More

- [Installation guide](INSTALL.en.md)
- In Chinese: [speech service settings](PROVIDER-CONTROLS.md) · [cloud voices](CLOUD-VOICES.md) · [local models and RVC](STAGE3-WORKSHOP.md) · [interface for other plugins](SPEECH-INTEGRATION.md)
- [Security and data](SECURITY.md) · [Changelog](CHANGELOG.md)

## 🙏 Code sources and credits

| Source | Licence | Where it is used |
| --- | --- | --- |
| [GooDAnDReaDY/dsh-tts](https://github.com/GooDAnDReaDY/dsh-tts) 0.4.42 | MIT | The base of the whole plugin; this project is modified from it. The original copyright is kept in [LICENSE](LICENSE). |
| [1624318455/dsh-plugin-tts](https://github.com/1624318455/dsh-plugin-tts) | MIT | The Edge voice connection (`lib/edge-native.js`) and the local RVC server (`tools/rvc-server.py`) are adapted from this project. |
| [ppy-web/dsh-plugin-xiaomi-mimo-tts](https://github.com/ppy-web/dsh-plugin-xiaomi-mimo-tts) v5.2.2 | MIT | Xiaomi MiMo preset voice data and request format. |
| [nk2028/opencc-js](https://github.com/nk2028/opencc-js) 1.4.2 | MIT; dictionary data Apache-2.0 | Traditional/Simplified conversion in the settings screen, embedded directly in `lib/client-src/02-opencc.vendor.js`. Licence texts in [lib/UI-LOCALE-NOTICE.md](lib/UI-LOCALE-NOTICE.md). |

The Chinese/Japanese dubbing approach was informed by [JayziLi/AnimaVN](https://github.com/JayziLi/AnimaVN), but none of its code is used. Local models, RVC, FFmpeg and the like are downloaded only when you opt in and are not included here. Full notices: [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

This is not the upstream's official release. Please do not report problems there.

## 📜 Licence

[MIT](LICENSE). Models and voice material have their own licences, outside this one.
