function ChainEditor(props) {
  // Translator comes from the card: the slot passes props.t only to it.
  const t = props.t || ((key) => key)
  const rows = Array.isArray(props.value) ? props.value : []
  const change = (i, patch) => {
    const next = rows.map((r, k) => (k === i ? Object.assign({}, r, patch) : r))
    props.onChange(next)
  }
  const move = (i, delta) => {
    const j = i + delta
    if (j < 0 || j >= rows.length) return
    const next = rows.slice()
    const tmp = next[i]
    next[i] = next[j]
    next[j] = tmp
    props.onChange(next)
  }
  const remove = (i) => props.onChange(rows.filter((_, k) => k !== i))
  const add = () => props.onChange(rows.concat([{ provider: 'edge', model: '', voice: '' }]))
  return React.createElement(
    'div',
    { className: 'dts-block' },
    React.createElement(
      'div',
      { className: 'dts-sub' },
      '由上到下依序嘗試：第一個是主要服務，失敗或沒有金鑰時自動改用下一個備援。',
    ),
    rows.map((row, i) => {
      const cloud = !!CLOUD[row.provider]
      const cred = credOf(props.credentials, row.provider)
      const draft = (props.keyDrafts && props.keyDrafts[row.provider]) || ''
      // 本機服務的金鑰是選填的：用代管帳號時會自動登入，沒開帳號保護的服務也不需要。
      const keyOptional = row.provider === 'local-tts'
      const badge = !cloud
        ? null
        : !cred.writable
          ? t('fromEnv')
          : cred.configured
            ? t('configured')
            : keyOptional
              ? '選填，可以留空'
              : t('notSet')
      return React.createElement(
        'div',
        { className: 'dts-entry', key: i, 'data-primary': i === 0 ? 'true' : 'false' },
        React.createElement(
          'div',
          { className: 'dts-h' },
          t(i === 0 ? 'catalogPrimary' : 'catalogFallback') + (i ? ' ' + i : ''),
          (() => {
            // 一眼看出這一列能不能用：缺金鑰、暫停中、上次失敗，或可用。
            const hit = Array.isArray(props.breaker)
              ? props.breaker.find((b) => b && (b.id === row.provider || b.id.startsWith(row.provider + ':' + i + ':')))
              : null
            const state =
              cloud && !cred.configured && !keyOptional
                ? ['missing', '缺金鑰', ' dts-badge-bad']
                : hit?.open
                  ? ['paused', '暫停中（連續失敗）', ' dts-badge-bad']
                  : hit?.lastError
                    ? ['failed', '上次失敗', ' dts-badge-warn']
                    : [
                        'ok',
                        keyOptional ? '本機・通常不用金鑰' : cloud ? '可用' : row.provider === 'edge' ? '可用・免金鑰' : '本機',
                        ' dts-badge-on',
                      ]
            return React.createElement(
              'span',
              { className: 'dts-badge' + state[2], style: { marginLeft: 8 }, 'data-chain-status': state[0] },
              state[1],
            )
          })(),
        ),
        React.createElement(
          'div',
          { className: 'dts-row' },
          React.createElement(
            'select',
            {
              className: 'dts-input',
              value: row.provider,
              disabled: !props.writable,
              'aria-label': t(i === 0 ? 'catalogPrimary' : 'catalogFallback'),
              onChange: (e) =>
                change(i, {
                  provider: e.target.value,
                  model: '',
                  voice: '',
                  style: '',
                  baseUrl: '',
                  keyEnv: '',
                  options: '',
                }),
            },
            PROVIDERS.filter(
              (p) =>
                i > 0 ||
                p === row.provider ||
                ['local-tts', 'kokoro', 'f5', 'piper', 'espeak', 'cosyvoice'].includes(p) ===
                  (props.sourceMode === 'local'),
            ).map((p) => React.createElement('option', { key: p, value: p }, providerLabel(t, p))),
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'dts-mini',
              title: t('up'),
              'aria-label': t('up'),
              disabled: !props.writable || i === 0,
              onClick: () => move(i, -1),
            },
            '\u2191',
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'dts-mini',
              title: t('down'),
              'aria-label': t('down'),
              disabled: !props.writable || i === rows.length - 1,
              onClick: () => move(i, 1),
            },
            '\u2193',
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'dts-btn',
              disabled: !props.writable,
              onClick: () =>
                props.onPreview(row.provider, row.model, row.voice, undefined, {
                  style: row.style,
                  baseUrl: row.baseUrl,
                  keyEnv: row.keyEnv,
                  options: row.options,
                  referenceAsset: row.referenceAsset,
                }),
            },
            '\u25b6 ' + t('preview'),
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'dts-mini',
              title: t('remove'),
              'aria-label': t('remove'),
              disabled: !props.writable,
              onClick: () => remove(i),
            },
            '\u00d7',
          ),
        ),
        cloud
          ? React.createElement(
              'div',
              { className: 'dts-row' },
              React.createElement('input', {
                className: 'dts-key dts-input',
                type: 'password',
                autoComplete: 'off',
                value: draft,
                disabled: !props.writable || !cred.writable,
                'aria-label': t(credentialLabel(row.provider)),
                placeholder: cred.configured
                  ? t(row.provider === 'deepseek-web' ? 'catalogKeepToken' : 'catalogKeepKey')
                  : keyOptional
                    ? '通常留空（只有你自己架的服務設了金鑰才填）'
                    : t(credentialLabel(row.provider)),
                onChange: (e) => props.onDraft(row.provider, e.target.value),
              }),
              React.createElement(
                'button',
                {
                  type: 'button',
                  className: 'dts-btn',
                  disabled: !props.writable || !cred.writable || !draft.trim(),
                  onClick: () => props.onCommitKey(row.provider, draft),
                },
                t(row.provider === 'deepseek-web' ? 'catalogSaveToken' : 'catalogSaveKey'),
              ),
              React.createElement('span', { className: 'dts-badge' + (cred.configured ? ' dts-badge-on' : '') }, badge),
              cred.configured && cred.writable
                ? React.createElement(
                    'button',
                    {
                      type: 'button',
                      className: 'dts-link',
                      disabled: !props.writable,
                      onClick: () => props.onClearKey(row.provider),
                    },
                    t('clear'),
                  )
                : null,
            )
          : React.createElement(
              'span',
              { className: 'dts-sub' },
              row.provider === 'edge' ? '線上服務・免金鑰' : t('catalogLocal'),
            ),
        cloud
          ? React.createElement(
              'div',
              { className: 'dts-sub' },
              row.provider !== 'deepseek-web' && !keyOptional ? t('catalogKeyPermissions') : null,
              React.createElement(
                'div',
                null,
                t(
                  row.provider === 'elevenlabs' ? 'catalogElevenLabsPermissions' : 'catalogPermissions_' + row.provider,
                ),
              ),
              KEY_GUIDES[row.provider]
                ? React.createElement(
                    'a',
                    {
                      className: 'dts-link',
                      href: KEY_GUIDES[row.provider],
                      target: '_blank',
                      rel: 'noopener noreferrer',
                    },
                    t(row.provider === 'deepseek-web' ? 'catalogOriginalGuide' : 'catalogKeyGuide'),
                  )
                : null,
            )
          : null,
        React.createElement(CatalogPicker, {
          t,
          provider: row.provider,
          model: row.model,
          voice: row.voice,
          style: row.style,
          writable: props.writable,
          catalogEpoch: props.catalogEpoch,
          onChange: (patch) => change(i, patch),
        }),
        ['local-tts', 'f5', 'cosyvoice', 'fish', 'mimo', 'siliconflow'].includes(row.provider)
          ? React.createElement(
              'label',
              { className: 'dts-field' },
              '此候選的參考錄音',
              React.createElement(
                'select',
                {
                  className: 'dts-input',
                  'aria-label': '此候選的參考錄音',
                  value: row.referenceAsset || '',
                  disabled: !props.writable,
                  onChange: (e) => change(i, { referenceAsset: e.target.value }),
                },
                React.createElement(
                  'option',
                  { value: '' },
                  ['local-tts', 'f5', 'cosyvoice'].includes(row.provider) ? '沿用本機參考錄音設定' : '不傳送參考錄音',
                ),
                (props.referenceAssets || []).map((a) =>
                  React.createElement('option', { key: a.id, value: a.id }, a.name),
                ),
              ),
              React.createElement(
                'span',
                { className: 'dts-sub' },
                ['fish', 'mimo', 'siliconflow'].includes(row.provider)
                  ? '明確選擇後，合成會將此錄音傳送至該雲端服務；本機全域選擇不會自動套用。'
                  : '上傳與管理位於「本機模型與參考音色」。',
              ),
            )
          : null,
        React.createElement(
          'details',
          null,
          React.createElement('summary', { className: 'dts-sub' }, t('entryAdvanced')),
          React.createElement('div', { className: 'dts-sub' }, t('entryAdvancedHint')),
          ...[
            ...([
              'local-tts',
              'openai',
              'custom',
              'voai',
              'doubao',
              'mimo',
              'deepinfra',
              'siliconflow',
              'minimax',
              'cosyvoice',
            ].includes(row.provider)
              ? [['baseUrl', 'entryEndpoint']]
              : []),
            ...(cloud ? [['keyEnv', 'entryCredential']] : []),
            ['options', 'entryOptions'],
          ].map(([field, label]) =>
            React.createElement(
              'label',
              { className: 'dts-block', key: field },
              t(label),
              React.createElement(field === 'options' ? 'textarea' : 'input', {
                className: 'dts-input',
                'aria-label': t(label),
                value: row[field] || '',
                disabled: !props.writable,
                onChange: (e) => change(i, { [field]: e.target.value }),
              }),
            ),
          ),
        ),
        cloud && cred.ref ? React.createElement('span', { className: 'dts-sub' }, '已儲存為 ' + cred.ref) : null,
        (() => {
          const hit = Array.isArray(props.breaker)
            ? props.breaker.find((b) => b && (b.id === row.provider || b.id.startsWith(row.provider + ':' + i + ':')))
            : null
          if (!hit || (!hit.open && !hit.lastError)) return null
          return React.createElement(
            'div',
            { className: 'dts-sub dts-bad' },
            (hit.open ? t('breakerOpen') + ' · ' : '') + (hit.lastError || ''),
          )
        })(),
      )
    }),
    React.createElement(
      'div',
      { className: 'dts-row' },
      React.createElement(
        'button',
        { type: 'button', className: 'dts-btn', disabled: !props.writable, onClick: add },
        '+ ' + t('addProvider'),
      ),
      React.createElement('span', { className: 'dts-sub' }, t('chainHint')),
    ),
  )
}

// Card strings live in the locale registry so a separate package can translate
// them without touching this plugin. English is the source language and fallback.
