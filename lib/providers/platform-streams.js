import { randomUUID } from 'node:crypto'
import { encode, decode } from '@msgpack/msgpack'
import { jsonEvents, audioCollector, timingCollector, socketSession, sendTextChunks } from './streaming.js'

export async function streamFish({body,headers,options,req,fetchImpl,signal,WebSocketImpl,cfg}){
 const format=body.format,rate=body.sample_rate||(format==='opus'?48000:44100)
 if(!['mp3','pcm','opus'].includes(format))throw Error('Fish streaming requires MP3, PCM or Opus')
 if(options.timestamps&&options.transport==='http')throw Error('Fish timestamps require SSE or WebSocket transport')
 const audio=audioCollector('fish',format,rate,req.onAudioChunk),timing=timingCollector('fish')
 const align=p=>{if(p.alignment){if(!Number.isInteger(p.chunk_seq)||!Number.isFinite(p.chunk_audio_offset_sec))throw Error('Invalid Fish timestamp offsets');timing.set('chunk-'+p.chunk_seq,p.alignment.segments,'word',p.chunk_audio_offset_sec)}}
 if(options.transport==='websocket'){
  let sentAll=false
  return socketSession({provider:'Fish Audio',url:'wss://api.fish.audio/v1/tts/live'+(options.timestamps?'/with-timestamp':''),headers,signal,timeoutMs:cfg.timeoutMs,WebSocketImpl,encode:v=>Buffer.from(encode(v)),decode:raw=>decode(raw),
   onOpen:async api=>{api.send({event:'start',request:{...body,text:''}});await sendTextChunks(req,text=>api.send({event:'text',text}),api.signal);if(!api.closed){sentAll=true;api.send({event:'close'})}},
   onMessage:(p,api)=>{if(p.event==='error'||p.event==='finish'&&p.reason!=='stop')throw Error('Fish Audio streaming synthesis failed');if(p.event==='audio'){audio.add(p.audio,{base64:false});align(p)}if(p.event==='finish'){if(!sentAll)throw Error('Fish completed before input finished');api.complete({...audio.result(),...(options.timestamps?{timing:timing.result()}:{})})}},
   onCancel:send=>send({event:'close'}),
  })
 }
 const response=await fetchImpl('https://api.fish.audio/v1/tts/stream/with-timestamp',{method:'POST',headers:{...headers,'content-type':'application/msgpack'},body:Buffer.from(encode(body)),signal,redirect:'error'})
 for await(const {data:p}of jsonEvents(response,signal,{sse:true})){if(p.error||p.code&&p.code!==0)throw Error('Fish Audio timestamp stream failed');if(p.audio_base64)audio.add(p.audio_base64);align(p)}
 return {...audio.result(),timing:timing.result()}
}

export async function streamCartesia({body,headers,options,req,fetchImpl,signal,WebSocketImpl,cfg}){
 if(options.format&&!['wav','pcm'].includes(options.format))throw Error('Cartesia SSE/WebSocket requires PCM or WAV output')
 const id=randomUUID(),rate=body.output_format.sample_rate,audio=audioCollector('cartesia','pcm',rate,req.onAudioChunk),timing=timingCollector('cartesia');let seq=0,done=false
 const request={...body,context_id:id,output_format:{container:'raw',encoding:'pcm_s16le',sample_rate:rate},add_timestamps:!!options.timestamps,add_phoneme_timestamps:!!options.phonemes}
 const consume=p=>{
  if(p.context_id&&p.context_id!==id)throw Error('Cartesia context mismatch')
  if(p.type==='error'||p.status_code>=400)throw Error('Cartesia streaming synthesis failed')
  if(done&&p.type==='chunk')throw Error('Cartesia audio after completion')
  if(p.type==='chunk')audio.add(p.data)
  if(p.word_timestamps){const t=p.word_timestamps;timing.arrays('word-'+seq++,t.words,t.start,t.end)}
  if(p.phoneme_timestamps){const t=p.phoneme_timestamps;timing.arrays('phoneme-'+seq++,t.phonemes,t.start,t.end,'phoneme')}
  if(p.type==='done')done=true
 }
 const result=()=>({...audio.result(),...((options.timestamps||options.phonemes)?{timing:timing.result()}:{})})
 if(options.transport==='websocket'){
  let finishedInput=false
  return socketSession({provider:'Cartesia',url:'wss://api.cartesia.ai/tts/websocket',headers:{...headers,'X-API-Key':headers.authorization.replace(/^Bearer /,'')},signal,timeoutMs:cfg.timeoutMs,WebSocketImpl,
   onOpen:async api=>{await sendTextChunks(req,text=>api.send({...request,transcript:text,continue:true}),api.signal);if(!api.closed){finishedInput=true;api.send({...request,transcript:'',continue:false})}},
   onMessage:(p,api)=>{consume(p);if(done){if(!finishedInput)throw Error('Cartesia completed before input finished');api.complete(result())}},onCancel:send=>send({context_id:id,cancel:true}),
  })
 }
 const response=await fetchImpl('https://api.cartesia.ai/tts/sse',{method:'POST',headers,body:JSON.stringify(request),signal,redirect:'error'})
 for await(const {data}of jsonEvents(response,signal,{sse:true}))consume(data)
 if(!done)throw Error('Cartesia stream ended before done');return result()
}

export function inworldTiming(timing,info,id,offset=0){
 if(!info)return
 const w=info.wordAlignment,c=info.characterAlignment,v=info.lipsyncAlignment
 if(w)timing.arrays(id+'-word',w.words,w.wordStartTimeSeconds,w.wordEndTimeSeconds,'word',offset)
 if(c)timing.arrays(id+'-char',c.characters,c.characterStartTimeSeconds,c.characterEndTimeSeconds,'character',offset)
 if(v)timing.arrays(id+'-viseme',v.visemes,v.visemeStartTimeSeconds,v.visemeEndTimeSeconds,'viseme',offset)
}
export async function streamInworld({body,headers,options,req,fetchImpl,signal,WebSocketImpl,cfg}){
 const format=options.format||'mp3',rate=options.sampleRate||24000,timing=timingCollector('inworld')
 const audio=audioCollector('inworld',options.transport==='websocket'&&format==='wav'?'pcm':format,rate,req.onAudioChunk);let seq=0,flush=0,offset=0,pcmBytes=0,lastFlushBytes=0
 const hasTiming=options.timestamps&&options.timestamps!=='none'||options.lipsync
 if(options.transport==='websocket'){
  if(hasTiming&&!['wav','pcm'].includes(format))throw Error('Inworld WebSocket alignment requires WAV/PCM to retain exact flush offsets')
  if(req.dialogue)throw Error('Inworld script dialogue uses HTTP or HTTP streaming, not a single WebSocket context')
  const id=randomUUID();let started=false,sentAll=false
  return socketSession({provider:'Inworld',url:'wss://api.inworld.ai/tts/v1/voice:streamBidirectional',headers,signal,timeoutMs:cfg.timeoutMs,WebSocketImpl,
   onOpen:api=>{const create={...body,text:undefined,voiceId:body.voiceId,autoMode:true,autoModeStrategy:options.autoMode||'SENTENCE_BOUNDARY',timestampTransportStrategy:'ASYNC',...(format==='wav'?{audioConfig:{...body.audioConfig,audioEncoding:'PCM'}}:{})};api.send({create,contextId:id})},
   onMessage:(packet,api)=>{
    const p=packet.result;if(!p||p.contextId!==id||p.status?.code)throw Error('Inworld context failed or mismatched')
    if(p.contextCreated){if(started)throw Error('Duplicate Inworld context');started=true;sendTextChunks(req,text=>api.send({send_text:{text},contextId:id}),api.signal).then(()=>{if(!api.closed){sentAll=true;api.send({close_context:{},contextId:id})}}).catch(api.fail)}
    if(p.audioChunk){const part=p.audioChunk;if(part.audioContent){const bytes=Buffer.from(part.audioContent,'base64');pcmBytes+=bytes.length;audio.add(part.audioContent)}inworldTiming(timing,part.timestampInfo,'flush-'+flush+'-'+seq++,offset)}
    if(p.flushCompleted){if(hasTiming){offset+=(pcmBytes-lastFlushBytes)/2/rate;lastFlushBytes=pcmBytes}flush++}
    if(p.contextClosed){if(!sentAll)throw Error('Inworld context closed before text completion');let out=audio.result();if(format==='wav')out={...out,mime:'audio/wav'};api.complete({...out,...(hasTiming?{timing:timing.result()}:{})})}
   },onCancel:send=>send({cancel_context:{},contextId:id}),
  })
 }
 const response=await fetchImpl('https://api.inworld.ai/tts/v1/voice:stream',{method:'POST',headers,body:JSON.stringify(body),signal,redirect:'error'})
 for await(const {data}of jsonEvents(response,signal)){
  if(data.error||!data.result||data.result.status?.code)throw Error('Inworld HTTP stream failed')
  const p=data.result;if(p.audioContent)audio.add(p.audioContent,{independentWav:format==='wav'})
  inworldTiming(timing,p.timestampInfo,'part-'+seq++)
 }
 return {...audio.result(),...(hasTiming?{timing:timing.result()}:{})}
}
