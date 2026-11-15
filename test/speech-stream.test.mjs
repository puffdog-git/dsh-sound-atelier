import test from 'node:test'
import assert from 'node:assert/strict'
import {createSpeechService} from '../lib/speech-service.js'
import {audioResult} from '../lib/providers/controls.js'
import {liveSpeechConfig} from '../lib/live-speech.js'
import {hostFixture} from './host-fixture.mjs'
import http from 'node:http'
const wav=audioResult('fixture',Buffer.alloc(4800),'pcm').audio
test('neutral HTTP PCM stream has a distinct route, completes audio, and preserves the existing SSE endpoint',async()=>{
 const f=await hostFixture({speakReplies:false},()=>({edge:async()=>({ok:true,provider:'edge',mime:'audio/wav',audio:wav})}));
 const server=http.createServer((req,res)=>{Promise.resolve(f.routes.get(new URL(req.url,'http://localhost').pathname)(req,res)).catch(()=>res.destroy())});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const base='http://127.0.0.1:'+server.address().port,config=await f.read('/dsh-tts/config');assert.notEqual(config.speechApi.streamEndpoint,'/dsh-tts/stream');const response=await fetch(base+config.speechApi.streamEndpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:'完整串流測試。'}),signal:AbortSignal.timeout(10000)});assert.equal(response.status,200);const frames=(await response.text()).trim().split('\n').map(JSON.parse);assert.equal(frames[0].type,'prepared');assert.ok(frames.some(f=>f.type==='pcm'&&Buffer.from(f.audioBase64,'base64').length));assert.equal(frames.at(-1).type,'complete');const old=await fetch(base+'/dsh-tts/stream');assert.equal(old.status,400);assert.match(await old.text(),/sessionId/)}finally{server.closeAllConnections();await new Promise(r=>server.close(r));f.close()}
})
function fixture(extra={}){let preparations=0,starts=0;const service=createSpeechService({live:()=>({chain:[{provider:'edge'}]}),resolve:async c=>c,prepare:async t=>{preparations++;return t},start:(_s,text)=>{starts++;return {text,promise:Promise.resolve(),segments:[]}},jobs:{audio:async()=>({audio:wav})},...extra});return {service,get preparations(){return preparations},get starts(){return starts}}}
test('segmented PCM begins before the rest is synthesized, prepares the whole text once and uses no export file',async()=>{
 const f=fixture();let first=false,total=0;try{const report=await f.service.streamPcm({text:'這是第一段完整語音測試。這是第二段完整語音測試。'},async pcm=>{if(!first){first=true;assert.equal(f.starts,1)}total+=pcm.length});assert.equal(report.mode,'segmented');assert.equal(f.starts,2);assert.equal(f.preparations,1);assert.equal(total,9600);assert.equal(report.durationMs,200)}finally{await f.service.close()}
})
test('a cancelled consumer stops subsequent synthesis and a duration overrun cannot be reported complete',async()=>{
 const f=fixture();try{await assert.rejects(f.service.streamPcm({text:'這是第一段完整語音測試。這是第二段完整語音測試。'},()=>{throw Error('consumer cancelled')}),/consumer cancelled/);assert.equal(f.starts,1);await assert.rejects(f.service.streamPcm({text:'超過時長。',maxDurationMs:10},()=>{}),/上限/)}finally{await f.service.close()}
})
test('native PCM failure after first audio never falls back or duplicates a synthesis request',async()=>{
 let calls=0,packets=0;const f=fixture({canNative:()=>true,nativeStream:async function*(){calls++;yield Buffer.alloc(4800);throw Error('native disconnected')}});try{await assert.rejects(f.service.streamPcm({text:'測試。'},()=>packets++),/native disconnected/);assert.equal(calls,1);assert.equal(packets,1);assert.equal(f.starts,0)}finally{await f.service.close()}
})
test('native streaming retains the selected credential, endpoint and reference while forcing its transport options',()=>{
 const c=liveSpeechConfig({chain:[{provider:'fish',model:'s2-pro',referenceAsset:'reference',keyEnv:'SECOND_SLOT',options:'{"format":"mp3"}'}],providerOptions:'{}'},'reply');assert.equal(c.chain[0].referenceAsset,'reference');assert.equal(c.chain[0].keyEnv,'SECOND_SLOT');assert.equal(c.chain[0].options,'');assert.equal(JSON.parse(c.providerOptions).fish.format,'pcm')
})
