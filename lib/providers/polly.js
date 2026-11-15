import { PollyClient, SynthesizeSpeechCommand, DescribeVoicesCommand, StartSpeechSynthesisStreamCommand, StartSpeechSynthesisTaskCommand, GetSpeechSynthesisTaskCommand, ListSpeechSynthesisTasksCommand, ListLexiconsCommand, GetLexiconCommand, PutLexiconCommand, DeleteLexiconCommand } from '@aws-sdk/client-polly'
import { NodeHttp2Handler } from '@smithy/node-http-handler'
import { providerOptions } from './controls.js'
import { DEFAULT_MODELS, DEFAULT_VOICES } from './constants.js'
import { nativeAudio, httpError } from './native-http.js'
import { audioCollector, timingCollector } from './streaming.js'

export function pollyCredentials(key) {
  let value
  try { value = JSON.parse(key) } catch { throw Error('Amazon Polly requires credentials JSON with accessKeyId, secretAccessKey and optional sessionToken') }
  if (!value || !/^[A-Z0-9]{16,128}$/.test(value.accessKeyId || '') || typeof value.secretAccessKey !== 'string' || !/^[\x21-\x7e]{1,512}$/.test(value.secretAccessKey) || value.sessionToken !== undefined && (typeof value.sessionToken !== 'string' || !/^[\x21-\x7e]{1,16384}$/.test(value.sessionToken))) throw Error('Amazon Polly: invalid credentials JSON')
  return { accessKeyId: value.accessKeyId, secretAccessKey: value.secretAccessKey, ...(value.sessionToken ? { sessionToken: value.sessionToken } : {}) }
}
export function pollyClient(cfg, key, factory = options => new PollyClient(options)) {
  const region = cfg.pollyRegion || 'us-east-1'
  if (!/^(?:af|ap|ca|cn|eu|il|me|mx|sa|us)(?:-[a-z]+){1,3}-\d$/.test(region)) throw Error('Amazon Polly: invalid region')
  return factory({ region, credentials: pollyCredentials(key), maxAttempts: 1, ...(providerOptions(cfg,'polly').transport==='stream'?{requestHandler:new NodeHttp2Handler({requestTimeout:Number(cfg.timeoutMs)||60000})}:{}) })
}
export async function pollyCall(client, command, signal) {
  signal?.throwIfAborted()
  try { const data = await client.send(command, { abortSignal: signal }); signal?.throwIfAborted(); return data }
  catch (e) { signal?.throwIfAborted(); throw httpError('Amazon Polly', e.$metadata?.httpStatusCode || 502) }
}
export async function synthesizePolly({ cfg, req, key, signal, pollyClientFactory }) {
  const options = providerOptions(cfg, 'polly'), engine = req.models?.polly || DEFAULT_MODELS.polly
  if (!['standard', 'neural', 'long-form', 'generative'].includes(engine)) throw Error('Amazon Polly: unsupported engine')
  if ([...req.text].length > (cfg._inputType==='ssml'?6000:3000)) throw Error('Amazon Polly synchronous synthesis input exceeds its character limit')
  const format = options.format || 'mp3', rawPcm = ['pcm', 'wav'].includes(format)
  const sampleRate = options.sampleRate || (rawPcm ? 16000 : format === 'opus' ? 48000 : 24000)
  if (!(rawPcm ? [8000, 16000] : format === 'opus' ? [48000] : [8000, 16000, 22050, 24000, 44100, 48000]).includes(sampleRate)) throw Error('Amazon Polly: unsupported sampleRate for format')
  const lexicons=options.lexicons||[]
  if(!Array.isArray(lexicons)||lexicons.length>5||lexicons.some(n=>typeof n!=='string'||!/^[A-Za-z0-9]{1,20}$/.test(n)))throw Error('Amazon Polly: invalid lexicon names')
  const client = pollyClient(cfg, key, pollyClientFactory)
  const common={Engine:engine,VoiceId:req.voices?.polly||DEFAULT_VOICES.polly,OutputFormat:rawPcm?'pcm':format==='opus'?'ogg_opus':'mp3',SampleRate:String(sampleRate),...(options.language?{LanguageCode:options.language}:{}),...(lexicons.length?{LexiconNames:lexicons}:{})}
  let stream, abort
  try {
    if(options.transport==='stream'){
      if(engine!=='generative'||options.marks?.length)throw Error('Amazon Polly bidirectional streaming requires generative and does not support speech marks')
      async function* input(){let size=0;for await(const text of req.textChunks||[req.text]){signal?.throwIfAborted();size+=Buffer.byteLength(text);if(size>256*1024)throw Error('Polly streaming text exceeds size limit');yield {TextEvent:{Text:text,TextType:cfg._inputType==='ssml'?'ssml':'text'}}}yield {CloseStreamEvent:{}}}
      const data=await pollyCall(client,new StartSpeechSynthesisStreamCommand({...common,ActionStream:input()}),signal)
      const audio=audioCollector('polly',rawPcm?'pcm':format,sampleRate,req.onAudioChunk);let complete=false
      for await(const event of data.EventStream||[]){signal?.throwIfAborted();if(event.AudioEvent?.AudioChunk)audio.add(event.AudioEvent.AudioChunk,{base64:false});else if(event.StreamClosedEvent)complete=true;else if(Object.keys(event).some(k=>/Exception$/.test(k)))throw Error('Amazon Polly streaming synthesis failed')}
      if(!complete)throw Error('Amazon Polly stream ended before completion');return audio.result()
    }
    const marks=options.marks||[]
    if(!Array.isArray(marks)||marks.length>4||marks.some(m=>!['word','sentence','ssml','viseme'].includes(m))||marks.length&&engine==='generative')throw Error('Amazon Polly: speech marks unsupported for this selection')
    const data = await pollyCall(client, new SynthesizeSpeechCommand({ ...common,Text:req.text,TextType:cfg._inputType==='ssml'?'ssml':'text' }), signal)
    stream = data.AudioStream
    if (!stream) throw Error('Amazon Polly: missing audio stream')
    abort = () => stream.destroy?.()
    signal?.addEventListener('abort', abort, { once: true })
    const parts = []; let size = 0
    const chunks = stream instanceof Uint8Array ? [stream] : stream
    for await (const part of chunks) { signal?.throwIfAborted(); const bytes = Buffer.from(part); size += bytes.length; if (size > 32 * 1024 * 1024) throw Error('Amazon Polly: audio exceeds size limit'); parts.push(bytes) }
    signal?.throwIfAborted()
    const out=nativeAudio('polly', Buffer.concat(parts, size), rawPcm ? 'pcm' : format, sampleRate)
    if(marks.length){
      const data=await pollyCall(client,new SynthesizeSpeechCommand({...common,Text:req.text,TextType:cfg._inputType==='ssml'?'ssml':'text',OutputFormat:'json',SampleRate:undefined,SpeechMarkTypes:marks}),signal)
      const chunks=[];let size=0;const markStream=data.AudioStream,stop=()=>markStream?.destroy?.();signal?.addEventListener('abort',stop,{once:true});try{for await(const b of markStream instanceof Uint8Array?[markStream]:markStream||[]){signal?.throwIfAborted();size+=b.length;if(size>4*1024*1024)throw Error('Polly speech marks exceed size limit');chunks.push(Buffer.from(b))}}finally{signal?.removeEventListener('abort',stop);markStream?.destroy?.()}const json=Buffer.concat(chunks).toString('utf8')
      const values=json.trim()?json.trim().split('\n').map(s=>JSON.parse(s)):[];const timing=timingCollector('polly')
      for(const type of marks)timing.set(type,values.filter(v=>v.type===type).map(v=>({word:v.value,start:v.time/1000,end:v.time/1000})),type==='viseme'?'viseme':type==='ssml'?'mark':type)
      out.timing=timing.result()
    }
    return out
  } finally { if (abort) signal?.removeEventListener('abort', abort); stream?.destroy?.(); client.destroy?.() }
}

export async function pollyOperation({cfg,key,action,input={},signal,pollyClientFactory}){
 const client=pollyClient(cfg,key,pollyClientFactory)
 try{
  let command
  const name=input.name
  if(action.startsWith('lexicon-')&&action!=='lexicon-list'&&(!/^[A-Za-z0-9]{1,20}$/.test(name||'')))throw Error('Invalid Polly lexicon name')
  if(action==='lexicon-list')command=new ListLexiconsCommand({NextToken:input.nextToken})
  if(action==='lexicon-get')command=new GetLexiconCommand({Name:name})
  if(action==='lexicon-put'){if(typeof input.content!=='string'||input.content.length>40000||/<!DOCTYPE|<!ENTITY/i.test(input.content))throw Error('Invalid Polly lexicon content');command=new PutLexiconCommand({Name:name,Content:input.content})}
  if(action==='lexicon-delete')command=new DeleteLexiconCommand({Name:name})
  if(action==='task-list')command=new ListSpeechSynthesisTasksCommand({NextToken:input.nextToken,MaxResults:20})
  if(action==='task-get'){if(!/^[\w-]{1,128}$/.test(input.id||''))throw Error('Invalid Polly task ID');command=new GetSpeechSynthesisTaskCommand({TaskId:input.id})}
  if(action==='task-start'){
   if(typeof input.text!=='string'||!input.text.trim()||input.text.length>200000||!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(input.bucket||'')||String(input.prefix||'').length>1000)throw Error('Invalid Polly async text or S3 destination')
   command=new StartSpeechSynthesisTaskCommand({Text:input.text,TextType:input.ssml?'ssml':'text',Engine:cfg.chain?.[0]?.model||'neural',VoiceId:cfg.chain?.[0]?.voice||'Joanna',OutputFormat:'mp3',OutputS3BucketName:input.bucket,OutputS3KeyPrefix:input.prefix||undefined})
  }
  if(!command)throw Error('Unsupported Polly operation')
  const result=await pollyCall(client,command,signal);delete result.$metadata;return result
 }finally{client.destroy?.()}
}
export async function pollyVoices({ cfg, key, model, signal, pollyClientFactory }) {
  const client = pollyClient(cfg, key, pollyClientFactory), voices = []
  let token
  try {
    for (let page = 0; page < 20; page++) {
      const data = await pollyCall(client, new DescribeVoicesCommand({ Engine: model || DEFAULT_MODELS.polly, NextToken: token }), signal)
      voices.push(...(data.Voices || []).map(v => ({ id: v.Id, name: v.Name || v.Id, language: v.LanguageCode || '', gender: v.Gender || '', engines: v.SupportedEngines || [] })))
      token = data.NextToken; if (!token) return { voices, partial: false }
    }
    return { voices, partial: true }
  } finally { client.destroy?.() }
}
