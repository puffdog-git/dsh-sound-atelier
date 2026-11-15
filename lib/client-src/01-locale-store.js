var module = { exports: {} }
var exports = module.exports

// UI-only dictionary: never convert configuration values, prompts or chat payloads.
const UiReact = require('react')
const uiLocaleKey = Symbol.for('dsh.voice.ui.locale.v1')
const uiLocale =
  window[uiLocaleKey] ||
  (window[uiLocaleKey] = (() => {
    let language = 'zh-Hant'
    try {
      if (localStorage.getItem('dsh.voice.ui.locale') === 'zh-Hans') language = 'zh-Hans'
    } catch {}
    const listeners = new Set()
    const store = {
      dictionary: Object.create(null),
      get: () => language,
      subscribe(fn) {
        listeners.add(fn)
        return () => listeners.delete(fn)
      },
      set(next) {
        if (!['zh-Hant', 'zh-Hans'].includes(next) || next === language) return
        language = next
        try {
          localStorage.setItem('dsh.voice.ui.locale', next)
        } catch {}
        for (const fn of listeners) fn()
      },
    }
    window.addEventListener?.('storage', (event) => {
      if (event.key === 'dsh.voice.ui.locale') store.set(event.newValue || 'zh-Hant')
    })
    return store
  })())
// OpenCC-JS 1.4.2: MIT code, Apache-2.0 dictionary. See UI-LOCALE-NOTICE.md.
