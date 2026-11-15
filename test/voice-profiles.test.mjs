import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {createVoiceProfiles,profileInput} from '../lib/voice-profiles.js'
import {createVoiceContext} from '../lib/voice-context.js'
test('voice profiles resolve session, workspace and persona without mutating global config; revision prevents lost writes',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'voice-profiles-'));try{const p=createVoiceProfiles({root}),base={chain:[{provider:'edge',voice:'global'}],roles:{reply:{voice:'old'}}};let r=await p.save({name:'人格聲音',chain:[{provider:'edge',voice:'persona'}]},0),id=r.profile.id;await p.bind({scope:'persona',key:'p',profileId:id},1);r=await p.save({name:'工作聲音',chain:[{provider:'edge',voice:'work'}]},2);await p.bind({scope:'workspace',key:'w',profileId:r.profile.id},3);assert.equal((await p.resolve(base,{workspaceId:'w',personaId:'p'})).chain[0].voice,'work');await p.bind({scope:'session',key:'s',profileId:id},4);const resolved=await p.resolve(base,{sessionId:'s',workspaceId:'w'});assert.equal(resolved.chain[0].voice,'persona');resolved.chain[0].voice='changed';assert.equal((await p.resolve(base,{sessionId:'s'})).chain[0].voice,'persona');assert.equal(base.chain[0].voice,'global');await assert.rejects(p.remove(id,4),/其他視窗/);await p.remove(id,5);assert.equal((await p.list()).bindings.length,1)}finally{await fs.rm(root,{recursive:true,force:true})}
})
test('profiles reject embedded credentials and corrupt data never gets overwritten',async()=>{
 assert.throws(()=>profileInput({name:'x',chain:[{provider:'openai',baseUrl:'https://user:pass@example.com'}]}),/憑證/);assert.throws(()=>profileInput({name:'x',chain:[{provider:'openai',options:'{"api_key":"private"}'}]}),/金鑰/);assert.throws(()=>profileInput({name:'x',chain:[{provider:'edge'}],config:{rate:9}}),/範圍/);
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'voice-corrupt-'));try{const file=path.join(root,'data/dsh-tts/voice-profiles.json');await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,'broken');await assert.rejects(createVoiceProfiles({root}).save({name:'x',chain:[{provider:'edge'}]},0),/未被覆寫/);assert.equal(await fs.readFile(file,'utf8'),'broken')}finally{await fs.rm(root,{recursive:true,force:true})}
})
test('context uses actual workspace/session contracts, projects persona metadata and detects mismatched workspace',async()=>{
 const workspace={id:'w',path:'C:/project',title:'工作',sessionIds:['s']},profiles={list:async()=>({profiles:[],bindings:[]}),resolve:async(cfg,c)=>({...cfg,_voiceBinding:{source:'global',...c}})};
 const v=createVoiceContext({profiles,ctx:{get:n=>({workspaceRegistry:{list:()=>[workspace],get:id=>id==='w'?workspace:null},sessionPersistence:{stat:async()=>({header:{id:'s',cwd:'C:/project'}}),list:async()=>[{header:{id:'s',title:'對話'}}]}}[n])}});v.register({id:'custom',name:'自訂人格',snapshot:async()=>({personas:[{id:'a',name:'小葵',secret:'do not expose'}],effective:{id:'a',name:'小葵'}})});const result=await v.catalog({}, {sessionId:'s'});assert.equal(result.context.workspaceId,'w');assert.equal(result.effectivePersona.id,'custom:a');assert.equal(result.personas[0].secret,undefined);await assert.rejects(v.context({sessionId:'s',workspaceId:'other'}),/不一致/)
})
