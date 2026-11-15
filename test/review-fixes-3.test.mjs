// 第三批審查修正：介面語言轉換不再替每個元素多包一層元件。
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

for (const [name, file] of [
  ['TTS', new URL('../lib/client-src/03-locale-ui.js', import.meta.url)],
  ['Discord', new URL('../../dsh-discord-pyself-lab/client-src/03-locale-ui.js', import.meta.url)],
]) {
  test(name + '：元素直接建立，簡體模式才轉換文字，原文區塊與設定值不動', { skip: !fs.existsSync(file) }, () => {
    let language = 'zh-Hant', converts = 0
    const sandbox = {
      UiReact: { createElement: (tag, props, ...content) => ({ tag, props, content }), useSyncExternalStore: (s, get) => get() },
      uiLocale: { get: () => language, subscribe: () => () => {}, convert: (text) => (converts++, text.replaceAll('設', '设').replaceAll('語', '语')) },
    }
    vm.createContext(sandbox)
    vm.runInContext(fs.readFileSync(file, 'utf8') + '\nglobalThis.h = React.createElement', sandbox)
    const props = { title: '語音設定', value: '設定值', className: 'x' }
    let el = sandbox.h('div', props, '語音', ['設定'])
    assert.equal(el.tag, 'div', '不再包一層元件')
    assert.equal(el.props, props)
    assert.deepEqual(el.content, ['語音', ['設定']])
    assert.equal(converts, 0)
    language = 'zh-Hans'
    el = sandbox.h('div', props, '語音', ['設定'], 3)
    assert.equal(el.tag, 'div')
    assert.equal(el.props.title, '语音设定')
    assert.equal(el.props.value, '設定值', '欄位值不轉換')
    assert.equal(props.title, '語音設定', '不改動原本的 props 物件')
    assert.deepEqual(el.content, ['语音', ['设定'], 3])
    const before = converts
    sandbox.h('div', props, '語音', ['設定'])
    assert.equal(converts, before, '相同文字使用快取，不重複轉換')
    for (const [tag, p] of [['textarea', null], ['pre', null], ['code', null], ['div', { 'data-ui-verbatim': true }], ['div', { className: 'dpl-log' }]])
      assert.deepEqual(sandbox.h(tag, p, '語音').content, ['語音'], tag + ' 保持原文')
    const Component = () => null
    assert.equal(sandbox.h(Component, { title: '語音' }).props.title, '語音', '元件的 props 不轉換')
  })
}
