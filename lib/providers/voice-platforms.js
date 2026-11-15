import { DEFAULT_MODELS, DEFAULT_VOICES } from './constants.js'
import { providerOptions, speechInstruction } from './controls.js'
import { boundedJson, binaryAudio, decodeAudio, nativeAudio, directionTag } from './native-http.js'
import { encode } from '@msgpack/msgpack'
import { readReferenceDataUrl } from './reference-audio.js'
import { streamFish, streamCartesia, streamInworld, inworldTiming } from './platform-streams.js'
import { timingCollector } from './streaming.js'

function fishDictionaries(values){
  if(!Array.isArray(values)||values.length>3)throw Error('Fish: invalid pronunciation dictionary')
  const inline=values[0]?.items!==undefined
  for(const d of values){
    if(!d||Array.isArray(d)||(d.items!==undefined)!==inline)throw Error('Fish: cannot mix dictionary references and inline dictionaries')
    if(!inline){if(!/^[A-Za-z0-9_-]{1,128}$/.test(d.id||'')||!/^[A-Za-z0-9_-]{1,128}$/.test(d.version||'')||Object.keys(d).some(k=>!['id','version'].includes(k)))throw Error('Fish dictionary references require id and immutable version');continue}
    if(!Array.isArray(d.items)||d.items.length>5000||Object.keys(d).some(k=>k!=='items'))throw Error('Fish: invalid inline dictionary')
    for(const p of d.items)if(!p||typeof p.key!=='string'||!p.key||p.key.length>256||typeof p.value!=='string'||!p.value||p.value.length>1024||/<\||\|>/.test(p.key+p.value)||p.type!=null&&!['phoneme','alias'].includes(p.type)||p.case_sensitive!==undefined&&typeof p.case_sensitive!=='boolean'||p.type==='alias'&&(p.key.trim()!==p.key||/[\x00-\x1f<>()[\]]/.test(p.key))||Object.keys(p).some(k=>!['key','value','type','case_sensitive'].includes(k)))throw Error('Fish: invalid pronunciation rule')
  }
  return values
}

export async function synthesizeVoicePlatform({ provider, cfg, req, key, fetchImpl = fetch, signal, WebSocketImpl }) {
  signal?.throwIfAborted()
  const model = req.models?.[provider] || DEFAULT_MODELS[provider], voice = req.voices?.[provider] || DEFAULT_VOICES[provider]
  const options = providerOptions(cfg, provider), instruction = speechInstruction(cfg, req.role, provider)
  if(req.textChunks&&instruction&&['fish','inworld'].includes(provider)){
    const source=req.textChunks
    req={...req,textChunks:(async function*(){let first=true;for await(const text of source){yield (first?directionTag(instruction):'')+text;first=false}})()}
  }
  const streaming=options.transport&&options.transport!=='http'||provider==='cartesia'&&(options.timestamps||options.phonemes)
  const format = options.format || (streaming&&provider==='cartesia'?'wav':'mp3'), sampleRate = options.sampleRate || 24000
  let url, body, headers = { 'content-type': 'application/json', authorization: `Bearer ${key}` }
  if (provider === 'fish') {
    if (!voice&&!options.referencePath&&!options.referenceIds&&!req.dialogue) throw Error('Fish Audio requires a voice model ID or reference recording')
    if (!['s2.1-pro-free', 's2.1-pro', 's2-pro', 'drama-3'].includes(model)) throw Error('Fish Audio: select a supported S2 or Drama model')
    url = 'https://api.fish.audio/v1/tts'; headers.model = model
    body = { text: directionTag(instruction) + req.text, reference_id: voice, format,
      ...(options.sampleRate !== undefined ? { sample_rate: sampleRate } : {}),
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
      ...(options.topP !== undefined ? { top_p: options.topP } : {}),
      ...(['speed', 'volume'].some(k => options[k] !== undefined) ? { prosody: { ...(options.speed !== undefined ? { speed: options.speed } : {}), ...(options.volume !== undefined ? { volume: options.volume } : {}) } } : {}),
    }
    if (format === 'pcm' && options.sampleRate === undefined) throw Error('Fish Audio PCM requires an explicit sampleRate')
    if(options.mp3Bitrate!==undefined&&![64,128,192].includes(options.mp3Bitrate)||options.opusBitrate!==undefined&&![-1000,24000,32000,48000,64000].includes(options.opusBitrate))throw Error('Fish Audio: unsupported audio bitrate')
    for(const k of ['chunkLength','maxNewTokens','minChunkLength'])if(options[k]!==undefined&&!Number.isInteger(options[k]))throw Error('Fish Audio: '+k+' must be an integer')
    for(const[a,b]of Object.entries({normalize:'normalize',language:'language',latency:'latency',chunkLength:'chunk_length',mp3Bitrate:'mp3_bitrate',opusBitrate:'opus_bitrate',maxNewTokens:'max_new_tokens',minChunkLength:'min_chunk_length',conditionOnPreviousChunks:'condition_on_previous_chunks',earlyStopThreshold:'early_stop_threshold'}))if(options[a]!==undefined)body[b]=options[a]
    if(options.referenceIds){if(!Array.isArray(options.referenceIds)||!options.referenceIds.length||options.referenceIds.length>16||options.referenceIds.some(id=>typeof id!=='string'||!id||id.length>200))throw Error('Fish: invalid reference IDs');body.reference_id=options.referenceIds}
    if(options.referencePath){if(!options.referenceText?.trim())throw Error('Fish reference audio requires its transcript');const url=await readReferenceDataUrl(options.referencePath,{provider:'Fish',signal});body.references=[{audio:Buffer.from(url.slice(url.indexOf(',')+1),'base64'),text:options.referenceText}];delete body.reference_id}
    if(options.dictionary)body.pronunciation_dictionary=fishDictionaries(options.dictionary)
    if(req.dialogue){body.reference_id=req.dialogue.speakers.map(s=>s.voice);body.text=req.dialogue.turns.map(t=>'<|speaker:'+req.dialogue.speakers.findIndex(s=>s.id===t.speaker)+'|>'+directionTag(t.instruction)+t.text).join('')}
    if(options.transport==='websocket'||options.transport==='sse'||options.timestamps)return streamFish({body,headers,options:{...options,transport:options.transport||'sse'},req:{...req,text:body.text},fetchImpl,signal,WebSocketImpl,cfg})
    if(body.references){headers['content-type']='application/msgpack';return binaryAudio(provider,await fetchImpl(url,{method:'POST',headers,body:Buffer.from(encode(body)),signal,redirect:'error'}),signal,format,sampleRate)}
  } else if (provider === 'cartesia') {
    if (!/^sonic-(?:3(?:\.\d+)?|latest)$/.test(model)) throw Error('Cartesia: this adapter supports Sonic 3 models')
    url = 'https://api.cartesia.ai/tts/bytes'; headers['Cartesia-Version'] = '2026-08-14'
    const language = options.language || String(req.lang || 'en').split('-')[0]
    if (options.emotion && language !== 'en') throw Error('Cartesia emotion control is currently supported for English only')
    body = { model_id: model, transcript: req.text, voice,
      output_format: format === 'mp3' ? { container: 'mp3', sample_rate: sampleRate, bit_rate: 128000 } : { container: format === 'pcm' ? 'raw' : 'wav', encoding: 'pcm_s16le', sample_rate: sampleRate },
      language, generation_config: { ...(options.speed !== undefined ? { speed: options.speed } : {}), ...(options.volume !== undefined ? { volume: options.volume } : {}), ...(options.emotion ? { emotion: options.emotion } : {}) },
    }
    for(const[a,b]of Object.entries({dictionary:'pronunciation_dict_id',normalization:'normalization',accent:'accent'}))if(options[a])body[b]=options[a]
    if(streaming)return streamCartesia({body,headers,options:{...options,transport:options.transport||'sse'},req,fetchImpl,signal,WebSocketImpl,cfg})
  } else if (provider === 'inworld') {
    if (instruction && model !== 'inworld-tts-2') throw Error('Inworld steering requires inworld-tts-2')
    const text = directionTag(instruction) + req.text
    const textLimit=options.transport==='stream'?4000:options.transport==='websocket'?256000:2000
    if (text.length > textLimit) throw Error('Inworld input including directions exceeds '+textLimit+' UTF-16 units')
    url = 'https://api.inworld.ai/tts/v1/voice'; headers.authorization = `Basic ${key}`
    const encoding = { mp3: 'MP3', wav: 'LINEAR16', opus: 'OGG_OPUS', pcm: 'PCM' }[format]
    body = { text, voiceId: voice, modelId: model, audioConfig: { audioEncoding: encoding, sampleRateHertz: sampleRate },
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
    }
    for(const[a,b]of Object.entries({language:'language',deliveryMode:'deliveryMode',normalization:'applyTextNormalization',customPronunciation:'enableCustomPronunciation'}))if(options[a]!==undefined)body[b]=options[a]
    if(options.timestamps&&options.timestamps!=='none')body.timestampType=options.timestamps.toUpperCase()
    if(options.lipsync)body.lipsyncConfig={visemeSet:'OPENXR'}
    if(options.context){if(!Array.isArray(options.context)||options.context.length>5||options.context.some(t=>typeof t!=='string')||options.context.join('').length>2000)throw Error('Inworld: invalid synthesis context');body.synthesisContext={previousRequests:options.context.map(text=>({text}))}}
    if(options.dictionaries){if(model!=='inworld-tts-2'||!options.language||options.language.toLowerCase()==='auto'||options.customPronunciation!==undefined||!Array.isArray(options.dictionaries)||options.dictionaries.length<1||options.dictionaries.length>3||new Set(options.dictionaries).size!==options.dictionaries.length||options.dictionaries.some(n=>typeof n!=='string'||! /^(?:[A-Za-z0-9_-]{1,200}|workspaces\/[A-Za-z0-9_-]+\/pronunciationDictionaries\/[A-Za-z0-9_-]+)$/.test(n)))throw Error('Inworld: invalid dictionary selection or model/language');body.pronunciationDictionarySettings={dictionaries:options.dictionaries.map(dictionary=>({dictionary}))}}
    if(options.customPronunciation&&(!['inworld-tts-2','inworld-tts-2-flash'].includes(model)||!options.language||options.language.toLowerCase()==='auto')||options.deliveryMode&&model!=='inworld-tts-2')throw Error('Inworld: selected controls require a supported TTS-2 model and explicit dictionary language')
    if(req.dialogue){if(model!=='inworld-tts-2')throw Error('Inworld script requires TTS-2');if(options.transport==='websocket')throw Error('Inworld script uses HTTP or NDJSON, not the single-voice WebSocket context');delete body.text;delete body.voiceId;body.script={utterances:req.dialogue.turns.map(t=>({text:directionTag(t.instruction)+t.text,voiceConfig:{voiceId:req.dialogue.speakers.find(s=>s.id===t.speaker).voice,...(t.speed?{speakingRate:t.speed}:{})}}))};if(body.script.utterances.reduce((n,t)=>n+t.text.length,0)>textLimit)throw Error('Inworld script including directions exceeds '+textLimit+' UTF-16 units');body.outputMode='COMBINED'}
    if(streaming)return streamInworld({body,headers,options,req:{...req,text},fetchImpl,signal,WebSocketImpl,cfg})
    const data = await boundedJson('Inworld', await fetchImpl(url, { method: 'POST', headers, body: JSON.stringify(body), signal, redirect: 'error' }), signal)
    const out=nativeAudio(provider, decodeAudio(provider, data.audioContent), format, sampleRate)
    if(options.timestamps&&options.timestamps!=='none'||options.lipsync){const timing=timingCollector('inworld');inworldTiming(timing,data.timestampInfo,'all');out.timing=timing.result()}
    return out
  } else throw Error('Unknown voice platform')
  return binaryAudio(provider, await fetchImpl(url, { method: 'POST', headers, body: JSON.stringify(body), signal, redirect: 'error' }), signal, format, sampleRate)
}
