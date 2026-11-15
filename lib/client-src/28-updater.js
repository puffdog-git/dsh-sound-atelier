function PluginUpdaterBlock(props) {
  const t = props.t || ((key) => key)
  const [status, setStatus] = React.useState(null)
  const [loading, setLoading] = React.useState(false)
  const [updating, setUpdating] = React.useState(false)
  const [msg, setMsg] = React.useState(null)

  const checkUpdate = React.useCallback(async () => {
    setLoading(true)
    setMsg(null)
    try {
      const res = await clientFetch('/api/dsh-sound-atelier/update', {
        headers: { 'x-dsh-plugin-update': '1' },
        timeoutMs: 10000,
      })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const data = await res.json()
      setStatus(data)
    } catch (e) {
      setMsg({ ok: false, text: (t('updaterFailed') || 'Update check failed: ') + ((e && e.message) || String(e)) })
    } finally {
      setLoading(false)
    }
  }, [t])

  const onUpdateNow = async () => {
    setUpdating(true)
    setMsg(null)
    try {
      const res = await clientFetch('/api/dsh-sound-atelier/update', {
        method: 'POST',
        headers: {
          'x-dsh-plugin-update': '1',
          'content-type': 'application/json',
        },
        timeoutMs: 60000,
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data && (data.error || data.message)) || 'HTTP ' + res.status)
      setStatus(data)
      setMsg({ ok: true, text: t('updaterSuccess') || 'Plugin updated successfully! Please restart DSH service.' })
    } catch (e) {
      setMsg({ ok: false, text: (e && e.message) || String(e) })
    } finally {
      setUpdating(false)
    }
  }

  React.useEffect(() => {
    checkUpdate()
  }, [checkUpdate])

  const currentVer = (status && status.currentVersion) || '0.4.23'
  const latestVer = status && status.latestVersion
  const updateAvailable = Boolean(status && status.updateAvailable && latestVer && latestVer !== currentVer)
  // 從來源資料夾安裝的版本不提供一鍵更新，只顯示已發布的版本供參考。
  const localFork = Boolean(status && status.localFork)

  return React.createElement(
    'div',
    { className: 'dts-block', style: { gap: '10px' } },
    React.createElement(
      'div',
      {
        style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' },
      },
      React.createElement(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
        React.createElement('span', { className: 'dts-title' }, '🔄 ' + t('updaterTitle')),
        React.createElement(
          'span',
          { className: 'dts-badge ' + (updateAvailable ? 'dts-badge-warn' : 'dts-badge-on') },
          updateAvailable
            ? 'v' + latestVer + ' ' + (t('available') || 'available')
            : 'v' + currentVer + ' (' + t('updaterUpToDate') + ')',
        ),
      ),
      React.createElement(
        'div',
        { style: { display: 'flex', gap: '8px' } },
        updateAvailable
          ? React.createElement(
              'button',
              {
                type: 'button',
                className: 'dts-btn',
                style: {
                  borderColor: 'var(--dsw-alias-state-warn-primary)',
                  color: 'var(--dsw-alias-state-warn-primary)',
                },
                onClick: onUpdateNow,
                disabled: updating || loading,
              },
              updating
                ? t('updaterUpdating') || 'Updating…'
                : (t('updaterUpdateNow') || 'Update to v{version}').replace('{version}', latestVer),
            )
          : null,
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'dts-btn',
            onClick: checkUpdate,
            disabled: loading || updating,
          },
          loading ? t('updaterChecking') || 'Checking…' : t('updaterCheck') || 'Check updates',
        ),
      ),
    ),
    localFork
      ? React.createElement(
          'div',
          { className: 'dts-sub' },
          '這是從資料夾安裝的版本，沒有一鍵更新' + (latestVer ? '（已發布的最新版是 v' + latestVer + '）' : '') + '。要更新的話，換上新版資料夾後照安裝說明重新安裝一次。',
        )
      : null,
    msg
      ? React.createElement(
          'div',
          { className: msg.ok ? 'dts-alert dts-alert-ok' : 'dts-alert dts-alert-err' },
          msg.text,
        )
      : null,
  )
}
