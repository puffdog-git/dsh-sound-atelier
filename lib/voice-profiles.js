import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {randomUUID} from 'node:crypto'
import {PROVIDER_KEYS} from './providers.js'
import {assertCredentialRef} from './keys.js'
// 舊版誤列、從未生效的欄位：讀到時略過，不讓既有方案驗證失敗。
// 舊方案可能帶著這些已不使用的鍵：讀取時略過，不讓方案失效。
const LEGACY_PROFILE_FIELDS=['localTtsIdleMinutes','enableLocalEngines','kokoroEnabled','f5Enabled']
export const PROFILE_FIELDS=['rate','pitch','volume','speechInstruction','voaiPitch','doubaoPitch','styleWeight','breathPause','spokenLanguage','translationModel','translationGlossary','translationMaxTokens','localTtsBackend','localTtsFamily','localTtsReferenceAsset','localTtsEmotionAsset','localTtsPromptLanguage','localTtsLanguage','localTtsDevice','localTtsModelPath','localTtsNativeModel','localTtsNativeTrusted','rvcEnabled','rvcManaged','rvcBaseUrl','rvcDevice','rvcModelAsset','rvcIndexAsset','rvcOptions','providerOptions','localTtsBaseUrl','localTtsIdleSeconds','language','mimoInstruction','doubaoInstruction','mimoVoiceDesign','mimoReferencePath','deepinfraVoiceDesign','siliconflowVoiceMode','siliconflowReferencePath','siliconflowReferenceText','cosyvoiceUrl','cosyvoiceApiMode','cosyvoiceMode','cosyvoiceReferencePath','cosyvoiceReferenceText','cosyvoiceSampleRate','minimaxTransport','piperModel','piperBin','espeakBin','edgeBin','rvcBypassOnFailure']
const uuid=id=>typeof id==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id)
const forbidden=/^(?:key|token|api[_-]?key|password|secret|.*SecretAccessKey|secretAccessKey|accessToken|access_token|bearerToken|client_secret|authorization|credentials?)$/i
function assertNoSecrets(value){if(!value||typeof value!=='object')return;for(const[k,v]of Object.entries(value)){if(forbidden.test(k))throw Error('音色方案不能儲存金鑰、密碼或授權內容，請使用安全憑證槽');if(v&&typeof v==='object')assertNoSecrets(v)}}
function entry(input){if(!input||!PROVIDER_KEYS.includes(input.provider))throw Error('請選有效的語音服務');const out={provider:input.provider};for(const[k,max]of [['model',300],['voice',500],['style',300],['referenceAsset',100]])if(input[k]!==undefined){if(typeof input[k]!=='string'||input[k].length>max||/[\x00-\x1f]/.test(input[k]))throw Error('音色方案的 '+k+' 格式不正確');out[k]=input[k]}
 if(input.baseUrl){const u=new URL(input.baseUrl);if(!(input.provider==='doubao'?['http:','https:','ws:','wss:']:['http:','https:']).includes(u.protocol)||u.username||u.password||u.search||u.hash)throw Error('服務網址不可內嵌憑證或查詢參數');out.baseUrl=u.href.replace(/\/$/,'')}
 if(input.keyEnv)out.keyEnv=assertCredentialRef(input.keyEnv)
 if(input.options){if(typeof input.options!=='string'||input.options.length>16384)throw Error('服務參數過長');const value=JSON.parse(input.options);if(!value||typeof value!=='object'||Array.isArray(value))throw Error('服務參數必須是 JSON 物件');assertNoSecrets(value);out.options=JSON.stringify(value)}return out
}
export function profileInput(input){
 if(!input||typeof input.name!=='string'||!input.name.trim()||input.name.length>100||/[\x00-\x1f]/.test(input.name))throw Error('音色方案名稱需為 1–100 字元')
 if(!Array.isArray(input.chain)||input.chain.length<1||input.chain.length>8)throw Error('音色方案需包含 1–8 個服務列')
 const unknown=Object.keys(input.config||{}).filter(k=>!PROFILE_FIELDS.includes(k)&&!LEGACY_PROFILE_FIELDS.includes(k));if(unknown.length)throw Error('音色方案含不支援的設定欄位：'+unknown.join('、'));
 const patch={};for(const key of PROFILE_FIELDS)if(input.config?.[key]!==undefined){const value=input.config[key];if(!['string','number','boolean'].includes(typeof value)||typeof value==='string'&&value.length>20000||typeof value==='number'&&!Number.isFinite(value))throw Error('音色方案設定格式不正確');if(['providerOptions','translationGlossary','rvcOptions'].includes(key)){const parsed=JSON.parse(value);assertNoSecrets(parsed)}patch[key]=value}
 const booleanFields=['localTtsNativeTrusted','rvcEnabled','rvcManaged','rvcBypassOnFailure'];for(const k of booleanFields)if(patch[k]!==undefined&&typeof patch[k]!=='boolean')throw Error(k+' 必須是開關值');
 const ranges={rate:[.5,2],pitch:[-50,50],volume:[0,1],voaiPitch:[-5,5],doubaoPitch:[-12,12],styleWeight:[0,1],breathPause:[0,10],translationMaxTokens:[256,12000]};for(const[k,[min,max]]of Object.entries(ranges))if(patch[k]!==undefined&&(!Number.isFinite(patch[k])||patch[k]<min||patch[k]>max))throw Error(k+' 超出有效範圍');
 for(const[k,values]of Object.entries({spokenLanguage:['original','ja'],localTtsDevice:['cpu','cuda:0'],rvcDevice:['cpu','cuda:0'],localTtsBackend:['xinference','gpt-sovits','dots-native','index-native']}))if(patch[k]!==undefined&&!values.includes(patch[k]))throw Error(k+' 選項不正確');
 for(const k of ['localTtsBaseUrl','rvcBaseUrl','cosyvoiceUrl'])if(patch[k]){const u=new URL(patch[k]);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.search||u.hash)throw Error('服務網址不可內嵌憑證或查詢參數')}
 return {name:input.name.trim(),chain:input.chain.map(entry),config:patch}
}
export function createVoiceProfiles({root=process.env.DSH_HOME||path.join(os.homedir(),'.dsh')}={}){
 const file=path.join(root,'data/dsh-tts/voice-profiles.json');let queue=Promise.resolve()
 const serial=fn=>{const p=queue.then(fn);queue=p.catch(()=>{});return p}
 async function read(){try{const info=await fs.stat(file);if(info.size>4*1024*1024)throw Error();const data=JSON.parse(await fs.readFile(file,'utf8'));if(data.version!==1||!Number.isInteger(data.revision)||!Array.isArray(data.profiles)||!Array.isArray(data.bindings)||data.profiles.length>100||data.bindings.length>1000)throw Error();data.profiles=data.profiles.map(p=>{if(!uuid(p.id))throw Error();return {id:p.id,...profileInput(p),createdAt:String(p.createdAt||'').slice(0,40),updatedAt:String(p.updatedAt||'').slice(0,40)}});if(data.bindings.some(b=>!['session','workspace','persona'].includes(b.scope)||typeof b.key!=='string'||b.key.length>1000||!uuid(b.profileId)))throw Error();data.bindings=data.bindings.map(b=>({scope:b.scope,key:b.key,profileId:b.profileId}));return {version:1,revision:data.revision,profiles:data.profiles,bindings:data.bindings}}catch(e){if(e.code==='ENOENT')return {version:1,revision:0,profiles:[],bindings:[]};throw Error('音色方案資料無法讀取；原始檔案未被覆寫')}}
 async function mutate(fn,revision){return serial(async()=>{const data=await read();if(revision!==undefined&&data.revision!==revision)throw Error('音色方案已被其他視窗修改，請重新整理');const result=await fn(data);data.revision++;await fs.mkdir(path.dirname(file),{recursive:true});const tmp=file+'.'+randomUUID()+'.tmp';try{await fs.writeFile(tmp,JSON.stringify(data,null,2),{mode:0o600});await fs.rename(tmp,file)}finally{await fs.rm(tmp,{force:true}).catch(()=>{})}return {...result,revision:data.revision}})}
 const list=async()=>{await queue;return read()}
 const save=(input,revision)=>mutate(data=>{const id=input.id||randomUUID(),value=profileInput(input),old=data.profiles.find(p=>p.id===id);if(!uuid(id)||input.id&&!old)throw Error('找不到音色方案');if(!old&&data.profiles.length>=100)throw Error('音色方案已達 100 組');const profile={id,...value,createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};data.profiles=data.profiles.filter(p=>p.id!==id).concat(profile);return {profile}},revision)
 const remove=(id,revision)=>mutate(data=>{if(!data.profiles.some(p=>p.id===id))throw Error('找不到音色方案');const unbound=data.bindings.filter(b=>b.profileId===id).length;data.profiles=data.profiles.filter(p=>p.id!==id);data.bindings=data.bindings.filter(b=>b.profileId!==id);return {deleted:true,unbound,scope:'local-profile-only'}},revision)
 const bind=({scope,key,profileId},revision)=>mutate(data=>{if(!['session','workspace','persona'].includes(scope)||typeof key!=='string'||!key.trim()||key.length>1000||/[\x00-\x1f]/.test(key))throw Error('請選擇正確的會話、工作區或人格');if(profileId&&!data.profiles.some(p=>p.id===profileId))throw Error('找不到要綁定的音色方案');data.bindings=data.bindings.filter(b=>b.scope!==scope||b.key!==key);if(profileId)data.bindings.push({scope,key,profileId});if(data.bindings.length>1000)throw Error('音色綁定已達上限');return {bound:!!profileId}},revision)
 async function resolve(cfg,{sessionId,workspaceId,personaId,profileId}={}){
  const data=await list();let selected,scope
  if(profileId){selected=data.profiles.find(p=>p.id===profileId);scope='request';if(!selected)throw Error('指定的音色方案不存在')}
  else for(const [kind,key]of [['session',sessionId],['workspace',workspaceId],['persona',personaId]]){if(!key)continue;const binding=data.bindings.find(b=>b.scope===kind&&b.key===key);if(binding){selected=data.profiles.find(p=>p.id===binding.profileId);if(!selected)throw Error('音色綁定指向已不存在的方案');scope=kind;break}}
  if(!selected)return {...cfg,_voiceResolved:true,_voiceScope:sessionId||workspaceId||'',_voiceBinding:{source:'global',personaId:personaId||null}}
  return {...cfg,...selected.config,chain:structuredClone(selected.chain),roles:{...cfg.roles,reply:{}},_voiceResolved:true,_voiceProfileId:selected.id,_voiceScope:sessionId||workspaceId||'',_voiceBinding:{source:scope,profileId:selected.id,profileName:selected.name,personaId:personaId||null,sessionId:sessionId||null,workspaceId:workspaceId||null}}
 }
 return {list,save,remove,bind,resolve}
}
