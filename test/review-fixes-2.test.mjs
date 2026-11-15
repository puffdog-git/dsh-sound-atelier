// 完整程式審查第二批（2026-11-14）：每項修正先有會失敗的測試。
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createSpeechCache } from '../lib/cache.js'
import { createVoiceAssets } from '../lib/voice-assets.js'
import { audioResult } from '../lib/providers/controls.js'
import { applyPronunciation, protectAbbreviations, restoreAbbreviations } from '../lib/text.js'
import { synthesizeVoAI } from '../lib/providers/voai.js'

const source = name => fs.readFileSync(new URL('../lib/' + name, import.meta.url), 'utf8')
const tempRoot = prefix => fs.promises.mkdtemp(path.join(os.tmpdir(), prefix))
const settle = (ms = 60) => new Promise(resolve => setTimeout(resolve, ms))

test('TC1：寫入快取不需要等磁碟，下一次相同文字立即命中；命中時更新時間的寫入有節流', async () => {
  const root = await tempRoot('tts-tc1-')
  const realWrite = fs.promises.writeFile; const metaWrites = []
  fs.promises.writeFile = (file, ...rest) => { if (String(file).endsWith('.json')) metaWrites.push(String(file)); return realWrite(file, ...rest) }
  try {
    const cache = createSpeechCache({ root, maxBytes: 1024 * 1024 })
    const pending = cache.put('k1', 'audio/mpeg', Buffer.from('audio-bytes'))
    const hit = await cache.get('k1')
    assert.ok(hit, '還沒等寫入完成就能從記憶體命中'); assert.equal(hit.audio.toString(), 'audio-bytes')
    await pending; await settle()
    const before = metaWrites.length
    for (let i = 0; i < 20; i++) assert.ok(await cache.get('k1'))
    await settle()
    assert.ok(metaWrites.length - before <= 1, '連續命中不會每次重寫中繼檔（實際 ' + (metaWrites.length - before) + ' 次）')
    const fresh = createSpeechCache({ root, maxBytes: 1024 * 1024 })
    assert.equal((await fresh.get('k1')).audio.toString(), 'audio-bytes', '磁碟上的內容完整')
    await settle()
    assert.equal(await cache.clear(), 1)
    assert.equal(await cache.get('k1'), null)
  } finally { fs.promises.writeFile = realWrite; await fs.promises.rm(root, { recursive: true, force: true }) }
})

function recording() { const pcm = Buffer.alloc(24000); for (let i = 0; i < 12000; i++) pcm.writeInt16LE(Math.round(Math.sin(i * .08) * 3000), i * 2); return audioResult('fixture', pcm, 'pcm', 24000).audio.toString('base64') }

test('TV3：同一個綁定一小時內已驗證過就不再重寫錄音資料檔；逐字稿改變後仍會重新標記', async () => {
  const root = await tempRoot('tts-tv3-')
  try {
    const store = createVoiceAssets({ root })
    const asset = await store.create({ name: '參考', sample: recording(), transcript: 'Hello.' })
    const binding = { provider: 'local-tts', backend: 'http://127.0.0.1:9997', model: 'f5' }
    const first = await store.verify(asset.id, binding)
    assert.equal(first.bindings.length, 1); const stamp = first.bindings[0].verifiedAt
    const file = (await fs.promises.readdir(root, { recursive: true })).find(name => name.endsWith('asset.json'))
    const mtime = async () => (await fs.promises.stat(path.join(root, file))).mtimeMs
    const before = await mtime(); await settle(30)
    for (let i = 0; i < 5; i++) { const again = await store.verify(asset.id, binding); assert.equal(again.bindings[0].verifiedAt, stamp) }
    assert.equal(await mtime(), before, '沒有重寫')
    const other = await store.verify(asset.id, { ...binding, model: 'other' }); assert.equal(other.bindings.length, 2, '不同綁定照常記錄')
    await store.update(asset.id, { transcript: 'Changed.' })
    const after = await store.verify(asset.id, binding)
    assert.ok(after.bindings.some(b => b.model === 'f5' && b.state === 'synthesis-verified'), '驗證被清除後會重新標記')
  } finally { await fs.promises.rm(root, { recursive: true, force: true }) }
})

test('TU1／TC1 接線：合成成功後不等待用量記帳與快取寫入就交出音訊（錄音驗證仍等待，但已驗證過時只讀不寫）', () => {
  const index = source('index.js')
  assert.doesNotMatch(index, /await usageLedger\.record\(/)
  assert.match(index, /await voiceAssets\.verify\(/)
  assert.doesNotMatch(index, /await speechCache\.put\(/)
  assert.match(index, /void usageLedger\.record\(/); assert.match(index, /void speechCache\.put\(/)
})

test('TT1：發音規則與縮寫保護的正則只編譯一次，結果不變', () => {
  const rules = [{ from: 'DSH', to: 'D S H', whole: true }, { from: '/v(\\d+)/', to: '版本$1' }, { from: '[壞規則', to: 'x' }, { from: '/(/', to: 'y' }]
  const text = 'DSH v2 使用 API 與 JSON，請見 e.g. 檔案 index.js 與 3.14；[壞規則'
  const expectedA = applyPronunciation(text, rules, 'zh-TW', true), expectedB = protectAbbreviations(text)
  const Real = globalThis.RegExp; let compiled = 0
  globalThis.RegExp = new Proxy(Real, { construct(target, args) { compiled++; return new target(...args) } })
  try {
    for (let i = 0; i < 5; i++) { assert.equal(applyPronunciation(text, rules, 'zh-TW', true), expectedA); assert.equal(protectAbbreviations(text), expectedB) }
  } finally { globalThis.RegExp = Real }
  assert.equal(compiled, 0, '重複呼叫不再重新編譯（實際 ' + compiled + ' 次）')
  assert.match(expectedA, /D S H/); assert.match(expectedA, /版本2/); assert.match(expectedA, /x/, '非正則的規則照字面取代')
  assert.equal(restoreAbbreviations(expectedB), text)
  assert.equal(applyPronunciation('DSH', [{ from: 'DSH', to: 'ok', whole: true, lang: 'en' }], 'zh-TW'), 'DSH', '語言不符的規則不套用')
})

test('TPV1：VoAI 留空的模型／音色／風格只查一次目錄，不同金鑰各自查詢', async () => {
  const catalog = { data: { models: [{ info: { version: 'Neo' }, speakers: [{ name: '佑希', styles: ['預設'] }] }] } }
  const calls = []
  const fetchImpl = async (url, options) => { calls.push(String(url) + '|' + options.headers['x-api-key']); return String(url).endsWith('/TTS/GetSpeaker') ? new Response(JSON.stringify(catalog)) : new Response(new Uint8Array(64), { headers: { 'content-type': 'audio/mpeg' } }) }
  const run = key => synthesizeVoAI({ cfg: { voaiBaseUrl: 'https://voai-cache.test' }, req: { text: '你好', models: {}, voices: {}, styles: {} }, resolveKey: async () => key, fetchImpl })
  for (let i = 0; i < 4; i++) assert.equal((await run('key-a')).ok, true)
  assert.equal(calls.filter(c => c.includes('GetSpeaker')).length, 1, '同一把金鑰只查一次目錄')
  assert.equal(calls.filter(c => c.includes('/TTS/Speech')).length, 4)
  await run('key-b')
  assert.equal(calls.filter(c => c.includes('GetSpeaker')).length, 2)
  assert.doesNotMatch(source('providers/voai.js'), /catalogCache\.set\([^)]*key[,)]/, '快取鍵不含明文金鑰')
})

test('雲端回應大小上限：OpenAI 等端點改用有上限的讀取，不再一次讀完任意大小的回應', () => {
  const cloud = source('providers/cloud.js')
  assert.doesNotMatch(cloud, /Buffer\.from\(await res\.arrayBuffer\(\)\)/)
  assert.ok((cloud.match(/readAudioBody\(res/g) || []).length >= 8)
})
