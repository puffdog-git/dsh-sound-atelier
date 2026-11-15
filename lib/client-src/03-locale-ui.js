// 簡體模式下，建立元素時直接轉換文字，不再替每個元素多包一層元件。
// 語言切換由各掛載點的根元件訂閱一次（useUiLanguage），整棵樹跟著重繪。
const uiConvertCache = new Map()
function uiConvert(value) {
  if (value.length > 200) return uiLocale.convert(value)
  let out = uiConvertCache.get(value)
  if (out === undefined) {
    out = uiLocale.convert(value)
    if (uiConvertCache.size >= 4000) uiConvertCache.clear()
    uiConvertCache.set(value, out)
  }
  return out
}
const uiTranslate = (value) =>
  typeof value === 'string' ? uiConvert(value) : Array.isArray(value) ? value.map(uiTranslate) : value
const UI_VERBATIM_TAGS = new Set(['style', 'script', 'textarea', 'pre', 'code'])
const UI_TEXT_PROPS = ['title', 'placeholder', 'aria-label', 'alt']
const uiCreateElement = (tag, props, ...content) => {
  if (
    typeof tag !== 'string' ||
    uiLocale.get() !== 'zh-Hans' ||
    props?.['data-ui-verbatim'] ||
    UI_VERBATIM_TAGS.has(tag) ||
    /(?:dpl-log|dpl-hist-text)/.test(props?.className || '')
  )
    return UiReact.createElement(tag, props, ...content)
  let next = props
  for (const key of UI_TEXT_PROPS)
    if (typeof props?.[key] === 'string') {
      if (next === props) next = { ...props }
      next[key] = uiConvert(props[key])
    }
  return UiReact.createElement(tag, next, ...content.map(uiTranslate))
}
const useUiLanguage = () => UiReact.useSyncExternalStore(uiLocale.subscribe, uiLocale.get, uiLocale.get)
const React = { ...UiReact, createElement: uiCreateElement }
function UiLanguagePicker() {
  const language = UiReact.useSyncExternalStore(uiLocale.subscribe, uiLocale.get, uiLocale.get)
  return UiReact.createElement(
    'label',
    {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        fontSize: 12,
      },
    },
    '文 / A',
    UiReact.createElement(
      'select',
      {
        'aria-label': '介面語言 / 界面语言',
        value: language,
        onChange: (event) => uiLocale.set(event.target.value),
        style: {
          font: 'inherit',
          color: 'inherit',
          background: 'var(--dpl-bg,var(--dsw-alias-bg-layer-3,Canvas))',
          border: '1px solid #8887',
          borderRadius: 8,
          padding: '6px 8px',
          maxWidth: '100%',
        },
      },
      UiReact.createElement('option', { value: 'zh-Hant' }, '繁體中文'),
      UiReact.createElement('option', { value: 'zh-Hans' }, '简体中文'),
    ),
  )
}

// Chevron comes from core UI primitives; local SVG is a fallback for
// builds without the package. Icon always points down; open state rotates.
