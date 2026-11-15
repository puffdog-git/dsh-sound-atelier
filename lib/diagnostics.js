import os from 'node:os'
import {execFile} from 'node:child_process'
import {chainCandidates} from './candidates.js'
import {localRoot} from './providers/local-service.js'
export async function diagnosticReport(cfg,{kokoroRuntime,xinferenceRuntime,localModelRuntime,rvcRuntime,nativeRuntime,voiceAssets,voiceModels,usageLedger,fetchImpl=fetch,gpuQuery}={}){
 const checks=[],add=(name,state,detail)=>checks.push({name,state,detail})
 add('platform','info',process.platform+' '+process.arch+' · Node '+process.versions.node)
 add('memory','info',{totalGiB:Math.round(os.totalmem()/1024**3),freeGiB:Math.round(os.freemem()/1024**3)})
 const gpu=await (gpuQuery?gpuQuery():new Promise(resolve=>execFile('nvidia-smi',['--query-gpu=name,memory.total,memory.used','--format=csv,noheader,nounits'],{windowsHide:true,timeout:3000},(err,out)=>resolve(err?null:out.trim().slice(0,500)))));add('gpu',gpu?'available':'optional',gpu||'NVIDIA query unavailable; CPU engines may still work')
 let candidates=[];try{candidates=chainCandidates(cfg,'');add('provider-chain',candidates.length?'configured':'missing',candidates.map(c=>({provider:c.provider,model:c.model}))) }catch{add('provider-chain','invalid','Check endpoint and per-row JSON configuration')}
 for(const[name,runtime]of Object.entries({kokoro:kokoroRuntime,xinference:xinferenceRuntime,rvc:rvcRuntime,native:nativeRuntime}))if(runtime){const s=runtime.status();add(name,s.packageInstalled===false?'not-installed':s.state||'info',{state:s.state,packageInstalled:s.packageInstalled,owned:s.owned,ready:s.ready,verifiedAt:s.verifiedAt})}
 if(candidates.some(c=>['local-tts','f5'].includes(c.provider))){try{const root=localRoot(cfg),r=await fetchImpl(root+((cfg.localTtsBackend||'xinference')==='gpt-sovits'?'/openapi.json':'/v1/models'),{signal:AbortSignal.timeout(3000),redirect:'error'});add('local-service',r.ok?'reachable':[401,403].includes(r.status)?'authentication-required':'error','HTTP '+r.status);await r.body?.cancel()}catch{add('local-service','unreachable','Check the service address, running process and local account')}}
 if(localModelRuntime)add('managed-models','info',localModelRuntime.status())
 if(voiceAssets)add('reference-assets','info',{count:(await voiceAssets.list()).length})
 if(voiceModels)add('voice-models','info',{count:(await voiceModels.list()).length})
 if(usageLedger)try{add('usage-ledger','info',await usageLedger.snapshot())}catch{add('usage-ledger','unreadable','Existing ledger was not overwritten')}
 return {version:1,generatedAt:new Date().toISOString(),readOnly:true,inferenceTested:false,secretsExcluded:true,checks,note:'Connectivity and installed files are not proof of inference. This report contains no configuration dump, text, transcripts, keys, passwords or environment variables.'}
}
