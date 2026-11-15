import {test} from 'node:test'
import assert from 'node:assert/strict'
import {channelCatalog} from '../lib/speech-bridge/catalog.js'
import {createDiagnostics,failureReason} from '../lib/speech-bridge/diagnostics.js'
test('catalog distinguishes declared support, live extension, duration and unknown backend limits',()=>{
 const list=channelCatalog();assert.equal(list.length,15);assert.equal(list.filter(c=>c.source==='dsh-im'&&c.native).length,10)
 for(const id of ['wecom','wecom-app','dingtalk','weixin'])assert.equal(list.find(c=>c.channel===id).maxSeconds,60)
 for(const id of ['slack','email','imessage','onebot','qqbot'])assert.equal(list.find(c=>c.channel===id).maxSeconds,null)
 assert.equal(list[0].availability,'not-loaded');assert.equal(channelCatalog({imLoaded:true,reported:[{id:'telegram',maxSeconds:120}]})[0].availability,'loaded')
})
test('known errors have actionable Chinese explanations without raw exception contents',()=>{
 for(const [code,want]of [['artifact-permission-required','permission'],['voice-duration-limit','duration'],['voice-size-limit','size'],['voice-conversion-failed','conversion'],['artifact-delivery-uncertain','unknown'],['artifact-consumer-required','context'],['artifact-rate-limited','rate']]){
  const r=failureReason({code,message:'private-token in C:/private/file.wav'});assert.equal(r.code,want);assert.ok(r.action);assert.ok(!JSON.stringify(r).includes('private'))
 }
 assert.equal(failureReason({message:'No active IM delivery consumer owns this turn'}).code,'context')
 assert.equal(failureReason({message:'HTTP 401'},'synthesis').code,'permission')
 assert.match(failureReason({message:'HTTP 401'},'synthesis').action,/TTS/)
})
test('queued IM result correlates with later platform result; bounded memory, no private data',()=>{
 let at=1;const d=createDiagnostics({max:3,now:()=>at++})
 d.record({id:'job-1',artifactId:'artifact-1',channel:'im',state:'queued',message:'private recording'})
 d.record({artifactId:'artifact-1',channel:'telegram',state:'failed',code:'artifact-permission-required',path:'C:/private/file.wav',token:'private-token'})
 assert.equal(d.snapshot().length,1);assert.equal(d.snapshot()[0].channel,'telegram');assert.equal(d.snapshot()[0].state,'failed');assert.equal(d.snapshot()[0].reason.code,'permission');assert.ok(!JSON.stringify(d.snapshot()).includes('private'))
 d.record({id:'job-2',channel:'qqbot',state:'generating'});d.record({id:'job-2',channel:'auto',state:'failed',code:'size'});assert.equal(d.snapshot()[0].channel,'qqbot');assert.equal(d.snapshot()[0].reason.code,'size')
 d.record({id:'job-3',state:'sent'});d.record({id:'job-4',state:'sent'});assert.equal(d.snapshot().length,3)
})
