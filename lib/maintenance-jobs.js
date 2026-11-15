import {randomUUID} from 'node:crypto'
import {spawn,execFile} from 'node:child_process'
import {fileURLToPath} from 'node:url'
export function createMaintenanceJobs(){
 const jobs=new Map()
 function view(j){return {id:j.id,kind:j.kind,state:j.state,createdAt:j.createdAt,updatedAt:j.updatedAt,lines:[...j.lines],result:j.result,error:j.error}}
 function start(kind,fn){if([...jobs.values()].filter(j=>j.state==='running'||j.state==='cancelling').length>=2)throw Error('Finish or cancel current maintenance jobs first');const id=randomUUID(),controller=new AbortController(),j={id,kind,controller,state:'running',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),lines:[]};jobs.set(id,j);while(jobs.size>30){const old=[...jobs.values()].find(j=>!['running','cancelling'].includes(j.state));if(!old)break;jobs.delete(old.id)}
  const log=line=>{j.lines.push(String(line).replace(/https?:\/\/[^\s/@]+:[^\s/@]+@/g,'https://[redacted]@').replace(/(?:Bearer\s+|hf_|sk[-_])[A-Za-z0-9._-]+/gi,'[redacted]').slice(0,500));if(j.lines.length>30)j.lines.shift();j.updatedAt=new Date().toISOString()}
  j.promise=Promise.resolve().then(()=>fn(controller.signal,log)).then(result=>{j.result=result;j.state=controller.signal.aborted?'cancelled':'complete'},e=>{j.state=controller.signal.aborted?'cancelled':'failed';j.error=String(e.message).replace(/(?:Bearer\s+|hf_|sk[-_])[A-Za-z0-9._-]+/gi,'[redacted]').slice(0,500)}).finally(()=>j.updatedAt=new Date().toISOString());return view(j)
 }
 const list=()=>[...jobs.values()].map(view).reverse()
 function cancel(id){const j=jobs.get(id);if(!j)throw Error('Maintenance job not found');if(j.state==='running'){j.state='cancelling';j.controller.abort()}return view(j)}
 return {start,list,cancel,close(){for(const j of jobs.values())j.controller.abort()}}
}
export async function installRuntime(backend,device,signal,log,spawnImpl=spawn){
 if(process.platform!=='win32')throw Error('The bundled environment preparer currently supports Windows; connect an existing runtime on other systems')
 if(!['kokoro','xinference','rvc','dots','rvc-portable','index-cache'].includes(backend)||!['cpu','cu128'].includes(device))throw Error('Invalid runtime/device selection')
 return new Promise((resolve,reject)=>{
  const child=spawnImpl('powershell.exe',['-NoProfile','-NonInteractive','-File',fileURLToPath(new URL('../tools/setup-local-runtime.ps1',import.meta.url)),'-Backend',backend,'-Device',device],{windowsHide:true,stdio:['ignore','pipe','pipe']});let text='',ended=false
  const consume=b=>{text+=b.toString('utf8');let n;while((n=text.indexOf('\n'))>=0){log(text.slice(0,n));text=text.slice(n+1)}if(text.length>10000){log(text.slice(-500));text=''}}
  child.stdout.on('data',consume);child.stderr.on('data',consume)
  const abort=()=>{if(child.pid)execFile('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,timeout:10000},()=>{});else child.kill()}
  signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort()
  const done=(error)=>{if(ended)return;ended=true;signal?.removeEventListener('abort',abort);error?reject(error):resolve({prepared:true,backend,device,inferenceVerified:false})}
  child.on('error',()=>done(Error('Runtime preparer could not start')));child.on('exit',code=>done(code===0&&!signal?.aborted?null:Error(signal?.aborted?'Runtime preparation cancelled':'Runtime preparation failed; see the sanitized log')))
 })
}
