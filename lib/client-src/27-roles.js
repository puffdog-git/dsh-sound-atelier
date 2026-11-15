function RolesEditor(props) {
  const t = props.t || ((key) => key)
  const value = props.value || {}
  const [newRole, setNewRole] = React.useState('')
  const set = (r, patch) => props.onChange(Object.assign({}, value, { [r]: Object.assign({}, value[r] || {}, patch) }))
  const removeRole = (r) => {
    const next = Object.assign({}, value)
    delete next[r]
    props.onChange(next)
  }

  const standardKeys = ['reply', 'approval', 'error']
  const customKeys = Object.keys(value).filter((k) => !standardKeys.includes(k))
  const allKeys = [...standardKeys, ...customKeys]

  const addCustom = () => {
    const name = newRole.trim().toLowerCase()
    if (!name || value[name]) return
    set(name, { provider: '', model: '', voice: '', chime: '', ssmlStyle: '' })
    setNewRole('')
  }

  return React.createElement(
    'div',
    { className: 'dts-block' },
    React.createElement('span', { className: 'dts-sub' }, t('rolesHint')),
    allKeys.map((r) =>
      React.createElement(
        'details',
        { className: 'dts-entry', key: r },
        React.createElement(
          'summary',
          { className: 'dts-h', style: { cursor: 'pointer' } },
          t('role_' + r) !== 'role_' + r ? t('role_' + r) : `👤 ${r}`,
        ),
        React.createElement(
          'select',
          {
            className: 'dts-input',
            value: (value[r] && value[r].provider) || '',
            disabled: !props.writable,
            onChange: (e) => set(r, { provider: e.target.value, model: '', voice: '', style: '' }),
          },
          React.createElement('option', { value: '' }, '—'),
          PROVIDERS.map((p) => React.createElement('option', { key: p, value: p }, providerLabel(t, p))),
        ),
        React.createElement(CatalogPicker, {
          autoSelect: !!value[r]?.provider,
          style: value[r]?.style,
          t,
          provider: value[r]?.provider || props.defaultProvider,
          model: value[r]?.model || '',
          voice: value[r]?.voice || '',
          writable: props.writable,
          catalogEpoch: props.catalogEpoch,
          onChange: (patch) => set(r, patch),
        }),
        React.createElement(
          'label',
          { className: 'dts-row' },
          React.createElement('input', {
            type: 'checkbox',
            checked: !!value[r]?.tuningEnabled,
            disabled: !props.writable,
            onChange: (e) =>
              set(r, Object.assign({}, e.target.checked ? props.tuning : {}, { tuningEnabled: e.target.checked })),
          }),
          t('tuneOwn'),
        ),
        React.createElement(TuningBar, {
          t,
          provider: value[r]?.provider || props.defaultProvider,
          model: value[r]?.model || props.defaultModel,
          cosyvoiceMode: props.cosyvoiceMode,
          value: value[r]?.tuningEnabled ? value[r] : props.tuning,
          writable: props.writable && !!value[r]?.tuningEnabled,
          onChange: (patch) => set(r, patch),
          onPreview: (text, tuning) =>
            props.onPreview(
              value[r]?.provider || props.defaultProvider,
              value[r]?.model || (!value[r]?.provider ? props.defaultModel : ''),
              value[r]?.voice || (!value[r]?.provider ? props.defaultVoice : ''),
              text,
              { ...tuning, style: value[r]?.style || props.defaultStyle },
            ),
        }),
        React.createElement('input', {
          className: 'dts-input',
          style: { maxWidth: '90px' },
          placeholder: t('chime'),
          value: (value[r] && value[r].chime) || '',
          disabled: !props.writable,
          onChange: (e) => set(r, { chime: e.target.value }),
        }),
        React.createElement('input', {
          className: 'dts-input dts-grow',
          placeholder: t('ssmlStyle') || 'ssml',
          title: t('ssmlStyleHint') || 'SSML tone style',
          value: (value[r] && value[r].ssmlStyle) || '',
          disabled: !props.writable,
          onChange: (e) => set(r, { ssmlStyle: e.target.value }),
        }),
        !standardKeys.includes(r)
          ? React.createElement(
              'button',
              {
                type: 'button',
                className: 'dts-mini',
                title: t('remove'),
                disabled: !props.writable,
                onClick: () => removeRole(r),
              },
              '\u00d7',
            )
          : null,
      ),
    ),
    React.createElement(
      'div',
      { className: 'dts-row' },
      React.createElement('input', {
        className: 'dts-input',
        style: { maxWidth: '180px' },
        placeholder: t('newSubagentRole'),
        value: newRole,
        disabled: !props.writable,
        onChange: (e) => setNewRole(e.target.value),
        onKeyDown: (e) => {
          if (e.key === 'Enter') addCustom()
        },
      }),
      React.createElement(
        'button',
        { type: 'button', className: 'dts-save', disabled: !props.writable || !newRole.trim(), onClick: addCustom },
        t('addSubagentRole'),
      ),
    ),
  )
}
