import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { randomUUID, createHash } from 'node:crypto'
import { joinAudio } from './audio-join.js'
import { decodeAudio } from './providers/native-http.js'
import { parsePcmWav } from './providers/audio.js'

const validId=id=>typeof id==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id)
const label=value=>{if(typeof value!=='string'||!value.trim()||value.length>100||/[\x00-\x1f]/.test(value))throw Error('Voice name must contain 1–100 characters');return value.trim()}
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
export function createVoiceAssets({ root=process.env.DSH_HOME||path.join(os.homedir(),'.dsh'), normalize=joinAudio }={}) {
  const base=path.join(root,'data','dsh-tts','voice-assets');let queue=Promise.resolve()
  const folder=id=>{if(!validId(id))throw Error('Invalid voice asset ID');return path.join(base,id)}
  function serial(fn){const p=queue.then(fn);queue=p.catch(()=>{});return p}
  async function get(id){try{const asset=JSON.parse(await fs.readFile(path.join(folder(id),'asset.json'),'utf8'));if(asset.id!==id||asset.version!==1)throw Error();return asset}catch{throw Error('Voice asset not found')}}
  async function save(asset){const dir=folder(asset.id);await fs.mkdir(dir,{recursive:true});const tmp=path.join(dir,'asset.'+randomUUID()+'.tmp');await fs.writeFile(tmp,JSON.stringify(asset,null,2),{mode:0o600});try{await fs.rename(tmp,path.join(dir,'asset.json'))}finally{await fs.rm(tmp,{force:true}).catch(()=>{})}return asset}
  async function list(){let rows;try{rows=await fs.readdir(base)}catch(e){if(e.code==='ENOENT')return [];throw e}const out=[];for(const id of rows.filter(validId).slice(0,500)){try{out.push(await get(id))}catch{}}return out.sort((a,b)=>b.createdAt.localeCompare(a.createdAt))}
  async function reference(id){const asset=await get(id);if(asset.kind!=='reference'||asset.state!=='validated')throw Error('Asset is not a validated reference recording');const file=path.join(folder(id),'reference.wav');const handle=await fs.open(file,'r');let bytes;try{const info=await handle.stat();if(!info.isFile()||info.size!==asset.bytes||info.size>6*1024*1024)throw Error('Reference recording changed or is missing');bytes=Buffer.alloc(info.size);let offset=0;while(offset<bytes.length){const part=await handle.read(bytes,offset,bytes.length-offset,offset);if(!part.bytesRead)throw Error('Reference recording changed while reading');offset+=part.bytesRead}}finally{await handle.close()}if(hash(bytes)!==asset.sha256)throw Error('Reference recording changed or is missing');return {asset,bytes,path:file}}
  async function create(input,signal){
    const name=label(input.name),encoded=input.sample
    if(typeof encoded!=='string'||encoded.length>14*1024*1024)throw Error('Reference upload must be below 10 MiB')
    const bytes=decodeAudio('Reference upload',encoded)
    if(bytes.length>10*1024*1024)throw Error('Reference upload must be below 10 MiB')
    const transcript=String(input.transcript||'').trim();if(transcript.length>8000)throw Error('Reference transcript is too long')
    const out=await normalize([{audioBase64:encoded,mime:'application/octet-stream'}],signal,{timeline:true})
    const {pcm,fmt}=parsePcmWav(out.audio),duration=pcm.length/fmt.readUInt32LE(8)
    if(duration<.25||duration>120||out.audio.length>6*1024*1024)throw Error('Reference recording must be 0.25–120 seconds')
    let energy=0;for(let i=0;i<pcm.length;i+=2){const n=pcm.readInt16LE(i)/32768;energy+=n*n}if(Math.sqrt(energy/(pcm.length/2))<.0001)throw Error('Reference recording is effectively silent')
    signal?.throwIfAborted()
    return serial(async()=>{
      signal?.throwIfAborted()
      const existing=await list();if(existing.length>=500||existing.reduce((n,a)=>n+a.bytes,0)+out.audio.length>512*1024*1024)throw Error('Voice asset storage limit reached')
      const id=randomUUID(),asset={version:1,id,name,kind:'reference',state:'validated',usableAsReference:true,cloned:false,transcript,duration,sha256:hash(out.audio),bytes:out.audio.length,mime:'audio/wav',createdAt:new Date().toISOString(),bindings:[]}
      await fs.mkdir(folder(id),{recursive:true});await fs.writeFile(path.join(folder(id),'reference.wav'),out.audio,{mode:0o600});return save(asset)
    })
  }
  const update=(id,patch)=>serial(async()=>{const asset=await get(id);const name=patch.name===undefined?asset.name:label(patch.name);const transcript=patch.transcript===undefined?asset.transcript:String(patch.transcript).trim();if(transcript.length>8000)throw Error('Reference transcript is too long');return save({...asset,name,transcript,bindings:transcript===asset.transcript?asset.bindings:[]})})
  const rename=(id,name)=>update(id,{name})
  const verify=(id,binding)=>serial(async()=>{const asset=await get(id);const identity={provider:String(binding.provider),backend:String(binding.backend),model:String(binding.model)};const key=JSON.stringify(identity);/* 同一個綁定一小時內已驗證過就不重寫資料檔（逐句朗讀時每句都會走到這裡）。 */const current=asset.bindings.find(b=>JSON.stringify({provider:b.provider,backend:b.backend,model:b.model})===key);if(current?.state==='synthesis-verified'&&Date.now()-Date.parse(current.verifiedAt)<3600000)return asset;const bindings=asset.bindings.filter(b=>JSON.stringify({provider:b.provider,backend:b.backend,model:b.model})!==key);bindings.push({...identity,state:'synthesis-verified',verifiedAt:new Date().toISOString()});return save({...asset,bindings:bindings.slice(-64)})})
  async function remove(id){return serial(async()=>{await get(id);const dir=folder(id);const real=await fs.realpath(dir),parent=await fs.realpath(base);if(path.dirname(real)!==parent)throw Error('Unsafe asset directory');await fs.rm(dir,{recursive:true,force:false});return {deleted:true,scope:'local-recording-only',remoteDeleted:false}})}
  return {list,get,create,reference,update,rename,verify,remove}
}
