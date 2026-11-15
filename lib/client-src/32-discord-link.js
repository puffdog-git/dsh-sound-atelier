// 「語音交付」頁的 Discord 賽博群友連線卡。
//
// 只讀取 Discord 賽博群友自己公開的狀態接口來顯示，聲音工坊的後端不需要知道它的存在。
// 沒有安裝該插件時接口不存在，卡片顯示「沒有偵測到」。
function DiscordLinkCard({ active }) {
  const h = React.createElement
  const [state, setState] = React.useState({ kind: 'loading' })
  const alive = React.useRef(true)
  const load = React.useCallback(async () => {
    setState((previous) => ({ ...previous, kind: 'loading' }))
    try {
      // 先用目前的路徑；找不到時再試改名前的路徑（舊版 Discord 賽博群友）。
      let response = await clientFetch('/api/discord-cyberfriend/voice', { cache: 'no-store', timeoutMs: 8000, credentials: 'same-origin' })
      if (response.status === 404)
        response = await clientFetch('/api/discord-pyself-lab/voice', { cache: 'no-store', timeoutMs: 8000, credentials: 'same-origin' })
      if (response.status === 404) {
        if (alive.current) setState({ kind: 'absent' })
        return
      }
      const data = await response.json()
      if (!response.ok || !data || data.ok === false) throw Error(data?.error || 'HTTP ' + response.status)
      if (alive.current) setState({ kind: 'ready', data })
    } catch (error) {
      if (alive.current) setState({ kind: 'error', error: String(error?.message || error) })
    }
  }, [])
  React.useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  // 切到「語音交付」頁時才讀取，不在背景輪詢。
  React.useEffect(() => {
    if (active) load()
  }, [active, load])

  const row = (label, value, tone) =>
    h(
      'div',
      { className: 'dts-link-row' },
      h('span', { className: 'dts-link-label' }, label),
      h('span', { className: 'dts-badge' + (tone === 'ok' ? ' dts-badge-on' : tone === 'warn' ? ' dts-badge-warn' : tone === 'bad' ? ' dts-badge-bad' : '') }, value),
    )
  const here = typeof window !== 'undefined' && window.location ? window.location.origin : ''
  const portOf = (origin) => {
    try {
      const url = new URL(origin)
      return url.port || (url.protocol === 'https:' ? '443' : '80')
    } catch {
      return ''
    }
  }
  let body
  if (state.kind === 'loading' && !state.data) body = h('div', { className: 'dts-sub', role: 'status' }, '正在偵測 Discord 賽博群友…')
  else if (state.kind === 'absent')
    body = h(
      'div',
      { className: 'dts-sub', 'data-discord-link': 'absent' },
      '沒有偵測到 Discord 賽博群友。它是聲音工坊的姊妹插件（套件名稱 dsh-discord-cyberfriend）；裝好並啟用後，會自動用這裡的聲音在 Discord 語音房說話、或回覆語音訊息。',
    )
  else if (state.kind === 'error')
    body = h('div', { className: 'dts-sub dts-bad', role: 'alert', 'data-discord-link': 'error' }, '讀取 Discord 賽博群友的狀態失敗：' + state.error)
  else {
    const data = state.data || {}
    const tts = data.tts || null
    const link = tts?.link || null
    const usesStudio = tts?.serviceId === 'dshTts' || /dsh-tts/.test(String(tts?.provider || ''))
    const rooms = Array.isArray(data.sessions) ? data.sessions.filter((s) => s && s.connected !== false).length : 0
    const rows = [row('偵測結果', '已偵測到 Discord 賽博群友', 'ok')]
    if (!tts) rows.push(row('使用的語音服務', '尚未偵測到語音服務，請到 Discord 賽博群友按「檢查語音環境」', 'warn'))
    else {
      rows.push(
        row(
          '使用的語音服務',
          usesStudio ? 'DSH 聲音工坊（就是這裡）' : (tts.name || tts.provider || '其他語音服務') + '（不是聲音工坊）',
          usesStudio ? 'ok' : 'warn',
        ),
      )
      if (link?.mode === 'service') rows.push(row('連線方式', '直接使用 DSH 內的服務，不經過網路連接埠', 'ok'))
      else if (link?.mode === 'http') {
        const same = Boolean(link.origin && here && link.origin === here)
        rows.push(
          row(
            '連線方式',
            link.origin ? 'HTTP：' + link.origin + '（連接埠 ' + portOf(link.origin) + '）' : 'HTTP：尚未連上任何位址',
            link.origin ? (same ? 'ok' : 'warn') : 'bad',
          ),
        )
        if (link.origin)
          rows.push(
            row(
              '連接埠是否對上',
              same ? '對上了：與目前 DSH 的位址相同（連接埠 ' + portOf(here) + '）' : '沒有對上：目前 DSH 在 ' + here,
              same ? 'ok' : 'bad',
            ),
          )
      }
      rows.push(row('語音服務狀態', tts.ready ? '可以合成' : tts.unavailableReason || '尚未就緒', tts.ready ? 'ok' : 'bad'))
    }
    rows.push(row('Discord 語音輸出', data.enabled ? '已開啟' : '未開啟（在 Discord 賽博群友的「語音」頁開啟）', data.enabled ? 'ok' : ''))
    rows.push(row('目前連線的語音房', rooms ? rooms + ' 個' : '沒有', rooms ? 'ok' : ''))
    body = h(
      'div',
      { 'data-discord-link': tts?.ready && usesStudio ? 'ok' : 'attention' },
      rows,
      tts && link?.mode === 'http' && link.origin && here && link.origin !== here
        ? h(
            'div',
            { className: 'dts-sub dts-bad', role: 'alert' },
            'Discord 賽博群友設定的語音 API 位址與目前的 DSH 不同。DSH 每次啟動連接埠可能改變；請到 Discord 賽博群友的「語音」頁把「TTS API 位址」清空，讓它自動使用目前的位址。',
          )
        : null,
      tts && !usesStudio
        ? h(
            'div',
            { className: 'dts-sub' },
            '想改用聲音工坊：到 Discord 賽博群友的「語音」頁，把「使用哪套語音服務」改成「DSH 聲音工坊」。',
          )
        : null,
    )
  }
  return h(
    'section',
    { className: 'dts-block', 'aria-label': 'Discord 賽博群友連線狀態', 'data-dsh-tts-discord-link': state.kind },
    h(
      'div',
      { className: 'dts-row', style: { justifyContent: 'space-between' } },
      h('div', { className: 'dts-h' }, 'Discord 賽博群友'),
      h('button', { type: 'button', className: 'dts-btn', disabled: state.kind === 'loading', onClick: load }, state.kind === 'loading' ? '偵測中…' : '重新偵測'),
    ),
    h('div', { className: 'dts-sub' }, '確認 Discord 賽博群友有沒有接上這個聲音工坊，以及兩邊的連線位址是否一致。'),
    body,
  )
}
