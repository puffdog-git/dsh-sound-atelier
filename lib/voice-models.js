import fs from 'node:fs/promises'
import {createReadStream,createWriteStream} from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {randomUUID,createHash} from 'node:crypto'
import {Transform} from 'node:stream'
import {pipeline} from 'node:stream/promises'
import yauzl from 'yauzl'
import yazl from 'yazl'
import {publicJson,publicFile} from './public-download.js'
const idValid=id=>typeof id==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id)
const limits={pth:256*1024*1024,index:768*1024*1024},MAX=1024*1024*1024
export function createVoiceModels({root=process.env.DSH_HOME||path.join(os.homedir(),'.dsh'),getJson=publicJson,download=publicFile}={}){
 const base=path.join(root,'data/dsh-tts/voice-models'),staging=path.join(base,'.staging'),verifiedFiles=new Map();let queue=Promise.resolve()
 const folder=id=>{if(!idValid(id))throw Error('Invalid voice-model ID');return path.join(base,id)}
 const serial=fn=>{const p=queue.then(fn);queue=p.catch(()=>{});return p}
 async function get(id){try{const r=JSON.parse(await fs.readFile(path.join(folder(id),'model.json'),'utf8'));if(r.id!==id||r.version!==1||!limits[r.kind])throw Error();return r}catch{throw Error('Voice model not found')}}
 async function list(){let rows;try{rows=await fs.readdir(base)}catch(e){if(e.code==='ENOENT')return [];throw e}const out=[];for(const id of rows.filter(idValid)){try{out.push(await get(id))}catch{}}return out.sort((a,b)=>b.createdAt.localeCompare(a.createdAt))}
 async function file(id){const record=await get(id),file=path.join(folder(id),'source.'+record.kind),real=await fs.realpath(file);if(path.dirname(real)!==await fs.realpath(folder(id)))throw Error('Unsafe model path');const stat=await fs.stat(real),cached=verifiedFiles.get(id),stamp=[real,stat.size,stat.mtimeMs,stat.ctimeMs,stat.ino,record.sha256].join('|');if(cached?.stamp===stamp&&cached.expires>Date.now())return {record,path:real};const hash=createHash('sha256');let bytes=0;for await(const b of createReadStream(real)){hash.update(b);bytes+=b.length;if(bytes>limits[record.kind])throw Error('Voice model exceeds size limit')}if(bytes!==record.bytes||hash.digest('hex')!==record.sha256)throw Error('Voice model changed; reimport it before loading');verifiedFiles.set(id,{stamp,expires:Date.now()+30000});return {record,path:real}}
 async function write(record){const target=path.join(folder(record.id),'model.json'),tmp=target+'.'+randomUUID()+'.tmp';try{await fs.writeFile(tmp,JSON.stringify(record,null,2),{mode:0o600});await fs.rename(tmp,target)}finally{await fs.rm(tmp,{force:true}).catch(()=>{})}return record}
 async function remove(id){verifiedFiles.delete(id);return serial(async()=>{await get(id);const real=await fs.realpath(folder(id));if(path.dirname(real)!==await fs.realpath(base))throw Error('Unsafe model directory');await fs.rm(real,{recursive:true,force:false});return {deleted:true,scope:'local-model-only'}})}
 async function importStream(stream,{kind,name,trusted=false,sha256,pack},signal){
  if(!limits[kind]||typeof name!=='string'||!name.trim()||name.length>150||/[\x00-\x1f]/.test(name)||trusted!==true)throw Error('Choose a trusted .pth/.index file and a name before importing')
  return serial(async()=>{const all=await list(),used=all.reduce((n,r)=>n+r.bytes,0);if(all.length>=100||used>=4*MAX)throw Error('Voice-model storage limit reached')
   const id=randomUUID(),dir=folder(id);await fs.mkdir(dir,{recursive:true});const target=path.join(dir,'source.'+kind),hash=createHash('sha256');let bytes=0
   try{await pipeline(stream,new Transform({transform(b,_e,done){bytes+=b.length;if(bytes>limits[kind]||used+bytes>4*MAX)return done(Error('Model file exceeds storage limit'));hash.update(b);done(null,b)}}),createWriteStream(target,{flags:'wx',mode:0o600}),{signal});if(!bytes)throw Error('Empty model file');const actual=hash.digest('hex');if(sha256&&actual!==sha256.toLowerCase())throw Error('Voice-model SHA256 mismatch');return await write({version:1,id,name:name.trim(),kind,bytes,sha256:actual,trusted:true,createdAt:new Date().toISOString(),...(pack?{pack}:{})})}
   catch(e){const real=await fs.realpath(dir);if(path.dirname(real)===await fs.realpath(base))await fs.rm(real,{recursive:true,force:true});throw e}
  })
 }
 async function rename(id,name){if(typeof name!=='string'||!name.trim()||name.length>150)throw Error('Invalid model name');return serial(async()=>write({...await get(id),name:name.trim()}))}
 async function registry(url,signal){const u=new URL(url);if(u.username||u.password||u.search||u.protocol!=='https:')throw Error('Use a public HTTPS registry manifest URL without credentials/query');const data=await getJson(u.href,{signal});if(![1,2].includes(data.schema)||!Array.isArray(data.packs)||data.packs.length>500)throw Error('Unsupported voice-pack registry schema');return {url:u.href,packs:data.packs.filter(p=>p&&/^[A-Za-z0-9_.-]{1,100}$/.test(p.id)&&p.model?.url).map(p=>({id:p.id,name:String(p.name||p.id).slice(0,150),version:String(p.version||'1').slice(0,60),license:String(p.license||'unknown').slice(0,500),model:p.model,indexes:Array.isArray(p.indexes)?p.indexes.slice(0,20):p.index?[{...p.index,id:'default'}]:[]}))}}
 async function install({url,packId,indexId,trusted},signal){
  if(trusted!==true)throw Error('Confirm trusting the registry model before installation')
  const catalog=await registry(url,signal),pack=catalog.packs.find(p=>p.id===packId);if(!pack)throw Error('Voice pack not found in registry')
  const selected=indexId===null?null:pack.indexes.find(i=>i.id===indexId)||(indexId?null:pack.indexes[0]);if(indexId&&!selected)throw Error('Unknown index variant')
  const existing=await list(),match=existing.find(r=>r.kind==='pth'&&r.pack?.registry===url&&r.pack?.id===packId&&r.sha256===String(pack.model.sha256).toLowerCase());if(match){await file(match.id);const index=selected?existing.find(r=>r.kind==='index'&&r.sha256===String(selected.sha256).toLowerCase()):null;if(!selected||index){if(index)await file(index.id);return {model:match,index,skipped:true}}}
  await fs.mkdir(staging,{recursive:true});const imported=[]
  try{for(const[kind,artifact]of [['pth',pack.model],...(selected?[['index',selected]]:[])]){const tmp=path.join(staging,randomUUID());try{await download(new URL(artifact.url,catalog.url).href,tmp,{signal,maxBytes:limits[kind],sha256:artifact.sha256});imported.push(await importStream(createReadStream(tmp),{kind,name:pack.name+(kind==='index'?' · '+String(selected.name||selected.id):''),trusted:true,sha256:artifact.sha256,pack:{registry:url,id:packId,version:pack.version,license:pack.license,indexId:selected?.id||null}},signal))}finally{await fs.rm(tmp,{force:true}).catch(()=>{})}}return {model:imported[0],index:imported[1]||null,skipped:false}}
  catch(e){for(const r of imported)await remove(r.id).catch(()=>{});throw e}
 }
 async function exportPack(modelId,indexId,signal){
  const model=await file(modelId),index=indexId?await file(indexId):null;if(model.record.kind!=='pth'||index&&index.record.kind!=='index')throw Error('Select a model and optional index')
  await fs.mkdir(staging,{recursive:true});const target=path.join(staging,randomUUID()+'.zip'),zip=new yazl.ZipFile(),meta={schema:'dsh-tts-voicepack/1',name:model.record.name,files:[{name:'model.pth',kind:'pth',sha256:model.record.sha256},...(index?[{name:'model.index',kind:'index',sha256:index.record.sha256}]:[])]}
  zip.addBuffer(Buffer.from(JSON.stringify(meta)),'manifest.json');zip.addFile(model.path,'model.pth',{compress:false});if(index)zip.addFile(index.path,'model.index',{compress:false});const promise=pipeline(zip.outputStream,createWriteStream(target,{flags:'wx',mode:0o600}),{signal});zip.end();try{await promise;return {path:target,cleanup:()=>fs.rm(target,{force:true})}}catch(e){await fs.rm(target,{force:true});throw e}
 }
 async function importPack(stream,{trusted},signal){
  if(trusted!==true)throw Error('Confirm trusting model weights before importing a pack')
  await fs.mkdir(staging,{recursive:true});const zipPath=path.join(staging,randomUUID()+'.zip'),dir=path.join(staging,randomUUID());await fs.mkdir(dir)
  const imported=[]
  try{let bytes=0;await pipeline(stream,new Transform({transform(b,_e,done){bytes+=b.length;done(bytes>MAX?Error('Voice pack exceeds 1 GiB'):null,b)}}),createWriteStream(zipPath,{flags:'wx',mode:0o600}),{signal})
   const zip=await new Promise((resolve,reject)=>yauzl.open(zipPath,{lazyEntries:true,validateEntrySizes:true,strictFileNames:true},(e,z)=>e?reject(e):resolve(z)))
   const entries=new Map();let total=0
   await new Promise((resolve,reject)=>{let done=false;const fail=e=>{if(done)return;done=true;zip.close();reject(e)};const abort=()=>fail(Error('Pack import cancelled'));signal?.addEventListener('abort',abort,{once:true});zip.on('error',fail);zip.on('end',()=>{signal?.removeEventListener('abort',abort);if(!done){done=true;resolve()}});zip.on('entry',entry=>{
    const name=entry.fileName,mode=(entry.externalFileAttributes>>>16)&0xf000
    if(!['manifest.json','model.pth','model.index'].includes(name)||entries.has(name)||mode&&mode!==0x8000||entry.generalPurposeBitFlag&1||entry.uncompressedSize>(name==='manifest.json'?65536:name.endsWith('pth')?limits.pth:limits.index)||(total+=entry.uncompressedSize)>MAX)return fail(Error('Unsafe or oversized voice-pack entry'))
    entries.set(name,true);zip.openReadStream(entry,(e,source)=>{if(e)return fail(e);pipeline(source,createWriteStream(path.join(dir,name),{flags:'wx',mode:0o600}),{signal}).then(()=>zip.readEntry(),fail)})
   });zip.readEntry()})
   const manifest=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8'));if(manifest.schema!=='dsh-tts-voicepack/1'||!Array.isArray(manifest.files)||manifest.files.length<1||manifest.files.length>2)throw Error('Unsupported voice-pack manifest')
   const seen=new Set();for(const item of manifest.files){if(!limits[item.kind]||item.name!==(item.kind==='pth'?'model.pth':'model.index')||seen.has(item.kind)||!/^[a-f0-9]{64}$/i.test(item.sha256||''))throw Error('Invalid voice-pack file manifest');seen.add(item.kind);imported.push(await importStream(createReadStream(path.join(dir,item.name)),{kind:item.kind,name:String(manifest.name||'Imported voice').slice(0,150),trusted:true,sha256:item.sha256},signal))}if(!seen.has('pth'))throw Error('Voice pack has no model');return {models:imported}
  }catch(e){for(const r of imported)await remove(r.id).catch(()=>{});throw e}
  finally{await fs.rm(zipPath,{force:true}).catch(()=>{});const real=await fs.realpath(dir);if(path.dirname(real)===await fs.realpath(staging))await fs.rm(real,{recursive:true,force:true})}
 }
 const verify=id=>serial(async()=>write({...await get(id),verifiedAt:new Date().toISOString()}))
 return {list,get,file,remove,rename,verify,importStream,registry,install,exportPack,importPack,limits}
}
