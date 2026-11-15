import {spawn} from 'node:child_process'
import ffmpeg from 'ffmpeg-static'
export function wavDurationMs(data){
 if(data.toString('ascii',0,4)!=='RIFF')throw Error('不是 WAV 音訊')
 let bytesPerSecond=0
 for(let offset=12;offset+8<=data.length;){const tag=data.toString('ascii',offset,offset+4),length=data.readUInt32LE(offset+4);if(tag==='fmt '&&length>=16)bytesPerSecond=data.readUInt32LE(offset+16);if(tag==='data'&&bytesPerSecond)return Math.min(length,data.length-offset-8)/bytesPerSecond*1000;offset+=8+length+(length%2)}
 throw Error('WAV 音訊缺少資料區段')
}
export function convertAudio(data,format='wav',signal,{rate=1,volume=1}={}){
 if(!['wav','mp3'].includes(format))throw Error('僅支援 WAV 或 MP3 音訊')
 if(!data?.length||data.length>128*1024*1024)throw Error('音訊大小不正確')
 signal?.throwIfAborted()
 return new Promise((resolve,reject)=>{
  if(!Number.isFinite(rate)||rate<.5||rate>2||!Number.isFinite(volume)||volume<0||volume>1){reject(Error('播放調整超出範圍'));return}
  const child=spawn(ffmpeg,['-hide_banner','-loglevel','error','-protocol_whitelist','pipe','-i','pipe:0','-vn',...(rate!==1||volume!==1?['-af',[...(rate!==1?['atempo='+rate]:[]),...(volume!==1?['volume='+volume]:[])].join(',')]:[]),'-ar','24000','-ac','1',...(format==='wav'?['-c:a','pcm_s16le']:['-c:a','libmp3lame','-b:a','128k']),'-f',format,'pipe:1'],{windowsHide:true,stdio:['pipe','pipe','pipe']})
  let done=false,size=0;const parts=[],finish=(e)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);if(e){child.kill();reject(e)}else resolve(Buffer.concat(parts))},abort=()=>finish(Error('音訊轉換已取消')),timer=setTimeout(()=>finish(Error('音訊轉換逾時')),60000)
  signal?.addEventListener('abort',abort,{once:true});child.on('error',()=>finish(Error('音訊轉換器無法啟動')));child.stdin.on('error',()=>{});child.stderr.resume();child.stdout.on('data',b=>{size+=b.length;if(size>128*1024*1024)finish(Error('音訊超過記憶體上限'));else parts.push(b)});child.on('close',code=>finish(code||!size?Error('音訊格式轉換失敗'):null));child.stdin.end(data);if(signal?.aborted)abort()
 })
}
