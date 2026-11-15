// Runs outside the DSH process. Package/runtime and model data stay isolated.
import { createRequire } from 'node:module'
import readline from 'node:readline'
import path from 'node:path'
import {splitSentencesWithOffsets} from '../text.js'
const runtime = process.argv[2], cache = process.argv[3]
const require = createRequire(path.join(runtime, 'package.json'))
const { KokoroTTS } = require('kokoro-js')
const { StyleTextToSpeech2Model, AutoTokenizer, env } = require('@huggingface/transformers')
env.cacheDir = cache
env.backends.onnx.logLevel = 'error'
const modelId = 'onnx-community/Kokoro-82M-v1.0-ONNX'
const revision = '1939ad2a8e416c0acfeecc08a694d14ef25f2231'
const send = value => process.stdout.write('DSH_TTS:' + JSON.stringify(value) + '\n')
let tts
async function load() {
  if (!tts) {
    const [model, tokenizer] = await Promise.all([
      StyleTextToSpeech2Model.from_pretrained(modelId, { revision, dtype: 'q8', device: 'cpu' }),
      AutoTokenizer.from_pretrained(modelId, { revision }),
    ])
    tts = new KokoroTTS(model, tokenizer)
  }
  return tts
}
function wav(audio) {
  const rate=audio.sampling_rate, samples=audio.audio
  if(!(samples instanceof Float32Array)||!samples.length||samples.length>24000*120||rate!==24000)throw Error('Invalid generated audio')
  const b=Buffer.alloc(44+samples.length*2)
  b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(samples.length*2,40)
  for(let i=0;i<samples.length;i++)b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,samples[i]))*32767),44+i*2)
  return b
}
for await (const line of readline.createInterface({ input:process.stdin, crlfDelay:Infinity })) {
  let request
  try {
    if(line.length>16000)throw Error('Request too large')
    request=JSON.parse(line);const engine=await load()
    if(request.action==='load'){send({id:request.id,ok:true,model:modelId,revision,voices:engine.voices});continue}
    if(typeof request.text!=='string'||!request.text.trim()||request.text.length>1000||/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(request.text))throw Error('This isolated Kokoro JS runtime currently supports English text')
    const pieces=[]
    for(const piece of splitSentencesWithOffsets(request.text,180))pieces.push(await engine.generate(piece.text,{voice:request.voice||'af_heart',speed:request.speed||1}))
    const samples=new Float32Array(pieces.reduce((n,p)=>n+p.audio.length,0));let offset=0;for(const piece of pieces){samples.set(piece.audio,offset);offset+=piece.audio.length}
    const audio=wav({audio:samples,sampling_rate:24000})
    send({id:request.id,ok:true,audioBase64:audio.toString('base64'),mime:'audio/wav'})
  }catch{send({id:request?.id,ok:false,error:'Kokoro runtime could not load the model or synthesize this request'})}
}
