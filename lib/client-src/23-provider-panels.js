function ProviderOperationsPanel({ provider }) {
  const h = React.createElement
  const choices =
    provider === 'polly'
      ? [
          ['lexicon-list', '列出發音詞典', {}],
          ['lexicon-get', '讀取發音詞典', { name: 'Terms' }],
          [
            'lexicon-put',
            '儲存發音詞典',
            {
              name: 'Terms',
              content:
                '<lexicon version="1.0" xmlns="http://www.w3.org/2005/01/pronunciation-lexicon" alphabet="ipa" xml:lang="en-US"><lexeme><grapheme>DSH</grapheme><alias>Deep Seek Harness</alias></lexeme></lexicon>',
            },
          ],
          ['lexicon-delete', '刪除發音詞典', { name: 'Terms' }],
          ['task-list', '列出長文工作', {}],
          ['task-get', '查詢長文工作', { id: '' }],
          ['task-start', '送出長文工作（可能計費）', { text: '', bucket: '', prefix: 'dsh-tts/' }],
        ]
      : [
          ['dictionary-list', '列出發音詞典', { workspace: '' }],
          ['dictionary-get', '讀取發音詞典', { workspace: '', id: '' }],
          ['dictionary-create', '建立發音詞典', { workspace: '', displayName: 'Terms', pronunciations: [] }],
          [
            'dictionary-update',
            '更新發音詞典（取代完整內容）',
            { workspace: '', id: '', etag: '', displayName: 'Terms', pronunciations: [] },
          ],
          ['dictionary-delete', '刪除發音詞典', { workspace: '', id: '', etag: '' }],
          ['async-start', '送出非同步語音（可能計費）', { text: '' }],
          ['batch-start', '送出批次語音（可能計費）', { items: [{ id: 'one', text: '' }] }],
          ['operation-get', '查詢非同步工作', { name: 'ttsAsyncJobs/JOB_ID/operations/OPERATION_ID' }],
          ['operation-list', '列出工作操作', { id: '', batch: false }],
        ]
  const [action, setAction] = React.useState(choices[0][0]),
    [input, setInput] = React.useState(JSON.stringify(choices[0][2], null, 2)),
    [result, setResult] = React.useState(''),
    [busy, setBusy] = React.useState(false)
  const run = async () => {
    setBusy(true)
    setResult('')
    try {
      const r = await clientFetch('/dsh-sound-atelier/provider-operation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, action, input: JSON.parse(input) }),
        timeoutMs: 65000,
      })
      const d = await r.json()
      if (!r.ok || !d.ok) throw Error(d.error?.message || '服務操作失敗')
      setResult(JSON.stringify(d.result, null, 2))
    } catch (e) {
      setResult(e.message)
    } finally {
      setBusy(false)
    }
  }
  return h(
    'details',
    null,
    h('summary', null, '發音詞典與雲端長文工作'),
    h(
      'div',
      { className: 'dts-sub' },
      '使用已儲存的第一個同服務候選及安全憑證。此處不會自動送出操作；更新／刪除會修改雲端資源。Inworld 更新需要先讀取目前 etag，pronunciations 會完整取代舊內容。長文結果由服務存放，查詢狀態不會重送合成。',
    ),
    h(
      'select',
      {
        className: 'dts-input',
        'aria-label': '雲端服務操作',
        value: action,
        disabled: busy,
        onChange: (e) => {
          setAction(e.target.value)
          setInput(JSON.stringify(choices.find((c) => c[0] === e.target.value)[2], null, 2))
          setResult('')
        },
      },
      choices.map(([v, label]) => h('option', { value: v, key: v }, label)),
    ),
    h('textarea', {
      className: 'dts-input',
      'aria-label': '雲端操作參數',
      value: input,
      rows: 7,
      disabled: busy,
      onChange: (e) => setInput(e.target.value),
    }),
    h(
      'button',
      { className: 'dts-btn', type: 'button', disabled: busy, onClick: run },
      busy ? '處理中…' : '執行所選操作',
    ),
    result
      ? h(
          'pre',
          { style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 300, overflow: 'auto' } },
          result,
        )
      : null,
  )
}

function ProviderCapabilitiesPanel({ draft, setTop, writable, referenceAssets = [] }) {
  const h = React.createElement
  const first = draft.chain?.[0] || {}
  let selectedTransport = ''
  try {
    selectedTransport = JSON.parse(draft.providerOptions || '{}')[first.provider]?.transport || ''
  } catch {}

  const [cap, setCap] = React.useState(null)
  const [error, setError] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [ssml, setSsml] = React.useState('<speak>你好，<break time="300ms"/>這是完整的語音測試。</speak>')
  const [speakers, setSpeakers] = React.useState([
    { id: 'A', voice: '' },
    { id: 'B', voice: '' },
  ])
  const [turns, setTurns] = React.useState([
    { speaker: 'A', text: '你好，今天過得如何？', instruction: '' },
    { speaker: 'B', text: '今天很開心，謝謝你！', instruction: '開心而自然' },
  ])
  const [mode, setMode] = React.useState('auto')
  const [result, setResult] = React.useState(null)
  React.useEffect(() => {
    const controller = new AbortController()
    setCap(null)
    setError('')
    if (first.provider)
      clientFetch(
        '/dsh-sound-atelier/capabilities?' +
          new URLSearchParams({
            provider: first.provider,
            model: first.model || '',
            voice: first.voice || '',
            transport: selectedTransport,
          }),
        { signal: controller.signal },
      )
        .then((r) => r.json())
        .then((d) => {
          if (!controller.signal.aborted && d.ok) setCap(d.capabilities)
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message)
        })
    return () => controller.abort()
  }, [first.provider, first.model, first.voice, selectedTransport])
  let options = {},
    valid = true
  try {
    options = JSON.parse(draft.providerOptions || '{}')
    if (!options || Array.isArray(options)) throw Error()
  } catch {
    valid = false
  }
  const current = options[first.provider] || {}
  const change = (key, value) => {
    if (!valid) {
      setError('請先修正進階合成 JSON。')
      return
    }
    const updated = { ...current }
    if (value === '') delete updated[key]
    else updated[key] = value
    setTop('providerOptions', JSON.stringify({ ...options, [first.provider]: updated }))
  }
  const field = (label, control) => h('label', { className: 'dts-field' }, label, control)
  const select = (key, choices, label) =>
    field(
      label,
      h(
        'select',
        {
          className: 'dts-input',
          'aria-label': label,
          value: current[key] === undefined ? '' : String(current[key]),
          disabled: !writable || !valid,
          onChange: (e) => change(key, e.target.value),
        },
        h('option', { value: '' }, '服務預設'),
        choices.map((v) => h('option', { key: v, value: v }, v)),
      ),
    )
  const toggle = (key, label) =>
    field(
      label,
      h('input', {
        type: 'checkbox',
        'aria-label': label,
        checked: !!current[key],
        disabled: !writable || !valid,
        onChange: (e) => change(key, e.target.checked ? true : ''),
      }),
    )
  const textOption = (key, label) =>
    field(
      label,
      h('input', {
        className: 'dts-input',
        'aria-label': label,
        value: current[key] || '',
        disabled: !writable || !valid,
        onChange: (e) => change(key, e.target.value),
      }),
    )
  const jsonOption = (key, label) =>
    field(
      label,
      h('textarea', {
        key: first.provider + key + JSON.stringify(current[key]),
        className: 'dts-input',
        'aria-label': label,
        rows: 2,
        defaultValue: current[key] === undefined ? '' : JSON.stringify(current[key]),
        disabled: !writable || !valid,
        placeholder: 'JSON 陣列／物件；留空沿用預設',
        onBlur: (e) => {
          try {
            change(key, e.target.value.trim() ? JSON.parse(e.target.value) : '')
            setError('')
          } catch {
            setError(label + '：JSON 格式錯誤')
          }
        },
      }),
    )
  const run = async (kind) => {
    if (busy) return
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const payload =
        kind === 'ssml'
          ? { provider: first.provider, model: first.model, voice: first.voice, ssml }
          : { mode, speakers: speakers.map((s) => ({ ...s, voice: s.voice || first.voice })), turns }
      const r = await clientFetch('/dsh-sound-atelier/' + (kind === 'ssml' ? 'preview' : 'dialogue'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeoutMs: 600000,
      })
      const data = await r.json()
      if (!r.ok || !data.ok) throw Error(data.error?.message || '合成失敗')
      setResult(data)
      playAudioItem({
        ...data,
        text: kind === 'ssml' ? 'SSML 試聽' : turns.map((t) => t.text).join('\n'),
        kind: 'speech',
        sessionId: player.sessionId,
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return h(
    'div',
    { className: 'dts-block', 'data-dsh-tts-capabilities': '1' },
    h('div', { className: 'dts-h' }, '模型進階能力與多角色'),
    h(
      'div',
      { className: 'dts-sub' },
      '依降級鏈第一列顯示能力。此處編輯全域參數，候選的獨立參數有優先權。合成使用已儲存設定；變更後請先儲存。',
    ),
    cap
      ? h(
          React.Fragment,
          null,
          h(
            'div',
            { className: 'dts-sub' },
            [
              cap.ssml ? 'SSML' : '',
              cap.timestamps.length
                ? '時間戳：' +
                  cap.timestamps
                    .map(
                      (v) =>
                        ({
                          word: '字詞',
                          character: '字元',
                          phoneme: '音素',
                          sentence: '句子',
                          ssml: 'SSML 標記',
                          viseme: '嘴形',
                        })[v] || v,
                    )
                    .join('、')
                : '',
              cap.nativeDialogue ? '原生多角色' : '逐段多角色',
              cap.liveInput ? '原生雙向輸入' : '整段輸入',
              cap.reference ? '參考錄音' : '',
            ]
              .filter(Boolean)
              .join(' · '),
          ),
          (cap.notes || []).map((note, i) => h('div', { className: 'dts-sub', key: i }, note)),
          cap.transports.length > 1 ? select('transport', cap.transports, '合成傳輸方式') : null,
          cap.controls.includes('format') ? select('format', cap.formats, '合成音訊格式') : null,
          cap.controls.includes('auth') ? select('auth', ['service-account', 'adc'], 'Google Cloud 驗證方式') : null,
          cap.controls.includes('timestamps')
            ? first.provider === 'inworld'
              ? select('timestamps', ['none', 'word', 'character'], '時間戳類型')
              : toggle('timestamps', '回傳時間戳')
            : null,
          cap.controls.includes('phonemes') ? toggle('phonemes', '回傳音素時間戳') : null,
          cap.controls.includes('deliveryMode')
            ? select('deliveryMode', ['STABLE', 'BALANCED', 'CREATIVE'], 'Inworld 表達模式')
            : null,
          cap.controls.includes('inputMode') ? select('inputMode', ['text', 'markup'], 'Chirp 輸入模式') : null,
          cap.controls.includes('sampleRate')
            ? field(
                '合成取樣率 Hz',
                h('input', {
                  className: 'dts-input',
                  type: 'number',
                  min: 8000,
                  max: 48000,
                  value: current.sampleRate || '',
                  disabled: !writable || !valid,
                  onChange: (e) => change('sampleRate', e.target.value ? Number(e.target.value) : ''),
                }),
              )
            : null,
          cap.controls.includes('marks')
            ? jsonOption('marks', 'Polly Speech Marks（例如 ["word","sentence"]，另計請求）')
            : null,
          cap.controls.includes('lexicons') ? jsonOption('lexicons', 'Polly 發音詞典名稱（最多 5 個）') : null,
          cap.controls.includes('dictionary')
            ? first.provider === 'fish'
              ? jsonOption('dictionary', 'Fish 發音詞典設定')
              : textOption('dictionary', '發音詞典 ID')
            : null,
          cap.controls.includes('dictionaries')
            ? jsonOption('dictionaries', 'Inworld 發音詞典資源名稱（最多 3 個）')
            : null,
          cap.controls.includes('pronunciations') ? jsonOption('pronunciations', 'Google Cloud 自訂發音設定') : null,
          cap.controls.includes('referencePath') ? textOption('referencePath', 'Fish 參考錄音路徑（DSH 主機）') : null,
          cap.controls.includes('referenceText') ? textOption('referenceText', 'Fish 參考錄音逐字稿') : null,
          cap.controls.includes('hotFix') ? jsonOption('hotFix', 'DashScope hot_fix 發音／替換設定') : null,
          cap.controls.includes('native') ? jsonOption('native', 'DeepInfra 原生模型參數') : null,
          cap.nativeSchema
            ? h(
                'details',
                null,
                h('summary', null, '此 DeepInfra 模型接受的原生參數'),
                h(
                  'div',
                  { className: 'dts-sub', style: { overflowWrap: 'anywhere' } },
                  Object.entries(cap.nativeSchema.properties || {})
                    .filter(([k]) => !['text', 'input'].includes(k))
                    .map(
                      ([k, v]) =>
                        k +
                        ' (' +
                        v.type +
                        (v.minimum !== undefined ? ', ≥' + v.minimum : '') +
                        (v.maximum !== undefined ? ', ≤' + v.maximum : '') +
                        ')',
                    )
                    .join('、'),
                ),
                h('div', { className: 'dts-sub' }, '於進階合成 JSON 的 deepinfra.native 設定；介面會依模型驗證。'),
              )
            : null,
          cap.ssml
            ? h(
                'details',
                null,
                h('summary', null, 'SSML 試聽'),
                h('textarea', {
                  className: 'dts-input',
                  'aria-label': 'SSML 內容',
                  value: ssml,
                  rows: 4,
                  onChange: (e) => setSsml(e.target.value),
                }),
                h(
                  'button',
                  { type: 'button', className: 'dts-btn', disabled: busy, onClick: () => run('ssml') },
                  '合成 SSML',
                ),
              )
            : null,
        )
      : h('div', { className: 'dts-sub' }, '讀取模型能力…'),
    h(
      'details',
      null,
      h('summary', null, '多角色語音工作室'),
      h(
        'div',
        { className: 'dts-sub' },
        '各角色填音色 ID；空白沿用第一列音色。自動模式在模型支援時使用原生對話，其他情況逐段合成並合併。每次合成都可能計費。',
      ),
      field(
        '多角色合成模式',
        h(
          'select',
          { className: 'dts-input', value: mode, onChange: (e) => setMode(e.target.value) },
          [
            ['auto', '自動選擇'],
            ['native', '只用原生對話'],
            ['segments', '逐段合成'],
          ].map(([v, label]) => h('option', { value: v, key: v }, label)),
        ),
      ),
      speakers.map((s, i) =>
        h(
          'div',
          { key: s.id },
          field(
            '角色 ' + s.id + ' 音色 ID',
            h('input', {
              className: 'dts-input',
              value: s.voice,
              placeholder: first.voice || '音色 ID',
              onChange: (e) =>
                setSpeakers((list) => list.map((item, n) => (n === i ? { ...item, voice: e.target.value } : item))),
            }),
          ),
          cap?.reference
            ? field(
                '角色 ' + s.id + ' 參考錄音',
                h(
                  'select',
                  {
                    className: 'dts-input',
                    'aria-label': '角色 ' + s.id + ' 參考錄音',
                    value: s.referenceAsset || '',
                    onChange: (e) =>
                      setSpeakers((list) =>
                        list.map((item, n) =>
                          n === i ? { ...item, referenceAsset: e.target.value || undefined } : item,
                        ),
                      ),
                  },
                  h('option', { value: '' }, '沿用服務／候選設定'),
                  referenceAssets.map((a) => h('option', { key: a.id, value: a.id }, a.name)),
                ),
              )
            : null,
        ),
      ),
      turns.map((turn, i) =>
        h(
          'div',
          { key: i, className: 'dts-field' },
          h(
            'select',
            {
              className: 'dts-input',
              'aria-label': '第 ' + (i + 1) + ' 段角色',
              value: turn.speaker,
              onChange: (e) =>
                setTurns((list) => list.map((item, n) => (n === i ? { ...item, speaker: e.target.value } : item))),
            },
            speakers.map((s) => h('option', { value: s.id, key: s.id }, s.id)),
          ),
          h('textarea', {
            className: 'dts-input',
            'aria-label': '第 ' + (i + 1) + ' 段台詞',
            value: turn.text,
            rows: 2,
            onChange: (e) =>
              setTurns((list) => list.map((item, n) => (n === i ? { ...item, text: e.target.value } : item))),
          }),
          h('input', {
            className: 'dts-input',
            'aria-label': '第 ' + (i + 1) + ' 段語氣',
            placeholder: '語氣提示（模型需支援）',
            value: turn.instruction,
            onChange: (e) =>
              setTurns((list) => list.map((item, n) => (n === i ? { ...item, instruction: e.target.value } : item))),
          }),
          h(
            'button',
            {
              type: 'button',
              className: 'dts-btn',
              disabled: turns.length <= 1,
              onClick: () => setTurns((list) => list.filter((_, n) => n !== i)),
            },
            '移除此段',
          ),
        ),
      ),
      h(
        'button',
        {
          type: 'button',
          className: 'dts-btn',
          disabled: turns.length >= 100,
          onClick: () => setTurns((list) => [...list, { speaker: 'A', text: '', instruction: '' }]),
        },
        '新增台詞',
      ),
      h(
        'button',
        {
          type: 'button',
          className: 'dts-btn',
          disabled: speakers.length >= 16,
          onClick: () => setSpeakers((list) => [...list, { id: String.fromCharCode(65 + list.length), voice: '' }]),
        },
        '新增角色',
      ),
      h(
        'button',
        { type: 'button', className: 'dts-btn', disabled: busy, onClick: () => run('dialogue') },
        busy ? '合成中…' : '合成並試聽對話',
      ),
      result
        ? h(
            'div',
            { className: 'dts-sub' },
            '完成：' +
              (result.dialogueMode || 'SSML') +
              (result.duration ? ' · ' + result.duration.toFixed(2) + ' 秒' : '') +
              '；可使用播放器重播與匯出。',
          )
        : null,
    ),
    ['polly', 'inworld'].includes(first.provider)
      ? h(ProviderOperationsPanel, { provider: first.provider, key: first.provider })
      : null,
    error ? h('div', { role: 'alert', className: 'dts-sub' }, error) : null,
  )
}
