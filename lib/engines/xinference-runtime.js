import { spawn, execFile } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { localRoot } from '../providers/local-service.js'

export function createXinferenceRuntime({root=path.join(os.homedir(),'.dsh'),spawnImpl=spawn,fetchImpl=fetch}={}){
 const executable=path.join(root,'tts-runtimes','bin',process.platform==='win32'?'xinference-local.exe':'xinference-local')
 const selectedBackend=()=>{try{const value=JSON.parse(fs.readFileSync(path.join(root,'tts-runtimes','runtime-manifest.json'),'utf8').replace(/^\uFEFF/,'' )).device;return ['cpu','cu128','auto'].includes(value)?value:'auto'}catch{return 'auto'}}
 let child,state='stopped',error='',origin='',startup;const events=[]
 const record=event=>{events.push({time:new Date().toISOString(),event});if(events.length>30)events.shift()}
 const status=()=>({state,error,origin,owned:!!child,packageInstalled:fs.existsSync(executable),version:'4.1.0',backend:selectedBackend(),events:[...events],note:'Service availability does not establish model inference readiness'})
 async function stop(){
  const owned=child;if(!owned)throw Error('This service was not started by this plugin; stop it in its own environment')
  child=null;state='stopping';record('stop-requested')
  if(process.platform==='win32'&&owned.exitCode===null&&Number.isInteger(owned.pid))await new Promise(resolve=>execFile('taskkill.exe',['/PID',String(owned.pid),'/T','/F'],{windowsHide:true,timeout:10000},()=>resolve()))
  else owned.kill('SIGTERM')
  state='stopped';record('stopped');return status()
 }
 async function start(cfg,signal){
  if(startup)return startup
  if(child)return status()
  const url=new URL(localRoot(cfg));if(url.protocol!=='http:'||url.pathname!=='/')throw Error('Managed Xinference requires a loopback HTTP origin; configure a reverse proxy separately')
  origin=url.origin;error=''
  startup=(async()=>{
   try{
    try{const response=await fetchImpl(origin+'/v1/models',{signal:AbortSignal.timeout(1500),redirect:'error'});await response.body?.cancel?.();state='external';record('external-service-detected');return status()}catch{}
    signal?.throwIfAborted();if(!status().packageInstalled)throw Error('Install the isolated Xinference 4.1.0 environment first')
    const env={...process.env,XINFERENCE_HOME:path.join(root,'tts-xinference'),UV_TORCH_BACKEND:selectedBackend()}
    const pathKey=Object.keys(env).find(k=>k.toLowerCase()==='path')||'PATH';env[pathKey]=[path.join(root,'tts-runtimes','uv-tools','xinference','Scripts'),path.join(root,'tts-runtimes','ffmpeg-shared','ffmpeg-n9.0-latest-win64-lgpl-shared-9.0','bin'),env[pathKey]||''].join(path.delimiter)
    child=spawnImpl(executable,['--host','127.0.0.1','--port',url.port||'80'],{windowsHide:true,stdio:['ignore','pipe','pipe'],env});const owned=child;owned.stdout.resume();owned.stderr.resume();state='starting';record('starting')
    const failed=()=>{if(child!==owned)return;child=null;state='failed';error='Xinference process exited';record('process-exited')};owned.on('error',failed);owned.on('exit',failed)
    for(let attempt=0;attempt<120;attempt++){
     signal?.throwIfAborted();if(child!==owned)throw Error(error||'Xinference stopped')
     try{const response=await fetchImpl(origin+'/v1/models',{signal:AbortSignal.timeout(1500),redirect:'error'});await response.body?.cancel?.();if(response.ok||[401,403].includes(response.status)){state=response.ok?'running':'auth-required';record('service-listening');return status()}}catch{}
     await new Promise(resolve=>setTimeout(resolve,500))
    }
    throw Error('Xinference startup timed out')
   }catch(e){if(child)await stop();state='failed';error=e.message;record('startup-failed');throw e}
   finally{startup=null}
  })();return startup
 }
 return {status,start,stop,async close(){if(child)await stop()}}
}
