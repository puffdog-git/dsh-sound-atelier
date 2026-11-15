import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {createReadStream} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {Readable} from 'node:stream'
import {createHash} from 'node:crypto'
import yazl from 'yazl'
import {createLocalModelRuntime} from '../lib/engines/local-model-runtime.js'
import {createUsageLedger} from '../lib/usage-ledger.js'
import {createApprovalNotifications} from '../lib/approval-notifications.js'
import {createVoiceModels} from '../lib/voice-models.js'
import {publicAddress} from '../lib/public-download.js'
import {rvcControls,createRvcRuntime} from '../lib/engines/rvc-runtime.js'
import {hostFixture} from './host-fixture.mjs'
import {audioResult} from '../lib/providers/controls.js'

const cfg={localTtsBaseUrl:'http://127.0.0.1:9997',localTtsIdleSeconds:5},sleep=ms=>new Promise(r=>setTimeout(r,ms))
async function tmp(){const root=await fs.mkdtemp(path.join(os.tmpdir(),'tts-stage3-'));return {root,close:()=>fs.rm(root,{recursive:true,force:true})}}
test('owned local cancellation unloads inference before the next queued request reloads; no cross-session concurrent inference',async()=>{
 const calls=[];let time=0;const runtime=createLocalModelRuntime({operation:async r=>{calls.push(r.action);return r.action==='list'?{data:[]}:{model_uid:'model'}},managementToken:async()=>'',now:()=>time,tickMs:100000})
 try{await runtime.launch(cfg,{name:'F5-TTS',uid:'model'});const stop=new AbortController();let entered=false
 const first=runtime.run(cfg,'model',stop.signal,()=>new Promise((_,reject)=>{entered=true;stop.signal.addEventListener('abort',()=>reject(Error('cancelled')))}));while(!entered)await sleep(1)
 const second=runtime.run(cfg,'model',undefined,async()=>Buffer.from('second'));stop.abort();await assert.rejects(first);assert.equal((await second).toString(),'second');assert.deepEqual(calls,['list','launch','unload','launch']);assert.equal(runtime.status().models[0].state,'verified');time=6000;await runtime.sweep();assert.equal(runtime.status().models[0].state,'unloaded')
 }finally{runtime.close()}
})
test('external local models are never unloaded by cancellation or the idle sweeper',async()=>{
 const calls=[],controller=new AbortController(),runtime=createLocalModelRuntime({operation:async r=>calls.push(r.action),managementToken:async()=>'',tickMs:100000})
 try{const p=runtime.run(cfg,'external',controller.signal,async()=>{controller.abort();throw Error('aborted')});await assert.rejects(p);await runtime.sweep();assert.deepEqual(calls,[]);assert.equal(runtime.status().events[0].type,'external-transport-cancelled')}finally{runtime.close()}
})
test('cancelled queued model request never unloads another session or invokes its own synthesis',async()=>{
 const runtime=createLocalModelRuntime({operation:async()=>({data:[]}),managementToken:async()=>'',tickMs:100000});let release,called=false
 try{await runtime.launch(cfg,{name:'N',uid:'uid'});const first=runtime.run(cfg,'uid',undefined,()=>new Promise(r=>release=r));while(!release)await sleep(1);const controller=new AbortController(),second=runtime.run(cfg,'uid',controller.signal,async()=>{called=true});controller.abort();release('first');assert.equal(await first,'first');await assert.rejects(second);assert.equal(called,false);assert.equal(runtime.status().events.filter(e=>e.type==='owned-model-unloaded').length,0)}finally{runtime.close()}
})
test('usage ledger persists classified estimates across restarts and months without text, keys or cache charges',async()=>{
 const f=await tmp();let now=new Date('2026-11-12Z');try{const ledger=createUsageLedger({root:f.root,now:()=>now});await ledger.record({provider:'google-cloud',voice:'cmn-CN-Wavenet-A',text:'中文😀',submitted:true,success:true});await ledger.record({provider:'google-cloud',voice:'cmn-CN-Wavenet-A',text:'secret text',submitted:true,cacheHit:true});await ledger.record({provider:'google-cloud',voice:'en-US-Neural2-A',text:'failed',submitted:true,success:false});now=new Date('2026-12-01Z');await ledger.record({provider:'edge',text:'December',submitted:true,success:true});const snap=await createUsageLedger({root:f.root,now:()=>now}).snapshot();assert.equal(snap.estimated,true);assert.equal(snap.months['2026-11']['google-cloud:WaveNet'].submittedCharacters,3);assert.equal(snap.months['2026-11']['google-cloud:Neural2'].successfulCharacters,0);assert.equal(snap.months['2026-12']['edge:all'].requests,1);assert.ok(!JSON.stringify(snap).includes('secret text'))}finally{await f.close()}
})
test('approval notifications distinguish asked/decided, IDs, sessions and idle policy independent of auto-read',()=>{
 const n=createApprovalNotifications(),cfg={announceApproval:true,announceApprovalDecided:true,speakReplies:false,approvalText:'需要批准'};const event={type:'approval/asked',data:{approvalId:'a',toolName:'tool'}}
 assert.equal(n.accept('s',event,cfg).policy,'interrupt');assert.equal(n.accept('s',event,cfg),null);assert.equal(n.accept('other',event,cfg).policy,'interrupt');assert.equal(n.accept('s',{type:'approval/decided',data:{approvalId:'a'}},cfg).policy,'idle-only');assert.equal(n.accept('x',event,{announceApproval:false}),null)
})
test('raw Markdown mode keeps literal source while cleaned mode removes Markdown',async()=>{
 const f=await hostFixture({textMode:'raw'},()=>({edge:async()=>({ok:true,provider:'edge',mime:'audio/wav',audio:audioResult('edge',Buffer.alloc(100),'pcm').audio})}));try{const raw='**原始** `code`';const res=await f.tools[0].execute({text:raw},{session:{id:'raw'}});assert.equal(res.ok,true);assert.equal((await f.read('/dsh-tts/pending')).items.find(i=>i.audioBase64).text,raw)}finally{f.close()}
})
test('model files are immutable by ID, hash-verified before loading and separate from reference assets',async()=>{
 const f=await tmp(),store=createVoiceModels({root:f.root});try{await assert.rejects(store.importStream(Readable.from(['weights']),{kind:'pth',name:'voice'}),/trusted/);const a=await store.importStream(Readable.from(['weights']),{kind:'pth',name:'voice',trusted:true}),b=await store.importStream(Readable.from(['weights2']),{kind:'pth',name:'voice',trusted:true});assert.notEqual(a.id,b.id);const info=await store.file(a.id);await fs.appendFile(info.path,'bad');await assert.rejects(store.file(a.id),/changed/);assert.equal((await store.rename(b.id,'new')).name,'new');await store.remove(a.id);assert.equal((await store.list()).length,1);await assert.rejects(store.get('../outside'),/not found/)}finally{await f.close()}
})
test('portable voice packs round-trip model/index with SHA256 and no code or arbitrary paths',async()=>{
 const f=await tmp(),store=createVoiceModels({root:f.root});let zip;try{const m=await store.importStream(Readable.from(['weights']),{kind:'pth',name:'voice',trusted:true}),i=await store.importStream(Readable.from(['index']),{kind:'index',name:'index',trusted:true});zip=await store.exportPack(m.id,i.id);const result=await store.importPack(createReadStream(zip.path),{trusted:true});assert.equal(result.models.length,2);assert.equal(result.models.find(r=>r.kind==='pth').sha256,m.sha256);assert.equal(result.models.find(r=>r.kind==='index').sha256,i.sha256)}finally{await zip?.cleanup();await f.close()}
})
test('voice-pack archive rejects traversal, executable entries, symlinks and checksum substitution',async()=>{
 const f=await tmp(),store=createVoiceModels({root:f.root});try{for(const[name,options]of [['run.py',{}],['model.pth',{mode:0o120777}]]){const z=new yazl.ZipFile();z.addBuffer(Buffer.from('unsafe'),name,options);z.end();await assert.rejects(store.importPack(z.outputStream,{trusted:true}),/Unsafe/)}const z=new yazl.ZipFile();z.addBuffer(Buffer.from(JSON.stringify({schema:'dsh-tts-voicepack/1',files:[{kind:'pth',name:'model.pth',sha256:'a'.repeat(64)}]})),'manifest.json');z.addBuffer(Buffer.from('bad'),'model.pth');z.end();await assert.rejects(store.importPack(z.outputStream,{trusted:true}),/SHA256/);assert.deepEqual(await store.list(),[])}finally{await f.close()}
})
test('schema-2 voice registry supports relative URLs, index variants, SHA pins and installation reuse',async()=>{
 const f=await tmp(),hash=createHash('sha256').update('model').digest('hex'),indexHash=createHash('sha256').update('index').digest('hex');let calls=0
 const store=createVoiceModels({root:f.root,getJson:async()=>({schema:2,packs:[{id:'pack',name:'Pack',version:'1',model:{url:'model.pth',sha256:hash},indexes:[{id:'compact',url:'compact.index',sha256:indexHash}]}]}),download:async(url,file)=>{calls++;await fs.writeFile(file,url.endsWith('.pth')?'model':'index')}})
 try{const a=await store.install({url:'https://registry.example/manifest.json',packId:'pack',indexId:'compact',trusted:true});assert.equal(a.model.kind,'pth');assert.equal(a.index.kind,'index');assert.equal(calls,2);const b=await store.install({url:'https://registry.example/manifest.json',packId:'pack',indexId:'compact',trusted:true});assert.equal(b.skipped,true);assert.equal(calls,2)}finally{await f.close()}
})
test('public registries cannot access private or loopback destinations and RVC controls are bounded',()=>{
 for(const ip of ['127.0.0.1','10.1.2.3','192.168.1.2','172.31.1.2','169.254.169.254','::1','::ffff:127.0.0.1','fc00::1','fe80::1'])assert.equal(publicAddress(ip),false,ip);assert.equal(publicAddress('8.8.8.8'),true);assert.throws(()=>rvcControls({rvcOptions:'{"protect":1}'}),/Invalid/);assert.throws(()=>rvcControls({rvcOptions:'{"f0_file":"secret"}'}),/Unsupported/)
})
test('RVC is an audio postprocessor with exact model selection, no-index mode and invalidated timestamps',async()=>{
 const audio=audioResult('edge',Buffer.alloc(4800),'pcm',24000).audio,requests=[];const runtime=createRvcRuntime({models:{file:async()=>({record:{id:'model',kind:'pth'},path:'/trusted/model.pth'})},fetchImpl:async(url,init)=>{requests.push({url,init});return Response.json(url.endsWith('/health')?{ok:true,atomic_model_selection:true}:{audio_base64:audio.toString('base64')})}})
 try{const out=await runtime.convert({provider:'edge',audio,timing:{words:[]}}, {rvcManaged:false,rvcModelAsset:'model'},undefined);assert.equal(out.provider,'edge');assert.equal(out.mime,'audio/wav');assert.equal(out.timing,undefined);const body=JSON.parse(requests.at(-1).init.body);assert.equal(body.params.index_rate,0);assert.equal(body.model,'/trusted/model.pth');assert.equal(body.trim_silence,false)}finally{await runtime.close()}
})
