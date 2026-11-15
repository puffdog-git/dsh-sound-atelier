// 聲音工坊的輔助元件：音色試聽牆、本月用量、設定搜尋。

// 音色試聽牆：列出目前服務在所選語言的所有聲音，每個都能試聽與選用。
// 只在使用者展開時才向後端要清單；試聽會實際合成一句話（Edge 免費，其他服務可能計費）。
function VoiceWall({ provider, model, voice, language, writable, onPick, onPreview }) {
  const h = React.createElement
  const [open, setOpen] = React.useState(false)
  const [voices, setVoices] = React.useState(null)
  const [error, setError] = React.useState('')
  const [lang, setLang] = React.useState('')
  const [busy, setBusy] = React.useState('')
  const free = provider === 'edge'
  React.useEffect(() => {
    if (!open || !provider) return undefined
    const controller = new AbortController()
    setVoices(null)
    setError('')
    clientFetch(
      '/dsh-sound-atelier/catalog?provider=' + encodeURIComponent(provider) + '&model=' + encodeURIComponent(model || ''),
      { signal: controller.signal, timeoutMs: 14000, cache: 'no-store' },
    )
      .then((r) => r.json())
      .then((d) => {
        if (controller.signal.aborted) return
        if (!d.ok) throw Error('catalog')
        setVoices(d.voices || [])
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setVoices([])
          setError('讀取聲音清單失敗，請稍後再試。')
        }
      })
    return () => controller.abort()
  }, [open, provider, model])
  const languages = [...new Set((voices || []).map((v) => v.language).filter(Boolean))].sort()
  // 預設顯示與目前設定語言相符的聲音（例如 zh-TW）；沒有相符的就顯示全部。
  const wanted = String(language || 'zh-TW').toLowerCase()
  const guess =
    languages.find((l) => l.toLowerCase() === wanted) ||
    languages.find((l) => l.toLowerCase().startsWith(wanted.slice(0, 2))) ||
    ''
  const active = lang === '*' ? '' : lang || guess
  const shown = (voices || []).filter((v) => !active || v.language === active).slice(0, 60)
  const sample = /^ja/i.test(active) ? 'こんにちは、これは音声のサンプルです。' : /^en/i.test(active) ? 'Hello, this is a voice sample.' : '你好，這是這個聲音的試聽。'
  const preview = async (v) => {
    if (busy) return
    setBusy(v.id)
    setError('')
    try {
      await onPreview(v.id, sample)
    } catch (e) {
      setError('試聽失敗：' + String(e?.message || e))
    } finally {
      setBusy('')
    }
  }
  return h(
    'details',
    { className: 'dts-block', 'data-dsh-tts-voice-wall': '1', onToggle: (e) => setOpen(e.currentTarget.open) },
    h('summary', null, h('strong', null, '音色試聽牆'), '　展開後可以逐一試聽、選用這個服務的聲音'),
    h(
      'div',
      { className: 'dts-sub' },
      free
        ? '列出這個服務的所有聲音，可以一個一個試聽再選用。Edge 是免金鑰的線上語音，試聽不收費。'
        : '列出這個服務的所有聲音，可以一個一個試聽再選用。每次試聽都會實際合成一句話，可能使用額度。',
    ),
    !open
      ? null
      : voices === null
        ? h('div', { className: 'dts-sub', role: 'status' }, '讀取聲音清單…')
        : h(
            React.Fragment,
            null,
            languages.length > 1
              ? h(
                  'label',
                  { className: 'dts-field' },
                  '語言',
                  h(
                    'select',
                    { className: 'dts-input', 'aria-label': '試聽牆語言', value: active || '*', onChange: (e) => setLang(e.target.value) },
                    h('option', { value: '*' }, '全部語言'),
                    languages.map((l) => h('option', { key: l, value: l }, l)),
                  ),
                )
              : null,
            shown.length
              ? h(
                  'div',
                  { className: 'dts-voice-wall' },
                  shown.map((v) =>
                    h(
                      'div',
                      { className: 'dts-voice-card', key: v.id, 'data-selected': v.id === voice ? 'true' : 'false' },
                      h(
                        'div',
                        { className: 'dts-voice-name', title: v.id },
                        v.name || v.id,
                        h('small', null, [v.language, v.gender].filter(Boolean).join(' · ')),
                      ),
                      h(
                        'button',
                        { type: 'button', className: 'dts-btn', disabled: !!busy, 'aria-label': '試聽 ' + (v.name || v.id), onClick: () => preview(v) },
                        busy === v.id ? '合成中…' : '▶ 試聽',
                      ),
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'dts-btn',
                          disabled: !writable || v.id === voice,
                          'aria-label': '選用 ' + (v.name || v.id),
                          onClick: () => onPick(v.id),
                        },
                        v.id === voice ? '使用中' : '選用',
                      ),
                    ),
                  ),
                )
              : h('div', { className: 'dts-sub' }, error || '這個服務沒有提供聲音清單，請在上方直接填入聲音名稱。'),
            (voices || []).filter((v) => !active || v.language === active).length > shown.length
              ? h('div', { className: 'dts-sub' }, '只顯示前 60 個；請用語言篩選縮小範圍。')
              : null,
          ),
    error && voices?.length ? h('div', { className: 'dts-sub dts-bad', role: 'alert' }, error) : null,
  )
}

// 本月用量：各服務送出的字元數。這是本插件自己的統計，不是服務商帳單，也不是金額。
function UsagePanel() {
  const h = React.createElement
  const [data, setData] = React.useState(null)
  const [error, setError] = React.useState('')
  const load = () => {
    setError('')
    clientFetch('/dsh-sound-atelier/usage', { cache: 'no-store', timeoutMs: 8000 })
      .then((r) => r.json())
      .then((d) => {
        if (!d || d.ok === false) throw Error(d?.error?.message || '讀取失敗')
        setData(d)
      })
      .catch((e) => setError(String(e?.message || e)))
  }
  React.useEffect(load, [])
  const rows = Object.values((data?.months || {})[data?.month] || {}).sort((a, b) => b.submittedCharacters - a.submittedCharacters)
  const number = (n) => Number(n || 0).toLocaleString('zh-TW')
  return h(
    'div',
    { className: 'dts-block', 'data-dsh-tts-usage': '1' },
    h('div', { className: 'dts-h' }, '本月用量估算' + (data?.month ? '（' + data.month + '）' : '')),
    h(
      'div',
      { className: 'dts-sub' },
      '各服務這個月送出合成的字元數。只統計這個插件送出的請求，快取命中不計；這不是金額，也不能取代服務商帳單。實際費用請用字元數對照服務商的價目表。',
    ),
    error
      ? h('div', { className: 'dts-sub dts-bad', role: 'alert' }, '讀取用量失敗：' + error)
      : data === null
        ? h('div', { className: 'dts-sub', role: 'status' }, '讀取中…')
        : rows.length
          ? h(
              'table',
              { className: 'dts-usage-table' },
              h('thead', null, h('tr', null, ['服務', '送出字元', '成功字元', '請求數'].map((n) => h('th', { key: n }, n)))),
              h(
                'tbody',
                null,
                rows.map((row) =>
                  h(
                    'tr',
                    { key: row.provider + ':' + row.tier },
                    h('td', null, row.provider + (row.tier && row.tier !== 'all' ? '（' + row.tier + '）' : '')),
                    h('td', null, number(row.submittedCharacters)),
                    h('td', null, number(row.successfulCharacters)),
                    h('td', null, number(row.requests)),
                  ),
                ),
              ),
            )
          : h('div', { className: 'dts-sub' }, '這個月還沒有送出合成請求。'),
    h('button', { type: 'button', className: 'dts-link', onClick: load }, '重新整理用量'),
  )
}

// 設定搜尋：在四個分頁的欄位標題中找關鍵字，點結果會切到該分頁、展開所在區塊並捲到欄位。
// rootRef 指向整個設定區；pages 是 [[id, 名稱]]。
function SettingsSearch({ rootRef, pages, onGo }) {
  const h = React.createElement
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState([])
  React.useEffect(() => {
    const needle = query.trim().toLowerCase()
    const root = rootRef.current
    if (!needle || !root || typeof root.querySelectorAll !== 'function') {
      setResults([])
      return
    }
    const names = new Map(pages)
    const seen = new Set()
    const found = []
    for (const el of root.querySelectorAll(
      '[data-dts-page] label.dts-field, [data-dts-page] label.dts-catalog-field, [data-dts-page] label.dts-block, [data-dts-page] .dts-toggle-row, [data-dts-page] .dts-h, [data-dts-page] summary',
    )) {
      // 只取元素自己的標題文字（第一段），不含底下整塊說明。
      const own = [...el.childNodes].find((node) => node.nodeType === 3 && node.textContent.trim())
      const label = String(own ? own.textContent : el.querySelector('strong')?.textContent || el.textContent || '')
        .trim()
        .slice(0, 60)
      const full = String(el.textContent || '').toLowerCase()
      if (!label || !full.includes(needle)) continue
      const page = el.closest('[data-dts-page]')?.getAttribute('data-dts-page')
      const key = page + ':' + label
      if (seen.has(key)) continue
      seen.add(key)
      found.push({ key, label, page, pageName: names.get(page) || page, el })
      if (found.length >= 12) break
    }
    setResults(found)
  }, [query])
  const go = (row) => {
    onGo(row.page)
    // 等分頁切換完成後再展開與捲動。
    setTimeout(() => {
      for (let node = row.el; node; node = node.parentElement) if (node.tagName === 'DETAILS') node.open = true
      row.el.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
      row.el.classList?.add('dts-search-hit')
      setTimeout(() => row.el.classList?.remove('dts-search-hit'), 2200)
    }, 60)
  }
  return h(
    'div',
    { className: 'dts-search', 'data-dsh-tts-search': '1' },
    h('input', {
      type: 'search',
      className: 'dts-input',
      'aria-label': '搜尋設定',
      placeholder: '搜尋設定（例如：快取、語速、提示音）',
      value: query,
      onChange: (e) => setQuery(e.target.value),
    }),
    query.trim()
      ? results.length
        ? h(
            'div',
            { className: 'dts-search-results', role: 'list' },
            results.map((row) =>
              h(
                'button',
                { key: row.key, type: 'button', className: 'dts-btn', role: 'listitem', onClick: () => go(row) },
                row.label,
                h('small', null, row.pageName),
              ),
            ),
          )
        : h('div', { className: 'dts-sub', role: 'status' }, '找不到符合的設定，請換個關鍵字。')
      : null,
  )
}
