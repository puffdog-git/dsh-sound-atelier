import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { synthesizeOpenAIRealtime } from '../lib/providers/openai-realtime.js';
import { synthesizeDeepinfraQwen } from '../lib/providers/deepinfra.js';
import { readReferenceDataUrl } from '../lib/providers/reference-audio.js';
import { makeProviders } from '../lib/providers.js';
import { audioResult } from '../lib/providers/controls.js';
import { parsePcmWav } from '../lib/providers/audio.js';
import { createCatalogService } from '../lib/catalog.js';
const req={text:'你好，今天好嗎？',models:{openai:'gpt-realtime-2.1-mini'},voices:{},role:'reply'};
const pcm=Buffer.alloc(2400),wav=audioResult('fixture',pcm,'pcm').audio;
const done=(text=req.text)=>({type:'response.done',response:{id:'response1',status:'completed',output:[{type:'message',content:[{type:'audio',transcript:text}]}]}});
function fakeConnect(events, capture={}) {
 return (url,options)=>{
  capture.url=url;capture.options=options;capture.sent=[];const s=new EventEmitter();s.readyState=1;s.terminate=()=>{capture.terminated=(capture.terminated||0)+1;s.readyState=3;};
  const emit=e=>{if(s.readyState===1)s.emit('message',Buffer.from(typeof e==='string'?e:JSON.stringify(e)));};
  s.send=data=>{const event=JSON.parse(data);capture.sent.push(event);queueMicrotask(()=>{
   if(event.type==='session.update')emit({type:'session.updated'});
   if(event.type==='response.create'){emit({type:'response.created',response:{id:'response1'}});for(const e of events)emit(e);}
  });};
  queueMicrotask(()=>emit({type:'session.created'}));return s;
 };
}
const delta={type:'response.output_audio.delta',response_id:'response1',delta:pcm.toString('base64')};
const audioDone={type:'response.output_audio.done',response_id:'response1'};

test('OpenAI Realtime sends a stateless transcript and verifies completed audio before producing WAV',async()=>{
 const capture={};const out=await synthesizeOpenAIRealtime({cfg:{speechInstruction:'溫柔'},req,key:'fixture-key',connect:fakeConnect([delta,audioDone,done()],capture)});
 assert.match(capture.url,/^wss:\/\/api.openai.com\/v1\/realtime\?model=gpt-realtime-2.1-mini$/);assert.equal(capture.options.headers.Authorization,'Bearer fixture-key');assert.equal(capture.options.followRedirects,false);
 const session=capture.sent[0].session;assert.equal(session.audio.input.turn_detection,null);assert.deepEqual(session.audio.output.format,{type:'audio/pcm',rate:24000});assert.match(session.instructions,/Do not answer/);assert.match(session.instructions,/溫柔/);
 assert.equal(capture.sent[1].response.conversation,'none');assert.equal(capture.sent[1].response.input[0].content[0].text,req.text);assert.equal(capture.terminated,1);assert.equal(parsePcmWav(out.audio).pcm.length,pcm.length);
});

test('OpenAI Realtime rejects paraphrases, partial/failing responses and malformed audio without returning partial speech',async()=>{
 for(const events of [[delta,audioDone,done('我很好，謝謝你！')],[delta,done()],[delta,audioDone,{...done(),response:{...done().response,status:'incomplete'}}],[{...delta,delta:'not base64!'},audioDone,done()],[delta,{type:'error',error:{message:'SECRET-API-KEY'}}],[delta,audioDone,{...done(),response:{...done().response,id:'wrong'}}]]){
  const capture={};await assert.rejects(synthesizeOpenAIRealtime({cfg:{timeoutMs:100},req,key:'key',connect:fakeConnect(events,capture)}),e=>!e.message.includes('SECRET'));assert.equal(capture.terminated,1);
 }
 await assert.rejects(synthesizeOpenAIRealtime({cfg:{},req:{...req,text:'A part of it.'},key:'key',connect:fakeConnect([delta,audioDone,done('Apart of it.')])}),/does not match/);
});

test('OpenAI Realtime handles malformed frames, timeout, disconnect and cancellation',async()=>{
 for(const events of [['{broken'],[]])await assert.rejects(synthesizeOpenAIRealtime({cfg:{timeoutMs:15},req,key:'key',connect:fakeConnect(events)}),/JSON|timed out/);
 await assert.rejects(synthesizeOpenAIRealtime({cfg:{},req,key:'key',connect:()=>{const s=new EventEmitter();s.terminate=()=>{};queueMicrotask(()=>s.emit('close'));return s;}}),/closed/);
 const c=new AbortController();const capture={};const p=synthesizeOpenAIRealtime({cfg:{},req,key:'key',signal:c.signal,connect:fakeConnect([],capture)});c.abort();await assert.rejects(p,/abort/i);assert.equal(capture.terminated,1);
});

test('OpenAI Realtime validates legacy format, speed and voice before opening a connection; custom voice IDs use objects',async()=>{
 for(const [cfg,voice]of [[{providerOptions:'{"openai":{"format":"mp3"}}'},'alloy'],[{providerOptions:'{"openai":{"speed":1.3}}'},'alloy'],[{},'nova']])await assert.rejects(synthesizeOpenAIRealtime({cfg,req:{...req,voices:{openai:voice}},key:'key',connect:()=>assert.fail('must validate first')}));
 const capture={};await synthesizeOpenAIRealtime({cfg:{},req:{...req,voices:{openai:'voice_custom123'}},key:'key',connect:fakeConnect([delta,audioDone,done()],capture)});assert.deepEqual(capture.sent[0].session.audio.output.voice,{id:'voice_custom123'});
});

test('OpenAI Realtime uses real loopback WebSocket handshake, ordered session setup and close cleanup',async()=>{
 const server=createServer(),wss=new WebSocketServer({server});let seen=[];
 wss.on('connection',(ws,request)=>{assert.equal(request.headers.authorization,'Bearer loopback-fixture');assert.match(request.url,/\/v1\/realtime\?model=/);ws.send(JSON.stringify({type:'session.created'}));ws.on('message',raw=>{const event=JSON.parse(raw);seen.push(event.type);if(event.type==='session.update')ws.send(JSON.stringify({type:'session.updated'}));if(event.type==='response.create')for(const e of [{type:'response.created',response:{id:'response1'}},delta,audioDone,done()])ws.send(JSON.stringify(e));});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));try{const out=await synthesizeOpenAIRealtime({cfg:{openaiBaseUrl:'http://127.0.0.1:'+server.address().port+'/v1'},req,key:'loopback-fixture'});assert.equal(out.mime,'audio/wav');assert.deepEqual(seen,['session.update','response.create']);}finally{await new Promise(r=>wss.close(r));await new Promise(r=>server.close(r));}
});

test('MiMo voiceclone sends reference data URI and mood separately, while design never polishes the supplied transcript',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'mimo-reference-')),file=path.join(dir,'reference.wav');await fs.writeFile(file,wav);
 try{
  let body;const providers=makeProviders({cfg:{mimoReferencePath:file,mimoInstruction:'開心',mimoFormat:'pcm16'},resolveKey:async()=>'key',fetchImpl:async(_url,options)=>{body=JSON.parse(options.body);return Response.json({choices:[{finish_reason:'stop',message:{audio:{data:pcm.toString('base64')}}}]});}}, {...req,models:{mimo:'mimo-v2.5-tts-voiceclone'}});
  const out=await providers.mimo();assert.equal(body.audio.voice,'data:audio/wav;base64,'+wav.toString('base64'));assert.equal(body.messages[0].content,'開心');assert.equal(body.messages[1].content,req.text);assert.equal(parsePcmWav(out.audio).pcm.length,pcm.length);
  const design=makeProviders({cfg:{mimoVoiceDesign:'低沉男聲'},resolveKey:async()=>'key',fetchImpl:async(_url,options)=>{body=JSON.parse(options.body);return Response.json({choices:[{message:{audio:{data:pcm.toString('base64')}}}]});}}, {...req,models:{mimo:'mimo-v2.5-tts-voicedesign'}});await design.mimo();assert.equal(body.audio.optimize_text_preview,false);assert.equal(body.audio.voice,undefined);
  await fs.writeFile(file,Buffer.alloc(100));await assert.rejects(readReferenceDataUrl(file),/WAV or MP3/);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('MiMo reference limit is applied to encoded bytes and remote paths are never fetched',async()=>{
 await assert.rejects(readReferenceDataUrl('https://example.com/reference.wav'),/local/);
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'mimo-size-')),file=path.join(dir,'too-large.wav');await fs.writeFile(file,Buffer.alloc(8*1024*1024));try{await assert.rejects(readReferenceDataUrl(file),/10 MB/);}finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('DeepInfra Qwen native API uses instruct and account voice IDs without changing the spoken text',async()=>{
 let body,url;const out=await synthesizeDeepinfraQwen({cfg:{speechInstruction:'sad',providerOptions:'{"deepinfra":{"language":"Chinese"}}'},req:{...req,models:{deepinfra:'Qwen/Qwen3-TTS'},voices:{deepinfra:'my-cloned-id'}},key:'key',fetchImpl:async(u,opts)=>{url=u;body=JSON.parse(opts.body);return Response.json({inference_status:{status:'succeeded'},output_format:'wav',audio:'data:audio/wav;base64,'+wav.toString('base64')});}});
 assert.equal(url,'https://api.deepinfra.com/v1/inference/Qwen/Qwen3-TTS');assert.equal(body.input,req.text);assert.equal(body.instruct,'sad');assert.equal(body.voice,'my-cloned-id');assert.equal(body.language,'Chinese');assert.deepEqual(out.audio,wav);
});

test('DeepInfra VoiceDesign requires a description and does not pass unsupported instruct or speaker fields',async()=>{
 const input={...req,models:{deepinfra:'Qwen/Qwen3-TTS-VoiceDesign'}};await assert.rejects(synthesizeDeepinfraQwen({cfg:{},req:input,key:'key',fetchImpl:()=>assert.fail('must validate first')}),/description/);
 let body;await synthesizeDeepinfraQwen({cfg:{deepinfraVoiceDesign:'Low male voice',speechInstruction:'warm'},req:input,key:'key',fetchImpl:async(_,opts)=>{body=JSON.parse(opts.body);return Response.json({inference_status:{status:'succeeded'},audio:wav.toString('base64')});}});assert.match(body.voice,/Low male voice/);assert.match(body.voice,/warm/);assert.equal(body.instruct,undefined);
});

test('DeepInfra rejects uncompleted inference, URLs disguised as audio, bad encoding and unknown PCM rate',async()=>{
 for(const data of [{inference_status:{status:'running'},audio:wav.toString('base64')},{inference_status:{status:'succeeded'},audio:'https://evil.example/audio'},{inference_status:{status:'succeeded'},audio:'!!!'}])await assert.rejects(synthesizeDeepinfraQwen({cfg:{},req:{...req,models:{deepinfra:'Qwen/Qwen3-TTS'}},key:'key',fetchImpl:async()=>Response.json(data)}));
 await assert.rejects(synthesizeDeepinfraQwen({cfg:{providerOptions:'{"deepinfra":{"format":"pcm"}}'},req:{...req,models:{deepinfra:'Qwen/Qwen3-TTS'}},key:'key',fetchImpl:()=>assert.fail('must validate first')}),/pcmSampleRate/);
});

test('new provider catalogs distinguish Realtime voices, MiMo reference mode and Qwen voices',async()=>{
 const c=createCatalogService({resolveKey:async()=>''});const realtime=await c.discover('openai',{}, {model:'gpt-realtime-2.1-mini'});assert.ok(realtime.voices.some(v=>v.id==='marin'));assert.ok(!realtime.voices.some(v=>v.id==='nova'));
 const mimo=await c.discover('mimo',{}, {model:'mimo-v2.5-tts-voiceclone'});assert.deepEqual(mimo.voices,[]);assert.ok(mimo.models.some(v=>v.id.endsWith('voiceclone')));
 const qwen=await c.discover('deepinfra',{}, {model:'Qwen/Qwen3-TTS'});assert.ok(qwen.voices.some(v=>v.id==='Vivian'));assert.ok(!qwen.voices.some(v=>v.id==='af_bella'));
});
