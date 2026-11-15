import { providerOptions, speechInstruction, audioResult } from './controls.js';
import { readAudioBody } from './audio.js';
import { DEEPINFRA_SCHEMAS } from './deepinfra-schemas.js';
import { boundedJson, decodeAudio, binaryAudio, nativeAudio } from './native-http.js';
import { timingCollector } from './streaming.js';
export { DEEPINFRA_SCHEMAS };
export const deepinfraDefaultVoice = model => model?.startsWith('ResembleAI/') ? '' : model === 'canopylabs/orpheus-3b-0.1-ft' ? 'tara' : /^Qwen\//.test(model || '') ? 'Vivian' : 'af_bella';

function validate(value, rule, name) {
  if (rule.type === 'array') { if (!Array.isArray(value) || !value.length || value.length > 16) throw Error('DeepInfra: invalid '+name); for (const v of value) validate(v, rule.items, name); return }
  if (rule.enum && !rule.enum.includes(value) || rule.type === 'boolean' && typeof value !== 'boolean' || rule.type === 'string' && (typeof value !== 'string' || value.length > (rule.maxLength || 10000) || value.length < (rule.minLength || 0)) || ['number','integer'].includes(rule.type) && (typeof value !== 'number' || !Number.isFinite(value) || rule.type === 'integer' && !Number.isInteger(value) || value < (rule.minimum ?? -Infinity) || value > (rule.maximum ?? Infinity) || rule.exclusiveMinimum !== undefined && value <= rule.exclusiveMinimum)) throw Error('DeepInfra: invalid '+name)
}
export async function synthesizeDeepinfraNative({ cfg, req, key, fetchImpl = fetch, signal }) {
  const model=req.models.deepinfra, schema=DEEPINFRA_SCHEMAS[model], options=providerOptions(cfg,'deepinfra')
  if (!schema) throw Error('DeepInfra: native controls require a supported model')
  if (options.language) throw Error('DeepInfra: use the model-specific language field in native controls')
  const native=options.native||{}, body={}
  if (Array.isArray(native)) throw Error('DeepInfra native controls must be an object')
  for (const [k,v] of Object.entries(native)) {
    if (!schema.properties[k] || ['text','input','voice','voice_id','output_format','response_format'].includes(k)) throw Error('DeepInfra: unsupported native control for this model')
    validate(v,schema.properties[k],k);body[k]=v
  }
  const format=options.format||'wav', voice=req.voices.deepinfra||deepinfraDefaultVoice(model)
  const kokoro=model==='hexgrad/Kokoro-82M', chatter=model.startsWith('ResembleAI/')
  if(chatter&&!voice)throw Error('DeepInfra Chatterbox requires an existing custom voice ID')
  if(chatter&&body.language_id!==undefined&&!/multilingual/.test(model))throw Error('DeepInfra language_id requires Chatterbox multilingual')
  Object.assign(body,kokoro?{text:req.text,output_format:format,preset_voice:body.preset_voice||[voice]}:chatter?{text:req.text,voice_id:voice,response_format:format}:{input:req.text,voice,response_format:format})
  if(options.timestamps) {if(!kokoro)throw Error('DeepInfra native timestamps are supported here for Kokoro only');body.return_timestamps=true}
  if(body.stream&&body.return_timestamps)throw Error('DeepInfra: select non-streaming for timestamp JSON output')
  for(const[k,v]of Object.entries(body))validate(v,schema.properties[k],k)
  if(body.sample_rate!==undefined&&(!Number.isInteger(body.sample_rate)||body.sample_rate<8000||body.sample_rate>48000))throw Error('DeepInfra: invalid sample_rate')
  if(format==='pcm'&&!options.pcmSampleRate&&!body.sample_rate)throw Error('DeepInfra PCM requires an explicit sample rate')
  const root=(cfg.deepinfraBaseUrl||'https://api.deepinfra.com/v1/openai').replace(/\/+$/,'').replace(/\/openai$/,'')
  const url=new URL(root+'/inference/'+model)
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw Error('Invalid DeepInfra endpoint')
  const response=await fetchImpl(url.href,{method:'POST',headers:{authorization:'Bearer '+key,'content-type':'application/json'},body:JSON.stringify(body),signal,redirect:'error'})
  if(body.stream)return binaryAudio('deepinfra',response,signal,format,options.pcmSampleRate||body.sample_rate||24000)
  const data=await boundedJson('DeepInfra',response,signal)
  if(data.inference_status?.status!=='succeeded')throw Error('DeepInfra inference did not succeed')
  if(data.output_format&&data.output_format!==format)throw Error('DeepInfra returned an unexpected audio format')
  const encoded=String(data.audio||'').replace(/^data:audio\/[\w.+-]+;base64,/,'')
  const out=nativeAudio('deepinfra',decodeAudio('DeepInfra',encoded),format,options.pcmSampleRate||body.sample_rate||24000)
  if(body.return_timestamps){const timing=timingCollector('deepinfra');timing.set('words',data.words);out.timing=timing.result()}
  return out
}
export const QWEN_VOICES = ['Vivian', 'Serena', 'Uncle_Fu', 'Dylan', 'Eric', 'Ryan', 'Aiden', 'Ono_Anna', 'Sohee'];
export const isDeepinfraQwen = model => /^Qwen\/Qwen3-TTS(?:-VoiceDesign)?$/.test(model || '');
export async function synthesizeDeepinfraQwen({ cfg, req, key, fetchImpl, signal }) {
  const model = req.models.deepinfra, design = model.endsWith('-VoiceDesign'), options = providerOptions(cfg, 'deepinfra');
  if(options.native||options.timestamps)throw Error('DeepInfra Qwen does not support these native controls');
  const format = options.format || 'wav';
  const voice = design ? String(cfg.roles?.[req.role]?.voiceDesign || cfg.deepinfraVoiceDesign || '').trim() : req.voices?.deepinfra || 'Vivian';
  if (!voice) throw Error('DeepInfra VoiceDesign requires a voice description');
  if (req.text.length > 4000) throw Error('DeepInfra Qwen TTS input is limited to 4000 characters');
  if (format === 'pcm' && !options.pcmSampleRate) throw Error('Set deepinfra.pcmSampleRate to the model output rate before using PCM');
  const root = (cfg.deepinfraBaseUrl || 'https://api.deepinfra.com/v1/openai').replace(/\/+$/, '').replace(/\/openai$/, '');
  const url = new URL(root + '/inference/' + model);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw Error('Invalid DeepInfra endpoint');
  const instruction = speechInstruction(cfg, req.role, 'deepinfra');
  signal?.throwIfAborted();
  const res = await fetchImpl(url.href, { method: 'POST', signal, redirect: 'error', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ input: req.text, voice: design && instruction ? voice + '\nDelivery: ' + instruction : voice, response_format: format, ...(options.language ? { language: options.language } : {}), ...(!design && instruction ? { instruct: instruction } : {}) }) });
  if (!res.ok) { await res.body?.cancel?.(); throw Error('DeepInfra HTTP ' + res.status); }
  const bytes = await readAudioBody(res, signal, 48 * 1024 * 1024);
  let data;
  try { data = JSON.parse(bytes.toString('utf8')); } catch { throw Error('DeepInfra returned invalid JSON'); }
  if (data.inference_status?.status !== 'succeeded') throw Error('DeepInfra inference did not succeed');
  let encoded = data.audio;
  if (typeof encoded !== 'string') throw Error('DeepInfra returned no audio');
  if (encoded.startsWith('data:')) {
    const match = encoded.match(/^data:audio\/[\w.+-]+;base64,(.+)$/s);
    if (!match) throw Error('DeepInfra returned an invalid audio data URI'); encoded = match[1];
  }
  if (!encoded || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) throw Error('DeepInfra returned invalid audio encoding');
  if (data.output_format && data.output_format !== format) throw Error('DeepInfra returned an unexpected audio format');
  return audioResult('deepinfra', Buffer.from(encoded, 'base64'), format, options.pcmSampleRate || 24000);
}
