// 模組層級的翻譯函式：內容不依賴元件狀態，放在元件外才不會每次重繪都換一個新函式
//（子元件以它作為 effect 依賴，例如更新檢查）。
const sectionText = (key) => zh[key] ?? key

function TtsSection(props) {
  const t = sectionText
  const [page, setPage] = React.useState('source')
  const [sourceMode, setSourceMode] = React.useState(null)
  const [draft, setDraft] = React.useState(null)
  const [credentials, setCredentials] = React.useState({})
  const [keyDrafts, setKeyDrafts] = React.useState({})
  const [saved, setSaved] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [catalogEpoch, setCatalogEpoch] = React.useState(0)
  const [referenceAssets, setReferenceAssets] = React.useState([])
  const [err, setErr] = React.useState('')
  // 快速開始的試聽狀態：idle | busy | done
  const [startState, setStartState] = React.useState('idle')
  // 上次載入或儲存成功時的設定內容，用來判斷是否有尚未儲存的變更。
  const savedSnapshot = React.useRef('')
  // 狀態徽章只在「進階設定」顯示，因此只在該分頁時輪詢。
  const pageRef = React.useRef(page)
  pageRef.current = page
  const [telemetry, setTelemetry] = React.useState({
    online: true,
    cacheHits: 0,
    sseOk: true,
    total: 0,
    sseClients: 0,
    breaker: [],
    provider: '',
    queue: 0,
  })
  const [advancedOpen, setAdvancedOpen] = React.useState(() => {
    try {
      return localStorage.getItem('dsh-tts/advancedOpen') === '1'
    } catch {
      /* localStorage unavailable */ return false
    }
  })
  const autoplay = useAutoplayGate()
  const rootRef = React.useRef(null)

  const ctx = props && props.ctx
  const scope = React.useMemo(() => {
    const s = (ctx && ctx.get && ctx.get('lanSettings')) || (ctx && ctx.configForms)
    if (!s || !s.get) return null
    try {
      return s.get(NS)
    } catch (_) {
      /* settings scope binding failed */
      return null
    }
  }, [ctx])

  const subscribe = React.useMemo(() => {
    return (cb) => {
      if (!scope || !scope.subscribe) return () => {}
      try {
        return scope.subscribe(cb) || (() => {})
      } catch (_) {
        /* settings scope binding failed */
        return () => {}
      }
    }
  }, [scope])

  const getSnapshot = React.useCallback(() => {
    if (!scope || !scope.getSnapshot) return SNAPSHOT_LOADING
    try {
      return scope.getSnapshot() || SNAPSHOT_LOADING
    } catch (_) {
      /* settings scope binding failed */
      return SNAPSHOT_LOADING
    }
  }, [scope])

  const snap =
    (React.useSyncExternalStore
      ? React.useSyncExternalStore(
          subscribe,
          getSnapshot,
          React.useCallback(() => SNAPSHOT_LOADING, []),
        )
      : null) || (scope && scope.getSnapshot ? scope.getSnapshot() : SNAPSHOT_LOADING)

  // Snapshot status matters more than the value:
  //   loading     — host has not answered yet;
  //   unavailable — host answered but the settings namespace is not ready;
  //   ready       — values are present.
  // On unavailable, writable defaults true; without a status check the card
  // looks like a working empty form.
  // Snapshot status contract (#163):
  // Without valid scope, or when loading/unavailable, editing is disabled.
  const [revision, setRevision] = React.useState(null)
  const ready = !!scope && !!snap && snap.status === 'ready'
  const writable = ready && snap.writable !== false && !saving

  const applyPayload = (data) => {
    const cfg = data && data.config ? data.config : {}
    setDraft(JSON.parse(JSON.stringify(cfg)))
    savedSnapshot.current = JSON.stringify(cfg)
    setSourceMode(
      ['local-tts', 'kokoro', 'f5', 'piper', 'espeak', 'cosyvoice'].includes(cfg.chain?.[0]?.provider)
        ? 'local'
        : 'online',
    )
    setCredentials(data && data.credentials ? data.credentials : {})
    if (data && data.revision !== undefined) setRevision(data.revision)
    player.enabled = !!cfg.speakReplies
    statusKnown = true
    refreshStatusSoon()
  }

  React.useEffect(() => {
    let alive = true
    clientFetch('/dsh-sound-atelier/config', { cache: 'no-store', timeoutMs: 8000 })
      .then((res) => res.json())
      .then((data) => {
        if (!alive) return
        applyPayload(data)
      })
      .catch((e) => {
        if (alive) setErr(String(e && e.message ? e.message : e))
      })

    const loadTelemetry = () => {
      clientFetch('/dsh-sound-atelier/stats', { cache: 'no-store', timeoutMs: 8000 })
        .then((res) => res.json())
        .then((st) => {
          if (!alive || !st) return
          setTelemetry((prev) =>
            Object.assign({}, prev, {
              cacheHits: st.cacheHits || 0,
              total: st.total || 0,
              online: true,
              breaker: st.breaker || prev.breaker || [],
            }),
          )
        })
        .catch(() => {
          if (alive) setTelemetry((prev) => Object.assign({}, prev, { online: false }))
        })
      clientFetch('/dsh-sound-atelier/status', { cache: 'no-store', timeoutMs: 8000 })
        .then((res) => res.json())
        .then((st) => {
          if (!alive || !st) return
          setTelemetry((prev) =>
            Object.assign({}, prev, {
              sseClients: st.sseClients || 0,
              sseOk: (st.sseClients || 0) >= 0,
              provider: (player.audio && player.provider) || (player.queue[0] && player.queue[0].provider) || '',
              queue: player.queue.length,
            }),
          )
        })
        .catch(() => {})
    }
    loadTelemetry()
    const telTimer = setInterval(() => {
      if (pageRef.current === 'advanced' && !document.hidden) loadTelemetry()
    }, 3000)
    // interval cleaned by effect return below

    return () => {
      alive = false
      clearInterval(telTimer)
    }
  }, [])

  if (err && !draft) {
    return React.createElement(
      'div',
      { className: 'dts-wrap dts-warn' },
      React.createElement('span', null, (t('errorLoading') || 'Error loading settings: ') + err),
    )
  }
  if (!draft)
    return React.createElement(
      'div',
      { className: 'dts-wrap' },
      React.createElement(
        'div',
        { className: 'dts-state', role: 'status' },
        React.createElement('span', { className: 'dts-spinner', 'aria-hidden': true }),
        t('loading'),
      ),
    )

  const setTop = (key, v) => setDraft((d) => Object.assign({}, d || {}, { [key]: v }))
  const hasUnsaved =
    JSON.stringify(draft) !== savedSnapshot.current ||
    Object.values(keyDrafts || {}).some((value) => String(value || '').trim())
  const setDraftKey = (provider, value) => setKeyDrafts((d) => Object.assign({}, d, { [provider]: value }))

  const commitKey = async (provider, raw) => {
    const value = String(raw != null ? raw : (keyDrafts && keyDrafts[provider]) || '').trim()
    if (!value) return
    setErr('')
    const res = await clientFetch('/dsh-sound-atelier/credential', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: provider, value: value }),
      timeoutMs: 10000,
    })
    const data = await res.json().catch(() => ({/* parse error */}))
    if (!res.ok) throw new Error((data && data.error && data.error.message) || 'HTTP ' + res.status)
    if (data && data.credentials) setCredentials(data.credentials)
    setKeyDrafts((d) => Object.assign({}, d, { [provider]: '' }))
    setCatalogEpoch((v) => v + 1)
  }

  const clearKey = async (provider) => {
    setErr('')
    try {
      const res = await clientFetch('/dsh-sound-atelier/credential', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: provider }),
        timeoutMs: 10000,
      })
      const data = await res.json().catch(() => ({/* parse error */}))
      if (!res.ok) throw new Error((data && data.error && data.error.message) || 'HTTP ' + res.status)
      if (data && data.credentials) setCredentials(data.credentials)
      setKeyDrafts((d) => Object.assign({}, d, { [provider]: '' }))
      setCatalogEpoch((v) => v + 1)
    } catch (e) {
      setErr(String(e && e.message ? e.message : e))
    }
  }

  // extra：這次儲存要一併寫入的值（例如一鍵開啟自動朗讀）；一般按鈕呼叫時不帶。
  const save = async (extra) => {
    const override = extra && typeof extra === 'object' && !('target' in extra) ? extra : null
    setErr('')
    setSaved(false)
    if (!draft || saving) return
    setSaving(true)
    try {
      const keys = {}
      Object.keys(keyDrafts || {}).forEach((p) => {
        const v = String(keyDrafts[p] || '').trim()
        if (v) keys[p] = v
      })
      const bodyPayload = Object.assign({}, draft, override, { keys: keys })
      if (revision !== null && revision !== undefined) {
        bodyPayload.revision = revision
      }
      const res = await clientFetch('/dsh-sound-atelier/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
        timeoutMs: 10000,
      })
      const data = await res.json().catch(() => ({/* parse error */}))
      if (!res.ok) throw new Error((data && data.error && data.error.message) || 'HTTP ' + res.status)
      applyPayload(data)
      setKeyDrafts({})
      setCatalogEpoch((v) => v + 1)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setErr(String(e && e.message ? e.message : e))
    } finally {
      setSaving(false)
    }
  }

  const onCommitKey = (provider, raw) => {
    commitKey(provider, raw).catch((e) => setErr(String(e && e.message ? e.message : e)))
  }

  const clearCacheNow = async () => {
    setErr('')
    const res = await clientFetch('/dsh-sound-atelier/cache', { method: 'DELETE', timeoutMs: 10000 })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }
  const onClearCache = () => {
    if (typeof window !== 'undefined' && window.confirm) {
      if (!window.confirm(t('confirmClearCache'))) return
    }
    clearCacheNow().catch((e) => setErr(String(e && e.message ? e.message : e)))
  }

  const onPreview = (provider, model, voice, text, tuning) => {
    return previewSpeech(
      provider,
      model,
      voice,
      text,
      Object.assign(
        {
          rate: draft.rate,
          pitch: draft.pitch,
          volume: draft.volume,
          instruction:
            provider === 'doubao'
              ? draft.doubaoInstruction
              : provider === 'mimo'
                ? draft.mimoInstruction
                : draft.speechInstruction,
          voiceDesign: provider === 'deepinfra' ? draft.deepinfraVoiceDesign : draft.mimoVoiceDesign,
          voaiPitch: draft.voaiPitch,
          doubaoPitch: draft.doubaoPitch,
          styleWeight: draft.styleWeight,
          breathPause: draft.breathPause,
        },
        tuning,
      ),
    ).catch((e) => setErr(String(e && e.message ? e.message : e)))
  }

  const onPreviewPhrase = (phrase) => {
    if (!phrase) return
    const first = draft && draft.chain && draft.chain[0]
    onPreview((first && first.provider) || 'kokoro', (first && first.model) || '', (first && first.voice) || '', phrase)
  }

  const boolField = (key, label, hint, disabled = false) =>
    React.createElement(
      'label',
      { className: 'dts-field' },
      label,
      React.createElement('input', {
        type: 'checkbox',
        checked: !!(draft && draft[key]),
        disabled: !writable || !!disabled,
        onChange: (e) => setTop(key, e.target.checked),
      }),
      React.createElement('span', { className: 'dts-sub' }, hint),
    )

  const numberField = (key, label, hint, step) =>
    React.createElement(
      'label',
      { className: 'dts-field' },
      label,
      React.createElement('input', {
        type: 'number',
        step: step || 1,
        className: 'dts-input',
        value: draft && draft[key] !== undefined ? draft[key] : '',
        disabled: !writable,
        onChange: (e) => setTop(key, Number(e.target.value)),
      }),
      React.createElement('span', { className: 'dts-sub' }, hint),
    )

  // suggestions：可從清單挑選，也可自行輸入清單以外的值。
  const textField = (key, label, hint, suggestions) =>
    React.createElement(
      'label',
      { className: 'dts-field' },
      label,
      React.createElement('input', {
        className: 'dts-input',
        value: draft && draft[key] !== undefined ? draft[key] : '',
        disabled: !writable,
        list: suggestions ? 'dts-suggest-' + key : undefined,
        onChange: (e) => setTop(key, e.target.value),
      }),
      suggestions
        ? React.createElement(
            'datalist',
            { id: 'dts-suggest-' + key },
            suggestions.map((item) => React.createElement('option', { key: item, value: item })),
          )
        : null,
      React.createElement('span', { className: 'dts-sub' }, hint),
    )

  const selectField = (key, label, options, fallback, hint) =>
    React.createElement(
      'label',
      { className: 'dts-field' },
      label,
      React.createElement(
        'select',
        {
          className: 'dts-input',
          'aria-label': label,
          value: draft[key] || fallback,
          disabled: !writable,
          onChange: (e) => setTop(key, e.target.value),
        },
        options.map(([id, name]) => React.createElement('option', { key: id, value: id }, name)),
      ),
      React.createElement('span', { className: 'dts-sub' }, hint),
    )
  let synthesisOptions = {},
    optionsValid = true
  try {
    synthesisOptions = JSON.parse(draft.providerOptions || '{}')
    if (!synthesisOptions || Array.isArray(synthesisOptions) || typeof synthesisOptions !== 'object') throw Error()
  } catch {
    optionsValid = false
    synthesisOptions = {}
  }
  const setProviderOption = (provider, key, value) => {
    if (
      !optionsValid ||
      (synthesisOptions[provider] &&
        (Array.isArray(synthesisOptions[provider]) || typeof synthesisOptions[provider] !== 'object'))
    ) {
      setErr('請先修正進階合成設定的 JSON 格式。')
      return
    }
    const options = { ...synthesisOptions[provider] }
    if (value === '') delete options[key]
    else options[key] = value
    setTop('providerOptions', JSON.stringify({ ...synthesisOptions, [provider]: options }))
  }

  const autoplayBanner = autoplay.blocked
    ? React.createElement(
        'div',
        { className: 'dts-unlock' },
        React.createElement('span', null, t('autoplayBlocked')),
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'dts-unlock-btn',
            onClick: () => player.unlockAudio && player.unlockAudio(),
          },
          t('enableSound'),
        ),
      )
    : null
  const breakerBadges = (telemetry.breaker || [])
    .filter((b) => b && b.open)
    .slice(0, 2)
    .map((b) =>
      React.createElement('span', { key: b.id, className: 'dts-badge dts-badge-bad' }, t('breakerOpen') + ': ' + b.id),
    )
  const telemetryBadges = React.createElement(
    'div',
    { className: 'dts-row', style: { marginBottom: '8px' }, 'data-dsh-tts-telemetry': '1' },
    React.createElement(
      'span',
      {
        className: 'dts-badge ' + (telemetry.online ? 'dts-badge-on' : 'dts-badge-bad'),
      },
      telemetry.online ? t('statusOnline') : t('statusOffline'),
    ),
    React.createElement(
      'span',
      {
        className: 'dts-badge ' + (telemetry.sseClients > 0 ? 'dts-badge-on' : ''),
      },
      t('sseState') + ': ' + (telemetry.sseClients || 0),
    ),
    React.createElement(
      'span',
      { className: 'dts-badge' },
      t('queueLen') + ': ' + (telemetry.queue || player.queue.length || 0),
    ),
    telemetry.provider
      ? React.createElement('span', { className: 'dts-badge' }, t('activeProvider') + ': ' + telemetry.provider)
      : null,
    React.createElement(
      'span',
      { className: 'dts-badge' },
      t('cacheStats') + ': ' + telemetry.cacheHits + ' / ' + telemetry.total,
    ),
    ...breakerBadges,
  )
  const titleLine =
    props && props.compact
      ? null
      : React.createElement(
          'div',
          { className: 'dts-header dts-studio-head' },
          React.createElement('div', { className: 'dts-page-sub' }, t('studioSubtitle')),
          React.createElement(
            'div',
            { className: 'dts-studio-status' },
            '目前聲音：',
            draft.chain?.[0]?.provider ? providerLabel(t, draft.chain[0].provider) : '—',
            ' · ',
            draft.chain?.[0]?.voice || t('catalogDefault'),
          ),
        )
  return React.createElement(
    'div',
    { className: 'dts-wrap', ref: rootRef },
    autoplayBanner,
    React.createElement(
      'div',
      { className: 'dts-block' },
      titleLine,
      draft.speakReplies
        ? null
        : React.createElement(
            'div',
            { className: 'dts-start', role: 'group', 'aria-label': '快速開始', 'data-dsh-tts-start': '1' },
            React.createElement('strong', null, '快速開始'),
            React.createElement(
              'ol',
              { className: 'dts-start-steps' },
              React.createElement(
                'li',
                { 'data-done': startState === 'done' ? 'true' : 'false' },
                React.createElement(
                  'div',
                  null,
                  React.createElement('b', null, '先聽聽看'),
                  React.createElement(
                    'span',
                    null,
                    '用目前的聲音唸一句話。預設是免金鑰的 Edge 線上語音，不需要任何設定。',
                  ),
                ),
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    className: 'dts-btn',
                    disabled: startState === 'busy',
                    onClick: () => {
                      const first = draft.chain?.[0] || {}
                      setStartState('busy')
                      setErr('')
                      previewSpeech(
                        first.provider || 'edge',
                        first.model || '',
                        first.voice || '',
                        '你好，這是目前選擇的聲音。',
                        {
                          rate: draft.rate,
                          pitch: draft.pitch,
                          volume: draft.volume,
                        },
                      ).then(
                        () => setStartState('done'),
                        (e) => {
                          setStartState('idle')
                          setErr('試聽失敗：' + String(e && e.message ? e.message : e))
                        },
                      )
                    },
                  },
                  startState === 'busy' ? '合成中…' : startState === 'done' ? '再試聽一次' : '試聽一句',
                ),
              ),
              React.createElement(
                'li',
                { 'data-done': 'false' },
                React.createElement(
                  'div',
                  null,
                  React.createElement('b', null, '或者一次完成'),
                  React.createElement('span', null, '先試聽一句；聽得到聲音就直接開啟自動朗讀並儲存，不必再按下方的儲存。'),
                ),
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    className: 'dts-save',
                    'data-dsh-tts-oneclick': '1',
                    disabled: !writable || startState === 'busy',
                    onClick: () => {
                      const first = draft.chain?.[0] || {}
                      setStartState('busy')
                      setErr('')
                      previewSpeech(first.provider || 'edge', first.model || '', first.voice || '', '你好，之後我會把回覆唸給你聽。', {
                        rate: draft.rate,
                        pitch: draft.pitch,
                        volume: draft.volume,
                      }).then(
                        () => {
                          setStartState('done')
                          return save({ speakReplies: true })
                        },
                        (e) => {
                          setStartState('idle')
                          setErr('試聽失敗，沒有開啟自動朗讀：' + String(e && e.message ? e.message : e))
                        },
                      )
                    },
                  },
                  startState === 'busy' ? '合成中…' : '試聽並開啟自動朗讀',
                ),
              ),
              React.createElement(
                'li',
                { 'data-done': 'false' },
                React.createElement(
                  'div',
                  null,
                  React.createElement('b', null, '開啟自動朗讀'),
                  React.createElement(
                    'span',
                    null,
                    '開啟後按頁面下方的「' + t('save') + '」，之後 AI 的每則回覆都會自動唸出來。',
                  ),
                ),
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    className: 'dts-btn',
                    disabled: !writable,
                    onClick: () => setTop('speakReplies', true),
                  },
                  '開啟自動朗讀',
                ),
              ),
            ),
          ),
      React.createElement(
        'div',
        { className: 'dts-toggle-list' },
        [
          [
            'speakReplies',
            'studioAuto',
            'AI 回覆完成後自動唸出來。語音在本機服務合成、在這個瀏覽器播放，不會回傳給模型。',
          ],
          ['speakAsItGoes', 'studioStream', '回覆還在產生時就開始唸，等待時間較短。'],
          ['announceApproval', 'studioAlerts', '需要你批准操作時，用語音提醒。'],
        ].map(([key, label, hint]) =>
          React.createElement(
            'div',
            { key, className: 'dts-toggle-row' },
            React.createElement(
              'div',
              null,
              React.createElement('strong', null, t(label)),
              React.createElement('small', null, hint),
            ),
            React.createElement('button', {
              type: 'button',
              role: 'switch',
              className: 'dts-switch',
              'aria-checked': !!draft[key],
              'aria-label': t(label),
              disabled: !writable,
              onClick: () => setTop(key, !draft[key]),
            }),
          ),
        ),
      ),
    ),
    React.createElement(SettingsSearch, {
      rootRef,
      pages: [
        ['source', '語音來源'],
        ['voices', '聲音管理'],
        ['persona', '人格與語言'],
        ['advanced', '進階設定'],
      ],
      onGo: (id) => {
        setPage(id)
        if (id === 'advanced') setAdvancedOpen(true)
      },
    }),
    React.createElement(
      'nav',
      { className: 'dts-studio-nav', 'aria-label': '語音設定分頁' },
      [
        ['source', '語音來源'],
        ['voices', '聲音管理'],
        ['persona', '人格與語言'],
        ['advanced', '進階設定'],
      ].map(([id, label]) =>
        React.createElement(
          'button',
          { key: id, type: 'button', 'aria-current': page === id ? 'page' : undefined, onClick: () => setPage(id) },
          label,
        ),
      ),
    ),
    React.createElement(
      'section',
      { hidden: page !== 'persona', 'data-dts-page': 'persona' },
      React.createElement(VoiceProfilePanel, { draft, writable, setTop }),
    ),
    React.createElement(
      'section',
      { hidden: page !== 'source', className: 'dts-studio-page', 'data-dts-page': 'source' },
      React.createElement(
        'div',
        { className: 'dts-source-choices' },
        [
          ['online', '線上語音服務', '免安裝模型，依服務商收費；Edge 可免金鑰。'],
          ['local', '本機部署', '模型由本機或區域網路服務執行，需準備運算資源。'],
        ].map(([id, title, hint]) =>
          React.createElement(
            'button',
            {
              type: 'button',
              key: id,
              'aria-pressed': sourceMode === id,
              disabled: !writable,
              onClick: () => {
                setSourceMode(id)
                const local = ['local-tts', 'kokoro', 'f5', 'piper', 'espeak', 'cosyvoice']
                if (local.includes(draft.chain?.[0]?.provider) !== (id === 'local'))
                  setTop('chain', [
                    {
                      provider: id === 'local' ? 'local-tts' : 'edge',
                      voice: id === 'local' ? '' : 'zh-TW-HsiaoChenNeural',
                      model: '',
                    },
                    ...(draft.chain || []).slice(1),
                  ])
              },
            },
            React.createElement('strong', null, title),
            React.createElement('span', null, hint),
          ),
        ),
      ),
      sourceMode === 'local'
        ? React.createElement(
            'p',
            { className: 'dts-sub' },
            '先到「聲音管理」安裝或連線推理服務，再回這裡選模型、參考錄音與試聽。切換分類只替換主要服務列；降級列可混用線上與本機。',
          )
        : null,
      React.createElement(
        'div',
        { className: 'dts-block' },
        React.createElement('div', { className: 'dts-h' }, '服務順序與備援'),
        React.createElement('div', { className: 'dts-sub' }, t('catalogHint')),
        React.createElement(ChainEditor, {
          sourceMode,
          referenceAssets,
          catalogEpoch,
          breaker: telemetry.breaker,
          t: t,
          value: draft && draft.chain ? draft.chain : [],
          writable: writable,
          credentials: credentials,
          keyDrafts: keyDrafts,
          onChange: (v) => setTop('chain', v),
          onDraft: setDraftKey,
          onCommitKey: onCommitKey,
          onClearKey: clearKey,
          onPreview: onPreview,
        }),
      ),
      draft.chain?.[0]?.provider
        ? React.createElement(VoiceWall, {
            key: 'wall-' + draft.chain[0].provider,
            provider: draft.chain[0].provider,
            model: draft.chain[0].model || '',
            voice: draft.chain[0].voice || '',
            language: draft.language,
            writable,
            onPick: (id) => setTop('chain', [{ ...draft.chain[0], voice: id, style: '' }, ...draft.chain.slice(1)]),
            onPreview: (id, text) =>
              previewSpeech(draft.chain[0].provider, draft.chain[0].model || '', id, text, {
                rate: draft.rate,
                pitch: draft.pitch,
                volume: draft.volume,
                baseUrl: draft.chain[0].baseUrl,
                keyEnv: draft.chain[0].keyEnv,
                options: draft.chain[0].options,
              }),
          })
        : null,
      React.createElement(TuningBar, {
        t,
        provider: draft.chain?.[0]?.provider || '',
        model: draft.chain?.[0]?.model || '',
        cosyvoiceMode: draft.cosyvoiceMode || 'sft',
        value: {
          rate: draft.rate ?? 1,
          pitch: draft.pitch ?? 0,
          volume: draft.volume ?? 1,
          instruction:
            (draft.chain?.[0]?.provider === 'doubao'
              ? draft.doubaoInstruction
              : draft.chain?.[0]?.provider === 'mimo'
                ? draft.mimoInstruction
                : draft.speechInstruction) || '',
          voiceDesign:
            (draft.chain?.[0]?.provider === 'deepinfra' ? draft.deepinfraVoiceDesign : draft.mimoVoiceDesign) || '',
          voaiPitch: draft.voaiPitch ?? 0,
          doubaoPitch: draft.doubaoPitch ?? 0,
          styleWeight: draft.styleWeight ?? 0.5,
          breathPause: draft.breathPause ?? 0,
        },
        writable,
        onChange: (patch) =>
          setDraft((d) => {
            const next = { ...patch }
            if ('instruction' in next) {
              next[
                d.chain?.[0]?.provider === 'doubao'
                  ? 'doubaoInstruction'
                  : d.chain?.[0]?.provider === 'mimo'
                    ? 'mimoInstruction'
                    : 'speechInstruction'
              ] = next.instruction
              delete next.instruction
            }
            if ('voiceDesign' in next) {
              next[d.chain?.[0]?.provider === 'deepinfra' ? 'deepinfraVoiceDesign' : 'mimoVoiceDesign'] =
                next.voiceDesign
              delete next.voiceDesign
            }
            return Object.assign({}, d, next)
          }),
        onPreview: (text, tuning) =>
          previewSpeech(
            draft.chain?.[0]?.provider || '',
            draft.chain?.[0]?.model || '',
            draft.chain?.[0]?.voice || '',
            text,
            {
              ...tuning,
              style: draft.chain?.[0]?.style,
              baseUrl: draft.chain?.[0]?.baseUrl,
              keyEnv: draft.chain?.[0]?.keyEnv,
              options: draft.chain?.[0]?.options,
              referenceAsset: draft.chain?.[0]?.referenceAsset,
            },
          ),
      }),
      React.createElement(ProviderCapabilitiesPanel, { draft, setTop, writable, referenceAssets }),
      draft.chain?.[0]?.provider === 'openai' && /^gpt-realtime(?:-|$)/.test(draft.chain?.[0]?.model || '')
        ? React.createElement(
            'div',
            { className: 'dts-sub' },
            'Realtime 使用獨立 WebSocket 合成，回傳 WAV；會核對逐字稿，若改寫或漏讀便拒絕音訊。合成輸出格式請留空或選 wav，速度請用語氣提示或播放速度。',
          )
        : null,
      draft.chain?.some((row) => row.provider === 'dashscope')
        ? React.createElement(
            'div',
            { className: 'dts-block' },
            React.createElement('div', { className: 'dts-h' }, 'DashScope 百煉設定'),
            selectField(
              'dashscopeRegion',
              'DashScope 地域',
              [
                ['cn-beijing', '北京'],
                ['ap-southeast-1', '新加坡'],
              ],
              'cn-beijing',
              'API Key 與業務空間 ID 必須屬於同一地域；儲存後再試聽。',
            ),
            textField(
              'dashscopeWorkspace',
              'DashScope 業務空間 ID',
              '填入百煉控制檯的業務空間 ID，不是 API Key。此接入使用工作區專屬原生 HTTP TTS。',
            ),
          )
        : null,
      draft.chain?.[0]?.provider === 'doubao' && draft.chain[0].model !== 'seed-tts-1.0'
        ? React.createElement(
            'div',
            { className: 'dts-block' },
            React.createElement('div', { className: 'dts-h' }, '豆包 2.0 串流設定'),
            React.createElement(
              'label',
              { className: 'dts-field' },
              '豆包傳輸方式',
              React.createElement(
                'select',
                {
                  className: 'dts-input',
                  'aria-label': '豆包傳輸方式',
                  value: synthesisOptions.doubao?.transport || 'http',
                  disabled: !writable || !optionsValid,
                  onChange: (e) => setProviderOption('doubao', 'transport', e.target.value),
                },
                React.createElement('option', { value: 'http' }, 'HTTP 單向串流'),
                React.createElement('option', { value: 'websocket' }, 'WebSocket 雙向串流'),
              ),
            ),
            React.createElement(
              'label',
              { className: 'dts-row' },
              React.createElement('input', {
                type: 'checkbox',
                style: { width: 'auto', flex: '0 0 auto' },
                'aria-label': '豆包字詞時間戳',
                checked: !!synthesisOptions.doubao?.timestamps,
                disabled: !writable || !optionsValid,
                onChange: (e) => setProviderOption('doubao', 'timestamps', e.target.checked),
              }),
              '回傳字詞時間戳',
            ),
            React.createElement(
              'div',
              { className: 'dts-sub' },
              '開啟邊生成邊朗讀並選 WebSocket，宿主後續文字會送進同一條合成連線；聊天播放器仍等待這次合成完成再播放。外部整合可透過 /live 讀取即時 PCM。完整匯出會合併可用時間戳；目前反白仍以句子為主，服務未回傳時不推測。',
            ),
          )
        : null,
      draft.chain?.some((row) => row.provider === 'polly')
        ? React.createElement(
            'div',
            { className: 'dts-block' },
            React.createElement('div', { className: 'dts-h' }, 'Amazon Polly 設定'),
            textField(
              'pollyRegion',
              'Polly AWS Region',
              '例如 us-east-1 或 ap-northeast-1。使用上方 AWS 憑證 JSON 欄位，請勿把 secretAccessKey 填在一般設定。儲存後重新偵測音色。',
            ),
          )
        : null,
      ['fish', 'cartesia', 'dashscope', 'polly', 'inworld', 'google-cloud'].includes(draft.chain?.[0]?.provider)
        ? React.createElement(
            'div',
            { className: 'dts-block' },
            React.createElement('div', { className: 'dts-h' }, '服務補充設定'),
            draft.chain[0].provider === 'fish'
              ? React.createElement(
                  'div',
                  { className: 'dts-sub' },
                  '可選既有聲音模型 ID，或在上方填參考錄音與逐字稿。參考錄音會隨合成傳送，不會建立永久音色。S2 使用方括號語氣提示。',
                )
              : null,
            draft.chain[0].provider === 'cartesia'
              ? React.createElement(
                  React.Fragment,
                  null,
                  React.createElement(
                    'label',
                    { className: 'dts-field' },
                    'Cartesia 合成語言',
                    React.createElement('input', {
                      className: 'dts-input',
                      'aria-label': 'Cartesia 合成語言',
                      placeholder: '留空依文字語言；英文填 en',
                      value: synthesisOptions.cartesia?.language || '',
                      disabled: !writable || !optionsValid,
                      onChange: (e) => setProviderOption('cartesia', 'language', e.target.value),
                    }),
                  ),
                  React.createElement(
                    'label',
                    { className: 'dts-field' },
                    'Cartesia 情感（僅英文）',
                    React.createElement(
                      'select',
                      {
                        className: 'dts-input',
                        'aria-label': 'Cartesia 情感（僅英文）',
                        value: synthesisOptions.cartesia?.emotion || '',
                        disabled: !writable || !optionsValid,
                        onChange: (e) => setProviderOption('cartesia', 'emotion', e.target.value),
                      },
                      [
                        ['', '依正文判斷'],
                        ['happy', '開心'],
                        ['excited', '亢奮'],
                        ['calm', '平靜'],
                        ['sad', '傷心'],
                        ['angry', '生氣'],
                        ['scared', '害怕'],
                      ].map(([id, name]) => React.createElement('option', { key: id, value: id }, name)),
                    ),
                  ),
                )
              : null,
            draft.chain[0].provider === 'google-cloud'
              ? React.createElement(
                  'div',
                  { className: 'dts-sub' },
                  '一般模型由音色 ID 決定；Gemini TTS 請另選模型與預建音色。Chirp 3 HD／Gemini 可選串流；SSML、mark、ADC、自訂發音與雙人對話見上方模型進階能力。',
                )
              : null,
            draft.chain[0].provider === 'polly'
              ? React.createElement(
                  'div',
                  { className: 'dts-sub' },
                  '模型欄位代表合成引擎；請確認音色支援該引擎。支援明確 SSML、詞典與 Speech Marks；generative 可使用雙向串流，不支援 Speech Marks。',
                )
              : null,
          )
        : null,
      draft.chain?.[0]?.provider === 'mimo' && draft.chain?.[0]?.model === 'mimo-v2.5-tts-voiceclone'
        ? React.createElement(
            'div',
            { className: 'dts-block' },
            React.createElement('div', { className: 'dts-h' }, 'MiMo 參考聲音'),
            textField(
              'mimoReferencePath',
              'MiMo 參考錄音路徑',
              '本機 WAV／MP3 絕對路徑；含 Base64 字首後不超過 10 MB，約為 7.5 MB 原始音訊。合成時上傳至設定的 MiMo 服務，儲存後再試聽。',
            ),
          )
        : null,
      draft.chain?.some((row) => row.provider === 'siliconflow')
        ? React.createElement(
            'div',
            { className: 'dts-block' },
            React.createElement('div', { className: 'dts-h' }, 'SiliconFlow 參考聲音'),
            selectField(
              'siliconflowVoiceMode',
              'SiliconFlow 聲線來源',
              [
                ['preset', '選擇的音色／既有音色 ID'],
                ['reference', '本機參考錄音'],
              ],
              'preset',
              '參考錄音模式目前支援 CosyVoice2，會取代音色選單的選擇。儲存後再試聽。',
            ),
            draft.siliconflowVoiceMode === 'reference'
              ? React.createElement(
                  React.Fragment,
                  null,
                  textField(
                    'siliconflowReferencePath',
                    'SiliconFlow 參考 WAV 路徑',
                    '本機 PCM WAV 絕對路徑，少於 30 秒；建議 8–10 秒清楚的單人錄音。合成時錄音與逐字稿會傳至 SiliconFlow；本插件限制編碼後 10 MB。',
                  ),
                  textField(
                    'siliconflowReferenceText',
                    'SiliconFlow 參考逐字稿',
                    '逐字填入參考錄音說出的內容，最多 2000 字。',
                  ),
                )
              : null,
          )
        : null,
      draft.chain?.[0]?.provider === 'minimax'
        ? React.createElement(
            'div',
            { className: 'dts-block' },
            React.createElement('div', { className: 'dts-h' }, 'MiniMax 合成設定'),
            selectField(
              'minimaxTransport',
              'MiniMax 連線方式',
              [
                ['auto', '自動：有 API Key 用 HTTP，否則用 CLI'],
                ['http', '原生 HTTP API'],
                ['cli', '既有 mmx CLI'],
              ],
              'auto',
              'HTTP 失敗不會自動改用 CLI，避免重複合成。儲存後再試聽。',
            ),
            React.createElement(
              'label',
              { className: 'dts-field' },
              'MiniMax 情緒',
              React.createElement(
                'select',
                {
                  className: 'dts-input',
                  'aria-label': 'MiniMax 情緒',
                  disabled: !writable || !optionsValid,
                  value: synthesisOptions.minimax?.emotion || '',
                  onChange: (e) => setProviderOption('minimax', 'emotion', e.target.value),
                },
                [
                  ['', '依文字自動判斷'],
                  ['happy', '開心'],
                  ['sad', '傷心'],
                  ['angry', '生氣'],
                  ['fearful', '害怕'],
                  ['disgusted', '厭惡'],
                  ['surprised', '驚訝'],
                  ['calm', '平靜'],
                  ['fluent', '流暢（僅 2.6）'],
                  ['whisper', '耳語（僅 2.6）'],
                ].map(([id, label]) => React.createElement('option', { key: id, value: id }, label)),
              ),
              React.createElement(
                'span',
                { className: 'dts-sub' },
                '情緒與進階合成參數需要 HTTP 模式；2.8 不支援耳語。',
              ),
            ),
          )
        : null,
      draft.chain?.[0]?.provider === 'cosyvoice'
        ? React.createElement(
            'div',
            { className: 'dts-block' },
            React.createElement('div', { className: 'dts-h' }, 'CosyVoice 服務設定'),
            textField('cosyvoiceUrl', 'CosyVoice 服務網址', '需要已啟動的外部推理服務。儲存後再試聽。'),
            selectField(
              'cosyvoiceApiMode',
              'CosyVoice API',
              [
                ['auto', '自動辨識官方服務／相容橋接'],
                ['official', '官方 FastAPI'],
                ['bridge', 'JSON /tts 橋接'],
              ],
              'auto',
              '只有官方 SFT 端點不存在時才嘗試橋接。',
            ),
            selectField(
              'cosyvoiceMode',
              'CosyVoice 合成模式',
              [
                ['sft', '內建音色 SFT'],
                ['instruct', '音色＋語氣指令'],
                ['instruct2', '參考聲音＋語氣指令（2／3）'],
                ['zero-shot', '參考聲音＋逐字稿'],
                ['cross-lingual', '跨語言參考聲音'],
              ],
              'sft',
              '可用模式取決於服務載入的模型；不會自動下載大型模型。',
            ),
            numberField(
              'cosyvoiceSampleRate',
              'CosyVoice 輸出取樣率',
              '必須與服務模型的實際 PCM 輸出一致，常見為 24000 Hz。',
              1000,
            ),
            ['instruct2', 'zero-shot', 'cross-lingual'].includes(draft.cosyvoiceMode)
              ? textField(
                  'cosyvoiceReferencePath',
                  'CosyVoice 參考 WAV 路徑',
                  '本機絕對路徑，10 MiB 以下的 PCM WAV；合成時傳給指定服務。',
                )
              : null,
            draft.cosyvoiceMode === 'zero-shot'
              ? textField('cosyvoiceReferenceText', 'CosyVoice 參考逐字稿', '逐字填入參考錄音說出的內容。')
              : null,
          )
        : null,
      React.createElement('div', { className: 'dts-sub' }, t('catalogSavedEndpoint')),
      ...['openaiBaseUrl', 'customBaseUrl', 'voaiBaseUrl', 'azureRegion']
        .filter(
          (key) =>
            ({ openaiBaseUrl: 'openai', customBaseUrl: 'custom', voaiBaseUrl: 'voai', azureRegion: 'azure' })[key] &&
            draft.chain?.some(
              (row) =>
                row.provider ===
                { openaiBaseUrl: 'openai', customBaseUrl: 'custom', voaiBaseUrl: 'voai', azureRegion: 'azure' }[key],
            ),
        )
        .map((key) =>
          React.createElement(
            'div',
            { key },
            textField(key, t(key), t(key === 'azureRegion' ? 'azureHint' : key + 'Hint')),
          ),
        ),
    ),
    React.createElement(
      'section',
      { hidden: page !== 'voices', className: 'dts-studio-page', 'data-dts-page': 'voices' },
      React.createElement(LocalEnginesEditor, {
        active: page === 'voices',
        onAssets: setReferenceAssets,
        t: t,
        writable: writable,
        draft: draft,
        boolField: boolField,
        setTop: setTop,
      }),
      React.createElement(CloudVoicesEditor, { draft, writable, referenceAssets, setTop }),
    ),
    React.createElement(
      'section',
      { hidden: page !== 'advanced', className: 'dts-studio-page', 'data-dts-page': 'advanced' },
      telemetryBadges,
      React.createElement(
        'details',
        { className: 'dts-block dts-extras' },
        React.createElement('summary', { className: 'dts-h' }, t('catalogExtras')),
        React.createElement(
          'div',
          { className: 'dts-block' },
          React.createElement('div', { className: 'dts-h' }, t('pronTitle')),
          boolField('enableItDictionary', t('enableItDictionary'), t('enableItDictionaryHint')),
          React.createElement(PronEditor, {
            t: t,
            writable: writable,
            value: draft && draft.pronunciation ? draft.pronunciation : [],
            onChange: (v) => setTop('pronunciation', v),
            onPreviewPhrase: onPreviewPhrase,
          }),
        ),
        React.createElement(
          'div',
          { className: 'dts-block' },
          React.createElement('div', { className: 'dts-h' }, t('rolesTitle')),
          boolField('autoDetectSubagent', t('autoDetectSubagent'), '子代理有設定專屬聲音時，自動改用該聲音朗讀它的回覆。'),
          React.createElement(RolesEditor, {
            cosyvoiceMode: draft.cosyvoiceMode || 'sft',
            catalogEpoch,
            defaultProvider: draft?.chain?.[0]?.provider || '',
            defaultModel: draft?.chain?.[0]?.model || '',
            defaultVoice: draft?.chain?.[0]?.voice || '',
            defaultStyle: draft?.chain?.[0]?.style || '',
            tuning: {
              rate: draft.rate ?? 1,
              pitch: draft.pitch ?? 0,
              volume: draft.volume ?? 1,
              instruction:
                (draft.chain?.[0]?.provider === 'doubao'
                  ? draft.doubaoInstruction
                  : draft.chain?.[0]?.provider === 'mimo'
                    ? draft.mimoInstruction
                    : draft.speechInstruction) || '',
              voiceDesign:
                (draft.chain?.[0]?.provider === 'deepinfra' ? draft.deepinfraVoiceDesign : draft.mimoVoiceDesign) || '',
              voaiPitch: draft.voaiPitch ?? 0,
              doubaoPitch: draft.doubaoPitch ?? 0,
              styleWeight: draft.styleWeight ?? 0.5,
              breathPause: draft.breathPause ?? 0,
            },
            t: t,
            writable: writable,
            onPreview: onPreview,
            value: draft && draft.roles ? draft.roles : {},
            onChange: (v) => setTop('roles', v),
          }),
        ),
        React.createElement(EventChimesEditor, {
          t: t,
          writable: writable,
          value: draft && draft.eventChimes ? draft.eventChimes : {},
          onChange: (v) => setTop('eventChimes', v),
        }),
        React.createElement(VoicePacksGrid, {
          t: t,
          writable: writable,
          currentVoice: draft.chain?.[0]?.voice,
          currentRate: draft.rate,
          language: draft.language,
          // 只更換主要服務，保留其後的備援順序。
          onApply: (patch) => {
            if (patch.entry) setTop('chain', [patch.entry, ...(draft.chain || []).slice(1)])
            if (patch.rate) setTop('rate', patch.rate)
            if (patch.chime) setTop('chime', patch.chime)
            if (patch.language) setTop('language', patch.language)
          },
        }),
        React.createElement(
          'div',
          { className: 'dts-block' },
          React.createElement('div', { className: 'dts-h' }, t('statsTitle')),
          React.createElement(StatsPanel, { t: t }),
          React.createElement(UsagePanel),
        ),
        React.createElement(PluginUpdaterBlock, { t: t }),
      ),
      React.createElement(
        'details',
        { className: 'dts-block dts-extras' },
        React.createElement('summary', { className: 'dts-h' }, t('general')),
        React.createElement('div', { className: 'dts-group-title' }, '播放與打斷'),
        boolField('bargeIn', t('bargeIn'), t('bargeInHint')),
        boolField('vadBargeIn', t('vadBargeIn'), t('vadBargeInHint') + '（需先開啟上方的打斷功能）'),
        React.createElement(
          'label',
          { className: 'dts-field' },
          t('duckOnTyping'),
          React.createElement(
            'select',
            {
              className: 'dts-input',
              value: (draft && draft.duckOnTyping) || 'duck',
              disabled: !writable,
              onChange: (e) => setTop('duckOnTyping', e.target.value),
            },
            ['duck', 'pause', 'stop', 'off'].map((mode) =>
              React.createElement(
                'option',
                { key: mode, value: mode },
                t('duckOnTyping' + mode.charAt(0).toUpperCase() + mode.slice(1)) || mode,
              ),
            ),
          ),
          React.createElement('span', { className: 'dts-sub' }, t('duckOnTypingHint')),
        ),
        React.createElement('div', { className: 'dts-group-title' }, '朗讀內容過濾'),
        boolField('skipCode', t('skipCode'), t('skipCodeHint')),
        boolField('skipTables', t('skipTables'), t('skipTablesHint')),
        boolField('cleanUrls', t('cleanUrls'), t('cleanUrlsHint')),
        boolField('keepInlineCode', t('keepInlineCode'), t('keepInlineCodeHint')),
        boolField('adaptiveRate', t('adaptiveRate'), t('adaptiveRateHint')),
        boolField('tldrDefault', t('tldrDefault'), t('tldrDefaultHint')),
        React.createElement('div', { className: 'dts-group-title' }, '快取'),
        boolField('cache', t('cache'), t('cacheHint')),
        numberField('cacheMaxMb', t('cacheMaxMb'), t('cacheMaxMbHint'), 10),
        React.createElement(
          'label',
          { className: 'dts-field' },
          t('longReply'),
          React.createElement(
            'select',
            {
              className: 'dts-input',
              value: (draft && draft.longReply) || 'truncate',
              disabled: !writable,
              onChange: (e) => setTop('longReply', e.target.value),
            },
            ['truncate', 'summarize', 'full'].map((mode) =>
              React.createElement(
                'option',
                { key: mode, value: mode },
                t('longReply' + mode.charAt(0).toUpperCase() + mode.slice(1)) || mode,
              ),
            ),
          ),
          React.createElement('span', { className: 'dts-sub' }, t('longReplyHint')),
        ),
        React.createElement('div', { className: 'dts-group-title' }, '摘要與旁白'),
        textField('summaryModel', t('summaryModel'), t('summaryModelHint')),
        numberField('summarySentences', t('summarySentences'), t('summarySentencesHint'), 1),
        boolField('autoDetect', t('autoDetect'), t('autoDetectHint')),
        boolField('narrateQuotesOnly', t('narrateQuotesOnly'), t('narrateQuotesHint')),
        boolField('skipActions', t('skipActions'), t('skipActionsHint')),
        textField('removeRegex', t('removeRegex'), t('removeRegexHint')),
        React.createElement('div', { className: 'dts-group-title' }, '提醒用語與語言'),
        textField('approvalText', t('approvalText'), t('approvalHint')),
        textField('questionText', t('questionText'), t('questionHint')),
        selectField(
          'chime',
          t('chime'),
          [
            ['ding', 'ding（叮）'],
            ['beep', 'beep（嗶嗶）'],
            ['pop', 'pop（短促）'],
            ['subtle', 'subtle（輕柔）'],
            ['none', '無'],
          ],
          'ding',
          '朗讀提醒前播放的短音。',
        ),
        textField('language', t('language'), t('languageHint'), ['zh-TW', 'zh-CN', 'en', 'ja', 'ko']),
        React.createElement('div', { className: 'dts-group-title' }, '路徑與執行檔（一般不需要修改）'),
        textField('customKeyEnv', t('customKeyEnv'), t('customKeyEnvHint')),
        textField('piperModel', t('piperModel'), t('piperModelHint')),
        textField('piperBin', t('piperBin'), t('binHint')),
        textField('espeakBin', t('espeakBin'), t('espeakHint')),
        textField('edgeBin', t('edgeBin'), t('edgeHint')),
      ),
      React.createElement(
        'div',
        { className: 'dts-block' },
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'dts-head',
            'aria-expanded': advancedOpen,
            onClick: () => {
              setAdvancedOpen((v) => {
                const next = !v
                try {
                  localStorage.setItem('dsh-tts/advancedOpen', next ? '1' : '0')
                } catch {
                  /* private mode */
                }
                return next
              })
            },
          },
          React.createElement(
            'div',
            { className: 'dts-headText' },
            React.createElement('div', { className: 'dts-title' }, t('advancedTitle')),
            React.createElement('div', { className: 'dts-sub' }, t('advancedHint')),
          ),
        ),
        advancedOpen
          ? React.createElement(
              'div',
              { className: 'dts-body' },
              numberField('maxChars', t('maxChars'), t('maxCharsHint'), 100),
              numberField('sentenceChars', t('sentenceChars'), t('sentenceCharsHint'), 20),
              numberField('timeoutMs', t('timeoutMs'), t('timeoutMsHint'), 1000),
              numberField('maxQueue', t('maxQueue'), t('maxQueueHint'), 1),
              textField(
                'deepinfraBaseUrl',
                'DeepInfra API 網址',
                '預設 https://api.deepinfra.com/v1/openai；Qwen 模型會使用對應原生 inference 路徑。',
              ),
              textField('mimoBaseUrl', t('mimoBaseUrl'), t('mimoBaseUrlHint')),
              textField('mimoFormat', t('mimoFormat'), t('mimoFormatHint'), ['mp3', 'wav']),
              textField('minimaxBaseUrl', 'MiniMax API 網址', '預設 https://api.minimax.io/v1；按帳號所屬區域設定。'),
              textField('minimaxBin', t('minimaxBin'), t('minimaxBinHint')),
              textField(
                'providerOptions',
                '進階合成設定（JSON）',
                '只填合成參數。例如 {"deepgram":{"expressivity":1,"speed":1.05},"elevenlabs":{"stability":0.5}}。與播放速度分開；留 {} 沿用服務商預設。',
              ),
              textField('doubaoAppId', t('doubaoAppId'), t('doubaoAppIdHint')),
              textField('doubaoCluster', t('doubaoCluster'), t('doubaoClusterHint')),
              textField('doubaoBaseUrl', t('doubaoBaseUrl'), t('doubaoAutoEndpoint')),
              textField('deepseekWebBaseUrl', t('deepseekWebBaseUrl'), t('deepseekWebBaseUrlHint')),
            )
          : null,
      ),
    ),
    React.createElement(
      'div',
      // 只有在有未儲存的變更時才固定在底部，平常留在頁面最下方，不遮住內容。
      { className: 'dts-foot', 'data-dirty': hasUnsaved ? 'true' : 'false' },
      hasUnsaved
        ? React.createElement('span', { className: 'dts-foot-note', role: 'status' }, '有尚未儲存的變更')
        : null,
      React.createElement(
        'button',
        { type: 'button', className: 'dts-link', disabled: !writable, onClick: onClearCache },
        t('clearCache'),
      ),
      React.createElement(
        'button',
        { type: 'button', className: 'dts-save', disabled: !writable, onClick: save },
        t(saving ? 'catalogSaving' : 'save'),
      ),
      saved ? React.createElement('span', { className: 'dts-ok', role: 'status' }, t('catalogSaved')) : null,
      err ? React.createElement('span', { className: 'dts-bad', role: 'alert' }, err) : null,
    ),
  )
}
