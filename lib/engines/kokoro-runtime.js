import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parsePcmWav } from '../providers/audio.js'

export function createKokoroRuntime({ root=path.join(os.homedir(),'.dsh'), spawnImpl=spawn, idleMs=5*60000 }={}) {
  const runtime=path.join(root,'tts-runtimes','kokoro-js'), cache=path.join(root,'data','dsh-tts','kokoro-js-cache')
  let child, pending, counter=0, idle, state='unloaded',error='',verifiedAt=null,voices={},buffer=''
  let queue=Promise.resolve(), waiting=0,epoch=0
  const status=()=>({id:'kokoro',state,packageInstalled:fs.existsSync(path.join(runtime,'node_modules','kokoro-js','package.json')),runtimeAvailable:state==='loaded'||state==='verified',ready:state==='verified',verifiedAt,error,device:'cpu',language:'en',package:'kokoro-js@1.2.1',model:'onnx-community/Kokoro-82M-v1.0-ONNX',revision:'1939ad2a8e416c0acfeecc08a694d14ef25f2231',voices})
  function stop(cancelQueue=true) {
    if(cancelQueue)epoch++
    clearTimeout(idle);const active=pending;pending=null
    const process=child;child=null;buffer='';state='unloaded';verifiedAt=null
    process?.kill();active?.reject(Error('Kokoro runtime stopped'))
  }
  function launch() {
    if(child)return
    if(!status().packageInstalled)throw Error('Install the isolated kokoro-js@1.2.1 runtime first')
    const nodeBin=/^node(?:\.exe)?$/i.test(path.basename(process.execPath))?process.execPath:'node'
    child=spawnImpl(nodeBin,[fileURLToPath(new URL('./kokoro-worker.mjs',import.meta.url)),runtime,cache],{windowsHide:true,stdio:['pipe','pipe','pipe']})
    const current=child;current.stderr.resume();current.stdin.on('error',()=>{})
    current.stdout.on('data',chunk=>{
      if(child!==current)return
      buffer+=chunk.toString('utf8');if(buffer.length>20*1024*1024){stop();return}
      let at
      while((at=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,at);buffer=buffer.slice(at+1);if(!line.startsWith('DSH_TTS:'))continue
        try{const result=JSON.parse(line.slice(8));if(result.id===pending?.id){const task=pending;pending=null;result.ok?task.resolve(result):task.reject(Error(result.error))}}catch{stop()}
      }
    })
    const failed=()=>{if(child!==current)return;stop();state='failed';error='Kokoro worker exited before completion'}
    current.on('error',failed);current.on('exit',failed)
  }
  async function command(action,signal) {
    signal?.throwIfAborted();clearTimeout(idle);launch();state=action.action==='load'?'loading':state
    const id=++counter;let timer
    const abort=()=>stop(false)
    try{
      const result=await new Promise((resolve,reject)=>{pending={id,resolve,reject};timer=setTimeout(()=>{stop(false);reject(Error('Kokoro request timed out'))},action.action==='load'?300000:60000);signal?.addEventListener('abort',abort,{once:true});child.stdin.write(JSON.stringify({...action,id})+'\n');if(signal?.aborted)abort()})
      signal?.throwIfAborted();error=''
      if(action.action==='load'){voices=result.voices;state='loaded'}else{parsePcmWav(Buffer.from(result.audioBase64,'base64'));state='verified';verifiedAt=new Date().toISOString()}
      return result
    }catch(e){if(state!=='unloaded'){state='failed';error=String(e.message)}throw e}
    finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);idle=setTimeout(stop,idleMs);idle.unref?.()}
  }
  function serial(action,signal){if(waiting>=8)return Promise.reject(Error('Kokoro request queue is full'));const requestedEpoch=epoch;waiting++;const result=queue.then(()=>{if(requestedEpoch!==epoch)throw Error('Kokoro runtime unloaded');return command(action,signal)});queue=result.catch(()=>{});return result.finally(()=>waiting--)}
  return { status, load:signal=>serial({action:'load'},signal), async synthesize(text,{voice='af_heart',speed=1,signal}={}){if(typeof text!=='string'||!text.trim()||text.length>1000||!Number.isFinite(speed)||speed<.5||speed>2||/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(text))throw Error('Local Kokoro JS supports English text up to 1000 characters and speed 0.5–2');const result=await serial({action:'synthesize',text,voice,speed},signal);return {ok:true,provider:'kokoro',mime:'audio/wav',audio:Buffer.from(result.audioBase64,'base64')}}, stop }
}
