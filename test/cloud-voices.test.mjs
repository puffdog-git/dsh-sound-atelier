import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {randomUUID} from 'node:crypto'
import {cloudVoiceOperation} from '../lib/cloud-voice-api.js'
import {createCloudVoices,cloudVoiceCandidates} from '../lib/cloud-voices.js'
import {hostFixture} from './host-fixture.mjs'
import {Readable} from 'node:stream'
import {EventEmitter} from 'node:events'

const reference={bytes:Buffer.from('fixture wav'),asset:{id:randomUUID(),sha256:'fixture-hash',transcript:'A real reference transcript.'}}
const remote=(p,extra={})=>({elevenlabs:{voice_id:'voice-1',requires_verification:false},fish:{_id:'voice-1',state:'trained',title:'Fish'},cartesia:{id:'voice-1',name:'Cartesia'},inworld:{voice:{voiceId:'workspace__voice-1',displayName:'Inworld'}}}[p])
async function api(p,action='create',data=remote(p),status=200){let sent;const result=await cloudVoiceOperation({provider:p,action,key:'test-key-never-log',model:'model',reference,input:{name:'New voice',language:'zh',remoteId:p==='inworld'?'workspace__voice-1':'voice-1'},fetchImpl:async(url,init)=>{sent={url,...init};return new Response(data===null?null:JSON.stringify(data),{status})}});return {result,sent}}
async function fixture(operation,synthesize){const root=await fs.mkdtemp(path.join(os.tmpdir(),'tts-cloud-'));const cfg={chain:[{provider:'fish',model:'s2.1-pro',keyEnv:'FISH_A'},{provider:'fish',model:'s2.1-pro',keyEnv:'FISH_B'}]};const calls=[];const store=createCloudVoices({root,voiceAssets:{reference:async id=>{assert.equal(id,reference.asset.id);return reference}},resolveKey:async ref=>'resolved-'+ref,operation:operation|| (async req=>{calls.push(req);return {remoteId:'voice-1',remoteState:'available'}}),synthesize});const input={id:randomUUID(),candidateIndex:0,name:'My voice',referenceAsset:reference.asset.id,uploadConfirmed:true};return {root,cfg,store,calls,input,close:()=>fs.rm(root,{recursive:true,force:true})}}

test('four cloud create contracts use their actual wire formats and private defaults',async()=>{
 for(const p of ['elevenlabs','fish','cartesia','inworld']){
  const {result,sent}=await api(p);assert.equal(result.remoteState,'available');assert.equal(sent.redirect,'error');assert.equal(sent.method,'POST')
  if(p==='elevenlabs'){assert.match(sent.url,/\/v1\/voices\/add$/);assert.equal(sent.headers['xi-api-key'],'test-key-never-log');assert.equal(sent.body.get('files').type,'audio/wav')}
  if(p==='fish'){assert.match(sent.url,/\/model$/);for(const [k,v] of Object.entries({type:'tts',train_mode:'fast',visibility:'private',generate_sample:'false',texts:reference.asset.transcript}))assert.equal(sent.body.get(k),v);assert.ok(sent.body.get('voices') instanceof Blob)}
  if(p==='cartesia'){assert.equal(sent.headers['Cartesia-Version'],'2026-08-14');assert.equal(sent.body.get('access'),'private');assert.equal(sent.body.get('language'),'zh');assert.ok(sent.body.get('clip') instanceof Blob)}
  if(p==='inworld'){assert.match(sent.url,/voices:clone$/);const b=JSON.parse(sent.body);assert.equal(b.voiceSamples[0].audioData,reference.bytes.toString('base64'));assert.equal(b.voiceSamples[0].transcription,reference.asset.transcript);assert.equal(b.languageCode,'zh');assert.equal(sent.headers.authorization,'Basic test-key-never-log');assert.equal(result.name,'Inworld')}
 }
})
test('rename contracts include Inworld snake_case mask, Eleven multipart and empty Fish response',async()=>{
 const iw=await api('inworld','rename');assert.match(iw.sent.url,/\?updateMask=display_name$/);assert.equal(JSON.parse(iw.sent.body).displayName,'New voice')
 const el=await api('elevenlabs','rename',{status:'ok'});assert.match(el.sent.url,/\/edit$/);assert.equal(el.sent.method,'POST');assert.equal(el.sent.body.get('name'),'New voice')
 const fish=await api('fish','rename',null);assert.equal(fish.result.name,'New voice');assert.equal(JSON.parse(fish.sent.body).title,'New voice')
 assert.equal((await api('cartesia','rename')).sent.method,'PATCH')
})
test('delete recognizes Cartesia 204 and validates Eleven success status',async()=>{
 assert.equal((await api('cartesia','delete',null,204)).result.remoteState,'deleted');assert.equal((await api('fish','delete',null)).result.remoteState,'deleted');assert.equal((await api('inworld','delete',{})).result.remoteState,'deleted');assert.equal((await api('elevenlabs','delete',{status:'ok'})).result.remoteState,'deleted');await assert.rejects(api('elevenlabs','delete',{status:'error'}),e=>e.uncertain===true)
})
test('verification requirements, training, moderation and archived states are not usable',async()=>{
 assert.equal((await api('elevenlabs','create',{voice_id:'voice-1',requires_verification:true})).result.remoteState,'verification-required')
 assert.equal((await api('fish','get',{_id:'voice-1',state:'created'})).result.remoteState,'training')
 assert.equal((await api('fish','get',{_id:'voice-1',state:'trained',dmca_taken_down:true})).result.remoteState,'blocked')
 assert.equal((await api('cartesia','get',{id:'voice-1',status:'archived'})).result.remoteState,'blocked')
 const r=await cloudVoiceOperation({provider:'elevenlabs',action:'get',key:'k',input:{remoteId:'voice-1'},prior:{remoteState:'verification-required'},fetchImpl:async()=>Response.json({voice_id:'voice-1'})});assert.equal(r.remoteState,'verification-required')
})
test('provider error text and credentials never enter errors; ambiguous mutations are not retried',async()=>{
 let n=0;await assert.rejects(cloudVoiceOperation({provider:'fish',action:'create',key:'secret',reference,input:{name:'n'},fetchImpl:async()=>{n++;return new Response('secret', {status:503})}}),e=>e.uncertain===true&&!e.message.includes('secret'));assert.equal(n,1)
 await assert.rejects(cloudVoiceOperation({provider:'fish',action:'get',key:'k',input:{remoteId:'../escape'}}),/Invalid/)
 await assert.rejects(cloudVoiceOperation({provider:'fish',action:'create',key:'k',reference,input:{name:'n'},fetchImpl:async()=>{throw Error('secret network details')}}),e=>e.uncertain===true&&!e.message.includes('secret'))
})
test('stable request IDs deduplicate creation and persisted records contain only credential references',async()=>{
 const f=await fixture();try{const {record}=await f.store.run('create',f.input,f.cfg);assert.equal(record.verifiedAt,null);assert.equal(record.kind,'persistent-cloud-voice');assert.equal(record.credentialRef,'FISH_A');await assert.rejects(f.store.run('create',f.input,f.cfg),/already used/);assert.equal(f.calls.length,1);assert.equal(f.calls[0].key,'resolved-FISH_A');const stored=await fs.readFile(path.join(f.root,'data/dsh-tts/cloud-voices',record.id+'.json'),'utf8');assert.ok(!stored.includes('resolved-'));assert.equal((await createCloudVoices({root:f.root}).list()).length,1)}finally{await f.close()}
})
test('recordings require explicit upload consent, language requirements validate before cloud calls',async()=>{
 const f=await fixture();try{await assert.rejects(f.store.run('create',{...f.input,uploadConfirmed:false},f.cfg),/Confirm/);await assert.rejects(f.store.run('create',f.input,{chain:[{provider:'cartesia',model:'sonic-3'}]}),/language/);assert.equal(f.calls.length,0);assert.equal((await f.store.list()).length,0)}finally{await f.close()}
})
test('duplicate provider rows use the exact credential slot; reordered rows resolve by binding',async()=>{
 const f=await fixture();try{const {record}=await f.store.run('create',{...f.input,candidateIndex:1},f.cfg);assert.equal(f.calls[0].key,'resolved-FISH_B');await f.store.run('refresh',{id:record.id},{chain:f.cfg.chain.toReversed()});assert.equal(f.calls[1].key,'resolved-FISH_B');await assert.rejects(f.store.run('rename',{id:record.id,name:'no',candidateIndex:0},f.cfg),/changed/);assert.equal((await f.store.get(record.id)).operation,'idle');assert.equal(f.calls.length,2)}finally{await f.close()}
})
test('changed model or credential slot and custom endpoints block remote mutations',async()=>{
 const f=await fixture();try{const {record}=await f.store.run('create',f.input,f.cfg);await assert.rejects(f.store.run('refresh',{id:record.id},{chain:[{...f.cfg.chain[0],model:'s2-pro'}]}),/Select/);await assert.rejects(f.store.run('refresh',{id:record.id},{chain:[{...f.cfg.chain[0],keyEnv:'OTHER'}]}),/Select/);await assert.rejects(f.store.run('create',{...f.input,id:randomUUID()},{chain:[{...f.cfg.chain[0],baseUrl:'https://other.invalid'}]}),/official/);assert.equal(f.calls.length,1)}finally{await f.close()}
})
test('uncertain creation remains discoverable and can attach an existing remote ID without reupload',async()=>{
 let n=0;const f=await fixture(async req=>{n++;if(req.action==='create')throw Object.assign(Error('response lost'),{uncertain:true});return {remoteId:req.input.remoteId,remoteState:'available'}})
 try{await assert.rejects(f.store.run('create',f.input,f.cfg));assert.equal((await f.store.get(f.input.id)).operation,'uncertain');await assert.rejects(f.store.run('create',f.input,f.cfg),/already used/);await f.store.run('attach',{id:f.input.id,remoteId:'found-voice'},f.cfg);assert.equal((await f.store.get(f.input.id)).remoteId,'found-voice');assert.equal(n,2)}finally{await f.close()}
})
test('a restarted in-flight mutation is shown as uncertain, not silently available',async()=>{
 const f=await fixture();try{const {record}=await f.store.run('create',f.input,f.cfg);await fs.writeFile(path.join(f.root,'data/dsh-tts/cloud-voices',record.id+'.json'),JSON.stringify({...record,operation:'creating'}));assert.equal((await createCloudVoices({root:f.root}).get(record.id)).operation,'uncertain')}finally{await f.close()}
})
test('delete requires exact ID; forgetting a record does not call remote deletion or remove reference audio',async()=>{
 const f=await fixture();try{const {record}=await f.store.run('create',f.input,f.cfg);await assert.rejects(f.store.run('delete-remote',{id:record.id,confirmRemoteId:'wrong'},f.cfg),/Confirm/);assert.equal((await f.store.get(record.id)).operation,'idle');await assert.rejects(f.store.run('forget',{id:record.id},f.cfg),/Confirm/);const forgotten=await f.store.run('forget',{id:record.id,confirm:true},f.cfg);assert.equal(forgotten.remoteDeleted,false);assert.equal(f.calls.length,1);assert.equal((await f.store.list()).length,0)}finally{await f.close()}
})
test('import only reads remote metadata; a confirmed remote 404 records deletion',async()=>{
 const f=await fixture(async req=>{if(req.action==='get'&&req.prior.origin==='imported'&&req.prior.remoteState==='available')throw Object.assign(Error('missing'),{status:404});return {remoteId:req.input.remoteId,remoteState:'available'}})
 try{const {record}=await f.store.run('import',{...f.input,remoteId:'existing'},f.cfg);assert.equal(record.referenceAsset,null);const r=await f.store.run('refresh',{id:record.id},f.cfg);assert.equal(r.record.remoteState,'deleted')}finally{await f.close()}
})
test('verification uses exactly one provider with references, role overrides, fallback and cache disabled',async()=>{
 let probe;const f=await fixture(undefined,async(text,cfg)=>{probe=cfg;return {provider:'fish',mime:'audio/wav',audio:Buffer.from('audio')}})
 try{f.cfg.roles={reply:{provider:'edge',voice:'wrong'}};f.cfg.chain[0].referenceAsset=reference.asset.id;f.cfg.chain[0].options=JSON.stringify({referenceIds:['wrong2']});f.cfg.providerOptions=JSON.stringify({fish:{referencePath:'private.wav',referenceText:'wrong'}});const {record}=await f.store.run('create',f.input,f.cfg);const r=await f.store.run('test',{id:record.id,text:'Specific voice.'},f.cfg);assert.ok(r.record.verifiedAt);assert.equal(probe.chain.length,1);assert.equal(probe.chain[0].voice,'voice-1');assert.equal(probe.chain[0].referenceAsset,'');assert.equal(probe.cache,false);assert.deepEqual(probe.roles,{});assert.equal(JSON.parse(probe.providerOptions).fish.referencePath,undefined);assert.equal(JSON.parse(probe.chain[0].options).referenceIds,undefined)}finally{await f.close()}
})
test('failed or wrong-provider synthesis never earns a verified timestamp',async()=>{
 const f=await fixture(undefined,async()=>({provider:'edge',audio:Buffer.from('wrong')}));try{const {record}=await f.store.run('create',f.input,f.cfg);await assert.rejects(f.store.run('test',{id:record.id},f.cfg),/selected provider/);assert.equal((await f.store.get(record.id)).verifiedAt,null)}finally{await f.close()}
})
test('remote deletion keeps the local record and reference identity, and cannot run twice on a known deleted voice',async()=>{
 const calls=[];const f=await fixture(async req=>{calls.push(req.action);return req.action==='delete'?{remoteState:'deleted'}:{remoteId:'voice-1',remoteState:'available'}})
 try{const {record}=await f.store.run('create',f.input,f.cfg);const r=await f.store.run('delete-remote',{id:record.id,confirmRemoteId:'voice-1'},f.cfg);assert.equal(r.record.remoteState,'deleted');assert.equal(r.record.referenceAsset,reference.asset.id);assert.equal((await f.store.list()).length,1);await assert.rejects(f.store.run('delete-remote',{id:record.id,confirmRemoteId:'voice-1'},f.cfg),/was deleted/);assert.deepEqual(calls,['create','delete'])}finally{await f.close()}
})
test('unowned resources and pending verification cannot be modified or falsely verified',async()=>{
 let syntheses=0;const f=await fixture(async()=>({remoteId:'voice-1',remoteState:'verification-required',isOwner:false}),async()=>{syntheses++;return {provider:'fish',audio:Buffer.from('x')}})
 try{const {record}=await f.store.run('create',f.input,f.cfg);await assert.rejects(f.store.run('test',{id:record.id},f.cfg),/available/);await assert.rejects(f.store.run('rename',{id:record.id,name:'x'},f.cfg),/own/);await assert.rejects(f.store.run('delete-remote',{id:record.id,confirmRemoteId:'voice-1'},f.cfg),/own/);assert.equal(syntheses,0);assert.equal((await f.store.get(record.id)).operation,'idle')}finally{await f.close()}
})
test('parallel operations on a voice cannot race deletion against rename',async()=>{
 let release;const f=await fixture(async req=>{if(req.action==='rename')await new Promise(r=>release=r);return {remoteId:'voice-1',remoteState:'available'}})
 try{const {record}=await f.store.run('create',f.input,f.cfg);const rename=f.store.run('rename',{id:record.id,name:'renamed'},f.cfg);while(!release)await new Promise(r=>setTimeout(r,1));await assert.rejects(f.store.run('delete-remote',{id:record.id,confirmRemoteId:'voice-1'},f.cfg),/progress/);release();await rename}finally{await f.close()}
})
test('cloud routes use server-owned persistence and enforce trusted settings requests',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tts-cloud-route-'));const host=await hostFixture({chain:[{provider:'fish',keyEnv:'FISH_A'},{provider:'fish',keyEnv:'FISH_B'}]},undefined,{root})
 try{const result=await host.read('/dsh-tts/voice/cloud');assert.equal(result.ok,true);assert.equal(result.candidates.length,2);assert.notEqual(result.candidates[0].binding,result.candidates[1].binding);assert.deepEqual(result.voices,[])
 const req=Readable.from([Buffer.from('{}')]);Object.assign(req,{method:'POST',headers:{host:'127.0.0.1',origin:'https://evil.invalid'},socket:{remoteAddress:'127.0.0.1'}});const res=new EventEmitter();let status;res.writeHead=s=>status=s;res.end=()=>{};await host.routes.get('/dsh-tts/voice/cloud')(req,res);assert.equal(status,403)
 }finally{host.close();await fs.rm(root,{recursive:true,force:true})}
})
test('managed voice HTTP preview integrates with the actual synthesis chain and persists successful verification',async()=>{
 const f=await fixture();let host,seen
 try{const {record}=await f.store.run('create',f.input,f.cfg)
 host=await hostFixture({...f.cfg,roles:{reply:{provider:'edge',voice:'unrelated'}},cache:true},(_deps,req)=>({fish:async()=>{seen=req;return {ok:true,provider:'fish',mime:'audio/wav',audio:Buffer.from('test audio')}}}),{root:f.root})
 const req=Readable.from([Buffer.from(JSON.stringify({action:'test',id:record.id,text:'Managed voice integration.'}))]);Object.assign(req,{method:'POST',headers:{host:'127.0.0.1'},socket:{remoteAddress:'127.0.0.1'}});const res=new EventEmitter();let status,data;res.writeHead=s=>status=s;res.end=s=>data=JSON.parse(s)
 await host.routes.get('/dsh-tts/voice/cloud')(req,res);assert.equal(status,200);assert.equal(data.ok,true);assert.equal(seen.voices.fish,'voice-1');assert.equal(data.text,'Managed voice integration.');assert.equal(Buffer.from(data.audioBase64,'base64').toString(),'test audio');assert.ok((await f.store.get(record.id)).verifiedAt)
 }finally{host?.close();await f.close()}
})
