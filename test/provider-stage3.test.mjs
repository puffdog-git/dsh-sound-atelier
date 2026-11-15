import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { synthesizeMiniMax } from '../lib/providers/minimax.js';
import { synthesizeGroq } from '../lib/providers/groq.js';
import { synthesizeCosyVoice, referenceFingerprint } from '../lib/providers/cosyvoice.js';
import { speechChunks, parsePcmWav, joinPcmWavs, readAudioBody } from '../lib/providers/audio.js';
import { audioResult } from '../lib/providers/controls.js';
import { makeProviders } from '../lib/providers.js';
import { createCatalogService } from '../lib/catalog.js';
import { needsApiKey, keyEnvName, pendingKeyWrites } from '../lib/keys.js';

const wave=(n=16,rate=24000)=>audioResult('fixture',Buffer.alloc(n),'pcm',rate).audio;
const request={text:'你好，今天過得如何？',models:{},voices:{},role:'reply'};
const miniResponse=(audio=Buffer.alloc(16),extra={})=>Response.json({base_resp:{status_code:0},data:{status:2,audio:audio.toString('hex')},...extra});

test('MiniMax native HTTP supports current models, emotion, tuning, effects, normalization and hex PCM',async()=>{
 let call;const out=await synthesizeMiniMax({cfg:{providerOptions:JSON.stringify({minimax:{format:'pcm',sampleRate:24000,speed:1.2,vol:.8,pitch:3,emotion:'sad',normalization:'quality'}})},req:{...request,models:{minimax:'speech-2.8-turbo'},voices:{minimax:'my-account-voice'}},key:'fixture-key',fetchImpl:async(url,options)=>{call={url,...options,body:JSON.parse(options.body)};return miniResponse();}});
 assert.equal(call.url,'https://api.minimax.io/v1/t2a_v2');assert.equal(call.headers.authorization,'Bearer fixture-key');assert.equal(call.redirect,'error');assert.equal(call.body.model,'speech-2.8-turbo');assert.equal(call.body.text,request.text);assert.deepEqual(call.body.voice_setting,{voice_id:'my-account-voice',speed:1.2,vol:.8,pitch:3,emotion:'sad'});assert.equal(call.body.output_format,'hex');assert.equal(call.body.text_normalization_mode,'quality');assert.equal(call.body.audio_setting.sample_rate,24000);assert.equal(out.mime,'audio/wav');assert.equal(parsePcmWav(out.audio).pcm.length,16);
 let body;await synthesizeMiniMax({cfg:{providerOptions:'{"minimax":{"modifyPitch":-20,"intensity":10,"timbre":5,"soundEffects":"robotic"}}'},req:request,key:'fixture-key',fetchImpl:async(_,opts)=>{body=JSON.parse(opts.body);return miniResponse();}});assert.deepEqual(body.voice_modify,{pitch:-20,intensity:10,timbre:5,sound_effects:'robotic'});assert.equal(body.model,'speech-2.8-hd');
});

test('MiniMax validates unsupported combinations before a charged request',async()=>{
 for(const [options,model] of [[{emotion:'whisper'},'speech-2.8-hd'],[{emotion:'fluent'},'speech-02-hd'],[{vol:0}], [{pitch:.5}], [{sampleRate:12345}], [{format:'pcm',timbre:1}], [{arbitrary_key:'secret'}]]){
  await assert.rejects(synthesizeMiniMax({cfg:{providerOptions:JSON.stringify({minimax:options})},req:{...request,models:{minimax:model}},key:'key',fetchImpl:()=>assert.fail('must validate before fetch')}));
 }
 await synthesizeMiniMax({cfg:{providerOptions:'{"minimax":{"emotion":"whisper"}}'},req:{...request,models:{minimax:'speech-2.6-hd'}},key:'key',fetchImpl:async()=>miniResponse()});
});

test('MiniMax rejects HTTP-200 API errors, partial audio, invalid hex and wrong returned formats without leaking upstream details',async()=>{
 const cases=[{base_resp:{status_code:1004,status_msg:'SECRET-FROM-UPSTREAM'}},{base_resp:{status_code:0},data:{status:1,audio:'abcd'}},{base_resp:{status_code:0},data:{status:2,audio:'nothex'}},{base_resp:{status_code:0},data:{status:2,audio:'abc'}},{base_resp:{status_code:0},data:{status:2,audio:'abcd'},extra_info:{audio_format:'wav'}}];
 for(const data of cases)await assert.rejects(synthesizeMiniMax({cfg:{},req:request,key:'key',fetchImpl:async()=>Response.json(data)}),e=>!e.message.includes('SECRET'));
 await assert.rejects(synthesizeMiniMax({cfg:{},req:request,key:'key',fetchImpl:async()=>new Response('SECRET',{status:401})}),/MiniMax HTTP 401/);
});

test('MiniMax auto preserves CLI without a key; HTTP errors never fall back to CLI',async()=>{
 let cli=0,http=0;const deps={cfg:{},resolveKey:async()=>'',minimaxSpeak:async()=>{cli++;return {audio:wave(),mime:'audio/wav'};},fetchImpl:async()=>{http++;return new Response('',{status:503});}};
 assert.equal((await makeProviders(deps,request).minimax()).ok,true);assert.equal(cli,1);assert.equal(http,0);
 deps.resolveKey=async()=>'key';await assert.rejects(makeProviders(deps,request).minimax(),/503/);assert.equal(cli,1);assert.equal(http,1);
 deps.cfg={minimaxTransport:'cli'};assert.equal((await makeProviders(deps,request).minimax()).ok,true);assert.equal(cli,2);
 deps.cfg={minimaxTransport:'http'};deps.resolveKey=async()=>'';assert.equal((await makeProviders(deps,request).minimax()).ok,false);assert.equal(cli,2);
 assert.ok(needsApiKey('minimax'));assert.equal(keyEnvName({},'minimax'),'MINIMAX_API_KEY');assert.deepEqual(pendingKeyWrites({minimax:'new-key'}),[{provider:'minimax',value:'new-key'}]);
});

test('MiniMax live catalog includes system, cloned and designed account voices',async()=>{
 const service=createCatalogService({resolveKey:async()=>'key',fetchImpl:async(url,opts)=>{assert.equal(url,'https://api.minimax.io/v1/get_voice');assert.equal(opts.method,'POST');assert.deepEqual(JSON.parse(opts.body),{voice_type:'all'});return Response.json({base_resp:{status_code:0},system_voice:[{voice_id:'system',voice_name:'系統聲音'}],voice_cloning:[{voice_id:'cloned'}],voice_generation:[{voice_id:'designed'}]});}});
 const out=await service.discover('minimax',{});assert.equal(out.sources.voices,'live');assert.deepEqual(out.voices.map(v=>v.id),['system','cloned','designed']);assert.equal(out.voices[0].name,'系統聲音');assert.ok(out.models.some(m=>m.id==='speech-2.8-hd'));
});

test('Groq splits Unicode and vocal directions within 200 characters and merges WAV samples exactly',async()=>{
 const text=('Hello world! [laughing] 今天的心情真好😀 '.repeat(25));const sent=[];
 const out=await synthesizeGroq({cfg:{speechInstruction:'cheerful'},req:{...request,text},key:'key',fetchImpl:async(_,opts)=>{const body=JSON.parse(opts.body);sent.push(body);return new Response(wave());}});
 assert.ok(sent.length>2);assert.ok(sent.every(b=>b.input.length<=200&&b.input.startsWith('[cheerful] ')));assert.equal(sent.map(b=>b.input.slice('[cheerful] '.length)).join(''),text);assert.equal(parsePcmWav(out.audio).pcm.length,sent.length*16);
 for(const b of sent)assert.ok(!/[\uD800-\uDBFF]$/.test(b.input));
 assert.ok(speechChunks('word '.repeat(150),200).every(s=>s.length<=200));assert.throws(()=>speechChunks('['+'a'.repeat(250)+']',200),/direction/);
});

test('Groq selects Arabic voices without English directions; invalid voice and retired model fail before fetch',async()=>{
 let body;await synthesizeGroq({cfg:{speechInstruction:'cheerful'},req:{...request,models:{groq:'canopylabs/orpheus-arabic-saudi'}},key:'key',fetchImpl:async(_,opts)=>{body=JSON.parse(opts.body);return new Response(wave());}});assert.equal(body.voice,'fahad');assert.equal(body.input,request.text);
 for(const req of [{...request,models:{groq:'canopylabs/orpheus-arabic-saudi'},voices:{groq:'hannah'}},{...request,models:{groq:'playai-tts'}}])await assert.rejects(synthesizeGroq({cfg:{},req,key:'key',fetchImpl:()=>assert.fail('must not fetch')}));
 const service=createCatalogService({resolveKey:async()=>''});const out=await service.discover('groq',{}, {model:'canopylabs/orpheus-arabic-saudi'});assert.ok(out.voices.some(v=>v.id==='fahad'));assert.ok(!out.voices.some(v=>v.id==='hannah'));
});

test('Groq late errors, incompatible sample rates and abort reject the whole utterance',async()=>{
 for(const failure of ['http','format','abort']){
  let count=0;const controller=new AbortController();await assert.rejects(synthesizeGroq({cfg:{},req:{...request,text:'word '.repeat(110)},key:'key',signal:controller.signal,fetchImpl:async()=>{
   count++;if(count===2){if(failure==='http')return new Response('',{status:429});if(failure==='abort')controller.abort();return new Response(wave(16,16000));}return new Response(wave());
  }}));assert.ok(count>=2);if(failure==='abort')assert.equal(count,2);
 }
});

test('WAV merger strips extra headers and rejects malformed or truncated WAVs',()=>{
 assert.equal(parsePcmWav(joinPcmWavs([wave(),wave()])).pcm.length,32);
 const incomplete=wave().subarray(0,46);assert.throws(()=>joinPcmWavs([incomplete]),/Truncated/);assert.throws(()=>joinPcmWavs([wave(),wave(16,16000)]),/incompatible/);assert.throws(()=>parsePcmWav(Buffer.from('not audio')),/WAV/);
});

test('CosyVoice sends official multipart form and wraps raw PCM at the configured rate',async()=>{
 let call;const out=await synthesizeCosyVoice({cfg:{cosyvoiceSampleRate:22050},req:request,fetchImpl:async(url,opts)=>{call={url,...opts};return new Response(Buffer.from([0x5b,0,0,0,0,0]));}});
 assert.match(call.url,/\/inference_sft$/);assert.ok(call.body instanceof FormData);assert.equal(call.body.get('tts_text'),request.text);assert.equal(call.body.get('spk_id'),'中文女');assert.equal(call.headers,undefined);assert.equal(out.mime,'audio/wav');assert.equal(out.audio.readUInt32LE(24),22050);assert.equal(parsePcmWav(out.audio).pcm.length,6);
});

test('CosyVoice falls back only for absent SFT endpoints and never labels JSON errors as WAV',async()=>{
 const calls=[];const out=await synthesizeCosyVoice({cfg:{},req:request,fetchImpl:async(url,opts)=>{calls.push({url,opts});return calls.length===1?new Response('',{status:404}):new Response(wave(),{headers:{'content-type':'audio/wav'}});}});assert.equal(calls.length,2);assert.match(calls[1].url,/\/tts$/);assert.equal(JSON.parse(calls[1].opts.body).text,request.text);assert.equal(out.mime,'audio/wav');
 for(const kind of ['network','500','422','json']){let count=0;await assert.rejects(synthesizeCosyVoice({cfg:{},req:request,fetchImpl:async()=>{count++;if(kind==='network')throw Error('network');if(kind==='json')return Response.json({error:'not audio'});return new Response('',{status:Number(kind)});}}));assert.equal(count,1);}
});

test('CosyVoice reference modes upload validated WAV, instructions and transcripts separately',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'tts-reference-test-')),file=path.join(dir,'reference.wav');await fs.writeFile(file,wave());
 try{
  for(const mode of ['instruct2','zero-shot','cross-lingual']){let form,url;await synthesizeCosyVoice({cfg:{cosyvoiceApiMode:'official',cosyvoiceMode:mode,cosyvoiceReferencePath:file,cosyvoiceReferenceText:'參考錄音內容',speechInstruction:'開心自然'},req:request,fetchImpl:async(u,o)=>{url=u;form=o.body;return new Response(Buffer.alloc(16));}});assert.match(url,new RegExp('inference_'+mode.replace('-','_')+'$'));assert.equal(form.get('tts_text'),request.text);assert.deepEqual(Buffer.from(await form.get('prompt_wav').arrayBuffer()),wave());assert.equal(form.has('spk_id'),false);if(mode==='instruct2')assert.equal(form.get('instruct_text'),'開心自然');if(mode==='zero-shot')assert.equal(form.get('prompt_text'),'參考錄音內容');}
  const first=await referenceFingerprint({cosyvoiceReferencePath:file});await fs.writeFile(file,wave(32));assert.notEqual(await referenceFingerprint({cosyvoiceReferencePath:file}),first);
  await fs.writeFile(file,Buffer.alloc(80));await assert.rejects(synthesizeCosyVoice({cfg:{cosyvoiceMode:'instruct2',cosyvoiceReferencePath:file,speechInstruction:'happy'},req:request,fetchImpl:()=>assert.fail('invalid reference must not upload')}),/WAV/);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('CosyVoice advanced prerequisites and cancellation fail before network work',async()=>{
 for(const cfg of [{cosyvoiceMode:'instruct2'}, {cosyvoiceMode:'zero-shot'}, {cosyvoiceApiMode:'bridge',cosyvoiceMode:'instruct'}, {cosyvoiceMode:'instruct2',speechInstruction:'happy',cosyvoiceReferencePath:'https://example.com/a.wav'}])await assert.rejects(synthesizeCosyVoice({cfg,req:request,fetchImpl:()=>assert.fail('must not fetch')}));
 const c=new AbortController();c.abort();await assert.rejects(synthesizeCosyVoice({cfg:{},req:request,signal:c.signal,fetchImpl:()=>assert.fail('must not fetch')}),/abort/i);
});

test('bounded audio reader enforces streaming limit and cancellation, not just Content-Length',async()=>{
 const huge=new Response(new ReadableStream({start(c){c.enqueue(Buffer.alloc(12));c.close();}}));await assert.rejects(readAudioBody(huge,null,10),/size limit/);
 const c=new AbortController();let cancelled=false;const hanging=new Response(new ReadableStream({start(s){s.enqueue(Buffer.alloc(2));},cancel(){cancelled=true;}}));const pending=readAudioBody(hanging,c.signal);c.abort();await assert.rejects(pending,/abort/i);assert.equal(cancelled,true);
});
