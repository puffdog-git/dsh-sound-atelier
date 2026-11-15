function CatalogPicker(props) {
  const t = props.t
  const [data, setData] = React.useState(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [refresh, setRefresh] = React.useState(0)
  const [search, setSearch] = React.useState('')
  const [language, setLanguage] = React.useState('')
  const [manual, setManual] = React.useState(false)
  React.useEffect(() => {
    setSearch('')
    setLanguage('')
    setManual(false)
  }, [props.provider])
  React.useEffect(() => {
    const controller = new AbortController()
    setData(null)
    setError('')
    if (!props.provider) {
      setLoading(false)
      return () => controller.abort()
    }
    setLoading(true)
    const query =
      '?provider=' +
      encodeURIComponent(props.provider) +
      '&model=' +
      encodeURIComponent(props.model || '') +
      (refresh ? '&refresh=1' : '')
    clientFetch('/dsh-sound-atelier/catalog' + query, { signal: controller.signal, timeoutMs: 14000, cache: 'no-store' })
      .then(async (res) => {
        const value = await res.json()
        if (!res.ok || !value.ok) throw new Error('catalog')
        return value
      })
      .then((value) => {
        if (!controller.signal.aborted) setData(Object.assign({}, value, { requestedModel: props.model || '' }))
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(t('catalog_unreachable'))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [props.provider, props.model, props.catalogEpoch, refresh])
  React.useEffect(() => {
    if (
      props.provider !== 'voai' ||
      !data ||
      data.provider !== props.provider ||
      data.requestedModel !== (props.model || '') ||
      props.autoSelect === false ||
      !props.writable
    )
      return
    const patch = {}
    if (!props.model && data.defaultModel) patch.model = data.defaultModel
    if (!props.voice && data.voices?.[0]) patch.voice = data.voices[0].id
    const voice = data.voices?.find((v) => v.id === (props.voice || patch.voice))
    if (!props.style && voice?.styles?.[0]) patch.style = voice.styles[0]
    if (Object.keys(patch).length) props.onChange(patch)
  }, [data, props.provider, props.model, props.voice, props.style, props.writable])
  const sourceLabel = (name) =>
    t(
      data?.sources?.[name] === 'live'
        ? 'catalogLive'
        : data?.sources?.[name] === 'mixed'
          ? 'catalogMixed'
          : 'catalogPreset',
    )
  const picker = (kind, value, items, filtered) => {
    const label = t(kind === 'models' ? 'catalogModel' : 'catalogVoice')
    return React.createElement(
      'label',
      { className: 'dts-catalog-field' },
      React.createElement(
        'span',
        { className: 'dts-catalog-label' },
        label,
        data ? React.createElement('small', null, sourceLabel(kind) + ' · ' + items.length) : null,
      ),
      manual
        ? React.createElement('input', {
            className: 'dts-input',
            'aria-label': label,
            value: value || '',
            disabled: !props.writable,
            onChange: (e) =>
              props.onChange(
                kind === 'models'
                  ? { model: e.target.value, voice: '', style: '' }
                  : { voice: e.target.value, style: '' },
              ),
          })
        : React.createElement(
            'select',
            {
              className: 'dts-input',
              'aria-label': label,
              value: value || '',
              disabled: !props.writable || loading || !props.provider,
              onChange: (e) =>
                props.onChange(
                  kind === 'models'
                    ? { model: e.target.value, voice: '', style: '' }
                    : { voice: e.target.value, style: '' },
                ),
            },
            React.createElement('option', { value: '' }, t('catalogDefault')),
            value && !items.some((v) => v.id === value)
              ? React.createElement('option', { value }, value + ' (' + t('catalogExisting') + ')')
              : null,
            (filtered || items).map((v) =>
              React.createElement(
                'option',
                { key: v.id, value: v.id },
                [v.name || v.id, v.language, v.gender].filter(Boolean).join(' · '),
              ),
            ),
            filtered && !filtered.length ? React.createElement('option', { disabled: true }, t('catalogEmpty')) : null,
          ),
    )
  }
  const voices = data?.voices || []
  const styles = voices.find((v) => v.id === props.voice)?.styles || []
  const langs = [...new Set(voices.map((v) => v.language).filter(Boolean))].sort()
  const filtered = voices.filter(
    (v) =>
      v.id === props.voice ||
      ((!language || v.language === language) &&
        [v.id, v.name, v.language, v.gender].join(' ').toLowerCase().includes(search.toLowerCase())),
  )
  return React.createElement(
    'div',
    { className: 'dts-catalog' },
    React.createElement(
      'div',
      { className: 'dts-catalog-grid' },
      picker('models', props.model, data?.models || []),
      picker('voices', props.voice, voices, filtered),
    ),
    props.provider === 'voai'
      ? React.createElement(
          'label',
          { className: 'dts-catalog-field' },
          t('voaiStyle'),
          React.createElement(
            'select',
            {
              className: 'dts-input',
              value: props.style || '',
              disabled: !props.writable || loading,
              onChange: (e) => props.onChange({ style: e.target.value }),
            },
            React.createElement('option', { value: '' }, t('catalogDefault')),
            props.style && !styles.includes(props.style)
              ? React.createElement('option', { value: props.style }, props.style + ' (' + t('catalogExisting') + ')')
              : null,
            styles.map((style) => React.createElement('option', { key: style, value: style }, style)),
          ),
        )
      : null,
    React.createElement(
      'div',
      { className: 'dts-catalog-tools' },
      React.createElement('input', {
        type: 'search',
        className: 'dts-input',
        'aria-label': t('catalogSearch'),
        placeholder: t('catalogSearch'),
        value: search,
        onChange: (e) => setSearch(e.target.value),
      }),
      langs.length > 1
        ? React.createElement(
            'select',
            {
              className: 'dts-input',
              value: language,
              'aria-label': t('catalogLanguage'),
              onChange: (e) => setLanguage(e.target.value),
            },
            React.createElement('option', { value: '' }, t('catalogLanguage')),
            langs.map((l) => React.createElement('option', { key: l, value: l }, l)),
          )
        : null,
      React.createElement(
        'button',
        {
          type: 'button',
          className: 'dts-btn',
          disabled: loading || !props.provider,
          onClick: () => setRefresh((v) => v + 1),
        },
        t('catalogRefresh'),
      ),
    ),
    React.createElement(
      'div',
      { className: 'dts-sub', role: 'status', 'aria-live': 'polite' },
      loading
        ? t('catalogLoading')
        : error ||
            [
              ...new Set(
                (data?.warnings || []).map(
                  (w) =>
                    t('catalog_' + w.code) +
                    (['text_to_speech', 'models_read', 'voices_read'].includes(w.permission)
                      ? ' (' + w.permission + ')'
                      : '') +
                    (w.status ? ' (HTTP ' + w.status + ')' : ''),
                ),
              ),
            ].join(' '),
    ),
    React.createElement(
      'label',
      { className: 'dts-sub dts-row' },
      React.createElement('input', {
        type: 'checkbox',
        checked: manual,
        disabled: !props.writable,
        onChange: (e) => setManual(e.target.checked),
      }),
      t('catalogManual'),
    ),
  )
}
