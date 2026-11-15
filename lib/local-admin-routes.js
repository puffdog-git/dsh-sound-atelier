import {createReadStream} from 'node:fs'
import {pipeline} from 'node:stream/promises'
import {writeJson,readBody,registerRoute} from './http-util.js'
import {localServiceOperation} from './providers/local-service.js'
import {localServiceKey} from './local-credentials.js'
export function registerLocalAdmin(ctx,api,reject){
 const route=(path,methods,fn)=>ctx.effect(()=>registerRoute(ctx.webServer, {kind:'exact',path:'/dsh-sound-atelier/'+path,handler:async(req,res)=>{
  if(!methods.includes(req.method))return writeJson(res,405,{ok:false})
  if(reject(req,res,{requireAuth:true}))return
  const controller=new AbortController(),abort=()=>controller.abort(),timer=setTimeout(abort,10*60000);res.on?.('close',abort)
  try{await fn(req,res,controller.signal,new URL(req.url,'http://localhost').searchParams)}catch(e){if(!res.headersSent)writeJson(res,400,{ok:false,error:{message:String(e.message)}})}finally{clearTimeout(timer);res.off?.('close',abort)}
 }}),'dsh-tts: '+path)
 const body=async req=>JSON.parse((await readBody(req,65536)).toString('utf8'))
 route('diagnostics',['GET'],async(_req,res)=>writeJson(res,200,{ok:true,report:await api.diagnostics()}))
 route('voice/profiles',['GET','POST'],async(req,res,signal,q)=>{
  const input={sessionId:q.get('sessionId')||'',workspaceId:q.get('workspaceId')||''}
  if(req.method==='GET')return writeJson(res,200,{ok:true,...await api.voiceContext.catalog(api.live(),input,signal)})
  const b=await body(req)
  if(!Number.isInteger(b.revision)||b.revision<0)throw Error('請先讀取音色方案的版本，再提交修改')
  let result
  if(b.action==='save'){api.validateConfig?.({...api.live(),...b.profile?.config,chain:b.profile?.chain});result=await api.voiceProfiles.save(b.profile,b.revision)}
  else if(b.action==='remove')result=await api.voiceProfiles.remove(b.id,b.revision)
  else if(b.action==='bind'){
   if(b.profileId){const catalog=await api.voiceContext.catalog(api.live(),{},signal),known=b.scope==='persona'?catalog.personas:b.scope==='workspace'?catalog.workspaces:b.scope==='session'?catalog.sessions:[];if(!known.some(x=>x.id===b.key))throw Error('所選人格、工作區或會話已不存在，請重新整理')}
   result=await api.voiceProfiles.bind(b,b.revision)
  }else throw Error('不支援的音色方案操作')
  writeJson(res,200,{ok:true,...result})
 })
 route('maintenance',['GET','POST','DELETE'],async(req,res)=>{
  if(req.method==='GET')return writeJson(res,200,{ok:true,jobs:api.maintenanceJobs.list()})
  const b=await body(req)
  if(req.method==='DELETE')return writeJson(res,200,{ok:true,job:api.maintenanceJobs.cancel(b.id)})
  const cfg={...api.live()};let work
  if(b.action==='install')work=(signal,log)=>api.installRuntime(b.backend,b.device,signal,log)
  else if(b.action==='launch')work=signal=>api.localModelRuntime.launch(cfg,b.input||{},signal)
  else if(b.action==='native-load')work=signal=>api.nativeRuntime.load(cfg,signal)
  else if(b.action==='rvc-start')work=signal=>api.rvcRuntime.start(cfg,signal)
  else if(b.action==='rvc-load')work=signal=>api.rvcRuntime.load(cfg,signal)
  else if(b.action==='compact-index')work=signal=>api.rvcRuntime.compact(cfg,b.id,b.targetVectors,signal)
  else if(b.action==='install-pack')work=signal=>api.voiceModels.install(b,signal)
  else if(b.action==='provision')work=signal=>api.provisionLocal(cfg,signal)
  else throw Error('Unknown maintenance action')
  writeJson(res,202,{ok:true,job:api.maintenanceJobs.start(b.action,work)})
 })
 route('voice/models',['GET','POST','PATCH','DELETE'],async(req,res,signal,q)=>{
  if(req.method==='GET')return writeJson(res,200,{ok:true,models:await api.voiceModels.list()})
  if(req.method==='POST'){
   const trusted=q.get('trusted')==='true'
   const result=q.get('kind')==='zip'?await api.voiceModels.importPack(req,{trusted},signal):{model:await api.voiceModels.importStream(req,{kind:q.get('kind'),name:q.get('name'),trusted},signal)}
   return writeJson(res,200,{ok:true,...result})
  }
  const b=await body(req)
  const result=req.method==='PATCH'?{model:await api.voiceModels.rename(b.id,b.name)}:await api.voiceModels.remove(b.id)
  writeJson(res,200,{ok:true,...result})
 })
 route('voice/registry',['POST'],async(req,res,signal)=>{const b=await body(req);writeJson(res,200,{ok:true,...await api.voiceModels.registry(b.url,signal)})})
 route('voice/pack',['GET'],async(_req,res,signal,q)=>{
  const pack=await api.voiceModels.exportPack(q.get('model'),q.get('index'),signal)
  try{res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="dsh-tts-voicepack.zip"','Cache-Control':'no-store'});await pipeline(createReadStream(pack.path),res,{signal})}finally{await pack.cleanup()}
 })
 route('local/native',['GET','POST'],async(req,res)=>{
  if(req.method==='POST'){const b=await body(req);if(b.action!=='stop')throw Error('Use maintenance to load a native model');await api.nativeRuntime.stop()}
  writeJson(res,200,{ok:true,status:api.nativeRuntime.status()})
 })
 route('local/rvc',['GET','POST'],async(req,res)=>{
  if(req.method==='POST'){const b=await body(req);if(b.action!=='stop')throw Error('Use maintenance for RVC operations');await api.rvcRuntime.stop()}
  writeJson(res,200,{ok:true,status:api.rvcRuntime.status()})
 })
}
