import { createVoiceAssets } from './voice-assets.js'
import {registerLocalAdmin} from './local-admin-routes.js'
import { localServiceOperation } from './providers/local-service.js'
import { localServiceKey,localManagementToken } from './local-credentials.js'
export async function handleVoiceClone(opts={}) {
  try { const asset=await createVoiceAssets(opts.rootDir?{root:opts.rootDir}:{}).create({name:opts.name,sample:opts.sample,transcript:opts.transcript});return {ok:true,asset,assetId:asset.id,voiceId:null,kind:'reference',state:'validated',cloned:false,note:'Recording validated; no voice model was trained or remotely created'} }
  catch(e){return {ok:false,error:String(e.message)}}
}

import { MODEL_SPECS } from './engines/manager.js'
import { registerPluginUpdater, isSourceInstall } from './updater.js'
import { writeJson, readBody, getRejectionStatus, isTrustedSettingsRequest, registerRoute } from './http-util.js'
import { addStreamSubscriber, removeStreamSubscriber, streamSubscriberCount } from './stream-hub.js'
import { pendingKeyWrites, stripSecretsFromConfig, needsApiKey } from './keys.js'
import { PROVIDER_KEYS } from './providers.js'
import { computeAdaptiveRate } from './text.js'
import { createCatalogService } from './catalog.js'
import { voiceTuning, clamp } from './tuning.js'
import { validateSsml } from './ssml.js'
import { providerOperation } from './provider-operations.js'
import { providerOptions } from './providers/controls.js'
import { keyEnvName } from './keys.js'
import { providerCapabilities } from './capabilities.js'
import { chainCandidates } from './candidates.js'

/**
 * Register all /dsh-tts HTTP routes.
 * @param {object} ctx cordis context
 * @param {object} api live bindings from apply()
 */
export function registerHttpRoutes(ctx, api) {
  const {
    live,
    modelManager,
    stats,
    speechCache,
    cleanText,
    prepareSpeechText,
    synthesize,
    synthesizeDialogue,
    credentialsView,
    configResponse,
    storeProviderKey,
    clearProviderKey,
    pending,
    speechJobs, playbackLeases, startSpeechJob,
    getSettingsApi,
    validateConfig,
    breakerSnapshot,
  } = api

  ctx.effect(()=>registerRoute(ctx.webServer, {kind:'exact',path:'/dsh-sound-atelier/synthesize',handler:async(req,res)=>{
    if(req.method!=='POST')return writeJson(res,405,{ok:false})
    if(rejectIfUntrusted(req,res,{requireAuth:true}))return
    const controller=new AbortController(),abort=()=>controller.abort();res.on?.('close',abort)
    try{const b=JSON.parse((await readBody(req,256*1024)).toString('utf8')),out=await api.speechService.synthesize({...b,signal:controller.signal});const {data,...meta}=out;writeJson(res,200,{ok:true,...meta,mime:out.contentType,audioBase64:data.toString('base64')})}catch(e){if(!res.headersSent)writeJson(res,400,{ok:false,error:{message:String(e.message)}})}finally{res.off?.('close',abort)}
  }}),'dsh-tts: neutral synthesis API')

  ctx.effect(()=>registerRoute(ctx.webServer, {kind:'exact',path:'/dsh-sound-atelier/speech/stream',handler:async(req,res)=>{
    if(req.method!=='POST')return writeJson(res,405,{ok:false});if(rejectIfUntrusted(req,res,{requireAuth:true}))return;
    const controller=new AbortController(),signal=controller.signal,abort=()=>controller.abort();res.on('close',abort);
    const send=async value=>{signal.throwIfAborted();if(!res.headersSent)res.writeHead(200,{'content-type':'application/x-ndjson','cache-control':'no-store','x-content-type-options':'nosniff'});if(!res.write(JSON.stringify(value)+'\n'))await new Promise((resolve,reject)=>{const clean=()=>{res.off('drain',ready);signal.removeEventListener('abort',cancel)},ready=()=>{clean();resolve()},cancel=()=>{clean();reject(Error('串流已取消'))};res.once('drain',ready);signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)cancel()})};
    try{const body=JSON.parse((await readBody(req,256*1024)).toString('utf8')),report=await api.speechService.streamPcm({...body,signal,onPrepared:meta=>send({type:'prepared',...meta})},pcm=>send({type:'pcm',sampleRate:24000,channels:1,audioBase64:pcm.toString('base64')}));await send({type:'complete',...report});res.end()}catch(e){if(!res.headersSent)writeJson(res,400,{ok:false,error:{message:String(e.message)}});else if(!res.destroyed)res.end(JSON.stringify({type:'error',message:'語音串流未完整完成'})+'\n')}finally{res.off('close',abort);controller.abort()}
  }}),'dsh-tts: neutral PCM stream API')

  const resolveConnection = () => {
    try {
      if (api && api.connection) return api.connection
    } catch (_err) { /* connection resolution fallback */ }
    try {
      if (ctx && typeof ctx.get === 'function') {
        const c = ctx.get('connection')
        if (c) return c
      }
    } catch (_err) { /* connection get fallback */ }
    try {
      if (ctx) return Reflect.get(ctx, 'connection') || ctx.connection
    } catch (_err) { /* connection reflect fallback */ }
    return undefined
  }

  const rejectIfUntrusted = (req, res, extraOptions = {}) => {
    const conn = resolveConnection()
    const status = getRejectionStatus(req, { connection: conn, ...extraOptions })
    if (status !== undefined) {
      const code = status === 401 ? 'unauthorized' : 'forbidden'
      const message = status === 401
        ? 'unauthorized: session or token required'
        : (extraOptions.message || 'same-origin only')
      writeJson(res, status, { ok: false, error: { code, message } })
      return true
    }
    return false
  }

  const catalog = createCatalogService({ resolveKey: api.resolveKey })
  ctx.effect(() => registerRoute(ctx.webServer, {
    kind: 'exact',
    path: '/dsh-sound-atelier/catalog',
    handler: async (req, res) => {
      if (req.method !== 'GET') { writeJson(res, 405, { ok: false, error: { code: 'method', message: 'GET only' } }); return }
      if (rejectIfUntrusted(req, res, { requireAuth: true })) return
      const query = new URL(req.url, 'http://localhost').searchParams
      const provider = query.get('provider') || ''
      if (!PROVIDER_KEYS.includes(provider)) { writeJson(res, 400, { ok: false, error: { code: 'provider', message: 'Unknown provider' } }); return }
      try {
        const result = await catalog.discover(provider, live(), { model: (query.get('model') || '').slice(0, 512), refresh: query.get('refresh') === '1' })
        writeJson(res, 200, result)
      } catch {
        // Never return upstream response bodies or credential-bearing URLs.
        writeJson(res, 502, { ok: false, error: { code: 'catalog', message: 'Unable to load provider catalog' } })
      }
    },
  }), 'dsh-tts: /catalog route')

  ctx.effect(() => registerRoute(ctx.webServer, {
    kind: 'exact',
    path: '/dsh-sound-atelier/status',
    handler: async (req, res) => {
      if (req.method !== 'GET') { writeJson(res, 405, { ok: false, error: { code: 'method', message: 'GET only' } }); return }
      if (rejectIfUntrusted(req, res)) return
      const cfg = live()
      writeJson(res, 200, {
        ok: true,
        speakReplies: cfg.speakReplies,
        announceApproval:cfg.announceApproval,
        streamingEnabled: cfg.streamingEnabled,
        rate: cfg.rate,
        adaptiveRate: cfg.adaptiveRate,
        duckOnTyping: cfg.duckOnTyping,
        tldrDefault: cfg.tldrDefault,
        skipTables: cfg.skipTables,
        cleanUrls: cfg.cleanUrls,
        keepInlineCode: cfg.keepInlineCode,
        chime: cfg.chime,
        bargeIn: cfg.bargeIn && cfg.vadBargeIn !== false,
        vadBargeIn: cfg.vadBargeIn !== false,
        language: cfg.language,
        chain: cfg.chain,
        roles: cfg.roles,
        eventChimes: cfg.eventChimes,
        providers: PROVIDER_KEYS,
        sseClients: streamSubscriberCount(),
        breaker: typeof breakerSnapshot === 'function' ? breakerSnapshot() : [],
      })
    },
  }), 'dsh-tts: /status route')

  ctx.effect(() => registerRoute(ctx.webServer, {
    kind: 'exact',
    path: '/dsh-sound-atelier/stream',
    handler: async (req, res) => {
      if (req.method !== 'GET') { writeJson(res, 405, { ok: false, error: { code: 'method', message: 'GET only' } }); return }
      if (rejectIfUntrusted(req, res)) return
      const url = new URL(req.url || '/', 'http://127.0.0.1')
      const sid = url.searchParams.get('sessionId'), clientId = url.searchParams.get('clientId')
      if (!sid || !clientId) { writeJson(res, 400, { ok: false, error: { message: 'sessionId and clientId required' } }); return }
      try {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
        })
        res.write(': connected\n\n')
        addStreamSubscriber(res, item => item.sessionId === sid && playbackLeases.owns(sid, clientId) && (!item.clientId || item.clientId === clientId))
        req.on('close', () => removeStreamSubscriber(res))
      } catch { /* SSE connection failed */ 
        removeStreamSubscriber(res)
      }
    },
  }), 'dsh-tts: /stream route')

  ctx.effect(() => registerRoute(ctx.webServer, {
    kind: 'exact',
    path: '/dsh-sound-atelier/models/status',
    handler: async (req, res) => {
      if (req.method !== 'GET') { writeJson(res, 405, { ok: false, error: { code: 'method', message: 'GET only' } }); return }
      if (rejectIfUntrusted(req, res)) return
      try {
        const list = await modelManager.listStatus(); if(api.kokoroRuntime)list.kokoro={...list.kokoro,weightsInstalled:list.kokoro.installed,...api.kokoroRuntime.status()}
        writeJson(res, 200, { ok: true, models: list })
      } catch (err) {
        writeJson(res, 500, { ok: false, error: String(err && err.message || err) })
      }
    },
  }), 'dsh-tts: /models/status route')

  ctx.effect(() => registerRoute(ctx.webServer, {
    kind: 'exact',
    path: '/dsh-sound-atelier/models/install',
    handler: async (req, res) => {
      if (req.method !== 'POST') { writeJson(res, 405, { ok: false, error: { code: 'method', message: 'POST only' } }); return }
      if (rejectIfUntrusted(req, res, { requireAuth: true })) return
      let body = {}
      try {
        const raw = await readBody(req, 16 * 1024)
        body = JSON.parse(raw.toString('utf8') || '{}')
      } catch (e) {
        writeJson(res, 400, { ok: false, error: { code: 'body', message: e.message } })
        return
      }
      const engine = String(body.engine || '').trim()
      if (!engine) {
        writeJson(res, 400, { ok: false, error: { code: 'param', message: 'missing engine parameter' } })
        return
      }
      if (!Object.hasOwn(MODEL_SPECS, engine)) {
        writeJson(res, 400, { ok: false, error: { code: 'param', message: 'unknown engine: ' + engine } })
        return
      }
      try {
        // Fire installation in background or await initial start
        modelManager.installModel(engine).catch(() => { /* background install error tracked in manager state */ })
        const current = await modelManager.getStatus(engine)
        writeJson(res, 200, {
          ok: true,
          model: current,
          note: 'Legacy weights only; this does not prepare a runtime. Use the local model service panel for isolated inference.',
        })
      } catch (err) {
        writeJson(res, 500, { ok: false, error: String(err && err.message || err) })
      }
    },
  }), 'dsh-tts: /models/install route')

  ctx.effect(() => registerRoute(ctx.webServer, {
    kind: 'exact',
    path: '/dsh-sound-atelier/models/delete',
    handler: async (req, res) => {
      if (req.method !== 'DELETE' && req.method !== 'POST') {
        writeJson(res, 405, { ok: false, error: { code: 'method', message: 'DELETE or POST only' } })
        return
      }
      if (rejectIfUntrusted(req, res, { requireAuth: true })) return
      let body = {}
      try {
        const raw = await readBody(req, 16 * 1024)
        body = JSON.parse(raw.toString('utf8') || '{}')
      } catch { /* missing body treated as empty */ body = {} }
      const engine = String(body.engine || '').trim()
      if (!engine) {
        writeJson(res, 400, { ok: false, error: { code: 'param', message: 'missing engine parameter' } })
        return
      }
      if (!Object.hasOwn(MODEL_SPECS, engine)) {
        writeJson(res, 400, { ok: false, error: { code: 'param', message: 'unknown engine: ' + engine } })
        return
      }
      try {
        const result = await modelManager.deleteModel(engine)
        writeJson(res, 200, { ok: true, model: result })
      } catch (err) {
        writeJson(res, 500, { ok: false, error: String(err && err.message || err) })
      }
    },
  }), 'dsh-tts: /models/delete route')



  ctx.effect(() => registerRoute(ctx.webServer, {
    kind: 'exact',
    path: '/dsh-sound-atelier/cache',
    handler: async (req, res) => {
      if (req.method !== 'DELETE' && req.method !== 'POST') {
        writeJson(res, 405, { ok: false, error: { code: 'method', message: 'DELETE only' } })
        return
      }
      if (rejectIfUntrusted(req, res, { requireAuth: true })) return
      const removed = await speechCache.clear()
      writeJson(res, 200, { ok: true, removed, cleared: removed })
    },
  }), 'dsh-tts: /cache route')

  ctx.effect(() => registerRoute(ctx.webServer, {
    kind: 'exact',
    path: '/dsh-sound-atelier/cache/clear',
    handler: async (req, res) => {
      if (req.method !== 'POST' && req.method !== 'DELETE') {
        writeJson(res, 405, { ok: false, error: { code: 'method', message: 'POST only' } })
        return
      }
      if (rejectIfUntrusted(req, res, { requireAuth: true })) return
      const removed = await speechCache.clear()
      writeJson(res, 200, { ok: true, removed, cleared: removed })
    },
  }), 'dsh-tts: /cache/clear route')

  ctx.effect(() => registerRoute(ctx.webServer, {
    kind: 'exact',
    path: '/dsh-sound-atelier/preview',
    handler: async (req, res) => {
      if (req.method !== 'POST') {
        writeJson(res, 405, { ok: false, error: { code: 'method', message: 'POST only' } })
        return
      }
      if (rejectIfUntrusted(req, res)) return
      let body = {}
      try {
        const raw = await readBody(req, 64 * 1024)
        body = JSON.parse(raw.toString('utf8') || '{}')
      } catch (e) {
        writeJson(res, 400, { ok: false, error: { code: 'body', message: e.message } })
        return
      }
      const cfg = live()
      const voiceLocale = body.provider==='kokoro'?'en-US':body.provider === 'edge' && /^[a-z]{2,3}-[A-Z]{2}-/.test(body.voice || '') ? body.voice.split('-').slice(0, 2).join('-') : ''
      const lang = String(voiceLocale || cfg.language || '').toLowerCase()
      let phrase = 'This is a voice preview. Please listen to the complete sentence.'
      if (lang.startsWith('zh')) phrase = '這是語音試聽，請確認這句話能完整播放。'
      else if (lang.startsWith('ja')) phrase = 'これは音声の試聴です。最後まで聞こえるか確認してください。'
      else if (lang.startsWith('ko')) phrase = '음성 미리 듣기입니다. 문장이 끝까지 들리는지 확인해 주세요.'
      else if (lang.startsWith('de')) phrase = 'Dies ist eine Sprachvorschau. Bitte hören Sie den ganzen Satz an.'
      else if (lang.startsWith('fr')) phrase = 'Ceci est un aperçu de la voix. Écoutez la phrase jusqu’à la fin.'
      else if (lang.startsWith('es')) phrase = 'Esta es una prueba de voz. Escucha la frase hasta el final.'
      const controller = new AbortController()
      const abort = () => controller.abort()
      const timer = setTimeout(abort, Number(cfg.timeoutMs) || 60000)
      res.on?.('close', abort)
      try {
        if(body.ssml)validateSsml(body.ssml)
        const probe = Object.assign({}, cfg, {
          ...(body.ssml?{_inputType:'ssml'}:{}),
          chain: [{ provider: body.provider || '', model: body.model || '', voice: body.voice || '', style: typeof body.tuning?.style === 'string' ? body.tuning.style : '', ...Object.fromEntries(['baseUrl', 'keyEnv', 'options', 'referenceAsset'].filter(k => typeof body.tuning?.[k] === 'string').map(k => [k, body.tuning[k]])) }],
          roles: { ...cfg.roles, reply: {} },
          rate: clamp(body.tuning?.rate, 0.5, 2, cfg.rate || 1),
          pitch: clamp(body.tuning?.pitch, -50, 50, cfg.pitch || 0),
          volume: clamp(body.tuning?.volume, 0, 1, cfg.volume ?? 1),
          voaiPitch: clamp(body.tuning?.voaiPitch, -5, 5, cfg.voaiPitch ?? 0),
          styleWeight: clamp(body.tuning?.styleWeight, 0, 1, cfg.styleWeight ?? .5),
          breathPause: clamp(body.tuning?.breathPause, 0, 10, cfg.breathPause ?? 0),
          doubaoPitch: clamp(body.tuning?.doubaoPitch, -12, 12, cfg.doubaoPitch ?? 0),
          speechInstruction: typeof body.tuning?.instruction === 'string' ? body.tuning.instruction.slice(0, 2000) : cfg.speechInstruction,
          doubaoInstruction: typeof body.tuning?.instruction === 'string' ? body.tuning.instruction.slice(0, 2000) : cfg.doubaoInstruction,
          mimoInstruction: typeof body.tuning?.instruction === 'string' ? body.tuning.instruction.slice(0, 2000) : cfg.mimoInstruction,
          deepinfraVoiceDesign: typeof body.tuning?.voiceDesign === 'string' ? body.tuning.voiceDesign.slice(0, 2000) : cfg.deepinfraVoiceDesign,
          mimoVoiceDesign: typeof body.tuning?.voiceDesign === 'string' ? body.tuning.voiceDesign.slice(0, 2000) : cfg.mimoVoiceDesign,
        })
        if(body.spokenLanguage!==undefined){if(!['original','ja'].includes(body.spokenLanguage))throw Error('不支援的配音語言');probe.spokenLanguage=body.spokenLanguage}
        const source=String(body.ssml||body.text||phrase),spoken=api.prepareSpokenText?await api.prepareSpokenText(body.ssml?source:cleanText(source,probe,0),probe,controller.signal,body.spokenText):source
        const out = await synthesize(spoken, probe, controller.signal, 'reply',{skipClean:true})
        writeJson(res, 200, { ok: true, text: String(body.text || phrase), ...(probe._speechTarget?{sourceText:source,spokenText:spoken,spokenLanguage:probe._speechTarget}:{}),...voiceTuning(probe), mime: out.mime, audioBase64: Buffer.from(out.audio).toString('base64'), ...(out.timing ? { timing: out.timing } : {}) })
      } catch (e) {
        writeJson(res, 502, { ok: false, error: { code: 'tts', message: String(e && e.message || e) } })
      } finally { clearTimeout(timer); res.off?.('close', abort) }
    },
  }), 'dsh-tts: /preview route')

  ctx.effect(() => registerRoute(ctx.webServer, {
    kind: 'exact',
    path: '/dsh-sound-atelier/stats',
    handler: async (req, res) => {
      if (req.method === 'GET') {
        if (rejectIfUntrusted(req, res)) return
        writeJson(res, 200, { ok: true, total: stats.total, cacheHits: stats.cacheHits, errors: stats.errors, providers: stats.providers, breaker: typeof breakerSnapshot === 'function' ? breakerSnapshot() : [] })
        return
      }
      if (req.method !== 'DELETE') {
        writeJson(res, 405, { ok: false, error: { code: 'method', message: 'GET or DELETE' } })
        return
      }
      if (rejectIfUntrusted(req, res, { requireAuth: true })) return
      stats.total = 0
      stats.cacheHits = 0
      stats.errors = 0
      stats.providers = {}
      writeJson(res, 200, { ok: true })
    },
  }), 'dsh-tts: /stats route')

  ctx.effect(() => registerRoute(ctx.webServer, {
    kind: 'exact',
    path: '/dsh-sound-atelier/config',
    handler: async (req, res) => {
      if (req.method === 'GET') {
        if (rejectIfUntrusted(req, res, { message: 'dsh-tts: settings writes are same-origin only' })) return
        writeJson(res, 200, await configResponse())
        return
      }
      if (req.method !== 'PUT' && req.method !== 'POST') {
        writeJson(res, 405, { ok: false, error: { code: 'method', message: 'GET or PUT' } })
        return
      }
      if (rejectIfUntrusted(req, res, { requireAuth: true, message: 'dsh-tts: settings writes are same-origin only' })) return
      const settingsApi = typeof getSettingsApi === 'function' ? getSettingsApi() : null
      if (!settingsApi) {
        writeJson(res, 503, { ok: false, error: { code: 'settings', message: 'settings not ready' } })
        return
      }
      let raw
      try { raw = await readBody(req, 256 * 1024) } catch (e) {
        writeJson(res, 400, { ok: false, error: { code: 'body', message: e.message } })
        return
      }
      let payload
      try { payload = JSON.parse(raw.toString('utf8') || '{}') } catch { /* invalid JSON treated as empty */
        writeJson(res, 400, { ok: false, error: { code: 'json', message: 'invalid json' } })
        return
      }
      const revision = payload?.revision ?? (typeof payload?.config === 'object' ? payload.config?.revision : undefined)
      if (payload && typeof payload.config === 'object') {
        payload = { ...payload.config, keys: payload.keys }
      }
      if (payload && typeof payload === 'object') {
        delete payload.revision
        if (payload.config && typeof payload.config === 'object') {
          delete payload.config.revision
        }
      }
      const keys = pendingKeyWrites(payload && payload.keys)
      const stripped = stripSecretsFromConfig(payload)
      delete stripped.revision
      let parsed
      try { parsed = validateConfig(stripped) } catch (e) {
        writeJson(res, 400, { ok: false, error: { code: 'schema', message: String(e && e.message || e) } })
        return
      }
      if (parsed && typeof parsed === 'object') {
        delete parsed.revision
      }
      let replaceSucceeded = false
      const prevConfig = typeof settingsApi.get === 'function' ? settingsApi.get() : null
      try {
        await settingsApi.replace(parsed, revision)
        replaceSucceeded = true
        for (const item of keys) {
          await storeProviderKey(item.provider, item.value)
        }
        writeJson(res, 200, await configResponse())
      } catch (e) {
        if (replaceSucceeded && prevConfig) {
          try {
            await settingsApi.replace(prevConfig)
          } catch (_rollbackErr) {
            // best-effort rollback on credential storage failure
          }
        }
        const isConflict = e?.code === 'conflict' || e?.name === 'SettingsConflictError' || (
          /conflict/i.test(e?.message || '') || (/revision/i.test(e?.message || '') && !/not volatile/i.test(e?.message || ''))
        )
        const statusCode = isConflict ? 409 : 500
        const code = isConflict ? 'conflict' : 'save'
        writeJson(res, statusCode, { ok: false, error: { code, message: String(e && e.message || e) } })
      }
    },
  }), 'dsh-tts: /config route')

  ctx.effect(() => registerRoute(ctx.webServer, {
    kind: 'exact',
    path: '/dsh-sound-atelier/credential',
    handler: async (req, res) => {
      if (req.method !== 'PUT' && req.method !== 'DELETE') {
        writeJson(res, 405, { ok: false, error: { code: 'method', message: 'PUT or DELETE only' } })
        return
      }
      if (rejectIfUntrusted(req, res, { requireAuth: true, message: 'dsh-tts: keys are same-origin only' })) return
      let payload = {}
      if (req.method === 'PUT' || (req.headers['content-length'] && Number(req.headers['content-length']) > 0)) {
        let raw
        try { raw = await readBody(req, 16 * 1024) } catch (e) {
          writeJson(res, 400, { ok: false, error: { code: 'body', message: e.message } })
          return
        }
        try { payload = JSON.parse(raw.toString('utf8') || '{}') } catch { /* invalid JSON treated as empty */
          writeJson(res, 400, { ok: false, error: { code: 'json', message: 'invalid json' } })
          return
        }
      }
      const provider = typeof payload.provider === 'string' ? payload.provider.trim() : ''
      if (!needsApiKey(provider)&&provider!=='local-tts') {
        writeJson(res, 400, { ok: false, error: { code: 'provider', message: 'unknown cloud provider' } })
        return
      }
      try {
        if (req.method === 'DELETE') {
          const ref = await clearProviderKey(provider)
          writeJson(res, 200, { ok: true, ref, credentials: await credentialsView() })
          return
        }
        const ref = await storeProviderKey(provider, payload.value)
        writeJson(res, 200, { ok: true, ref, credentials: await credentialsView() })
      } catch (e) {
        writeJson(res, 400, { ok: false, error: { code: 'credential', message: String(e && e.message || e) } })
      }
    },
  }), 'dsh-tts: /credential route')

  ctx.effect(() => registerRoute(ctx.webServer, {
    kind: 'exact',
    path: '/dsh-sound-atelier/pending',
    handler: async (req, res) => {
      if (req.method !== 'GET') { writeJson(res, 405, { ok: false, error: { code: 'method', message: 'GET only' } }); return }
      if (rejectIfUntrusted(req, res)) return
      const url = new URL(req.url || '/', 'http://127.0.0.1')
      const after = url.searchParams.get('after') || ''
      const sid = url.searchParams.get('sessionId') || ''
      const clientId = url.searchParams.get('clientId') || ''
      if (!sid || !clientId) { writeJson(res, 200, { ok: true, owner: false, items: [] }); return }
      const owner = playbackLeases.claim(sid, clientId)
      let items = owner ? pending.filter(item => item.sessionId === sid && (!item.clientId || item.clientId === clientId)) : []
      if (after) {
        const idx = items.findIndex((x) => x.id === after)
        items = idx >= 0 ? items.slice(idx + 1) : items
      }
      writeJson(res, 200, { ok: true, owner, items,...(owner&&api.isPreparing?.(sid)?{preparing:true}:{}) })
    },
  }), 'dsh-tts: /pending route')

  ctx.effect(() => registerRoute(ctx.webServer, {
    kind: 'exact',
    path: '/dsh-sound-atelier/playback',
    handler: async (req, res) => {
      if (req.method !== 'POST') { writeJson(res, 405, { ok: false }); return }
      if (rejectIfUntrusted(req, res)) return
      try {
        const body = JSON.parse((await readBody(req, 4096)).toString('utf8'))
        const { sessionId, clientId, action } = body
        if (!sessionId || !clientId || !['claim', 'release', 'stop'].includes(action)) throw Error('Invalid playback request')
        if (action === 'stop') {
          if (!playbackLeases.owns(sessionId, clientId)) { writeJson(res, 409, { ok: false }); return }
          api.cancelPreparations?.(sessionId)
          const ignoredJobs = speechJobs.cancelSession(sessionId, clientId)
          writeJson(res, 200, { ok: true, ignoredJobs }); return
        }
        if (action === 'release') playbackLeases.release(sessionId, clientId)
        const owner = action === 'claim' && playbackLeases.claim(sessionId, clientId, body.takeover === true)
        writeJson(res, 200, { ok: true, owner })
      } catch { writeJson(res, 400, { ok: false }) }
    },
  }), 'dsh-tts: playback ownership')

  ctx.effect(() => registerRoute(ctx.webServer, {
    kind: 'exact',
    path: '/dsh-sound-atelier/job',
    handler: async (req, res) => {
      if (!['GET', 'DELETE'].includes(req.method)) { writeJson(res, 405, { ok: false }); return }
      if (rejectIfUntrusted(req, res)) return
      const url = new URL(req.url || '/', 'http://127.0.0.1')
      const sid = url.searchParams.get('sessionId') || '', clientId = url.searchParams.get('clientId') || ''
      const job = speechJobs.get(url.searchParams.get('id'), sid)
      if (!job || (job.clientId && job.clientId !== clientId)) { writeJson(res, 404, { ok: false, error: { message: 'Speech job unavailable or expired' } }); return }
      if (req.method === 'DELETE') {
        if (!clientId || (!job.clientId && !playbackLeases.owns(sid, clientId))) { writeJson(res, 409, { ok: false }); return }
        speechJobs.cancel(job.id, sid)
        writeJson(res, 200, { ok: true, ...speechJobs.view(job) }); return
      }
      const view = speechJobs.view(job)
      if (url.searchParams.get('audio') !== '1') { writeJson(res, 200, { ok: true, ...view }); return }
      if (job.state !== 'complete') { writeJson(res, 409, { ok: false, ...view, error: { message: job.error || `Speech job is ${job.state}` } }); return }
      const controller = new AbortController()
      const abort = () => controller.abort()
      res.on?.('close', abort)
      try {
        const out = await speechJobs.audio(job, controller.signal)
        writeJson(res, 200, { ok: true, ...view, ...out, audio: undefined, audioBase64: out.audio.toString('base64') })
      } catch (e) { writeJson(res, 422, { ok: false, error: { message: String(e.message) } }) }
      finally { res.off?.('close', abort) }
    },
  }), 'dsh-tts: retained speech jobs')

  ctx.effect(()=>registerRoute(ctx.webServer, {kind:'exact',path:'/dsh-sound-atelier/capabilities',handler:async(req,res)=>{
    if(req.method!=='GET'){writeJson(res,405,{ok:false});return}if(rejectIfUntrusted(req,res))return
    try{const url=new URL(req.url,'http://127.0.0.1');writeJson(res,200,{ok:true,capabilities:providerCapabilities(url.searchParams.get('provider'),url.searchParams.get('model')||undefined,url.searchParams.get('voice')||undefined,url.searchParams.get('transport')||'')})}catch(e){writeJson(res,400,{ok:false,error:{message:e.message}})}
  }}),'dsh-tts: model capability catalog')
  ctx.effect(() => registerRoute(ctx.webServer, {
    kind: 'exact',path:'/dsh-sound-atelier/dialogue',handler:async(req,res)=>{
      if(req.method!=='POST'){writeJson(res,405,{ok:false});return}
      if(rejectIfUntrusted(req,res))return
      const controller=new AbortController(),abort=()=>controller.abort(),timer=setTimeout(abort,10*60000);res.on?.('close',abort)
      try{
        const body=JSON.parse((await readBody(req,256*1024)).toString())
        const out=await synthesizeDialogue(body,live(),controller.signal)
        writeJson(res,200,{ok:true,...out,audio:undefined,audioBase64:out.audio.toString('base64')})
      }catch(e){writeJson(res,400,{ok:false,error:{message:String(e.message)}})}finally{clearTimeout(timer);res.off?.('close',abort)}
    },
  }),'dsh-tts: multi-speaker dialogue')
  ctx.effect(() => registerRoute(ctx.webServer, {kind:'exact',path:'/dsh-sound-atelier/live',handler:async(req,res)=>{
    if(!['GET','POST','DELETE'].includes(req.method)){writeJson(res,405,{ok:false});return}
    if(rejectIfUntrusted(req,res))return
    try{
      const query=new URL(req.url,'http://127.0.0.1').searchParams
      const body=req.method==='POST'?JSON.parse((await readBody(req,256*1024)).toString()):{}
      const sessionId=body.sessionId||query.get('sessionId'),clientId=body.clientId||query.get('clientId')
      if(typeof sessionId!=='string'||!sessionId||sessionId.length>256||typeof clientId!=='string'||!clientId||clientId.length>256)throw Error('Live sessionId and clientId are required')
      if(body.action==='start'){
        const cfg=live()
        if(body.spokenLanguage!==undefined){if(!['original','ja'].includes(body.spokenLanguage))throw Error('不支援的配音語言');cfg.spokenLanguage=body.spokenLanguage}
        if(cfg.spokenLanguage==='ja')throw Error('翻譯配音需先收齊整段文字，請使用 /speak；已翻譯的日文可明確指定 original 使用即時介面')
        const job=api.liveSpeech.start({sessionId,clientId,text:body.text,cfg,role:'reply'})
        writeJson(res,200,{ok:true,...api.liveSpeech.view(job)});return
      }
      const job=api.liveSpeech.get(body.id||query.get('id'),sessionId,clientId)
      if(!job){writeJson(res,404,{ok:false,error:{message:'Live session not found'}});return}
      if(req.method==='DELETE')job.controller.abort()
      if(req.method==='POST'){
        if(body.action==='append')api.liveSpeech.append(job,body.text)
        else if(body.action==='finish')api.liveSpeech.seal(job)
        else throw Error('Unknown live action')
      }
      writeJson(res,200,{ok:true,...api.liveSpeech.view(job,Number(query.get('after')||0),query.get('audio')==='1')})
    }catch(e){writeJson(res,400,{ok:false,error:{message:e.message}})}
  }}),'dsh-tts: incremental text and PCM sessions')
  ctx.effect(() => registerRoute(ctx.webServer, {
    kind:'exact',path:'/dsh-sound-atelier/provider-operation',handler:async(req,res)=>{
      if(req.method!=='POST'){writeJson(res,405,{ok:false});return}
      if(rejectIfUntrusted(req,res,{requireAuth:true}))return
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000)
      try{
        const body=JSON.parse((await readBody(req,256*1024)).toString()),cfg=live()
        if(!['polly','inworld'].includes(body.provider))throw Error('Unsupported provider operation')
        const candidate=chainCandidates(cfg,'reply').find(e=>e.provider===body.provider)
        const config=candidate?.cfg||cfg
        const key=await api.resolveKey(keyEnvName(config,body.provider));if(!key)throw Error('Configure the provider credential first')
        const result=await providerOperation({provider:body.provider,action:body.action,input:body.input,cfg:config,key,signal:controller.signal})
        writeJson(res,200,{ok:true,result})
      }catch(e){writeJson(res,400,{ok:false,error:{message:String(e.message)}})}finally{clearTimeout(timer)}
    },
  }),'dsh-tts: provider dictionaries and cloud jobs')
  ctx.effect(() => registerRoute(ctx.webServer, {
    kind: 'exact',
    path: '/dsh-sound-atelier/speak',
    handler: async (req, res) => {
      if (req.method !== 'POST') { writeJson(res, 405, { ok: false, error: { code: 'method', message: 'POST only' } }); return }
      if (rejectIfUntrusted(req, res)) return
      let raw
      try { raw = await readBody(req, 256 * 1024) } catch (e) {
        writeJson(res, 400, { ok: false, error: { code: 'body', message: e.message } }); return
      }
      let payload
      try { payload = JSON.parse(raw.toString('utf8') || '{}') } catch { /* invalid JSON treated as empty */ /* invalid JSON treated as empty */ payload = {} }
      const rawText = String(payload.ssml || payload.text || '')
      if (!rawText.trim()) { writeJson(res, 400, { ok: false, error: { code: 'no-text', message: 'no text' } }); return }
      let cfg = live()
      if(payload.ssml){try{validateSsml(payload.ssml);cfg={...cfg,_inputType:'ssml'}}catch(e){writeJson(res,400,{ok:false,error:{message:e.message}});return}}
      const overrides = {}
      if (typeof payload.tldr === 'boolean') overrides.tldrOnly = payload.tldr
      if (typeof payload.tldrOnly === 'boolean') overrides.tldrOnly = payload.tldrOnly
      if (typeof payload.skipTables === 'boolean') overrides.skipTables = payload.skipTables
      if (typeof payload.skipCode === 'boolean') overrides.skipCode = payload.skipCode
      if (typeof payload.cleanUrls === 'boolean') overrides.cleanUrls = payload.cleanUrls
      if (typeof payload.keepInlineCode === 'boolean') overrides.keepInlineCode = payload.keepInlineCode

      const controller = new AbortController()
      const abort = () => controller.abort()
      res.on?.('close', abort)
      // Each queued segment has its own provider timeout. The whole message
      // may legitimately take longer than one segment.
      const timer = setTimeout(abort, 10 * 60000)
      try {
        cfg._sessionId=String(payload.sessionId||'');cfg._requestedProfileId=typeof payload.profileId==='string'?payload.profileId:undefined
        cfg=await api.voiceContext.resolve(cfg,{sessionId:cfg._sessionId,workspaceId:payload.workspaceId,profileId:cfg._requestedProfileId},controller.signal)
        if(payload.spokenLanguage!==undefined){if(!['original','ja'].includes(payload.spokenLanguage))throw Error('不支援的配音語言');cfg={...cfg,spokenLanguage:payload.spokenLanguage}}
        if(payload.spokenText!==undefined)cfg={...cfg,_providedSpokenText:payload.spokenText}
        if(cfg._inputType==='ssml'&&cfg.spokenLanguage==='ja')throw Error('翻譯配音不接受 SSML；請提供純文字，或先翻譯日文 SSML 並指定原文模式')
        const text = cfg._inputType==='ssml'?rawText:typeof prepareSpeechText === 'function'
          ? await prepareSpeechText(rawText, cfg, controller.signal, overrides)
          : cleanText(rawText, cfg, 0, overrides)
        if (!text) { writeJson(res, 400, { ok: false, error: { code: 'no-text', message: 'no text' } }); return }
        const sid = String(payload.sessionId || '')
        const clientId = String(payload.clientId || '')
        controller.signal.throwIfAborted()
        if (clientId && sid && !playbackLeases.claim(sid, clientId)) throw Error('Playback owner changed')
        const job = startSpeechJob(sid, text, cfg, 'reply', payload.messageId, { publish: false, clientId, signal: controller.signal })
        await job.promise
        const out = await speechJobs.audio(job, controller.signal)
        const tuning = voiceTuning(cfg, 'reply')
        const effectiveRate = cfg.adaptiveRate ? computeAdaptiveRate(text.length, tuning.rate) : tuning.rate
        writeJson(res, 200, {
          ok: true,
          ...speechJobs.view(job),
          rate: effectiveRate,
          volume: tuning.volume,
          provider: job.segments[0]?.provider,
          mime: out.mime,
          audioBase64: Buffer.from(out.audio).toString('base64'),
          ...(out.timing?{timing:out.timing,timeline:out.timeline,duration:out.duration}:{}),
          tookMs: out.tookMs,
        })
      } catch (e) {
        writeJson(res, 502, { ok: false, error: { code: 'chain', message: String(e && e.message || e) } })
      } finally {
        clearTimeout(timer)
        res.off?.('close', abort)
      }
    },
  }), 'dsh-tts: /speak route')

  ctx.effect(() => registerRoute(ctx.webServer, {
    kind: 'exact',
    path: '/dsh-sound-atelier/voice/clone',
    handler: async (req, res) => {
      if (req.method !== 'POST') { writeJson(res, 405, { ok: false, error: { code: 'method', message: 'POST only' } }); return }
      if (rejectIfUntrusted(req, res)) return
      let raw
      try { raw = await readBody(req, 12 * 1024 * 1024) } catch (e) {
        writeJson(res, 400, { ok: false, error: { code: 'body', message: e.message } }); return
      }
      let payload
      try { payload = JSON.parse(raw.toString('utf8') || '{}') } catch { payload = {} }
      let result;try{const asset=await api.voiceAssets.create({name:payload.name,sample:payload.sample,transcript:payload.transcript});result={ok:true,asset,assetId:asset.id,voiceId:null,kind:'reference',state:'validated',cloned:false,note:'Recording validated; no voice model was trained or remotely created'}}catch(e){result={ok:false,error:String(e.message)}}
      writeJson(res, result.ok ? 200 : 400, result)
    },
  }), 'dsh-tts: /voice/clone route')

  const updaterMutex = { installing: false }
  registerLocalAdmin(ctx,api,rejectIfUntrusted)
  ctx.effect(()=>registerRoute(ctx.webServer, {kind:'exact',path:'/dsh-sound-atelier/usage',handler:async(req,res)=>{
    if(req.method!=='GET'){writeJson(res,405,{ok:false});return}if(rejectIfUntrusted(req,res,{requireAuth:true}))return
    try{writeJson(res,200,{ok:true,...await api.usageLedger.snapshot()})}catch(e){writeJson(res,500,{ok:false,error:{message:e.message}})}
  }}),'dsh-tts: estimated usage ledger')
  ctx.effect(()=>registerRoute(ctx.webServer, {kind:'exact',path:'/dsh-sound-atelier/voice/cloud',handler:async(req,res)=>{
    if(!['GET','POST'].includes(req.method)){writeJson(res,405,{ok:false});return}
    if(rejectIfUntrusted(req,res,{requireAuth:true}))return
    const controller=new AbortController(),abort=()=>controller.abort(),timer=setTimeout(abort,120000);res.on?.('close',abort)
    try{
      if(req.method==='GET'){writeJson(res,200,{ok:true,voices:await api.cloudVoices.list(),candidates:api.cloudVoices.candidates(live()),services:api.cloudVoices.services});return}
      const body=JSON.parse((await readBody(req,16384)).toString())
      const result=await api.cloudVoices.run(body.action,body,live(),controller.signal)
      writeJson(res,200,{ok:true,...result})
    }catch(e){writeJson(res,400,{ok:false,error:{message:e.message}})}finally{clearTimeout(timer);res.off?.('close',abort)}
  }}),'dsh-tts: permanent cloud voice lifecycle')
  ctx.effect(()=>registerRoute(ctx.webServer, {kind:'exact',path:'/dsh-sound-atelier/voice/assets',handler:async(req,res)=>{
    if(!['GET','POST','PATCH','DELETE'].includes(req.method)){writeJson(res,405,{ok:false});return}
    if(rejectIfUntrusted(req,res,{requireAuth:true}))return
    const controller=new AbortController(),abort=()=>controller.abort(),timer=setTimeout(abort,60000);res.on?.('close',abort)
    try{
      if(req.method==='GET'){writeJson(res,200,{ok:true,assets:await api.voiceAssets.list()});return}
      const body=JSON.parse((await readBody(req,14*1024*1024)).toString())
      const result=req.method==='POST'?await api.voiceAssets.create({name:body.name,sample:body.sample,transcript:body.transcript},controller.signal):req.method==='PATCH'?await api.voiceAssets.update(body.id,{name:body.name,transcript:body.transcript}):await api.voiceAssets.remove(body.id)
      writeJson(res,200,{ok:true,...(req.method==='DELETE'?result:{asset:result})})
    }catch(e){writeJson(res,400,{ok:false,error:{message:e.message}})}finally{clearTimeout(timer);res.off?.('close',abort)}
  }}),'dsh-tts: validated reference recording assets')
  ctx.effect(()=>registerRoute(ctx.webServer, {kind:'exact',path:'/dsh-sound-atelier/voice/reference',handler:async(req,res)=>{
    if(req.method!=='GET'){writeJson(res,405,{ok:false});return}if(rejectIfUntrusted(req,res,{requireAuth:true}))return
    try{const id=new URL(req.url,'http://localhost').searchParams.get('id');const reference=await api.voiceAssets.reference(id);res.writeHead(200,{'Content-Type':'audio/wav','Content-Length':reference.bytes.length,'Cache-Control':'no-store'});res.end(reference.bytes)}catch(e){writeJson(res,404,{ok:false,error:{message:e.message}})}
  }}),'dsh-tts: reference audio playback')
  ctx.effect(()=>registerRoute(ctx.webServer, {kind:'exact',path:'/dsh-sound-atelier/local/service',handler:async(req,res)=>{
    if(!['GET','POST'].includes(req.method)){writeJson(res,405,{ok:false});return}if(rejectIfUntrusted(req,res,{requireAuth:true}))return
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),300000),abort=()=>controller.abort();res.on?.('close',abort)
    try{
      if(req.method==='GET'){writeJson(res,200,{ok:true,kokoro:api.kokoroRuntime.status(),xinference:api.xinferenceRuntime.status(),managed:api.localModelRuntime.status(),note:'Loaded models and successful inference are separate states; external models are never auto-unloaded'});return}
      const body=JSON.parse((await readBody(req,16384)).toString())
      if(body.action==='start-service'){const result=await api.xinferenceRuntime.start(live(),controller.signal);writeJson(res,200,{ok:true,result});return}
      if(body.action==='stop-service'){const result=await api.xinferenceRuntime.stop();api.localModelRuntime.serviceStopped(live());writeJson(res,200,{ok:true,result});return}
      if(body.action==='kokoro-load'){await api.kokoroRuntime.load(controller.signal);writeJson(res,200,{ok:true,result:api.kokoroRuntime.status()});return}
      if(body.action==='kokoro-unload'){api.kokoroRuntime.stop();writeJson(res,200,{ok:true,result:api.kokoroRuntime.status()});return}
      const cfg=live()
      const result=body.action==='launch'?await api.localModelRuntime.launch(cfg,body.input||{},controller.signal):body.action==='unload'?await api.localModelRuntime.unload(cfg,body.input?.uid,{signal:controller.signal}):await localServiceOperation({cfg,action:body.action,input:body.input,signal:controller.signal,key:await localServiceKey(cfg,api.resolveKey)})
      writeJson(res,200,{ok:true,result})
    }catch(e){writeJson(res,400,{ok:false,error:{message:e.message}})}finally{clearTimeout(timer);res.off?.('close',abort)}
  }}),'dsh-tts: local model lifecycle')
  ctx.effect(() => registerPluginUpdater(ctx, {
    endpoint: '/api/dsh-sound-atelier/update',
    // 從市集／npm 安裝的版本用套件名一鍵更新；從來源資料夾安裝的版本不自動更新（會把連結換成 npm 套件）。
    packageName: 'dsh-sound-atelier',
    localFork: isSourceInstall(import.meta.url),
    manifestUrl: new URL('../package.json', import.meta.url),
    mutex: updaterMutex,
  }), 'dsh-tts: updater route /api/dsh-tts/update')
}
