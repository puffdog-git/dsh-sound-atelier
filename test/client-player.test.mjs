import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const source = fs.readFileSync(new URL('../lib/client-src/10-player.js', import.meta.url), 'utf8')
const slice = (from, to) => source.slice(source.indexOf(from), source.indexOf(to))

// 取出播放器訂閱相關的程式，在替身 React 與假計時器下執行。
function harness() {
  const timers = new Map()
  let nextTimer = 0
  const mounted = []
  const sandbox = {
    player: { audio: null, busy: false, paused: false, blocked: false, enabled: false, queue: [], listeners: new Set() },
    setInterval: (fn, ms) => (timers.set(++nextTimer, { fn, ms }), nextTimer),
    clearInterval: id => timers.delete(id),
    React: {
      useReducer: () => { const row = { renders: 0 }; mounted.push(row); return [0, () => row.renders++] },
      useEffect: fn => { mounted.at(-1).cleanup = fn() },
    },
  }
  vm.createContext(sandbox)
  vm.runInContext(slice('function playerChanged()', '// Short chime is synthesized'), sandbox)
  const tick = () => { for (const timer of [...timers.values()]) timer.fn() }
  return { sandbox, timers, mounted, tick, mount: () => { vm.runInContext('usePlayer()', sandbox); return mounted.at(-1) } }
}

test('沒有播放時，播放器訂閱不會定時重繪每一則回覆的按鈕', () => {
  const h = harness()
  const rows = Array.from({ length: 100 }, () => h.mount())
  assert.ok(h.timers.size <= 1, '所有訂閱共用一個計時器，實際 ' + h.timers.size)
  for (let i = 0; i < 20; i++) h.tick()
  assert.equal(rows.reduce((sum, row) => sum + row.renders, 0), 0)
})

test('未經通知的狀態改變仍會在下一次檢查時更新畫面，明確通知則立即更新', () => {
  const h = harness()
  const row = h.mount()
  h.sandbox.player.audio = { currentTime: 0, duration: 10, playbackRate: 1 }
  h.tick()
  assert.equal(row.renders, 1)
  h.tick()
  assert.equal(row.renders, 1, '狀態沒變不重繪')
  h.sandbox.player.audio.currentTime = 1.3
  h.tick()
  assert.equal(row.renders, 2, '播放進度前進會更新')
  h.sandbox.player.error = '失敗'
  vm.runInContext('playerChanged()', h.sandbox)
  assert.equal(row.renders, 3)
  h.tick()
  assert.equal(row.renders, 3, '通知後不再重複重繪')
})

test('最後一個訂閱卸載後計時器停止', () => {
  const h = harness()
  const a = h.mount(), b = h.mount()
  a.cleanup()
  assert.equal(h.timers.size, 1)
  b.cleanup()
  assert.equal(h.timers.size, 0)
  assert.equal(h.sandbox.player.listeners.size, 0)
})

test('無縫播放的進度通知有節流，提示音設為無時不建立 AudioContext', () => {
  const gapless = slice('async function playGapless', 'async function drainQueue')
  assert.match(gapless, /setInterval\(\(\) => void pump\(\), 25\)/, '排程仍為 25 毫秒')
  assert.match(gapless, /progressNotifiedAt/)
  const chime = slice('function playChime(kind)', 'const CHIMES')
  assert.ok(chime.indexOf("kind === 'none'") < chime.indexOf('new AC()'), "先判斷 'none' 再建立 AudioContext")
})

test('設定頁的翻譯函式穩定，更新檢查不會隨每次重繪重複發出', () => {
  const section = fs.readFileSync(new URL('../lib/client-src/40-tts-section.js', import.meta.url), 'utf8')
  const body = section.slice(section.indexOf('function TtsSection(props)'))
  assert.doesNotMatch(body, /const t = \(key\) => zh\[key\]/, 't 不在元件內重新建立')
  assert.match(section, /const t = sectionText\b/)
  assert.doesNotMatch(section, /boolField\('autoDetectSubagent', t\('autoDetectSubagent'\), t\('autoDetectSubagent'\)\)/)
})

test('調音列：數值已是預設時「恢復預設」停用，符合目前數值的預設組合標示為已選取', () => {
  const bar = fs.readFileSync(new URL('../lib/client-src/20-tuning-bar.js', import.meta.url), 'utf8')
  assert.match(bar, /disabled: !props\.writable \|\| Object\.keys\(TUNING_DEFAULTS\)\.every/)
  assert.match(bar, /'aria-pressed': Object\.keys\(patch\)\.every\(\(key\) => value\[key\] === patch\[key\]\)/)
})

test('偏好值最多五秒同步一次，待播清單仍每次輪詢；設定變更後立即重讀', async () => {
  const calls = []
  let now = 1_000_000
  const sandbox = {
    player: { sessionId: 's1', owner: true, enabled: false, queue: [], after: '', baseline: false },
    Date: { now: () => now },
    sessionGeneration: 0, archivedSessions: new Set(), yieldUntil: 0, leaseUntil: 0, statusKnown: false,
    ignoredJobs: new Set(), seenIds: new Set(), streamCleanup: () => {}, requestController: null,
    scopeQuery: () => 'sessionId=s1', playerChanged() {}, drainQueue() {}, stopPlayback() {}, queueAutomatic() {},
    acceptsItem: () => true, startSseStream: () => () => {}, encodeURIComponent,
    clientFetch: async url => {
      calls.push(url.split('?')[0])
      return { ok: true, json: async () => (url.includes('/status') ? { speakReplies: false } : { owner: true, items: [] }) }
    },
  }
  vm.createContext(sandbox)
  vm.runInContext(slice('let polling = false', '// Recent utterances'), sandbox)
  const count = name => calls.filter(url => url.endsWith(name)).length
  for (let i = 0; i < 4; i++) { await vm.runInContext('pollPending()', sandbox); now += 1000 }
  assert.equal(count('/pending'), 4)
  assert.equal(count('/status'), 1)
  now += 2000
  await vm.runInContext('pollPending()', sandbox)
  assert.equal(count('/status'), 2, '超過五秒後重讀')
  vm.runInContext('refreshStatusSoon()', sandbox)
  await vm.runInContext('pollPending()', sandbox)
  assert.equal(count('/status'), 3, '設定變更後下一次輪詢立即重讀')
})
