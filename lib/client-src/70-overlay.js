let duckTimer = null
let preDuckVolume = 1
function handleTypingActivity() {
  if (!isSpeakingNow()) return
  const mode = player.duckOnTyping || 'duck'
  if (mode === 'off') return
  if (mode === 'stop') {
    stopPlayback()
    return
  }
  if (mode === 'pause') {
    if (!player.paused) togglePause()
    clearTimeout(duckTimer)
    duckTimer = setTimeout(() => {
      if (player.paused && player.busy) togglePause()
    }, 5000)
    return
  }
  if (mode === 'duck') {
    if (player.audio && !player.isDucked) {
      preDuckVolume = player.audio.volume || 1
      player.audio.volume = Math.max(0.1, preDuckVolume * 0.2)
      player.isDucked = true
    }
    clearTimeout(duckTimer)
    duckTimer = setTimeout(() => {
      if (player.audio && player.isDucked) {
        player.audio.volume = preDuckVolume
        player.isDucked = false
      }
    }, 3500)
  }
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener(
    'input',
    (e) => {
      const tag = e.target && e.target.tagName
      if (tag === 'TEXTAREA' || tag === 'INPUT' || (e.target && e.target.isContentEditable)) {
        handleTypingActivity()
      }
    },
    true,
  )
}

function ArchiveWatcher({ useWorkspaces }) {
  const ids = useWorkspaces((s) => s?.archivedSessionIds || null)
  React.useEffect(() => {
    if (!Array.isArray(ids)) return
    archivedSessions.clear()
    for (const id of ids) archivedSessions.add(id)
    if (archivedSessions.has(player.sessionId)) stopPlayback()
  }, [ids])
  return null
}
function PlaybackOverlay(props) {
  useUiLanguage()
  const p = usePlayer()
  React.useEffect(() => {
    if (!p.error) return
    const timer = setTimeout(() => {
      player.error = ''
      playerChanged()
    }, 10000)
    return () => clearTimeout(timer)
  }, [p.error])
  return React.createElement(
    React.Fragment,
    null,
    typeof props?.useWorkspaces === 'function'
      ? React.createElement(ArchiveWatcher, { useWorkspaces: props.useWorkspaces })
      : null,
    p.error
      ? React.createElement(
          'div',
          {
            className: 'dts-alert dts-alert-err',
            role: 'alert',
            style: { position: 'fixed', bottom: 24, left: 20, maxWidth: 'calc(100vw - 40px)', zIndex: 99999 },
          },
          p.error,
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'dts-btn',
              'aria-label': '關閉語音錯誤',
              onClick: () => {
                player.error = ''
                playerChanged()
              },
            },
            '×',
          ),
        )
      : null,
  )
}
exports.apply = function apply(ctx) {
  ctx.slots.inject('shell.overlay', () =>
    ctx.slots.register(
      { name: 'shell.overlay', key: 'dsh-tts-playback-guard', id: 'dsh-tts-playback-guard' },
      PlaybackOverlay,
    ),
  )
  registerSettings(ctx)
  registerSpeaker(ctx)
  registerMessageAction(ctx)
  ctx.effect(() => {
    if (typeof document === 'undefined') return () => {}
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'dts-btn'
    button.textContent = '朗讀選取文字'
    button.setAttribute('aria-label', '朗讀選取文字')
    button.style.cssText =
      'position:fixed;z-index:9999;display:none;max-width:calc(100vw - 16px);background:var(--dsw-alias-bg-layer-3,#fff);color:var(--dsw-alias-label-primary,#182236);border:1px solid var(--dsw-alias-border-l2,#ccc);border-radius:8px;padding:7px 12px;box-shadow:0 3px 12px #0002'
    let selected = ''
    const hide = () => {
      button.style.display = 'none'
      selected = ''
    }
    const element = (n) => (n?.nodeType === 1 ? n : n?.parentElement)
    const update = () => {
      const selection = window.getSelection?.()
      if (!selection || selection.isCollapsed || !selection.rangeCount || !player.sessionId) return hide()
      const a = element(selection.anchorNode),
        b = element(selection.focusNode),
        start = a?.closest('[data-chat-flow-kind="assistant-step"]'),
        end = b?.closest('[data-chat-flow-kind="assistant-step"]')
      if (
        !start ||
        !end ||
        a.closest('input,textarea,[contenteditable="true"]') ||
        b.closest('input,textarea,[contenteditable="true"]')
      )
        return hide()
      if (
        start !== end &&
        (!start.getAttribute('data-chat-flow-turn') ||
          start.getAttribute('data-chat-flow-turn') !== end.getAttribute('data-chat-flow-turn'))
      )
        return hide()
      selected = selection.toString().trim()
      if (!selected || selected.length > 100000) return hide()
      const rect = selection.getRangeAt(0).getBoundingClientRect()
      button.style.left = Math.max(8, Math.min(innerWidth - 170, rect.left)) + 'px'
      button.style.top = Math.max(8, Math.min(innerHeight - 44, rect.top - 40)) + 'px'
      button.style.display = 'block'
    }
    button.onpointerdown = (e) => e.preventDefault()
    button.onclick = () => {
      const text = selected,
        sid = player.sessionId
      hide()
      if (!text || !sid) return
      requestSpeech(text, {}, sid)
        .then((item) => {
          if (item) playAudioItem(item)
        })
        .catch(reportPlaybackError)
    }
    const key = (e) => {
      if (e.key === 'Escape') hide()
    }
    document.body.appendChild(button)
    document.addEventListener('selectionchange', update)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    window.addEventListener('keydown', key)
    return () => {
      button.remove()
      document.removeEventListener('selectionchange', update)
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
      window.removeEventListener('keydown', key)
    }
  }, 'dsh-tts: selected reply text')
  ctx.effect(() => listenForVoice(), 'dsh-tts: barge-in on user speech')
  ctx.effect(() => {
    if (typeof window === 'undefined') return () => {}
    const onKey = (e) => {
      // Shift+Space: stop while speaking, otherwise replay the last clip
      // (memory first, then the host cache) so a finished reply is one key away.
      if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault()
        if (e.repeat) return
        if (isSpeakingNow()) stopPlayback()
        else replayLast()
        return
      }
      if (e.ctrlKey && e.key === 'Escape') {
        togglePause()
        e.preventDefault()
      } else if (e.altKey && (e.code === 'KeyS' || e.key === 's' || e.key === 'S')) {
        stopPlayback()
        e.preventDefault()
      } else if (e.altKey && e.key === 'ArrowRight') {
        skipCurrent()
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, 'dsh-tts: hotkeys')
  ctx.effect(
    () => () => {
      if (streamCleanup) streamCleanup()
      stopPlayback()
      releaseSession(player.sessionId)
      ownershipChannel?.close()
    },
    'dsh-tts: scoped audio cleanup',
  )
  ctx.effect(() => {
    const release = () => {
      stopPlayback()
      releaseSession(player.sessionId)
    }
    window.addEventListener('pagehide', release)
    return () => window.removeEventListener('pagehide', release)
  }, 'dsh-tts: release playback on close')
  ctx.effect(() => {
    const timer = setInterval(() => {
      if (!player.owner || Date.now() < leaseUntil) return
      player.owner = false
      stopPlayback(false)
      if (requestController) requestController.abort()
      if (streamCleanup) {
        streamCleanup()
        streamCleanup = null
      }
    }, 250)
    return () => clearInterval(timer)
  }, 'dsh-tts: stop when playback lease expires')
  ctx.effect(() => {
    // Prime the status flag right away: autoplay used to wait out the first
    // interval tick, which dropped early stream items on a fresh start.
    pollPending()
    const timer = setInterval(pollPending, 1000)
    return () => clearInterval(timer)
  }, 'dsh-tts: poll pending audio')
}
