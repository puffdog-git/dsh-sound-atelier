# Installation guide

[中文](INSTALL.md) · **English**

The goal: hear it say its first sentence. About five minutes, and no account to sign up for.

## What you need

- **DeepSeek Harness (DSH)** installed
- A network connection
- Windows (the only system tested so far)

## Step 1: install

**Option 1: plugin market (easiest)**
Search for `dsh-sound-atelier` in the DSH plugin market and press install. In the desktop app, go through Settings → Plugins.

**Option 2: command**

```powershell
dsh plugin --profile web add dsh-sound-atelier
```

`web` is the usual profile name for dsh web. Replace it if yours differs.

Then **restart DSH**. When "DSH 聲音工坊" shows up in Settings, it worked.

On first start the plugin downloads FFmpeg (the tool that handles audio) by itself. It needs a network connection and nothing from you.

> The `@goodandready/dsh-tts` on the market is the upstream plugin, a different one. Do not install both.

## Step 2: have a listen

Open Settings → DSH 聲音工坊:

1. Choose **Edge** as the speech service.
2. Pick a voice, for example `en-US-AriaNeural`.
3. Type a sentence and press preview.
4. If you hear it, you are done. 🎉

Turn on auto-read afterwards and the AI's replies will be spoken on their own.

## Want more?

| To | Do this |
| --- | --- |
| Talk in Discord voice channels | Also install the sister project Discord-cyberfriend (`dsh-discord-cyberfriend`) and select this plugin in its voice settings. The two are built to go together. |
| Use another speech service | Get a key from that service, select it in settings, paste the key, and preview a short phrase first. **This is billed.** Details (Chinese): [PROVIDER-CONTROLS](PROVIDER-CONTROLS.md). |
| Clone a voice | See [CLOUD-VOICES](CLOUD-VOICES.md) (Chinese). Creating a voice may be billed. |
| Run a model on your own computer | Install from the local-models area in settings. It downloads a lot, and large models need an NVIDIA GPU. See [STAGE3-WORKSHOP](STAGE3-WORKSHOP.md) (Chinese). |
| RVC voice conversion | Same as above, then import your own voice model. Load only model files from sources you trust. |

## Troubleshooting

**The plugin is not in Settings** → make sure it went into the profile DSH actually runs, and that you restarted. In the desktop app, install from inside the app rather than running the command against `web`.

**Edge is silent** → Edge is an online service. Check your connection and try again shortly.

**A cloud service shows 401 or 403** → the key is wrong, expired, or lacks speech permission.

**Piper or eSpeak show as unavailable** → they need a separate install. Ignore them if you do not use them.

**Two plugins reading at once** → the old upstream plugin is still installed. Disable one of them.

**Conversion or voice change fails saying FFmpeg is missing** → the automatic download on first start failed, usually a network problem. Restart DSH once the network is fine and it tries again.

## Updating and removing

- **Update**: press update in the plugin market or on the plugin's settings page, or run `dsh plugin --profile web update dsh-sound-atelier`.
- **Remove**: remove it in the plugin market, or run `dsh plugin --profile web remove dsh-sound-atelier`.

## Where your data lives

Recordings, voice data, caches and local models are kept in your user folder:

```
~/.dsh/data/dsh-tts
~/.dsh/tts-runtimes
```

The folders keep their old names for compatibility. That is not a typo.

- **Updating the plugin does not touch them.**
- **Do not share these folders.**
- **Removing the plugin does not delete them**, nor does it delete voices you created on cloud platforms or invalidate your keys. Handle those on each platform.

## Installing from a folder (for developers)

If what you have is a source folder, run these three lines in it, in order, **all three**:

```powershell
npm ci --legacy-peer-deps --ignore-scripts
```

```powershell
node node_modules/ffmpeg-static/install.js
```

```powershell
npm install --ignore-scripts --no-audit --no-fund
```

Then add it to DSH and restart:

```powershell
dsh plugin --profile <your-profile> add 'link:<full path to the folder>'
```

Do not install the market version and a folder version together. A folder install has no one-click update. If `dsh` is not found, the desktop app's is at `resources/runtime/cli/bin/dsh.cmd` in the DSH install folder.
