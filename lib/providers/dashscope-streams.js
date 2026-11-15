import { randomUUID } from 'node:crypto'
import { audioCollector, timingCollector, socketSession, sendTextChunks, jsonEvents } from './streaming.js'

export function dashscopeWebsocket({cfg,req,key,options,model,voice,root,instruction,signal,WebSocketImpl}){
 const id=randomUUID(),selectedFormat=options.format||(options.timestamps?'wav':'mp3'),format=selectedFormat==='wav'?'pcm':selectedFormat,rate=options.sampleRate||24000,timing=timingCollector('dashscope')
 if(!['pcm','mp3'].includes(format)||options.timestamps&&format!=='pcm')throw Error('DashScope inference streaming uses PCM/WAV or MP3; timestamps require PCM/WAV')
 if(options.hotFix&&model==='cosyvoice-v2')throw Error('CosyVoice v2 does not support hot_fix')
 const audio=audioCollector('dashscope',format,rate,req.onAudioChunk),ssml=cfg._inputType==='ssml'
 const parameters={text_type:'PlainText',voice,format,sample_rate:rate,...(options.speed!==undefined?{rate:options.speed}:{}),...(options.pitch!==undefined?{pitch:options.pitch}:{}),...(options.volume!==undefined?{volume:options.volume}:{}),...(options.language?{language_hints:[options.language]}:{}),...(instruction?{instruction}:{}),...(options.timestamps?{word_timestamp_enabled:true}:{}),...(ssml?{enable_ssml:true}:{}),...(options.seed!==undefined?{seed:options.seed}:{}),...(options.bitRate!==undefined?{bit_rate:options.bitRate}:{}),...(options.hotFix?{hot_fix:options.hotFix}:{})}
 let started=false,finishedInput=false,pcmBytes=0;const offsets=new Map()
 const command=(action,input={})=>({header:{action,task_id:id,streaming:'duplex'},payload:{input}})
 return socketSession({provider:'DashScope',url:root.replace('https:','wss:').replace('/api/v1','/api-ws/v1/inference'),headers:{authorization:'Bearer '+key},signal,timeoutMs:cfg.timeoutMs,WebSocketImpl,
  decode:(raw,isBinary)=>isBinary?{binary:Buffer.from(raw)}:JSON.parse(raw.toString()),
  onOpen:api=>api.send({header:{action:'run-task',task_id:id,streaming:'duplex'},payload:{task_group:'audio',task:'tts',function:'SpeechSynthesizer',model,parameters,input:{}}}),
  onMessage:(p,api)=>{
   if(p.binary){if(!started)throw Error('DashScope audio before task start');pcmBytes+=p.binary.length;audio.add(p.binary,{base64:false});return}
   if(p.header?.task_id!==id||p.header?.event==='task-failed'||p.header?.error_code)throw Error('DashScope task failed or mismatched')
   if(p.header.event==='task-started'){
    if(started)throw Error('Duplicate DashScope start');started=true
    const feed=ssml?Promise.resolve(api.send(command('continue-task',{text:req.text}))):sendTextChunks(req,text=>api.send(command('continue-task',{text})),api.signal)
    feed.then(()=>{if(!api.closed){finishedInput=true;api.send(command('finish-task'))}}).catch(api.fail)
   }
   const sentence=p.payload?.output?.sentence
   if(p.payload?.output?.type==='sentence-begin'&&sentence)offsets.set(sentence.index,pcmBytes/2/rate)
   if(sentence?.words?.length)timing.set('sentence-'+sentence.index,sentence.words.map(w=>({word:w.text,start:w.begin_time/1000,end:w.end_time/1000})), 'word',offsets.get(sentence.index)||0)
   if(p.header.event==='task-finished'){if(!finishedInput)throw Error('DashScope completed before input finished');api.complete({...audio.result(),...(options.timestamps?{timing:timing.result()}:{})})}
  },onCancel:send=>{if(started)send(command('finish-task',{directive:'cancel'}))},
 })
}

export async function dashscopeQwenHttp({cfg,req,key,options,model,voice,root,signal,fetchImpl}){
 if(req.text.length>600)throw Error('DashScope Qwen3 HTTP input exceeds 600 characters')
 if(options.timestamps||options.hotFix||options.seed!==undefined)throw Error('DashScope Qwen3 HTTP does not support the selected advanced controls')
 const body={model,input:{text:req.text,voice,...(options.language?{language_type:({zh:'Chinese',en:'English',ja:'Japanese',ko:'Korean',de:'German',fr:'French',es:'Spanish',it:'Italian',pt:'Portuguese',ru:'Russian'})[options.language]||'Auto'}:{})}}
 return {body,url:root+'/services/aigc/multimodal-generation/generation'}
}

export async function dashscopeQwenSse({body,url,req,key,options,signal,fetchImpl}){
 if(options.format&&!['wav','pcm'].includes(options.format))throw Error('DashScope Qwen3 SSE returns PCM/WAV only')
 const audio=audioCollector('dashscope','pcm',24000,req.onAudioChunk);let complete=false
 const response=await fetchImpl(url,{method:'POST',headers:{authorization:'Bearer '+key,'content-type':'application/json','X-DashScope-SSE':'enable'},body:JSON.stringify(body),signal,redirect:'error'})
 for await(const{data:p}of jsonEvents(response,signal,{sse:true})){
  if(p.code||p.status_code>=400)throw Error('DashScope SSE synthesis failed')
  if(p.output?.audio?.data)audio.add(p.output.audio.data)
  if(p.output?.finish_reason==='stop')complete=true
 }
 if(!complete)throw Error('DashScope SSE ended before completion');return audio.result()
}
