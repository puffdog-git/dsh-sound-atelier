import fs from 'node:fs/promises'
import path from 'node:path'
import {randomUUID} from 'node:crypto'
import {failureReason} from './diagnostics.js'

export const CHANNELS={onebot:'qq_send_voice',qqbot:'send_media',im:'dsh_im_return_file'}
export function chooseChannel(tools,agent,requested='auto') {
 let available=Object.entries(CHANNELS).filter(([,name])=>tools.executable(name,agent))
 if(requested!=='auto'){
  if(!available.some(([id])=>id===requested))throw Error('目前會話沒有此通訊插件的語音交付工具')
  return requested
 }
 // dsh-im exposes its artifact tool globally; a scoped native channel wins.
 if(available.some(([id])=>id!=='im'))available=available.filter(([id])=>id!=='im')
 if(available.length!==1)throw Error(available.length?'目前會話有多個通訊出口，請指定 channel':'請在 OneBot、QQBot 或 dsh-im 的正式會話使用此工具')
 return available[0][0]
}
export async function dispatch(tools,name,args,exec){
 exec.signal.throwIfAborted()
 const batch=await tools.execute({agent:exec.agent,signal:exec.signal,calls:[{type:'tool-call',id:randomUUID(),name,arguments:JSON.stringify(args)}]})
 const result=batch.results?.[0]?.result
 if(!result||result.isError)throw Object.assign(Error(result?.error?.message||'交付工具未完成；不會自動重送'),{code:result?.error?.code||result?.error?.info?.code})
 const value=result.value
 if(value?.ok===false||value?.sent===false)throw Error(value.msg||value.error||'通訊插件拒絕交付')
 return value
}
export function createBridge({tools,tts,enabled=()=>true,onEvent=()=>{}}){
 const pending=new Map(),controllers=new Set();let closed=false
 const emit=event=>{try{onEvent(event)}catch{}}
 async function run(args,exec,id){
  if(closed||!enabled())throw Error('通訊語音橋接已停用')
  if(!exec?.agent?.session||!exec.signal)throw Error('需要真實 Agent 會話')
  const text=String(args.text||'').trim();if(!text||text.length>10000)throw Error('配音文字須為 1–10000 字')
  if(args.instruction!==undefined&&(typeof args.instruction!=='string'||args.instruction.length>4000))throw Error('語氣提示上限 4000 字')
  const channel=chooseChannel(tools,exec.agent,args.channel||'auto'),name=CHANNELS[channel]
  const sid=exec.agent.session.id||exec.agent.session.header?.id
  if(!sid)throw Error('會話缺少識別碼')
  if(pending.has(sid))throw Error('此會話已有語音交付工作，請勿重複送出')
  const controller=new AbortController(),signal=AbortSignal.any([exec.signal,controller.signal,AbortSignal.timeout(180000)])
  pending.set(sid,controller);controllers.add(controller)
  let artifact,dir
  try{
   signal.throwIfAborted()
   emit({id,channel,state:'generating',stage:'synthesis'})
   try{artifact=await tts.exportAudio({text,format:'mp3',sessionId:sid,signal,speechInstruction:args.instruction})}catch(error){error.safeStage='synthesis';throw error}
   if(artifact.size>4*1024*1024)throw Error('音訊超過橋接 4 MiB 上限，請縮短文字')
   let file=artifact.path
   if(channel==='onebot'){
    const cwd=exec.agent.session.header?.cwd
    if(!cwd||!path.isAbsolute(cwd))throw Error('OneBot 會話沒有可用的工作區；不會改用其他目錄')
    const root=await fs.realpath(cwd)
    dir=await fs.mkdtemp(path.join(root,'.dsh-speech-'))
    file=path.join(dir,'reply.mp3');await fs.copyFile(artifact.path,file)
   }
   signal.throwIfAborted()
   if(closed||!enabled()||tools.executable(name,exec.agent)===undefined)throw Error('交付前插件或權限已變更')
   const voiceCapable=channel==='im'&&!!tools.executable(name,exec.agent)?.parameters?.properties?.presentation
   const payload=channel==='qqbot'?{kind:'voice',source:file}:{path:file,...(voiceCapable?{presentation:'voice'}:{})}
   const receipt=await dispatch(tools,name,payload,{...exec,signal})
   emit({id,artifactId:receipt?.artifactId,channel,state:channel==='im'?'queued':'sent',stage:'delivery'})
   return {ok:true,channel,state:channel==='im'?'staged':'sent',nativeVoice:channel!=='im',deliveryMode:voiceCapable?'native-when-supported':channel==='im'?'audio-attachment':'native-voice',receipt:receipt??null}
  }finally{
   pending.delete(sid);controllers.delete(controller)
   try{if(dir)await fs.rm(dir,{recursive:true,force:true})}finally{await artifact?.remove()}
  }
 }
 async function send(args,exec){const id=randomUUID();try{return await run(args,exec,id)}catch(error){const reason=failureReason(error,error.safeStage||'delivery');emit({id,channel:args.channel||'auto',state:reason.code==='cancelled'?'cancelled':reason.code==='unknown'?'unknown':'failed',code:reason.code,stage:error.safeStage||'delivery'});throw error}}
 return {send,close(){closed=true;for(const c of controllers)c.abort()}}
}
