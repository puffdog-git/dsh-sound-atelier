function SpeakerControl(props) {
  useUiLanguage()
  const sessionId = useSessionIdentity(props)
  React.useEffect(() => {
    bindSession(sessionId)
    return () => bindSession(null)
  }, [sessionId])
  const t = (props && props.t) || fallbackDockText
  const p = usePlayer()
  const [saving, setSaving] = React.useState(false)
  const toggleAuto = async () => {
    if (saving) return
    setSaving(true)
    try {
      const r = await clientFetch('/dsh-sound-atelier/config'),
        d = await r.json()
      if (!r.ok || !d.ok) throw Error('無法讀取設定')
      const enabled = !d.config.speakReplies,
        next = await clientFetch('/dsh-sound-atelier/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...d.config, speakReplies: enabled, revision: d.revision }),
        }),
        data = await next.json()
      if (!next.ok || !data.ok) throw Error(data.error?.message || '設定儲存失敗')
      p.enabled = enabled
      refreshStatusSoon()
      playerChanged()
    } catch (e) {
      reportPlaybackError(e)
    } finally {
      setSaving(false)
    }
  }
  return React.createElement(
    'div',
    { style: { position: 'relative', display: 'inline-flex', gap: '4px', alignItems: 'center' } },
    React.createElement(
      'button',
      {
        type: 'button',
        className: 'dts-link',
        'aria-label': '自動朗讀',
        'aria-pressed': !!p.enabled,
        title: p.enabled ? '關閉自動朗讀' : '開啟自動朗讀',
        disabled: saving,
        onClick: toggleAuto,
      },
      p.enabled ? '🔊' : '🔈',
    ),
    p.error
      ? React.createElement(
          'span',
          {
            role: 'alert',
            className: 'dts-sub dts-bad',
            onClick: () => {
              p.error = ''
              playerChanged()
            },
          },
          p.error,
        )
      : null,
    p.blocked
      ? React.createElement(
          'button',
          {
            type: 'button',
            className: 'dts-link dts-warn',
            title: t('unlockAudio') || 'Click to unlock audio',
            onClick: unlockAudio,
          },
          '🔔',
        )
      : null,
  )
}

/**
 * Fallback translator for the dock.
 *
 * Bound at registration for the page lifetime. The core draws the slot label;
 * props.t never reaches it, so the binder is the only way to give it a language.
 */
let fallbackDockText = (key) => key

function registerSpeaker(ctx) {
  // `locale` in the slot descriptor is how core injects translations into props.
  // Without it the dock would show raw keys only.
  fallbackDockText = ctx.locale.bind(NS)
  ctx.slots.inject('conversation.input.dock', () =>
    ctx.slots.register(
      {
        name: 'conversation.input.dock',
        id: 'dsh-sound-atelier',
        locale: NS,
        order: 5,
        label: () => fallbackDockText('dockLabel'),
      },
      SpeakerControl,
    ),
  )
}

/**
 * Plugins page row seat (`plugins.row.config`, current core).
 *
 * The host page draws the title, icon and crumb and provides the content
 * padding, so the page view renders the settings form bare: our own card
 * chrome would double the border and shift the form out of the content
 * area. The summary view feeds the one-liner under the row title.
 */
