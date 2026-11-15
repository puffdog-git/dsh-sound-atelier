import {pcmSource} from './pcm-stream.js'
import {chainCandidates} from './candidates.js'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {randomUUID} from 'node:crypto'
import {splitSentences} from './text.js'
import {convertAudio,wavDurationMs} from './audio-format.js'
export function createSpeechService({live,resolve,prepare,start,jobs,expression,onDelivered,onFailed,nativeStream,canNative=()=>false,usage}={}){
 const deliveries=new Map(),controllers=new Set(),artifacts=new Set()
 const capabilities=()=>({provider:'external:dsh-tts',formats:['wav','mp3'],extensions:{contextRouting:true,expression:true,pcmStream:true},engine:{ready:!!live().chain?.length,name:'DSH 聲音工坊',speechInstruction:true,formats:['wav','mp3'],maxTextLength:100000},providers:[]})
 async function prepareRequest(request,signal){
   let cfg=await resolve({...live()},{sessionId:request.sessionId,workspaceId:request.workspaceId,profileId:request.profileId},signal)
   if(request.provider||request.model||request.voice){const first={...cfg.chain[0]};if(request.provider&&request.provider!=='external:dsh-tts')first.provider=request.provider;if(request.model)first.model=request.model;if(request.voice)first.voice=request.voice;cfg={...cfg,chain:[first,...cfg.chain.slice(1)],roles:{...cfg.roles,reply:{}}}}
   if(request.spokenLanguage!==undefined){if(!['original','ja'].includes(request.spokenLanguage))throw Error('不支援的配音語言');cfg.spokenLanguage=request.spokenLanguage}
   if(request.spokenLanguage==='ja'&&request.sourceText){cfg._providedSpokenText=request.text;request={...request,text:request.sourceText}}
   if(request.spokenText!==undefined)cfg._providedSpokenText=request.spokenText
   if(request.speechInstruction!==undefined){if(typeof request.speechInstruction!=='string'||request.speechInstruction.length>4000)throw Error('語氣提示過長');cfg.speechInstruction=request.speechInstruction;cfg.doubaoInstruction=request.speechInstruction;cfg.mimoInstruction=request.speechInstruction;cfg.roles={...cfg.roles,reply:{...cfg.roles?.reply,instruction:request.speechInstruction}}}
   if(!request.speechInstruction&&request.speechDirection)cfg._speechDirection=request.speechDirection
   const text=await prepare(request.text,cfg,signal)
   await request.onPrepared?.({text,sourceText:cfg._speechSourceText||request.text,spokenLanguage:cfg._speechTarget||'original',voiceBinding:cfg._voiceBinding})
   return {text,cfg,sourceText:request.text}
 }
 async function synthesize(request){
  if(typeof request.text!=='string'||!request.text.trim()||request.text.length>100000)throw Error('請提供 1–100000 字的配音文字')
  if(request.format!==undefined&&!['wav','mp3'].includes(request.format))throw Error('僅支援 WAV 或 MP3 音訊')
  if(request.maxDurationMs!==undefined&&(!Number.isFinite(request.maxDurationMs)||request.maxDurationMs<=0))throw Error('音訊時長上限不正確')
  if(controllers.size>=8)throw Error('同時進行的語音工作已達上限')
  const controller=new AbortController(),signal=AbortSignal.any([controller.signal,...(request.signal?[request.signal]:[]),AbortSignal.timeout(10*60000)]);controllers.add(controller)
  try{
   const {text,cfg,sourceText}=await prepareRequest(request,signal),job=start(String(request.sessionId||''),text,cfg,'reply',undefined,{publish:false,signal})
   await job.promise;const out=await jobs.audio(job,signal),format=request.format||'wav',data=await convertAudio(out.audio,format,signal,{rate:cfg.rate??1,volume:cfg.volume??1})
   // The WAV export is PCM24k mono; measure the converted stream, not text length.
   const durationMs=format==='wav'?wavDurationMs(data):undefined
   if(request.maxDurationMs!==undefined&&(!Number.isFinite(request.maxDurationMs)||request.maxDurationMs<=0))throw Error('音訊時長上限不正確')
   if(request.maxDurationMs){const wav=format==='wav'?data:await convertAudio(data,'wav',signal);if(wavDurationMs(wav)>request.maxDurationMs)throw Error('音訊超過呼叫端允許的時長')}
   return {data,text:job.text,sourceText:cfg._speechSourceText||sourceText,spokenLanguage:cfg._speechTarget||'original',provider:'external:dsh-tts',format,contentType:format==='wav'?'audio/wav':'audio/mpeg',...(durationMs?{durationMs}:{}),voiceBinding:cfg._voiceBinding,warning:job.segments.map(s=>s?.warning).filter(Boolean).join('；')||undefined}
  }finally{controllers.delete(controller)}
 }
 async function streamPcm(request,consume){
  if(typeof consume!=='function')throw Error('PCM 串流需要音訊接收函式')
  if(typeof request.text!=='string'||!request.text.trim()||request.text.length>100000)throw Error('請提供 1–100000 字的配音文字')
  if(request.maxDurationMs!==undefined&&(!Number.isFinite(request.maxDurationMs)||request.maxDurationMs<=0))throw Error('音訊時長上限不正確')
  if(controllers.size>=8)throw Error('同時進行的語音工作已達上限')
  const controller=new AbortController(),signal=AbortSignal.any([controller.signal,...(request.signal?[request.signal]:[]),AbortSignal.timeout(10*60000)]);controllers.add(controller)
  let bytes=0,firstAudioMs=null;const began=Date.now()
  try{
   const {text,cfg}=await prepareRequest(request,signal),native=!!nativeStream&&canNative(cfg)&&(cfg.rate??1)===1&&(cfg.volume??1)===1
   const send=async pcm=>{signal.throwIfAborted();if(!pcm.length||pcm.length%2)throw Error('PCM 音訊資料不完整');bytes+=pcm.length;if(bytes>32*1024*1024||bytes/48>(request.maxDurationMs||180000))throw Error('串流音訊超過長度或大小上限');firstAudioMs??=Date.now()-began;await consume(pcm);signal.throwIfAborted()}
   if(native){for await(const pcm of nativeStream(text,cfg,signal))await send(pcm)}
   else for(const piece of splitSentences(text,160)){
    signal.throwIfAborted();const job=start(String(request.sessionId||''),piece,cfg,'reply',undefined,{publish:false,signal});await job.promise;const out=await jobs.audio(job,signal),wav=await convertAudio(out.audio,'wav',signal,{rate:cfg.rate??1,volume:cfg.volume??1})
    let found=false;for(let at=12;at+8<=wav.length;){const n=wav.readUInt32LE(at+4);if(wav.toString('ascii',at,at+4)==='data'){const pcm=wav.subarray(at+8,at+8+Math.min(n,wav.length-at-8));for(let off=0;off<pcm.length;off+=4800)await send(pcm.subarray(off,off+4800));found=true;break}at+=8+n+(n%2)}if(!found)throw Error('PCM 串流缺少音訊資料')
   }
   if(!bytes)throw Error('串流沒有產生音訊')
   return {mode:native?'native':'segmented',firstAudioMs,durationMs:bytes/48,bytes,voiceBinding:cfg._voiceBinding}
  }finally{controller.abort();controllers.delete(controller)}
 }
 async function exportAudio(request){const audio=await synthesize(request),dir=await fs.mkdtemp(path.join(os.tmpdir(),'dsh-tts-export-')),file=path.join(dir,randomUUID()+'.'+audio.format);await fs.writeFile(file,audio.data,{mode:0o600});let removed=false;const remove=async()=>{if(removed)return;removed=true;clearTimeout(timer);artifacts.delete(remove);await fs.rm(file,{force:true});await fs.rmdir(dir).catch(()=>{})},timer=setTimeout(()=>void remove(),24*3600000);timer.unref?.();artifacts.add(remove);return {path:file,size:audio.data.length,format:audio.format,contentType:audio.contentType,durationMs:audio.durationMs,remove}}
 function registerDelivery(adapter){if(!adapter||typeof adapter.send!=='function'||!['wav','mp3'].includes(adapter.format)||!adapter.id||deliveries.has(adapter.id))throw Error('語音交付適配器無效或重複');const item={adapter,enabled:true,automatic:false,active:new Set()};deliveries.set(adapter.id,item);return()=>{if(deliveries.get(adapter.id)===item){for(const j of item.active)j.controller.abort();deliveries.delete(adapter.id)}}}
 async function deliver(request,id,context){
  const item=deliveries.get(id);if(!item||!item.enabled||context?.automatic&&!item.automatic)throw Error('語音交付尚未啟用')
  const controller=new AbortController(),job={controller,automatic:!!context?.automatic},signal=AbortSignal.any([controller.signal,...[context?.signal,request.signal].filter(Boolean)]),deliveryContext={...context,signal};item.active.add(job)
  try{signal.throwIfAborted();await item.adapter.check?.(deliveryContext);signal.throwIfAborted();const audio=await synthesize({...request,sessionId:request.sessionId||context?.agent?.session?.id,format:item.adapter.format,signal});await item.adapter.check?.(deliveryContext);signal.throwIfAborted();const result=await item.adapter.send(audio,deliveryContext);onDelivered?.({agent:context?.agent,result,automatic:job.automatic});return result}
  catch(e){onFailed?.({agent:context?.agent,adapter:id,code:signal.aborted?'cancelled':'delivery-failed',automatic:job.automatic});throw e}finally{item.active.delete(job)}
 }
 return {apiVersion:1,async resolveVoice(request={}){const cfg=await resolve({...live()},request,request.signal),first=chainCandidates(cfg,'reply')[0];return {...cfg._voiceBinding,provider:first?.provider,model:first?.model,voice:first?.voice,spokenLanguage:cfg.spokenLanguage||'original',rvcEnabled:!!cfg.rvcEnabled}},usageSnapshot:usage,capabilities,synthesize,streamPcm,pcmFrames:request=>pcmSource((signal,consume)=>streamPcm({...request,signal},consume),request.signal),exportAudio,registerDelivery,hasDelivery:id=>deliveries.has(id),setDeliveryEnabled(id,enabled){const d=deliveries.get(id);if(!d)throw Error('找不到交付適配器');d.enabled=!!enabled;if(!enabled)for(const j of d.active)j.controller.abort()},isAutomaticDeliveryEnabled:id=>deliveries.get(id)?.automatic===true,setAutomaticDeliveryEnabled(id,enabled){const d=deliveries.get(id);if(!d)throw Error('找不到交付適配器');d.automatic=!!enabled;if(!enabled)for(const j of d.active)if(j.automatic)j.controller.abort()},deliver,registerPersonaAdapter:expression,async close(){for(const c of controllers)c.abort();for(const d of deliveries.values())for(const j of d.active)j.controller.abort();deliveries.clear();await Promise.allSettled([...artifacts].map(remove=>remove()))}}
}
