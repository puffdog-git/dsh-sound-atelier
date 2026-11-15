const CLIENT_IT_TERMS = [
  { from: 'API', to: 'A P I', whole: true, lang: '' },
  { from: 'CLI', to: 'C L I', whole: true, lang: '' },
  { from: 'CPU', to: 'C P U', whole: true, lang: '' },
  { from: 'GPU', to: 'G P U', whole: true, lang: '' },
  { from: 'RAM', to: 'ram', whole: true, lang: '' },
  { from: 'SQL', to: 'sequel', whole: true, lang: '' },
  { from: 'UI', to: 'U I', whole: true, lang: '' },
  { from: 'URL', to: 'U R L', whole: true, lang: '' },
  { from: 'UUID', to: 'U U I D', whole: true, lang: '' },
  { from: 'JSON', to: 'j-son', whole: true, lang: '' },
  { from: 'YAML', to: 'yam-el', whole: true, lang: '' },
  { from: 'HTML', to: 'H T M L', whole: true, lang: '' },
  { from: 'CSS', to: 'C S S', whole: true, lang: '' },
  { from: 'SSH', to: 'S S H', whole: true, lang: '' },
  { from: 'DNS', to: 'D N S', whole: true, lang: '' },
  { from: 'IP', to: 'I P', whole: true, lang: '' },
]

// Pronunciation dictionary editor: rules apply top-down.
function PronEditor(props) {
  const t = props.t || ((key) => key)
  const rows = Array.isArray(props.value) ? props.value : []
  const fileInputRef = React.useRef(null)

  const change = (i, patch) => {
    props.onChange(rows.map((r, k) => (k === i ? Object.assign({}, r, patch) : r)))
  }
  const remove = (i) => props.onChange(rows.filter((_, k) => k !== i))
  const add = () => props.onChange(rows.concat([{ from: '', to: '', whole: false, lang: '' }]))
  const loadIt = () => {
    const existing = new Set(rows.map((r) => String(r.from).toLowerCase()))
    const toAdd = CLIENT_IT_TERMS.filter((r) => !existing.has(String(r.from).toLowerCase()))
    props.onChange(rows.concat(toAdd))
  }

  const exportJson = () => {
    const data = JSON.stringify(rows, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'pronunciation-dictionary.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url)
      } catch (alreadyRevoked) {
        /* already revoked */
      }
    }, 1000)
  }

  const triggerImport = () => {
    if (fileInputRef.current) fileInputRef.current.click()
  }

  const handleImportFile = (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result)
        if (!Array.isArray(parsed)) {
          if (typeof window !== 'undefined' && window.alert) window.alert(t('invalidJsonFormat'))
          return
        }
        const importedRules = parsed
          .map((item) => ({
            from: String(item.from || ''),
            to: String(item.to || ''),
            whole: !!item.whole,
            lang: String(item.lang || ''),
          }))
          .filter((r) => r.from || r.to)

        const existingKeys = new Set(rows.map((r) => String(r.from).toLowerCase()))
        const newItems = importedRules.filter((r) => !existingKeys.has(String(r.from).toLowerCase()))
        props.onChange(rows.concat(newItems))
      } catch (err) {
        if (typeof window !== 'undefined' && window.alert) window.alert(t('invalidJsonFormat'))
      }
      e.target.value = ''
    }
    reader.readAsText(file)
  }

  return React.createElement(
    'div',
    { className: 'dts-wrap-in' },
    React.createElement('input', {
      type: 'file',
      ref: fileInputRef,
      accept: '.json',
      style: { display: 'none' },
      onChange: handleImportFile,
    }),
    rows.map((rule, i) =>
      React.createElement(
        'div',
        { className: 'dts-row', key: i },
        React.createElement('input', {
          className: 'dts-input dts-grow',
          placeholder: t('pronFrom'),
          value: rule.from || '',
          disabled: !props.writable,
          onChange: (e) => change(i, { from: e.target.value }),
        }),
        React.createElement('input', {
          className: 'dts-input dts-grow',
          placeholder: t('pronTo'),
          value: rule.to || '',
          disabled: !props.writable,
          onChange: (e) => change(i, { to: e.target.value }),
        }),
        React.createElement(
          'label',
          { className: 'dts-sub', title: t('pronWhole') },
          React.createElement('input', {
            type: 'checkbox',
            checked: !!rule.whole,
            disabled: !props.writable,
            onChange: (e) => change(i, { whole: e.target.checked }),
          }),
        ),
        React.createElement('input', {
          className: 'dts-input',
          style: { maxWidth: '70px' },
          placeholder: t('pronLang'),
          value: rule.lang || '',
          disabled: !props.writable,
          onChange: (e) => change(i, { lang: e.target.value }),
        }),
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'dts-mini',
            title: t('previewRule'),
            disabled: !props.writable,
            onClick: () => {
              if (props.onPreviewPhrase) props.onPreviewPhrase(rule.to || rule.from)
            },
          },
          '\u25b6',
        ),
        React.createElement(
          'button',
          { type: 'button', className: 'dts-mini', disabled: !props.writable, onClick: () => remove(i) },
          '\u00d7',
        ),
      ),
    ),
    React.createElement(
      'div',
      { className: 'dts-row' },
      React.createElement(
        'button',
        { type: 'button', className: 'dts-mini', disabled: !props.writable, onClick: add },
        '+',
      ),
      React.createElement(
        'button',
        { type: 'button', className: 'dts-link', disabled: !props.writable, onClick: loadIt },
        t('loadItDictionary'),
      ),
      React.createElement(
        'button',
        { type: 'button', className: 'dts-link', disabled: !props.writable, onClick: exportJson },
        t('exportJson'),
      ),
      React.createElement(
        'button',
        { type: 'button', className: 'dts-link', disabled: !props.writable, onClick: triggerImport },
        t('importJson'),
      ),
      React.createElement('span', { className: 'dts-sub' }, t('pronHint')),
    ),
  )
}
