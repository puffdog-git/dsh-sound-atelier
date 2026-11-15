function LocalStudioManager(props) {
  // 所在分頁沒有顯示時不輪詢（分頁以 hidden 切換，元件一直掛載）。
  const activeRef = React.useRef(true)
  activeRef.current = props.active !== false
  const h = React.createElement,
    d = props.draft,
    set = props.setTop
  const [models, M] = React.useState([]),
    [jobs, J] = React.useState([]),
    [report, R] = React.useState(null),
    [usage, U] = React.useState(null),
    [error, E] = React.useState(''),
    [busy, B] = React.useState(false),
    [file, F] = React.useState(null),
    [trusted, T] = React.useState(false),
    [registry, V] = React.useState(''),
    [packs, P] = React.useState([]),
    [renames, N] = React.useState({}),
    [backend, K] = React.useState('xinference'),
    [device, D] = React.useState('cu128')
  const req = async (path, method = 'GET', body) => {
    const r = await clientFetch('/dsh-sound-atelier/' + path, {
        method,
        ...(body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}),
        timeoutMs: 600000,
      }),
      v = await r.json()
    if (!r.ok || !v.ok) throw Error(v.error?.message || '操作失敗')
    return v
  }
  const refresh = async () => {
    const [m, j] = await Promise.all([req('voice/models'), req('maintenance')])
    M(m.models)
    J(j.jobs)
  }
  React.useEffect(() => {
    let mounted = true
    const load = () => {
      if (mounted) refresh().catch(() => {})
    }
    load()
    req('usage')
      .then(U)
      .catch(() => {})
    const timer = setInterval(() => document.hidden || !activeRef.current || load(), 3000)
    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [])
  const run = async (fn) => {
    B(true)
    E('')
    try {
      await fn()
      await refresh()
    } catch (e) {
      E(e.message)
    } finally {
      B(false)
    }
  }
  const job = (action, extra = {}) => run(() => req('maintenance', 'POST', { action, ...extra }))
  const select = (key, label, options, fallback = '') =>
    h(
      'label',
      { className: 'dts-field' },
      label,
      h(
        'select',
        {
          className: 'dts-input',
          'aria-label': label,
          value: d[key] ?? fallback,
          disabled: !props.writable,
          onChange: (e) => set(key, e.target.value),
        },
        options.map(([value, text]) => h('option', { key: value, value }, text)),
      ),
    )
  const field = (key, label) =>
    h(
      'label',
      { className: 'dts-field' },
      label,
      h('input', {
        className: 'dts-input',
        'aria-label': label,
        value: d[key] || '',
        disabled: !props.writable,
        onChange: (e) => set(key, e.target.value),
      }),
    )
  const button = (label, fn, disabled = false) =>
    h('button', { type: 'button', className: 'dts-btn', disabled: busy || disabled, onClick: fn }, label)
  const download = async (path, name) => {
    const r = await clientFetch('/dsh-sound-atelier/' + path, { timeoutMs: 600000 })
    if (!r.ok) throw Error('匯出失敗')
    const url = URL.createObjectURL(await r.blob()),
      a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }
  return h(
    'div',
    { className: 'dts-block', 'data-dsh-tts-stage3': '1' },
    h('div', { className: 'dts-h' }, '本機工作室與診斷'),
    props.boolField(
      'adaptiveChunks',
      '依合成速度調整分段大小',
      '先以短片段起播，再依實測延遲校準；不另外呼叫雲端服務。',
    ),
    select(
      'textMode',
      '朗讀文字模式',
      [
        ['clean', '整理 Markdown'],
        ['raw', '原始文字（自動朗讀／API）；畫面選取依可見文字'],
      ],
      'clean',
    ),
    props.boolField('approvalInterrupt', '收到批准要求時中斷朗讀', '關閉時排入現有語音後方。'),
    props.boolField('announceApprovalDecided', '批准決定後語音提示', '僅在播放器閒置時播報，避免打斷回覆。'),
    field('approvalDecidedText', '批准決定提示文字'),
    h(
      'details',
      null,
      h('summary', null, '第一次使用：獨立環境與連線'),
      h(
        'ol',
        null,
        h('li', null, '選環境及裝置，安裝會下載 Python 套件與必要推理資源。'),
        h('li', null, '儲存本機服務設定，啟動 Xinference，再建立本機專用帳號。'),
        h('li', null, '載入需要的模型，選參考錄音，完成真實試聽。模型和權重均與插件分開。'),
      ),
      h(
        'label',
        null,
        '環境',
        h(
          'select',
          { 'aria-label': '安裝環境', value: backend, onChange: (e) => K(e.target.value) },
          ['xinference', 'kokoro', 'dots', 'rvc', 'rvc-portable', 'index-cache'].map((v) =>
            h('option', { key: v, value: v }, v),
          ),
        ),
      ),
      h(
        'label',
        null,
        '裝置',
        h(
          'select',
          { 'aria-label': '安裝裝置', value: device, onChange: (e) => D(e.target.value) },
          h('option', { value: 'cpu' }, 'CPU'),
          h('option', { value: 'cu128' }, 'NVIDIA CUDA 12.8'),
        ),
      ),
      button('準備獨立環境（下載）', () => job('install', { backend, device })),
      button('建立／檢查本機帳號', () => job('provision')),
      h(
        'div',
        { className: 'dts-sub' },
        '帳密與音訊 API Key 由本機產生，以 Windows DPAPI 儲存；既有外部帳號不會被取代。插件開源釋出時不會包含環境、模型或憑證。',
      ),
    ),
    h(
      'details',
      null,
      h('summary', null, '原生 dots / Index 進階模式'),
      select(
        'localTtsDevice',
        '原生推理裝置',
        [
          ['cpu', 'CPU'],
          ['cuda:0', '第一張 NVIDIA GPU'],
        ],
        'cpu',
      ),
      select(
        'localTtsNativeModel',
        'dots 檢查點',
        ['base', 'soar', 'mf', 'mf-2steps', 'mf-1step', 'mf-2steps-stts'].map((v) => ['dots-studio/dots.tts-' + v, v]),
        'dots-studio/dots.tts-mf',
      ),
      field('localTtsModelPath', 'Index 模型資料夾（空白用標準快取）'),
      props.boolField('localTtsNativeTrusted', '信任 Index 模型／設定檔', '只有可信來源的模型才可載入。'),
      select('localTtsEmotionAsset', 'Index 情緒參考錄音', [
        ['', '不用獨立情緒錄音'],
        ...(props.assets || []).map((a) => [a.id, a.name]),
      ]),
      h(
        'div',
        { className: 'dts-sub' },
        '先在上方服務類型選原生模式並儲存。Index 可獨立使用聲線及情緒錄音；情緒音訊、向量與文字三擇一。dots 固定步數模型使用自己的取樣設定。GPT-SoVITS 可在進階參數 local-tts.native 調整取樣、切句、批次及快取；不支援自由文字語氣欄位。',
      ),
      button('載入原生模型', () => job('native-load')),
      button('從記憶體卸下原生模型', () => run(() => req('local/native', 'POST', { action: 'stop' }))),
    ),
    h(
      'details',
      null,
      h('summary', null, 'RVC 聲線轉換與可攜音色包'),
      props.boolField('rvcEnabled', '合成後套用 RVC', '適用所有回傳完整音訊的 Provider；轉換後時間戳會清除。'),
      props.boolField('rvcBypassOnFailure', 'RVC 失敗時播放原始合成語音', '不重新送文字給其他服務；關閉時回報錯誤。'),
      props.boolField('rvcManaged', '由插件管理 RVC 服務', '關閉時連線外部服務，不會代為停止其程式。'),
      field('rvcBaseUrl', 'RVC 本機服務地址'),
      select(
        'rvcDevice',
        'RVC 裝置',
        [
          ['cpu', 'CPU'],
          ['cuda:0', '第一張 NVIDIA GPU'],
        ],
        'cpu',
      ),
      select('rvcModelAsset', 'RVC 模型', [
        ['', '請選擇'],
        ...models.filter((m) => m.kind === 'pth').map((m) => [m.id, m.name]),
      ]),
      select('rvcIndexAsset', 'RVC 索引', [
        ['', '不用索引'],
        ...models.filter((m) => m.kind === 'index').map((m) => [m.id, m.name]),
      ]),
      field('rvcOptions', 'RVC 參數 JSON'),
      h(
        'div',
        { className: 'dts-sub' },
        '支援變調 f0_up_key、音高演演算法 f0_method、索引混合 index_rate、音量 rms_mix_rate、保護 protect 等。無索引時自動設 index_rate=0。',
      ),
      h(
        'label',
        null,
        h('input', {
          type: 'checkbox',
          'aria-label': '信任音色模型來源',
          checked: trusted,
          onChange: (e) => T(e.target.checked),
        }),
        '我信任此音色模型來源（.pth 可能包含可執行 pickle；匯入不會立即執行）',
      ),
      h('input', {
        type: 'file',
        accept: '.pth,.index,.zip',
        'aria-label': '音色模型檔案',
        onChange: (e) => F(e.target.files[0] || null),
      }),
      button(
        '匯入模型／索引／音色包',
        () =>
          run(async () => {
            if (!file) throw Error('請選檔案')
            const kind = file.name.split('.').pop().toLowerCase()
            if (!['pth', 'index', 'zip'].includes(kind)) throw Error('不支援的檔案格式')
            const r = await clientFetch(
                '/dsh-sound-atelier/voice/models?' + new URLSearchParams({ kind, name: file.name, trusted: String(trusted) }),
                { method: 'POST', body: file, timeoutMs: 600000 },
              ),
              v = await r.json()
            if (!r.ok || !v.ok) throw Error(v.error?.message || '匯入失敗')
          }),
        !file || !trusted,
      ),
      button('啟動 RVC', () => job('rvc-start')),
      button('載入選定 RVC 模型', () => job('rvc-load')),
      button('停止插件管理的 RVC', () => run(() => req('local/rvc', 'POST', { action: 'stop' }))),
      button(
        '匯出選定音色 ZIP',
        () =>
          run(() =>
            download(
              'voice/pack?' + new URLSearchParams({ model: d.rvcModelAsset || '', index: d.rvcIndexAsset || '' }),
              'dsh-tts-voicepack.zip',
            ),
          ),
        !d.rvcModelAsset,
      ),
      button(
        '壓縮目前索引至 20000 向量',
        () => job('compact-index', { id: d.rvcIndexAsset, targetVectors: 20000 }),
        !d.rvcIndexAsset,
      ),
      models.map((m) =>
        h(
          'div',
          { className: 'dts-entry', key: m.id },
          h(
            'div',
            null,
            m.kind +
              ' · ' +
              (m.verifiedAt ? '曾成功轉換' : '尚未驗證推理') +
              ' · ' +
              Math.round(m.bytes / 1024) +
              ' KiB',
          ),
          h('input', {
            className: 'dts-input',
            'aria-label': '模型名稱 ' + m.name,
            value: renames[m.id] ?? m.name,
            onChange: (e) => N((p) => ({ ...p, [m.id]: e.target.value })),
          }),
          button('儲存 ' + m.name, () =>
            run(() => req('voice/models', 'PATCH', { id: m.id, name: renames[m.id] ?? m.name })),
          ),
          button('刪除本機 ' + m.name, () =>
            run(async () => {
              await req('voice/models', 'DELETE', { id: m.id })
              if (d.rvcModelAsset === m.id) set('rvcModelAsset', '')
              if (d.rvcIndexAsset === m.id) set('rvcIndexAsset', '')
            }),
          ),
        ),
      ),
      h(
        'label',
        null,
        '公開 Registry manifest URL',
        h('input', {
          className: 'dts-input',
          'aria-label': '音色 Registry URL',
          value: registry,
          onChange: (e) => V(e.target.value),
        }),
      ),
      button('讀取音色目錄', () => run(async () => P((await req('voice/registry', 'POST', { url: registry })).packs))),
      packs.map((p) =>
        h(
          'div',
          { className: 'dts-entry', key: p.id },
          p.name + ' · ' + p.license,
          button(
            '安裝 ' + p.name,
            () => job('install-pack', { url: registry, packId: p.id, indexId: null, trusted }),
            !trusted,
          ),
          ...(p.indexes || []).map((i) =>
            button(
              '安裝 ' + p.name + ' / ' + (i.name || i.id),
              () => job('install-pack', { url: registry, packId: p.id, indexId: i.id, trusted }),
              !trusted,
            ),
          ),
        ),
      ),
    ),
    h(
      'details',
      null,
      h('summary', null, '背景工作與取消'),
      jobs.map((j) =>
        h(
          'div',
          { className: 'dts-entry', key: j.id },
          j.kind + ' · ' + j.state,
          j.error ? h('div', { role: 'alert' }, j.error) : null,
          j.result ? h('pre', { style: { whiteSpace: 'pre-wrap' } }, JSON.stringify(j.result, null, 2)) : null,
          j.lines?.length
            ? h('pre', { style: { maxHeight: 180, overflow: 'auto', whiteSpace: 'pre-wrap' } }, j.lines.join('\n'))
            : null,
          ['running', 'cancelling'].includes(j.state)
            ? button('取消 ' + j.kind, () => run(() => req('maintenance', 'DELETE', { id: j.id })))
            : null,
        ),
      ),
    ),
    h(
      'details',
      null,
      h('summary', null, '一鍵診斷與用量估算'),
      button('產生唯讀診斷', () => run(async () => R((await req('diagnostics')).report))),
      report
        ? h(
            'pre',
            { style: { maxHeight: 300, overflow: 'auto', whiteSpace: 'pre-wrap' } },
            JSON.stringify(report, null, 2),
          )
        : null,
      button('下載診斷 JSON', () => run(() => download('diagnostics', 'dsh-tts-diagnostics.json'))),
      button('更新本月用量估算', () => run(async () => U(await req('usage')))),
      h(
        'div',
        { className: 'dts-sub' },
        '用量僅記錄本插件提交的字元數，快取不重算；Google 按聲音層級分類。不含其他程式用量，不能取代服務商帳單。',
      ),
      usage
        ? h(
            'pre',
            { style: { maxHeight: 240, overflow: 'auto', whiteSpace: 'pre-wrap' } },
            JSON.stringify(usage, null, 2),
          )
        : null,
    ),
    error ? h('div', { role: 'alert' }, error) : null,
  )
}

// 本機 Xinference 的狀態與動作結果，用使用者看得懂的話說。
// 「auth-required」是正常狀態：服務開了帳號保護，聲音工坊用安裝時存好的本機帳號自動登入。
const XINFERENCE_STATE = {
  stopped: '沒有在執行',
  starting: '啟動中',
  stopping: '停止中',
  running: '執行中',
  'auth-required': '執行中（有帳號保護，聲音工坊會自動登入，不需要你處理）',
  external: '執行中（這是你自己另外啟動的服務，聲音工坊不會接管或停止它）',
  failed: '啟動失敗',
}
const XINFERENCE_RESULT = {
  running: '本機 Xinference 已啟動。接下來請在下面載入模型。',
  'auth-required': '本機 Xinference 已啟動（有帳號保護，聲音工坊已自動登入）。接下來請在下面載入模型。',
  external: '偵測到你自己另外啟動的 Xinference，聲音工坊會直接使用它，不會接管或停止它。',
  stopped: '本機 Xinference 已停止。',
  failed: '本機 Xinference 沒有啟動成功。',
}
/** 由模型名稱產生載入後使用的代號，例如 Qwen3-TTS-12Hz-0.6B-Base → qwen3-tts-12hz-0.6b-base。 */
function localModelUid(name) {
  return (
    String(name || '')
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100) || 'local-model'
  )
}
/** 下拉選單裡每個模型後面的簡短說明。 */
function localModelNote(model) {
  const notes = []
  if (model.cloning) notes.push('可用錄音複製聲音')
  if (model.voiceDesign) notes.push('可用文字描述聲音')
  if (model.emotion) notes.push('可控制情緒')
  if (model.multilingual) notes.push('多語言')
  if (!model.builtin) notes.push('自行註冊')
  return notes.length ? '（' + notes.join('、') + '）' : ''
}
function LocalEnginesEditor(props) {
  const activeRef = React.useRef(true)
  activeRef.current = props.active !== false
  const h = React.createElement,
    draft = props.draft || {},
    setTop = props.setTop
  const [assets, setAssets] = React.useState([]),
    [status, setStatus] = React.useState({}),
    [error, setError] = React.useState(''),
    [result, setResult] = React.useState(''),
    [busy, setBusy] = React.useState(false)
  // 本機 Xinference：目前狀態、正在進行的動作（顯示進度用）、這個區塊自己的最後結果
  const [xin, setXin] = React.useState({}),
    [pending, setPending] = React.useState(null),
    [elapsed, setElapsed] = React.useState(0),
    [xinNote, setXinNote] = React.useState(''),
    [catalog, setCatalog] = React.useState(null),
    [catalogError, setCatalogError] = React.useState(''),
    [manualModel, setManualModel] = React.useState(false),
    [uidEdited, setUidEdited] = React.useState(false),
    [access, setAccess] = React.useState(null),
    [accessError, setAccessError] = React.useState(''),
    [copied, setCopied] = React.useState('')
  const [file, setFile] = React.useState(null),
    [name, setName] = React.useState(''),
    [transcript, setTranscript] = React.useState(''),
    [renames, setRenames] = React.useState({})
  const [modelName, setModelName] = React.useState('Kokoro-82M'),
    [uid, setUid] = React.useState('kokoro-local'),
    [gpus, setGpus] = React.useState(0)
  const mounted = React.useRef(true),
    fileInput = React.useRef(null)
  const request = async (path, method = 'GET', body) => {
    const r = await clientFetch(path, {
      method,
      ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
      timeoutMs: 310000,
    })
    const d = await r.json()
    if (!r.ok || !d.ok) throw Error(d.error?.message || d.error || '操作失敗')
    return d
  }
  const loadAssets = async () => {
    const d = await request('/dsh-sound-atelier/voice/assets')
    if (mounted.current) {
      setAssets(d.assets || [])
      props.onAssets?.(d.assets || [])
    }
  }
  const loadStatus = async () => {
    const d = await request('/dsh-sound-atelier/local/service')
    if (mounted.current) {
      setStatus(d.kokoro || {})
      setXin(d.xinference || {})
    }
  }
  // 服務在執行時，向它要「可以載入的語音模型」清單，給下面的下拉選單用。
  const serviceUp = ['running', 'auth-required', 'external'].includes(xin.state)
  const loadCatalog = async () => {
    try {
      const d = await request('/dsh-sound-atelier/local/service', 'POST', { action: 'available' })
      if (mounted.current) {
        setCatalog(Array.isArray(d.result?.models) ? d.result.models : [])
        setCatalogError('')
      }
    } catch (failure) {
      if (mounted.current) {
        setCatalog(null)
        setCatalogError(String(failure?.message || failure))
      }
    }
  }
  React.useEffect(() => {
    if (serviceUp) loadCatalog()
    else {
      setCatalog(null)
      setCatalogError('')
    }
  }, [serviceUp])
  // 登入資訊只在按下按鈕時才向後端要，顯示兩分鐘後自動收起。
  const showAccess = async () => {
    setAccessError('')
    try {
      const d = await request('/dsh-sound-atelier/local/access', 'POST', {})
      if (mounted.current) setAccess(d.access)
    } catch (failure) {
      if (mounted.current) setAccessError(String(failure?.message || failure))
    }
  }
  React.useEffect(() => {
    if (!access) return undefined
    const timer = setTimeout(() => setAccess(null), 120000)
    return () => clearTimeout(timer)
  }, [access])
  const copyValue = async (label, value) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label)
      setTimeout(() => mounted.current && setCopied(''), 1500)
    } catch {
      setCopied('無法自動複製，請手動選取')
    }
  }
  const accessRow = (label, value) =>
    h(
      'div',
      { className: 'dts-access-row', key: label },
      h('span', null, label),
      h('code', { 'data-ui-verbatim': '1', 'data-xinference-secret': label }, value || '（沒有）'),
      value
        ? h('button', { type: 'button', className: 'dts-btn', onClick: () => copyValue(label, value) }, copied === label ? '已複製' : '複製')
        : null,
    )
  // 選了模型就自動產生代號（小寫、只留英數與連字號）；使用者自己改過代號之後不再覆蓋。
  const chooseModel = (name) => {
    setModelName(name)
    if (!uidEdited) setUid(localModelUid(name))
  }
  // 啟動服務要等幾十秒：每秒更新一次已等待的時間，讓人知道它還在跑。
  React.useEffect(() => {
    if (!pending) return undefined
    setElapsed(0)
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - pending.at) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [pending])
  React.useEffect(() => {
    mounted.current = true
    loadAssets().catch(() => {})
    loadStatus().catch(() => {})
    const timer = setInterval(() => document.hidden || !activeRef.current || loadStatus().catch(() => {}), 5000)
    return () => {
      mounted.current = false
      clearInterval(timer)
    }
  }, [])
  const run = async (action) => {
    if (busy) return
    setBusy(true)
    setError('')
    setResult('')
    try {
      await action()
    } catch (e) {
      if (mounted.current) setError(e.message)
    } finally {
      if (mounted.current) setBusy(false)
    }
  }
  const upload = () =>
    run(async () => {
      if (!file || file.size > 10 * 1024 * 1024) throw Error('請選擇不超過 10 MiB 的錄音檔。')
      const bytes = new Uint8Array(await file.arrayBuffer())
      let binary = ''
      for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768))
      await request('/dsh-sound-atelier/voice/assets', 'POST', { name: name || file.name, transcript, sample: btoa(binary) })
      await loadAssets()
      setFile(null)
      if (fileInput.current) fileInput.current.value = ''
      setName('')
      setTranscript('')
      setResult('錄音已透過解碼檢查，可作為參考；尚未訓練或建立遠端聲音。')
    })
  const operate = (action, input) =>
    run(async () => {
      if (action === 'launch') {
        await request('/dsh-sound-atelier/maintenance', 'POST', { action, input })
        setResult('背景載入已開始；可在背景工作面板檢視或取消。')
        return
      }
      const service = ['start-service', 'stop-service', 'list', 'unload'].includes(action)
      if (service) {
        setXinNote('')
        setPending({ action, at: Date.now() })
      }
      let d
      try {
        d = await request('/dsh-sound-atelier/local/service', 'POST', { action, input })
      } catch (failure) {
        const message = String(failure?.message || failure)
        const friendly = /Install the isolated Xinference/.test(message)
          ? '還沒有安裝本機 Xinference 環境，請先在「本機工作室」安裝。'
          : message
        if (service && mounted.current) setXinNote('沒有成功：' + friendly)
        throw Error(friendly)
      } finally {
        if (service && mounted.current) setPending(null)
      }
      const r = d.result || {}
      if (service && mounted.current)
        setXinNote(
          action === 'list'
            ? Array.isArray(r.data) && r.data.length
              ? '已載入 ' + r.data.length + ' 個模型：' + r.data.map((m) => m.model_name || m.id).join('、')
              : '服務正常，目前沒有載入任何模型。請在下面填模型名稱後按「載入指定模型」。'
            : action === 'unload'
              ? '模型已從記憶體卸下，下載的模型檔保留。'
              : XINFERENCE_RESULT[r.state] || '',
        )
      if (Array.isArray(r.data))
        setResult(
          r.data.length
            ? '已載入模型：\n' + r.data.map((m) => (m.model_name || m.id) + ' · UID: ' + m.id).join('\n')
            : '目前沒有已載入模型。',
        )
      else if (r.model_uid) setResult('模型已載入：' + r.model_uid + '。請再試聽驗證合成。')
      else if (r.unloaded) setResult('模型已從記憶體卸下，下載的模型檔保留。')
      else if (r.state)
        setResult(
          '狀態：' +
            ({
              unloaded: '已從記憶體卸下',
              loaded: '模型已載入，尚未驗證合成',
              verified: '已成功合成',
              ...XINFERENCE_RESULT,
            }[r.state] || r.state),
        )
      else setResult('操作完成。')
      await loadStatus()
    })
  const input = (key, label, placeholder) =>
    h(
      'label',
      { className: 'dts-field' },
      label,
      h('input', {
        className: 'dts-input',
        'aria-label': label,
        value: draft[key] || '',
        placeholder,
        disabled: !props.writable,
        onChange: (e) => setTop(key, e.target.value),
      }),
    )
  const familyOptions = [
    ['', '依模型 UID 判斷'],
    ['kokoro', 'Kokoro'],
    ['f5', 'F5-TTS'],
    ['qwen3', 'Qwen3-TTS'],
    ['index2', 'IndexTTS2'],
    ['index2.5', 'IndexTTS 2.5'],
    ['breeze', 'Breeze-TTS-2'],
    ['fish', 'Fish S2 / FishSpeech'],
    ['irodori', 'Irodori'],
    ['cosyvoice', 'CosyVoice'],
    ['generic', '基本 Speech API'],
  ]
  return h(
    'div',
    { className: 'dts-block', 'data-dsh-tts-local': '1' },
    h('div', { className: 'dts-h' }, '本機模型與參考音色'),
    props.boolField('streamingEnabled', props.t('streamingEnabled'), props.t('streamingEnabledHint')),
    h(
      'div',
      { className: 'dts-sub' },
      '錄音上傳、模型載入、成功產生語音是不同狀態。本機環境與 DSH 分開；雲端服務只有在明確選用該服務合成時才收到參考錄音。變更設定後先儲存。',
    ),
    h(
      'label',
      { className: 'dts-field' },
      '本機服務類型',
      h(
        'select',
        {
          className: 'dts-input',
          'aria-label': '本機服務類型',
          value: draft.localTtsBackend || 'xinference',
          disabled: !props.writable,
          onChange: (e) => setTop('localTtsBackend', e.target.value),
        },
        h('option', { value: 'xinference' }, 'Xinference'),
        h('option', { value: 'gpt-sovits' }, 'GPT-SoVITS 原生 API'),
        h('option', { value: 'dots-native' }, 'dots.tts 獨立原生'),
        h('option', { value: 'index-native' }, 'Index 獨立原生（完整情緒）'),
      ),
    ),
    input('localTtsBaseUrl', '本機服務地址', 'http://127.0.0.1:9997'),
    h(
      'label',
      { className: 'dts-field' },
      '閒置多久後釋放本機模型（秒）',
      h('input', {
        className: 'dts-input',
        type: 'number',
        min: 0,
        max: 86400,
        step: 30,
        'aria-label': '閒置多久後釋放本機模型（秒）',
        value: draft.localTtsIdleSeconds ?? 300,
        disabled: !props.writable,
        onChange: (e) => setTop('localTtsIdleSeconds', Math.max(0, Math.min(86400, Number(e.target.value) || 0))),
      }),
      h('span', { className: 'dts-sub' }, '由插件啟動的本機模型閒置超過這個時間就釋放記憶體，下次使用時重新載入。預設 300 秒；0 表示不自動釋放。'),
    ),
    h(
      'label',
      { className: 'dts-field' },
      '本機模型家族',
      h(
        'select',
        {
          className: 'dts-input',
          'aria-label': '本機模型家族',
          value: draft.localTtsFamily || '',
          disabled: !props.writable,
          onChange: (e) => setTop('localTtsFamily', e.target.value),
        },
        familyOptions.map(([id, label]) => h('option', { key: id, value: id }, label)),
      ),
    ),
    h(
      'div',
      { className: 'dts-sub' },
      '在降級鏈選「本機 TTS 服務」，模型欄填已啟動的模型 UID；UID 若是自訂名稱，請在此指定家族。各模型的進階參數放在 providerOptions 的 local-tts.native；不會把不支援的欄位偷偷忽略。',
    ),
    draft.localTtsBackend === 'gpt-sovits'
      ? h(
          React.Fragment,
          null,
          input('localTtsPromptLanguage', 'GPT-SoVITS 參考語言', 'zh'),
          input('localTtsLanguage', 'GPT-SoVITS 文字語言', 'auto'),
          h('div', { className: 'dts-sub' }, '需與 DSH 同機執行，直接使用已驗證錄音的本機路徑；參考逐字稿必填。'),
        )
      : null,
    h(
      'label',
      { className: 'dts-field' },
      '目前參考錄音',
      h(
        'select',
        {
          className: 'dts-input',
          'aria-label': '目前參考錄音',
          value: draft.localTtsReferenceAsset || '',
          disabled: !props.writable,
          onChange: (e) => setTop('localTtsReferenceAsset', e.target.value),
        },
        h('option', { value: '' }, '不使用參考錄音'),
        assets.map((a) =>
          h('option', { key: a.id, value: a.id }, a.name + ' · ' + Number(a.duration).toFixed(1) + ' 秒'),
        ),
      ),
    ),
    h(
      'details',
      null,
      h('summary', null, '新增／管理參考錄音'),
      h(
        'div',
        {
          className: 'dts-field',
          onDragOver: (e) => e.preventDefault(),
          onDrop: (e) => {
            e.preventDefault()
            setFile(e.dataTransfer.files[0] || null)
          },
        },
        h(
          'label',
          null,
          '參考錄音檔案',
          h('input', {
            type: 'file',
            ref: fileInput,
            accept: 'audio/*',
            'aria-label': '參考錄音檔案',
            disabled: busy,
            onChange: (e) => setFile(e.target.files[0] || null),
          }),
        ),
        h(
          'span',
          { className: 'dts-sub' },
          file ? file.name : '可拖放音訊；會檢查解碼、長度及近乎靜音，不會因上傳完成就標示為已克隆。',
        ),
      ),
      h(
        'label',
        { className: 'dts-field' },
        '錄音名稱',
        h('input', {
          className: 'dts-input',
          'aria-label': '錄音名稱',
          value: name,
          onChange: (e) => setName(e.target.value),
        }),
      ),
      h(
        'label',
        { className: 'dts-field' },
        '錄音逐字稿',
        h('textarea', {
          className: 'dts-input',
          'aria-label': '錄音逐字稿',
          rows: 3,
          value: transcript,
          onChange: (e) => setTranscript(e.target.value),
          placeholder: '填錄音裡實際說出的原話；F5、Qwen、Breeze 等需要。',
        }),
      ),
      h('button', { type: 'button', className: 'dts-btn', disabled: busy || !file, onClick: upload }, '上傳並驗證錄音'),
      h(
        'button',
        { type: 'button', className: 'dts-btn', disabled: busy, onClick: () => run(loadAssets) },
        '重新整理錄音與驗證紀錄',
      ),
      assets.map((a) =>
        h(
          'div',
          { className: 'dts-entry', key: a.id },
          h(
            'div',
            { className: 'dts-sub' },
            a.name +
              ' · 已驗證參考檔 · ' +
              Number(a.duration).toFixed(2) +
              ' 秒 · ' +
              (a.bindings?.length ? '已有 ' + a.bindings.length + ' 組合成成功紀錄' : '尚未以模型成功合成'),
          ),
          h('input', {
            className: 'dts-input',
            'aria-label': '重新命名 ' + a.name,
            value: renames[a.id] ?? a.name,
            onChange: (e) => setRenames((v) => ({ ...v, [a.id]: e.target.value })),
          }),
          h('textarea', {
            className: 'dts-input',
            'aria-label': '修改逐字稿 ' + a.name,
            rows: 2,
            value: renames[a.id + ':transcript'] ?? a.transcript ?? '',
            onChange: (e) => setRenames((v) => ({ ...v, [a.id + ':transcript']: e.target.value })),
          }),
          h(
            'button',
            {
              type: 'button',
              className: 'dts-btn',
              disabled: busy,
              onClick: () =>
                run(async () => {
                  await request('/dsh-sound-atelier/voice/assets', 'PATCH', {
                    id: a.id,
                    name: renames[a.id] ?? a.name,
                    transcript: renames[a.id + ':transcript'] ?? a.transcript ?? '',
                  })
                  await loadAssets()
                }),
            },
            '儲存名稱／逐字稿',
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dts-btn',
              disabled: busy,
              onClick: () =>
                run(async () => {
                  const r = await clientFetch('/dsh-sound-atelier/voice/reference?id=' + encodeURIComponent(a.id))
                  if (!r.ok) throw Error('無法讀取參考音訊')
                  const b = new Uint8Array(await r.arrayBuffer())
                  let text = ''
                  for (let i = 0; i < b.length; i += 32768) text += String.fromCharCode(...b.subarray(i, i + 32768))
                  playAudioItem({
                    kind: 'speech',
                    text: a.name,
                    audioBase64: btoa(text),
                    mime: 'audio/wav',
                    sessionId: player.sessionId,
                  })
                }),
            },
            '播放原始參考',
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dts-btn',
              disabled: busy,
              onClick: () =>
                run(async () => {
                  await request('/dsh-sound-atelier/voice/assets', 'DELETE', { id: a.id })
                  if (draft.localTtsReferenceAsset === a.id) setTop('localTtsReferenceAsset', '')
                  await loadAssets()
                }),
            },
            '刪除本機錄音',
          ),
        ),
      ),
    ),
    h(
      'details',
      null,
      h('summary', null, 'Kokoro 獨立 CPU runtime'),
      h(
        'div',
        { className: 'dts-sub' },
        '狀態：' +
          ({
            unloaded: '未載入',
            loading: '載入中',
            loaded: '模型已載入，尚未驗證合成',
            verified: '本次程式已成功合成',
            failed: '失敗',
          }[status.state] || '尚未取得') +
          '；套件：' +
          (status.packageInstalled ? '已安裝' : '未安裝') +
          '。此輕量 runtime 僅英文；中文可使用 Xinference 的中文模型。閒置五分鐘自動從記憶體卸下，取消正在進行的推理會停止 worker。',
      ),
      h(
        'button',
        { type: 'button', className: 'dts-btn', disabled: busy, onClick: () => operate('kokoro-load') },
        '載入 Kokoro（首次下載模型）',
      ),
      h(
        'button',
        {
          type: 'button',
          className: 'dts-btn',
          disabled: busy,
          onClick: () =>
            run(async () => {
              await previewSpeech(
                'kokoro',
                '',
                'af_heart',
                'This is a complete local speech test. The final sentence should finish clearly.',
              )
              await loadStatus()
            }),
        },
        'Kokoro 真實合成試聽',
      ),
      h(
        'button',
        { type: 'button', className: 'dts-btn', disabled: busy, onClick: () => operate('kokoro-unload') },
        '從記憶體卸下 Kokoro',
      ),
    ),
    h(
      'details',
      null,
      h('summary', null, 'Xinference 模型載入／卸下'),
      h(
        'div',
        { className: 'dts-sub', role: 'status', 'data-xinference-state': xin.state || 'unknown' },
        '本機 Xinference：' +
          (xin.packageInstalled === false
            ? '尚未安裝，請先在「本機工作室」安裝'
            : (XINFERENCE_STATE[xin.state] || '尚未取得狀態') + (xin.state === 'failed' && xin.error ? '：' + xin.error : '')) +
          (xin.version ? '　·　版本 ' + xin.version : ''),
      ),
      h(
        'button',
        {
          type: 'button',
          className: 'dts-btn',
          'data-action': 'xinference-start',
          disabled: busy || ['running', 'auth-required', 'external', 'starting'].includes(xin.state),
          onClick: () => operate('start-service'),
        },
        pending?.action === 'start-service' ? '啟動中…' : '啟動本機 Xinference',
      ),
      h(
        'button',
        {
          type: 'button',
          className: 'dts-btn',
          'data-action': 'xinference-stop',
          disabled: busy || !['running', 'auth-required'].includes(xin.state),
          onClick: () => operate('stop-service'),
        },
        pending?.action === 'stop-service' ? '停止中…' : '停止由插件啟動的 Xinference',
      ),
      pending?.action === 'start-service'
        ? h(
            'div',
            { className: 'dts-sub', role: 'status', 'data-xinference-progress': '1' },
            '正在啟動本機 Xinference，已等待 ' + elapsed + ' 秒。通常需要 30 到 60 秒，第一次可能更久；啟動完成前請不要重複按，也不用重新整理。',
          )
        : null,
      xinNote ? h('div', { className: 'dts-sub', role: 'status', 'data-xinference-note': '1' }, xinNote) : null,
      h(
        'div',
        { className: 'dts-access' },
        serviceUp
          ? h(
              'a',
              {
                className: 'dts-btn',
                'data-action': 'xinference-open',
                href: (xin.origin || 'http://127.0.0.1:9997') + '/',
                target: '_blank',
                rel: 'noopener noreferrer',
              },
              '開啟 Xinference 自己的管理介面',
            )
          : h('button', { type: 'button', className: 'dts-btn', 'data-action': 'xinference-open', disabled: true }, '開啟 Xinference 自己的管理介面'),
        h(
          'button',
          { type: 'button', className: 'dts-btn', 'data-action': 'xinference-access', onClick: access ? () => setAccess(null) : showAccess },
          access ? '隱藏登入資訊' : '顯示登入資訊',
        ),
      ),
      h(
        'div',
        { className: 'dts-sub' },
        'Xinference 有自己的網頁管理介面，可以在那裡看模型、下載進度與記錄；打開後要登入。聲音工坊安裝時已經替你建立帳號，按「顯示登入資訊」就能看到帳號、密碼與 API 金鑰。服務沒在執行時介面打不開，請先啟動。',
      ),
      accessError ? h('div', { role: 'alert', 'data-xinference-access-error': '1' }, accessError) : null,
      access
        ? h(
            'div',
            { className: 'dts-access-box', 'data-xinference-access-box': '1' },
            h('strong', null, '本機 Xinference 的登入資訊'),
            accessRow('網址', access.uiUrl),
            accessRow('管理員帳號', access.admin?.username),
            accessRow('管理員密碼', access.admin?.password),
            accessRow('API 金鑰', access.apiKey),
            h(
              'details',
              null,
              h('summary', null, '聲音工坊自己用的帳號（一般用不到）'),
              accessRow('帳號', access.client?.username),
              accessRow('密碼', access.client?.password),
            ),
            h(
              'div',
              { className: 'dts-sub' },
              '登入管理介面用「管理員帳號」和「管理員密碼」；其他程式要連這個服務時用「API 金鑰」。這組資料只對你電腦上的這個服務有效，請不要貼給別人，也不要貼到聊天對話裡。兩分鐘後會自動收起。',
            ),
          )
        : null,
      h(
        'div',
        { className: 'dts-sub' },
        '用法：先按「啟動本機 Xinference」（要等 30 到 60 秒），再填模型名稱按「載入指定模型」。第一次載入某個模型會下載模型檔，可能很大、要等很久。服務啟動或模型載入成功，都不代表合成一定沒問題，請載入後試聽一次。「卸下」只是把模型從記憶體放掉，不會刪除下載好的模型檔。',
      ),
      h(
        'button',
        { type: 'button', className: 'dts-btn', disabled: busy, onClick: () => operate('list') },
        '查詢已載入模型',
      ),
      h(
        'label',
        { className: 'dts-field' },
        '要載入的模型',
        catalog && catalog.length && !manualModel
          ? h(
              'select',
              {
                className: 'dts-input',
                'aria-label': '要載入的模型',
                'data-xinference-models': String(catalog.length),
                value: catalog.some((m) => m.name === modelName) ? modelName : '',
                onChange: (e) => (e.target.value === '__manual__' ? setManualModel(true) : chooseModel(e.target.value)),
              },
              catalog.some((m) => m.name === modelName) ? null : h('option', { value: '' }, '請選擇模型…'),
              h(
                'optgroup',
                { label: '聲音工坊已適配（可以用參考錄音、語氣等進階功能）' },
                catalog.filter((m) => m.adapted).map((m) => h('option', { key: m.name, value: m.name }, m.name + localModelNote(m))),
              ),
              h(
                'optgroup',
                { label: '其他模型（只用基本合成，未個別適配）' },
                catalog.filter((m) => !m.adapted).map((m) => h('option', { key: m.name, value: m.name }, m.name + localModelNote(m))),
              ),
              h('option', { value: '__manual__' }, '清單裡沒有，我要自己輸入名稱…'),
            )
          : h('input', {
              className: 'dts-input',
              'aria-label': '要載入的模型',
              value: modelName,
              placeholder: '例如 Kokoro-82M',
              onChange: (e) => chooseModel(e.target.value),
            }),
      ),
      h(
        'div',
        { className: 'dts-sub', 'data-xinference-models-hint': '1' },
        catalog && catalog.length && !manualModel
          ? '清單來自你的 Xinference，共 ' + catalog.length + ' 個語音合成模型。第一次載入某個模型會下載模型檔。'
          : manualModel
            ? h(
                React.Fragment,
                null,
                '請輸入 Xinference 的模型名稱（大小寫要一致）。',
                h('button', { type: 'button', className: 'dts-btn', onClick: () => setManualModel(false) }, '改回從清單選'),
              )
            : serviceUp
              ? catalogError
                ? h(
                    React.Fragment,
                    null,
                    '讀不到模型清單（' + catalogError + '），可以先自己輸入名稱。',
                    h('button', { type: 'button', className: 'dts-btn', onClick: loadCatalog }, '重新讀取清單'),
                  )
                : '正在讀取模型清單…'
              : '啟動本機 Xinference 之後，這裡會變成下拉選單，列出它提供的模型。',
      ),
      h(
        'label',
        { className: 'dts-field' },
        '載入後的代號',
        h('input', {
          className: 'dts-input',
          'aria-label': '本機模型 UID',
          value: uid,
          onChange: (e) => {
            setUidEdited(true)
            setUid(e.target.value)
          },
        }),
      ),
      h('div', { className: 'dts-sub' }, '代號會自動依模型名稱產生，之後在「語音來源」選這個代號來使用；一般不用改。'),
      h(
        'label',
        { className: 'dts-field' },
        '執行裝置',
        h(
          'select',
          { className: 'dts-input', value: gpus, onChange: (e) => setGpus(Number(e.target.value)) },
          h('option', { value: 0 }, 'CPU'),
          h('option', { value: 1 }, '單張 GPU（模型需相容）'),
        ),
      ),
      h(
        'button',
        {
          type: 'button',
          className: 'dts-btn',
          disabled: busy,
          onClick: () => operate('launch', { name: modelName, uid, gpus }),
        },
        '載入指定模型（可能下載）',
      ),
      h(
        'button',
        { type: 'button', className: 'dts-btn', disabled: busy, onClick: () => operate('unload', { uid }) },
        '從記憶體卸下指定模型',
      ),
    ),
    h(LocalStudioManager, { active: props.active, draft, setTop, writable: props.writable, boolField: props.boolField, assets }),
    busy ? h('div', { className: 'dts-sub' }, '處理中…') : null,
    error ? h('div', { role: 'alert' }, error) : null,
    result
      ? h(
          'pre',
          { style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 240, overflow: 'auto' } },
          result,
        )
      : null,
  )
}
