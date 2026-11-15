import { DEFAULT_MODELS, DEFAULT_VOICES, PROVIDER_KEYS } from './providers/constants.js'
import { DEEPINFRA_SCHEMAS } from './providers/deepinfra-schemas.js'

// Capabilities describe this adapter, not every upstream feature. Voice asset
// create/train/delete remains in the separate voice-management lifecycle.
export function providerCapabilities(provider, model=DEFAULT_MODELS[provider]||'',voice=DEFAULT_VOICES[provider]||'',transport=''){
 const base={provider,model,voice,transports:['http'],formats:['mp3','wav'],ssml:false,timestamps:[],nativeDialogue:false,liveInput:false,reference:false,dictionary:false,asyncJobs:false,controls:[],notes:[]}
 if(provider==='local-tts')Object.assign(base,{formats:['wav'],reference:true,notes:['本機模型由獨立服務載入；參考錄音不等於訓練模型。各模型專屬控制依本機服務設定驗證。']})
 if(provider==='kokoro')Object.assign(base,{formats:['wav'],notes:['隔離的 Kokoro JS CPU runtime；目前此路徑僅英文。中文請使用 Xinference 的相應模型或其他服務。']})
 if(provider==='f5')Object.assign(base,{formats:['wav'],reference:true,notes:['F5 透過本機 Xinference 推理；需要參考錄音與逐字稿。下載權重不等於服務可用。']})
 if(provider==='doubao'&&model!=='seed-tts-1.0')Object.assign(base,{transports:['http','websocket'],formats:['mp3','pcm'],timestamps:['word'],liveInput:true,controls:['transport','timestamps','format'],notes:['時間戳可用性取決於語言及服務回應。']})
 if(provider==='deepinfra'){
  const schema=DEEPINFRA_SCHEMAS[model]
  base.formats=['mp3','wav','pcm','flac','opus'];base.controls=['format','pcmSampleRate']
  if(schema){base.nativeSchema=schema;base.formats=(schema.properties.output_format||schema.properties.response_format)?.enum||base.formats; base.controls.push('native');base.timestamps=model==='hexgrad/Kokoro-82M'?['word']:[];if(base.timestamps.length)base.controls.push('timestamps');base.notes.push(model.startsWith('ResembleAI/')?'需先建立並選擇 DeepInfra 聲音 ID；聲音管理屬第三步。':'此模型使用原生推理參數，不沿用其他模型的欄位。')}
  else if(/^Qwen\/Qwen3-TTS/.test(model))base.controls.push('language')
 }
 if(provider==='fish')Object.assign(base,{transports:['http','sse','websocket'],formats:['mp3','wav','pcm','opus'],timestamps:['word'],nativeDialogue:{maxSpeakers:16},liveInput:true,reference:true,dictionary:true,controls:['transport','timestamps','format','sampleRate','referencePath','referenceText','referenceIds','normalize','language','latency','chunkLength','dictionary'],notes:['串流不使用 WAV 容器；PCM 需明確採樣率。多角色按選定模型／傳輸驗證。']})
 if(provider==='cartesia')Object.assign(base,{transports:['http','sse','websocket'],formats:['mp3','wav','pcm'],timestamps:['word','phoneme'],liveInput:true,dictionary:true,controls:['transport','timestamps','phonemes','format','sampleRate','language','emotion','normalization','dictionary','accent'],notes:['串流介面使用 PCM，播放器封裝為 WAV。固定情感僅英文。']})
 if(provider==='dashscope'){
  const qwen3=model.startsWith('qwen3-tts-'),cosy=model.startsWith('cosyvoice-')
  Object.assign(base,{transports:qwen3?['http','sse']:cosy?['websocket']:['http','websocket'],formats:qwen3?['wav','pcm']:['mp3','wav','pcm','opus'],ssml:!qwen3,timestamps:qwen3?[]:['word'],liveInput:!qwen3,dictionary:!qwen3,controls:['transport','format','sampleRate',...(!qwen3?['timestamps','seed','bitRate','hotFix']:[])],notes:['字詞時間戳與 SSML 僅使用支援音色的 WebSocket 介面；時間戳使用 PCM/WAV。']})
 }
 if(provider==='polly')Object.assign(base,{transports:model==='generative'?['http','stream']:['http'],formats:['mp3','wav','pcm','opus'],ssml:true,timestamps:model==='generative'?[]:['word','sentence','ssml','viseme'],liveInput:model==='generative',dictionary:true,asyncJobs:true,controls:['transport','format','sampleRate','marks','lexicons'],notes:['Speech Marks 需額外一次 API 請求，可能另計費。非同步長文需指定自己的 S3 bucket。']})
 if(provider==='inworld')Object.assign(base,{transports:['http','stream','websocket'],formats:['mp3','wav','pcm','opus'],timestamps:['word','character','viseme'],nativeDialogue:model==='inworld-tts-2'?{maxSpeakers:16}:false,liveInput:true,dictionary:model==='inworld-tts-2',asyncJobs:true,controls:['transport','format','sampleRate','timestamps','lipsync','language','deliveryMode','normalization','dictionaries','customPronunciation','autoMode','context'],notes:['TTS-2 的 temperature 不生效，請使用 deliveryMode。WebSocket 對齊需 PCM/WAV。']})
 if(provider==='google-cloud'){
  const chirp=/Chirp3-HD/i.test(voice),gemini=/^gemini-.*tts/.test(model)
  Object.assign(base,{transports:chirp||gemini?['http','stream']:['http'],formats:['mp3','wav','opus'],ssml:!gemini,timestamps:!gemini?['ssml']:[],nativeDialogue:gemini?{maxSpeakers:2}:/Studio-MultiSpeaker/.test(voice)?{maxSpeakers:2}:false,liveInput:chirp||gemini,dictionary:true,controls:['transport','format','sampleRate','auth','language','pronunciations',...(!gemini?['timestamps']:[]),...(chirp?['inputMode','speed']:[])],notes:['Chirp 3 HD 同步 SSML／語速為預覽能力；串流不接受 SSML。SSML 時間點是明確的 mark，不是逐字對齊。']})
 }
 if(provider==='google')base.nativeDialogue={maxSpeakers:2}
 if(provider==='elevenlabs')base.notes.push('保留既有音色設定與語氣標籤；不把單人接口宣稱為原生多人對話。')
 if(provider==='azure')base.ssml=true
 if(provider==='openai'&&/^gpt-realtime/.test(model)){base.transports=['websocket'];base.liveInput=false}
 if(provider==='polly'&&model==='generative')base.controls=base.controls.filter(c=>c!=='marks')
 if(transport&&!base.transports.includes(transport))base.notes.push('目前儲存的傳輸方式不適用此模型，請重新選擇。')
 if(provider==='fish'&&['sse','websocket'].includes(transport))base.formats=base.formats.filter(f=>f!=='wav')
 if(provider==='cartesia'&&['sse','websocket'].includes(transport))base.formats=['wav','pcm']
 if(provider==='dashscope'&&transport==='websocket')base.formats=['mp3','wav','pcm']
 if(provider==='google-cloud'&&transport==='stream'){base.formats=['wav','opus'];base.ssml=false;base.timestamps=[];base.controls=base.controls.filter(c=>c!=='timestamps')}
 if(provider==='inworld')base.notes.push('自然語言 steering 僅 TTS-2，提示必須用英文；TTS-2 Flash 的 steering 不生效。')
 if(!PROVIDER_KEYS.includes(provider))throw Error('Unknown TTS provider')
 return base
}
