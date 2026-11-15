import {spawn,execFile} from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {fileURLToPath} from 'node:url'
import {createRequire} from 'node:module'
import {localRoot} from '../providers/local-service.js'
import {boundedJson,decodeAudio} from '../providers/native-http.js'
import {parsePcmWav} from '../providers/audio.js'
const require=createRequire(import.meta.url)
export function rvcControls(cfg){
 const value=JSON.parse(cfg.rvcOptions||'{}'),out={spk_id:0,f0_method:'rmvpe',index_rate:.75,f0_up_key:0,resample_sr:40000,rms_mix_rate:.25,protect:.33,filter_radius:3}
 if(!value||Array.isArray(value)||Object.keys(value).some(k=>!Object.hasOwn(out,k)))throw Error('Unsupported RVC controls')
 Object.assign(out,value)
 for(const[k,min,max,integer]of [['spk_id',0,1024,true],['f0_up_key',-24,24,true],['filter_radius',0,7,true],['resample_sr',0,48000,true],['index_rate',0,1],['rms_mix_rate',0,1],['protect',0,.5]])if(!Number.isFinite(out[k])||out[k]<min||out[k]>max||integer&&!Number.isInteger(out[k]))throw Error('Invalid RVC '+k)
 if(!['rmvpe','pm','harvest','crepe','rmvpe+','mangio-crepe','fcpe'].includes(out.f0_method))throw Error('Unsupported RVC pitch extractor')
 return out
}
const origin=cfg=>{const value=localRoot({localTtsBaseUrl:cfg.rvcBaseUrl||'http://127.0.0.1:4892'});if(new URL(value).pathname!=='/')throw Error('RVC requires a loopback origin');return value}
export function createRvcRuntime({root=path.join(os.homedir(),'.dsh'),models,fetchImpl=fetch,spawnImpl=spawn,now=Date.now}={}){
 let child,state='stopped',serviceOrigin='',lastUsed=0,busy=false,tail=Promise.resolve(),queued=0,generation=0,queueEpoch=0,starting;const events=[]
 const record=type=>{events.push({type,time:new Date(now()).toISOString()});if(events.length>40)events.shift()}
 const runtimeDir=path.join(root,'tts-runtimes','rvc'),python=path.join(runtimeDir,process.platform==='win32'?'Scripts/python.exe':'bin/python'),repo=path.join(runtimeDir,'repo')
 const status=()=>({state,owned:!!child,busy,queued,origin:serviceOrigin,packageInstalled:fs.existsSync(python)&&fs.existsSync(path.join(repo,'infer')),lastUsed,events:[...events]})
 async function stop(manual=true){if(manual)queueEpoch++;const current=child;if(!current)throw Error('This plugin does not own the RVC service');child=null;generation++;state='stopping';if(process.platform==='win32'&&current.exitCode===null)await new Promise(resolve=>execFile('taskkill.exe',['/PID',String(current.pid),'/T','/F'],{windowsHide:true,timeout:10000},()=>resolve()));else current.kill('SIGTERM');state='stopped';record('owned-service-stopped');return status()}
 async function health(cfg,signal){return boundedJson('RVC',await fetchImpl(origin(cfg)+'/health',{signal,redirect:'error'}),signal,65536)}
 async function start(cfg,signal){if(starting)return starting;starting=startInternal(cfg,signal).finally(()=>starting=null);return starting}
 async function startInternal(cfg,signal){
  const url=new URL(origin(cfg));if(child){if(serviceOrigin!==url.origin)throw Error('Stop the owned RVC service before changing its address');return status()}
  serviceOrigin=url.origin
  try{await health(cfg,AbortSignal.timeout(1500));state='external';record('external-service-detected');return status()}catch{}
  if(url.protocol!=='http:')throw Error('Managed RVC requires an HTTP loopback origin')
  if(!status().packageInstalled)throw Error('Prepare the isolated RVC runtime first')
  if(!['cpu','cuda:0'].includes(cfg.rvcDevice||'cpu'))throw Error('Select CPU or the first CUDA GPU')
  const env={...process.env},pathKey=Object.keys(env).find(k=>k.toLowerCase()==='path')||'PATH'
  env[pathKey]=[path.dirname(require('ffmpeg-static')),path.join(runtimeDir,'Scripts'),env[pathKey]||''].join(path.delimiter)
  child=spawnImpl(python,[fileURLToPath(new URL('../../tools/rvc-server.py',import.meta.url)),'--rvc-dir',repo,'--port',url.port||'80','--device',cfg.rvcDevice||'cpu','--fp32'],{windowsHide:true,stdio:['ignore','pipe','pipe'],env});const current=child;current.stdout.resume();current.stderr.resume();state='starting';generation++;record('starting')
  current.on('error',()=>{if(child===current){child=null;state='failed';record('process-error')}});current.on('exit',()=>{if(child===current){child=null;state='stopped';record('process-exit')}})
  try{for(let n=0;n<180;n++){signal?.throwIfAborted();if(child!==current)throw Error('RVC process exited');try{const info=await health(cfg,AbortSignal.timeout(1500));if(info.ok){state='running';lastUsed=now();record('ready');return status()}}catch{}await new Promise(r=>setTimeout(r,500))}throw Error('RVC startup timed out')}catch(e){if(child===current)await stop();throw e}
 }
 async function json(cfg,route,payload,signal){return boundedJson('RVC',await fetchImpl(origin(cfg)+route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal,redirect:'error'}),signal,64*1024*1024)}
 async function convert(out,cfg,signal){
  if(management)throw Error('RVC maintenance is running');if(queued>=8)throw Error('RVC conversion queue is full');queued++;const requestedEpoch=queueEpoch
  const run=async()=>{
   signal?.throwIfAborted();if(requestedEpoch!==queueEpoch)throw Error('RVC queue stopped');if(!cfg.rvcModelAsset)throw Error('Select an imported RVC model')
   const controls=rvcControls(cfg),model=await models.file(cfg.rvcModelAsset),index=cfg.rvcIndexAsset?await models.file(cfg.rvcIndexAsset):null
   if(model.record.kind!=='pth'||index&&index.record.kind!=='index')throw Error('RVC model/index types are invalid')
   if(!index)controls.index_rate=0
   if(cfg.rvcManaged!==false)await start(cfg,signal)
   const info=await health(cfg,signal),epoch=generation;busy=true;lastUsed=now();let cancellation
   const abort=()=>{if(child)cancellation=stop(false).then(()=>record('inference-process-cancelled'));else record('external-transport-cancelled')}
   signal?.addEventListener('abort',abort,{once:true})
   try{
    signal?.throwIfAborted()
    if(!info.atomic_model_selection)await json(cfg,'/load',{model:model.path,index:index?.path||''},signal)
    const result=await json(cfg,'/convert',{model:model.path,index:index?.path||'',audio_base64:out.audio.toString('base64'),params:controls,trim_silence:false},signal)
    signal?.throwIfAborted();const audio=decodeAudio('RVC',result.audio_base64),parsed=parsePcmWav(audio);if(!parsed.pcm.length)throw Error('RVC returned empty PCM');if(child&&generation!==epoch)throw Error('RVC service changed during conversion')
    await models.verify?.(model.record.id);state=child?'verified':'external';record('conversion-verified');return {...out,audio,mime:'audio/wav',timing:undefined,conversion:{kind:'rvc',modelAsset:model.record.id,indexAsset:index?.record.id||null,timingPreserved:false}}
   }finally{signal?.removeEventListener('abort',abort);await cancellation;busy=false;lastUsed=now()}
  }
  const result=tail.then(run);tail=result.catch(()=>{}).finally(()=>{queued--});return result
 }
 async function compactInternal(cfg,id,targetVectors,signal){if(!Number.isInteger(targetVectors)||targetVectors<500||targetVectors>200000)throw Error('Index compression target must be 500–200000 vectors');if(busy||queued)throw Error('Wait for current RVC conversions before compacting an index');const source=await models.file(id);if(source.record.kind!=='index')throw Error('Select an index file');if(cfg.rvcManaged!==false)await start(cfg,signal);const result=await json(cfg,'/compact-index',{index:source.path,target_vectors:targetVectors,out_dir:path.dirname(source.path)},signal);if(!result.path||path.dirname(path.resolve(result.path))!==path.dirname(source.path)||path.extname(result.path)!=='.index')throw Error('RVC returned an unexpected compact-index path');if(result.already_small)return {model:source.record,alreadySmall:true};const {createReadStream}=await import('node:fs');const temporary=path.basename(result.path).startsWith(path.basename(source.path,'.index')+'_compact_')&&result.path!==source.path;try{return {model:await models.importStream(createReadStream(result.path),{kind:'index',name:source.record.name+' · compact',trusted:true},signal),alreadySmall:false}}finally{if(temporary)await (await import('node:fs/promises')).unlink(result.path).catch(()=>{})}}
 let management=false
 async function manage(fn,signal){if(management||busy||queued)throw Error('Wait for the current RVC operation');management=true;let cancellation;const abort=()=>{if(child)cancellation=stop(false)};signal?.addEventListener('abort',abort,{once:true});try{signal?.throwIfAborted();return await fn()}finally{signal?.removeEventListener('abort',abort);await cancellation;management=false;lastUsed=now()}}
 const load=(cfg,signal)=>manage(()=>loadInternal(cfg,signal),signal),compact=(cfg,id,n,signal)=>manage(()=>compactInternal(cfg,id,n,signal),signal)
 const timer=setInterval(()=>{if(child&&!management&&!busy&&!queued&&lastUsed&&now()-lastUsed>300000)void stop(false).catch(()=>{})},15000);timer.unref?.()
 async function loadInternal(cfg,signal){if(busy||queued)throw Error('RVC is converting audio');const model=await models.file(cfg.rvcModelAsset),index=cfg.rvcIndexAsset?await models.file(cfg.rvcIndexAsset):null;if(model.record.kind!=='pth'||index&&index.record.kind!=='index')throw Error('Select a model and optional index');if(cfg.rvcManaged!==false)await start(cfg,signal);await json(cfg,'/load',{model:model.path,index:index?.path||''},signal);state=child?'loaded':'external';lastUsed=now();record('model-loaded');return status()}
 return {status,start,stop,load,health,convert,compact,async close(){clearInterval(timer);if(child)await stop()}}
}
