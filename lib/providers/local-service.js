import { boundedJson, binaryAudio } from './native-http.js'
import { speechInstruction } from './controls.js'
import {localManagementFetch} from './local-http.js'
import {localLaunchProfile} from '../local-launch-profile.js'

export const LOCAL_FAMILIES=['kokoro','f5','qwen3','index2','index2.5','breeze','fish','irodori','cosyvoice','dots','gpt-sovits','generic']
export function localRoot(cfg){
  const url=new URL(cfg.localTtsBaseUrl||'http://127.0.0.1:9997')
  if(!['http:','https:'].includes(url.protocol)||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.username||url.password||url.search||url.hash)throw Error('Local TTS service must use a loopback URL without embedded credentials')
  return url.href.replace(/\/+$/,'').replace(/\/v1$/,'')
}
export function localFamily(model){
 const s=String(model).toLowerCase()
 return /indextts.*2\.5/.test(s)?'index2.5':/indextts/.test(s)?'index2':s.includes('qwen3')?'qwen3':s.includes('breeze')?'breeze':s.includes('fish')?'fish':s.includes('irodori')?'irodori':s.includes('f5')?'f5':s.includes('kokoro')?'kokoro':s.includes('cosyvoice')?'cosyvoice':'generic'
}
const allowed={kokoro:[],f5:['seed'],qwen3:['language','seed'],index2:['emo_alpha','emo_vector','emo_text','use_emo_text','use_random','seed'], 'index2.5':['language','emo_alpha','emo_vector','emo_text','use_emo_text','use_random','seed'],breeze:['cfg_scale','seed','speaker'],fish:['seed','temperature','top_p','repetition_penalty','normalize','max_new_tokens','chunk_length','reference_id'],irodori:['caption','seed','num_steps','cfg_scale','cfg_scale_text','cfg_scale_caption','cfg_scale_speaker','num_candidates','seconds','duration_scale'],cosyvoice:['seed'],generic:[]}
export function localOptions(cfg,model){
 const options=JSON.parse(cfg.providerOptions||'{}')['local-tts']||{}
 if(!options||Array.isArray(options)||Object.keys(options).some(k=>!['family','speed','native'].includes(k)))throw Error('Invalid local TTS controls')
 const family=cfg.localTtsBackend==='gpt-sovits'?'gpt-sovits':cfg.localTtsBackend==='dots-native'?'dots':options.family||cfg.localTtsFamily||localFamily(model)
 if(!LOCAL_FAMILIES.includes(family))throw Error('Unknown local model family')
 const speed=options.speed??1
 if(!Number.isFinite(speed)||speed<.5||speed>2||['breeze','fish','irodori','qwen3','index2','dots'].includes(family)&&speed!==1)throw Error('Selected local model does not support this synthesis speed')
 const native=options.native||{}
 const keys=family==='dots'?['seed','language','speaker_scale','num_steps','guidance_scale','ode_method','normalize_text']:family==='gpt-sovits'?['seed','top_k','top_p','temperature','text_split_method','batch_size','batch_threshold','split_bucket','fragment_interval','parallel_infer','use_cuda_graph','repetition_penalty','sample_steps','cfg_rate','super_sampling','cache_dit','dbcache_fn','dbcache_threshold','dbcache_warmup','dbcache_downsample']:[...(allowed[family]||[]),...(cfg.localTtsBackend==='index-native'?['top_k','top_p','temperature','num_beams','repetition_penalty','length_penalty','max_mel_tokens']:[])]
 if(!native||Array.isArray(native)||Object.keys(native).some(k=>!keys.includes(k))||JSON.stringify(native).length>16000)throw Error('Unsupported native controls for the selected local model')
 for(const[k,v]of Object.entries(native)){
  if(['seed','num_steps','max_new_tokens','chunk_length','num_candidates','top_k','num_beams','max_mel_tokens','batch_size','sample_steps','dbcache_fn','dbcache_warmup','dbcache_downsample'].includes(k)&&(!Number.isInteger(v)||v<(k==='seed'?-1:0)||v>2147483647))throw Error('Invalid local '+k)
  if(['cfg_scale','cfg_scale_text','cfg_scale_caption','cfg_scale_speaker','temperature','top_p','repetition_penalty','seconds','duration_scale','emo_alpha','guidance_scale','speaker_scale','length_penalty','fragment_interval','batch_threshold','cfg_rate','dbcache_threshold'].includes(k)&&(!Number.isFinite(v)||v<0||v>100))throw Error('Invalid local '+k)
  if(['top_p','emo_alpha','batch_threshold','dbcache_threshold'].includes(k)&&v>1)throw Error('Invalid local '+k)
  if(['use_emo_text','use_random','normalize','normalize_text','split_bucket','parallel_infer','use_cuda_graph','super_sampling'].includes(k)&&typeof v!=='boolean')throw Error('Invalid local '+k)
  if(['caption','emo_text','speaker','reference_id','language'].includes(k)&&(typeof v!=='string'||v.length>2000))throw Error('Invalid local '+k)
  if(k==='emo_vector'&&(!Array.isArray(v)||v.length!==8||v.some(n=>!Number.isFinite(n)||n<0||n>1)))throw Error('Index emotion vector requires eight values in 0–1')
  if(k==='text_split_method'&&!['cut0','cut1','cut2','cut3','cut4','cut5'].includes(v)||k==='cache_dit'&&!['off','auto','f4','f8','f16'].includes(v)||k==='ode_method'&&!['euler','midpoint','rk4','heun','scm'].includes(v))throw Error('Unsupported local '+k)
 }

 const integerLimits={num_steps:[1,200],num_candidates:[1,16],max_new_tokens:[1,16384],chunk_length:[1,10000],top_k:[1,200],num_beams:[1,8],max_mel_tokens:[1,8192],batch_size:[1,64],sample_steps:[1,200],dbcache_fn:[0,100],dbcache_warmup:[0,200],dbcache_downsample:[1,100]}
 for(const[k,[min,max]]of Object.entries(integerLimits))if(native[k]!==undefined&&(native[k]<min||native[k]>max))throw Error('Local '+k+' must be '+min+'–'+max)
 if(native.seed!==undefined&&native.seed<0&&family!=='gpt-sovits')throw Error('This native model requires a nonnegative seed')
 return {family,speed,native:{...native}}
}
export async function synthesizeLocalService({cfg,req,reference,signal,fetchImpl=fetch,key=''}){
 const root=localRoot(cfg),backend=cfg.localTtsBackend||'xinference',model=req.models?.['local-tts']||req.models?.f5||cfg.localTtsModel||(cfg.localTtsBackend==='gpt-sovits'?'GPT-SoVITS':'')
 if(!model||model.length>200)throw Error('Select a running local model UID')
 const {family,speed,native}=localOptions(cfg,model),instruction=speechInstruction(cfg,req.role,'local-tts')
 const headers=key?{authorization:'Bearer '+key}:{}
 if(backend==='gpt-sovits'){
  if(!reference)throw Error('GPT-SoVITS requires a validated reference recording')
  const promptLang=cfg.localTtsPromptLanguage||'zh',textLang=cfg.localTtsLanguage||'auto'
  if(!['zh','en','ja','ko','yue','all_zh','all_ja','all_ko','all_yue'].includes(promptLang)||!['zh','en','ja','ko','yue','auto','auto_yue','all_zh','all_ja','all_ko','all_yue'].includes(textLang))throw Error('Unsupported GPT-SoVITS language')
  if(!reference.asset.transcript)throw Error('GPT-SoVITS requires the reference transcript')
  if(instruction)throw Error('GPT-SoVITS has no free-form speech instruction parameter')
  const body={text:req.text,text_lang:textLang,ref_audio_path:reference.path,prompt_text:reference.asset.transcript,prompt_lang:promptLang,media_type:'wav',speed_factor:speed,text_split_method:'cut0',...native,streaming_mode:false}
  return binaryAudio('local-tts',await fetchImpl(root+'/tts',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify(body),signal,redirect:'error'}),signal,'wav')
 }
 if(backend!=='xinference')throw Error('Unsupported local TTS backend')
 if(['index2','index2.5','f5'].includes(family)&&!reference)throw Error('Selected model requires a validated reference recording')
 if(reference&&['kokoro','generic'].includes(family))throw Error('Selected model has no verified reference-audio contract')
 if(reference&&['f5','qwen3','breeze','fish','cosyvoice'].includes(family)&&!reference.asset.transcript)throw Error('Selected model requires the exact reference transcript')
 if(instruction){
  if(['qwen3','breeze'].includes(family))native.instruct=instruction
  else if(family==='cosyvoice')native.instruct_text=instruction
  else if(family==='irodori')native.caption=instruction
  else if(['index2','index2.5'].includes(family)){native.emo_text=instruction;native.use_emo_text=true}
  else if(family!=='fish')throw Error('Selected local model has no instruction contract')
 }
 if(reference)native.prompt_text=reference.asset.transcript
 const body={model,input:family==='fish'&&instruction?'['+instruction.replace(/[\[\]\r\n]/g,' ')+'] '+req.text:req.text,voice:req.voices?.['local-tts']||'',response_format:'wav',speed,stream:false,kwargs:JSON.stringify(native)}
 let requestBody
 if(reference){const form=new FormData();for(const[k,v]of Object.entries(body))form.set(k,String(v));form.set('prompt_speech',new Blob([reference.bytes],{type:'audio/wav'}),'reference.wav');requestBody=form}
 else{headers['content-type']='application/json';requestBody=JSON.stringify(body)}
 return binaryAudio('local-tts',await fetchImpl(root+'/v1/audio/speech',{method:'POST',headers,body:requestBody,signal,redirect:'error'}),signal,'wav')
}
export async function localServiceOperation({cfg,action,input={},signal,fetchImpl=localManagementFetch,key=''}){
 const root=localRoot(cfg),headers=key?{authorization:'Bearer '+key}:{}
 if((cfg.localTtsBackend||'xinference')!=='xinference')throw Error('Model lifecycle is managed by the configured service; only Xinference exposes these operations here')
 if(action==='list')return boundedJson('Xinference',await fetchImpl(root+'/v1/models',{headers,signal,redirect:'error'}),signal,4*1024*1024)
 if(action==='available'){
  // Xinference 內建與自行註冊的語音模型；只留下能把文字變成語音的（排除語音辨識、音樂等）。
  const rows=await boundedJson('Xinference',await fetchImpl(root+'/v1/model_registrations/audio?detailed=true',{headers,signal,redirect:'error'}),signal,4*1024*1024)
  if(!Array.isArray(rows))throw Error('Invalid local model catalog')
  const models=rows.filter(m=>typeof m?.model_name==='string'&&/^[A-Za-z0-9_.-]{1,128}$/.test(m.model_name)&&Array.isArray(m.model_ability)&&m.model_ability.includes('text2audio')).map(m=>{
   const family=localFamily(m.model_name)
   return {name:m.model_name,family,adapted:family!=='generic',cloning:m.model_ability.includes('text2audio_voice_cloning')||m.model_ability.includes('text2audio_zero_shot'),voiceDesign:m.model_ability.includes('text2audio_voice_design'),emotion:m.model_ability.includes('text2audio_emotion_control'),multilingual:m.multilingual===true,builtin:m.is_builtin!==false}
  }).sort((a,b)=>Number(b.adapted)-Number(a.adapted)||a.name.localeCompare(b.name)).slice(0,300)
  return {models}
 }
 if(action==='unload'){
  if(!/^[A-Za-z0-9_.-]{1,128}$/.test(input.uid||''))throw Error('Invalid model UID')
  const response=await fetchImpl(root+'/v1/models/'+encodeURIComponent(input.uid),{method:'DELETE',headers,signal,redirect:'error'})
  if(!response.ok){await response.body?.cancel?.();throw Error('Xinference unload HTTP '+response.status)}await response.body?.cancel?.();return {unloaded:true,weightsDeleted:false}
 }
 if(action==='launch'){
  if(!/^[A-Za-z0-9_.-]{1,128}$/.test(input.name||'')||!/^[A-Za-z0-9_.-]{1,128}$/.test(input.uid||'')||![0,1].includes(input.gpus??1))throw Error('Invalid audio model launch options')
  const body={model_name:input.name,model_uid:input.uid,model_type:'audio',model_engine:'PyTorch',n_gpu:input.gpus??1,replica:1,download_hub:'huggingface',...localLaunchProfile(input.name)}
  return boundedJson('Xinference',await fetchImpl(root+'/v1/models',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify(body),signal,redirect:'error'}),signal)
 }
 throw Error('Unknown local service operation')
}
