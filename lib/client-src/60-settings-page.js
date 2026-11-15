function speechUiRegistry() {
  const key = Symbol.for('dsh.voice.settings.ui.v1')
  if (!window[key])
    window[key] = {
      reading: null,
      delivery: null,
      listeners: new Set(),
      notify() {
        for (const listener of [...this.listeners]) listener()
      },
    }
  return window[key]
}
function SpeechSettingsPage(props) {
  useUiLanguage()
  const registry = speechUiRegistry()
  const [, redraw] = React.useState(0)
  const [tab, setTab] = React.useState('reading')
  React.useEffect(() => {
    const listener = () => redraw((n) => n + 1)
    registry.listeners.add(listener)
    return () => registry.listeners.delete(listener)
  }, [registry])
  const Delivery = registry.delivery?.component
  return React.createElement(
    'div',
    { className: 'dts-page', 'aria-label': '語音設定' },
    React.createElement(
      'div',
      { style: { display: 'flex', justifyContent: 'flex-end' } },
      React.createElement(UiLanguagePicker),
    ),
    React.createElement('h2', { style: { margin: '0 0 8px' } }, 'DSH 聲音工坊'),
    React.createElement('p', { className: 'dts-sub' }, '設定朗讀來源與角色聲音，查看通訊通道的語音能力及交付結果。'),
    React.createElement(
      'div',
      {
        role: 'tablist',
        'aria-label': '語音設定頁籤',
        style: { display: 'flex', gap: 8, flexWrap: 'wrap', margin: '18px 0' },
      },
      [
        ['reading', '朗讀與聲音'],
        ['delivery', '語音交付'],
      ].map(([id, title]) =>
        React.createElement(
          'button',
          {
            key: id,
            id: 'dsh-voice-tab-' + id,
            type: 'button',
            role: 'tab',
            'aria-selected': tab === id,
            'aria-controls': 'dsh-voice-pane-' + id,
            className: 'dts-btn',
            onClick: () => setTab(id),
            onKeyDown: (event) => {
              if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                event.preventDefault()
                const next =
                  event.key === 'Home'
                    ? 'reading'
                    : event.key === 'End'
                      ? 'delivery'
                      : id === 'reading'
                        ? 'delivery'
                        : 'reading'
                setTab(next)
                document.getElementById('dsh-voice-tab-' + next)?.focus()
              }
            },
            tabIndex: tab === id ? 0 : -1,
          },
          title,
        ),
      ),
    ),
    React.createElement(
      'div',
      {
        id: 'dsh-voice-pane-reading',
        role: 'tabpanel',
        'aria-labelledby': 'dsh-voice-tab-reading',
        hidden: tab !== 'reading',
      },
      React.createElement(
        ErrorBoundary,
        null,
        React.createElement(TtsSection, Object.assign({}, props, { ctx: props && props.ctx })),
      ),
    ),
    React.createElement(
      'div',
      {
        id: 'dsh-voice-pane-delivery',
        role: 'tabpanel',
        'aria-labelledby': 'dsh-voice-tab-delivery',
        hidden: tab !== 'delivery',
      },
      React.createElement(ErrorBoundary, null, React.createElement(DiscordLinkCard, { active: tab === 'delivery' })),
      Delivery
        ? React.createElement(Delivery)
        : React.createElement(
            'p',
            { className: 'dts-sub', role: 'status' },
            '語音交付橋接未載入。啟用 dsh-speech-bridge 後，這裡會顯示通道能力與最近交付；朗讀設定仍可獨立使用。',
          ),
    ),
  )
}
exports.SpeechSettingsPage = SpeechSettingsPage

function TtsRowConfig(props) {
  useUiLanguage()
  const t = (props && props.t) || ((key) => key)
  if (props && props.view === 'summary') {
    return React.createElement('div', { className: 'dts-sub' }, t('subtitle'))
  }
  return React.createElement(SpeechSettingsPage, props)
}

function registerSettings(ctx) {
  ctx.effect(() => {
    const registry = speechUiRegistry(),
      token = {}
    registry.reading = token
    registry.notify()
    return () => {
      if (registry.reading === token) {
        registry.reading = null
        registry.notify()
      }
    }
  }, 'dsh-tts: unified voice settings owner')
  // Dictionary packages may also register languages for other namespaces.
  // Core throws on duplicate namespace+language; an unguarded call used to
  // take down the whole plugin ("Failed to load plugins"). Register each
  // language separately: skip if taken; English still lands.
  const addLocale = (locale, dictionary) => {
    try {
      return ctx.locale.register(NS, locale, dictionary)
    } catch (alreadyTaken) {
      return () => {}
    }
  }
  ctx.effect(() => {
    const undo = [addLocale('en', zh), addLocale('zh', zh), addLocale('zh-TW', zh)]
    return () => {
      for (const off of undo) off()
    }
  }, 'dsh-tts: locales')
  // The sidebar draws the section label, not our component: props.t never
  // reaches it, so bind the translator to the namespace ourselves.
  const t = (key) => zh[key] ?? key
  ctx.slots.inject('settings.section', () =>
    ctx.slots.register(
      {
        name: 'settings.section',
        id: NS,
        order: 55,
        label: () => 'DSH 聲音工坊',
        locale: NS,
        inject: () => ({ ctx, t }),
      },
      TtsRowConfig,
    ),
  )
  // Current core: settings live on the plugin's own row on the Plugins page
  // (`plugins.row.config`). Key = '<package name>#<row id>'; the row gains a
  // configure control that asks for view:'summary' and view:'page'.
  try {
    ctx.slots.inject('plugins.row.config', () =>
      ctx.slots.register(
        {
          name: 'plugins.row.config',
          key: ROW_CONFIG_KEY,
          locale: NS,
          inject: () => ({ ctx: ctx }),
        },
        TtsRowConfig,
      ),
    )
  } catch (rowSeatUnavailable) {
    console.warn(
      '[dsh-tts] row seat plugins.row.config not available:',
      rowSeatUnavailable && rowSeatUnavailable.message,
    )
  }
  // Plugin-list seat (`plugins.item`): the seat the current core (0.1.6-alpha.2)
  // renders as the plugin's own page with its configuration. The label is a static
  // string on purpose — it is resolved while the page renders, and a locale lookup
  // there would take the whole client batch down with it.
  try {
    ctx.slots.inject('plugins.item', () =>
      ctx.slots.register(
        {
          name: 'plugins.item',
          id: ROW_ID,
          order: 60,
          label: () => fallbackDockText('title') || 'DSH-sound-atelier',
          locale: NS,
          inject: () => ({ ctx: ctx }),
        },
        TtsRowConfig,
      ),
    )
  } catch (itemSeatUnavailable) {
    console.warn('[dsh-tts] list seat plugins.item not available:', itemSeatUnavailable && itemSeatUnavailable.message)
  }
  // Fallback for hosts that render the older plugin-settings tab card. The tab
  // looks up a slot by entryKey equal to the namespace name: key must equal NS
  // or the card never appears, with no log error.
  ctx.slots.inject('settings.plugin.item', () =>
    ctx.slots.register(
      {
        name: 'settings.plugin.item',
        key: NS,
        locale: NS,
        inject: () => ({ ctx: ctx }),
      },
      TtsCard,
    ),
  )
}

exports.inject = ['slots', 'configForms', 'locale']
