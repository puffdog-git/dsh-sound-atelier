export const VOICE_PROVIDER_ID='external:dsh-voice'
export function wavSeconds(audio){
 const b=Buffer.from(audio)
 if(b.length<44||b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WAVE')throw Error('外部 STT 需要 PCM WAV')
 let rate=0,size=0
 for(let at=12;at+8<=b.length;){const n=b.readUInt32LE(at+4),tag=b.toString('ascii',at,at+4)
  // FFmpeg pipe WAV uses an unknown-length terminal data chunk.
  if(tag==='data'&&n===0xffffffff){size+=b.length-at-8;break}
  if(n>b.length-at-8)throw Error('WAV 音訊不完整')
  if(tag==='fmt '){if(n<16||b.readUInt16LE(at+8)!==1)throw Error('外部 STT 需要 PCM WAV');rate=b.readUInt32LE(at+16)}
  if(tag==='data')size+=n
  at+=8+n+(n%2)
 }
 const seconds=size/rate;if(!Number.isFinite(seconds)||seconds<=0||seconds>120)throw Error('外部 STT 音訊須為 120 秒內 PCM WAV')
 return seconds
}
export function createVoiceProvider({origin,fetchImpl=fetch}){
 async function call(endpoint,payload,signal){
  const base=new URL(origin())
  if(!['127.0.0.1','localhost','[::1]'].includes(base.hostname))throw Error('dsh-voice 必須使用本機 DSH 接口')
  const response=await fetchImpl(new URL('/dsh-voice/'+endpoint,base),{method:payload?'POST':'GET',headers:{origin:base.origin,...(payload?{'content-type':'application/json'}:{})},...(payload?{body:JSON.stringify(payload)}:{}),signal,redirect:'error'})
  if(!response.ok)throw Error('外部 dsh-voice 不可用（HTTP '+response.status+'）；請先啟用並設定該插件')
  const result=await response.json();if(!result.ok)throw Error('外部 dsh-voice 辨識失敗；請檢查該插件的服務設定')
  return result
 }
 return {
  info:{id:VOICE_PROVIDER_ID,name:'dsh-voice（外部插件；依其設定可能使用雲端）',location:'cloud',languages:['auto','zh','en','ja','ko','de','fr','es','ru']},
  async transcribe({audio,language},signal){
   signal.throwIfAborted()
   if(!(audio instanceof Uint8Array)||!audio.length||audio.length>4*1024*1024)throw Error('外部 STT 音訊上限 4 MiB')
   const audioSeconds=wavSeconds(audio)
   const status=await call('status',null,signal),mode=status.modes?.dictation
   if(!mode?.chain?.length)throw Error('請先設定 dsh-voice 的聽寫辨識鏈')
   if(language&&language!=='auto'&&mode.language&&mode.language!==language&&mode.language!=='auto')throw Error('辨識語言與 dsh-voice 設定不同，請在 dsh-voice 調整聽寫語言')
   // Use its configured dictation chain: no session commands.
   // Verbatim disables LLM polishing. Return rawText before macros/actions.
   const result=await call('transcribe',{dataBase64:Buffer.from(audio).toString('base64'),mimeType:'audio/wav',mode:'dictation',subMode:'verbatim',polish:false},signal)
   signal.throwIfAborted()
   if(typeof result.rawText!=='string')throw Error('dsh-voice 版本未提供原始逐字稿，請更新插件')
   return {text:result.rawText,audioSeconds,inferenceSeconds:Math.max(0,Number(result.tookMs)||0)/1000}
  }
 }
}
