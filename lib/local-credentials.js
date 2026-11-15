import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { localRoot } from './providers/local-service.js'

function dpapi(input,decrypt=false){
 if(process.platform!=='win32')return Promise.reject(Error('Managed local credentials require Windows DPAPI; use the host credentials store on other platforms'))
 const script="$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Security; $bytes=[Convert]::FromBase64String([Console]::In.ReadToEnd()); $scope=[System.Security.Cryptography.DataProtectionScope]::CurrentUser; $result=[System.Security.Cryptography.ProtectedData]::"+(decrypt?'Unprotect':'Protect')+"($bytes,$null,$scope); [Console]::Out.Write([Convert]::ToBase64String($result))"
 return new Promise((resolve,reject)=>{
  const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,stdio:['pipe','pipe','ignore']});let output='',done=false
  const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);error?reject(error):resolve(value)}
  const timer=setTimeout(()=>{child.kill();finish(Error('Local credential protection timed out'))},10000)
  child.stdout.on('data',b=>{output+=b;if(output.length>100000){child.kill();finish(Error('Invalid protected credential output'))}})
  child.stdin.on('error',()=>{});child.on('error',()=>finish(Error('Windows credential protection unavailable')));child.on('close',code=>finish(code===0?null:Error('Windows credential protection failed'),Buffer.from(output,'base64')))
  child.stdin.end(Buffer.from(input).toString('base64'))
 })
}
const credentialPath=root=>path.join(root||path.join(os.homedir(),'.dsh'),'tts-runtimes','credentials','xinference-local.dpapi')
const cache=new Map()
export async function saveLocalCredentials(value,{root}={}){
 const expected=localRoot({localTtsBaseUrl:value.origin});if(new URL(expected).pathname!=='/')throw Error('Local credential binding must be an origin')
 const bytes=await dpapi(Buffer.from(JSON.stringify({...value,origin:expected})))
 const file=credentialPath(root);await fs.mkdir(path.dirname(file),{recursive:true});const tmp=file+'.'+randomUUID()+'.tmp';await fs.writeFile(tmp,bytes,{mode:0o600});await fs.rename(tmp,file);cache.delete(file)
 return {stored:true,path:file,protection:'Windows DPAPI CurrentUser'}
}
export async function readLocalCredentials(cfg,{root}={}){
 // Validate the requested destination before accessing the encrypted secret.
 const requested=localRoot(cfg)
 const file=credentialPath(root);let stat;try{stat=await fs.stat(file)}catch(e){if(e.code==='ENOENT')return null;throw e}
 const stored=cache.get(file)
 let data
 if(stored&&stored.mtime===stat.mtimeMs&&stored.size===stat.size&&stored.expires>Date.now())data=stored.data
 else {data=JSON.parse((await dpapi(await fs.readFile(file),true)).toString('utf8'));if(cache.size>=16)cache.delete(cache.keys().next().value);cache.set(file,{data,mtime:stat.mtimeMs,size:stat.size,expires:Date.now()+60000})}
 if(data.origin!==requested)return null
 return data
}
export async function localServiceKey(cfg,resolveKey,options){
 localRoot(cfg)
 const configured=await resolveKey?.(cfg.localTtsKeyEnv||'LOCAL_TTS_API_KEY')
 if(configured)return configured
 return (await readLocalCredentials(cfg,options))?.apiKey||''
}
/** 有沒有代管的本機帳號（只看檔案在不在，不解密）。 */
export async function hasLocalCredentials(options){
 try{await fs.access(credentialPath(options?.root));return true}catch{return false}
}
/**
 * 給設定頁「顯示登入資訊」用：聲音工坊安裝本機 Xinference 時替你建立的帳號。
 * 只回傳給通過本機與登入檢查的設定頁請求；不寫進記錄，也不是模型可以呼叫的工具。
 */
export async function localAccessInfo(cfg,options){
 const account=await readLocalCredentials(cfg,options)
 if(!account)return null
 const text=value=>typeof value==='string'?value:''
 return {origin:account.origin,uiUrl:account.origin+'/',admin:{username:text(account.username),password:text(account.password)},client:{username:text(account.clientUsername),password:text(account.clientPassword)},apiKey:text(account.apiKey),createdAt:text(account.createdAt)}
}
const managementTokens=new Map()
export async function localManagementToken(cfg,resolveKey,options){
 const origin=localRoot(cfg),configured=await resolveKey?.(cfg.localTtsKeyEnv||'LOCAL_TTS_API_KEY')
 if(configured)return configured
 const account=await readLocalCredentials(cfg,options)
 if(!account?.clientUsername||!account?.clientPassword)throw Error('Xinference model management requires an account access token; API keys are query/inference only')
 const cacheKey=origin+'|'+credentialPath(options?.root),cached=managementTokens.get(cacheKey)
 if(cached&&cached.expires>Date.now())return cached.token
 const response=await (options?.fetchImpl||fetch)(origin+'/token',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:account.clientUsername,password:account.clientPassword}),signal:AbortSignal.timeout(10000),redirect:'error'})
 if(!response.ok){await response.body?.cancel?.();throw Error('Local model-management login failed (HTTP '+response.status+')')}
 const result=await response.json();if(typeof result.access_token!=='string'||result.access_token.length>16000)throw Error('Invalid local account access token')
 if(managementTokens.size>=16)managementTokens.delete(managementTokens.keys().next().value)
 managementTokens.set(cacheKey,{token:result.access_token,expires:Date.now()+60000})
 return result.access_token
}
