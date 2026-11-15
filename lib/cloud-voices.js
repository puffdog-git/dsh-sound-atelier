import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { chainCandidates } from './candidates.js'
import { keyEnvName } from './keys.js'
import { CLOUD_VOICE_SERVICES, cloudVoiceOperation, remoteVoiceId } from './cloud-voice-api.js'
import { ENROLLMENT_SERVICES, enrollmentRoot, prepareEnrollment, enrollmentModelSupported } from './voice-enrollment.js'

const validId=id=>typeof id==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id)
const nameOf=value=>{if(typeof value!=='string'||!value.trim()||value.length>100||/[\x00-\x1f]/.test(value))throw Error('Voice name must contain 1–100 characters');return value.trim()}
const now=()=>new Date().toISOString()
const identity=c=>({provider:c.provider,backend:ENROLLMENT_SERVICES[c.provider]?enrollmentRoot(c.provider,c.cfg):CLOUD_VOICE_SERVICES[c.provider]?.origin,credentialRef:keyEnvName(c.cfg,c.provider),model:c.model})
const binding=c=>createHash('sha256').update(JSON.stringify(identity(c))).digest('hex')
export function cloudVoiceCandidates(cfg){return chainCandidates(cfg,'').map((c,index)=>{try{return {...identity(c),index,binding:binding(c),supported:!!CLOUD_VOICE_SERVICES[c.provider],canCreate:enrollmentModelSupported(c.provider,c.model),label:CLOUD_VOICE_SERVICES[c.provider]?.label||c.provider}}catch{return null}}).filter(c=>c?.supported)}

export function createCloudVoices({root=process.env.DSH_HOME||path.join(os.homedir(),'.dsh'),voiceAssets,resolveKey,operation=cloudVoiceOperation,synthesize}={}){
  const base=path.join(root,'data','dsh-tts','cloud-voices'),active=new Set();let queue=Promise.resolve()
  const file=id=>{if(!validId(id))throw Error('Invalid cloud voice record ID');return path.join(base,id+'.json')}
  const serial=fn=>{const p=queue.then(fn);queue=p.catch(()=>{});return p}
  async function get(id){let r;try{r=JSON.parse(await fs.readFile(file(id),'utf8'));if(r.id!==id||r.version!==1)throw Error()}catch{throw Error('Cloud voice record not found')}return {...r,...(r.operation!=='idle'&&!['failed','uncertain'].includes(r.operation)&&!active.has(id)?{operation:'uncertain'}:{})}}
  async function save(r){await fs.mkdir(base,{recursive:true});const tmp=file(r.id)+'.'+randomUUID()+'.tmp';try{await fs.writeFile(tmp,JSON.stringify({...r,updatedAt:now()},null,2),{mode:0o600});await fs.rename(tmp,file(r.id))}finally{await fs.rm(tmp,{force:true}).catch(()=>{})}return get(r.id)}
  async function list(){let files;try{files=await fs.readdir(base)}catch(e){if(e.code==='ENOENT')return [];throw e}const out=[];for(const f of files.filter(f=>validId(f.slice(0,-5))&&f.endsWith('.json')).slice(0,500)){try{out.push(await get(f.slice(0,-5)))}catch{}}return out.sort((a,b)=>b.createdAt.localeCompare(a.createdAt))}
  function candidate(cfg,input,record){
    const all=chainCandidates(cfg,'')
    const c=Number.isInteger(input.candidateIndex)?all[input.candidateIndex]:record?all.find(c=>{try{return binding(c)===record.binding}catch{return false}}):null
    if(!c||!CLOUD_VOICE_SERVICES[c.provider])throw Error('Select a saved provider row supporting permanent voices')
    if(c.cfg.chain[0].baseUrl&&!ENROLLMENT_SERVICES[c.provider])throw Error('Cloud voice management currently supports official provider endpoints only')
    if(c.provider==='dashscope'&&c.cfg.chain[0].baseUrl)throw Error('Configure DashScope Workspace/region instead of a per-row endpoint')
    if(record&&binding(c)!==record.binding)throw Error('Provider, model or credential slot changed; restore the original row before managing this voice')
    return c
  }
  async function operate(action,input,c,record,signal,reference,onCheckpoint){const key=await resolveKey(keyEnvName(c.cfg,c.provider));if(!key)throw Error('Configure this provider API key before managing voices');return operation({provider:c.provider,action,key,input,model:c.model,cfg:c.cfg,prior:record,reference,signal,onCheckpoint})}
  async function run(action,input={},cfg,signal){
    if(!['create','import','attach','refresh','rename','rename-local','replace-reference','delete-remote','delete-upload','upgrade','forget','test'].includes(action))throw Error('Unknown cloud voice management action')
    const id=input.id;if(!validId(id))throw Error('A stable UUID request/record ID is required')
    if(active.has(id))throw Error('This voice already has an operation in progress')
    active.add(id)
    let record,c,mutating=false,started=false
    try{
      if(action==='create'||action==='import'){
        c=candidate(cfg,input);const name=nameOf(input.name)
        if(action==='create'&&input.uploadConfirmed!==true)throw Error('Confirm uploading the selected recording to this cloud provider')
        const language=String(input.language||'').trim();if(language.length>30||language&&!/^[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8})*$/.test(language))throw Error('Invalid voice language code')
        if(action==='create'&&CLOUD_VOICE_SERVICES[c.provider].language&&!language)throw Error('Cartesia cloning requires a language code')
        const reference=action==='create'?await voiceAssets.reference(input.referenceAsset):undefined
        const enrollment=action==='create'&&ENROLLMENT_SERVICES[c.provider]?prepareEnrollment(c.provider,input,c.model,reference):{}
        if(action==='import')remoteVoiceId(input.remoteId,c.provider)
        if(action==='import'&&c.provider==='doubao'&&c.model!=='seed-icl-2.0')throw Error('Select seed-icl-2.0 for managed Doubao cloned voices')
        const targetId=action==='import'?input.remoteId:enrollment.remoteId||null
        record=await serial(async()=>{
          if((await list()).some(r=>r.id===id))throw Error('This request ID was already used; refresh its record instead of submitting again')
          if((await list()).length>=500)throw Error('Cloud voice record storage limit reached')
          if(targetId&&(await list()).some(r=>r.remoteId===targetId&&r.binding===binding(c)&&r.remoteState!=='deleted'))throw Error('This remote voice is already tracked; use its existing record')
          return save({version:1,id,name,kind:'persistent-cloud-voice',...identity(c),binding:binding(c),referenceAsset:reference?.asset.id||null,referenceSha256:reference?.asset.sha256||null,createdAt:now(),operation:action==='create'?'creating':'refreshing',remoteState:'unknown',remoteId:targetId,verifiedAt:null,origin:action==='create'?'created':'imported',...enrollment,...(c.provider==='doubao'&&action==='import'?{billingMode:/^S_/.test(targetId)?'prepaid':'postpaid'}:{})})
        })
        started=true;mutating=action==='create'
        const result=await operate(action==='create'?'create':'get',{name,language,remoteId:targetId,...enrollment},c,record,signal,reference,async patch=>{record={...record,...patch};await save(record)})
        if(result.remoteId)try{remoteVoiceId(result.remoteId,c.provider)}catch{throw Object.assign(Error('Provider returned an invalid voice ID; check its console'),{uncertain:mutating})}
        record={...record,...result,operation:'idle'}
        try{return {record:await save(record)}}catch(e){e.uncertain=mutating;throw e}
      }
      record=await get(id)
      if(action==='rename-local')return {record:await save({...record,name:nameOf(input.name)})}
      if(action==='forget'){
        if(input.confirm!==true)throw Error('Confirm forgetting this local record; remote resources will remain')
        await fs.unlink(file(id));return {forgotten:true,remoteDeleted:false}
      }
      c=candidate(cfg,input,record)
      if(action==='delete-upload'){
        if(c.provider!=='minimax'||!record.uploadFileId||input.confirmFileId!==record.uploadFileId)throw Error('Confirm the exact MiniMax uploaded file ID before deleting the remote recording')
        record=await save({...record,operation:'deleting-upload'});started=true;mutating=true
        const result=await operate('delete-upload',{},c,record,signal)
        return {record:await save({...record,...result,operation:'idle'})}
      }
      if(action==='attach'){
        if(record.remoteId)throw Error('This record already has a remote voice ID')
        remoteVoiceId(input.remoteId,c.provider)
        const result=await operate('get',{remoteId:input.remoteId},c,record,signal)
        return {record:await save({...record,...result,operation:'idle',verifiedAt:null})}
      }
      if(!record.remoteId)throw Error('Creation outcome is unknown; find the voice ID in the provider console and attach it before continuing')
      if(record.remoteState==='deleted')throw Error('Remote voice was deleted; forget the local record')
      if(action==='replace-reference'){
        if(!['dashscope','doubao'].includes(c.provider)||c.provider==='doubao'&&record.billingMode!=='prepaid')throw Error('Reference replacement is implemented for DashScope and prepaid Doubao slots only')
        if(input.uploadConfirmed!==true||input.confirmRemoteId!==record.remoteId)throw Error('Confirm uploading a new recording and replacing the exact remote voice')
        const reference=await voiceAssets.reference(input.referenceAsset)
        prepareEnrollment(c.provider,{id,prefix:record.prefix||'DshVoice',remoteId:record.remoteId,billingMode:record.billingMode,slotConfirmed:true,language:input.language},c.model,reference)
        record=await save({...record,referenceAsset:reference.asset.id,referenceSha256:reference.asset.sha256,verifiedAt:null,operation:'retraining'});started=true;mutating=true
        const result=await operate('replace-reference',{remoteId:record.remoteId,language:input.language},c,record,signal,reference)
        return {record:await save({...record,...result,operation:'idle'})}
      }
      if(action==='test'){
        const unconfirmed=c.provider==='minimax'&&record.remoteState==='unknown'&&['idle','failed','uncertain'].includes(record.operation)&&input.unconfirmedVoiceTest===true&&input.activationConfirmed===true
        if(!unconfirmed&&(record.remoteState!=='available'||record.operation!=='idle'))throw Error('Refresh until this voice is available before testing synthesis')
        if(!synthesize)throw Error('Synthesis is unavailable')
        if(!unconfirmed&&record.activation==='pending'&&record.expiresAt&&Date.parse(record.expiresAt)<=Date.now())throw Error('Voice activation window ended; refresh the provider status before testing')
        if(record.activation==='pending'&&input.activationConfirmed!==true)throw Error('Confirm the first official synthesis may activate this voice and incur a cloning/slot fee')
        const text=String(input.text||'這是雲端音色試聽，請確認這句話能完整播放。');if(!text.trim()||text.length>1000)throw Error('Voice test text must contain 1–1000 characters')
        // One exact provider attempt, no role override, references, cache or fallback.
        const options=JSON.parse(c.cfg.providerOptions||'{}'),p={...options[c.provider]}
        for(const k of ['referencePath','referenceText','referenceIds'])delete p[k]
        const probe={...c.cfg,...(c.provider==='minimax'?{minimaxTransport:'http'}:{}),...(c.provider==='siliconflow'?{siliconflowVoiceMode:'preset'}:{}),cache:false,roles:{},localTtsReferenceAsset:'',providerOptions:JSON.stringify({...options,[c.provider]:p}),chain:[{...c.cfg.chain[0],voice:record.remoteId,referenceAsset:'',options:JSON.stringify(p)}]}
        const out=await synthesize(text,probe,signal,'reply')
        if(out.provider!==record.provider||!out.audio?.length)throw Error('Voice verification did not return audio from the selected provider')
        record=await save({...record,verifiedAt:now(),...(unconfirmed?{remoteState:'available',operation:'idle'}:{}),...(record.activation==='pending'||unconfirmed?{activation:'active',expiresAt:null}:{})})
        return {record,text,mime:out.mime,audioBase64:Buffer.from(out.audio).toString('base64')}
      }
      if(action==='rename')nameOf(input.name)
      if(action==='rename'&&CLOUD_VOICE_SERVICES[c.provider].rename===false)throw Error('This service has no remote rename API; rename the local label instead')
      if(action==='delete-remote'&&CLOUD_VOICE_SERVICES[c.provider].delete===false)throw Error('Use the provider console to delete this voice; no delete API is implemented for this service')
      if(action==='upgrade'&&(c.provider!=='doubao'||input.confirmRemoteId!==record.remoteId))throw Error('Confirm the exact Doubao speaker ID before upgrading')
      if(action==='delete-remote'&&input.confirmRemoteId!==record.remoteId)throw Error('Confirm the exact remote voice ID before deleting it')
      if(['rename','delete-remote'].includes(action)&&record.isOwner===false)throw Error('This account does not own the voice')
      mutating=action!=='refresh'
      record=await save({...record,operation:action==='refresh'?'refreshing':action==='rename'?'renaming':action==='upgrade'?'upgrading':'deleting'});started=true
      let result
      try{result=await operate(action==='refresh'?'get':action==='rename'?'rename':action==='upgrade'?'upgrade':'delete',{remoteId:record.remoteId,name:input.name},c,record,signal)}catch(e){if((e.status===404||e.absent)&&['refresh','delete-remote'].includes(action)&&!['minimax','doubao'].includes(c.provider))result={remoteState:'deleted'};else throw e}
      return {record:await save({...record,...result,operation:'idle',...(action==='upgrade'||result.remoteState&&result.remoteState!=='available'?{verifiedAt:null}:{})})}
    }catch(e){
      if(record&&started)await save({...record,operation:mutating&&e.uncertain?'uncertain':'failed'}).catch(()=>{})
      throw e
    }finally{active.delete(id)}
  }
  return {list,get,run,candidates:cloudVoiceCandidates,services:CLOUD_VOICE_SERVICES}
}
