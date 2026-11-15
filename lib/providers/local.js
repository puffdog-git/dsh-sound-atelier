import { edgeSpeak, espeakSpeak, minimaxSpeak, piperSpeak } from "../local.js"
import { synthesizeLocalService, localRoot } from "./local-service.js"

import { DEFAULT_MODELS, DEFAULT_VOICES } from "./constants.js"
import { edgeNativeSpeak } from '../edge-native.js'
import { voiceTuning } from '../tuning.js'
import { synthesizeCosyVoice } from './cosyvoice.js'
import { providerOptions } from './controls.js'
import { localServiceKey } from '../local-credentials.js'

function pick(map, models, key) {
  const chosen = models && typeof models[key] === "string" ? models[key].trim() : ""
  return chosen || map[key]
}

export function makeLocalProviders(deps, req) {
  const { cfg, modelManager } = deps
  const { text, lang, models, voices } = req

  async function edge(extraOptions = {}) {
    let nativeError
    try {
      const voice = pick(DEFAULT_VOICES, voices, 'edge') || pick(DEFAULT_MODELS, models, 'edge')
      const tuning = voiceTuning(cfg, req.role)
      if (!extraOptions.spawnImpl && !req.edgeSpawnImpl && (!cfg.edgeBin || cfg.edgeBin === 'edge-tts')) {
        const nativeSpeak = deps.edgeNativeSpeak || edgeNativeSpeak
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const out = await nativeSpeak(text, { voice, pitch: tuning.pitch, signal: req.signal, timeoutMs: Math.min(cfg.timeoutMs || 20000, 20000) })
            return { ok: true, provider: 'edge', ...out }
          } catch (err) {
            if (req.signal?.aborted) throw err
            nativeError = err
            if ([400, 401, 403].includes(err.status) || err.closeCode === 1007) break
            if (attempt === 0) await new Promise((resolve, reject) => {
              const abort = () => { clearTimeout(timer); reject(req.signal.reason || new Error('aborted')) }
              const timer = setTimeout(() => { req.signal?.removeEventListener('abort', abort); resolve() }, extraOptions.nativeRetryDelayMs ?? 500)
              req.signal?.addEventListener('abort', abort, { once: true })
              if (req.signal?.aborted) abort()
            })
          }
        }
      }
      const retries = typeof extraOptions.retries === 'number'
        ? extraOptions.retries
        : (typeof cfg.edgeRetries === 'number' ? cfg.edgeRetries : 3)
      const out = await (deps.edgeSpeak || edgeSpeak)(text, {
        bin: cfg.edgeBin,
        voice,
        pitch: tuning.pitch,
        timeoutMs: cfg.timeoutMs,
        retries,
        retryDelayMs: extraOptions.retryDelayMs,
        signal: req.signal,
        spawnImpl: extraOptions.spawnImpl || req.edgeSpawnImpl,
      })
      return { ok: true, provider: 'edge', audio: out.audio, mime: out.mime }
    } catch (e) {
      return { ok: false, provider: 'edge', reason: nativeError ? `native: ${nativeError.message}; CLI: ${String(e && e.message || e)}` : String(e && e.message || e) }
    }
  }
  async function piper() {
    try {
      const model = pick(DEFAULT_MODELS, models, 'piper') || cfg.piperModel
      const out = await piperSpeak(text, { bin: cfg.piperBin, model, timeoutMs: cfg.timeoutMs })
      return { ok: true, provider: 'piper', audio: out.audio, mime: out.mime }
    } catch (e) {
      return { ok: false, provider: 'piper', reason: String(e && e.message || e) }
    }
  }
  async function espeak() {
    try {
      const voice = pick(DEFAULT_VOICES, voices, 'espeak') || lang || 'en'
      const out = await espeakSpeak(text, { bin: cfg.espeakBin, voice, timeoutMs: cfg.timeoutMs })
      return { ok: true, provider: 'espeak', audio: out.audio, mime: out.mime }
    } catch (e) {
      return { ok: false, provider: 'espeak', reason: String(e && e.message || e) }
    }
  }
  async function kokoro() {
    try {
      if(models?.kokoro&&!['hexgrad/Kokoro-82M','onnx-community/Kokoro-82M-v1.0-ONNX'].includes(models.kokoro))throw Error('This Kokoro runtime uses the pinned v1.0 ONNX model only')
      if(!deps.kokoroRuntime)throw Error('Local Kokoro runtime is not configured')
      return await deps.kokoroRuntime.synthesize(text,{voice:pick(DEFAULT_VOICES,voices,'kokoro'),signal:req.signal})
    }catch(e){return {ok:false,provider:'kokoro',reason:String(e.message)}}
  }
  async function localTts(forceF5=false) {
    const signal=req.signal?AbortSignal.any([req.signal,AbortSignal.timeout(Number(cfg.timeoutMs)||60000)]):AbortSignal.timeout(Number(cfg.timeoutMs)||60000)
    try {
      const config=forceF5?{...cfg,localTtsBackend:'xinference',localTtsFamily:'f5'}:cfg
      if(['dots-native','index-native'].includes(config.localTtsBackend)){
        if(!deps.nativeRuntime)throw Error('Managed native runtime is not configured')
        const emotion=config.localTtsEmotionAsset?await deps.voiceAssets.reference(config.localTtsEmotionAsset):null
        return await deps.nativeRuntime.synthesize(config,req,cfg._voiceReference,emotion,signal)
      }
      if(config.localTtsEmotionAsset&&['index2','index2.5'].includes(config.localTtsFamily))throw Error('Separate Index emotion recordings require the managed native backend; Xinference REST exposes no emotion-audio upload field')
      const synth=async()=>synthesizeLocalService({cfg:config,req,reference:cfg._voiceReference,signal,fetchImpl:deps.fetchImpl||fetch,key:await localServiceKey(cfg,deps.resolveKey)})
      const out=deps.localModelRuntime&&(config.localTtsBackend||'xinference')==='xinference'?await deps.localModelRuntime.run(config,models?.['local-tts']||models?.f5||config.localTtsModel,signal,synth):await synth()
      return {...out,provider:forceF5?'f5':'local-tts'}
    }catch(e){return {ok:false,provider:forceF5?'f5':'local-tts',reason:String(e.message)}}
  }
  const f5=()=>localTts(true)
  async function minimax() {
    try {
      if (Object.keys(providerOptions(cfg, 'minimax')).length) throw Error('MiniMax synthesis controls require HTTP mode; CLI controls are not mapped')
      const out = await (deps.minimaxSpeak || minimaxSpeak)(text, {
        bin: cfg.minimaxBin,
        signal: req.signal,
        voice: pick(DEFAULT_VOICES, voices, 'minimax'),
        model: pick(DEFAULT_MODELS, models, 'minimax'),
        timeoutMs: cfg.timeoutMs,
      })
      return { ok: true, provider: 'minimax', audio: out.audio, mime: out.mime }
    } catch (e) {
      return { ok: false, provider: 'minimax', reason: String(e && e.message || e) }
    }
  }

  async function cosyvoice() {
    const signal = req.signal ? AbortSignal.any([req.signal, AbortSignal.timeout(Number(cfg.timeoutMs) || 60000)]) : AbortSignal.timeout(Number(cfg.timeoutMs) || 60000)
    try { return await synthesizeCosyVoice({ cfg, req, fetchImpl: deps.fetchImpl || fetch, signal }) }
    catch (e) { return { ok: false, provider: 'cosyvoice', reason: String(e?.message || e) } }
  }

  return { 'local-tts':()=>localTts(), kokoro, f5, edge, piper, espeak, minimax, cosyvoice }
}
