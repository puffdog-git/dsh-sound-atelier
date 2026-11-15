import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter, once } from 'node:events'
import WebSocket,{WebSocketServer} from 'ws'
import { encode,decode } from '@msgpack/msgpack'
import { synthesizeDeepinfraNative } from '../lib/providers/deepinfra.js'
import { synthesizeVoicePlatform } from '../lib/providers/voice-platforms.js'
import { synthesizeDashScope } from '../lib/providers/dashscope.js'
import { synthesizePolly,pollyOperation } from '../lib/providers/polly.js'
import { synthesizeGoogleCloud } from '../lib/providers/google-cloud.js'
import { synthesizeDialogue } from '../lib/dialogue.js'
import { providerOperation } from '../lib/provider-operations.js'
import { jsonEvents } from '../lib/providers/streaming.js'
import { makeProviders } from '../lib/providers.js'

function wav(value=100,length=240){const b=Buffer.alloc(44+length*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(24000,24);b.writeUInt32LE(48000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(length*2,40);for(let i=44;i<b.length;i+=2)b.writeInt16LE(value,i);return b}
const mp3=Buffer.concat([Buffer.from('ID3'),Buffer.alloc(97)])
const account=JSON.stringify({type:'service_account',client_email:'test@project.iam.gserviceaccount.com',private_key:'-----BEGIN PRIVATE KEY-----\nfixture\n-----END PRIVATE KEY-----'})
const aws=JSON.stringify({accessKeyId:'ABCDEFGHIJKLMNOPQRST',secretAccessKey:'fixture-secret'})
const auth=()=>({authorize:async()=>({access_token:'fixture-token',expiry_date:Date.now()+3600000})})
const request=(provider,model='fixture',voice='fixture')=>({text:'你好。',models:{[provider]:model},voices:{[provider]:voice},role:'reply',lang:'en'})
function streamed(text,sse=false){const bytes=Buffer.from(text);return new Response(new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=7)c.enqueue(bytes.subarray(i,i+7));c.close()}}),{headers:{'content-type':sse?'text/event-stream':'application/json'}})}
const sse=(...packets)=>packets.map(p=>'data: '+JSON.stringify(p)+'\n\n').join('')
async function wsServer(handler){const server=new WebSocketServer({port:0,host:'127.0.0.1'});await once(server,'listening');server.on('connection',socket=>socket.on('message',(b,binary)=>handler(socket,b,binary)));class Socket extends WebSocket{constructor(url,options){super('ws://127.0.0.1:'+server.address().port,options);Socket.target=url}}return{Socket,async close(){for(const c of server.clients)c.terminate();await new Promise(r=>server.close(r))}}}

test('DeepInfra native schemas distinguish Kokoro voice blending/timing from Orpheus sampling and Chatterbox voice IDs',async()=>{
 const calls=[]
 const call=(model,options,voice)=>synthesizeDeepinfraNative({cfg:{providerOptions:JSON.stringify({deepinfra:options})},req:request('deepinfra',model,voice),key:'key',fetchImpl:async(url,init)=>{calls.push({url,body:JSON.parse(init.body)});return Response.json({audio:wav().toString('base64'),output_format:'wav',words:[{text:'你',start:0,end:.01}],inference_status:{status:'succeeded'}})}})
 const kokoro=await call('hexgrad/Kokoro-82M',{timestamps:true,native:{preset_voice:['af_bella','af_heart'],speed:1.2}},'af_bella');assert.equal(kokoro.timing.available,true);assert.deepEqual(calls[0].body.preset_voice,['af_bella','af_heart']);assert.equal(calls[0].body.text,'你好。');assert.equal(calls[0].body.input,undefined)
 await call('canopylabs/orpheus-3b-0.1-ft',{native:{temperature:.7,max_tokens:2000}},'tara');assert.equal(calls[1].body.input,'你好。');assert.equal(calls[1].body.text,undefined)
 await call('ResembleAI/chatterbox-turbo',{native:{exaggeration:.4,cfg:.2,seed:123}},'custom-voice');assert.equal(calls[2].body.voice_id,'custom-voice');assert.equal(calls[2].body.voice,undefined)
 const before=calls.length;await assert.rejects(call('canopylabs/orpheus-3b-0.1-ft',{native:{preset_voice:['af_bella']}},'tara'),/unsupported/);await assert.rejects(call('ResembleAI/chatterbox-turbo',{native:{language_id:'zh'}},'v'),/multilingual/);assert.equal(calls.length,before)
})

test('DeepInfra rejects truncated output and invalid model-specific controls before reusing another model contract',async()=>{
 await assert.rejects(synthesizeDeepinfraNative({cfg:{providerOptions:'{"deepinfra":{"native":{"seed":-1}}}'},req:request('deepinfra','ResembleAI/chatterbox-turbo','v'),key:'key',fetchImpl:()=>{throw Error('unexpected')}}),/invalid seed/)
 await assert.rejects(synthesizeDeepinfraNative({cfg:{},req:request('deepinfra','canopylabs/orpheus-3b-0.1-ft','tara'),key:'key',fetchImpl:async()=>Response.json({audio:mp3.toString('base64'),inference_status:{status:'failed'}})}),/did not succeed/)
})

test('Fish SSE replaces cumulative alignment snapshots rather than duplicating them',async()=>{
 const alignment=segments=>({segments,audio_duration:1})
 let captured
 const out=await synthesizeVoicePlatform({provider:'fish',cfg:{providerOptions:'{"fish":{"transport":"sse","timestamps":true}}'},req:request('fish','s2.1-pro','voice-id'),key:'key',fetchImpl:async(url,init)=>{captured={url,body:decode(init.body)};return streamed(sse({audio_base64:mp3.toString('base64'),chunk_seq:0,chunk_audio_offset_sec:0,alignment:alignment([{text:'你',start:0,end:.2}])},{audio_base64:mp3.toString('base64'),chunk_seq:0,chunk_audio_offset_sec:0,alignment:alignment([{text:'你',start:0,end:.2},{text:'好',start:.2,end:.4}])},{audio_base64:mp3.toString('base64'),chunk_seq:1,chunk_audio_offset_sec:1,alignment:alignment([{text:'再',start:0,end:.1}])}),true)}})
 assert.ok(captured.url.endsWith('/stream/with-timestamp'));assert.equal(out.timing.alignments.length,2);assert.equal(out.timing.alignments[0].words.length,2);assert.equal(out.timing.alignments[1].words[0].start,1)
})

test('Fish live uses MessagePack start/text/close and requires successful finish',async()=>{
 const events=[];const server=await wsServer((ws,raw)=>{const p=decode(raw);events.push(p.event);if(p.event==='text')ws.send(encode({event:'audio',audio:mp3}));if(p.event==='close')ws.send(encode({event:'finish',reason:'stop'}))})
 try{const out=await synthesizeVoicePlatform({provider:'fish',cfg:{providerOptions:'{"fish":{"transport":"websocket"}}'},req:request('fish','s2.1-pro','v'),key:'key',WebSocketImpl:server.Socket});assert.equal(out.mime,'audio/mpeg');assert.deepEqual(events,['start','text','close']);assert.ok(server.Socket.target.startsWith('wss://api.fish.audio/'))}finally{await server.close()}
})

test('Cartesia SSE preserves late word and phoneme events and rejects a missing done marker',async()=>{
 const invoke=done=>synthesizeVoicePlatform({provider:'cartesia',cfg:{providerOptions:'{"cartesia":{"transport":"sse","timestamps":true,"phonemes":true}}'},req:request('cartesia','sonic-3.6','v'),key:'key',fetchImpl:async(_url,init)=>{const b=JSON.parse(init.body);assert.equal(b.output_format.container,'raw');return streamed(sse({type:'chunk',context_id:b.context_id,data:Buffer.alloc(480).toString('base64')},{type:'timestamps',word_timestamps:{words:['hello'],start:[0],end:[.01]}},{type:'phoneme_timestamps',phoneme_timestamps:{phonemes:['h'],start:[0],end:[.005]}},...(done?[{type:'done',done:true}]:[])),true)}})
 const out=await invoke(true);assert.equal(out.mime,'audio/wav');assert.equal(out.timing.alignments.length,2);await assert.rejects(invoke(false),/before done/)
})

test('Cartesia WebSocket context mismatch fails after partial audio without returning success',async()=>{
 const server=await wsServer((ws,raw)=>{const p=JSON.parse(raw);if(p.continue===false){ws.send(JSON.stringify({type:'chunk',context_id:p.context_id,data:Buffer.alloc(480).toString('base64')}));ws.send(JSON.stringify({type:'done',context_id:'foreign',done:true}))}})
 try{await assert.rejects(synthesizeVoicePlatform({provider:'cartesia',cfg:{providerOptions:'{"cartesia":{"transport":"websocket","format":"wav"}}'},req:request('cartesia','sonic-3.6','v'),key:'key',WebSocketImpl:server.Socket}),/context mismatch/)}finally{await server.close()}
})

test('Inworld NDJSON combines complete LINEAR16 WAV chunks and late timestamps',async()=>{
 const out=await synthesizeVoicePlatform({provider:'inworld',cfg:{providerOptions:'{"inworld":{"transport":"stream","format":"wav","timestamps":"word"}}'},req:request('inworld','inworld-tts-2','Ashley'),key:'key',fetchImpl:async()=>streamed(JSON.stringify({result:{audioContent:wav(100).toString('base64')}})+'\n'+JSON.stringify({result:{audioContent:wav(200).toString('base64')}})+'\n'+JSON.stringify({result:{timestampInfo:{wordAlignment:{words:['你'],wordStartTimeSeconds:[0],wordEndTimeSeconds:[.02]}}}})+'\n')})
 assert.equal(out.audio.length,44+960);assert.equal(out.audio.readInt16LE(44),100);assert.equal(out.audio.readInt16LE(524),200);assert.equal(out.timing.available,true)
})

test('Inworld WebSocket keeps PCM flush clocks and late alignment separate',async()=>{
 const server=await wsServer((ws,raw)=>{
  const p=JSON.parse(raw),id=p.contextId
  if(p.create)ws.send(JSON.stringify({result:{contextId:id,contextCreated:{},status:{code:0}}}))
  if(p.send_text)ws.send(JSON.stringify({result:{contextId:id,audioChunk:{audioContent:Buffer.alloc(480).toString('base64'),timestampInfo:{wordAlignment:{words:['Hi'],wordStartTimeSeconds:[0],wordEndTimeSeconds:[.01]}}}}}))
  if(p.close_context)ws.send(JSON.stringify({result:{contextId:id,contextClosed:{},status:{code:0}}}))
 })
 try{const out=await synthesizeVoicePlatform({provider:'inworld',cfg:{providerOptions:'{"inworld":{"transport":"websocket","format":"wav","timestamps":"word"}}'},req:request('inworld','inworld-tts-2','Ashley'),key:'key',WebSocketImpl:server.Socket});assert.equal(out.mime,'audio/wav');assert.equal(out.audio.length,524);assert.equal(out.timing.available,true)}finally{await server.close()}
})

test('DashScope real WebSocket preserves task IDs, binary audio and millisecond word times',async()=>{
 const commands=[];const server=await wsServer((ws,raw)=>{const p=JSON.parse(raw);commands.push(p);const id=p.header.task_id;if(p.header.action==='run-task')ws.send(JSON.stringify({header:{task_id:id,event:'task-started'}}));if(p.header.action==='continue-task'){ws.send(JSON.stringify({header:{task_id:id,event:'result-generated'},payload:{output:{type:'sentence-begin',sentence:{index:0,words:[]}}}}));ws.send(Buffer.alloc(480));ws.send(JSON.stringify({header:{task_id:id,event:'result-generated'},payload:{output:{sentence:{index:0,words:[{text:'你',begin_time:0,end_time:10}]}}}}))}if(p.header.action==='finish-task')ws.send(JSON.stringify({header:{task_id:id,event:'task-finished'}}))})
 try{const out=await synthesizeDashScope({cfg:{dashscopeWorkspace:'workspace',providerOptions:'{"dashscope":{"transport":"websocket","format":"wav","timestamps":true}}'},req:request('dashscope','cosyvoice-v3-flash','longanyang'),key:'key',WebSocketImpl:server.Socket});assert.equal(new Set(commands.map(c=>c.header.task_id)).size,1);assert.equal(out.timing.alignments[0].words[0].end,.01);assert.equal(out.audio.length,524)}finally{await server.close()}
})

test('Polly SSML, lexicons and opt-in Speech Marks use separate explicit requests',async()=>{
 const calls=[];let destroyed=0
 const out=await synthesizePolly({cfg:{_inputType:'ssml',providerOptions:'{"polly":{"marks":["word","ssml"],"lexicons":["Terms"]}}'},req:{...request('polly','neural','Joanna'),text:'<speak><mark name="a"/>Hi.</speak>'},key:aws,pollyClientFactory:()=>({send:async c=>{calls.push(c.input);return {AudioStream:c.input.OutputFormat==='json'?Buffer.from('{"type":"word","time":100,"value":"Hi"}\n{"type":"ssml","time":0,"value":"a"}\n'):mp3}},destroy(){destroyed++}})})
 assert.equal(calls.length,2);assert.equal(calls[0].TextType,'ssml');assert.deepEqual(calls[0].LexiconNames,['Terms']);assert.equal(calls[1].OutputFormat,'json');assert.equal(out.timing.alignments[0].words[0].start,.1);assert.equal(destroyed,1)
})

test('Polly generative streaming consumes SDK events and requires StreamClosedEvent',async()=>{
 let sent
 async function invoke(complete){return synthesizePolly({cfg:{providerOptions:'{"polly":{"transport":"stream","format":"wav"}}'},req:request('polly','generative','Joanna'),key:aws,pollyClientFactory:()=>({send:async c=>{sent=[];for await(const e of c.input.ActionStream)sent.push(e);return {EventStream:(async function*(){yield {AudioEvent:{AudioChunk:Buffer.alloc(480)}};if(complete)yield {StreamClosedEvent:{RequestCharacters:3}}})()}},destroy(){}})})}
 assert.equal((await invoke(true)).audio.length,524);assert.ok(sent[0].TextEvent);assert.ok(sent.at(-1).CloseStreamEvent);await assert.rejects(invoke(false),/before completion/)
})

test('Polly async and lexicon operations do not synthesize automatically during read operations',async()=>{
 const commands=[];const client=()=>({send:async c=>{commands.push(c.constructor.name);return {SynthesisTask:{TaskId:'task',TaskStatus:'scheduled'}}},destroy(){}})
 await pollyOperation({cfg:{},key:aws,action:'task-start',input:{text:'Long text',bucket:'my-output-bucket'},pollyClientFactory:client});await pollyOperation({cfg:{},key:aws,action:'task-get',input:{id:'task'},pollyClientFactory:client});assert.deepEqual(commands,['StartSpeechSynthesisTaskCommand','GetSpeechSynthesisTaskCommand'])
})

test('Google Cloud ADC, SSML timepoints and Chirp pace use current native fields',async()=>{
 let captured
 const out=await synthesizeGoogleCloud({cfg:{_inputType:'ssml',providerOptions:'{"google-cloud":{"auth":"adc","timestamps":true,"speed":1.2,"format":"wav"}}'},req:{...request('google-cloud','','en-US-Chirp3-HD-Leda'),text:'<speak><mark name="intro"/>Hi.</speak>'},googleAdcFactory:()=>({getRequestHeaders:async()=>({authorization:'Bearer adc-token'})}),fetchImpl:async(url,init)=>{captured={url,body:JSON.parse(init.body)};return Response.json({audioContent:wav().toString('base64'),timepoints:[{markName:'intro',timeSeconds:.1}]})}})
 assert.ok(captured.url.includes('v1beta1'));assert.ok(captured.body.input.ssml);assert.equal(captured.body.audioConfig.speakingRate,1.2);assert.equal(out.timing.alignments[0].words[0].start,.1)
})

test('Google Cloud streaming writes config first, wraps headerless PCM and closes the SDK client',async()=>{
 const writes=[];let closed=0
 const stream=new EventEmitter();stream.write=v=>{writes.push(v);return true};stream.cancel=()=>{};stream.end=()=>queueMicrotask(()=>{stream.emit('data',{audioContent:Buffer.alloc(480)});stream.emit('end')})
 const out=await synthesizeGoogleCloud({cfg:{providerOptions:'{"google-cloud":{"transport":"stream","format":"wav","auth":"adc"}}'},req:request('google-cloud','','en-US-Chirp3-HD-Leda'),googleTtsClientFactory:()=>({streamingSynthesize:()=>stream,close(){closed++}})})
 assert.ok(writes[0].streamingConfig);assert.ok(writes[1].input.text);assert.equal(writes[0].input,undefined);assert.equal(out.audio.length,524);assert.equal(closed,1)
})

test('dialogue fallback keeps speaker order and produces a real global PCM timeline',async()=>{
 const voices=[]
 const dialogue={mode:'segments',speakers:[{id:'Alice',voice:'a'},{id:'Bob',voice:'b'}],turns:[{speaker:'Alice',text:'Hi.'},{speaker:'Bob',text:'Hello.'}]}
 const out=await synthesizeDialogue(dialogue,{chain:[{provider:'edge',voice:'a'}]},undefined,async(_text,cfg)=>{const voice=cfg.chain[0].voice;voices.push(voice);return {audio:wav(voice==='a'?100:200),mime:'audio/wav',timing:{unit:'seconds',scope:'segment',available:true,alignments:[{type:'word',words:[{word:'Hi',start:0,end:.01}]}]}}})
 assert.deepEqual(voices,['a','b']);assert.equal(out.audio.readInt16LE(44),100);assert.equal(out.audio.readInt16LE(524),200);assert.equal(out.timeline[1].start,.01);assert.equal(out.timing.scope,'job');assert.equal(out.timing.alignments[1].words[0].start,.01)
 await assert.rejects(synthesizeDialogue({...dialogue,mode:'native'},{chain:[{provider:'edge'}]},undefined,()=>{}),/no native dialogue/)
})

test('Inworld dictionary updates use phone token arrays, etag and explicit update mask',async()=>{
 let captured
 await providerOperation({provider:'inworld',action:'dictionary-update',cfg:{},key:'key',input:{workspace:'w',id:'d',displayName:'Names',etag:'v1',pronunciations:[{displayHeadword:'Crete',languageCode:'en-US',phoneSymbols:['k','r','i','t']}]},fetchImpl:async(url,init)=>{captured={url,body:JSON.parse(init.body)};return Response.json({name:'dictionary'})}})
 assert.ok(captured.url.endsWith('?updateMask=displayName,pronunciations'));assert.equal(captured.body.etag,'v1');assert.deepEqual(captured.body.pronunciations[0].phoneSymbols,['k','r','i','t'])
})

test('stream parser handles split UTF-8 and rejects an incomplete SSE event or late error',async()=>{
 const packets=[];for await(const e of jsonEvents(streamed(sse({text:'你好'}),true),undefined,{sse:true}))packets.push(e.data);assert.equal(packets[0].text,'你好')
 await assert.rejects(async()=>{for await(const _ of jsonEvents(streamed('data: {"text":"incomplete"}',true),undefined,{sse:true})){}},/Truncated/)
})

test('native Fish and Inworld dialogue keep speaker IDs, per-turn delivery and combined audio',async()=>{
 const dialogue={speakers:[{id:'A',voice:'alice'},{id:'B',voice:'bob'}],turns:[{speaker:'A',text:'Hi.',instruction:'happy'},{speaker:'B',text:'Hello.',speed:1.1}]}
 let fish,inworld
 await synthesizeVoicePlatform({provider:'fish',cfg:{providerOptions:'{"fish":{"format":"wav"}}'},key:'key',req:{...request('fish','s2.1-pro'),dialogue},fetchImpl:async(_url,init)=>{fish=JSON.parse(init.body);return new Response(wav())}})
 assert.deepEqual(fish.reference_id,['alice','bob']);assert.equal(fish.text,'<|speaker:0|>[happy] Hi.<|speaker:1|>Hello.')
 await synthesizeVoicePlatform({provider:'inworld',cfg:{providerOptions:'{"inworld":{"format":"wav"}}'},key:'key',req:{...request('inworld','inworld-tts-2'),dialogue},fetchImpl:async(_url,init)=>{inworld=JSON.parse(init.body);return Response.json({audioContent:wav().toString('base64')})}})
 assert.equal(inworld.outputMode,'COMBINED');assert.equal(inworld.script.utterances[1].voiceConfig.voiceId,'bob');assert.equal(inworld.script.utterances[1].voiceConfig.speakingRate,1.1)
})

test('Gemini Interactions dialogue carries two voice mappings and speech metadata without altering transcript',async()=>{
 const dialogue={speakers:[{id:'A',voice:'Kore'},{id:'B',voice:'Puck'}],turns:[{speaker:'A',text:'Hi.',instruction:'happy'},{speaker:'B',text:'Hello.'}]}
 let body
 const providers=makeProviders({cfg:{},resolveKey:async()=> 'fixture',fetchImpl:async(_url,init)=>{body=JSON.parse(init.body);return Response.json({status:'completed',output_audio:{data:wav().toString('base64')}})}},{...request('google','gemini-3.8-flash-tts','Kore'),dialogue})
 assert.equal((await providers.google()).mime,'audio/wav');assert.equal(body.input[0].content[0].text,'Hi.');assert.deepEqual(body.generation_config.speech_config.speakers,[{speaker:'A',voice:'Kore'},{speaker:'B',voice:'Puck'}]);assert.equal(body.input[0].content[0].annotations[0].style,'happy')
})

test('Google Cloud Gemini maps aliases and prompt; Studio uses documented O/Q speaker names',async()=>{
 const dialogue={speakers:[{id:'Alice',voice:'Kore'},{id:'Bob',voice:'Puck'}],turns:[{speaker:'Alice',text:'Hi.',instruction:'happy'},{speaker:'Bob',text:'Hello.'}]}
 const bodies=[]
 const call=(model,voice)=>synthesizeGoogleCloud({cfg:{providerOptions:'{"google-cloud":{"format":"wav"}}'},req:{...request('google-cloud',model,voice),dialogue},key:account,googleAuthFactory:auth,fetchImpl:async(_url,init)=>{bodies.push(JSON.parse(init.body));return Response.json({audioContent:wav().toString('base64')})}})
 await call('gemini-2.5-flash-tts','Kore');assert.deepEqual(bodies[0].voice.multiSpeakerVoiceConfig.speakerVoiceConfigs,[{speakerAlias:'Alice',speakerId:'Kore'},{speakerAlias:'Bob',speakerId:'Puck'}]);assert.ok(bodies[0].input.prompt.includes('happy'))
 await call('','en-US-Studio-MultiSpeaker');assert.deepEqual(bodies[1].input.multiSpeakerMarkup.turns.map(t=>t.speaker),['O','Q'])
})

test('Google stream errors reject immediately while incremental input is still waiting',async()=>{
 const stream=new EventEmitter();stream.write=()=>{queueMicrotask(()=>stream.emit('error',Error('fixture')));return true};stream.cancel=()=>{};stream.end=()=>{}
 const input={async *[Symbol.asyncIterator](){yield 'Hi';await new Promise(()=>{})}}
 await assert.rejects(synthesizeGoogleCloud({cfg:{providerOptions:'{"google-cloud":{"transport":"stream","auth":"adc","format":"wav"}}'},req:{...request('google-cloud','','en-US-Chirp3-HD-Leda'),textChunks:input},googleTtsClientFactory:()=>({streamingSynthesize:()=>stream,close(){}})}),/streaming synthesis failed/)
})
