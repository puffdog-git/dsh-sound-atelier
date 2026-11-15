import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {randomUUID} from 'node:crypto'
import {cloudVoiceOperation,remoteVoiceId} from '../lib/cloud-voice-api.js'
import {createCloudVoices,cloudVoiceCandidates} from '../lib/cloud-voices.js'
import {prepareEnrollment,enrollmentRoot} from '../lib/voice-enrollment.js'

const ref={bytes:Buffer.from('reference fixture bytes'),asset:{id:randomUUID(),sha256:'source-hash',duration:20,transcript:'實際錄音的逐字稿。'}}
const models={dashscope:'qwen-audio-3.1-tts-plus',minimax:'speech-2.8-hd',siliconflow:'FunAudioLLM/CosyVoice2-0.5B',doubao:'seed-icl-2.0'}
const scope={dashscopeWorkspace:'fixture-workspace',dashscopeRegion:'cn-beijing'}
const json=data=>Response.json(data)
const ok=data=>({base_resp:{status_code:0},...data})
async function fixture(provider,fetchImpl,extra={}){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tts-enroll-'));const calls=[],keys=[],probes=[]
 const cfg={...scope,...extra,chain:[{provider,model:models[provider],keyEnv:'FIRST_ACCOUNT'},{provider,model:models[provider],keyEnv:'SECOND_ACCOUNT'}]}
 const store=createCloudVoices({root,voiceAssets:{reference:async()=>ref},resolveKey:async k=>{keys.push(k);return 'fixture-key'},operation:req=>cloudVoiceOperation({...req,fetchImpl:async(url,init)=>{calls.push({url,...init});return fetchImpl(url,init)}}),synthesize:async(text,probe)=>{probes.push(probe);return {provider,audio:Buffer.from('fixture-audio'),mime:'audio/wav'}}})
 const input={id:randomUUID(),candidateIndex:0,name:'我的音色',referenceAsset:ref.asset.id,uploadConfirmed:true,prefix:'DshVoice',language:'zh'}
 return {root,cfg,store,calls,keys,probes,input,close:()=>fs.rm(root,{recursive:true,force:true})}
}

test('DashScope creation uses exact Workspace/model and data URI, then queries review status',async()=>{
 const f=await fixture('dashscope',async(_u,r)=>json(JSON.parse(r.body).input.action==='create_voice'?{output:{voice_id:'qwen-audio-fixture'}}:{output:{target_model:models.dashscope,status:'OK'}}))
 try{const {record}=await f.store.run('create',f.input,f.cfg);assert.equal(record.remoteState,'training');assert.equal(record.verifiedAt,null);assert.equal(record.backend,'https://fixture-workspace.cn-beijing.maas.aliyuncs.com/api/v1');const sent=JSON.parse(f.calls[0].body);assert.equal(sent.model,'voice-enrollment');assert.equal(sent.input.prefix,'DshVoice');assert.equal(sent.input.target_model,models.dashscope);assert.equal(sent.input.audio,'data:audio/wav;base64,'+ref.bytes.toString('base64'));assert.deepEqual(sent.input.language_hints,['zh']);assert.equal(f.calls[0].redirect,'error')
 const r=await f.store.run('refresh',{id:record.id},f.cfg);assert.equal(r.record.remoteState,'available');assert.equal(JSON.parse(f.calls[1].body).input.voice_id,record.remoteId)
 await assert.rejects(f.store.run('refresh',{id:record.id},{...f.cfg,dashscopeWorkspace:'different'}),/Select/)
 await assert.rejects(f.store.run('refresh',{id:record.id},{...f.cfg,dashscopeRegion:'ap-southeast-1'}),/Select/)
 }finally{await f.close()}
})
test('DashScope wrong target, rejected review, unsupported Qwen3 contract and invalid prefixes are explicit',async()=>{
 await assert.rejects(cloudVoiceOperation({provider:'dashscope',action:'get',key:'x',cfg:scope,model:models.dashscope,input:{remoteId:'v'},fetchImpl:async()=>json({output:{status:'OK',target_model:'other'}})}),/differs/)
 const r=await cloudVoiceOperation({provider:'dashscope',action:'get',key:'x',cfg:scope,model:models.dashscope,input:{remoteId:'v'},fetchImpl:async()=>json({output:{status:'UNDEPLOYED'}})});assert.equal(r.remoteState,'blocked')
 assert.throws(()=>prepareEnrollment('dashscope',{prefix:'中文'},models.dashscope,ref),/prefix/)
 assert.throws(()=>prepareEnrollment('dashscope',{prefix:'p'},'qwen3-tts-flash',ref),/contract/)
})
test('DashScope deletion is delete_voice, never update_voice pretending to rename',async()=>{
 const f=await fixture('dashscope',async(_u,r)=>json({output:JSON.parse(r.body).input.action==='create_voice'?{voice_id:'voice-x'}:{}}))
 try{const {record}=await f.store.run('create',f.input,f.cfg);await assert.rejects(f.store.run('rename',{id:record.id,name:'name'},f.cfg),/no remote rename/);await f.store.run('rename-local',{id:record.id,name:'本機改名'},{});assert.equal(f.calls.length,1);const r=await f.store.run('delete-remote',{id:record.id,confirmRemoteId:record.remoteId},f.cfg);assert.equal(r.record.remoteState,'deleted');assert.equal(JSON.parse(f.calls[1].body).input.action,'delete_voice')}finally{await f.close()}
})
test('MiniMax upload checkpoints precede clone, exact int64 survives persistence and outgoing JSON',async()=>{
 let f;f=await fixture('minimax',async(url,r)=>{
  if(url.endsWith('/files/upload')){assert.equal(r.body.get('purpose'),'voice_clone');assert.ok(r.body.get('file') instanceof Blob);return new Response('{"file":{"file_id":341660563456789634},"base_resp":{"status_code":0}}')}
  const saved=(await f.store.list())[0];assert.equal(saved.uploadFileId,'341660563456789634');assert.equal(saved.operation,'creating');assert.match(r.body,/"file_id":341660563456789634[,}]/);assert.ok(!r.body.includes('341660563456789600'));assert.equal(JSON.parse(r.body).text,undefined);return json(ok({input_sensitive:{type:0}}))
 })
 try{const {record}=await f.store.run('create',f.input,f.cfg);assert.equal(record.remoteId,'DshVoice'+f.input.id.replaceAll('-',''));assert.equal(record.remoteState,'available');assert.equal(record.activation,'pending');assert.ok(record.expiresAt);assert.equal(record.uploadFileId,'341660563456789634');assert.equal(f.calls.length,2);assert.equal(record.verifiedAt,null)}finally{await f.close()}
})
test('MiniMax loss after upload preserves handle and custom voice ID without auto retry',async()=>{
 const f=await fixture('minimax',async url=>{if(url.endsWith('/files/upload'))return json(ok({file:{file_id:12345}}));throw Error('lost')})
 try{await assert.rejects(f.store.run('create',{...f.input,remoteId:'MyClone001'},f.cfg),/lost/);const record=await f.store.get(f.input.id);assert.equal(record.operation,'uncertain');assert.equal(record.remoteId,'MyClone001');assert.equal(record.uploadFileId,12345);await assert.rejects(f.store.run('create',{...f.input,remoteId:'MyClone001'},f.cfg),/already used/);assert.equal(f.calls.length,2)}finally{await f.close()}
})
test('MiniMax inactive list omission is not deletion and does not synthesize or activate',async()=>{
 const f=await fixture('minimax',async url=>json(ok(url.endsWith('/files/upload')?{file:{file_id:123}}:url.endsWith('/get_voice')?{voice_cloning:[]}:{input_sensitive:false})))
 try{const {record}=await f.store.run('create',f.input,f.cfg);const r=await f.store.run('refresh',{id:record.id},f.cfg);assert.equal(r.record.remoteState,'available');assert.equal(r.record.activation,'pending');assert.equal(f.probes.length,0)
 await assert.rejects(f.store.run('test',{id:record.id},f.cfg),/Confirm/);assert.equal(f.probes.length,0);await f.store.run('test',{id:record.id,activationConfirmed:true},f.cfg);assert.equal(f.probes.length,1);assert.equal(f.probes[0].minimaxTransport,'http');assert.equal((await f.store.get(record.id)).activation,'active')
 }finally{await f.close()}
})
test('MiniMax expired/unconfirmed clones remain unknown rather than available or deleted',async()=>{
 const f=await fixture('minimax',async()=>json(ok({voice_cloning:[]})))
 try{const {record}=await f.store.run('import',{...f.input,remoteId:'ImportedClone001'},f.cfg);assert.equal(record.remoteState,'unknown');assert.equal(record.activation,'unlisted');await assert.rejects(f.store.run('test',{id:record.id,activationConfirmed:true},f.cfg),/available/)}finally{await f.close()}
})
test('MiniMax deletes clone and uploaded recording separately, requiring independent confirmations',async()=>{
 const f=await fixture('minimax',async url=>json(ok(url.endsWith('/files/upload')?{file:{file_id:54321}}:{})))
 try{const {record}=await f.store.run('create',f.input,f.cfg);await assert.rejects(f.store.run('delete-upload',{id:record.id,confirmFileId:123},f.cfg),/Confirm/)
 const removed=await f.store.run('delete-remote',{id:record.id,confirmRemoteId:record.remoteId},f.cfg);assert.equal(removed.record.uploadFileId,54321);assert.deepEqual(JSON.parse(f.calls.at(-1).body),{voice_type:'voice_cloning',voice_id:record.remoteId})
 const clean=await f.store.run('delete-upload',{id:record.id,confirmFileId:54321},f.cfg);assert.equal(clean.record.remoteState,'deleted');assert.equal(clean.record.uploadFileId,null);assert.deepEqual(JSON.parse(f.calls.at(-1).body),{file_id:54321,purpose:'voice_clone'})
 }finally{await f.close()}
})
test('MiniMax code errors, reference minimum and custom ID restrictions stop invalid cloning',async()=>{
 assert.throws(()=>prepareEnrollment('minimax',{id:randomUUID()},models.minimax,{...ref,asset:{...ref.asset,duration:5}}),/10 seconds/)
 for(const remoteId of ['short','1BadName','NameBad_'])assert.throws(()=>prepareEnrollment('minimax',{id:randomUUID(),remoteId},models.minimax,ref),/Custom/)
 await assert.rejects(cloudVoiceOperation({provider:'minimax',action:'get',key:'k',input:{remoteId:'validVoice'},fetchImpl:async()=>json({base_resp:{status_code:1004,status_msg:'do not echo credentials'}})}),e=>!e.message.includes('credentials')&&e.message.includes('1004'))
})
test('SiliconFlow upload sends transcript and returns full speech URI for list, synthesis and deletion',async()=>{
 const uri='speech:我的聲音:account-id:voice-id'
 const f=await fixture('siliconflow',async(url,r)=>url.endsWith('/uploads/audio/voice')?json({uri}):url.endsWith('/list')?json({results:[{uri,model:models.siliconflow,customName:'我的聲音'}]}):json(''))
 try{const {record}=await f.store.run('create',f.input,f.cfg);assert.equal(record.remoteId,uri);const sent=f.calls[0].body;assert.equal(sent.get('model'),models.siliconflow);assert.equal(sent.get('customName'),f.input.name);assert.equal(sent.get('text'),ref.asset.transcript);assert.ok(sent.get('file') instanceof Blob)
 await f.store.run('refresh',{id:record.id},f.cfg);assert.equal(f.calls[1].method,'GET');await f.store.run('test',{id:record.id}, {...f.cfg,siliconflowVoiceMode:'reference',siliconflowReferencePath:'unrelated.wav'});assert.equal(f.probes[0].siliconflowVoiceMode,'preset');assert.equal(f.probes[0].chain[0].voice,uri)
 const r=await f.store.run('delete-remote',{id:record.id,confirmRemoteId:uri},f.cfg);assert.equal(r.record.remoteState,'deleted');assert.deepEqual(JSON.parse(f.calls.at(-1).body),{uri});assert.match(f.calls.at(-1).url,/audio\/voice\/deletions$/)
 assert.equal(remoteVoiceId(uri,'siliconflow'),uri);assert.throws(()=>remoteVoiceId(uri,'elevenlabs'))
 }finally{await f.close()}
})
test('SiliconFlow validates transcript, duration and model; malformed list does not masquerade as absence',async()=>{
 for(const asset of [{...ref.asset,transcript:''},{...ref.asset,duration:31}])assert.throws(()=>prepareEnrollment('siliconflow',{},models.siliconflow,{...ref,asset}),/requires/)
 assert.throws(()=>prepareEnrollment('siliconflow',{},'unrelated',ref),/requires/)
 const f=await fixture('siliconflow',async url=>url.endsWith('/list')?json({results:[]}):json({uri:'speech:voice:a:b'}))
 try{const {record}=await f.store.run('create',f.input,f.cfg);assert.equal((await f.store.run('refresh',{id:record.id},f.cfg)).record.remoteState,'deleted')}finally{await f.close()}
 await assert.rejects(cloudVoiceOperation({provider:'siliconflow',action:'get',key:'k',input:{remoteId:'speech:v:a:b'},fetchImpl:async()=>json({})}),/invalid voice list/)
})
test('Doubao prepaid registration needs exact slot confirmation and reports training quota/ICL state',async()=>{
 const f=await fixture('doubao',async()=>json({speaker_id:'S_fixture',status:2,available_training_times:15,speaker_status:[{model_type:5}]}))
 try{await assert.rejects(f.store.run('create',{...f.input,billingMode:'prepaid',remoteId:'S_fixture'},f.cfg),/Confirm/);assert.equal(f.calls.length,0)
 const {record}=await f.store.run('create',{...f.input,billingMode:'prepaid',remoteId:'S_fixture',slotConfirmed:true},f.cfg);assert.equal(record.remoteState,'available');assert.equal(record.availableTrainingTimes,15);assert.deepEqual(record.modelTypes,[5]);assert.equal(record.activation,null);assert.equal(f.calls[0].headers['X-Api-Key'],'fixture-key');assert.ok(f.calls[0].headers['X-Api-Request-Id']);assert.deepEqual(JSON.parse(f.calls[0].body),{speaker_id:'S_fixture',audio:{data:ref.bytes.toString('base64'),format:'wav'},text:ref.asset.transcript,language:0})
 }finally{await f.close()}
})
test('Doubao postpaid uses custom_speaker_id without automatic demo text or official activation',async()=>{
 let f;f=await fixture('doubao',async(_url,r)=>{const b=JSON.parse(r.body);assert.equal(b.speaker_id,'custom_speaker_id');assert.equal(b.custom_speaker_id,'DshCustomVoice001');assert.equal(b.extra_params,undefined);return json({speaker_id:'DshCustomVoice001',status:2,speaker_status:[{model_type:5}]})})
 try{const {record}=await f.store.run('create',{...f.input,billingMode:'postpaid',remoteId:'DshCustomVoice001'},f.cfg);assert.equal(record.activation,'pending');assert.equal(f.probes.length,0);await f.store.run('refresh',{id:record.id},f.cfg);await assert.rejects(f.store.run('test',{id:record.id},f.cfg),/Confirm/);await f.store.run('test',{id:record.id,activationConfirmed:true},f.cfg);assert.equal(f.probes.length,1);assert.equal((await f.store.get(record.id)).activation,'active')}finally{await f.close()}
})
test('Doubao upgrade is explicit; old-only voice is never marked usable as ICL 2.0',async()=>{
 const f=await fixture('doubao',async(url)=>json({speaker_id:'S_legacy',status:2,speaker_status:[{model_type:url.endsWith('/upgrade_voice')?5:1}]}))
 try{const {record}=await f.store.run('import',{...f.input,remoteId:'S_legacy'},f.cfg);assert.equal(record.remoteState,'upgrade-required');await assert.rejects(f.store.run('test',{id:record.id},f.cfg),/available/);await assert.rejects(f.store.run('upgrade',{id:record.id,confirmRemoteId:'wrong'},f.cfg),/Confirm/);assert.equal(f.calls.length,1);const r=await f.store.run('upgrade',{id:record.id,confirmRemoteId:record.remoteId},f.cfg);assert.equal(r.record.remoteState,'available');assert.deepEqual(JSON.parse(f.calls.at(-1).body),{speaker_id:'S_legacy'})
 await assert.rejects(f.store.run('delete-remote',{id:record.id,confirmRemoteId:record.remoteId},f.cfg),/console/);await assert.rejects(f.store.run('rename',{id:record.id,name:'x'},f.cfg),/rename API/);assert.equal(f.calls.length,2)
 }finally{await f.close()}
})
test('Doubao reserves official prefixes, prevents accidental preset-model enrollment and refuses long audio',()=>{
 for(const remoteId of ['S_forbidden001','zh_forbidden001','BVForbidden001','Moon_voice001','MyVoice_bigtts'])assert.throws(()=>prepareEnrollment('doubao',{id:randomUUID(),billingMode:'postpaid',remoteId},models.doubao,ref),/reserved/)
 assert.throws(()=>prepareEnrollment('doubao',{id:randomUUID(),billingMode:'postpaid'},'seed-tts-2.0',ref),/seed-icl/)
 assert.throws(()=>prepareEnrollment('doubao',{id:randomUUID(),billingMode:'postpaid'},models.doubao,{...ref,asset:{...ref.asset,duration:26}}),/25 seconds/)
})
test('regional endpoints and credentials remain separate, and unconfigured DashScope does not break other candidates',()=>{
 assert.equal(enrollmentRoot('minimax',{minimaxBaseUrl:'https://api.minimax.cn/v1'}),'https://api.minimax.cn/v1')
 assert.equal(enrollmentRoot('siliconflow',{siliconflowBaseUrl:'https://api.siliconflow.com/v1'}),'https://api.siliconflow.com/v1')
 for(const url of ['http://api.minimax.io/v1','https://api.minimax.io.evil.invalid/v1','https://user:password@api.minimax.io/v1','https://api.minimax.io/v1?key=secret'])assert.throws(()=>enrollmentRoot('minimax',{minimaxBaseUrl:url}),/official/)
 const rows=cloudVoiceCandidates({chain:[{provider:'dashscope'},{provider:'fish'},{provider:'minimax'}]});assert.deepEqual(rows.map(c=>c.provider),['fish','minimax']);assert.equal(rows[1].index,2)
 const a=cloudVoiceCandidates({...scope,chain:[{provider:'minimax',keyEnv:'A'},{provider:'minimax',keyEnv:'B'}]});assert.notEqual(a[0].binding,a[1].binding)
 const cn=cloudVoiceCandidates({minimaxBaseUrl:'https://api.minimax.cn/v1',chain:[{provider:'minimax',keyEnv:'A'}]})[0];assert.notEqual(cn.binding,a[0].binding)
})
test('same purchased slot/custom ID cannot be concurrently tracked twice under one model/account',async()=>{
 const f=await fixture('doubao',async()=>json({speaker_id:'S_fixture',status:1}))
 try{await f.store.run('create',{...f.input,billingMode:'prepaid',remoteId:'S_fixture',slotConfirmed:true},f.cfg);await assert.rejects(f.store.run('create',{...f.input,id:randomUUID(),billingMode:'prepaid',remoteId:'S_fixture',slotConfirmed:true},f.cfg),/already tracked/);assert.equal(f.calls.length,1)}finally{await f.close()}
})
test('mutating HTTP 5xx is uncertain, API 200 errors never count as established voices',async()=>{
 for(const provider of ['dashscope','minimax','siliconflow','doubao']){
  const f=await fixture(provider,async()=>new Response('do not echo secret',{status:503}))
  try{await assert.rejects(f.store.run('create',{...f.input,billingMode:'postpaid'},f.cfg),e=>!e.message.includes('secret'));assert.equal((await f.store.get(f.input.id)).operation,'uncertain');assert.equal((await f.store.get(f.input.id)).verifiedAt,null);assert.equal(f.calls.length,1)}finally{await f.close()}
 }
})
test('DashScope replaces audio using update_voice, and retraining invalidates prior synthesis proof',async()=>{
 const f=await fixture('dashscope',async(_u,r)=>{const a=JSON.parse(r.body).input.action;return json({output:a==='create_voice'?{voice_id:'replace-voice'}:a==='query_voice'?{status:'OK',target_model:models.dashscope}:{}})})
 try{const {record}=await f.store.run('create',f.input,f.cfg);await f.store.run('refresh',{id:record.id},f.cfg);await f.store.run('test',{id:record.id},f.cfg);assert.ok((await f.store.get(record.id)).verifiedAt)
 await assert.rejects(f.store.run('replace-reference',{id:record.id,referenceAsset:ref.asset.id},f.cfg),/Confirm/)
 const r=await f.store.run('replace-reference',{id:record.id,referenceAsset:ref.asset.id,confirmRemoteId:record.remoteId,uploadConfirmed:true},f.cfg);assert.equal(r.record.remoteState,'training');assert.equal(r.record.verifiedAt,null);const b=JSON.parse(f.calls.at(-1).body);assert.equal(b.input.action,'update_voice');assert.equal(b.input.voice_id,'replace-voice');assert.ok(b.input.audio.startsWith('data:audio/wav;base64,'));assert.equal(b.input.name,undefined)
 }finally{await f.close()}
})
test('Doubao prepaid retraining keeps the purchased slot and clears verification without consuming new IDs',async()=>{
 const f=await fixture('doubao',async()=>json({speaker_id:'S_retrain',status:2,speaker_status:[{model_type:5}],available_training_times:5}))
 try{const {record}=await f.store.run('create',{...f.input,billingMode:'prepaid',remoteId:'S_retrain',slotConfirmed:true},f.cfg);await f.store.run('test',{id:record.id},f.cfg);assert.ok((await f.store.get(record.id)).verifiedAt);const r=await f.store.run('replace-reference',{id:record.id,referenceAsset:ref.asset.id,confirmRemoteId:record.remoteId,uploadConfirmed:true,language:'en'},f.cfg);assert.equal(r.record.remoteId,'S_retrain');assert.equal(r.record.verifiedAt,null);assert.equal(JSON.parse(f.calls.at(-1).body).speaker_id,'S_retrain');assert.equal(JSON.parse(f.calls.at(-1).body).language,1);assert.equal((await f.store.list()).length,1)}finally{await f.close()}
})
test('ambiguous retraining keeps the new reference trace but disables preview until refreshed',async()=>{
 let offline=false;const f=await fixture('dashscope',async()=>{if(offline)throw Error('lost');return json({output:{voice_id:'voice-before-loss'}})})
 try{const {record}=await f.store.run('create',f.input,f.cfg);offline=true;await assert.rejects(f.store.run('replace-reference',{id:record.id,referenceAsset:ref.asset.id,confirmRemoteId:record.remoteId,uploadConfirmed:true},f.cfg),/lost/);const r=await f.store.get(record.id);assert.equal(r.operation,'uncertain');assert.equal(r.referenceAsset,ref.asset.id);assert.equal(r.verifiedAt,null);await assert.rejects(f.store.run('test',{id:record.id},f.cfg),/available/)}finally{await f.close()}
})
test('Minimax activation window expiry blocks preview until a real list refresh confirms active status',async()=>{
 const f=await fixture('minimax',async url=>json(ok(url.endsWith('/files/upload')?{file:{file_id:123}}:url.endsWith('/get_voice')?{voice_cloning:[{voice_id:'WindowTest001'}]}:{})))
 try{const {record}=await f.store.run('create',{...f.input,remoteId:'WindowTest001'},f.cfg);const file=path.join(f.root,'data/dsh-tts/cloud-voices',record.id+'.json');await fs.writeFile(file,JSON.stringify({...record,expiresAt:'2000-01-01T00:00:00Z'}));await assert.rejects(f.store.run('test',{id:record.id,activationConfirmed:true},f.cfg),/window ended/);assert.equal(f.probes.length,0);await f.store.run('refresh',{id:record.id},f.cfg);assert.equal((await f.store.get(record.id)).activation,'active');await f.store.run('test',{id:record.id},f.cfg);assert.equal(f.probes.length,1)}finally{await f.close()}
})
test('MiniMax unlisted/ambiguous ID can be explicitly probed, never implicitly activated or re-created',async()=>{
 const f=await fixture('minimax',async()=>json(ok({voice_cloning:[]})))
 try{const {record}=await f.store.run('import',{...f.input,remoteId:'UnlistedClone001'},f.cfg);await assert.rejects(f.store.run('test',{id:record.id,unconfirmedVoiceTest:true},f.cfg),/available/);await assert.rejects(f.store.run('test',{id:record.id,activationConfirmed:true},f.cfg),/available/);assert.equal(f.probes.length,0)
 const r=await f.store.run('test',{id:record.id,activationConfirmed:true,unconfirmedVoiceTest:true},f.cfg);assert.equal(r.record.remoteState,'available');assert.equal(r.record.activation,'active');assert.ok(r.record.verifiedAt);assert.equal(f.calls.length,1,'explicit recovery only synthesizes, never reuploads or reclones');assert.equal(f.probes.length,1)}finally{await f.close()}
})
test('language hints use only documented enrollment models and invalid languages fail before submission',async()=>{
 let sent;await cloudVoiceOperation({provider:'dashscope',action:'create',key:'k',cfg:scope,model:'cosyvoice-v2',reference:ref,input:{prefix:'Voice',language:'zh'},fetchImpl:async(_u,r)=>{sent=JSON.parse(r.body);return json({output:{voice_id:'cosyvoice-fixture'}})}});assert.equal(sent.input.language_hints,undefined)
 assert.throws(()=>prepareEnrollment('dashscope',{prefix:'Voice',language:'zh-CN'},models.dashscope,ref),/ISO language/)
 assert.throws(()=>prepareEnrollment('doubao',{id:randomUUID(),billingMode:'postpaid',language:'fr'},models.doubao,ref),/language code/)
})
