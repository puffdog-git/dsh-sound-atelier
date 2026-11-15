import test from 'node:test'
import assert from 'node:assert/strict'
import { synthesizeLocalService,localServiceOperation } from '../lib/providers/local-service.js'
import { audioResult } from '../lib/providers/controls.js'
import {F5Engine}from'../lib/engines/f5.js'
import {synthesizeDialogue}from'../lib/dialogue.js'
const bytes=audioResult('fixture',Buffer.alloc(480),'pcm',24000).audio
const reference={asset:{transcript:'Hello.'},path:'C:/owned/reference.wav',bytes}
const req={text:'New words.',models:{'local-tts':'local-id'},voices:{'local-tts':'Vivian'},role:'reply'}
test('Xinference reference synthesis uses a real multipart file and JSON-string kwargs, never a host path',async()=>{
 let captured
 const out=await synthesizeLocalService({cfg:{localTtsFamily:'qwen3',providerOptions:'{"local-tts":{"native":{"language":"chinese","seed":12}}}',speechInstruction:'warm'},req,reference,fetchImpl:async(url,init)=>{captured={url,init};return new Response(bytes)}})
 assert.equal(out.mime,'audio/wav');assert.ok(captured.url.endsWith('/v1/audio/speech'));const form=captured.init.body;assert.ok(form instanceof FormData);assert.equal(form.get('stream'),'false');assert.deepEqual(JSON.parse(form.get('kwargs')),{language:'chinese',seed:12,instruct:'warm',prompt_text:'Hello.'});assert.equal(Buffer.from(await form.get('prompt_speech').arrayBuffer()).equals(bytes),true)
})
test('model-specific controls reject unsupported parameters and missing transcripts before contacting the service',async()=>{
 const fetchImpl=()=>{throw Error('unexpected network call')}
 await assert.rejects(synthesizeLocalService({cfg:{localTtsFamily:'breeze',providerOptions:'{"local-tts":{"speed":1.1}}'},req,fetchImpl}),/does not support/)
 await assert.rejects(synthesizeLocalService({cfg:{localTtsFamily:'f5'},req,reference:{...reference,asset:{transcript:''}},fetchImpl}),/transcript/)
 await assert.rejects(synthesizeLocalService({cfg:{localTtsFamily:'qwen3',providerOptions:'{"local-tts":{"native":{"input":"override"}}}'},req,reference,fetchImpl}),/Unsupported native/)
 await assert.rejects(synthesizeLocalService({cfg:{localTtsFamily:'index2',providerOptions:'{"local-tts":{"native":{"emo_vector":[1,2]}}}'},req,reference,fetchImpl}),/eight/)
})
test('Index emotion text and vector are separated from spoken text; arbitrary emotion file paths are rejected',async()=>{
 let body
 await synthesizeLocalService({cfg:{localTtsFamily:'index2',speechInstruction:'sad',providerOptions:'{"local-tts":{"native":{"emo_alpha":0.6,"emo_vector":[0,0,0.2,0,0,0,0,0]}}}'},req,reference,fetchImpl:async(_u,init)=>{body=init.body;return new Response(bytes)}})
 const native=JSON.parse(body.get('kwargs'));assert.equal(native.emo_text,'sad');assert.equal(native.use_emo_text,true);assert.equal(body.get('input'),req.text)
 await assert.rejects(synthesizeLocalService({cfg:{localTtsFamily:'index2',providerOptions:'{"local-tts":{"native":{"emo_prompt_speech":"C:/private"}}}'},req,reference,fetchImpl:()=>{throw Error('unexpected')}}),/Unsupported/)
})
test('GPT-SoVITS calls its native /tts with validated recording, language and no second split',async()=>{
 let sent
 await synthesizeLocalService({cfg:{localTtsBackend:'gpt-sovits',localTtsBaseUrl:'http://127.0.0.1:9880'},req,reference,fetchImpl:async(url,init)=>{sent={url,body:JSON.parse(init.body)};return new Response(bytes)}})
 assert.equal(sent.url,'http://127.0.0.1:9880/tts');assert.equal(sent.body.ref_audio_path,reference.path);assert.equal(sent.body.prompt_text,'Hello.');assert.equal(sent.body.text_split_method,'cut0');assert.equal(sent.body.media_type,'wav')
})
test('lifecycle launches only audio models, unload preserves weights and URLs cannot redirect reference data outside loopback',async()=>{
 const calls=[];const fetchImpl=async(url,init)=>{calls.push({url,...init});return Response.json({model_uid:'ours'})}
 await localServiceOperation({cfg:{},action:'launch',input:{name:'F5-TTS',uid:'ours',gpus:1},fetchImpl});assert.equal(JSON.parse(calls[0].body).model_type,'audio');assert.equal(JSON.parse(calls[0].body).n_gpu,1)
 assert.equal((await localServiceOperation({cfg:{},action:'unload',input:{uid:'ours'},fetchImpl})).weightsDeleted,false)
 await assert.rejects(synthesizeLocalService({cfg:{localTtsBaseUrl:'https://public.example'},req,reference,fetchImpl}),/loopback/);assert.equal(calls.length,2)
})
test('F5 health/model presence does not mark inference ready until decoded speech succeeds',async()=>{
 const engine=new F5Engine({modelUid:'fixture-f5',reference,resolveKey:async()=> 'fixture',fetchImpl:async(_url,init)=>init.method==='POST'?new Response(bytes):Response.json({data:[{id:'fixture-f5'}]})})
 assert.equal(await engine.ping(),true);assert.equal(engine.isRuntimeAvailable(),false);assert.ok((await engine.synthesize('Hello.')).equals(bytes));assert.equal(engine.isRuntimeAvailable(),true)
})
test('segmented local dialogue retains a different reference recording for each speaker',async()=>{
 const ids=['12345678-1234-1234-1234-123456789abc','12345678-1234-1234-1234-123456789def'],sent=[]
 const result=await synthesizeDialogue({speakers:[{id:'A',voice:'',referenceAsset:ids[0]},{id:'B',voice:'',referenceAsset:ids[1]}],turns:[{speaker:'A',text:'One.'},{speaker:'B',text:'Two.'}]},{chain:[{provider:'local-tts',model:'f5-local'}]},undefined,async(_text,cfg)=>{sent.push(cfg.chain[0].referenceAsset);return {audio:bytes,mime:'audio/wav'}})
 assert.deepEqual(sent,ids);assert.equal(result.dialogueMode,'segments');assert.equal(result.timeline.length,2)
})
