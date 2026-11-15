const autoplay = { blocked: false, listeners: new Set() }
function setAutoplayBlocked(next) {
  if (autoplay.blocked === next) return
  autoplay.blocked = next
  for (const l of [...autoplay.listeners]) {
    try {
      l()
    } catch {
      /* listener isolation */
    }
  }
}

let clearGestureListeners = null
function removeGestureListeners() {
  if (typeof clearGestureListeners === 'function') {
    clearGestureListeners()
    clearGestureListeners = null
  }
}

function unlockAudio() {
  removeGestureListeners()
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    if (AC) {
      const ctx = new AC()
      if (ctx.state === 'suspended')
        ctx.resume().catch(() => {
          /* audio context unlock failure ignored */
        })
      setTimeout(() => {
        try {
          ctx.close()
        } catch {
          /* closed */
        }
      }, 300)
    }
  } catch {
    /* no AudioContext */
  }
  setAutoplayBlocked(false)
  player.blocked = false
  playerChanged()
  drainQueue()
  // Anything the host synthesised while the browser was blocking playback is
  // still queued server-side; pull it once the gesture opened the gate.
  try {
    pollPending()
  } catch {
    /* host not ready yet */
  }
}
function useAutoplayGate() {
  const [, force] = React.useReducer((n) => n + 1, 0)
  React.useEffect(() => {
    autoplay.listeners.add(force)
    return () => {
      autoplay.listeners.delete(force)
    }
  }, [])
  return autoplay
}
let wakeLockSentinel = null
async function acquireWakeLock() {
  try {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && !wakeLockSentinel) {
      wakeLockSentinel = await navigator.wakeLock.request('screen')
      wakeLockSentinel.addEventListener('release', () => {
        wakeLockSentinel = null
      })
    }
  } catch (_e) {
    /* wake lock unavailable */
  }
}
async function releaseWakeLock() {
  try {
    if (wakeLockSentinel) {
      await wakeLockSentinel.release()
      wakeLockSentinel = null
    }
  } catch (_e) {}
}
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && player.busy && !player.paused) acquireWakeLock()
  })
}

let activeKaraokeEl = null
function updateKaraokeHighlight(item) {
  clearKaraokeHighlight()
  if (!item || !item.text || typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return
  try {
    const text = String(item.text).trim()
    if (!text) return
    const steps = document.querySelectorAll('[data-chat-flow-kind="assistant-step"]')
    for (let i = steps.length - 1; i >= 0; i--) {
      const step = steps[i]
      if (step.textContent && step.textContent.includes(text)) {
        step.classList.add('dts-karaoke-active')
        activeKaraokeEl = step
        break
      }
    }
  } catch (_err) {}
}
function clearKaraokeHighlight() {
  try {
    if (activeKaraokeEl) {
      activeKaraokeEl.classList.remove('dts-karaoke-active')
      activeKaraokeEl = null
    }
    if (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function') {
      for (const el of document.querySelectorAll('.dts-karaoke-active')) el.classList.remove('dts-karaoke-active')
    }
  } catch (_err) {}
}

const player = {
  audio: null,
  after: '',
  enabled: false,
  rate: 1,
  duckOnTyping: 'duck',
  isDucked: false,
  chime: 'ding',
  queue: [],
  bargeIn: true,
  busy: false,
  paused: false,
  blocked: false,
  listeners: new Set(),
  unlockAudio,
  useAutoplayGate,
  get autoplayBlocked() {
    return autoplay.blocked
  },
}
const clientId =
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()
let sessionGeneration = 0,
  playbackGeneration = 0,
  requestController = null,
  streamCleanup = null
let pendingStopPromise = Promise.resolve()
const ignoredJobs = new Set(),
  jobTexts = new Map()
const noticeDecisions = new Map()
function queueAutomatic(item) {
  if (item.noticePolicy) {
    const key = item.noticeId || item.id
    if (!noticeDecisions.has(key)) {
      const accepted = item.noticePolicy !== 'idle-only' || !isSpeakingNow()
      noticeDecisions.set(key, accepted)
      if (noticeDecisions.size > 128) noticeDecisions.delete(noticeDecisions.keys().next().value)
      if (accepted && item.noticePolicy === 'interrupt') {
        for (const id of item.cancelledJobs || []) ignoredJobs.add(id)
        stopPlayback(false)
      }
    }
    if (!noticeDecisions.get(key)) return
  } else if (statusKnown && !player.enabled) return
  if (item.text) recent.add(item.text)
  player.queue.push({ ...item, source: item.noticePolicy ? 'notice' : 'auto' })
}
const ownershipChannel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('dsh-tts/playback') : null
let yieldUntil = 0,
  leaseUntil = 0
if (ownershipChannel)
  ownershipChannel.onmessage = (event) => {
    const data = event.data
    if (data?.sessionId !== player.sessionId || data.clientId === clientId || data.type !== 'takeover') return
    stopPlayback(false)
    if (requestController) requestController.abort()
    player.owner = false
    yieldUntil = Date.now() + 5000
    if (streamCleanup) {
      streamCleanup()
      streamCleanup = null
    }
  }
function scopeQuery(sid = player.sessionId) {
  return 'sessionId=' + encodeURIComponent(sid || '') + '&clientId=' + encodeURIComponent(clientId)
}
function reportPlaybackError(error) {
  player.error = String(error?.message || error)
  playerChanged()
}
function useSessionIdentity(props) {
  const snap = typeof props?.useSession === 'function' ? props.useSession((s) => s) : null
  return props?.sessionId || snap?.sessionId || props?.session?.id || null
}
function releaseSession(sid) {
  if (!sid) return
  clientFetch('/dsh-sound-atelier/playback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'release', sessionId: sid, clientId }),
    keepalive: true,
  }).catch(() => {})
}
function bindSession(sid) {
  if ((sid || null) === (player.sessionId || null)) return
  stopPlayback()
  releaseSession(player.sessionId)
  if (streamCleanup) {
    streamCleanup()
    streamCleanup = null
  }
  player.sessionId = sid || null
  player.after = ''
  player.lastJob = null
  player.lastItem = null
  player.lastText = ''
  player.owner = false
  player.baseline = true
  sessionGeneration++
  refreshStatusSoon()
  seenIds.clear()
  ignoredJobs.clear()
  jobTexts.clear()
  if (sid) pollPending()
  playerChanged()
}
function rememberJob(item) {
  if (!item.jobId) {
    player.lastJob = null
    return
  }
  player.lastJob = { jobId: item.jobId, sessionId: item.sessionId || player.sessionId || '' }
  const id = item.jobId
  if (!jobTexts.has(id)) {
    jobTexts.set(id, item.text || '')
    if (jobTexts.size > 64) jobTexts.delete(jobTexts.keys().next().value)
    clientFetch('/dsh-sound-atelier/job?id=' + encodeURIComponent(id) + '&' + scopeQuery(item.sessionId))
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          if (player.lastJob?.jobId === id)
            player.segmentTotal = Math.max(player.segmentTotal || 0, d.totalSegments || 0)
          jobTexts.set(id, d.text)
          if (player.lastJob?.jobId === id) {
            player.lastText = d.text
            playerChanged()
          }
        }
      })
      .catch(() => {})
  }
  player.lastText = jobTexts.get(id) || item.text || ''
}
function acceptsItem(item) {
  return !!(
    !archivedSessions.has(item?.sessionId) &&
    player.owner &&
    !player.stopping &&
    item?.sessionId === player.sessionId &&
    (!item.clientId || item.clientId === clientId) &&
    !ignoredJobs.has(item.jobId) &&
    !item.cancelled
  )
}
const archivedSessions = new Set()
const seenIds = new Set()
// Reply <div data-turn-tail> the current playback belongs to. Set when the
// per-message speaker starts a clip; null for auto-speech, where the newest
// reply hosts the transport instead.
let activeTailEl = null
// False until /dsh-tts/status answers: before that the `enabled` default is
// not a real reading, so stream items must not be discarded.
let statusKnown = false
let currentAudioResolve = null
function playerChanged() {
  playerSeen = playerSignature()
  for (const listener of [...player.listeners]) {
    try {
      listener()
    } catch (listenerFailure) {
      /* foreign listener failure is not ours */
    }
  }
}
// 畫面會用到的播放狀態。每則回覆都掛一個訂閱，所以定時檢查只比對這個字串，
// 有變化才重繪；沒有播放時不會造成任何重繪。
function playerSignature() {
  const audio = player.audio
  return [
    audio ? 1 : 0,
    audio ? Math.round((Number(audio.currentTime) || 0) * 5) : 0,
    audio ? Number(audio.duration) || 0 : 0,
    audio ? Number(audio.playbackRate) || 1 : 1,
    player.busy ? 1 : 0,
    player.paused ? 1 : 0,
    player.blocked ? 1 : 0,
    player.enabled ? 1 : 0,
    player.owner ? 1 : 0,
    player.awaitingSpeech ? 1 : 0,
    player.queue.length,
    player.segmentIndex || 0,
    player.segmentTotal || 0,
    player.playbackMode || '',
    player.error || '',
    player.lastText || '',
  ].join('|')
}
let playerSeen = '',
  playerTicker = null
function usePlayer() {
  const [, force] = React.useReducer((n) => n + 1, 0)
  React.useEffect(() => {
    player.listeners.add(force)
    if (!playerTicker) {
      playerSeen = playerSignature()
      // 所有訂閱共用一個計時器，補上沒有明確通知的狀態改變（例如 HTMLAudio 的播放進度）。
      playerTicker = setInterval(() => {
        if (playerSignature() !== playerSeen) playerChanged()
      }, 250)
    }
    return () => {
      player.listeners.delete(force)
      if (!player.listeners.size && playerTicker) {
        clearInterval(playerTicker)
        playerTicker = null
      }
    }
  }, [])
  return player
}
// Short chime is synthesized in-browser: no file to download, store, or configure.
function playChime(kind) {
  return new Promise((resolve) => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) {
        resolve()
        return
      }
      // 先判斷再建立：瀏覽器限制同時存在的 AudioContext 數量，建立後不關閉會累積。
      if (kind === 'none') {
        resolve()
        return
      }
      const audioCtx = new AC()
      const gain = audioCtx.createGain()
      gain.connect(audioCtx.destination)
      // [頻率清單, 音量峰值, 每個音的長度（秒）]
      const CHIMES = {
        ding: [[660, 990], 0.25, 0.2],
        beep: [[880, 880], 0.25, 0.2],
        pop: [[520], 0.3, 0.09],
        subtle: [[440, 554], 0.1, 0.16],
      }
      const [tones, peak, length] = CHIMES[kind] || CHIMES.ding
      let at = audioCtx.currentTime
      for (const freq of tones) {
        const osc = audioCtx.createOscillator()
        osc.frequency.value = freq
        osc.connect(gain)
        gain.gain.setValueAtTime(0.0001, at)
        gain.gain.exponentialRampToValueAtTime(peak, at + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, at + length - 0.02)
        osc.start(at)
        osc.stop(at + length)
        at += length + 0.02
      }
      setTimeout(() => {
        try {
          audioCtx.close()
        } catch (already) {
          /* already closed */
        }
        resolve()
      }, 600)
    } catch {
      resolve() /* no AudioContext */
    }
  })
}
// Provider failed — fall back to the browser voice. Worse quality, but silence
// is worse: the user would not know the reply is ready.
function speakInBrowser(text, item) {
  return new Promise((resolve) => {
    try {
      if (!window.speechSynthesis || !text) {
        resolve()
        return
      }
      const utterance = new SpeechSynthesisUtterance(String(text))
      utterance.rate = Math.max(0.5, Math.min(2, (item && item.rate) || player.rate || 1))
      utterance.volume = typeof item?.volume === 'number' ? Math.max(0, Math.min(1, item.volume)) : 1
      utterance.onend = () => resolve()
      utterance.onerror = () => resolve()
      window.speechSynthesis.speak(utterance)
    } catch {
      resolve() /* no speechSynthesis */
    }
  })
}
function prepareAudioItem(item) {
  if (!item || !item.audioBase64 || item.prepared) return item
  try {
    const bin = atob(item.audioBase64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const blob = new Blob([bytes], { type: item.mime || 'audio/mpeg' })
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.preload = 'auto'
    item.prepared = { audio, url }
  } catch {
    /* decode error — item stays unprepared */
  }
  return item
}
function prebufferNext() {
  for (const next of player.queue) {
    if (next && next.audioBase64 && !next.prepared) {
      prepareAudioItem(next)
      break
    }
  }
}
function playAudio(item) {
  return new Promise((resolve) => {
    try {
      prepareAudioItem(item)
      if (!item.prepared) return resolve()
      const { audio, url } = item.prepared
      audio.playbackRate = Math.max(0.5, Math.min(2, (item && item.rate) || player.rate || 1))
      audio.preservesPitch = true
      audio.volume = typeof item?.volume === 'number' ? Math.max(0, Math.min(1, item.volume)) : 1
      player.audio = audio
      player.segmentIndex = item.sentenceIndex || 0
      player.segmentTotal = item.totalSentences || 1
      player.playbackMode = 'HTMLAudio'
      acquireWakeLock()
      updateKaraokeHighlight(item)
      if (item.audioBase64 && item.kind !== 'chime') {
        // Keep the last clip in memory so replay is instant (no round trip).
        player.lastItem = {
          jobId: item.jobId,
          sessionId: item.sessionId,
          rate: item.rate,
          volume: item.volume,
          text: item.text || '',
          mime: item.mime || 'audio/mpeg',
          audioBase64: item.audioBase64,
        }
      }
      if (item.text) player.lastText = item.text
      rememberJob(item)
      playerChanged()
      prebufferNext()
      let doneCalled = false
      const done = (reason = 'cancelled') => {
        if (doneCalled) return
        doneCalled = true
        currentAudioResolve = null
        audio.onended = null
        audio.onerror = null
        if (reason !== 'ended') {
          try {
            audio.pause()
          } catch {
            /* already paused */
          }
        }
        try {
          URL.revokeObjectURL(url)
        } catch {
          /* URL already revoked */
        }
        clearKaraokeHighlight()
        if (player.queue.length === 0) releaseWakeLock()
        item.prepared = null
        player.audio = null
        playerChanged()
        resolve()
      }
      currentAudioResolve = done
      audio.onended = () => done('ended')
      audio.onerror = () => {
        reportPlaybackError(Error('音訊無法解碼或播放。'))
        done('error')
      }
      audio.play().catch((playErr) => {
        if (doneCalled) return
        // Autoplay without a user gesture is blocked — retain queue and surface unlock UX (#160)
        if (playErr && (playErr.name === 'NotAllowedError' || playErr.name === 'SecurityError')) {
          player.blocked = true
          setAutoplayBlocked(true)
          player.queue.unshift(item)
          audio.onended = null
          audio.onerror = null
          currentAudioResolve = null
          player.audio = null
          player.busy = false
          playerChanged()
          if (typeof window !== 'undefined') {
            removeGestureListeners()
            const onUserGesture = () => {
              removeGestureListeners()
              unlockAudio()
            }
            window.addEventListener('click', onUserGesture, { once: true })
            window.addEventListener('keydown', onUserGesture, { once: true })
            window.addEventListener('touchstart', onUserGesture, { once: true })
            clearGestureListeners = () => {
              window.removeEventListener('click', onUserGesture)
              window.removeEventListener('keydown', onUserGesture)
              window.removeEventListener('touchstart', onUserGesture)
            }
          }
          resolve()
          return
        }
        done()
      })
    } catch {
      /* cannot decode — skip chunk */
      currentAudioResolve = null
      resolve()
    }
  })
}

// Sample-clock scheduling for successive decoded chunks of one message.
// Buffer underflow is reported; no silence is inserted or tail trimmed.
async function playGapless(first) {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC || !first.jobId) return false
  const generation = playbackGeneration,
    context = new AC(),
    gain = context.createGain()
  gain.connect(context.destination)
  let ended = false,
    pumping = false,
    finish,
    scheduled = [],
    timeline = [],
    nextAt = context.currentTime + 0.04,
    position = 0,
    rate = 1,
    volume = 1,
    ticker
  const complete = new Promise((r) => (finish = r)),
    valid = () => generation === playbackGeneration && !ended
  const total = () => timeline.reduce((s, r) => s + r.buffer.duration, 0)
  const current = () => {
    const now = context.currentTime,
      r = scheduled.find((s) => now >= s.at && now < s.end)
    return r ? Math.min(total(), r.offset + (now - r.at) * r.rate) : position
  }
  const clearSources = () => {
    for (const r of scheduled) {
      r.source.onended = null
      try {
        r.source.stop()
      } catch {}
    }
    scheduled = []
  }
  const stop = () => {
    if (ended) return
    ended = true
    clearInterval(ticker)
    clearSources()
    context.close().catch(() => {})
    if (player.audio === control) player.audio = null
    clearKaraokeHighlight()
    currentAudioResolve = null
    finish()
  }
  function schedule(row, offset = 0) {
    const source = context.createBufferSource()
    source.buffer = row.buffer
    source.playbackRate.value = rate
    source.connect(gain)
    const at = Math.max(nextAt, context.currentTime + 0.015),
      span = (row.buffer.duration - offset) / rate,
      record = { source, at, end: at + span, offset: row.offset + offset, rate, row }
    source.onended = () => {
      if (!valid()) return
      position = row.offset + row.buffer.duration
      scheduled = scheduled.filter((s) => s !== record)
      void pump()
    }
    source.start(at, offset)
    nextAt = record.end
    scheduled.push(record)
  }
  function rebuild(at) {
    clearSources()
    position = Math.max(0, Math.min(total(), at))
    nextAt = context.currentTime + 0.02
    for (const r of timeline) {
      if (r.offset + r.buffer.duration > position) schedule(r, Math.max(0, position - r.offset))
    }
  }
  const control = {
    get currentTime() {
      return current()
    },
    set currentTime(v) {
      if (Number.isFinite(v)) rebuild(v)
    },
    get duration() {
      return total()
    },
    get paused() {
      return context.state === 'suspended'
    },
    get playbackRate() {
      return rate
    },
    set playbackRate(v) {
      const at = current()
      rate = Math.max(0.5, Math.min(2, Number(v) || 1))
      rebuild(at)
    },
    get volume() {
      return volume
    },
    set volume(v) {
      volume = Math.max(0, Math.min(1, Number(v) || 0))
      gain.gain.value = volume
    },
    pause() {
      return context.suspend()
    },
    play() {
      return context.resume()
    },
    skip() {
      const at = current(),
        row = timeline.find((r) => at < r.offset + r.buffer.duration)
      if (row) rebuild(row.offset + row.buffer.duration)
    },
    gapless: true,
  }
  const add = async (item) => {
    const binary = atob(item.audioBase64),
      data = Uint8Array.from(binary, (c) => c.charCodeAt(0)),
      buffer = await context.decodeAudioData(data.buffer)
    if (!valid()) return
    const row = { item, buffer, offset: total() }
    timeline.push(row)
    schedule(row)
    player.lastItem = { ...item, prepared: undefined }
    rememberJob(item)
    player.lastText = item.text || player.lastText
    if (item.prepared?.url) {
      URL.revokeObjectURL(item.prepared.url)
      item.prepared = null
    }
  }
  let progressNotifiedAt = 0
  async function pump() {
    if (pumping || !valid()) return
    pumping = true
    try {
      while (valid() && scheduled.length < 3) {
        const item = player.queue[0]
        if (
          !item?.audioBase64 ||
          item.jobId !== first.jobId ||
          item.sessionId !== first.sessionId ||
          item.kind === 'chime'
        )
          break
        player.queue.shift()
        await add(item)
      }
      const at = current(),
        row = timeline.find((r) => at >= r.offset && at < r.offset + r.buffer.duration)
      let segmentChanged = false
      if (row && player.segmentIndex !== row.item.sentenceIndex) {
        segmentChanged = true
        player.segmentIndex = row.item.sentenceIndex
        player.segmentTotal = Math.max(player.segmentTotal || 0, row.item.totalSentences || 0, timeline.length)
        updateKaraokeHighlight(row.item)
      }
      player.progress = at
      player.duration = total()
      player.playbackMode = 'WebAudio'
      // 排程每 25 毫秒檢查一次，但畫面進度每 200 毫秒通知一次就夠；段落切換立即通知。
      if (segmentChanged || Date.now() - progressNotifiedAt >= 200) {
        progressNotifiedAt = Date.now()
        playerChanged()
      }
      if (!scheduled.length) {
        const waiting = player.awaitingSpeech || player.queue[0]?.kind === 'reserved'
        if (waiting) {
          player.playbackMode = 'buffering'
          return
        }
        stop()
      }
    } catch (e) {
      reportPlaybackError(e)
      stop()
    } finally {
      pumping = false
    }
  }
  try {
    await context.resume()
    if (!valid()) {
      await context.close()
      return true
    }
    if (context.state !== 'running') {
      await context.close()
      return false
    }
    rate = Math.max(0.5, Math.min(2, first.rate || player.rate || 1))
    volume = typeof first.volume === 'number' ? Math.max(0, Math.min(1, first.volume)) : 1
    gain.gain.value = volume
    player.segmentTotal = first.totalSentences || 0
    player.audio = control
    currentAudioResolve = stop
    acquireWakeLock()
    await add(first)
    ticker = setInterval(() => void pump(), 25)
    await pump()
    await complete
    return true
  } catch {
    stop()
    return timeline.length > 0 || generation !== playbackGeneration
  }
}

async function drainQueue() {
  if (player.busy || player.blocked || player.paused) return
  const generation = playbackGeneration
  player.busy = true
  playerChanged()
  try {
    while (generation === playbackGeneration && player.queue.length && !player.blocked && !player.paused) {
      const item = player.queue.shift()
      if (!item || item.kind === 'reserved') continue
      player.playbackSource = item.source || (item.kind ? 'auto' : 'manual')
      if (item.kind === 'chime') {
        await playChime(item.chime || player.chime)
        continue
      }
      if (item.audioBase64) {
        if (!(await playGapless(item))) await playAudio(item)
      } else if (item.error && item.text) {
        reportPlaybackError(Error(item.error))
        await speakInBrowser(item.text, item)
      }
    }
  } finally {
    player.busy = false
    playerChanged()
    if (player.queue.length && !player.blocked && !player.paused) drainQueue()
  }
}

function stopPlayback(cancel = true) {
  playbackGeneration++
  if (cancel) {
    if (requestController) {
      requestController.abort()
      requestController = null
    }
    const jobs = [player.lastJob, ...player.queue].filter((item) => item?.jobId)
    for (const job of jobs) {
      ignoredJobs.add(job.jobId)
      clientFetch('/dsh-sound-atelier/job?id=' + encodeURIComponent(job.jobId) + '&' + scopeQuery(job.sessionId), {
        method: 'DELETE',
      }).catch(() => {})
    }
    if (ignoredJobs.size > 128) ignoredJobs.delete(ignoredJobs.values().next().value)
    if (player.owner && player.sessionId) {
      player.stopping = true
      const task = clientFetch('/dsh-sound-atelier/playback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop', sessionId: player.sessionId, clientId }),
      })
        .then((r) => r.json())
        .then((d) => {
          for (const id of d.ignoredJobs || []) ignoredJobs.add(id)
        })
        .catch(() => {})
        .finally(() => {
          if (pendingStopPromise === task) player.stopping = false
        })
      pendingStopPromise = task
    }
  }
  player.awaitingSpeech = false
  player.playbackSource = null
  clearKaraokeHighlight()
  releaseWakeLock()
  activeTailEl = null
  removeGestureListeners()
  player.blocked = false
  setAutoplayBlocked(false)
  for (const item of player.queue) {
    if (item && item.prepared && item.prepared.url) {
      try {
        URL.revokeObjectURL(item.prepared.url)
      } catch {
        /* already revoked */
      }
      item.prepared = null
    }
  }
  player.queue.length = 0
  player.paused = false
  if (player.audio) {
    try {
      player.audio.pause()
      player.audio.currentTime = 0
    } catch {
      /* already paused */
    }
  }
  if (currentAudioResolve) {
    currentAudioResolve()
  }
  player.audio = null
  try {
    if (window.speechSynthesis) window.speechSynthesis.cancel()
  } catch {
    /* no speechSynthesis */
  }
  playerChanged()
}
function togglePause() {
  player.paused = !player.paused
  if (player.audio) {
    try {
      player.paused ? player.audio.pause() : player.audio.play()
    } catch (already) {
      /* ignore play/pause failure */
    }
  }
  if (!player.paused) drainQueue()
  playerChanged()
}
function skipCurrent() {
  if (player.audio?.gapless) {
    player.audio.skip()
    return
  }
  try {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  } catch (_err) {
    /* no speechSynthesis */
  }
  if (player.audio) {
    try {
      player.audio.pause()
      player.audio.currentTime = 0
    } catch (_err) {
      /* ignore pause error */
    }
  }
  if (currentAudioResolve) {
    currentAudioResolve()
  } else {
    player.audio = null
    player.busy = false
    playerChanged()
    if (player.queue.length) drainQueue()
  }
}

// User started talking — stop playback.
//
// The event may come from a voice-input plugin, but there is no hard dependency:
// without that plugin the event simply never fires. We listen on window on purpose.
function listenForVoice() {
  if (typeof window === 'undefined') return () => {}
  const onSpeaking = (event) => {
    const phase = event && event.detail && event.detail.phase
    if (phase !== 'start') return
    if (!player.bargeIn || player.vadBargeIn === false) return
    stopPlayback()
  }
  window.addEventListener('dsh-voice:speaking', onSpeaking)
  return () => window.removeEventListener('dsh-voice:speaking', onSpeaking)
}
// Unified SSE Realtime Stream Connection (#158, #206)
let activeSse = null
let activeSseAttempt = 0
let activeSseTimer = null
let activeSseWatchdog = null
let sseDisposed = false
const SSE_IDLE_TIMEOUT_MS = 30000

function startSseStream() {
  if (!player.sessionId || !player.owner || typeof window === 'undefined' || typeof window.EventSource === 'undefined')
    return () => {}
  sseDisposed = false

  const resetWatchdog = () => {
    if (activeSseWatchdog) clearTimeout(activeSseWatchdog)
    if (sseDisposed) return
    activeSseWatchdog = setTimeout(() => {
      if (activeSse && !sseDisposed) {
        try {
          if (typeof activeSse.onerror === 'function') {
            activeSse.onerror(new Event('error'))
          } else {
            activeSse.close()
          }
        } catch (_err) {
          /* error trigger ignore */
        }
      }
    }, SSE_IDLE_TIMEOUT_MS)
  }

  const onItem = (e) => {
    resetWatchdog()
    try {
      const item = JSON.parse(e.data)
      if (!item || !item.id || !acceptsItem(item)) return
      if (statusKnown && player.enabled === false && !item.noticePolicy) return
      player.after = item.id
      if (seenIds.has(item.id)) return
      seenIds.add(item.id)
      if (seenIds.size > 500) {
        const first = seenIds.values().next().value
        seenIds.delete(first)
      }
      queueAutomatic(item)
      drainQueue()
    } catch {
      /* ignore malformed SSE */
    }
  }
  const onChime = (e) => {
    resetWatchdog()
    try {
      const item = JSON.parse(e.data)
      if (!item || !acceptsItem(item) || seenIds.has(item.id)) return
      seenIds.add(item.id)
      if (statusKnown && player.enabled === false && !item.noticePolicy) return
      queueAutomatic(item)
      drainQueue()
    } catch (_err) {
      /* ignore malformed chime payload */
    }
  }
  const connect = () => {
    if (sseDisposed) return
    if (activeSseWatchdog) {
      clearTimeout(activeSseWatchdog)
      activeSseWatchdog = null
    }
    if (activeSse) {
      try {
        activeSse.close()
      } catch (_err) {
        /* active sse already closed */
      }
      activeSse = null
    }
    try {
      const es = new EventSource('/dsh-sound-atelier/stream?' + scopeQuery())
      activeSse = es
      es.onopen = () => {
        activeSseAttempt = 0
        resetWatchdog()
      }
      es.onmessage = () => {
        resetWatchdog()
      }
      es.addEventListener('utterance', onItem)
      es.addEventListener('chime', onChime)
      es.onerror = () => {
        if (activeSseWatchdog) {
          clearTimeout(activeSseWatchdog)
          activeSseWatchdog = null
        }
        if (activeSse === es) {
          try {
            es.close()
          } catch (_err) {
            /* eventsource already closed */
          }
          activeSse = null
        }
        if (sseDisposed) return
        activeSseAttempt++
        const delay = Math.min(10000, 500 * Math.pow(2, Math.min(activeSseAttempt, 5)))
        if (activeSseTimer) clearTimeout(activeSseTimer)
        activeSseTimer = setTimeout(connect, delay)
      }
      resetWatchdog()
    } catch {
      /* EventSource failed */
    }
  }
  connect()

  return () => {
    sseDisposed = true
    if (activeSseTimer) {
      clearTimeout(activeSseTimer)
      activeSseTimer = null
    }
    if (activeSseWatchdog) {
      clearTimeout(activeSseWatchdog)
      activeSseWatchdog = null
    }
    if (activeSse) {
      try {
        activeSse.close()
      } catch (_err) {
        /* active sse already closed on dispose */
      }
      activeSse = null
    }
  }
}
let polling = false
const STATUS_REFRESH_MS = 5000
let statusFetchedAt = 0
// 設定剛改過（儲存、切換自動朗讀、換會話）時呼叫，下一次輪詢立即重讀偏好值。
function refreshStatusSoon() {
  statusFetchedAt = 0
}
async function pollPending() {
  if (polling) return
  polling = true
  const generation = sessionGeneration,
    sid = player.sessionId
  try {
    // 偏好值幾秒同步一次即可；每秒需要的只有下面的 /pending（播放權租約與新片段）。
    if (!statusKnown || Date.now() - statusFetchedAt >= STATUS_REFRESH_MS) {
      const st = await clientFetch('/dsh-sound-atelier/status', { cache: 'no-store', timeoutMs: 8000 })
      if (!st.ok || generation !== sessionGeneration) return
      const meta = await st.json()
      if (generation !== sessionGeneration) return
      statusFetchedAt = Date.now()
      const previousEnabled = player.enabled
      player.enabled = !!meta?.speakReplies
      player.notificationsEnabled = !!meta?.announceApproval
      statusKnown = true
      if (previousEnabled !== player.enabled) playerChanged()
      for (const key of ['rate', 'duckOnTyping', 'chime', 'roles', 'bargeIn', 'vadBargeIn'])
        if (meta[key] !== undefined) player[key] = meta[key]
    }
    if (!sid || archivedSessions.has(sid) || Date.now() < yieldUntil) return
    const res = await clientFetch(
      '/dsh-sound-atelier/pending?' + scopeQuery(sid) + '&after=' + encodeURIComponent(player.after || ''),
      { cache: 'no-store', timeoutMs: 8000 },
    )
    const data = await res.json()
    if (generation !== sessionGeneration) return
    if (!data.owner) {
      if (player.owner) {
        stopPlayback(false)
        if (requestController) requestController.abort()
        if (streamCleanup) {
          streamCleanup()
          streamCleanup = null
        }
      }
      player.owner = false
      return
    }
    const gained = !player.owner
    player.owner = true
    leaseUntil = Date.now() + 4000
    const items = Array.isArray(data.items) ? data.items : []
    player.awaitingSpeech =
      player.enabled &&
      (!!data.preparing || items.some((item) => item.kind === 'reserved' && !ignoredJobs.has(item.jobId)))
    if (player.baseline || gained) {
      // Opening a chat or taking over an expired lease never replays its history.
      for (const item of items) {
        seenIds.add(item.id)
        player.after = item.id
      }
      player.baseline = false
    } else {
      for (const item of items) {
        if (item.kind === 'reserved') break
        player.after = item.id
        if (!acceptsItem(item) || seenIds.has(item.id)) continue
        seenIds.add(item.id)
        if (seenIds.size > 1000) seenIds.delete(seenIds.values().next().value)
        queueAutomatic(item)
      }
    }
    if (!streamCleanup && (player.enabled || player.notificationsEnabled)) streamCleanup = startSseStream()
    if (!player.enabled) {
      // Auto-read preferences never cancel an explicit preview or replay.
      const automatic = player.queue.filter((item) => item.source === 'auto')
      player.queue = player.queue.filter((item) => item.source !== 'auto')
      for (const item of automatic) {
        if (item.prepared?.url) URL.revokeObjectURL(item.prepared.url)
        if (item.jobId)
          clientFetch('/dsh-sound-atelier/job?id=' + encodeURIComponent(item.jobId) + '&' + scopeQuery(item.sessionId), {
            method: 'DELETE',
          }).catch(() => {})
      }
      if (player.playbackSource === 'auto') {
        const notices = player.queue.filter((i) => i.source === 'notice'),
          job = player.lastJob
        if (job?.jobId) {
          ignoredJobs.add(job.jobId)
          clientFetch('/dsh-sound-atelier/job?id=' + encodeURIComponent(job.jobId) + '&' + scopeQuery(job.sessionId), {
            method: 'DELETE',
          }).catch(() => {})
        }
        stopPlayback(false)
        player.queue.push(...notices)
      }
    }
    if (player.queue.length) drainQueue()
  } catch {
    /* host restarting */
  } finally {
    polling = false
  }
}
// Recent utterances: last reply texts and favorites (localStorage).
function recentStore() {
  const KEY = 'dsh-tts/recent'
  let st
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null
    st = JSON.parse(raw) || { items: [], favs: [] }
  } catch (broken) {
    st = { items: [], favs: [] }
  }
  const persist = () => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(st))
    } catch (full) {
      /* private mode / quota */
    }
  }
  return {
    add(text) {
      if (!text || text.length < 2) return
      st.items = [text, ...st.items.filter((x) => x !== text)].slice(0, 30)
      persist()
    },
    toggleFav(text) {
      st.favs = st.favs.includes(text) ? st.favs.filter((x) => x !== text) : [text, ...st.favs].slice(0, 20)
      persist()
    },
    list() {
      return { items: st.items, favs: st.favs }
    },
  }
}
const recent = recentStore()

// Unified playback through the shared player controller (#159)
function playAudioItem(item) {
  stopPlayback(false)
  player.queue.push({ ...item, source: 'manual' })
  drainQueue()
}
async function claimPlayback(sid, signal) {
  if (!sid) return
  const r = await clientFetch('/dsh-sound-atelier/playback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'claim', takeover: true, sessionId: sid, clientId }),
    signal,
  })
  const d = await r.json()
  if (!d.owner) throw Error('無法取得此會話的播放權。')
  signal?.throwIfAborted()
  ownershipChannel?.postMessage({ type: 'takeover', sessionId: sid, clientId })
  yieldUntil = 0
  player.owner = true
  leaseUntil = Date.now() + 4000
}
async function requestSpeech(text, overrides = {}, sid = player.sessionId) {
  if (archivedSessions.has(sid)) throw Error('此會話已歸檔，請先還原會話再朗讀。')
  stopPlayback()
  player.error = ''
  if (sid && sid !== player.sessionId) bindSession(sid)
  const generation = playbackGeneration
  const controller = new AbortController()
  requestController = controller
  try {
    await pendingStopPromise
    controller.signal.throwIfAborted()
    await claimPlayback(sid, controller.signal)
    const r = await clientFetch('/dsh-sound-atelier/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, channel: 'web', sessionId: sid || '', clientId, ...overrides }),
      signal: controller.signal,
      timeoutMs: 600000,
    })
    const d = await r.json()
    if (generation !== playbackGeneration || controller.signal.aborted) return null
    if (!d.ok) throw Error(d.error?.message || 'Speech synthesis failed')
    player.owner = true
    return { ...d, id: d.jobId, text: d.text || text }
  } finally {
    if (requestController === controller) requestController = null
  }
}
function playStandalone(text) {
  if (!text) return
  requestSpeech(text)
    .then((item) => {
      if (item) playAudioItem(item)
    })
    .catch((e) => {
      if (e.name !== 'AbortError') reportPlaybackError(e)
    })
}
async function retainedAudio(job) {
  const r = await clientFetch(
    '/dsh-sound-atelier/job?id=' + encodeURIComponent(job.jobId) + '&' + scopeQuery(job.sessionId) + '&audio=1',
    { timeoutMs: 600000 },
  )
  const d = await r.json()
  if (!d.ok) throw Error(d.error?.message || '完整語音尚未完成或已過期，請重新朗讀。')
  return { ...d, id: d.jobId }
}
function replayRetained(source, tailEl = null) {
  if (archivedSessions.has(source.sessionId || player.sessionId)) {
    reportPlaybackError(Error('此會話已歸檔，請先還原會話再重播。'))
    return
  }
  stopPlayback(false)
  if (requestController) requestController.abort()
  const generation = playbackGeneration
  const controller = new AbortController()
  requestController = controller
  claimPlayback(source.sessionId || player.sessionId, controller.signal)
    .then(() => (source.jobId ? retainedAudio(source) : source))
    .then((item) => {
      if (generation === playbackGeneration && !controller.signal.aborted) {
        playAudioItem(item)
        activeTailEl = tailEl
      }
    })
    .catch((e) => {
      if (e.name !== 'AbortError') reportPlaybackError(e)
    })
    .finally(() => {
      if (requestController === controller) requestController = null
    })
}
function replayLast() {
  if (player.lastJob) {
    replayRetained(player.lastJob)
    return true
  }
  if (player.lastItem?.audioBase64) {
    replayRetained({ ...player.lastItem })
    return true
  }
  if (player.lastText) {
    playStandalone(player.lastText)
    return true
  }
  return false
}

function isSpeakingNow() {
  return !!player.audio || player.busy || player.queue.length > 0 || player.awaitingSpeech
}

function previewSpeech(provider, model, voice, text, tuning) {
  stopPlayback()
  const generation = playbackGeneration
  const controller = new AbortController()
  requestController = controller
  return clientFetch('/dsh-sound-atelier/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, model, voice, text, tuning }),
    signal: controller.signal,
    timeoutMs: 65000,
  })
    .then((r) => r.json())
    .then((d) => {
      if (generation !== playbackGeneration || controller.signal.aborted) return
      if (!d || !d.ok) throw new Error((d && d.error && d.error.message) || 'HTTP error')
      return claimPlayback(player.sessionId, controller.signal).then(() => {
        if (generation !== playbackGeneration || controller.signal.aborted) return
        playAudioItem({
          id: `preview-${Date.now()}`,
          rate: d.rate,
          volume: d.volume,
          text: d.text || text,
          mime: d.mime || 'audio/mpeg',
          audioBase64: d.audioBase64,
        })
      })
    })
    .finally(() => {
      if (requestController === controller) requestController = null
    })
}

player.playAudioItem = playAudioItem
player.previewSpeech = previewSpeech
player.startSseStream = startSseStream
player.skipCurrent = skipCurrent
async function exportAudioClip() {
  try {
    const item = player.lastJob ? await retainedAudio(player.lastJob) : player.lastItem
    if (!item?.audioBase64) throw Error('沒有可匯出的完整語音，請先完成朗讀。')
    const bin = atob(item.audioBase64),
      bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    const mime = item.mime || 'audio/mpeg'
    const url = URL.createObjectURL(new Blob([bytes], { type: mime }))
    const a = document.createElement('a')
    a.href = url
    const extension = mime.includes('wav')
      ? '.wav'
      : mime.includes('flac')
        ? '.flac'
        : mime.includes('ogg') || mime.includes('opus')
          ? '.ogg'
          : mime.includes('mp4')
            ? '.m4a'
            : mime.includes('aac')
              ? '.aac'
              : mime.includes('pcm')
                ? '.pcm'
                : '.mp3'
    a.download = 'dsh-tts-' + Date.now() + extension
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  } catch (e) {
    reportPlaybackError(e)
  }
}
function credOf(map, provider) {
  return (map && map[provider]) || { configured: false, writable: true, ref: '' }
}
