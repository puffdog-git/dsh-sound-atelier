function VoicePacksGrid(props) {
  const t = props.t || ((key) => key)
  // 預設依目前主要音色或語言選擇口音。
  const guess = /zh-CN|cmn-CN|zh-Hans/i.test(String(props.currentVoice || '') + ' ' + String(props.language || ''))
    ? 'zh-CN'
    : 'zh-TW'
  const [region, setRegion] = React.useState(guess)
  const onSelect = (pack) => {
    if (!props.writable) return
    props.onApply({
      entry: { provider: pack.provider, model: '', voice: pack.voices[region] },
      rate: pack.rate,
      chime: pack.chime,
      language: region,
    })
  }
  return React.createElement(
    'div',
    { className: 'dts-block', 'data-dsh-tts-packs': '1' },
    React.createElement('div', { className: 'dts-h' }, t('voicePacksTitle')),
    React.createElement(
      'div',
      { className: 'dts-sub' },
      t('voicePacksHint'),
      ' 皆為免金鑰的 Edge 中文音色。套用後只更換主要服務的音色、語速與提示音，備援順序保留；按「' +
        t('save') +
        '」才生效。',
    ),
    React.createElement(
      'div',
      { className: 'dts-row', role: 'group', 'aria-label': '音色口音' },
      VOICE_PACK_REGIONS.map(([id, label]) =>
        React.createElement(
          'button',
          {
            key: id,
            type: 'button',
            className: 'dts-btn',
            'aria-pressed': region === id,
            onClick: () => setRegion(id),
          },
          label,
        ),
      ),
    ),
    React.createElement(
      'div',
      { className: 'dts-row', style: { flexWrap: 'wrap', gap: '8px', marginTop: '6px' } },
      VOICE_PACKS.map((pack) =>
        React.createElement(
          'button',
          {
            key: pack.id,
            type: 'button',
            className: 'dts-btn',
            'aria-pressed': props.currentVoice === pack.voices[region] && Number(props.currentRate) === pack.rate,
            disabled: !props.writable,
            onClick: () => onSelect(pack),
            title: pack.voices[region] + ' (' + pack.provider + ')',
          },
          t('pack_' + pack.id) !== 'pack_' + pack.id ? t('pack_' + pack.id) : pack.name,
        ),
      ),
    ),
  )
}

function EventChimesEditor(props) {
  const t = props.t || ((key) => key)
  const value = props.value || {}
  const setChime = (event, chime) => {
    props.onChange(Object.assign({}, value, { [event]: chime }))
  }
  const events = ['onTurnComplete', 'onApprovalRequired', 'onError', 'onSubagentStart', 'onSubagentDone']
  const chimes = ['ding', 'beep', 'pop', 'subtle', 'none']
  return React.createElement(
    'div',
    { className: 'dts-block' },
    React.createElement('div', { className: 'dts-h' }, t('eventChimesTitle')),
    React.createElement('div', { className: 'dts-sub' }, t('eventChimesHint')),
    events.map((ev) =>
      React.createElement(
        'div',
        { className: 'dts-row', key: ev, style: { justifyContent: 'space-between', margin: '4px 0' } },
        React.createElement('span', { style: { fontSize: '13px' } }, t(ev) || ev),
        React.createElement(
          'select',
          {
            className: 'dts-input',
            style: { width: '120px' },
            value:
              value[ev] ||
              (ev === 'onError' || ev === 'onSubagentStart' ? 'none' : ev === 'onApprovalRequired' ? 'pop' : 'ding'),
            disabled: !props.writable,
            onChange: (e) => setChime(ev, e.target.value),
          },
          chimes.map((c) => React.createElement('option', { key: c, value: c }, c)),
        ),
      ),
    ),
  )
}

// Synthesis stats panel: live host counters.
function StatsPanel(props) {
  const t = props.t || ((key) => key)
  const [data, setData] = React.useState(null)
  const loadStats = () => {
    clientFetch('/dsh-sound-atelier/stats', { cache: 'no-store', timeoutMs: 8000 })
      .then((r) => r.json())
      .then(setData)
      .catch((err) => console.warn('[dsh-tts] loadStats failed:', err))
  }
  React.useEffect(() => {
    loadStats()
  }, [])
  const reset = () => {
    clientFetch('/dsh-sound-atelier/stats', { method: 'DELETE', timeoutMs: 8000 })
      .then(loadStats)
      .catch((err) => console.warn('[dsh-tts] resetStats failed:', err))
  }
  return React.createElement(
    'div',
    { className: 'dts-block' },
    React.createElement(
      'span',
      { className: 'dts-sub' },
      data
        ? t('statTotal') +
            ': ' +
            data.total +
            ' · ' +
            t('statHits') +
            ': ' +
            data.cacheHits +
            ' · ' +
            t('statErrors') +
            ': ' +
            data.errors
        : t('loading'),
    ),
    data &&
      Object.keys(data.providers || {}).map((p) =>
        React.createElement(
          'span',
          { className: 'dts-sub', key: p },
          p + ': ' + data.providers[p].n + ' / ' + data.providers[p].ms + 'ms',
        ),
      ),
    React.createElement('button', { type: 'button', className: 'dts-link', onClick: reset }, t('statReset')),
  )
}

// Plugin-settings tab card follows the shared card pattern: li in the core list,
// theme-reset header, body with a divider. Chevron is ours; core does not provide it.
