function CloudVoicesEditor(props) {
  const h = React.createElement
  const [voices, setVoices] = React.useState([]),
    [candidates, setCandidates] = React.useState([]),
    [services, setServices] = React.useState({})
  const [candidate, setCandidate] = React.useState(''),
    [name, setName] = React.useState(''),
    [asset, setAsset] = React.useState(''),
    [language, setLanguage] = React.useState('zh')
  const [remoteId, setRemoteId] = React.useState(''),
    [consent, setConsent] = React.useState(false),
    [mode, setMode] = React.useState('create')
  const [prefix, setPrefix] = React.useState('DshVoice'),
    [billingMode, setBillingMode] = React.useState('prepaid'),
    [slotConsent, setSlotConsent] = React.useState(false)
  const [requestId, setRequestId] = React.useState(() => crypto.randomUUID()),
    [edits, setEdits] = React.useState({}),
    [confirm, setConfirm] = React.useState({})
  const [testText, setTestText] = React.useState(() =>
    String(props.draft.language || '').startsWith('zh')
      ? '這是雲端音色試聽，請確認這句話能完整播放。'
      : 'This is a cloud voice preview. Please listen to the complete sentence.',
  )
  const [busy, setBusy] = React.useState(false),
    [error, setError] = React.useState(''),
    [notice, setNotice] = React.useState('')
  const mounted = React.useRef(true)
  const request = async (method = 'GET', body) => {
    const r = await clientFetch('/dsh-sound-atelier/voice/cloud', {
      method,
      ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
      timeoutMs: 125000,
    })
    const d = await r.json()
    if (!r.ok || !d.ok) throw Error(d.error?.message || '雲端音色操作失敗')
    return d
  }
  const load = async () => {
    const d = await request()
    if (mounted.current) {
      setVoices(d.voices || [])
      setCandidates(d.candidates || [])
      setServices(d.services || {})
    }
  }
  React.useEffect(() => {
    mounted.current = true
    load().catch(() => {})
    return () => {
      mounted.current = false
    }
  }, [])
  const run = async (fn) => {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await fn()
    } catch (e) {
      if (mounted.current) setError(e.message)
    } finally {
      await load().catch(() => {})
      if (mounted.current) setBusy(false)
    }
  }
  const selected = candidates.find((c) => String(c.index) === candidate)
  const unconfirmedVoice = (v) =>
    v.provider === 'minimax' && v.remoteState === 'unknown' && ['idle', 'failed', 'uncertain'].includes(v.operation)
  const act = (action, v, extra = {}) =>
    run(async () => {
      await request('POST', { action, id: v.id, ...extra })
      setNotice(
        action === 'forget'
          ? '已移除本機紀錄，遠端音色保留。'
          : action === 'delete-remote'
            ? '已刪除遠端音色，本機參考錄音保留。'
            : '操作完成；可重新查詢狀態。',
      )
    })
  const state = (v) =>
    ({
      unknown: '狀態未知',
      untrained: '尚未訓練的音色槽',
      available: '服務已建立，可試聽',
      training: '訓練／審核中',
      failed: '訓練失敗',
      blocked: '受限／已停用',
      'upgrade-required': '需升級到 ICL 2.0',
      'verification-required': '需至服務商完成聲音驗證',
      deleted: '遠端已刪除',
    })[v.remoteState] || v.remoteState
  const phase = (v) =>
    ({
      creating: '建立中',
      refreshing: '查詢中',
      renaming: '改名中',
      retraining: '重新訓練中',
      upgrading: '音色升級中',
      'deleting-upload': '刪除遠端錄音中',
      deleting: '刪除中',
      uncertain: '操作結果待確認，請查服務商控制檯',
      failed: '上次操作失敗，請重新查詢',
    })[v.operation] || ''
  return h(
    'div',
    { className: 'dts-block', 'data-dsh-tts-cloud-voices': '1' },
    h('div', { className: 'dts-h' }, '雲端音色與訓練管理'),
    h(
      'div',
      { className: 'dts-sub' },
      '支援 ElevenLabs、Fish Audio、Cartesia、Inworld、DashScope、MiniMax、SiliconFlow、豆包官方端點。先儲存服務列、地域／Workspace 與金鑰，再重新讀取；未完成地域設定的服務列不會列出。建立會上傳錄音，可能使用額度或訓練次數；不會自動建立、重送或試聽。',
    ),
    h(
      'button',
      { type: 'button', className: 'dts-btn', disabled: busy, onClick: () => run(load) },
      '重新讀取雲端音色／已儲存服務列',
    ),
    h(
      'details',
      null,
      h('summary', null, '建立／匯入音色'),
      h(
        'label',
        { className: 'dts-field' },
        '雲端音色服務列',
        h(
          'select',
          {
            className: 'dts-input',
            'aria-label': '雲端音色服務列',
            value: candidate,
            disabled: busy,
            onChange: (e) => {
              setCandidate(e.target.value)
              setConsent(false)
              setSlotConsent(false)
              setRemoteId('')
            },
          },
          h('option', { value: '' }, '選擇已儲存的服務列'),
          candidates.map((c) =>
            h(
              'option',
              { key: c.index, value: String(c.index) },
              `第 ${c.index + 1} 列 · ${c.label} · ${c.model} · ${c.credentialRef}`,
            ),
          ),
        ),
      ),
      selected
        ? h(
            'div',
            { className: 'dts-sub' },
            services[selected.provider]?.permissions,
            ' ',
            services[selected.provider]?.note,
          )
        : null,
      selected?.canCreate === false
        ? h(
            'div',
            { className: 'dts-sub' },
            '此模型尚未接入聲音建立契約；請選擇可複製聲音的模型。豆包請選 seed-icl-2.0，SiliconFlow 請選 CosyVoice2。',
          )
        : null,
      h(
        'label',
        { className: 'dts-field' },
        '雲端音色操作',
        h(
          'select',
          {
            className: 'dts-input',
            'aria-label': '雲端音色操作',
            value: mode,
            disabled: busy,
            onChange: (e) => setMode(e.target.value),
          },
          h('option', { value: 'create' }, '從錄音建立'),
          h('option', { value: 'import' }, '匯入已有 voice ID（不再上傳）'),
        ),
      ),
      h(
        'label',
        { className: 'dts-field' },
        '音色紀錄名稱',
        h('input', {
          className: 'dts-input',
          'aria-label': '音色紀錄名稱',
          value: name,
          disabled: busy,
          onChange: (e) => setName(e.target.value),
        }),
      ),
      mode === 'create'
        ? h(
            React.Fragment,
            null,
            selected && services[selected.provider]?.prefix
              ? h(
                  'label',
                  { className: 'dts-field' },
                  'DashScope 音色字首',
                  h('input', {
                    className: 'dts-input',
                    'aria-label': 'DashScope 音色字首',
                    maxLength: 10,
                    value: prefix,
                    disabled: busy,
                    onChange: (e) => setPrefix(e.target.value),
                  }),
                  h(
                    'span',
                    { className: 'dts-sub' },
                    '1–10 個英文字母／數字；服務產生完整 voice ID。此處名稱只作本機標籤。',
                  ),
                )
              : null,
            selected && services[selected.provider]?.slot
              ? h(
                  React.Fragment,
                  null,
                  h(
                    'label',
                    { className: 'dts-field' },
                    '豆包音色計費類型',
                    h(
                      'select',
                      {
                        className: 'dts-input',
                        'aria-label': '豆包音色計費類型',
                        value: billingMode,
                        disabled: busy,
                        onChange: (e) => {
                          setBillingMode(e.target.value)
                          setSlotConsent(false)
                          setRemoteId('')
                        },
                      },
                      h('option', { value: 'prepaid' }, '已購買的預付費 S_ 音色槽'),
                      h('option', { value: 'postpaid' }, '已開通的後付費自訂音色'),
                    ),
                  ),
                  h(
                    'label',
                    { className: 'dts-field' },
                    billingMode === 'prepaid' ? '已購買的 S_ 音色槽' : '後付費自訂 ID（留空自動產生）',
                    h('input', {
                      className: 'dts-input',
                      'aria-label': '豆包註冊音色 ID',
                      value: remoteId,
                      disabled: busy,
                      onChange: (e) => {
                        setRemoteId(e.target.value)
                        setSlotConsent(false)
                      },
                    }),
                  ),
                  billingMode === 'prepaid'
                    ? h(
                        'label',
                        { className: 'dts-field' },
                        h('input', {
                          type: 'checkbox',
                          'aria-label': '確認覆寫已購買的豆包音色槽',
                          checked: slotConsent,
                          disabled: busy,
                          onChange: (e) => setSlotConsent(e.target.checked),
                        }),
                        '確認使用此槽的訓練次數，並替換槽內現有音色。',
                      )
                    : null,
                )
              : null,
            selected && services[selected.provider]?.customId
              ? h(
                  'label',
                  { className: 'dts-field' },
                  '自訂新 voice ID（留空自動產生）',
                  h('input', {
                    className: 'dts-input',
                    'aria-label': '自訂新 voice ID',
                    value: remoteId,
                    disabled: busy,
                    onChange: (e) => setRemoteId(e.target.value),
                  }),
                )
              : null,
            h(
              'label',
              { className: 'dts-field' },
              '建立音色的參考錄音',
              h(
                'select',
                {
                  className: 'dts-input',
                  'aria-label': '建立音色的參考錄音',
                  value: asset,
                  disabled: busy,
                  onChange: (e) => {
                    setAsset(e.target.value)
                    setConsent(false)
                  },
                },
                h('option', { value: '' }, '選擇已驗證錄音'),
                (props.referenceAssets || []).map((a) =>
                  h('option', { key: a.id, value: a.id }, a.name + ' · ' + Number(a.duration).toFixed(1) + ' 秒'),
                ),
              ),
            ),
            h(
              'label',
              { className: 'dts-field' },
              '音色語言',
              h('input', {
                className: 'dts-input',
                'aria-label': '音色語言',
                value: language,
                disabled: busy,
                onChange: (e) => setLanguage(e.target.value),
              }),
              h(
                'span',
                { className: 'dts-sub' },
                'Cartesia 必填 zh、en 等；DashScope／豆包可填 zh、en、ja 等；Inworld 可填 zh-CN、en-US 或留空自動判斷。MiniMax 原錄音至少 10 秒；SiliconFlow 逐字稿必填且 ≤30 秒；DashScope 使用 3–30 秒；豆包使用 ≤25 秒，避免服務端截短。',
              ),
            ),
            h(
              'label',
              { className: 'dts-field' },
              h('input', {
                type: 'checkbox',
                'aria-label': '確認上傳錄音建立雲端音色',
                checked: consent,
                disabled: busy,
                onChange: (e) => setConsent(e.target.checked),
              }),
              '我有此錄音的使用授權，並確認上傳至所選服務建立音色。',
            ),
          )
        : h(
            'label',
            { className: 'dts-field' },
            '既有遠端 voice ID',
            h('input', {
              className: 'dts-input',
              'aria-label': '既有遠端 voice ID',
              value: remoteId,
              disabled: busy,
              onChange: (e) => setRemoteId(e.target.value),
            }),
          ),
      h(
        'button',
        {
          type: 'button',
          className: 'dts-btn',
          disabled:
            busy ||
            !props.writable ||
            !selected ||
            !name.trim() ||
            (mode === 'create'
              ? !asset ||
                !consent ||
                selected.canCreate === false ||
                (selected.provider === 'doubao' && billingMode === 'prepaid' && (!remoteId || !slotConsent))
              : !remoteId.trim()) ||
            voices.some((v) => v.id === requestId),
          onClick: () =>
            run(async () => {
              await request('POST', {
                action: mode,
                id: requestId,
                candidateIndex: selected.index,
                name,
                referenceAsset: asset,
                language,
                remoteId,
                prefix,
                billingMode,
                slotConfirmed: slotConsent,
                uploadConfirmed: consent,
              })
              setRequestId(crypto.randomUUID())
              setConsent(false)
              setSlotConsent(false)
              setNotice('音色紀錄已建立；請確認服務狀態後再試聽。')
            }),
        },
        mode === 'create' ? '上傳並建立音色' : '查詢並匯入既有音色',
      ),
      voices.some((v) => v.id === requestId)
        ? h(
            'div',
            { className: 'dts-sub' },
            '此請求已有紀錄，請先處理下方紀錄，避免重複建立。',
            h(
              'button',
              {
                type: 'button',
                className: 'dts-btn',
                disabled: busy,
                onClick: () => {
                  setRequestId(crypto.randomUUID())
                  setConsent(false)
                },
              },
              '開始另一筆獨立請求',
            ),
          )
        : null,
    ),
    voices.length
      ? h(
          'label',
          { className: 'dts-field' },
          '雲端音色試聽文字',
          h('textarea', {
            className: 'dts-input',
            'aria-label': '雲端音色試聽文字',
            rows: 2,
            maxLength: 1000,
            value: testText,
            onChange: (e) => setTestText(e.target.value),
          }),
        )
      : null,
    voices.map((v) =>
      h(
        'div',
        { className: 'dts-entry', key: v.id, style: { overflowWrap: 'anywhere' } },
        h(
          'div',
          { className: 'dts-sub' },
          `${v.name} · ${services[v.provider]?.label || v.provider} · ${v.model} · ${v.credentialRef}`,
        ),
        h('div', null, state(v) + '；' + (v.verifiedAt ? '曾成功合成：' + v.verifiedAt : '尚未成功合成試聽')),
        phase(v) ? h('div', { className: 'dts-sub' }, phase(v)) : null,
        v.activation
          ? h(
              'div',
              { className: 'dts-sub' },
              {
                pending: '尚未正式啟用；首次正式合成可能產生複製／音色轉正費。',
                active: '已正式啟用。',
                unlisted: '清單未列出；不能據此判定已刪除，請至服務控制檯核對。',
              }[v.activation] || v.activation,
              v.expiresAt ? ' 未啟用保留期限約至 ' + v.expiresAt : '',
            )
          : null,
        Number.isInteger(v.availableTrainingTimes)
          ? h('div', { className: 'dts-sub' }, '服務回報剩餘訓練次數：' + v.availableTrainingTimes)
          : null,
        v.activation === 'pending' || unconfirmedVoice(v)
          ? h(
              'label',
              { className: 'dts-field' },
              h('input', {
                type: 'checkbox',
                'aria-label': '確認啟用音色 ' + v.name,
                checked: confirm[v.id + ':activation'] || false,
                onChange: (e) => setConfirm((p) => ({ ...p, [v.id + ':activation']: e.target.checked })),
              }),
              unconfirmedVoice(v)
                ? '服務尚未確認此 ID 可用；仍要嘗試正式合成，成功時可能收取複製啟用費。'
                : '確認合成或套用此音色可能觸發正式啟用費。',
            )
          : null,
        h('div', { className: 'dts-sub' }, 'Voice ID：' + (v.remoteId || '尚未取得，請至服務商控制檯查詢')),
        !v.remoteId
          ? h(
              'label',
              { className: 'dts-field' },
              '補登 ' + v.name + ' 的 voice ID',
              h('input', {
                className: 'dts-input',
                value: edits[v.id + ':id'] || '',
                onChange: (e) => setEdits((p) => ({ ...p, [v.id + ':id']: e.target.value })),
              }),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dts-btn',
                  disabled: busy || !edits[v.id + ':id'],
                  onClick: () => act('attach', v, { remoteId: edits[v.id + ':id'] }),
                },
                '查詢並補登 ID',
              ),
            )
          : null,
        v.remoteId && v.remoteState !== 'deleted'
          ? h(
              React.Fragment,
              null,
              h(
                'button',
                { type: 'button', className: 'dts-btn', disabled: busy, onClick: () => act('refresh', v) },
                '查詢 ' + v.name + ' 狀態',
              ),
              h(
                'label',
                { className: 'dts-field' },
                (services[v.provider]?.rename === false ? '本機標籤 ' : '遠端名稱 ') + v.name,
                h('input', {
                  className: 'dts-input',
                  'aria-label': (services[v.provider]?.rename === false ? '本機標籤 ' : '遠端名稱 ') + v.name,
                  value: edits[v.id] ?? v.name,
                  onChange: (e) => setEdits((p) => ({ ...p, [v.id]: e.target.value })),
                }),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dts-btn',
                  disabled: busy || !props.writable,
                  onClick: () =>
                    act(services[v.provider]?.rename === false ? 'rename-local' : 'rename', v, {
                      name: edits[v.id] ?? v.name,
                    }),
                },
                '儲存 ' + v.name + (services[v.provider]?.rename === false ? ' 本機標籤' : ' 遠端名稱'),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dts-btn',
                  disabled:
                    busy ||
                    !testText.trim() ||
                    (!unconfirmedVoice(v) && (v.remoteState !== 'available' || v.operation !== 'idle')) ||
                    ((v.activation === 'pending' || unconfirmedVoice(v)) && !confirm[v.id + ':activation']),
                  onClick: () =>
                    run(async () => {
                      stopPlayback()
                      const generation = playbackGeneration,
                        controller = new AbortController()
                      requestController = controller
                      try {
                        const r = await clientFetch('/dsh-sound-atelier/voice/cloud', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'test',
                              id: v.id,
                              text: testText,
                              activationConfirmed: confirm[v.id + ':activation'] === true,
                              unconfirmedVoiceTest: unconfirmedVoice(v),
                            }),
                            signal: controller.signal,
                            timeoutMs: 125000,
                          }),
                          d = await r.json()
                        if (!r.ok || !d.ok) throw Error(d.error?.message || '試聽失敗')
                        if (generation !== playbackGeneration || controller.signal.aborted) return
                        await claimPlayback(player.sessionId, controller.signal)
                        if (generation !== playbackGeneration || controller.signal.aborted) return
                        playAudioItem({
                          kind: 'speech',
                          text: d.text,
                          mime: d.mime,
                          audioBase64: d.audioBase64,
                          sessionId: player.sessionId,
                        })
                        setNotice('已用指定 voice ID 成功合成，試聽可能使用雲端額度。')
                      } finally {
                        if (requestController === controller) requestController = null
                      }
                    }),
                },
                '合成試聽 ' + v.name + '（使用額度）',
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dts-btn',
                  disabled:
                    busy ||
                    v.remoteState !== 'available' ||
                    v.operation !== 'idle' ||
                    (v.activation === 'pending' && !confirm[v.id + ':activation']),
                  onClick: () => {
                    const c = candidates.find((c) => c.binding === v.binding),
                      row = c && props.draft.chain?.[c.index]
                    const defaults = {
                      fish: 'FISH_AUDIO_API_KEY',
                      cartesia: 'CARTESIA_API_KEY',
                      inworld: 'INWORLD_API_KEY',
                      elevenlabs: 'ELEVENLABS_API_KEY',
                      minimax: 'MINIMAX_API_KEY',
                      dashscope: 'DASHSCOPE_API_KEY',
                      siliconflow: 'SILICONFLOW_API_KEY',
                      doubao: 'DOUBAO_API_KEY',
                    }
                    let backendMatches = true
                    if (v.provider === 'dashscope')
                      backendMatches =
                        !row?.baseUrl &&
                        v.backend ===
                          `https://${props.draft.dashscopeWorkspace || ''}.${props.draft.dashscopeRegion || 'cn-beijing'}.maas.aliyuncs.com/api/v1`
                    else if (v.provider === 'minimax' || v.provider === 'siliconflow')
                      backendMatches =
                        v.backend ===
                        (
                          row?.baseUrl ||
                          props.draft[v.provider + 'BaseUrl'] ||
                          (v.provider === 'minimax' ? 'https://api.minimax.io/v1' : 'https://api.siliconflow.cn/v1')
                        ).replace(/\/+$/, '')
                    else if (v.provider === 'doubao') {
                      const url =
                        row?.baseUrl ||
                        props.draft.doubaoBaseUrl ||
                        'https://openspeech.bytedance.com/api/v3/tts/unidirectional'
                      backendMatches =
                        /^https:\/\/openspeech\.bytedance\.com\/api\/v3\/tts\/unidirectional(?:\/sse)?\/?$/.test(url)
                    } else backendMatches = !row?.baseUrl
                    if (
                      !row ||
                      !backendMatches ||
                      row.provider !== v.provider ||
                      (row.model && row.model !== v.model) ||
                      (row.keyEnv || props.draft[v.provider + 'KeyEnv'] || defaults[v.provider]) !== v.credentialRef
                    ) {
                      setError('請儲存服務列並重新讀取，讓音色與原服務／模型／金鑰槽／地域一致。')
                      return
                    }
                    try {
                      const options = {
                        ...JSON.parse(props.draft.providerOptions || '{}')[v.provider],
                        ...JSON.parse(row.options || '{}'),
                      }
                      if (v.provider === 'fish' && (options.referencePath || options.referenceIds)) {
                        setError('此 Fish 服務列仍指定其他參考音訊／多音色 ID，請先清除那些選項後再套用永久音色。')
                        return
                      }
                    } catch {
                      setError('請先修正合成參數 JSON。')
                      return
                    }
                    if (v.provider === 'siliconflow') props.setTop('siliconflowVoiceMode', 'preset')
                    if (v.provider === 'minimax') props.setTop('minimaxTransport', 'http')
                    props.setTop(
                      'chain',
                      props.draft.chain.map((r, i) =>
                        i === c.index ? { ...r, voice: v.remoteId, referenceAsset: '' } : r,
                      ),
                    )
                    setNotice('已填入原服務列的 voice ID；請儲存設定後使用。')
                  },
                },
                '將 ' + v.name + ' 填入服務列',
              ),
              v.provider === 'dashscope' || (v.provider === 'doubao' && v.billingMode === 'prepaid')
                ? h(
                    'details',
                    null,
                    h('summary', null, '更換 ' + v.name + ' 參考錄音／重新訓練'),
                    h(
                      'label',
                      { className: 'dts-field' },
                      '新參考錄音 ' + v.name,
                      h(
                        'select',
                        {
                          className: 'dts-input',
                          'aria-label': '新參考錄音 ' + v.name,
                          value: edits[v.id + ':asset'] || '',
                          disabled: busy,
                          onChange: (e) => {
                            setEdits((p) => ({ ...p, [v.id + ':asset']: e.target.value }))
                            setConfirm((p) => ({ ...p, [v.id + ':replace']: false }))
                          },
                        },
                        h('option', { value: '' }, '選擇已驗證錄音'),
                        (props.referenceAssets || []).map((a) => h('option', { key: a.id, value: a.id }, a.name)),
                      ),
                    ),
                    h(
                      'label',
                      null,
                      h('input', {
                        type: 'checkbox',
                        'aria-label': '確認重新訓練 ' + v.name,
                        checked: confirm[v.id + ':replace'] || false,
                        onChange: (e) => setConfirm((p) => ({ ...p, [v.id + ':replace']: e.target.checked })),
                      }),
                      '確認上傳此錄音覆寫原音色，可能使用訓練次數／額度；原合成驗證將失效。',
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'dts-btn',
                        disabled: busy || !props.writable || !edits[v.id + ':asset'] || !confirm[v.id + ':replace'],
                        onClick: () =>
                          act('replace-reference', v, {
                            referenceAsset: edits[v.id + ':asset'],
                            confirmRemoteId: v.remoteId,
                            uploadConfirmed: true,
                            language,
                          }),
                      },
                      '上傳並重新訓練 ' + v.name,
                    ),
                  )
                : null,
              services[v.provider]?.delete === false
                ? h(
                    'div',
                    { className: 'dts-sub' },
                    '此服務未接遠端改名／刪除介面；本機標籤及忘記紀錄不會改動雲端音色。',
                  )
                : h(
                    React.Fragment,
                    null,
                    h(
                      'label',
                      { className: 'dts-field' },
                      h('input', {
                        type: 'checkbox',
                        'aria-label': '確認刪除遠端 ' + v.name,
                        checked: confirm[v.id] || false,
                        onChange: (e) => setConfirm((p) => ({ ...p, [v.id]: e.target.checked })),
                      }),
                      '確認永久刪除遠端音色 ' + v.remoteId,
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'dts-btn',
                        disabled: busy || !props.writable || !confirm[v.id],
                        onClick: () => act('delete-remote', v, { confirmRemoteId: v.remoteId }),
                      },
                      '永久刪除遠端 ' + v.name,
                    ),
                  ),
              v.provider === 'doubao' && v.remoteState === 'upgrade-required'
                ? h(
                    'div',
                    null,
                    h(
                      'label',
                      null,
                      h('input', {
                        type: 'checkbox',
                        'aria-label': '確認升級豆包 ' + v.name,
                        checked: confirm[v.id + ':upgrade'] || false,
                        onChange: (e) => setConfirm((p) => ({ ...p, [v.id + ':upgrade']: e.target.checked })),
                      }),
                      '確認將此音色升級至 ICL 2.0',
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'dts-btn',
                        disabled: busy || !props.writable || !confirm[v.id + ':upgrade'],
                        onClick: () => act('upgrade', v, { confirmRemoteId: v.remoteId }),
                      },
                      '升級 ' + v.name + ' 至 ICL 2.0',
                    ),
                  )
                : null,
            )
          : null,
        v.provider === 'minimax' && v.uploadFileId
          ? h(
              'div',
              { className: 'dts-sub' },
              '遠端原始錄音 file ID：' + v.uploadFileId + '（與音色、本機錄音分開管理）',
              h(
                'label',
                null,
                h('input', {
                  type: 'checkbox',
                  'aria-label': '確認刪除上傳檔案 ' + v.name,
                  checked: confirm[v.id + ':upload'] || false,
                  onChange: (e) => setConfirm((p) => ({ ...p, [v.id + ':upload']: e.target.checked })),
                }),
                '確認刪除此遠端上傳錄音',
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dts-btn',
                  disabled: busy || !props.writable || !confirm[v.id + ':upload'],
                  onClick: () => act('delete-upload', v, { confirmFileId: v.uploadFileId }),
                },
                '刪除 ' + v.name + ' 遠端上傳錄音',
              ),
            )
          : null,
        h(
          'button',
          {
            type: 'button',
            className: 'dts-btn',
            disabled: busy,
            onClick: () => setConfirm((p) => ({ ...p, [v.id + ':forget']: !p[v.id + ':forget'] })),
          },
          '僅移除 ' + v.name + ' 本機紀錄',
        ),
        confirm[v.id + ':forget']
          ? h(
              'div',
              { className: 'dts-sub' },
              '遠端音色及參考錄音都會保留。',
              h(
                'button',
                {
                  type: 'button',
                  className: 'dts-btn',
                  disabled: busy,
                  onClick: () => act('forget', v, { confirm: true }),
                },
                '確認僅移除本機紀錄',
              ),
            )
          : null,
      ),
    ),
    busy ? h('div', { role: 'status' }, '雲端音色處理中…') : null,
    error ? h('div', { role: 'alert' }, error) : null,
    notice ? h('div', { role: 'status' }, notice) : null,
  )
}
