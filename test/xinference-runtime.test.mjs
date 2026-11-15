import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {EventEmitter}from'node:events'
import {PassThrough}from'node:stream'
import {createXinferenceRuntime}from'../lib/engines/xinference-runtime.js'
test('existing services are detected without adopting or terminating their process',async()=>{
 let launched=false
 const runtime=createXinferenceRuntime({fetchImpl:async()=>new Response('',{status:401}),spawnImpl(){launched=true;throw Error('unexpected')}})
 const state=await runtime.start({});assert.equal(state.state,'external');assert.equal(state.owned,false);assert.equal(launched,false)
 await assert.rejects(runtime.stop(),/not started/);await runtime.close()
})
test('managed startup recognizes authenticated service liveness without claiming that a model can infer',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tts-xinference-'));let calls=0,killed=0
 const runtime=createXinferenceRuntime({root,fetchImpl:async()=>{if(++calls===1)throw Error('connection refused');return new Response('',{status:401})},spawnImpl(_exe,args,options){assert.equal(args[1],'127.0.0.1');assert.equal(options.windowsHide,true);const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>{killed++};return child}})
 try{await fs.mkdir(path.join(root,'tts-runtimes','bin'),{recursive:true});await fs.writeFile(path.join(root,'tts-runtimes','runtime-manifest.json'),'\uFEFF'+JSON.stringify({device:'cpu'}));await fs.writeFile(path.join(root,'tts-runtimes','bin',process.platform==='win32'?'xinference-local.exe':'xinference-local'),'fixture')
  const status=await runtime.start({});assert.equal(status.backend,'cpu');assert.equal(status.state,'auth-required');assert.equal(status.owned,true);assert.equal(status.ready,undefined);await runtime.stop();assert.equal(killed,1);assert.equal(runtime.status().owned,false)
 }finally{await runtime.close();await fs.rm(root,{recursive:true,force:true})}
})
