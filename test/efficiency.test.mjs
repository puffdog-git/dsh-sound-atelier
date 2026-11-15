import test from 'node:test'
import assert from 'node:assert/strict'
import { hostFixture } from './host-fixture.mjs'
import { trimReplayWindow } from '../lib/replay-window.js'

test('與朗讀無關的會話事件不重新解析整份設定', async () => {
  const f = await hostFixture({ speakReplies: false })
  try {
    let reads = 0
    const value = f.config.maxChars
    Object.defineProperty(f.config, 'maxChars', { enumerable: true, configurable: true, get() { reads++; return value } })
    const emit = type => f.events.get('session/event')({ id: 'quiet' }, { type, data: {} })
    for (const type of ['tool/call', 'tool/result', 'assistant/delta', 'user/message', 'step/start']) emit(type)
    assert.equal(reads, 0)
    emit('turn/end')
    assert.ok(reads > 0, '朗讀相關事件仍讀取最新設定')
  } finally { f.close() }
})

test('補播視窗同時受筆數與總位元組限制，保留位與最新項目不被移除', () => {
  const audio = 'x'.repeat(1024)
  const done = id => ({ id, kind: 'speech', audioBase64: audio })
  const byCount = Array.from({ length: 300 }, (_, i) => done(i))
  trimReplayWindow(byCount, { limit: 256, maxBytes: Infinity })
  assert.equal(byCount.length, 256)
  assert.equal(byCount[0].id, 44)

  const byBytes = Array.from({ length: 100 }, (_, i) => done(i))
  trimReplayWindow(byBytes, { limit: 256, maxBytes: 10 * 1024 })
  assert.equal(byBytes.length, 10)
  assert.equal(byBytes.at(-1).id, 99)

  const blocked = [{ id: 'r', kind: 'reserved' }, ...Array.from({ length: 50 }, (_, i) => done(i))]
  trimReplayWindow(blocked, { limit: 256, maxBytes: 1024 })
  assert.equal(blocked.length, 51, '保留位之後的項目不移除')

  const single = [{ id: 'big', kind: 'speech', audioBase64: 'y'.repeat(4096) }]
  trimReplayWindow(single, { limit: 256, maxBytes: 1024 })
  assert.equal(single.length, 1)
})

test('音色方案可攜帶的閒置回收欄位是實際存在的設定鍵', async () => {
  const { PROFILE_FIELDS } = await import('../lib/voice-profiles.js')
  const f = await hostFixture()
  try {
    assert.ok(PROFILE_FIELDS.includes('localTtsIdleSeconds'))
    assert.ok(!PROFILE_FIELDS.includes('localTtsIdleMinutes'))
    for (const key of PROFILE_FIELDS) assert.ok(key in f.config, key + ' 不是設定鍵')
  } finally { f.close() }
})

test('舊音色方案留下的無作用欄位被忽略，不讓整個方案失效', async () => {
  const { profileInput } = await import('../lib/voice-profiles.js')
  const profile = profileInput({ name: '舊方案', chain: [{ provider: 'edge' }], config: { rate: 1.1, localTtsIdleMinutes: 5 } })
  assert.equal(profile.config.rate, 1.1)
  assert.ok(!('localTtsIdleMinutes' in profile.config))
  assert.throws(() => profileInput({ name: 'x', chain: [{ provider: 'edge' }], config: { nope: 1 } }), /不支援的設定欄位/)
})
