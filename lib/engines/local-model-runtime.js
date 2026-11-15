import { localRoot, localServiceOperation } from '../providers/local-service.js'
import { localManagementToken } from '../local-credentials.js'
import {installRuntime} from '../maintenance-jobs.js'

// Only models explicitly launched through this instance are eligible for
// cancellation by unloading or idle eviction. External models remain untouched.
export function createLocalModelRuntime({resolveKey,operation=localServiceOperation,managementToken=localManagementToken,now=Date.now,tickMs=15000}={}){
  const launchLocks=new Set(),leases=new Map(),queues=new Map(),events=[];let closed=false
  const identity=(cfg,uid)=>localRoot(cfg)+'|'+uid
  const event=(uid,type)=>{events.push({uid,type,time:new Date(now()).toISOString()});if(events.length>50)events.shift()}
  const auth=cfg=>managementToken(cfg,resolveKey)
  const status=()=>({models:[...leases.values()].map(({uid,name,state,lastUsed,busy})=>({uid,name,state,lastUsed,busy})),events:[...events],cancellation:'owned-model-unload; external models: transport-only'})
  async function launch(cfg,input,signal){
    const id=identity(cfg,input.uid);if(closed)throw Error('Local model runtime is closed');if(launchLocks.has(id))throw Error('Model launch is already running');if(leases.get(id)?.busy)throw Error('Model is currently synthesizing')
    launchLocks.add(id);try{
    const key=await auth(cfg),existing=await operation({cfg,action:'list',signal,key});signal?.throwIfAborted()
    if(!Array.isArray(existing.data))throw Error('Cannot verify model ownership from the service model list')
    if(existing.data.some(m=>m.id===input.uid))throw Error('This model UID already exists; it was not adopted or replaced')
    if(process.platform==='win32'&&input.name==='IndexTTS-2.5')await installRuntime('index-cache','cpu',signal,()=>{})
    const lease={uid:input.uid,name:input.name,input:{...input},cfg:{...cfg},state:'launching',lastUsed:now(),busy:true};leases.set(id,lease)
    let cancellation
    const abort=()=>{cancellation=unload(cfg,input.uid,{automatic:true}).then(()=>event(input.uid,'load-cancelled')).catch(()=>{lease.state='cancel-failed';event(input.uid,'load-cancellation-failed')})}
    signal?.addEventListener('abort',abort,{once:true})
    try{signal?.throwIfAborted();const result=await operation({cfg,action:'launch',input,signal,key});signal?.throwIfAborted();lease.state='loaded';event(input.uid,'launched');return result}
    catch(e){if(!signal?.aborted)lease.state='launch-failed';throw e}
    finally{signal?.removeEventListener('abort',abort);await cancellation;lease.busy=false;lease.lastUsed=now()}
    }finally{launchLocks.delete(id)}
  }
  async function unload(cfg,uid,{automatic=false,signal}={}){
    const id=identity(cfg,uid),lease=leases.get(id)
    if(automatic&&!lease)throw Error('Refusing to unload an externally managed model')
    if(lease?.busy&&!automatic)throw Error('Model is synthesizing; cancel its job before unloading')
    const result=await operation({cfg,action:'unload',input:{uid},signal:signal||AbortSignal.timeout(30000),key:await auth(cfg)})
    if(lease){lease.state='unloaded';lease.lastUsed=now()};event(uid,automatic?'owned-model-unloaded':'unloaded');return result
  }
  async function run(cfg,uid,signal,fn){
    if(closed)throw Error('Local model runtime is closed')
    const id=identity(cfg,uid),q=queues.get(id)||{tail:Promise.resolve(),count:0};if(q.count>=8)throw Error('Local model queue is full');q.count++;queues.set(id,q)
    const execute=async()=>{
      signal?.throwIfAborted();const lease=leases.get(id)
      if(lease?.state==='cancel-failed')throw Error('Previous GPU cancellation failed; unload this model before retrying')
      if(lease){lease.busy=true;lease.lastUsed=now()}
      let cancellation
      const abort=()=>{
        if(!lease){event(uid,'external-transport-cancelled');return}
        cancellation=unload(lease.cfg,uid,{automatic:true}).then(()=>event(uid,'inference-process-cancelled')).catch(()=>{lease.state='cancel-failed';event(uid,'cancellation-failed')})
      }
      signal?.addEventListener('abort',abort,{once:true})
      if(signal?.aborted)abort()
      try{signal?.throwIfAborted();      if(lease&&lease.state==='unloaded'){
        await operation({cfg:lease.cfg,action:'launch',input:lease.input,signal,key:await auth(lease.cfg)});lease.state='loaded';event(uid,'reloaded')
      }
signal?.throwIfAborted();const out=await fn();signal?.throwIfAborted();if(lease){lease.state='verified';event(uid,'synthesis-verified')}return out}
      finally{signal?.removeEventListener('abort',abort);await cancellation;if(lease){lease.busy=false;lease.lastUsed=now()}}
    }
    const result=q.tail.then(execute);q.tail=result.catch(()=>{}).finally(()=>{q.count--;if(!q.count&&queues.get(id)===q)queues.delete(id)});return result
  }
  async function sweep(){for(const lease of leases.values()){
    const seconds=Number(lease.cfg.localTtsIdleSeconds??300)
    if(!lease.busy&&!queues.has(identity(lease.cfg,lease.uid))&&['loaded','verified'].includes(lease.state)&&seconds>0&&now()-lease.lastUsed>=seconds*1000){
      lease.state='unloading';try{await unload(lease.cfg,lease.uid,{automatic:true});event(lease.uid,'idle-unloaded')}catch{lease.state='unload-failed';event(lease.uid,'idle-unload-failed')}
    }
  }}
  const timer=setInterval(()=>sweep().catch(()=>{}),tickMs);timer.unref?.()
  return {launch,unload,run,status,sweep,async close(){closed=true;clearInterval(timer);await Promise.allSettled([...leases.values()].filter(l=>l.state!=='unloaded').map(l=>unload(l.cfg,l.uid,{automatic:true})))},serviceStopped(cfg){for(const lease of leases.values())if(localRoot(lease.cfg)===localRoot(cfg))lease.state='unloaded'}}
}
