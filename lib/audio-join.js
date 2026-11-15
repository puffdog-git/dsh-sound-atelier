import { spawn } from 'node:child_process'
import ffmpeg from 'ffmpeg-static'

const MAX_PCM = 128 * 1024 * 1024
function decode(audio, signal, speed=1) {
  signal?.throwIfAborted()
  return new Promise((resolve, reject) => {
    if(!Number.isFinite(speed)||speed<.5||speed>2){reject(Error('Invalid audio speed'));return}
    const child = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-protocol_whitelist', 'pipe', '-i', 'pipe:0', '-vn', ...(speed!==1?['-filter:a','atempo='+speed]:[]), '-f', 's16le', '-ar', '24000', '-ac', '1', 'pipe:1'], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
    const parts = []; let bytes = 0; let settled = false
    const finish = (error, value) => {
      if (settled) return
      settled = true; clearTimeout(timer); signal?.removeEventListener('abort', abort)
      if (error) { child.kill(); reject(error) } else resolve(value)
    }
    const abort = () => finish(Error('Audio export cancelled'))
    const timer = setTimeout(() => finish(Error('Audio conversion timed out')), 60000)
    signal?.addEventListener('abort', abort, { once: true })
    child.on('error', () => finish(Error('Audio converter is unavailable')))
    child.stdout.on('data', part => { bytes += part.length; if (bytes > MAX_PCM) finish(Error('Audio export exceeds memory limit')); else parts.push(part) })
    child.stderr.resume()
    child.stdin.on('error', () => {})
    child.on('close', code => finish(code === 0 && bytes ? null : Error('Cannot decode an audio segment'), Buffer.concat(parts)))
    child.stdin.end(audio)
    if (signal?.aborted) abort()
  })
}

export async function joinAudio(segments, signal, {timeline=false}={}) {
  signal?.throwIfAborted()
  if (!segments.length) throw Error('No audio segments')
  if (segments.length === 1&&!timeline) return { audio: Buffer.from(segments[0].audioBase64, 'base64'), mime: segments[0].mime }
  const parts = [],spans=[],alignments=[]; let size = 0
  for (const [index,segment] of segments.entries()) {
    const speed=segment.synthesisSpeed||1,start=size/48000
    const pcm = await decode(Buffer.from(segment.audioBase64, 'base64'), signal,speed)
    size += pcm.length
    if (size > MAX_PCM) throw Error('Audio export exceeds memory limit')
    parts.push(pcm)
    if(timeline){
      spans.push({segmentIndex:index,...(segment.speaker?{speaker:segment.speaker}:{}),start,end:size/48000,charStart:segment.charStart,charEnd:segment.charEnd})
      const timing=segment.timing
      const groups=timing?.alignments||timing?.sentences?.map(s=>({type:'word',words:s.words}))||[]
      if(timing?.unit==='seconds'&&timing.scope==='segment')for(const group of groups)alignments.push({...group,segmentIndex:index,...(segment.speaker?{speaker:segment.speaker}:{}),words:group.words.map(w=>({...w,start:w.start/speed+start,end:w.end/speed+start}))})
    }
  }
  const header = Buffer.alloc(44)
  header.write('RIFF'); header.writeUInt32LE(36 + size, 4); header.write('WAVEfmt ', 8)
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22)
  header.writeUInt32LE(24000, 24); header.writeUInt32LE(48000, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34)
  header.write('data', 36); header.writeUInt32LE(size, 40)
  return { audio: Buffer.concat([header, ...parts]), mime: 'audio/wav',...(timeline?{duration:size/48000,timeline:spans,timing:{unit:'seconds',scope:'job',available:alignments.some(a=>a.words.length),alignments}}:{}) }
}
