import { randomUUID } from 'node:crypto'
import { splitSentencesWithOffsets } from './text.js'
import { joinAudio } from './audio-join.js'
import { textChannel } from './text-channel.js'
import {createChunkPlanner} from './adaptive-chunks.js'

// Audio belongs to a complete message, independently of the playback cursor.
// Failed/cancelled/incomplete jobs can never be exported as complete audio.
export function createSpeechJobs(runPiece, { maxBytes = 128 * 1024 * 1024, maxJobs = 64, now = Date.now, liveConfig } = {}) {
  const jobs = new Map()
  const planner=createChunkPlanner()
  function prune() {
    for (const job of jobs.values()) {
      if (job.state === 'running' && now() - job.createdAt > 10 * 60000) {
        job.state = 'cancelled'; job.error = 'Speech job expired'; job.controller.abort(); job.detach?.()
      }
    }
    let size = [...jobs.values()].reduce((n, j) => n + j.bytes, 0)
    for (const [id, job] of jobs) {
      if (job.state === 'running') continue
      if (jobs.size <= maxJobs && size <= maxBytes && now() - job.createdAt < 30 * 60000) continue
      jobs.delete(id); size -= job.bytes
    }
  }
  function start({ sessionId, messageId, text, cfg, role = 'reply', publish = true, clientId = '', signal, open = false }) {
    prune()
    if ([...jobs.values()].filter(j => j.state === 'running').length >= 32) throw Error('Too many active speech jobs')
    const controller = new AbortController(), id = randomUUID()
    if (!open && !text?.trim()) throw Error('nothing to speak')
    const job = { id, sessionId, messageId: messageId || id, clientId, text: '', state: 'running', createdAt: now(), bytes: 0, segments: [], tasks: [], controller, cfg, role, publish, sealed: false }
    if(open&&liveConfig){const native=liveConfig(cfg,role);if(native){job.cfg=native;job.input=textChannel(controller.signal)}}
    jobs.set(id, job)
    const abort = () => { job.state = 'cancelled'; controller.abort() }
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) abort()
    job.detach = () => signal?.removeEventListener('abort', abort)
    if (text) append(job, text)
    if (!open) seal(job)
    return job
  }
  function append(job, text) {
    if (job.sealed || job.state !== 'running') return
    const offset = job.text.length + (job.text ? 1 : 0), first = job.segments.length
    job.text += (job.text ? '\n' : '') + text
    if(job.input){
      job.input.push((first?'\n':'')+text)
      if(!job.tasks.length){
        job.segments.length=1
        job.tasks.push((async()=>{
          try{
            const item=await runPiece(job.sessionId,text,job.cfg,job.role,{sentenceIndex:0,charStart:0,jobId:job.id,messageId:job.messageId,publish:job.publish,signal:job.controller.signal,clientId:job.clientId,textChunks:job.input,getText:()=>job.text})
            job.controller.signal.throwIfAborted();job.bytes=Math.ceil((item.audioBase64?.length||0)*3/4)
            if([...jobs.values()].reduce((n,j)=>n+j.bytes,0)>maxBytes)throw Error('Speech audio memory limit reached')
            job.segments[0]={...item,text:job.text,charEnd:job.text.length}
          }catch(e){job.error=String(e?.message||e);if(job.state==='running')job.state='failed';job.controller.abort()}finally{job.input.close()}
        })())
      }
      return
    }
    const pieces = job.cfg._inputType==='ssml'?[{text,charStart:0,charEnd:text.length,sentenceIndex:0,totalSentences:1}]:splitSentencesWithOffsets(text, planner.size(job.cfg))
    job.segments.length += pieces.length
    job.tasks.push(...pieces.map(async (piece, i) => {
      const index = first + i
      try {
        const item = await runPiece(job.sessionId, piece.text, job.cfg, job.role, { ...piece, totalSentences:first+pieces.length, sentenceIndex: index, charStart: offset + piece.charStart, charEnd: offset + piece.charEnd, jobId: job.id, messageId: job.messageId, publish: job.publish, signal: job.controller.signal, clientId: job.clientId })
        job.controller.signal.throwIfAborted()
        job.bytes += Math.ceil((item.audioBase64?.length || 0) * 3 / 4)
        const total = [...jobs.values()].reduce((n, j) => n + j.bytes, 0)
        if (total > maxBytes) { job.state = 'failed'; job.controller.abort(); throw Error('Speech audio memory limit reached') }
        job.segments[index] = item
        planner.observe(job.cfg,piece.text,item)
      } catch (e) {
        job.error ||= String(e?.message || e)
        if (job.state === 'running') job.state = 'failed'
        job.controller.abort()
      }
    }))
  }
  function seal(job) {
    if (job.sealed) return job.promise
    job.sealed = true
    job.input?.end()
    job.promise = Promise.all(job.tasks).then(() => {
      job.detach?.()
      if (job.state === 'running') job.state = 'complete'
      prune()
      return job
    })
    return job.promise
  }
  function get(id, sessionId) {
    prune()
    const job = jobs.get(id)
    return job && job.sessionId === sessionId ? job : null
  }
  function view(job) {
    return { jobId: job.id, sessionId: job.sessionId, messageId: job.messageId, text: job.text,...(job.cfg._speechTarget?{sourceText:job.cfg._speechSourceText,spokenLanguage:job.cfg._speechTarget,translationOrigin:job.cfg._translationOrigin}:{}), state: job.state, error: job.error, totalSegments: job.segments.length, completedSegments: job.segments.filter(Boolean).length,
      timings: job.segments.flatMap((s, index) => s?.timing ? [{ segmentIndex: index, charStart: s.charStart, charEnd: s.charEnd, ...s.timing }] : []) }
  }
  function cancel(id, sessionId) {
    const job = get(id, sessionId)
    if (!job || job.state !== 'running') return false
    job.state = 'cancelled'; job.controller.abort(); job.detach?.(); return true
  }
  function cancelSession(sessionId, clientId) {
    const ids = []
    for (const job of jobs.values()) {
      if (job.sessionId !== sessionId || (job.clientId && job.clientId !== clientId)) continue
      ids.push(job.id); cancel(job.id, sessionId)
    }
    return ids
  }
  async function audio(job, signal) {
    if (job.state !== 'complete' || job.segments.some(s => !s?.audioBase64)) throw Error(`Speech job is ${job.state}; complete audio is unavailable`)
    return joinAudio(job.segments, signal,{timeline:job.segments.some(s=>s.timing?.available)})
  }
  function close() { for (const j of jobs.values()) { j.controller.abort(); j.detach?.() }; jobs.clear() }
  return { start, append, seal, get, view, cancel, cancelSession, audio, close }
}

export function createPlaybackLeases({ now = Date.now, ttl = 5000 } = {}) {
  const leases = new Map()
  function owns(sessionId, clientId) {
    const lease = leases.get(sessionId)
    return !!(lease && lease.clientId === clientId && lease.until > now())
  }
  function claim(sessionId, clientId, takeover = false) {
    if (!sessionId || !clientId) return false
    if (takeover || !leases.has(sessionId) || leases.get(sessionId).until <= now() || owns(sessionId, clientId)) {
      leases.set(sessionId, { clientId, until: now() + ttl }); return true
    }
    return false
  }
  function release(sessionId, clientId) { if (owns(sessionId, clientId)) leases.delete(sessionId) }
  return { claim, owns, release }
}
