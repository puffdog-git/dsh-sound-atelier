import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import {EventEmitter} from 'node:events'
import {PassThrough,Writable} from 'node:stream'
import {createMaintenanceJobs} from '../lib/maintenance-jobs.js'
import {localManagementFetch} from '../lib/providers/local-http.js'
import {createNativeRuntime,nativeSpec} from '../lib/engines/native-runtime.js'
import {localOptions,synthesizeLocalService} from '../lib/providers/local-service.js'
import {localLaunchProfile} from '../lib/local-launch-profile.js'
import {createLocalModelRuntime} from '../lib/engines/local-model-runtime.js'
import {createChunkPlanner} from '../lib/adaptive-chunks.js'
import {audioResult} from '../lib/providers/controls.js'
const wait=()=>new Promise(r=>setTimeout(r,5)),wav=audioResult('test',Buffer.alloc(2400,20),'pcm').audio

test('maintenance jobs retain bounded progress, distinguish failure and cancel the owned action',async()=>{
 const jobs=createMaintenanceJobs();let started=false
 try{const j=jobs.start('test',async(signal,log)=>{started=true;log('Bearer abc123');await new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('cancelled'))))});while(!started)await wait();assert.equal(jobs.list()[0].lines[0],'[redacted]');jobs.cancel(j.id);while(jobs.list()[0].state==='cancelling')await wait();assert.equal(jobs.list()[0].state,'cancelled');jobs.start('fail',async()=>{throw Error('failed')});await wait();assert.equal(jobs.list()[0].state,'failed')}finally{jobs.close()}
})
test('management transport accepts HTTP 204 without constructing an invalid Response body and rejects redirects',async()=>{
 const server=http.createServer((req,res)=>{res.writeHead(req.url==='/redirect'?302:204,{location:'/elsewhere'});res.end()});await new Promise(r=>server.listen(0,'127.0.0.1',r));const root='http://127.0.0.1:'+server.address().port
 try{assert.equal((await localManagementFetch(root)).status,204);await assert.rejects(localManagementFetch(root+'/redirect'),/redirect/);await assert.rejects(localManagementFetch('http://192.168.1.1'),/loopback/)}finally{server.closeAllConnections();await new Promise(r=>server.close(r))}
})
test('native worker serializes sessions and rejects unsupported emotion/seed instead of silently discarding controls',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tts-native-'));const exe=path.join(root,'tts-runtimes/dots/Scripts/python.exe');await fs.mkdir(path.dirname(exe),{recursive:true});await fs.writeFile(exe,'fixture');let active=0,peak=0,kills=0;const inputs=[]
 const spawnImpl=()=>{const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>{kills++;return true};child.stdin=new Writable({write(b,_enc,done){const msg=JSON.parse(b.toString());inputs.push(msg);active++;peak=Math.max(peak,active);setTimeout(()=>{active--;child.stdout.write('DSH_TTS:'+JSON.stringify({id:msg.id,ok:true,audioBase64:wav.toString('base64')})+'\n')},20);done()}});return child}
 const runtime=createNativeRuntime({root,spawnImpl}),cfg={localTtsBackend:'dots-native',localTtsDevice:'cuda:0'},reference={path:'trusted.wav',asset:{transcript:'hello'}}
 try{const [a,b]=await Promise.all([runtime.synthesize(cfg,{text:'one',role:'reply'},reference),runtime.synthesize(cfg,{text:'two',role:'reply'},reference)]);assert.equal(peak,1);assert.equal(a.audio.toString('hex'),b.audio.toString('hex'));assert.equal(runtime.status().ready,true);assert.equal(inputs[0].spec.kind,'dots');await assert.rejects(runtime.synthesize({...cfg,speechInstruction:'sad'},{text:'test',role:'reply'},reference),/no free-form/);assert.throws(()=>localOptions({...cfg,providerOptions:JSON.stringify({'local-tts':{native:{seed:-1}}})},''),/nonnegative/);assert.throws(()=>nativeSpec({localTtsBackend:'index-native'},root),/confirm trusting/)}finally{await runtime.stop();await fs.rm(root,{recursive:true,force:true})}assert.equal(kills,1)
})
test('cancelled owned native synthesis stops its process and queued sessions restart independently',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tts-native-cancel-')),exe=path.join(root,'tts-runtimes/dots/Scripts/python.exe');await fs.mkdir(path.dirname(exe),{recursive:true});await fs.writeFile(exe,'fixture');let started=false,spawns=0
 const spawnImpl=()=>{const current=++spawns,child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>true;child.stdin=new Writable({write(b,_e,done){const m=JSON.parse(b.toString());started=true;if(current>1)setTimeout(()=>child.stdout.write('DSH_TTS:'+JSON.stringify({id:m.id,ok:true,audioBase64:wav.toString('base64')})+'\n'),5);done()}});return child}
 const runtime=createNativeRuntime({root,spawnImpl}),cfg={localTtsBackend:'dots-native'},ref={path:'trusted.wav',asset:{}},controller=new AbortController()
 try{const first=runtime.synthesize(cfg,{text:'one'},ref,null,controller.signal);while(!started)await wait();const second=runtime.synthesize(cfg,{text:'two'},ref);controller.abort();await assert.rejects(first,/stopped/);assert.equal((await second).ok,true);assert.equal(spawns,2)}finally{await runtime.stop();await fs.rm(root,{recursive:true,force:true})}
})
test('existing upstream UID is never adopted or overwritten by a managed launch',async()=>{
 const actions=[],runtime=createLocalModelRuntime({managementToken:async()=>'',operation:async r=>{actions.push(r.action);return {data:[{id:'existing'}]}}})
 try{await assert.rejects(runtime.launch({localTtsBaseUrl:'http://localhost:9997'},{name:'N',uid:'existing'}),/already exists/);assert.deepEqual(actions,['list']);assert.equal(runtime.status().models.length,0)}finally{runtime.close()}
})
test('native GPT-SoVITS maps documented controls and CosyVoice uses instruct_text',async()=>{
 const cfg={localTtsBackend:'gpt-sovits',providerOptions:JSON.stringify({'local-tts':{speed:1.2,native:{seed:-1,text_split_method:'cut5',cache_dit:'f8',sample_steps:32,parallel_infer:true}}})};let body
 await synthesizeLocalService({cfg,req:{text:'test'},reference:{path:'reference.wav',asset:{transcript:'original words'}},fetchImpl:async(_url,o)=>{body=JSON.parse(o.body);return new Response(wav,{headers:{'content-type':'audio/wav'}})}})
 assert.equal(body.cache_dit,'f8');assert.equal(body.text_split_method,'cut5');assert.equal(body.speed_factor,1.2);assert.equal(body.streaming_mode,false)
 const form=[];await synthesizeLocalService({cfg:{localTtsFamily:'cosyvoice',speechInstruction:'happy'},req:{text:'test',models:{'local-tts':'cv'}},fetchImpl:async(_url,o)=>{const payload=JSON.parse(o.body);assert.equal(JSON.parse(payload.kwargs).instruct_text,'happy');return new Response(wav,{headers:{'content-type':'audio/wav'}})}})
})
test('adaptive chunks calibrate with observations without exceeding the configured ceiling or generating extra requests',()=>{const p=createChunkPlanner(),cfg={sentenceChars:250,chain:[{provider:'edge'}]};assert.equal(p.size(cfg),120);p.observe(cfg,'1234567890',{tookMs:1000});assert.equal(p.size(cfg),60);assert.equal(p.size({...cfg,adaptiveChunks:false}),250);assert.equal(p.size({...cfg,sentenceChars:30}),30);assert.equal(localLaunchProfile('Breeze-TTS-2').virtual_env_packages.some(p=>p.includes('#sha256=')),true)})
