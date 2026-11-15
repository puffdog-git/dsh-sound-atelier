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
    [backend, K] = React.useState('dots'),
    [nativeStatus, NS] = React.useState(null),
    [rvcStatus, RS] = React.useState(null),
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
    const [m, j, n, r] = await Promise.all([
      req('voice/models'),
      req('maintenance'),
      req('local/native').catch(() => null),
      req('local/rvc').catch(() => null),
    ])
    M(m.models)
    J(j.jobs)
    NS(n?.status || null)
    RS(r?.status || null)
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
      E(quickFriendlyError(e.message))
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
  // 引導用：一個步驟（完成打勾、目前步驟展開、還沒輪到的收起）。
  const guideStep = (index, title, done, current, summary, body) =>
    h(
      'li',
      { className: 'dts-quick-step', 'data-guide-step': String(index), 'data-state': done ? 'done' : current ? 'current' : 'todo', key: index },
      h(
        'div',
        { className: 'dts-quick-head' },
        h('span', { className: 'dts-quick-number', 'aria-hidden': 'true' }, done ? '✓' : String(index)),
        h('strong', null, title),
        h('span', { className: 'dts-quick-status' }, summary),
      ),
      done || current ? h('div', { className: 'dts-quick-body' }, body) : null,
    )
  // 正在跑的背景工作：在引導裡直接顯示最新一行進度。
  const runningJob = (kinds) => jobs.find((item) => kinds.includes(item.kind) && ['running', 'cancelling'].includes(item.state))
  const lastJob = (kinds) => jobs.find((item) => kinds.includes(item.kind))
  const jobLine = (kinds, label) => {
    const active = runningJob(kinds)
    const last = lastJob(kinds)
    if (active)
      return h(
        'div',
        { className: 'dts-quick-progress', role: 'status', 'data-guide-progress': active.kind },
        label + '進行中，請讓它跑完（可以先切到別的頁面）。',
        active.lines?.length ? h('div', { className: 'dts-quick-log', 'data-ui-verbatim': '1' }, active.lines[active.lines.length - 1]) : null,
        button('取消', () => run(() => req('maintenance', 'DELETE', { id: active.id }))),
      )
    if (last?.state === 'failed')
      return h('div', { className: 'dts-quick-error', role: 'alert', 'data-guide-error': last.kind }, label + '沒有成功：' + quickFriendlyError(last.error))
    return null
  }
  const anyJobRunning = jobs.some((item) => ['running', 'cancelling'].includes(item.state))
  const nativePackages = nativeStatus?.packages || {}
  const xinferenceReady = props.serviceUp === true
  const rvcInstalled = rvcStatus?.packageInstalled === true || rvcStatus?.state === 'external'
  const rvcVoices = models.filter((m) => m.kind === 'pth')
  const rvcRunning = ['running', 'external'].includes(rvcStatus?.state)
  // 記住「已經存檔的音色」：選了還沒存檔時，步驟不算完成。
  const savedVoice = React.useRef(undefined)
  if (savedVoice.current === undefined && d && Object.keys(d).length) savedVoice.current = d.rvcModelAsset || ''
  const voiceSaved = Boolean(d.rvcModelAsset) && rvcVoices.some((m) => m.id === d.rvcModelAsset) && savedVoice.current === d.rvcModelAsset
  const saveNow = (changes) =>
    run(async () => {
      if (typeof props.save !== 'function') throw Error('請按頁面最下面的「儲存設定」')
      const voice = d.rvcModelAsset || ''
      await props.save(changes)
      savedVoice.current = voice
    })
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
      h('summary', null, '安裝其他引擎（dots.tts、RVC、Kokoro、IndexTTS）'),
      h(
        'div',
        { className: 'dts-sub' },
        'Xinference 用最上面的「快速上手」安裝就好。這裡是其他引擎的一鍵安裝：選好要裝哪一個，按「安裝」，它會自己下載需要的東西，放在獨立的資料夾，不影響電腦上其他程式。目前只支援 Windows，檔案通常有好幾 GB。',
      ),
      h(
        'label',
        null,
        '要安裝的引擎',
        h(
          'select',
          { 'aria-label': '安裝環境', 'data-local-install-backend': '1', value: backend, onChange: (e) => K(e.target.value) },
          LOCAL_INSTALL_CHOICES.map(([value, label]) => h('option', { key: value, value }, label)),
        ),
      ),
      h('div', { className: 'dts-sub', 'data-local-install-hint': backend }, LOCAL_INSTALL_HINT[backend] || ''),
      h(
        'label',
        null,
        '這台電腦的顯示卡',
        h(
          'select',
          { 'aria-label': '安裝裝置', value: device, onChange: (e) => D(e.target.value) },
          h('option', { value: 'cu128' }, '有 NVIDIA 顯示卡（建議，合成快很多）'),
          h('option', { value: 'cpu' }, '沒有，或不確定（用 CPU）'),
        ),
      ),
      button('安裝選定的引擎', () => job('install', { backend, device })),
      button('建立或檢查 Xinference 本機帳號', () => job('provision')),
      h(
        'div',
        { className: 'dts-sub' },
        '按下後安裝在背景進行，進度和取消按鈕在下面的「背景工作與取消」。本機帳號的帳號密碼只存在這台電腦上（用 Windows 的加密功能保護），不會被放進插件或傳到別的地方。GPT-SoVITS 沒有一鍵安裝：把上面的「本機服務類型」選成 GPT-SoVITS，就會出現一步一步的安裝與連線說明。',
      ),
    ),
    h(
      'details',
      null,
      h('summary', null, 'dots.tts／IndexTTS 直接執行（不經過 Xinference）'),
      h(
        'ol',
        { className: 'dts-steps' },
        h('li', null, 'dots.tts：先在上面「安裝其他引擎」安裝「dots.tts」。IndexTTS：先用「快速上手」安裝 Xinference，並在那裡載入一次 IndexTTS2 或 IndexTTS-2.5（它會順便把需要的環境準備好）。'),
        h('li', null, '把最上面的「本機服務類型」選成 dots.tts 或 Index 的原生模式，按頁面最下面的「儲存設定」。'),
        h('li', null, '回到這裡按「載入模型」。第一次會下載模型檔，進度在「背景工作與取消」。'),
        h('li', null, '到「語音來源」選「本機 TTS 服務」試聽。IndexTTS 需要先準備參考錄音。'),
      ),
      h(
        'div',
        { className: 'dts-native-prepare', 'data-native-prepare': '1' },
        h('strong', null, '一鍵準備環境'),
        [
          ['dots', 'dots.tts', () => job('install', { backend: 'dots', device }), '安裝', '會下載 dots.tts 需要的套件。'],
          ['index2', 'IndexTTS2', () => job('native-prepare', { kind: 'index2', gpus: device === 'cpu' ? 0 : 1 }), '準備', ''],
          ['index2.5', 'IndexTTS-2.5', () => job('native-prepare', { kind: 'index2.5', gpus: device === 'cpu' ? 0 : 1 }), '準備', ''],
        ].map(([kind, label, start, verb, note]) =>
          h(
            'div',
            { className: 'dts-native-row', key: kind, 'data-native-kind': kind, 'data-ready': String(nativePackages[kind] === true) },
            h('span', null, label),
            h('span', { className: 'dts-badge' + (nativePackages[kind] ? ' dts-badge-on' : '') }, nativePackages[kind] ? '已準備好' : '還沒準備'),
            nativePackages[kind]
              ? null
              : button(
                  verb + ' ' + label + ' 的環境',
                  start,
                  anyJobRunning || (kind !== 'dots' && !xinferenceReady),
                ),
            !nativePackages[kind] && kind !== 'dots' && !xinferenceReady
              ? h('span', { className: 'dts-sub' }, '要先用最上面的「快速上手」把 Xinference 啟動起來')
              : note && !nativePackages[kind]
                ? h('span', { className: 'dts-sub' }, note)
                : null,
          ),
        ),
        h(
          'div',
          { className: 'dts-sub' },
          'IndexTTS 的環境是請 Xinference 載入一次模型時建立的，所以按下後會下載模型檔（好幾 GB），完成後自動把模型從記憶體卸下。用上面「安裝其他引擎」選的顯示卡設定。',
        ),
        jobLine(['install', 'native-prepare', 'native-load'], '準備環境'),
      ),
      select(
        'localTtsDevice',
        '用什麼來跑',
        [
          ['cpu', 'CPU'],
          ['cuda:0', 'NVIDIA 顯示卡（快很多）'],
        ],
        'cpu',
      ),
      select(
        'localTtsNativeModel',
        'dots.tts 的模型版本',
        ['base', 'soar', 'mf', 'mf-2steps', 'mf-1step', 'mf-2steps-stts'].map((v) => ['dots-studio/dots.tts-' + v, v]),
        'dots-studio/dots.tts-mf',
      ),
      field('localTtsModelPath', 'IndexTTS 模型資料夾（一般留空，用自動下載的位置）'),
      props.boolField('localTtsNativeTrusted', '我信任這個 IndexTTS 模型的來源', '模型檔裡可能夾帶會被執行的程式，只載入你信任的來源（例如官方發布的）。沒勾選就不會載入。'),
      select('localTtsEmotionAsset', 'IndexTTS 的情緒參考錄音（選用）', [
        ['', '不用，情緒跟著聲音的參考錄音'],
        ...(props.assets || []).map((a) => [a.id, a.name]),
      ]),
      h(
        'div',
        { className: 'dts-sub' },
        'IndexTTS 可以用一段錄音決定聲音、另一段錄音決定情緒；情緒也可以改用文字描述，三種方式擇一。dots.tts 名稱裡有 steps 的版本合成比較快、品質略低。GPT-SoVITS 可在進階參數 local-tts.native 調整取樣、切句、批次及快取；不支援自由文字語氣欄位。',
      ),
      button('載入模型', () => job('native-load')),
      button('從記憶體卸下模型', () => run(() => req('local/native', 'POST', { action: 'stop' }))),
    ),
    h(
      'details',
      null,
      h('summary', null, 'RVC 變聲（把合成好的語音換成另一個人的聲音）'),
      h(
        'div',
        { className: 'dts-sub' },
        'RVC 不是語音合成，它是「變聲器」：先用任何一個語音服務把文字唸出來，再把那段聲音換成你指定的音色。所以你需要一個音色模型檔（.pth），可以自己訓練或取得別人授權分享的。',
      ),
      h(
        'ol',
        { className: 'dts-quick-steps', 'data-rvc-steps': '1' },
        guideStep(
          1,
          '安裝 RVC',
          rvcInstalled,
          true,
          rvcInstalled ? '已安裝' : '尚未安裝',
          rvcInstalled
            ? '只需要安裝一次。'
            : h(
                React.Fragment,
                null,
                h('div', null, '會下載 RVC 需要的套件，放在獨立的資料夾。檔案有好幾 GB，目前只支援 Windows。'),
                h(
                  'label',
                  { className: 'dts-quick-inline' },
                  '這台電腦有 NVIDIA 顯示卡',
                  h('input', { type: 'checkbox', checked: device !== 'cpu', 'data-rvc-gpu': '1', onChange: (e) => D(e.target.checked ? 'cu128' : 'cpu') }),
                ),
                h('button', { type: 'button', className: 'dts-btn dts-quick-primary', 'data-rvc-action': 'install', disabled: busy || anyJobRunning, onClick: () => job('install', { backend: 'rvc', device }) }, '安裝 RVC'),
              ),
        ),
        guideStep(
          2,
          '匯入音色檔',
          rvcVoices.length > 0,
          rvcInstalled,
          !rvcInstalled ? '先完成上一步' : rvcVoices.length ? '已匯入 ' + rvcVoices.length + ' 個音色' : '還沒有音色',
          h(
            'div',
            null,
            rvcVoices.length
              ? '想再加音色，用下面的「匯入音色檔」。'
              : '在下面的「匯入音色檔」選你的 .pth 檔（有 .index 檔也一起匯入，聲音會更像），勾選「我信任這個檔案的來源」後按匯入。',
          ),
        ),
        guideStep(
          3,
          '選要用的音色',
          voiceSaved,
          rvcVoices.length > 0,
          !rvcVoices.length
            ? '先完成上一步'
            : voiceSaved
              ? '已選：' + (rvcVoices.find((m) => m.id === d.rvcModelAsset)?.name || '')
              : d.rvcModelAsset
                ? '已選，還沒儲存'
                : '還沒選',
          h(
            React.Fragment,
            null,
            h('div', null, '在下面的「要用的音色（.pth）」選一個，然後按這個按鈕存起來。'),
            h('button', { type: 'button', className: 'dts-btn dts-quick-primary', 'data-rvc-action': 'save-voice', disabled: busy || !d.rvcModelAsset || voiceSaved || !props.writable, onClick: () => saveNow({}) }, voiceSaved ? '已儲存' : '儲存選好的音色'),
          ),
        ),
        guideStep(
          4,
          '啟動 RVC 並載入音色',
          rvcRunning && Boolean(lastJob(['rvc-load'])) && lastJob(['rvc-load']).state === 'complete',
          voiceSaved && rvcInstalled,
          !voiceSaved ? '先完成上一步' : rvcRunning ? 'RVC 執行中' : 'RVC 沒有在執行',
          h(
            React.Fragment,
            null,
            h('div', null, rvcRunning ? '按「載入選定的音色」。每次換音色之後要再載入一次。' : '先按「啟動 RVC」，啟動完成後再按「載入選定的音色」。'),
            h(
              'div',
              { className: 'dts-quick-actions' },
              h('button', { type: 'button', className: 'dts-btn' + (rvcRunning ? '' : ' dts-quick-primary'), 'data-rvc-action': 'start', disabled: busy || anyJobRunning || rvcRunning, onClick: () => job('rvc-start') }, rvcRunning ? 'RVC 已啟動' : '啟動 RVC'),
              h('button', { type: 'button', className: 'dts-btn' + (rvcRunning ? ' dts-quick-primary' : ''), 'data-rvc-action': 'load', disabled: busy || anyJobRunning || !rvcRunning, onClick: () => job('rvc-load') }, '載入選定的音色'),
            ),
          ),
        ),
        guideStep(
          5,
          '打開變聲',
          d.rvcEnabled === true,
          rvcRunning,
          !rvcRunning ? '先完成上一步' : d.rvcEnabled ? '已打開' : '還沒打開',
          h(
            React.Fragment,
            null,
            h('div', null, d.rvcEnabled ? '現在朗讀的聲音都會經過變聲。到「語音來源」按試聽確認效果；想關掉就取消下面的「合成後換成這個音色」並儲存。' : '打開之後，朗讀的聲音都會換成你選的音色。'),
            d.rvcEnabled
              ? null
              : h('button', { type: 'button', className: 'dts-btn dts-quick-primary', 'data-rvc-action': 'enable', disabled: busy || !props.writable, onClick: () => saveNow({ rvcEnabled: true }) }, '打開變聲並儲存'),
          ),
        ),
      ),
      jobLine(['install', 'rvc-start', 'rvc-load', 'install-pack', 'compact-index'], 'RVC 工作'),
      props.boolField('rvcEnabled', '合成後換成這個音色', '打開後，每一段合成好的語音都會再經過 RVC 變聲。逐字時間資訊會因此失效（只影響少數進階功能）。'),
      props.boolField('rvcBypassOnFailure', '變聲失敗時照常播放原本的聲音', '建議打開。關掉的話，變聲失敗時這段話就不會播放，並顯示錯誤。'),
      props.boolField('rvcManaged', '由聲音工坊啟動和停止 RVC', '一般保持打開。只有你自己另外架了 RVC 服務時才關掉，這時聲音工坊只會連過去，不會幫你啟動或停止。'),
      field('rvcBaseUrl', 'RVC 服務的網址（一般不用改）'),
      select(
        'rvcDevice',
        '用什麼來跑 RVC',
        [
          ['cpu', 'CPU（比較慢）'],
          ['cuda:0', 'NVIDIA 顯示卡（快很多）'],
        ],
        'cpu',
      ),
      select('rvcModelAsset', '要用的音色（.pth）', [
        ['', '請先在下面匯入音色檔'],
        ...models.filter((m) => m.kind === 'pth').map((m) => [m.id, m.name]),
      ]),
      select('rvcIndexAsset', '搭配的索引檔（.index，選用）', [
        ['', '不使用'],
        ...models.filter((m) => m.kind === 'index').map((m) => [m.id, m.name]),
      ]),
      field('rvcOptions', '進階參數（JSON，一般留空）'),
      h(
        'div',
        { className: 'dts-sub' },
        '不熟悉可以完全不填。常用的只有一個：聲音太高或太低時，填 {"f0_up_key": 數字} 調整音高，正數變高、負數變低，12 是高八度；男聲換女聲音色常用 12，女聲換男聲常用 -12。其他可調的有 f0_method（抓音高的方法）、index_rate（索引檔的影響程度）、rms_mix_rate（音量貼近原聲的程度）、protect（保護氣音）。',
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
        '我信任這個檔案的來源（.pth 檔裡可能夾帶會被執行的程式，請只匯入你信任的人或網站提供的；匯入當下不會執行，載入時才會）',
      ),
      h('input', {
        type: 'file',
        accept: '.pth,.index,.zip',
        'aria-label': '音色模型檔案',
        onChange: (e) => F(e.target.files[0] || null),
      }),
      button(
        '匯入音色檔',
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
      button('載入選定的音色', () => job('rvc-load')),
      button('停止 RVC', () => run(() => req('local/rvc', 'POST', { action: 'stop' }))),
      button(
        '匯出選定的音色（ZIP，可備份或搬移）',
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
        '縮小索引檔（太大、載入太慢時使用）',
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
              (m.verifiedAt ? '已經成功變聲過' : '還沒實際用過') +
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
        '音色目錄的網址（選用：有人提供音色下載清單時貼在這裡）',
        h('input', {
          className: 'dts-input',
          'aria-label': '音色 Registry URL',
          value: registry,
          onChange: (e) => V(e.target.value),
        }),
      ),
      button('讀取這個目錄', () => run(async () => P((await req('voice/registry', 'POST', { url: registry })).packs))),
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
      h('div', { className: 'dts-sub' }, '安裝、載入模型這類要等很久的工作會列在這裡，可以看進度或取消。看到「Install uv」的錯誤，表示電腦上還沒有 uv 這個安裝工具，請先到 https://docs.astral.sh/uv/ 照官方說明安裝，再回來按一次安裝。'),
      jobs.map((j) =>
        h(
          'div',
          { className: 'dts-entry', key: j.id },
          j.kind + ' · ' + j.state,
          j.error ? h('div', { role: 'alert' }, quickFriendlyError(j.error)) : null,
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
// GPT-SoVITS 官方 api_v2.py 的啟動指令（整合包自帶 runtime\\python.exe）。
const GSV_START_COMMAND = 'runtime\\python.exe api_v2.py -a 127.0.0.1 -p 9880 -c GPT_SoVITS/configs/tts_infer.yaml'
const GSV_PROMPT_LANGUAGES = [
  ['zh', '中文'],
  ['en', '英文'],
  ['ja', '日文'],
  ['ko', '韓文'],
  ['yue', '粵語'],
]
const GSV_TEXT_LANGUAGES = [
  ['auto', '自動判斷（中英日韓混合時用這個）'],
  ['zh', '中文（可夾雜英文）'],
  ['en', '英文'],
  ['ja', '日文（可夾雜英文）'],
  ['ko', '韓文（可夾雜英文）'],
  ['yue', '粵語（可夾雜英文）'],
  ['auto_yue', '自動判斷（含粵語）'],
  ['all_zh', '全部當成中文'],
  ['all_ja', '全部當成日文'],
  ['all_ko', '全部當成韓文'],
  ['all_yue', '全部當成粵語'],
]
// 「安裝其他引擎」的選項與各自的說明。
const LOCAL_INSTALL_CHOICES = [
  ['dots', 'dots.tts（直接執行，不經過 Xinference）'],
  ['rvc', 'RVC 變聲'],
  ['rvc-portable', 'RVC 變聲・可攜版（可以整包搬到別台電腦）'],
  ['kokoro', 'Kokoro（輕量、只有英文、用 CPU 就能跑）'],
  ['index-cache', 'IndexTTS-2.5 需要的輔助檔案'],
  ['xinference', 'Xinference（建議改用最上面的快速上手）'],
]
const LOCAL_INSTALL_HINT = {
  dots: '裝好之後照下面「dots.tts／IndexTTS 直接執行」的步驟使用。',
  rvc: '裝好之後照下面「RVC 變聲」的步驟使用。',
  'rvc-portable': '和「RVC 變聲」功能相同，但整個環境放在單一資料夾，可以複製到沒有網路的電腦上使用。',
  kokoro: '裝好之後在上面的「Kokoro」區塊按載入。',
  'index-cache': '要先安裝 Xinference。IndexTTS-2.5 第一次載入前需要這些檔案；用快速上手載入 IndexTTS-2.5 時會自動準備，通常不用自己按。',
  xinference: '多數模型（CosyVoice、Qwen3-TTS、F5-TTS、IndexTTS 等）都透過它執行。',
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
    [copied, setCopied] = React.useState(''),
    [gsvProbe, setGsvProbe] = React.useState(null)
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
  // GPT-SoVITS：確認使用者自己啟動的服務有沒有在回應（用畫面上填的網址，不必先存檔）。
  const probeGsv = async () => {
    setGsvProbe({ state: 'checking' })
    try {
      const d = await request('/dsh-sound-atelier/local/service', 'POST', {
        action: 'probe',
        input: { url: draft.localTtsBaseUrl || 'http://127.0.0.1:9880', kind: 'gpt-sovits' },
      })
      if (mounted.current) setGsvProbe({ state: d.result?.reachable ? 'ok' : 'down', origin: d.result?.origin })
    } catch (failure) {
      if (mounted.current) setGsvProbe({ state: 'error', error: String(failure?.message || failure) })
    }
  }
  const langSelect = (key, label, options, fallback) =>
    h(
      'label',
      { className: 'dts-field' },
      label,
      h(
        'select',
        { className: 'dts-input', 'aria-label': label, value: draft[key] || fallback, disabled: !props.writable, onChange: (e) => setTop(key, e.target.value) },
        options.map(([value, text]) => h('option', { key: value, value }, text)),
      ),
    )
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
    h(ErrorBoundary, null, h(LocalQuickStart, { active: props.active, draft, setTop, save: props.save, writable: props.writable })),
    h('div', { className: 'dts-h', 'data-local-advanced-heading': '1' }, '進階：個別設定與其他引擎'),
    h(
      'div',
      { className: 'dts-sub' },
      '一般照上面的四個步驟做就夠了。下面是每一項的個別控制，以及參考錄音、Kokoro、dots、IndexTTS、RVC 變聲等其他引擎。',
    ),
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
          h(
            'div',
            { className: 'dts-guide', 'data-gsv-guide': '1' },
            h('strong', null, 'GPT-SoVITS 怎麼接上來'),
            h(
              'div',
              { className: 'dts-sub' },
              'GPT-SoVITS 沒有一鍵安裝，要先自己把它裝好、跑起來，聲音工坊再連過去。它必須和 DSH 在同一台電腦上。照下面做：',
            ),
            h(
              'ol',
              { className: 'dts-steps' },
              h(
                'li',
                null,
                '下載：到 GPT-SoVITS 的官方頁面，在說明裡找「Windows 整合包」的下載連結（一個 .7z 壓縮檔，有好幾 GB）。',
                h('a', { className: 'dts-link', href: 'https://github.com/RVC-Boss/GPT-SoVITS', target: '_blank', rel: 'noopener noreferrer' }, '開啟 GPT-SoVITS 官方頁面'),
              ),
              h('li', null, '解壓縮：用 7-Zip 解開，放在路徑簡單的資料夾，例如 D:\\GPT-SoVITS。'),
              h(
                'li',
                null,
                '啟動服務：在那個資料夾空白處按住 Shift 再按滑鼠右鍵，選「在終端機中開啟」，貼上這一行後按 Enter。出現的視窗要一直開著，關掉服務就停了。',
                h('code', { className: 'dts-guide-code', 'data-ui-verbatim': '1', 'data-gsv-command': '1' }, GSV_START_COMMAND),
                h('button', { type: 'button', className: 'dts-btn', onClick: () => copyValue('gsv-command', GSV_START_COMMAND) }, copied === 'gsv-command' ? '已複製' : '複製指令'),
              ),
              h(
                'li',
                null,
                '填網址：上面的「本機服務地址」填 http://127.0.0.1:9880，然後按下面的按鈕確認連得上。',
                h(
                  'span',
                  { className: 'dts-guide-actions' },
                  h('button', { type: 'button', className: 'dts-btn', 'data-gsv-action': 'fill', disabled: !props.writable, onClick: () => setTop('localTtsBaseUrl', 'http://127.0.0.1:9880') }, '幫我填入這個網址'),
                  h('button', { type: 'button', className: 'dts-btn', 'data-gsv-action': 'probe', disabled: gsvProbe?.state === 'checking', onClick: probeGsv }, gsvProbe?.state === 'checking' ? '檢查中…' : '檢查連線'),
                ),
                gsvProbe && gsvProbe.state !== 'checking'
                  ? h(
                      'div',
                      { className: 'dts-sub', role: 'status', 'data-gsv-probe': gsvProbe.state },
                      gsvProbe.state === 'ok'
                        ? '連得上，GPT-SoVITS 正在執行。'
                        : gsvProbe.state === 'down'
                          ? '連不上。請確認第 3 步的視窗還開著、沒有出現錯誤，而且網址和連接埠與指令裡的一致。'
                          : '檢查失敗：' + gsvProbe.error,
                    )
                  : null,
              ),
              h('li', null, '準備參考錄音：在下面的「新增／管理參考錄音」上傳一段你要模仿的聲音（建議 3 到 10 秒、沒有背景音），並把錄音裡說的話一字不差填進「錄音逐字稿」。GPT-SoVITS 一定要有逐字稿。然後在「目前參考錄音」選它。'),
              h('li', null, '選語言：在下面選參考錄音的語言，以及要唸出來的文字的語言。'),
              h('li', null, '按頁面最下面的「儲存設定」，再到「語音來源」把主要服務選成「本機 TTS 服務」，按試聽。'),
            ),
            h('div', { className: 'dts-sub' }, '整合包的版本和內容由 GPT-SoVITS 的作者維護，可能和這裡寫的略有不同；啟動失敗時請以它官方頁面的說明為準。'),
          ),
          langSelect('localTtsPromptLanguage', '參考錄音的語言', GSV_PROMPT_LANGUAGES, 'zh'),
          langSelect('localTtsLanguage', '要唸出來的文字的語言', GSV_TEXT_LANGUAGES, 'auto'),
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
    h(LocalStudioManager, { active: props.active, draft, setTop, save: props.save, serviceUp, writable: props.writable, boolField: props.boolField, assets }),
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
