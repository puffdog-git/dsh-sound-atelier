import { randomUUID } from 'node:crypto'
import { dashscopeRoot } from './providers/dashscope.js'
import { readAudioBody } from './providers/audio.js'

export const ENROLLMENT_SERVICES = Object.freeze({
  dashscope:{origin:'https://workspace.region.maas.aliyuncs.com',label:'DashScope',permissions:'相同地域／Workspace 的 API Key，需開通目標模型及聲音複製權限。',rename:false,delete:true,prefix:true,note:'音色綁定目標模型與 Workspace；create 後需查詢審核狀態。update_voice 是更換錄音，不是改名。'},
  minimax:{origin:'https://api.minimax.io',label:'MiniMax',permissions:'API Key、帳戶認證及聲音複製／合成額度；先上傳檔案，再複製。',rename:false,delete:true,customId:true,note:'原錄音至少 10 秒。未正式使用的音色 7 天後清除；未啟用音色可能不在清單。首次正式合成可能產生複製費。'},
  siliconflow:{origin:'https://api.siliconflow.cn',label:'SiliconFlow',permissions:'可使用 CosyVoice2、自訂音色上傳／清單／刪除的 API Key 與餘額。',rename:false,delete:true,note:'本批永久音色限 FunAudioLLM/CosyVoice2-0.5B，逐字稿必填，使用服務回傳的完整 speech: URI。'},
  doubao:{origin:'https://openspeech.bytedance.com',label:'豆包聲音複刻',permissions:'新版火山語音 API Key，需開通聲音複刻；預付槽需先購買，後付費需先開通。',rename:false,delete:false,slot:true,note:'使用 V3 註冊／查詢／升級；預付槽訓練會使用次數並替換槽內音色。後付費首次正式合成可能收取轉正費；本接口未提供遠端刪除／改名，請到控制台管理。'},
})
export function enrollmentRoot(provider,cfg={}){
  if(provider==='dashscope')return dashscopeRoot(cfg)
  const raw=provider==='minimax'?cfg.minimaxBaseUrl||'https://api.minimax.io/v1':provider==='siliconflow'?cfg.siliconflowBaseUrl||'https://api.siliconflow.cn/v1':cfg.doubaoBaseUrl||'https://openspeech.bytedance.com/api/v3/tts/unidirectional'
  let u;try{u=new URL(raw)}catch{throw Error('Invalid cloud voice endpoint')}
  const hosts=provider==='minimax'?['api.minimax.io','api.minimax.cn']:provider==='siliconflow'?['api.siliconflow.cn','api.siliconflow.com']:['openspeech.bytedance.com']
  if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.port||!hosts.includes(u.hostname))throw Error('Cloud voice management requires an official HTTPS endpoint')
  if(provider==='doubao'){if(!['/api/v3/tts/unidirectional','/api/v3/tts/unidirectional/sse'].includes(u.pathname.replace(/\/$/,'')))throw Error('Doubao voice management requires the official V3 endpoint');return u.origin}
  if(u.pathname.replace(/\/$/,'')!=='/v1')throw Error('Cloud voice endpoint must use /v1')
  return u.origin+'/v1'
}
export function customCloneId(id){if(typeof id!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{6,254}[A-Za-z0-9]$/.test(id))throw Error('Custom voice ID must be 8–256 letters/digits/-/_, start with a letter and end with a letter/digit');return id}
export function enrollmentModelSupported(provider,model){return provider==='dashscope'?/^(?:qwen-audio-3\.[01]-tts-(?:flash|plus)|cosyvoice-v(?:2|3(?:\.5)?)-(?:flash|plus)|cosyvoice-v2)$/.test(model):provider==='siliconflow'?model==='FunAudioLLM/CosyVoice2-0.5B':provider==='doubao'?model==='seed-icl-2.0':true}
function doubaoSlot(input){
  if(!['prepaid','postpaid'].includes(input.billingMode))throw Error('Choose prepaid slot or postpaid custom voice')
  if(input.billingMode==='prepaid'){if(!/^S_[A-Za-z0-9_-]{1,100}$/.test(input.remoteId||''))throw Error('Enter the purchased S_ speaker slot ID');if(input.slotConfirmed!==true)throw Error('Confirm retraining this purchased speaker slot');return input.remoteId}
  const id=customCloneId(input.remoteId)
  if(/^(?:S_|ICL_|MIX_|DiT_|BV|wvae_|moon_|mercury_|venus_|earth_|mars_|jupiter_|saturn_|uranus_|neptune_|pluto_|umm_)/i.test(id)||/^[a-z]{2}_/.test(id)||/_(?:bigtts|bigtts_cc|tob|cs_tob|streaming)$/i.test(id))throw Error('Doubao custom voice ID uses a reserved prefix or suffix')
  return id
}
export function prepareEnrollment(provider,input,model,reference){
  const result={}
  if(provider==='dashscope'){
    if(!enrollmentModelSupported(provider,model))throw Error('This DashScope model has no implemented voice-enrollment contract')
    if(!/^[A-Za-z0-9]{1,10}$/.test(input.prefix||''))throw Error('DashScope prefix must contain 1–10 English letters/digits')
    result.prefix=input.prefix
    const languages=model.startsWith('qwen-audio-')?['zh','en','fr','de','ja','ko','ru','pt','th','id','vi','it','es','ms','fil','ar']:model==='cosyvoice-v3-plus'?['zh','en','fr','de','ja','ko','ru']:model.startsWith('cosyvoice-v3')?['zh','en','fr','de','ja','ko','ru','pt','th','id','vi']:null
    if(languages&&input.language&&!languages.includes(input.language))throw Error('Choose an ISO language supported by this DashScope enrollment model')
  }
  if(provider==='minimax')result.remoteId=customCloneId(input.remoteId||'DshVoice'+input.id.replaceAll('-',''))
  if(provider==='siliconflow'&&model!=='FunAudioLLM/CosyVoice2-0.5B')throw Error('SiliconFlow permanent cloning currently requires FunAudioLLM/CosyVoice2-0.5B')
  if(provider==='doubao'){
    if(model!=='seed-icl-2.0')throw Error('Select seed-icl-2.0 for managed Doubao cloned voices')
    const billingMode=input.billingMode,remoteId=input.remoteId||(billingMode==='postpaid'?'DshVoice'+input.id.replaceAll('-',''):'')
    result.remoteId=doubaoSlot({...input,remoteId});result.billingMode=billingMode
    if(input.language&&!Object.hasOwn({zh:0,cn:0,en:1,ja:2,es:3,id:4,pt:5,ko:8},input.language))throw Error('Select a supported Doubao ICL 2.0 language code')
  }
  if(reference){
    const seconds=reference.asset.duration
    if(!Number.isFinite(seconds))throw Error('Reference recording duration is missing')
    if(provider==='minimax'&&seconds<10)throw Error('MiniMax cloning requires at least 10 seconds of reference audio')
    if(provider==='siliconflow'&&(seconds>30||!reference.asset.transcript?.trim()||reference.asset.transcript.length>2000))throw Error('SiliconFlow requires a reference at most 30 seconds and its 1–2000 character transcript')
    if(provider==='dashscope'&&(seconds<3||seconds>30))throw Error('Use a 3–30 second recording for this DashScope enrollment flow')
    if(provider==='doubao'&&seconds>25)throw Error('Use a recording at most 25 seconds to avoid upstream prompt truncation')
  }
  return result
}
function apiError(provider,code,mutating){return Object.assign(Error(`${provider} voice API rejected the request (code ${typeof code==='number'||/^[A-Za-z0-9_.-]{1,80}$/.test(String(code))?code:'unknown'}); check the provider console`),{uncertain:mutating&&[1001,1002,1039].includes(code)})}
function fileIdValid(id){return (Number.isSafeInteger(id)&&id>0)||(typeof id==='string'&&/^[1-9]\d{0,18}$/.test(id)&&BigInt(id)<=9223372036854775807n)}
function parseResponse(raw){
  // Preserve int64 file handles exactly on runtimes without JSON reviver source.
  // Quoted strings are consumed first so their digits are never rewritten.
  return JSON.parse(raw.replace(/"(?:\\.|[^"\\])*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/g,t=>t[0]!=='"'&&/^-?\d+$/.test(t)&&!Number.isSafeInteger(Number(t))?JSON.stringify(t):t))
}
function serializeRequest(body){return JSON.stringify(body).replace(/("file_id":)"([1-9]\d{0,18})"/g,'$1$2')}
async function request(provider,url,key,{body,method='POST',signal,fetchImpl,headers={},empty=false,mutating=false}){
  signal?.throwIfAborted()
  const auth=provider==='doubao'?{'X-Api-Key':key,'X-Api-Request-Id':randomUUID()}:{authorization:'Bearer '+key}
  if(body&&!(body instanceof FormData))headers['content-type']='application/json'
  let response
  try{response=await fetchImpl(url,{method,headers:{...auth,...headers},...(body?{body:body instanceof FormData?body:serializeRequest(body)}:{}),signal,redirect:'error'})}catch{throw Object.assign(Error('Voice API response lost; check the saved record and provider console before submitting again'),{uncertain:mutating})}
  if(!response.ok){await response.body?.cancel().catch(()=>{});throw Object.assign(Error(`${provider} voice API HTTP ${response.status}; check API permissions, account, region and quota`),{status:response.status,uncertain:mutating&&(response.status>=500||[408,429].includes(response.status))})}
  let data
  try{const bytes=await readAudioBody(response,signal,2*1024*1024);data=bytes.length?parseResponse(bytes.toString('utf8')):empty?{}:null;if(!data&&!(empty&&data===''))throw Error()}
  catch{throw Object.assign(Error('Unrecognized voice API response; check the provider console'),{uncertain:mutating})}
  if(provider==='minimax'&&!Number.isInteger(data.base_resp?.status_code))throw Object.assign(Error('MiniMax response has no valid API status'),{uncertain:mutating})
  if(provider==='minimax'&&data.base_resp?.status_code!==0)throw apiError(provider,data.base_resp?.status_code,mutating)
  if(provider==='dashscope'&&data.code)throw apiError(provider,data.code,mutating)
  if(provider==='doubao'&&data.code!==undefined&&![0,20000000].includes(data.code))throw apiError(provider,data.code,mutating)
  return data
}
const notFound=()=>Object.assign(Error('Voice was not found in the complete provider response'),{absent:true})
export async function enrollmentOperation({provider,action,key,input={},reference,model,cfg={},prior={},signal,fetchImpl=fetch,onCheckpoint=async()=>{}}){
  const root=enrollmentRoot(provider,cfg),mutating=!['get'].includes(action)
  const send=(path,body,extra={})=>request(provider,root+path,key,{body,signal,fetchImpl,mutating,...extra})
  if(provider==='dashscope'){
    const body={model:'voice-enrollment',input:{action:{create:'create_voice',get:'query_voice',delete:'delete_voice','replace-reference':'update_voice'}[action]}}
    if(!body.input.action)throw Error('DashScope enrollment has no remote rename operation')
    if(action==='create')Object.assign(body.input,{target_model:model,prefix:input.prefix,audio:'data:audio/wav;base64,'+reference.bytes.toString('base64'),...(input.language&&/^(?:qwen-audio-|cosyvoice-v3)/.test(model)?{language_hints:[input.language]}:{})})
    else body.input.voice_id=input.remoteId
    if(action==='replace-reference')body.input.audio='data:audio/wav;base64,'+reference.bytes.toString('base64')
    const data=await send('/services/audio/tts/customization',body)
    if(!data.output||typeof data.output!=='object')throw Object.assign(Error('DashScope response has no output'),{uncertain:mutating})
    if(action==='delete')return {remoteState:'deleted'}
    if(action==='replace-reference')return {remoteId:input.remoteId,remoteState:'training'}
    if(action==='get'&&data.output.target_model&&data.output.target_model!==model)throw Error('DashScope voice target model differs from this provider row')
    const remoteId=action==='create'?data.output.voice_id:input.remoteId
    if(typeof remoteId!=='string'||!remoteId)throw Object.assign(Error('DashScope did not return a voice ID'),{uncertain:mutating})
    return {remoteId,remoteState:({OK:'available',DEPLOYING:'training',UNDEPLOYED:'blocked'}[data.output.status]||(action==='create'?'training':'unknown'))}
  }
  if(provider==='siliconflow'){
    if(action==='create'){
      const form=new FormData();form.append('model',model);form.append('customName',input.name);form.append('text',reference.asset.transcript);form.append('file',new Blob([reference.bytes],{type:'audio/wav'}),'reference.wav')
      const data=await send('/uploads/audio/voice',form)
      if(typeof data.uri!=='string'||!data.uri.startsWith('speech:'))throw Object.assign(Error('SiliconFlow did not return a speech: URI'),{uncertain:true})
      return {remoteId:data.uri,remoteState:'available'}
    }
    if(action==='get'){
      const data=await send('/audio/voice/list',undefined,{method:'GET'});if(!Array.isArray(data.results))throw Error('SiliconFlow returned an invalid voice list')
      const v=data.results.find(v=>v.uri===input.remoteId);if(!v)throw notFound()
      if(v.model!==model)throw Error('SiliconFlow voice belongs to another model')
      return {remoteId:v.uri,remoteState:'available'}
    }
    if(action==='delete'){await send('/audio/voice/deletions',{uri:input.remoteId},{empty:true});return {remoteState:'deleted'}}
    throw Error('SiliconFlow has no implemented remote rename operation')
  }
  if(provider==='minimax'){
    if(action==='create'){
      let fileId=prior.uploadFileId
      if(!fileId){
        const form=new FormData();form.append('purpose','voice_clone');form.append('file',new Blob([reference.bytes],{type:'audio/wav'}),'reference.wav')
        const upload=await send('/files/upload',form)
        fileId=upload.file?.file_id
        if(!fileIdValid(fileId))throw Object.assign(Error('MiniMax upload file ID is missing or invalid'),{uncertain:true})
        // Save the upload handle before clone. A failed clone must not hide an
        // uploaded recording or cause automatic re-upload on retry.
        await onCheckpoint({uploadFileId:fileId,uploadState:'uploaded'})
      }
      const data=await send('/voice_clone',{file_id:fileId,voice_id:input.remoteId})
      if(data.input_sensitive===true||Number(data.input_sensitive?.type)>0||Number(data.input_sensitive_type)>0)throw Error('MiniMax rejected the reference recording')
      return {remoteId:input.remoteId,remoteState:'available',creationConfirmed:true,activation:'pending',expiresAt:new Date(Date.now()+7*86400000).toISOString()}
    }
    if(action==='get'){
      const data=await send('/get_voice',{voice_type:'voice_cloning'})
      if(!Array.isArray(data.voice_cloning))throw Error('MiniMax returned an invalid cloned-voice list')
      if(data.voice_cloning.some(v=>v.voice_id===input.remoteId))return {remoteId:input.remoteId,remoteState:'available',activation:'active',expiresAt:null}
      // The documented list excludes never-activated clones. Absence is not
      // proof of deletion and must not silently trigger billable activation.
      return {remoteId:input.remoteId,remoteState:prior.creationConfirmed&&Date.parse(prior.expiresAt)>Date.now()?'available':'unknown',activation:prior.creationConfirmed&&Date.parse(prior.expiresAt)>Date.now()?'pending':'unlisted'}
    }
    if(action==='delete'){const data=await send('/delete_voice',{voice_type:'voice_cloning',voice_id:input.remoteId});if(data.voice_id&&data.voice_id!==input.remoteId)throw Object.assign(Error('MiniMax deletion returned a different voice ID'),{uncertain:true});return {remoteState:'deleted',activation:null}}
    if(action==='delete-upload'){await send('/files/delete',{file_id:prior.uploadFileId,purpose:'voice_clone'});return {uploadState:'deleted',uploadFileId:null}}
    throw Error('MiniMax has no implemented remote rename operation')
  }
  if(provider==='doubao'){
    if(!['create','get','upgrade','replace-reference'].includes(action))throw Error('Doubao V3 has no implemented remote delete/rename operation; use its console')
    const postpaid=(input.billingMode||prior.billingMode)==='postpaid'
    const body=postpaid?{speaker_id:'custom_speaker_id',custom_speaker_id:input.remoteId}:{speaker_id:input.remoteId}
    if(['create','replace-reference'].includes(action))Object.assign(body,{audio:{data:reference.bytes.toString('base64'),format:'wav'},...(reference.asset.transcript?{text:reference.asset.transcript}:{}),...(input.language?{language:({zh:0,cn:0,en:1,ja:2,es:3,id:4,pt:5,ko:8})[input.language]}:{})})
    if(['create','replace-reference'].includes(action)&&input.language&&!Object.hasOwn({zh:0,cn:0,en:1,ja:2,es:3,id:4,pt:5,ko:8},input.language))throw Error('Select a supported Doubao ICL 2.0 language code')
    const data=await send('/api/v3/tts/'+({create:'voice_clone',get:'get_voice',upgrade:'upgrade_voice','replace-reference':'voice_clone'}[action]),body)
    if(data.speaker_id&&data.speaker_id!==input.remoteId)throw Object.assign(Error('Doubao returned a different speaker ID'),{uncertain:mutating})
    const types=Array.isArray(data.speaker_status)?data.speaker_status.map(s=>s.model_type).filter(Number.isInteger):[]
    let state=({0:'untrained',1:'training',2:'available',3:'failed',4:'available'})[data.status]||'unknown'
    if(state==='available'&&!types.some(t=>t===4||t===5))state='upgrade-required'
    return {remoteId:input.remoteId,remoteState:state,billingMode:postpaid?'postpaid':'prepaid',...(Number.isInteger(data.available_training_times)?{availableTrainingTimes:data.available_training_times}:{}),modelTypes:types,activation:postpaid?(data.status===4?'active':'pending'):null,...(postpaid&&action==='create'?{expiresAt:new Date(Date.now()+7*86400000).toISOString()}:{}),...(postpaid&&data.status===4?{expiresAt:null}:{})}
  }
  throw Error('Unknown enrollment provider')
}
