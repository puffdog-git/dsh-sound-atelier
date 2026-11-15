import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createVoiceAssets } from '../lib/voice-assets.js'
import { audioResult } from '../lib/providers/controls.js'
import {hostFixture}from'./host-fixture.mjs'
import {Readable}from'node:stream'
import {EventEmitter}from'node:events'
function recording(silent=false){const pcm=Buffer.alloc(24000);if(!silent)for(let i=0;i<12000;i++)pcm.writeInt16LE(Math.round(Math.sin(i*.08)*3000),i*2);return audioResult('fixture',pcm,'pcm',24000).audio.toString('base64')}
async function fixture(){const root=await fs.mkdtemp(path.join(os.tmpdir(),'tts-assets-'));return {root,store:createVoiceAssets({root}),close:()=>fs.rm(root,{recursive:true,force:true})}}
test('uploads decode actual audio and persist validated reference assets without claiming a trained voice',async()=>{
 const f=await fixture();try{const a=await f.store.create({name:'曉雨／參考',sample:recording(),transcript:'Hello.'});assert.equal(a.state,'validated');assert.equal(a.cloned,false);assert.equal(a.kind,'reference');assert.ok(a.duration>=.49&&a.duration<=.51);assert.deepEqual(a.bindings,[]);const again=createVoiceAssets({root:f.root});assert.equal((await again.list())[0].id,a.id);assert.equal((await again.reference(a.id)).asset.sha256,a.sha256)}finally{await f.close()}
})
test('same display name never overwrites audio, rename preserves identity, transcript changes invalidate prior verification',async()=>{
 const f=await fixture();try{const a=await f.store.create({name:'same',sample:recording()}),b=await f.store.create({name:'same',sample:recording()});assert.notEqual(a.id,b.id);await f.store.verify(a.id,{provider:'local-tts',backend:'http://localhost:9997',model:'test'});assert.equal((await f.store.rename(a.id,'new')).bindings.length,1);assert.equal((await f.store.update(a.id,{transcript:'Correct text'})).bindings.length,0);assert.equal((await f.store.list()).length,2)}finally{await f.close()}
})
test('invalid audio, effectively silent input and path traversal never become usable voices',async()=>{
 const f=await fixture();try{await assert.rejects(f.store.create({name:'x',sample:Buffer.from('not audio').toString('base64')}),/decode/);await assert.rejects(f.store.create({name:'silence',sample:recording(true)}),/silent/);await assert.rejects(f.store.reference('../escape'),/not found/);assert.equal((await f.store.list()).length,0)}finally{await f.close()}
})
test('reference integrity is checked before synthesis and deletion is explicitly local only',async()=>{
 const f=await fixture();try{const a=await f.store.create({name:'x',sample:recording()}),ref=await f.store.reference(a.id);await fs.appendFile(ref.path,'corruption');await assert.rejects(f.store.reference(a.id),/changed/);const result=await f.store.remove(a.id);assert.equal(result.remoteDeleted,false);assert.equal(result.scope,'local-recording-only');assert.deepEqual(await f.store.list(),[])}finally{await f.close()}
})
test('a local global reference is never uploaded to a cloud fallback unless that row explicitly selects it',async()=>{
 const f=await fixture();let host
 try{
  const asset=await f.store.create({name:'private local reference',sample:recording(),transcript:'Hello.'});const sent=[]
  host=await hostFixture({localTtsReferenceAsset:asset.id,chain:[{provider:'fish',model:'s2.1-pro',voice:'existing-voice'}]},(deps)=>({fish:async()=>{sent.push(deps.cfg._voiceReference?.asset.id||null);return {ok:true,provider:'fish',mime:'audio/wav',audio:Buffer.from(recording(),'base64')}}}),{root:f.root})
  assert.equal((await host.tools[0].execute({text:'First test.'},{session:{id:'private'}})).ok,true);assert.deepEqual(sent,[null]);assert.deepEqual((await f.store.get(asset.id)).bindings,[])
  host.config.chain[0].referenceAsset=asset.id
  assert.equal((await host.tools[0].execute({text:'Second test.'},{session:{id:'private'}})).ok,true);assert.deepEqual(sent,[null,asset.id]);const updated=await f.store.get(asset.id);assert.equal(updated.cloned,false);assert.equal(updated.bindings[0].backend,'fish');assert.equal(updated.bindings[0].state,'synthesis-verified')
 }finally{host?.close();await f.close()}
})
test('legacy upload ignores client-controlled rootDir and saves only in the server-owned asset root',async()=>{
 const f=await fixture();let host
 try{host=await hostFixture({},undefined,{root:f.root});const outside=path.join(f.root,'outside-client-location'),payload={name:'Reference',sample:recording(),rootDir:outside};const req=Readable.from([Buffer.from(JSON.stringify(payload))]);Object.assign(req,{method:'POST',url:'/dsh-tts/voice/clone',headers:{host:'127.0.0.1'},socket:{remoteAddress:'127.0.0.1'}});const res=new EventEmitter();let data;res.writeHead=()=>{};res.end=text=>{data=JSON.parse(text)};await host.routes.get('/dsh-tts/voice/clone')(req,res);assert.equal(data.ok,true);assert.equal(data.cloned,false);assert.equal(data.voiceId,null);assert.equal(typeof data.assetId,"string");assert.equal((await f.store.list()).length,1);await assert.rejects(fs.stat(outside),{code:'ENOENT'})}finally{host?.close();await f.close()}
})
