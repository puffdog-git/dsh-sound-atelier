import path from 'node:path'
import {boundedJson} from './providers/native-http.js'
const service=(ctx,name)=>{try{return ctx.get?.(name)||ctx[name]}catch{return undefined}}
const clean=value=>typeof value==='string'?value.slice(0,1000):''
const samePath=(a,b)=>{if(!a||!b)return false;const normalize=s=>process.platform==='win32'?path.resolve(s).toLowerCase():path.resolve(s);return normalize(a)===normalize(b)}
export function createVoiceContext({ctx,profiles,fetchImpl=fetch}={}){
 const adapters=new Map()
 function register(adapter){if(!adapter||!/^[a-zA-Z0-9_.-]{1,100}$/.test(adapter.id)||typeof adapter.snapshot!=='function'||adapters.has(adapter.id))throw Error('人格音色適配器格式不正確或重複');adapters.set(adapter.id,adapter);return()=>{if(adapters.get(adapter.id)===adapter)adapters.delete(adapter.id)}}
 register({id:'dsh-persona-dafeiyu',name:'大肥魚人格套件',async snapshot(context,signal){
  const origin=service(ctx,'webServer')?.getOrigin?.();if(!origin)return {available:false,personas:[],effective:null}
  const root=new URL(origin);if(!['http:','https:'].includes(root.protocol)||!['localhost','127.0.0.1','[::1]'].includes(root.hostname)||root.username||root.password)throw Error('人格查詢僅使用目前 DSH 的本機服務')
  const url=new URL('/api/dsh-persona-dafeiyu/status',root);if(context.sessionId)url.searchParams.set('sessionId',context.sessionId);if(context.cwd)url.searchParams.set('cwd',context.cwd)
  const timeout=AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(3000)]),data=await boundedJson('人格狀態',await fetchImpl(url,{signal:timeout,redirect:'error'}),timeout,1024*1024)
  if(!data.ok||!data.value)throw Error('人格狀態格式不正確');const value=data.value
  return {available:true,personas:(Array.isArray(value.personas)?value.personas:[]).slice(0,500).map(p=>({id:clean(p.id),name:clean(p.name),enabled:p.enabled!==false})),effective:value.active&&value.effective?.enabled!==false?{id:clean(value.effective?.id),name:clean(value.effective?.name)}:null}
 }})
 async function context(input={},signal){
  const sessionId=clean(input.sessionId);if(sessionId.length>256)throw Error('會話 ID 過長')
  let header;if(sessionId)try{header=service(ctx,'sessions')?.get?.(sessionId)?.header||service(ctx,'agents')?.get?.(sessionId)?.session?.header}catch{}
  if(sessionId&&!header)try{header=(await service(ctx,'sessionPersistence')?.stat?.(sessionId,{signal}))?.header}catch(e){signal?.throwIfAborted()}
  let list=[];try{list=service(ctx,'workspaceRegistry')?.list?.()||[]}catch{}
  let workspace=list.find(w=>sessionId&&w.sessionIds?.includes(sessionId))||list.find(w=>samePath(w.path,header?.cwd))
  if(!workspace&&input.workspaceId)workspace=service(ctx,'workspaceRegistry')?.get?.(input.workspaceId)
  if(input.workspaceId&&workspace?.id!==input.workspaceId)throw Error('指定工作區與會話不一致或已不存在')
  return {sessionId,workspaceId:workspace?.id||'',cwd:header?.cwd||workspace?.path||'',workspaceTitle:workspace?.title||''}
 }
 async function persona(context,cfg={},signal){
  const results=[]
  for(const adapter of adapters.values()){
   if(cfg.personaAdapter&&cfg.personaAdapter!=='auto'&&cfg.personaAdapter!==adapter.id)continue
   try{const value=await adapter.snapshot(context,signal),personas=(value.personas||[]).filter(p=>p&&clean(p.id)).map(p=>({id:adapter.id+':'+clean(p.id),name:clean(p.name),adapter:adapter.id,adapterName:adapter.name||adapter.id,enabled:p.enabled!==false})),effective=value.effective?.id?{id:adapter.id+':'+clean(value.effective.id),name:clean(value.effective.name),adapter:adapter.id}:null;results.push({id:adapter.id,name:adapter.name||adapter.id,available:value.available!==false,personas,effective})}
   catch{signal?.throwIfAborted();results.push({id:adapter.id,name:adapter.name||adapter.id,available:false,personas:[],effective:null})}
  }
  const active=results.filter(r=>r.effective);return {adapters:results,effective:active.length===1?active[0].effective:null,ambiguous:active.length>1}
 }
 async function resolve(cfg,input={},signal){
  if(cfg._voiceResolved)return cfg
  const current=await context(input,signal),stored=await profiles.list(),catalog=stored.bindings.some(b=>b.scope==='persona')?await persona(current,cfg,signal):{effective:null,ambiguous:false},result=await profiles.resolve(cfg,{...current,personaId:catalog.effective?.id,profileId:input.profileId})
  result._sessionId=current.sessionId;result._workspaceId=current.workspaceId;result._voiceBinding={...result._voiceBinding,personaName:catalog.effective?.name||null,workspaceTitle:current.workspaceTitle,...(catalog.ambiguous?{warning:'有多個人格套件同時生效，請指定人格音色來源'}:{})}
  return result
 }
 async function catalog(cfg,input={},signal){
  const current=await context(input,signal),people=await persona(current,cfg,signal),data=await profiles.list();let workspaces=[],sessions=[]
  try{workspaces=(service(ctx,'workspaceRegistry')?.list?.()||[]).slice(0,500).map(w=>({id:w.id,title:w.title,path:w.path,sessionIds:w.sessionIds||[]}))}catch{}
  try{sessions=(await service(ctx,'sessionPersistence')?.list?.({signal})||[]).slice(-500).map(r=>({id:r.header.id,title:r.header.title||r.header.id,cwd:r.header.cwd}))}catch{signal?.throwIfAborted()}
  const resolved=await profiles.resolve(cfg,{...current,personaId:people.effective?.id})
  return {...data,context:current,personas:people.adapters.flatMap(a=>a.personas),personaAdapters:people.adapters.map(({personas,effective,...a})=>({...a,effective})),effectivePersona:people.effective,workspaces,sessions,effectiveVoice:resolved._voiceBinding}
 }
 return {register,resolve,catalog,context}
}
