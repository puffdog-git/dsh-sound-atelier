import { ENROLLMENT_SERVICES, enrollmentOperation } from './voice-enrollment.js'
// Permanent voice resources. Reference uploads used only for a single synthesis
// belong to voice-assets.js, not to this API.
export const CLOUD_VOICE_SERVICES = Object.freeze({
  elevenlabs: { origin: 'https://api.elevenlabs.io', label: 'ElevenLabs', permissions: 'voices_read、voices_write；試聽另需 text_to_speech', language: false },
  fish: { origin: 'https://api.fish.audio', label: 'Fish Audio', permissions: '可管理自己模型的 API Key；試聽另需合成額度', language: false },
  cartesia: { origin: 'https://api.cartesia.ai', label: 'Cartesia', permissions: '可讀取及管理音色的 API Key；試聽另需 TTS 合成額度', language: true },
  inworld: { origin: 'https://api.inworld.ai', label: 'Inworld', permissions: 'Read（查詢）及 Write（建立／改名／刪除）；試聽另需 TTS 權限與額度', language: false },
  ...ENROLLMENT_SERVICES,
})
export function remoteVoiceId(value,provider) {
  if (typeof value !== 'string' || !(provider==='siliconflow'?/^speech:[^\x00-\x1f\x7f]{1,480}$/.test(value):/^[A-Za-z0-9_-]{1,256}$/.test(value))) throw Error('Invalid remote voice ID')
  return value
}
function resource(provider, data, model, prior = {}) {
  const d = provider === 'inworld' ? data.voice || data : data
  const id = remoteVoiceId(provider === 'elevenlabs' ? d.voice_id : provider === 'fish' ? d._id : provider === 'inworld' ? d.voiceId : d.id)
  let state = 'available'
  if (provider === 'fish') state = d.dmca_taken_down || d.pvc_release_state === 'retiring' ? 'blocked' : ({ created: 'training', training: 'training', trained: 'available', failed: 'failed' }[d.state] || 'unknown')
  if (provider === 'cartesia' && d.status && d.status !== 'active') state = 'blocked'
  if (provider === 'elevenlabs') {
    const v = d.voice_verification, t = d.fine_tuning?.state?.[model]
    if (d.requires_verification === true || v?.requires_verification && !v.is_verified) state = 'verification-required'
    else if (['BAN', 'CAPTCHA', 'ENTERPRISE_BAN', 'ENTERPRISE_CAPTCHA'].includes(d.safety_control)) state = 'blocked'
    else if (['queued', 'fine_tuning', 'delayed'].includes(t)) state = 'training'
    else if (t === 'failed') state = 'failed'
    // A refresh without verification metadata cannot clear a previous requirement.
    else if (prior.remoteState === 'verification-required' && d.requires_verification !== false && !(v && (!v.requires_verification || v.is_verified))) state = 'verification-required'
  }
  const name=provider==='inworld'?d.displayName:provider==='fish'?d.title:d.name
  return { remoteId: id, remoteState: state, ...(typeof name === 'string' && name ? { name: name.slice(0,100) } : {}), ...(typeof d.is_owner === 'boolean' ? { isOwner: d.is_owner } : {}) }
}
export async function cloudVoiceOperation({ provider, action, key, input = {}, reference, model, prior, cfg, onCheckpoint, signal, fetchImpl = fetch }) {
  const service = CLOUD_VOICE_SERVICES[provider]
  if (!service) throw Error('Provider has no implemented permanent voice lifecycle')
  if (!key) throw Error('Configure this provider API key before managing voices')
  signal?.throwIfAborted()
  if(ENROLLMENT_SERVICES[provider])return enrollmentOperation({provider,action,key,input,reference,model,prior,cfg,onCheckpoint,signal,fetchImpl})
  const id = action === 'create' ? '' : remoteVoiceId(input.remoteId)
  const headers = provider === 'elevenlabs' ? { 'xi-api-key': key } : { authorization: (provider === 'inworld' ? 'Basic ' : 'Bearer ') + key }
  if (provider === 'cartesia') headers['Cartesia-Version'] = '2026-08-14'
  let route = provider === 'elevenlabs' ? '/v1/voices/' : provider === 'fish' ? '/model/' : provider === 'inworld' ? '/voices/v1/voices/' : '/voices/'
  route += encodeURIComponent(id)
  let method = { create: 'POST', get: 'GET', rename: 'PATCH', delete: 'DELETE' }[action], body
  if (!method) throw Error('Unknown cloud voice action')
  if (action === 'create') {
    if (!reference?.bytes) throw Error('A validated reference recording is required')
    if (provider === 'inworld') {
      route = '/voices/v1/voices:clone'
      body = JSON.stringify({ displayName: input.name, ...(input.language ? { languageCode: input.language } : {}), voiceSamples: [{ audioData: reference.bytes.toString('base64'), ...(reference.asset.transcript ? { transcription: reference.asset.transcript } : {}) }] })
      headers['content-type'] = 'application/json'
    } else {
      body = new FormData()
      body.append(provider === 'fish' ? 'title' : 'name', input.name)
      body.append(provider === 'elevenlabs' ? 'files' : provider === 'fish' ? 'voices' : 'clip', new Blob([reference.bytes], { type: 'audio/wav' }), 'reference.wav')
      if (provider === 'elevenlabs') route = '/v1/voices/add'
      if (provider === 'cartesia') { route = '/voices/clone'; body.append('language', input.language); body.append('access', 'private') }
      if (provider === 'fish') { route = '/model'; body.append('type', 'tts'); body.append('train_mode', 'fast'); body.append('visibility', 'private'); body.append('generate_sample', 'false'); if(reference.asset.transcript)body.append('texts',reference.asset.transcript) }
    }
  }
  if (action === 'rename') {
    if (provider === 'elevenlabs') { route += '/edit'; method = 'POST'; body = new FormData(); body.append('name', input.name) }
    else { headers['content-type'] = 'application/json'; body = JSON.stringify({ [provider === 'inworld' ? 'displayName' : provider === 'fish' ? 'title' : 'name']: input.name }); if (provider === 'inworld') route += '?updateMask=display_name' }
  }
  // No retries on mutations: a lost response may still have created a billable resource.
  let response
  try { response = await fetchImpl(service.origin + route, { method, headers, ...(body ? { body } : {}), signal, redirect: 'error' }) }
  catch { throw Object.assign(Error('Cloud voice response was lost; check the provider console before submitting again'), { uncertain: action !== 'get' }) }
  if (!response.ok) {
    await response.body?.cancel().catch(()=>{})
    throw Object.assign(Error(`${service.label} voice API HTTP ${response.status}. ${response.status===401||response.status===403 ? service.permissions : 'Check the provider console for details.'}`), { status: response.status, uncertain: action !== 'get' && (response.status >= 500 || [408,429].includes(response.status)) })
  }
  if (action === 'delete' && provider!=='elevenlabs') { await response.body?.cancel().catch(()=>{}); return { remoteState: 'deleted' } }
  if (action === 'rename' && provider==='fish') { await response.body?.cancel().catch(()=>{}); return { name: input.name } }
  let data
  try {
    const chunks=[];let size=0
    for await (const part of response.body) { size+=part.length; if(size>2*1024*1024)throw Error(); chunks.push(part) }
    data = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if(action==='delete'){if(data.status!=='ok')throw Error();return {remoteState:'deleted'}}
    if (action === 'rename' && provider === 'elevenlabs') { if(data.status!=='ok')throw Error(); return { name: input.name } }
    const result=resource(provider,data,model,prior)
    if(action!=='create'&&result.remoteId!==id)throw Error()
    return result
  } catch { throw Object.assign(Error('Invalid cloud voice response; refresh or check the provider console'), { uncertain: action !== 'get' }) }
}
