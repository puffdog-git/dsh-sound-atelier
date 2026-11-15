// 本機模型「快速上手」：把分散在各處的動作串成四個步驟，照順序一次只做一件事。
//   1 安裝本機環境 → 2 啟動服務（順便建立本機帳號）→ 3 選模型並載入 → 4 試聽並設為語音來源
// 這裡只呼叫既有的接口，不新增任何能力；完整的個別控制仍在下面的進階區塊。
const QUICK_PREVIEW_TEXT = '你好，這是本機模型的試聽。Hello, this is a local voice test.'

function quickStepState(done, current) {
  return done ? 'done' : current ? 'current' : 'todo'
}

function LocalQuickStart(props) {
  const h = React.createElement
  const activeRef = React.useRef(true)
  activeRef.current = props.active !== false
  const mounted = React.useRef(true)
  const [service, setService] = React.useState(null)
  const [jobs, setJobs] = React.useState([])
  const [loaded, setLoaded] = React.useState(null)
  const [catalog, setCatalog] = React.useState(null)
  const [model, setModel] = React.useState('')
  const [useGpu, setUseGpu] = React.useState(true)
  const [pending, setPending] = React.useState(null)
  const [elapsed, setElapsed] = React.useState(0)
  const [note, setNote] = React.useState('')
  const [error, setError] = React.useState('')
  const [watch, setWatch] = React.useState(null)

  const request = async (path, method = 'GET', body) => {
    const response = await clientFetch('/dsh-sound-atelier/' + path, {
      method,
      ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
      timeoutMs: 310000,
    })
    const data = await response.json()
    if (!response.ok || !data.ok) throw Error(data.error?.message || data.error || '操作失敗')
    return data
  }
  const xin = service?.xinference || {}
  const serviceUp = ['running', 'auth-required', 'external'].includes(xin.state)
  const hasAccount = service?.account === true
  const canManage = serviceUp && (hasAccount || xin.state === 'running' || xin.state === 'external')

  const refresh = async () => {
    const [status, maintenance] = await Promise.all([request('local/service'), request('maintenance')])
    if (!mounted.current) return
    setService(status)
    setJobs(maintenance.jobs || [])
  }
  const refreshModels = async () => {
    try {
      const [list, available] = await Promise.all([
        request('local/service', 'POST', { action: 'list' }),
        catalog ? Promise.resolve(null) : request('local/service', 'POST', { action: 'available' }),
      ])
      if (!mounted.current) return
      setLoaded(Array.isArray(list.result?.data) ? list.result.data : [])
      if (available) setCatalog(Array.isArray(available.result?.models) ? available.result.models : [])
    } catch {
      if (mounted.current) setLoaded(null)
    }
  }
  React.useEffect(() => {
    mounted.current = true
    refresh().catch(() => {})
    const timer = setInterval(() => document.hidden || !activeRef.current || refresh().catch(() => {}), 3000)
    return () => {
      mounted.current = false
      clearInterval(timer)
    }
  }, [])
  React.useEffect(() => {
    if (canManage) refreshModels()
    else {
      setLoaded(null)
      setCatalog(null)
    }
  }, [canManage])
  React.useEffect(() => {
    if (!pending) return undefined
    setElapsed(0)
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - pending.at) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [pending])

  // 背景工作（安裝環境、建立帳號、載入模型）：記住這次啟動的工作，從工作清單讀進度。
  const job = watch ? jobs.find((item) => item.id === watch.id) : null
  React.useEffect(() => {
    if (!watch || !job || ['running', 'cancelling'].includes(job.state)) return
    setPending(null)
    setWatch(null)
    if (job.state === 'complete') {
      setNote(watch.done)
      setError('')
      refresh().catch(() => {})
      if (watch.kind !== 'install') refreshModels()
    } else if (job.state === 'cancelled') setNote('已取消。')
    else setError(watch.label + '沒有成功：' + quickFriendlyError(job.error))
  }, [watch, job?.state])

  const startJob = async (kind, body, label, done) => {
    setError('')
    setNote('')
    setPending({ kind, at: Date.now(), label })
    try {
      const data = await request('maintenance', 'POST', body)
      if (mounted.current) setWatch({ id: data.job.id, kind, label, done })
      await refresh()
    } catch (failure) {
      if (mounted.current) {
        setPending(null)
        setError(label + '沒有成功：' + quickFriendlyError(failure.message))
      }
    }
  }
  const cancelJob = async () => {
    if (!watch) return
    try {
      await request('maintenance', 'DELETE', { id: watch.id })
    } catch {
      /* 工作已經結束 */
    }
  }

  const install = () =>
    startJob(
      'install',
      { action: 'install', backend: 'xinference', device: useGpu ? 'cu128' : 'cpu' },
      '安裝本機環境',
      '本機環境安裝完成。接下來請啟動服務。',
    )
  const provision = () => startJob('provision', { action: 'provision' }, '建立本機帳號', '本機帳號已建立，聲音工坊之後會自動登入。接下來請選模型。')
  const startService = async () => {
    setError('')
    setNote('')
    setPending({ kind: 'start', at: Date.now(), label: '啟動本機服務' })
    try {
      const data = await request('local/service', 'POST', { action: 'start-service' })
      await refresh()
      if (!mounted.current) return
      setPending(null)
      const state = data.result?.state
      if (state === 'external') setNote('偵測到你自己另外啟動的服務，聲音工坊會直接使用它。')
      else setNote('服務已啟動。')
    } catch (failure) {
      if (mounted.current) {
        setPending(null)
        setError('啟動本機服務沒有成功：' + quickFriendlyError(failure.message))
      }
    }
  }
  const uid = localModelUid(model)
  const loadModel = () =>
    startJob(
      'launch',
      { action: 'launch', input: { name: model, uid, gpus: useGpu ? 1 : 0 } },
      '載入模型',
      '模型已載入。接下來請試聽，沒問題就設為語音來源。',
    )
  const loadedIds = (loaded || []).map((item) => item.id)
  const readyUid = loadedIds.includes(uid) ? uid : loadedIds[0] || ''
  const chain = Array.isArray(props.draft?.chain) ? props.draft.chain : []
  const inUse = Boolean(readyUid) && chain[0]?.provider === 'local-tts' && chain[0]?.model === readyUid
  const preview = async () => {
    setError('')
    setNote('正在合成試聽…')
    try {
      await previewSpeech('local-tts', readyUid, '', QUICK_PREVIEW_TEXT)
      if (mounted.current) setNote('試聽已送出。聽起來沒問題的話，按右邊設為語音來源。')
    } catch (failure) {
      if (mounted.current) {
        setNote('')
        setError('試聽沒有成功：' + quickFriendlyError(failure.message))
      }
    }
  }
  const useAsSource = async () => {
    setError('')
    const rest = chain.filter((row) => !(row.provider === 'local-tts' && row.model === readyUid))
    await props.save({ chain: [{ provider: 'local-tts', model: readyUid }, ...rest], localTtsBackend: 'xinference' })
    if (mounted.current) setNote('已設為主要語音來源並儲存。原本的語音服務排在後面當備援。')
  }

  const installed = xin.packageInstalled === true || xin.state === 'external'
  const step1 = installed
  const step2 = serviceUp && (hasAccount || xin.state !== 'auth-required')
  const step3 = Boolean(readyUid)
  const step4 = inUse
  const busy = Boolean(pending)
  const progress = pending
    ? h(
        'div',
        { className: 'dts-quick-progress', role: 'status', 'data-quick-progress': pending.kind },
        pending.label + '中，已等待 ' + elapsed + ' 秒。' + QUICK_WAIT_HINT[pending.kind],
        job?.lines?.length ? h('div', { className: 'dts-quick-log', 'data-ui-verbatim': '1' }, job.lines[job.lines.length - 1]) : null,
        watch ? h('button', { type: 'button', className: 'dts-btn', onClick: cancelJob }, '取消') : null,
      )
    : null
  const step = (index, title, state, summary, body) =>
    h(
      'li',
      { className: 'dts-quick-step', 'data-quick-step': String(index), 'data-state': state, key: index },
      h(
        'div',
        { className: 'dts-quick-head' },
        h('span', { className: 'dts-quick-number', 'aria-hidden': 'true' }, state === 'done' ? '✓' : String(index)),
        h('strong', null, title),
        h('span', { className: 'dts-quick-status' }, summary),
      ),
      state === 'todo' ? null : h('div', { className: 'dts-quick-body' }, body),
    )
  const deviceChoice = h(
    'label',
    { className: 'dts-quick-inline' },
    '這台電腦有 NVIDIA 顯示卡',
    h('input', { type: 'checkbox', checked: useGpu, disabled: busy, 'data-quick-gpu': '1', onChange: (e) => setUseGpu(e.target.checked) }),
  )

  if (!service)
    return h('div', { className: 'dts-quick', 'data-local-quickstart': 'loading' }, h('strong', null, '本機模型快速上手'), h('div', { className: 'dts-sub' }, '正在檢查本機環境…'))

  return h(
    'div',
    { className: 'dts-quick', 'data-local-quickstart': step4 ? 'done' : step3 ? '4' : step2 ? '3' : step1 ? '2' : '1' },
    h('strong', { className: 'dts-quick-title' }, '本機模型快速上手'),
    h(
      'div',
      { className: 'dts-sub' },
      '想讓語音在自己電腦上合成、不送到雲端，照下面四步做就可以。只想快點有聲音的話不需要這些：內建的 Edge 線上語音免安裝、免費。',
    ),
    h(
      'ol',
      { className: 'dts-quick-steps' },
      step(
        1,
        '安裝本機環境',
        quickStepState(step1, true),
        step1 ? '已安裝' + (xin.version ? '（Xinference ' + xin.version + '）' : '') : '尚未安裝',
        step1
          ? '只需要安裝一次。'
          : h(
              React.Fragment,
              null,
              h('div', null, '會下載 Xinference 和它需要的套件，放在獨立的資料夾，不影響電腦上其他程式。檔案有好幾 GB，依網路速度可能要十分鐘以上；目前只支援 Windows。'),
              deviceChoice,
              h('div', { className: 'dts-sub' }, '有 NVIDIA 顯示卡請勾選，合成會快很多；沒有或不確定就取消勾選，用 CPU 也能跑小模型。'),
              h('button', { type: 'button', className: 'dts-btn dts-quick-primary', 'data-quick-action': 'install', disabled: busy, onClick: install }, '安裝本機環境'),
            ),
      ),
      step(
        2,
        '啟動服務',
        quickStepState(step2, step1),
        !step1 ? '先完成上一步' : step2 ? '執行中' : serviceUp ? '執行中，還沒建立本機帳號' : XINFERENCE_STATE[xin.state] || '沒有在執行',
        step2
          ? '每次重新開機或重啟 DSH 之後要再啟動一次。不用的時候可以到下面的進階區塊停止它，把記憶體還給電腦。'
          : serviceUp
            ? h(
                React.Fragment,
                null,
                h('div', null, '服務需要一組本機帳號才能管理模型。按下面的按鈕，聲音工坊會自動建立並保存在這台電腦上，之後不用再處理。'),
                h('button', { type: 'button', className: 'dts-btn dts-quick-primary', 'data-quick-action': 'provision', disabled: busy, onClick: provision }, '建立本機帳號'),
              )
            : h(
                React.Fragment,
                null,
                h('div', null, '啟動大約需要 30 到 60 秒，按一次就好。'),
                h('button', { type: 'button', className: 'dts-btn dts-quick-primary', 'data-quick-action': 'start', disabled: busy, onClick: startService }, '啟動本機服務'),
              ),
      ),
      step(
        3,
        '選模型並載入',
        quickStepState(step3, step2),
        !step2 ? '先完成上一步' : step3 ? '已載入：' + loadedIds.join('、') : '還沒有載入模型',
        h(
          React.Fragment,
          null,
          step3 ? h('div', null, '想換模型可以再載入另一個；模型很佔記憶體，不用的可以到進階區塊卸下。') : null,
          h(
            'label',
            { className: 'dts-field' },
            '模型',
            h(
              'select',
              { className: 'dts-input', 'aria-label': '快速上手的模型', 'data-quick-models': catalog ? String(catalog.length) : 'loading', value: model, disabled: busy || !catalog, onChange: (e) => setModel(e.target.value) },
              h('option', { value: '' }, catalog ? '請選擇模型…' : '正在讀取模型清單…'),
              h(
                'optgroup',
                { label: '聲音工坊已適配' },
                (catalog || []).filter((m) => m.adapted).map((m) => h('option', { key: m.name, value: m.name }, m.name + localModelNote(m))),
              ),
              h(
                'optgroup',
                { label: '其他模型（只用基本合成）' },
                (catalog || []).filter((m) => !m.adapted).map((m) => h('option', { key: m.name, value: m.name }, m.name + localModelNote(m))),
              ),
            ),
          ),
          h(
            'div',
            { className: 'dts-sub' },
            '不知道選哪個：Kokoro-82M 最小、載入最快，但只有英文；要中文可以試 CosyVoice 或 Qwen3-TTS，檔案比較大，建議有顯示卡。F5-TTS 和 IndexTTS 要先在下面準備一段參考錄音才能用。',
          ),
          deviceChoice,
          h(
            'button',
            { type: 'button', className: 'dts-btn dts-quick-primary', 'data-quick-action': 'load', disabled: busy || !model || loadedIds.includes(uid), onClick: loadModel },
            loadedIds.includes(uid) ? '這個模型已經載入' : '載入模型',
          ),
          h('div', { className: 'dts-sub' }, '第一次載入某個模型會先下載模型檔，可能要等很久；之後再載入就快了。'),
        ),
      ),
      step(
        4,
        '試聽並設為語音來源',
        quickStepState(step4, step3),
        !step3 ? '先完成上一步' : step4 ? '目前正在使用：' + readyUid : '已載入，還沒設為語音來源',
        h(
          React.Fragment,
          null,
          h('div', null, step4 ? '現在朗讀會優先用這個本機模型，失敗時改用排在後面的語音服務。' : '先試聽確認聲音正常，再設為主要語音來源。原本的語音服務會保留在後面當備援。'),
          h(
            'div',
            { className: 'dts-quick-actions' },
            h('button', { type: 'button', className: 'dts-btn', 'data-quick-action': 'preview', disabled: busy, onClick: preview }, '▶ 試聽'),
            h(
              'button',
              { type: 'button', className: 'dts-btn dts-quick-primary', 'data-quick-action': 'use', disabled: busy || step4 || !props.writable || typeof props.save !== 'function', onClick: useAsSource },
              step4 ? '已經是主要語音來源' : '設為主要語音來源並儲存',
            ),
          ),
        ),
      ),
    ),
    progress,
    note ? h('div', { className: 'dts-quick-note', role: 'status', 'data-quick-note': '1' }, note) : null,
    error ? h('div', { className: 'dts-quick-error', role: 'alert', 'data-quick-error': '1' }, error) : null,
  )
}

const QUICK_WAIT_HINT = {
  install: '要下載好幾 GB，請讓它跑完，這個頁面可以先切到別的地方。',
  start: '通常需要 30 到 60 秒，請不要重複按。',
  provision: '通常幾秒內完成。',
  launch: '第一次載入會下載模型檔，可能要幾分鐘到幾十分鐘。',
}

/** 把後端的英文錯誤換成看得懂的說明；不認得的原樣顯示。 */
function quickFriendlyError(message) {
  const text = String(message || '未知錯誤')
  const table = [
    [/Install the isolated Xinference/, '還沒有安裝本機環境，請先做第 1 步。'],
    [/currently supports Windows/, '自動安裝目前只支援 Windows。其他系統請自己安裝 Xinference 並啟動，聲音工坊會直接使用它。'],
    [/Start the plugin-owned Xinference service first/, '請先用第 2 步啟動服務，再建立本機帳號。'],
    [/already has an account/, '這個服務已經有別的帳號。請到「語音來源」頁填入你自己的 API 金鑰。'],
    [/requires an account access token/, '還沒有本機帳號，請先在第 2 步建立。'],
    [/model UID already exists/, '這個模型已經載入了，不用再載入一次。'],
    [/Finish or cancel current maintenance jobs/, '已經有其他背景工作在跑，請等它完成或到下面的「背景工作與取消」取消。'],
    [/requires a validated reference recording/, '這個模型需要參考錄音。請先在下面的「參考錄音」上傳一段錄音並選用。'],
    [/requires the exact reference transcript/, '這個模型需要參考錄音的逐字稿。請在下面的「參考錄音」補上錄音內容的文字。'],
    [/Runtime preparation failed/, '安裝過程失敗。請確認網路正常、磁碟空間足夠後再試一次；詳細紀錄在下面的「背景工作與取消」。'],
    [/startup timed out|process exited/, '服務沒有成功啟動。請再試一次；還是不行的話到下面按「產生唯讀診斷」。'],
    [/fetch failed|ECONNREFUSED/, '連不到本機服務，請確認第 2 步的服務正在執行。'],
  ]
  for (const [pattern, friendly] of table) if (pattern.test(text)) return friendly
  return text
}
