import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {createSpeechService} from '../lib/speech-service.js'
import {wavDurationMs} from '../lib/audio-format.js'
import {audioResult} from '../lib/providers/controls.js'
import {hostFixture} from './host-fixture.mjs'
import {Readable} from 'node:stream'
import {EventEmitter} from 'node:events'
const wav=audioResult('fixture',Buffer.alloc(48000,2),'pcm').audio
function fixture(){let calls=0,scope;const service=createSpeechService({live:()=>({chain:[{provider:'edge',voice:'default'}],rate:1,volume:1}),resolve:async(c,r)=>{scope=r;return {...c,chain:[{provider:'edge',voice:'bound'}],_voiceResolved:true,_voiceBinding:{source:'session'}}},prepare:async(t,c,s)=>{s.throwIfAborted();return t},start:(sid,text,cfg)=>{calls++;return {promise:Promise.resolve(),text,cfg,segments:[]}},jobs:{audio:async()=>({audio:wav,mime:'audio/wav'})}});return {service,get calls(){return calls},get scope(){return scope}}}
test('neutral speech service resolves context, exports real WAV/MP3 and keeps complete data in a removable artifact',async()=>{
 const f=fixture();try{const a=await f.service.synthesize({text:'完整文字',sessionId:'session-a',format:'wav'});assert.equal(a.contentType,'audio/wav');assert.equal(f.scope.sessionId,'session-a');assert.ok(Math.abs(wavDurationMs(a.data)-1000)<1);assert.equal(a.voiceBinding.source,'session');const b=await f.service.synthesize({text:'test',format:'mp3'});assert.equal(b.contentType,'audio/mpeg');assert.ok(b.data.length>100);const file=await f.service.exportAudio({text:'export'});assert.ok((await fs.stat(file.path)).size>48000);await file.remove();await file.remove();await assert.rejects(fs.stat(file.path));await assert.rejects(f.service.synthesize({text:'too long',maxDurationMs:100}),/時長/)}finally{await f.service.close()}
})
test('delivery prerequisites and automatic opt-in are checked before synthesis, and routing remains adapter-owned',async()=>{
 const f=fixture();let allowed=false,sends=0;const unregister=f.service.registerDelivery({id:'test-transport',format:'wav',check:()=>{if(!allowed)throw Error('permission denied')},send:async(audio,context)=>{sends++;assert.equal(context.target,'test-only');assert.equal(audio.format,'wav');return {adapter:'test-transport',messageId:'intercepted'}}});try{await assert.rejects(f.service.deliver({text:'x'},'test-transport',{automatic:true}),/未啟用/);await assert.rejects(f.service.deliver({text:'x'},'test-transport',{}),/permission/);assert.equal(f.calls,0);allowed=true;const r=await f.service.deliver({text:'x'},'test-transport',{target:'test-only'});assert.equal(r.messageId,'intercepted');assert.equal(sends,1);f.service.setDeliveryEnabled('test-transport',false);await assert.rejects(f.service.deliver({text:'x'},'test-transport',{}));assert.equal(f.calls,1)}finally{unregister();await f.service.close()}
})
test('invalid formats, duration and cancelled requests do not spend synthesis requests',async()=>{const f=fixture();try{await assert.rejects(f.service.synthesize({text:'x',format:'silk'}),/支援/);await assert.rejects(f.service.synthesize({text:'x',maxDurationMs:-1}),/上限/);await assert.rejects(f.service.synthesize({text:'x',signal:AbortSignal.abort()}));assert.equal(f.calls,0)}finally{await f.service.close()}})
test('disabling an adapter cancels its pending prerequisite check before any synthesis request',async()=>{
 const f=fixture();let entered,release;const gate=new Promise(r=>release=r),ready=new Promise(r=>entered=r);f.service.registerDelivery({id:'pending',format:'wav',check:async()=>{entered();await gate},send:()=>{throw Error('must not send')}});
 try{const pending=f.service.deliver({text:'cancel before cost'},'pending',{});await ready;f.service.setDeliveryEnabled('pending',false);release();await assert.rejects(pending);assert.equal(f.calls,0)}finally{await f.service.close()}
})
test('neutral HTTP pipeline keeps Japanese and Chinese separate and applies native contextual emotion without changing global settings',async()=>{
 const captures=[],f=await hostFixture({chain:[{provider:'minimax',voice:'voice-a'}],providerOptions:'{}'},(deps,req)=>({minimax:async()=>{captures.push({cfg:deps.cfg,text:req.text});return {ok:true,provider:'minimax',mime:'audio/wav',audio:wav}}}));
 try{const body={text:'你好，今天辛苦了。',spokenText:'こんにちは。今日もお疲れさまでした。',spokenLanguage:'ja',sessionId:'session-a',speechDirection:{emotion:'sad',intensity:.7,pace:'slow'}},req=Readable.from([Buffer.from(JSON.stringify(body))]);Object.assign(req,{method:'POST',url:'/dsh-tts/synthesize',headers:{host:'127.0.0.1'},socket:{remoteAddress:'127.0.0.1'}});let status,response;const res=new EventEmitter();res.writeHead=c=>status=c;res.end=b=>response=JSON.parse(b);await f.routes.get(req.url)(req,res);assert.equal(status,200);assert.equal(response.sourceText,body.text);assert.equal(response.text,body.spokenText);assert.equal(captures.map(x=>x.text).join(''),body.spokenText);assert.equal(JSON.parse(captures[0].cfg.providerOptions).minimax.emotion,'sad');assert.equal(f.config.providerOptions,'{}');assert.equal(f.config.spokenLanguage,'original')}
 finally{f.close()}
})
