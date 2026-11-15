import {spawn,execFile} from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {parsePcmWav} from '../providers/audio.js'
import {localOptions} from '../providers/local-service.js'
import {speechInstruction} from '../providers/controls.js'
export const DOTS_MODELS=['dots-studio/dots.tts-base','dots-studio/dots.tts-soar','dots-studio/dots.tts-mf','dots-studio/dots.tts-mf-2steps','dots-studio/dots.tts-mf-1step','dots-studio/dots.tts-mf-2steps-stts']
export function nativeSpec(cfg,root){
 const kind=cfg.localTtsBackend==='dots-native'?'dots':cfg.localTtsFamily==='index2.5'?'index2.5':'index2'
 if(!['dots-native','index-native'].includes(cfg.localTtsBackend))throw Error('Select a managed native backend')
 const device=cfg.localTtsDevice||'cpu';if(!['cpu','cuda:0'].includes(device))throw Error('Select CPU or CUDA:0')
 const model=kind==='dots'?cfg.localTtsNativeModel||DOTS_MODELS[2]:cfg.localTtsModelPath||path.join(root,'tts-xinference','cache','v2',kind==='index2.5'?'IndexTTS-2_5':'IndexTTS2')
 if(kind==='dots'&&!DOTS_MODELS.includes(model))throw Error('Select a reviewed dots.tts checkpoint')
 if(kind!=='dots'&&(!path.isAbsolute(model)||!fs.existsSync(path.join(model,'config.yaml'))||cfg.localTtsNativeTrusted!==true))throw Error('Select an installed Index model folder and confirm trusting its model/config files')
 return {kind,model,device,...(kind==='dots'?{}:{thirdparty:path.join(root,'tts-runtimes','uv-tools','xinference','Lib','site-packages','xinference','thirdparty')})}
}
export function createNativeRuntime({root=path.join(os.homedir(),'.dsh'),spawnImpl=spawn,idleMs=300000}={}){
 let child,pending,counter=0,buffer='',queue=Promise.resolve(),waiting=0,epoch=0,idle,state='unloaded',verifiedAt=null,activeKind=null,lastError='',workerKey='',stopping=Promise.resolve()
 const executable=kind=>path.join(root,kind==='dots'?'tts-runtimes/dots':'tts-xinference/virtualenv/v4/'+(kind==='index2.5'?'IndexTTS-2.5':'IndexTTS2')+'/pytorch/3.12.13',process.platform==='win32'?'Scripts/python.exe':'bin/python')
 const status=()=>({state,verifiedAt,kind:activeKind,error:lastError,ready:state==='verified',packages:Object.fromEntries(['dots','index2','index2.5'].map(k=>[k,fs.existsSync(executable(k))])),packageInstalled:activeKind?fs.existsSync(executable(activeKind)):fs.existsSync(executable('dots')),queued:waiting})
 function stop(cancelQueue=true){if(cancelQueue)epoch++;clearTimeout(idle);const current=child,task=pending;child=null;pending=null;buffer='';workerKey='';state='unloaded';verifiedAt=null
  if(current){stopping=process.platform==='win32'&&current.pid?new Promise(resolve=>execFile('taskkill.exe',['/PID',String(current.pid),'/T','/F'],{windowsHide:true,timeout:10000},()=>resolve())):Promise.resolve(current.kill('SIGTERM'))}task?.reject(Error('Managed native inference process stopped'));return stopping
 }
 async function launch(spec){const key=spec.kind+'|'+spec.model+'|'+spec.device;if(child&&key===workerKey)return;if(child)await stop(false);await stopping
  const python=executable(spec.kind);if(!fs.existsSync(python))throw Error('Prepare this model’s isolated Python environment first')
  const env={...process.env,PYTHONUNBUFFERED:'1',PYTHONIOENCODING:'utf-8',PYTHONUTF8:'1'},pk=Object.keys(env).find(k=>k.toLowerCase()==='path')||'PATH';env[pk]=[path.dirname(python),path.join(root,'tts-runtimes','ffmpeg-shared','ffmpeg-n9.0-latest-win64-lgpl-shared-9.0','bin'),env[pk]||''].join(path.delimiter)
  env.CUDA_VISIBLE_DEVICES=spec.device==='cpu'?'':'0'
  child=spawnImpl(python,[fileURLToPath(new URL('./native-worker.py',import.meta.url))],{windowsHide:true,stdio:['pipe','pipe','pipe'],env});workerKey=key;activeKind=spec.kind;const current=child;current.stderr.resume();current.stdin.on('error',()=>{})
  current.stdout.on('data',b=>{if(child!==current)return;buffer+=b.toString('utf8');if(buffer.length>32*1024*1024){void stop();return}let at;while((at=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,at);buffer=buffer.slice(at+1);if(!line.startsWith('DSH_TTS:'))continue;try{const d=JSON.parse(line.slice(8));if(d.id===pending?.id){const t=pending;pending=null;d.ok?t.resolve(d):t.reject(Error(d.error||'Native model failed'))}}catch{void stop()}}})
  const failed=()=>{if(child===current){void stop();state='failed';lastError='Native model process exited'}};current.on('error',failed);current.on('exit',failed)
 }
 async function command(input,signal){clearTimeout(idle);signal?.throwIfAborted();await launch(input.spec);const id=++counter;let timer;const abort=()=>void stop(false)
  try{const cold=!['loaded','verified'].includes(state);state=cold?'loading':state;const result=await new Promise((resolve,reject)=>{pending={id,resolve,reject};timer=setTimeout(()=>{void stop(false);reject(Error('Native model operation timed out'))},cold?20*60000:5*60000);signal?.addEventListener('abort',abort,{once:true});child.stdin.write(JSON.stringify({...input,id})+'\n');if(signal?.aborted)abort()});signal?.throwIfAborted();lastError='';state=input.action==='load'?'loaded':'verified';if(state==='verified'){parsePcmWav(Buffer.from(result.audioBase64,'base64'));verifiedAt=new Date().toISOString()}return result}
  catch(e){lastError=String(e.message);if(state!=='unloaded')state='failed';throw e}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);idle=setTimeout(()=>void stop(),idleMs);idle.unref?.()}
 }
 function serial(input,signal){if(waiting>=8)return Promise.reject(Error('Native inference queue is full'));const requested=epoch;waiting++;const p=queue.then(()=>{if(epoch!==requested)throw Error('Native runtime unloaded');return command(input,signal)});queue=p.catch(()=>{});return p.finally(()=>waiting--)}
 async function synthesize(cfg,req,reference,emotionReference,signal){const spec=nativeSpec(cfg,root),model=req.models?.['local-tts']||'',options=localOptions({...cfg,localTtsFamily:spec.kind},model),controls={...options.native},instruction=speechInstruction(cfg,req.role,'local-tts')
  if(options.family!==spec.kind)throw Error('Native model family conflicts with the selected backend')
  if(spec.kind==='dots'){
   if(instruction)throw Error('These dots.tts generation checkpoints have no free-form emotion/instruction field')
   if(!reference)throw Error('Choose a reference recording for dots.tts; random-speaker generation is not exposed as voice cloning')
   if(/-(?:1step|2steps|stts)$/.test(spec.model)&&['num_steps','guidance_scale','ode_method'].some(k=>controls[k]!==undefined))throw Error('Fixed-step dots.tts artifacts define their own sampling settings')
   if(spec.model.endsWith('-stts')&&Object.keys(controls).some(k=>k!=='seed'))throw Error('STTS artifact sampling/cadence is fixed; only seed is exposed')
  }else{
   if(!reference)throw Error('IndexTTS requires a speaker reference')
   const modes=[!!emotionReference,!!controls.emo_vector,!!(instruction||controls.emo_text||controls.use_emo_text)].filter(Boolean).length;if(modes>1)throw Error('Choose one Index emotion source: audio, vector or text')
   if(instruction){controls.emo_text=instruction;controls.use_emo_text=true}
  }
  const result=await serial({action:'synthesize',spec,text:req.text,reference:reference?.path,transcript:reference?.asset.transcript||'',emotion_reference:emotionReference?.path,speed:options.speed,controls},signal)
  return {ok:true,provider:'local-tts',mime:'audio/wav',audio:Buffer.from(result.audioBase64,'base64')}
 }
 return {status,stop,load:(cfg,signal)=>serial({action:'load',spec:nativeSpec(cfg,root)},signal),synthesize}
}
