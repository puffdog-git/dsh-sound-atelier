const PROFILE_CONFIG_FIELDS = [
  'rate',
  'pitch',
  'volume',
  'speechInstruction',
  'voaiPitch',
  'doubaoPitch',
  'styleWeight',
  'breathPause',
  'spokenLanguage',
  'translationModel',
  'translationGlossary',
  'translationMaxTokens',
  'localTtsBackend',
  'localTtsFamily',
  'localTtsReferenceAsset',
  'localTtsEmotionAsset',
  'localTtsPromptLanguage',
  'localTtsLanguage',
  'localTtsDevice',
  'localTtsModelPath',
  'localTtsNativeModel',
  'localTtsNativeTrusted',
  'rvcEnabled',
  'rvcManaged',
  'rvcBaseUrl',
  'rvcDevice',
  'rvcModelAsset',
  'rvcIndexAsset',
  'rvcOptions',
  'providerOptions',
  'localTtsBaseUrl',
  'localTtsIdleSeconds',
  'language',
  'mimoInstruction',
  'doubaoInstruction',
  'mimoVoiceDesign',
  'mimoReferencePath',
  'deepinfraVoiceDesign',
  'siliconflowVoiceMode',
  'siliconflowReferencePath',
  'siliconflowReferenceText',
  'cosyvoiceUrl',
  'cosyvoiceApiMode',
  'cosyvoiceMode',
  'cosyvoiceReferencePath',
  'cosyvoiceReferenceText',
  'cosyvoiceSampleRate',
  'minimaxTransport',
  'piperModel',
  'piperBin',
  'espeakBin',
  'edgeBin',
  'rvcBypassOnFailure',
]
function VoiceProfilePanel({ draft, writable, setTop }) {
  const h = React.createElement,
    [data, D] = React.useState(null),
    [error, E] = React.useState(''),
    [busy, B] = React.useState(false),
    [name, N] = React.useState(''),
    [selected, S] = React.useState(''),
    [scope, C] = React.useState('persona'),
    [key, K] = React.useState('')
  const request = async (method = 'GET', body) => {
    const r = await clientFetch('/dsh-sound-atelier/voice/profiles', {
        method,
        cache: 'no-store',
        ...(body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}),
      }),
      v = await r.json()
    if (!r.ok || !v.ok) throw Error(v.error?.message || '無法讀取音色方案')
    return v
  }
  const load = async () => D(await request())
  React.useEffect(() => {
    load().catch((e) => E(e.message))
  }, [])
  const run = async (body) => {
    B(true)
    E('')
    try {
      const v = await request('POST', { ...body, revision: data.revision })
      if (v.profile) S(v.profile.id)
      await load()
    } catch (e) {
      E(e.message)
    } finally {
      B(false)
    }
  }
  const fields = PROFILE_CONFIG_FIELDS,
    profiles = data?.profiles || [],
    items = scope === 'persona' ? data?.personas : scope === 'workspace' ? data?.workspaces : data?.sessions,
    disabled = !writable || busy || !data
  const label = (p) => p?.name || p?.title || p?.id || '未知專案',
    profileLabel = (id) => {
      const p = profiles.find((p) => p.id === id)
      return p ? p.name + ' · ' + p.chain[0]?.provider + ' / ' + (p.chain[0]?.voice || '預設音色') : '方案已不存在'
    }
  return h(
    'div',
    { className: 'dts-profile-panel' },
    h(
      'section',
      { className: 'dts-block' },
      h('h2', { className: 'dts-h' }, '配音語言'),
      h('p', { className: 'dts-sub' }, '聊天正文保持原樣；可讓語音以自然日文朗讀。翻譯可能增加模型用量與等待時間。'),
      h(
        'label',
        { className: 'dts-field' },
        '配音模式',
        h(
          'select',
          {
            className: 'dts-input',
            'aria-label': '配音模式',
            value: draft.spokenLanguage || 'original',
            disabled: !writable,
            onChange: (e) => setTop('spokenLanguage', e.target.value),
          },
          h('option', { value: 'original' }, '原文配音'),
          h('option', { value: 'ja' }, '日文配音・保留中文正文'),
        ),
      ),
      draft.spokenLanguage === 'ja'
        ? h(
            React.Fragment,
            null,
            h(
              'label',
              { className: 'dts-field' },
              '翻譯模型（可留空）',
              h('input', {
                className: 'dts-input',
                value: draft.translationModel || '',
                placeholder: 'provider/model',
                disabled: !writable,
                onChange: (e) => setTop('translationModel', e.target.value),
              }),
            ),
            h(
              'label',
              { className: 'dts-field' },
              '專名與人稱用語表（JSON）',
              h('textarea', {
                className: 'dts-input',
                value: draft.translationGlossary || '{}',
                disabled: !writable,
                onChange: (e) => setTop('translationGlossary', e.target.value),
              }),
            ),
            h(
              'p',
              { className: 'dts-sub' },
              '請選擇支援日文的模型與音色，例如 Edge 日文音色或 Irodori。翻譯失敗會回報錯誤，不會默默改讀中文。日文的時間軸對應日文配音。',
            ),
          )
        : null,
    ),
    h(
      'section',
      { className: 'dts-block' },
      h('h2', { className: 'dts-h' }, '人格與音色方案'),
      h(
        'p',
        { className: 'dts-sub' },
        '優先順序：單次指定 → 會話 → 工作區 → 人格 → 全域。先在語音來源設定好聲音，再建立方案；憑證只保留安全槽名稱。方案立即儲存，與下方全域設定分開。',
      ),
      h(
        'div',
        { className: 'dts-row' },
        h('input', {
          className: 'dts-input',
          'aria-label': '音色方案名稱',
          placeholder: '例如：小葵・日文',
          value: name,
          disabled,
          onChange: (e) => N(e.target.value),
        }),
        h(
          'button',
          {
            type: 'button',
            className: 'dts-save',
            disabled: disabled || !name.trim(),
            onClick: () =>
              run({
                action: 'save',
                profile: {
                  name,
                  chain: draft.chain,
                  config: Object.fromEntries(fields.filter((k) => draft[k] !== undefined).map((k) => [k, draft[k]])),
                },
              }),
          },
          '以目前設定建立方案',
        ),
      ),
      h(
        'label',
        { className: 'dts-field' },
        '選擇音色方案',
        h(
          'select',
          {
            className: 'dts-input',
            'aria-label': '選擇音色方案',
            value: selected,
            disabled,
            onChange: (e) => S(e.target.value),
          },
          h('option', { value: '' }, '繼承全域／上層設定'),
          profiles.map((p) => h('option', { key: p.id, value: p.id }, profileLabel(p.id))),
        ),
      ),
      selected
        ? h(
            'div',
            { className: 'dts-row' },
            h(
              'button',
              {
                type: 'button',
                className: 'dts-link',
                disabled,
                onClick: () => {
                  const p = profiles.find((p) => p.id === selected)
                  if (p) {
                    setTop('chain', structuredClone(p.chain))
                    for (const [k, v] of Object.entries(p.config)) setTop(k, v)
                  }
                },
              },
              '載入至編輯器',
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dts-link',
                disabled,
                onClick: () => {
                  if (
                    window.confirm(
                      '以目前編輯器的聲音與語言設定更新這個方案？套用該方案的會話會在下一次合成使用新設定。',
                    )
                  )
                    run({
                      action: 'save',
                      profile: {
                        id: selected,
                        name: name.trim() || profiles.find((p) => p.id === selected)?.name,
                        chain: draft.chain,
                        config: Object.fromEntries(
                          fields.filter((k) => draft[k] !== undefined).map((k) => [k, draft[k]]),
                        ),
                      },
                    })
                },
              },
              '以目前設定更新方案',
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dts-link',
                disabled,
                onClick: () => {
                  if (window.confirm('刪除這個本機音色方案及其綁定？不會刪除錄音、模型或雲端音色。'))
                    run({ action: 'remove', id: selected }).then(() => S(''))
                },
              },
              '刪除本機方案',
            ),
          )
        : null,
      h(
        'div',
        { className: 'dts-row' },
        h(
          'select',
          {
            className: 'dts-input',
            'aria-label': '綁定範圍',
            value: scope,
            disabled,
            onChange: (e) => {
              C(e.target.value)
              K('')
            },
          },
          [
            ['persona', '人格'],
            ['workspace', '工作區'],
            ['session', '會話'],
          ].map(([id, n]) => h('option', { key: id, value: id }, n)),
        ),
        h(
          'select',
          {
            className: 'dts-input',
            'aria-label': '綁定對象',
            value: key,
            disabled,
            onChange: (e) => K(e.target.value),
          },
          h('option', { value: '' }, '選擇綁定對象'),
          (items || []).map((p) => h('option', { key: p.id, value: p.id }, label(p))),
        ),
        h(
          'button',
          {
            type: 'button',
            className: 'dts-save',
            disabled: disabled || !key,
            onClick: () => run({ action: 'bind', scope, key, profileId: selected || null }),
          },
          selected ? '套用綁定' : '移除綁定',
        ),
      ),
      (data?.personaAdapters || []).length
        ? h(
            'label',
            { className: 'dts-field' },
            '人格資料來源',
            h(
              'select',
              {
                className: 'dts-input',
                'aria-label': '人格資料來源',
                value: draft.personaAdapter || 'auto',
                disabled: !writable,
                onChange: (e) => setTop('personaAdapter', e.target.value),
              },
              h('option', { value: 'auto' }, '自動（使用所有已連線的人格插件）'),
              data.personaAdapters.map((a) => h('option', { key: a.id, value: a.id }, a.name + (a.available ? '' : '（未連線）'))),
            ),
            h('span', { className: 'dts-sub' }, '有多個人格插件時，可指定只從其中一個讀取人格清單。這是全域設定，要按下方的儲存才生效。'),
          )
        : null,
      h(
        'button',
        { type: 'button', className: 'dts-link', disabled: busy, onClick: () => load().catch((e) => E(e.message)) },
        '重新整理人格與會話',
      ),
      data?.personaAdapters
        ?.filter((a) => !a.available)
        .map((a) => h('p', { className: 'dts-sub', key: a.id }, a.name + ' 尚未連線；仍可綁定工作區或會話。')),
      h(
        'div',
        { className: 'dts-bindings' },
        (data?.bindings || []).length
          ? h(
              'table',
              null,
              h(
                'thead',
                null,
                h(
                  'tr',
                  null,
                  ['範圍', '人格／工作區／會話', '使用音色'].map((n) => h('th', { key: n }, n)),
                ),
              ),
              h(
                'tbody',
                null,
                data.bindings.map((b) =>
                  h(
                    'tr',
                    { key: b.scope + ':' + b.key },
                    h('td', null, { persona: '人格', workspace: '工作區', session: '會話' }[b.scope]),
                    h(
                      'td',
                      null,
                      label(
                        (b.scope === 'persona'
                          ? data.personas
                          : b.scope === 'workspace'
                            ? data.workspaces
                            : data.sessions
                        ).find((p) => p.id === b.key),
                      ) === '未知專案'
                        ? b.key
                        : label(
                            (b.scope === 'persona'
                              ? data.personas
                              : b.scope === 'workspace'
                                ? data.workspaces
                                : data.sessions
                            ).find((p) => p.id === b.key),
                          ),
                    ),
                    h('td', null, profileLabel(b.profileId)),
                  ),
                ),
              ),
            )
          : h('p', { className: 'dts-sub' }, '目前沒有綁定，所有會話繼承全域音色。'),
      ),
      error ? h('p', { className: 'dts-bad', role: 'alert' }, error) : null,
    ),
    h(
      'section',
      { className: 'dts-block' },
      h('h2', { className: 'dts-h' }, '在聊天軟體中使用語音'),
      h('p', { className: 'dts-sub' }, '這裡將文字轉成聲音，再由通訊插件送到目前的對話。已接上的方式如下：'),
      h(
        'ul',
        { className: 'dts-sub' },
        h('li', null, 'Discord：可在已設定的語音房播放，也可回覆可點擊播放的語音訊息。'),
        h('li', null, 'OneBot／QQBot：啟用「語音交付橋接」並設定對應通訊插件後，可在該對話要求語音回覆。'),
        h('li', null, 'dsh-im：啟用語音擴充後，支援的平台可顯示語音泡泡；不支援的通道則以音訊附件呈現。'),
      ),
      h(
        'p',
        { className: 'dts-sub' },
        '安裝 TTS 不會自動讓所有回覆變成語音，仍需在通訊插件啟用所需功能。可切換到上方「語音交付」，查看通道限制與傳送結果；「已排程」代表正在等候，尚未確認送達。',
      ),
    ),
  )
}
