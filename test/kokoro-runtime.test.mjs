import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import {createKokoroRuntime} from '../lib/engines/kokoro-runtime.js'
const tick=()=>new Promise(r=>setTimeout(r,5))
test('unloading an owned runtime cancels waiting work and never restarts it behind the user',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tts-kokoro-'));let launches=0,kills=0
 const runtime=createKokoroRuntime({root,spawnImpl(){launches++;const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.stdin=new PassThrough();child.kill=()=>{kills++;return true};return child}})
 try{await fs.mkdir(path.join(root,'tts-runtimes/kokoro-js/node_modules/kokoro-js'),{recursive:true});await fs.writeFile(path.join(root,'tts-runtimes/kokoro-js/node_modules/kokoro-js/package.json'),'{}')
  const a=runtime.load(),b=runtime.load();const result=Promise.allSettled([a,b]);await tick();runtime.stop();const settled=await result;assert.ok(settled.every(v=>v.status==='rejected'));assert.equal(launches,1);assert.equal(kills,1);assert.equal(runtime.status().ready,false)
 }finally{runtime.stop();await fs.rm(root,{recursive:true,force:true})}
})
test('unsupported Chinese input fails before spawning an English-only runtime',async()=>{
 let spawned=false;const runtime=createKokoroRuntime({spawnImpl(){spawned=true;throw Error('unexpected')}})
 await assert.rejects(runtime.synthesize('這是中文測試'),/English/);assert.equal(spawned,false);runtime.stop()
})
