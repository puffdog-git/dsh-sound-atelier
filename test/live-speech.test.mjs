import test from 'node:test'
import assert from 'node:assert/strict'
import { createLiveSpeech, liveSpeechConfig } from '../lib/live-speech.js'
import { createSpeechJobs } from '../lib/speech-jobs.js'
import { textChannel } from '../lib/text-channel.js'
import { audioResult } from '../lib/providers/controls.js'
import { hostFixture } from './host-fixture.mjs'

const cfg={chain:[{provider:'cartesia',model:'sonic-3',voice:'test'}],providerOptions:'{}',timeoutMs:5000}
const tick=()=>new Promise(r=>setTimeout(r,5))
test('live text produces PCM before finish, scopes packets and exposes complete audio only after acknowledgement',async()=>{
 const received=[]
 const live=createLiveSpeech(async(_text,config,signal,_role,req)=>{
  assert.equal(JSON.parse(config.providerOptions).cartesia.transport,'websocket')
  for await(const part of req.textChunks){received.push(part);req.onAudioChunk(Buffer.alloc(480),{format:'pcm',sampleRate:24000})}
  signal.throwIfAborted();return audioResult('cartesia',Buffer.alloc(960),'pcm',24000)
 })
 try{
  const job=live.start({sessionId:'s',clientId:'a',text:'第一句',cfg});await tick()
  assert.equal(live.view(job).frames.length,1);assert.equal(live.view(job,0,true).audioBase64,undefined)
  assert.equal(live.get(job.id,'s','b'),null);assert.equal(live.get(job.id,'other','a'),null)
  live.append(job,'第二句');await tick();live.seal(job);await job.promise
  assert.deepEqual(received,['第一句','第二句']);assert.equal(job.state,'complete')
  assert.ok(live.view(job,2,true).audioBase64);assert.equal(live.view(job,1).frames[0].sequence,1)
  assert.throws(()=>live.append(job,'遲來文字'),/closed/)
 }finally{live.close()}
})
test('cancel wakes an idle incremental text consumer and never exposes a partial file',async()=>{
 const live=createLiveSpeech(async(_t,_c,_s,_r,req)=>{for await(const _ of req.textChunks){};throw Error('Unexpected completion')})
 try{const job=live.start({sessionId:'s',clientId:'c',text:'Hi',cfg});await tick();job.controller.abort();await job.promise;assert.equal(job.state,'cancelled');assert.equal(live.view(job,0,true).audioBase64,undefined)}finally{live.close()}
})
test('normal open speech jobs keep one native input stream and retain all text/audio',async()=>{
 let calls=0,seen=[]
 const jobs=createSpeechJobs(async(_sid,_text,_cfg,_role,meta)=>{
  calls++;for await(const part of meta.textChunks)seen.push(part)
  return {audioBase64:audioResult('fixture',Buffer.alloc(960),'pcm',24000).audio.toString('base64'),mime:'audio/wav',text:meta.getText()}
 },{liveConfig:()=>cfg})
 try{const job=jobs.start({sessionId:'s',cfg,open:true});jobs.append(job,'First.');await tick();jobs.append(job,'Second.');await jobs.seal(job);assert.equal(calls,1);assert.deepEqual(seen,['First.','\nSecond.']);assert.equal(job.state,'complete');assert.equal(job.segments[0].text,'First.\nSecond.');assert.equal((await jobs.audio(job)).audio.length,1004)}finally{jobs.close()}
})
test('live selection preserves independent row options, rejects unsupported models and never falls through to another provider',()=>{
 const chosen=liveSpeechConfig({...cfg,chain:[{...cfg.chain[0],options:'{"speed":1.2}'},{provider:'edge'}]})
 assert.equal(chosen.chain.length,1);assert.equal(JSON.parse(chosen.providerOptions).cartesia.speed,1.2)
 assert.throws(()=>liveSpeechConfig({chain:[{provider:'edge'}]}),/no incremental/)
})
test('text channels bound input and reject late writes',async()=>{
 const c=textChannel(undefined,4);c.push('ab');assert.throws(()=>c.push('abc'),/size/);c.end();assert.throws(()=>c.push('a'),/closed/);c.close()
})

test('host assistant events feed one native synthesis through turn/end and publish the entire transcript once',async()=>{
 let calls=0;const received=[]
 const fixture=await hostFixture({speakAsItGoes:true,chain:cfg.chain,providerOptions:'{"cartesia":{"transport":"websocket"}}'},(_deps,req)=>({cartesia:async()=>{
  calls++;for await(const text of req.textChunks)received.push(text)
  return audioResult('cartesia',Buffer.alloc(960),'pcm',24000)
 }}))
 try{
  const emit=(type,text)=>fixture.events.get('session/event')({id:'native-host'},{type,data:{text}})
  emit('assistant/message','Opening sentence.');await tick();emit('assistant/message','Closing sentence.');await tick()
  assert.equal(calls,1);assert.deepEqual(received,['Opening sentence.','\nClosing sentence.'])
  emit('turn/end');let response
  for(let i=0;i<50;i++){response=await fixture.read('/dsh-tts/pending');if(response.items?.some(item=>item.audioBase64))break;await tick()}
  const audio=response.items.filter(item=>item.audioBase64);assert.equal(audio.length,1);assert.equal(audio[0].text,'Opening sentence.\nClosing sentence.')
 }finally{fixture.close()}
})
