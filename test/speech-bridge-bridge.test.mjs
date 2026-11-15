import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {createBridge,chooseChannel} from '../lib/speech-bridge/bridge.js'
import {createVoiceProvider,wavSeconds} from '../lib/speech-bridge/voice-provider.js'
function wav(){const b=Buffer.alloc(32044);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(32000,40);return b}
test('PCM and FFmpeg pipe WAV duration, malformed chunks refused',()=>{
 const b=wav();assert.equal(wavSeconds(b),1);b.writeUInt32LE(0xffffffff,40);assert.equal(wavSeconds(b),1)
 b.writeUInt32LE(40000,40);assert.throws(()=>wavSeconds(b),/不完整/)
})

async function fixture(channel,fn){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'speech-test-')),source=path.join(root,'input.mp3');await fs.writeFile(source,'fixture-audio')
 const calls=[],agent={session:{id:'test',header:{cwd:root}}},exec={agent,signal:new AbortController().signal}
 let available=true,removed=0,synthesis=0
 const tools={executable:n=>available&&n===({onebot:'qq_send_voice',qqbot:'send_media',im:'dsh_im_return_file'}[channel])?{}:undefined,
  execute:async input=>{const c=input.calls[0],args=JSON.parse(c.arguments);calls.push({name:c.name,args,agent:input.agent});assert.equal(await fs.readFile(args.path||args.source,'utf8'),'fixture-audio');return {results:[{result:{isError:false,value:channel==='im'?{path:'managed-snapshot'}:{ok:true}}}]}}}
 const tts={exportAudio:async()=>{synthesis++;return {path:source,size:13,remove:async()=>{removed++}}}}
 const events=[],bridge=createBridge({tools,tts,onEvent:e=>events.push(e)})
 try{await fn({root,exec,tools,tts,bridge,calls,events,unavailable:()=>{available=false},counts:()=>({removed,synthesis})})}finally{bridge.close();await fs.rm(root,{recursive:true,force:true})}
}
for(const channel of ['onebot','qqbot','im'])test(channel+' uses genuine session, exact format and cleanup',()=>fixture(channel,async f=>{
 const result=await f.bridge.send({text:'你好'},f.exec);assert.equal(result.channel,channel);assert.equal(result.state,channel==='im'?'staged':'sent');assert.equal(f.calls[0].agent,f.exec.agent)
 if(channel==='qqbot')assert.equal(f.calls[0].args.kind,'voice')
 if(channel==='onebot')assert.equal(path.dirname(path.dirname(f.calls[0].args.path)),f.root)
 assert.deepEqual(f.counts(),{synthesis:1,removed:1});assert.deepEqual((await fs.readdir(f.root)),['input.mp3'])
}))
test('IM native voice intent is negotiated only with a capable artifact tool',()=>fixture('im',async f=>{
 f.tools.executable=n=>n==='dsh_im_return_file'?{parameters:{properties:{presentation:{type:'string'}}}}:undefined
 const result=await f.bridge.send({text:'你好'},f.exec)
 assert.equal(f.calls[0].args.presentation,'voice');assert.equal(result.state,'staged');assert.equal(result.deliveryMode,'native-when-supported')
}))
test('diagnostics distinguish queued from sent and hide synthesis error contents',()=>fixture('im',async f=>{
 await f.bridge.send({text:'private recording'},f.exec);assert.equal(f.events.at(-1).state,'queued');assert.ok(!JSON.stringify(f.events).includes('private'))
 f.tts.exportAudio=async()=>{throw Error('private-key in C:/private/secret.wav')}
 await assert.rejects(f.bridge.send({text:'hello'},f.exec));assert.equal(f.events.at(-1).code,'synthesis');assert.ok(!JSON.stringify(f.events).includes('private'))
}))
test('scope absent, ambiguous and explicit mismatch fail closed',()=>{
 assert.throws(()=>chooseChannel({executable:()=>undefined},{}),/正式會話/)
 assert.throws(()=>chooseChannel({executable:()=>({})},{}),/多個/)
 assert.throws(()=>chooseChannel({executable:()=>undefined},{},'im'),/沒有/)
 assert.equal(chooseChannel({executable:n=>['qq_send_voice','dsh_im_return_file'].includes(n)?{}:undefined},{}),'onebot')
})
test('permission changed during synthesis prevents send and cleans',()=>fixture('onebot',async f=>{
 const original=f.tts.exportAudio;f.tts.exportAudio=async(...a)=>{const r=await original(...a);f.unavailable();return r}
 await assert.rejects(f.bridge.send({text:'你好'},f.exec),/權限/);assert.equal(f.calls.length,0);assert.equal(f.counts().removed,1)
}))
test('cancelled synthesis cannot send',()=>fixture('qqbot',async f=>{
 const c=new AbortController();c.abort();await assert.rejects(f.bridge.send({text:'你好'},{...f.exec,signal:c.signal}));assert.equal(f.counts().synthesis,0)
}))
test('transport denial is not delivery success, no retry, cleanup',()=>fixture('im',async f=>{
 f.tools.execute=async()=>({results:[{result:{isError:true,error:{message:'permission denied'}}}]})
 await assert.rejects(f.bridge.send({text:'你好'},f.exec),/permission denied/);assert.equal(f.counts().removed,1)
}))
test('external STT uses verbatim raw text, no command/macro submission',async()=>{
 const calls=[],p=createVoiceProvider({origin:()=> 'http://127.0.0.1:3000',fetchImpl:async(url,opt)=>{calls.push({url,opt});return {ok:true,json:async()=>calls.length===1?{ok:true,modes:{dictation:{chain:[{provider:'sensevoice'}],language:'auto'}}}:{ok:true,text:'macro changed',rawText:'原始逐字稿',action:{command:'submit'},tookMs:20}}}})
 const out=await p.transcribe({audio:new Uint8Array(wav()),language:'zh'},new AbortController().signal)
 assert.equal(out.text,'原始逐字稿');assert.equal(out.audioSeconds,1)
 const body=JSON.parse(calls[1].opt.body);assert.equal(body.mode,'dictation');assert.equal(body.subMode,'verbatim');assert.equal(body.polish,false);assert.equal(calls.length,2)
})
test('external STT remote URL, missing plugin, language mismatch fail closed',async()=>{
 const signal=new AbortController().signal,audio=wav()
 await assert.rejects(createVoiceProvider({origin:()=> 'https://remote.invalid'}).transcribe({audio},signal),/本機/)
 await assert.rejects(createVoiceProvider({origin:()=> 'http://localhost',fetchImpl:async()=>({ok:false,status:404})}).transcribe({audio},signal),/404/)
 const p=createVoiceProvider({origin:()=> 'http://localhost',fetchImpl:async()=>({ok:true,json:async()=>({ok:true,modes:{dictation:{chain:[{}],language:'ja'}}})})})
 await assert.rejects(p.transcribe({audio,language:'zh'},signal),/語言/)
})
test('pending duplicate rejected; unload cancels and releases audio',()=>fixture('qqbot',async f=>{
 let started;const gate=new Promise(r=>{started=r});f.tts.exportAudio=async({signal})=>{started();await new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}))}
 const work=f.bridge.send({text:'你好'},f.exec);await gate
 await assert.rejects(f.bridge.send({text:'你好'},f.exec),/已有/)
 f.bridge.close();await assert.rejects(work);assert.equal(f.calls.length,0)
}))
