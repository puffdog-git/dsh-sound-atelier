import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {randomUUID} from 'node:crypto'
const monthOf=date=>date.toISOString().slice(0,7)
export function googleVoiceTier(model,voice){const s=String(model)+' '+String(voice);return /gemini/i.test(s)?'Gemini-TTS':/Chirp3|Chirp-3|Chirp/i.test(s)?'Chirp3':/Neural2/i.test(s)?'Neural2':/Wavenet/i.test(s)?'WaveNet':/Studio/i.test(s)?'Studio':/Standard/i.test(s)?'Standard':'Other'}
export function createUsageLedger({root=process.env.DSH_HOME||path.join(os.homedir(),'.dsh'),now=()=>new Date()}={}){
 const file=path.join(root,'data/dsh-tts/usage.json');let queue=Promise.resolve()
 async function read(){try{const data=JSON.parse(await fs.readFile(file,'utf8'));if(data.version!==1||!data.months)throw Error();return data}catch(e){if(e.code==='ENOENT')return {version:1,months:{}};throw Error('Usage ledger is unreadable; existing data was not overwritten')}}
 const serial=fn=>{const p=queue.then(fn);queue=p.catch(()=>{});return p}
 async function record({provider,model,voice,text,success=false,submitted=false,cacheHit=false}){if(cacheHit||!submitted)return
  return serial(async()=>{const data=await read(),month=monthOf(now()),tier=provider==='google-cloud'?googleVoiceTier(model,voice):'all',key=provider+':'+tier
   const table=data.months[month]||(data.months[month]={}),entry=table[key]||(table[key]={provider,tier,submittedCharacters:0,successfulCharacters:0,requests:0,successfulRequests:0})
   const characters=Array.from(String(text||'')).length;entry.submittedCharacters+=characters;entry.requests++;if(success){entry.successfulCharacters+=characters;entry.successfulRequests++}
   const months=Object.keys(data.months).sort();for(const old of months.slice(0,-24))delete data.months[old]
   await fs.mkdir(path.dirname(file),{recursive:true});const tmp=file+'.'+randomUUID()+'.tmp';try{await fs.writeFile(tmp,JSON.stringify(data),{mode:0o600});await fs.rename(tmp,file)}finally{await fs.rm(tmp,{force:true}).catch(()=>{})}
  })
 }
 async function snapshot(){await queue;const data=await read();return {month:monthOf(now()),months:data.months,estimated:true,note:'Plugin submission estimate, not the provider bill. Retries, rejected calls, SSML and caching may be billed differently. No text or credentials are stored.'}}
 return {record,snapshot}
}
