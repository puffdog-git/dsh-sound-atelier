import { createHash } from 'node:crypto'
import { JWT, GoogleAuth } from 'google-auth-library'
import { TextToSpeechClient } from '@google-cloud/text-to-speech'
import { providerOptions, speechInstruction } from './controls.js'
import { audioCollector, timingCollector, sendTextChunks } from './streaming.js'
import { DEFAULT_VOICES } from './constants.js'
import { boundedJson, decodeAudio, nativeAudio } from './native-http.js'
const tokens = new Map()
export async function googleCloudHeaders(key, signal, googleAuthFactory = options => new JWT(options), adc = false, googleAdcFactory = options => new GoogleAuth(options)) {
  signal?.throwIfAborted()
  if(adc){try{const auth=googleAdcFactory({scopes:['https://www.googleapis.com/auth/cloud-platform']});const headers=await auth.getRequestHeaders();signal?.throwIfAborted();return typeof headers.entries==='function'?Object.fromEntries(headers.entries()):headers}catch{signal?.throwIfAborted();throw Error('Google Cloud TTS: Application Default Credentials unavailable')}}
  let account
  try { account = JSON.parse(key) } catch { throw Error('Google Cloud TTS requires a service-account JSON credential, not a Gemini API key') }
  if (account?.type !== 'service_account' || typeof account.client_email !== 'string' || !/^[^\s@]+@[^\s@]+\.gserviceaccount\.com$/.test(account.client_email) || typeof account.private_key !== 'string' || !account.private_key.includes('PRIVATE KEY')) throw Error('Google Cloud TTS: invalid service-account credential')
  const hash = createHash('sha256').update(key).digest('hex'), cached = tokens.get(hash)
  let token = cached?.expires > Date.now() + 60000 ? cached.token : ''
  if (!token) {
    try {
      // Only pass known fields. Never honor a token_uri from supplied JSON.
      const auth = googleAuthFactory({ email: account.client_email, key: account.private_key, scopes: ['https://www.googleapis.com/auth/cloud-platform'], transporterOptions: { timeout: 10000, signal, retry: false } })
      const result = await auth.authorize(); signal?.throwIfAborted()
      if (!result.access_token || !Number.isFinite(result.expiry_date)) throw Error('Missing token')
      token = result.access_token
      if (tokens.size >= 16) tokens.delete(tokens.keys().next().value)
      tokens.set(hash, { token, expires: result.expiry_date })
    } catch { signal?.throwIfAborted(); throw Object.assign(Error('Google Cloud TTS: service-account authorization failed; check its key, permissions and network'), { code: 'auth' }) }
  }
  return { authorization: `Bearer ${token}` }
}
export async function synthesizeGoogleCloud({ cfg, req, key, fetchImpl = fetch, signal, googleAuthFactory, googleAdcFactory, googleTtsClientFactory = options => new TextToSpeechClient(options) }) {
  const options = providerOptions(cfg, 'google-cloud'), voice = req.voices?.['google-cloud'] || DEFAULT_VOICES['google-cloud']
  if (Buffer.byteLength(req.text, 'utf8') > 5000) throw Error('Google Cloud TTS input exceeds 5000 UTF-8 bytes')
  const chirp = /Chirp3?-HD/i.test(voice)
  if (chirp && ['pitch', 'volume'].some(k => options[k] !== undefined)) throw Error('Google Cloud Chirp HD: use playback tuning for pitch and volume')
  const model=req.models?.['google-cloud']||'',gemini=/^gemini-.*tts/.test(model),multi=/Studio-MultiSpeaker/.test(voice)
  const format = options.format || (options.transport==='stream'?'wav':'mp3')
  const inputType=cfg._inputType==='ssml'?'ssml':options.inputMode==='markup'?'markup':'text'
  if(inputType==='markup'&&!chirp)throw Error('Google Cloud markup requires Chirp 3 HD')
  const body = { input: { [inputType]: req.text }, voice: { name: voice, languageCode: options.language || (gemini?'en-US':voice.split('-').slice(0, 2).join('-')), ...(model?{modelName:model}:{}) }, audioConfig: {
    audioEncoding: { mp3: 'MP3', wav: 'LINEAR16', opus: 'OGG_OPUS' }[format],
    ...(options.speed !== undefined ? { speakingRate: options.speed } : {}), ...(options.pitch !== undefined ? { pitch: options.pitch } : {}), ...(options.volume !== undefined ? { volumeGainDb: options.volume } : {}), ...(options.sampleRate !== undefined ? { sampleRateHertz: options.sampleRate } : {}),
  } }
  const prompt=speechInstruction(cfg,req.role,'google-cloud')
  if(gemini&&prompt)body.input.prompt=prompt
  if(options.pronunciations){
    if(!Array.isArray(options.pronunciations)||options.pronunciations.length>100||options.pronunciations.some(p=>typeof p.phrase!=='string'||typeof p.pronunciation!=='string'||p.phrase.length>500||p.pronunciation.length>1000||!['PHONETIC_ENCODING_IPA','PHONETIC_ENCODING_X_SAMPA','PHONETIC_ENCODING_JAPANESE_YOMIGANA','PHONETIC_ENCODING_PINYIN'].includes(p.phoneticEncoding)))throw Error('Google Cloud: invalid custom pronunciations')
    body.input.customPronunciations={pronunciations:options.pronunciations.map(({phrase,pronunciation,phoneticEncoding})=>({phrase,pronunciation,phoneticEncoding}))}
  }
  if(req.dialogue){
    if(gemini){
      if(req.dialogue.speakers.length!==2)throw Error('Google Cloud Gemini dialogue requires exactly two speakers')
      body.input.text=req.dialogue.turns.map(t=>t.speaker+': '+t.text).join('\n')
      const directions=req.dialogue.turns.map((t,i)=>t.instruction?'Turn '+(i+1)+' ('+t.speaker+'): '+t.instruction:'').filter(Boolean).join('\n')
      if(directions)body.input.prompt=[prompt,directions].filter(Boolean).join('\n')
      body.voice.name=undefined;body.voice.multiSpeakerVoiceConfig={speakerVoiceConfigs:req.dialogue.speakers.map(s=>({speakerAlias:s.id,speakerId:s.voice}))}
    }else if(multi){if(req.dialogue.speakers.length!==2)throw Error('Google Studio dialogue requires two speakers');const aliases=new Map(req.dialogue.speakers.map((s,i)=>[s.id,['O','Q'][i]]));body.input={multiSpeakerMarkup:{turns:req.dialogue.turns.map(t=>({speaker:aliases.get(t.speaker),text:t.text}))}}}
    else throw Error('Google Cloud: select a Gemini TTS model or Studio-MultiSpeaker for native dialogue')
  }
  if(options.transport==='stream'){
    if(!chirp&&!gemini)throw Error('Google Cloud streaming requires Chirp 3 HD or Gemini TTS')
    if(inputType==='ssml'||options.timestamps||['pitch','volume'].some(k=>options[k]!==undefined)||!['wav','opus'].includes(format))throw Error('Google Cloud streaming supports WAV/Opus and no SSML, marks, pitch or volume')
    let credentials
    if(options.auth!=='adc'){
      // Validate via the existing credential parser, without trusting token_uri.
      let account;try{account=JSON.parse(key)}catch{throw Error('Google Cloud streaming requires a service-account JSON credential')}
      if(account?.type!=='service_account'||!account.client_email?.endsWith('.gserviceaccount.com')||!account.private_key?.includes('PRIVATE KEY'))throw Error('Google Cloud: invalid service-account credential')
      credentials={client_email:account.client_email,private_key:account.private_key}
    }
    const client=googleTtsClientFactory({...(credentials?{credentials}:{}),apiEndpoint:'texttospeech.googleapis.com'})
    const lifecycle=new AbortController(),streamSignal=signal?AbortSignal.any([signal,lifecycle.signal]):lifecycle.signal
    const stream=client.streamingSynthesize(),audio=audioCollector('google-cloud',format==='wav'?'pcm':'opus',options.sampleRate||24000,req.onAudioChunk)
    const abort=()=>stream.cancel?.();signal?.addEventListener('abort',abort,{once:true})
    try{
      const result=new Promise((resolve,reject)=>{stream.on('data',d=>{try{if(d.audioContent?.length)audio.add(d.audioContent,{base64:false})}catch(e){stream.cancel?.();reject(e)}});stream.on('error',()=>reject(Error('Google Cloud streaming synthesis failed')));stream.on('end',()=>{try{signal?.throwIfAborted();resolve(audio.result())}catch(e){reject(e)}})})
      stream.write({streamingConfig:{voice:body.voice,streamingAudioConfig:{audioEncoding:format==='wav'?'PCM':'OGG_OPUS',...(options.sampleRate?{sampleRateHertz:options.sampleRate}:{}),...(options.speed!==undefined?{speakingRate:options.speed}:{})},...(body.input.customPronunciations?{customPronunciations:body.input.customPronunciations}:{})}})
      const inputReq=req.dialogue?{text:body.input.text}:req
      const feeding=(async()=>{await sendTextChunks(inputReq,text=>stream.write({input:{[inputType]:text,...(body.input.prompt?{prompt:body.input.prompt}:{})}}),streamSignal);stream.end()})()
      // Observe response errors while waiting for an incremental text source.
      feeding.catch(()=>stream.cancel?.());result.catch(()=>stream.cancel?.())
      return await Promise.race([result,feeding.then(()=>result)])
    }finally{lifecycle.abort();signal?.removeEventListener('abort',abort);stream.cancel?.();await client.close?.()}
  }
  if(options.timestamps){if(inputType!=='ssml')throw Error('Google Cloud timepoints require explicit SSML marks');body.enableTimePointing=['SSML_MARK']}
  if(options.lowLatency!==undefined)body.advancedVoiceOptions={lowLatencyJourneySynthesis:options.lowLatency}
  const headers = await googleCloudHeaders(key, signal, googleAuthFactory,options.auth==='adc',googleAdcFactory)
  const data = await boundedJson('Google Cloud TTS', await fetchImpl('https://texttospeech.googleapis.com/'+(options.timestamps?'v1beta1':'v1')+'/text:synthesize', { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(body), signal, redirect: 'error' }), signal)
  const out=nativeAudio('google-cloud', decodeAudio('Google Cloud TTS', data.audioContent), format)
  if(options.timestamps){const timing=timingCollector('google-cloud');timing.set('marks',data.timepoints,'mark');out.timing=timing.result()}
  return out
}
