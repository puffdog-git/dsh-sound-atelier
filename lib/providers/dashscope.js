import { providerOptions, speechInstruction } from './controls.js'
import { DEFAULT_MODELS } from './constants.js'
import { boundedJson, binaryAudio } from './native-http.js'
import { dashscopeWebsocket, dashscopeQwenHttp, dashscopeQwenSse } from './dashscope-streams.js'

export function dashscopeVoices(model = DEFAULT_MODELS.dashscope) {
  const ids = model.startsWith('cosyvoice-') ? ['longanyang'] : model.startsWith('qwen3-tts-') ? ['Cherry','Serena','Ethan','Chelsie'] : model.startsWith('qwen-audio-3.1-') ? ['longanhuan_v3.1', 'longanlingxin_v3.1', 'longanfengyue_v3.1', 'xunanchuan_v3.1'] : model === 'qwen-audio-3.0-tts-plus' ? ['longanlingxin', 'longanlufeng'] : ['longanfengyue', 'longanyuanfei', 'longanlingxi', 'longanxiaoxin']
  return ids.map(id => ({ id, name: id, language: 'zh', model }))
}
export const dashscopeDefaultVoice = model => dashscopeVoices(model)[0].id

export function dashscopeRoot(cfg) {
  const workspace = String(cfg.dashscopeWorkspace || '')
  const region = cfg.dashscopeRegion || 'cn-beijing'
  if (!/^[A-Za-z0-9-]{1,100}$/.test(workspace)) throw Error('DashScope requires a workspace ID from the chosen region')
  if (!['cn-beijing', 'ap-southeast-1'].includes(region)) throw Error('DashScope: unsupported region')
  return `https://${workspace}.${region}.maas.aliyuncs.com/api/v1`
}
export async function synthesizeDashScope({ cfg, req, key, fetchImpl = fetch, signal, WebSocketImpl }) {
  signal?.throwIfAborted()
  const model = req.models?.dashscope || DEFAULT_MODELS.dashscope
  if (!/^(?:qwen-audio-3\.[01]-tts-(?:flash|plus)|cosyvoice-v(?:2|3(?:\.5)?)-(?:flash|plus)|cosyvoice-v2|qwen3-tts-flash)$/.test(model)) throw Error('DashScope: select a supported Qwen-Audio, Qwen3 or CosyVoice model')
  const options = providerOptions(cfg, 'dashscope'), format = options.format || 'wav', sampleRate = options.sampleRate || 24000
  if(model.startsWith('qwen3-tts-')&&options.transport==='websocket')throw Error('DashScope Qwen3 flash uses HTTP/SSE; select Qwen-Audio or CosyVoice for this WebSocket protocol')
  if (format === 'opus' && ![8000, 12000, 16000, 24000, 48000].includes(sampleRate)) throw Error('DashScope: unsupported Opus sampleRate')
  const instruction = speechInstruction(cfg, req.role, 'dashscope')
  const root=dashscopeRoot(cfg),voice=req.voices?.dashscope||dashscopeDefaultVoice(model)
  if(model.startsWith('cosyvoice-')||options.transport==='websocket')return dashscopeWebsocket({cfg,req,key,options,model,voice,root,instruction,signal,WebSocketImpl})
  if(cfg._inputType==='ssml')throw Error('DashScope SSML requires the WebSocket interface and a supported voice')
  if(model.startsWith('qwen3-tts-')){
    if(instruction)throw Error('DashScope Qwen3 flash does not accept instruction prompts; select Qwen-Audio TTS')
    const prepared=await dashscopeQwenHttp({cfg,req,key,options,model,voice,root,signal,fetchImpl})
    if(options.transport==='sse')return dashscopeQwenSse({...prepared,req,key,options,signal,fetchImpl})
    const data=await boundedJson('DashScope',await fetchImpl(prepared.url,{method:'POST',headers:{authorization:'Bearer '+key,'content-type':'application/json'},body:JSON.stringify(prepared.body),signal,redirect:'error'}),signal,1024*1024)
    return downloadDashscope(data,fetchImpl,signal,'wav',24000)
  }
  if(options.transport==='sse'||options.timestamps||options.hotFix||options.seed!==undefined)throw Error('DashScope: these controls require Qwen3 SSE or a supported WebSocket model')
  const body = { model, input: { text: req.text, voice: req.voices?.dashscope || dashscopeDefaultVoice(model), format, sample_rate: sampleRate,
    ...(instruction ? { instruction } : {}), ...(options.speed !== undefined ? { rate: options.speed } : {}), ...(options.volume !== undefined ? { volume: options.volume } : {}), ...(options.pitch !== undefined ? { pitch: options.pitch } : {}), ...(options.language ? { language_hints: [options.language] } : {}),
  } }
  const data = await boundedJson('DashScope', await fetchImpl(dashscopeRoot(cfg) + '/services/audio/tts/SpeechSynthesizer', { method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify(body), signal, redirect: 'error' }), signal, 1024 * 1024)
  return downloadDashscope(data,fetchImpl,signal,format,sampleRate)
}
export async function downloadDashscope(data,fetchImpl,signal,format,sampleRate){
  if (data.code || data.output?.finish_reason !== 'stop') throw Error('DashScope synthesis did not complete')
  let url
  try { url = new URL(data.output?.audio?.url) } catch { throw Error('DashScope: missing audio URL') }
  // Download only from the documented result buckets; never send API credentials.
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port || !/^dashscope-result-[a-z0-9-]+\.oss-[a-z0-9-]+\.aliyuncs\.com$/.test(url.hostname)) throw Error('DashScope: unexpected audio URL')
  url.protocol = 'https:'
  return binaryAudio('dashscope', await fetchImpl(url.href, { signal, redirect: 'error' }), signal, format, sampleRate)
}
