import {execFile} from 'node:child_process'
import {randomBytes} from 'node:crypto'
import path from 'node:path'
import os from 'node:os'
import {localRoot} from './providers/local-service.js'
import {readLocalCredentials,saveLocalCredentials} from './local-credentials.js'
// First-use account creation is permitted only for this plugin's owned service.
export async function provisionLocal(cfg,runtime,signal,{root=path.join(os.homedir(),'.dsh'),fetchImpl=fetch}={}){
 const origin=localRoot(cfg),state=runtime.status()
 if(!state.owned||state.origin!==origin)throw Error('Start the plugin-owned Xinference service first; existing external accounts are never replaced')
 if(process.platform!=='win32')throw Error('Automatic local account storage requires Windows DPAPI')
 const python=path.join(root,'tts-runtimes/uv-tools/xinference/Scripts/python.exe'),database=path.join(root,'tts-xinference/auth/auth.db')
 const setup=await new Promise((resolve,reject)=>execFile(python,['-c',"import sqlite3,sys,json; c=sqlite3.connect('file:'+sys.argv[1]+'?mode=ro',uri=True); r=c.execute(\"SELECT value FROM system_config WHERE key='setup_token'\").fetchone(); print(json.dumps(r[0] if r else None)); c.close()",database],{windowsHide:true,timeout:10000,signal},(e,out)=>{if(e)reject(Error('Cannot read owned first-run setup state'));else try{resolve(JSON.parse(out))}catch{reject(Error('Invalid setup state'))}}))
 let account=await readLocalCredentials(cfg,{root})
 if(!account&&!setup)throw Error('This service already has an account; configure its credentials manually instead of replacing them')
 if(!account){account={origin,username:'dsh-local-admin',password:'Dsh!'+randomBytes(24).toString('base64url'),clientUsername:'dsh-tts-client',clientPassword:'Dsh!'+randomBytes(24).toString('base64url'),createdAt:new Date().toISOString()};await saveLocalCredentials(account,{root})}
 const request=async(endpoint,body,token)=>{const r=await fetchImpl(origin+endpoint,{method:body?'POST':'GET',headers:{...(body?{'content-type':'application/json'}:{}),...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal,redirect:'error'});if(!r.ok){await r.body?.cancel();throw Error('Local account setup HTTP '+r.status+' at '+endpoint)}return r.json()}
 if(setup)await request('/v1/admin/setup',{setup_token:setup,username:account.username,password:account.password})
 const {access_token}=await request('/token',{username:account.username,password:account.password})
 const users=await request('/v1/admin/users',null,access_token),rows=Array.isArray(users)?users:users.users||[]
 let client=rows.find(u=>u.username===account.clientUsername)
 if(!client)client=await request('/v1/admin/users',{username:account.clientUsername,password:account.clientPassword,permissions:['models:list','models:read','models:write']},access_token)
 if(!account.apiKey){const k=await request('/v1/admin/keys',{owner:client.id,name:'DSH local TTS connector',model_permissions:[{permission_type:'model_type',permission_value:'audio'}]},access_token);account.apiKey=k.key;account.apiKeyId=k.id;await saveLocalCredentials(account,{root})}
 await request('/v1/models',null,account.apiKey)
 return {connectionVerified:true,protection:'Windows DPAPI CurrentUser',inferenceVerified:false}
}
