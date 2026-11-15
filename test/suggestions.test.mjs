// 「功能改進建議」在聲音工坊的實作測試。
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { profileInput, PROFILE_FIELDS } from '../lib/voice-profiles.js'

test('三-T4：沒有作用的三個開關不再是音色方案欄位；舊方案帶著它們仍可讀取（略過不報錯）', () => {
  for (const key of ['enableLocalEngines', 'kokoroEnabled', 'f5Enabled']) assert.ok(!PROFILE_FIELDS.includes(key), key)
  const profile = profileInput({ name: '舊方案', chain: [{ provider: 'edge', voice: 'zh-TW-HsiaoChenNeural' }], config: { rate: 1.1, enableLocalEngines: true, kokoroEnabled: false, f5Enabled: true } })
  assert.equal(profile.config.rate, 1.1)
  for (const key of ['enableLocalEngines', 'kokoroEnabled', 'f5Enabled']) assert.ok(!(key in profile.config), key)
  assert.ok(PROFILE_FIELDS.includes('localTtsIdleSeconds'))
})

test('三-T4：介面的方案欄位清單與後端一致', () => {
  const source = fs.readFileSync(new URL('../lib/client-src/30-voice-profile.js', import.meta.url), 'utf8')
  const list = source.slice(source.indexOf('const PROFILE_CONFIG_FIELDS = ['), source.indexOf(']', source.indexOf('const PROFILE_CONFIG_FIELDS = [')))
  const keys = [...list.matchAll(/'([A-Za-z0-9]+)'/g)].map((m) => m[1])
  assert.deepEqual([...keys].sort(), [...PROFILE_FIELDS].sort())
})

test('三-T5：英文字典已移除，介面文字只走繁中字典', () => {
  const dir = new URL('../lib/client-src/', import.meta.url)
  assert.ok(!fs.existsSync(new URL('15-i18n-en.js', dir)))
  for (const name of fs.readdirSync(dir).filter((n) => n.endsWith('.js') && !n.includes('opencc')))
    assert.ok(!/\ben\[/.test(fs.readFileSync(new URL(name, dir), 'utf8')), name + ' 仍引用英文字典')
})

import { hostFixture } from './host-fixture.mjs'
import { legacyRoutePath, registerRoute, API_BASE, LEGACY_API_BASE } from '../lib/http-util.js'
import { status as updaterStatus } from '../lib/updater.js'

test('套件改名：套件與列 ID 是 dsh-sound-atelier；每條路由同時註冊在新路徑與改名前的路徑', async () => {
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  assert.equal(pkg.name, 'dsh-sound-atelier')
  assert.match(fs.readFileSync(new URL('../cordis.patch.yml', import.meta.url), 'utf8'), /id: dsh-sound-atelier\s+name: 'dsh-sound-atelier'/)
  assert.match(fs.readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'), /id: 'dsh-sound-atelier'/)
  assert.equal(API_BASE, '/dsh-sound-atelier')
  assert.equal(legacyRoutePath('/dsh-sound-atelier/status'), '/dsh-tts/status')
  assert.equal(legacyRoutePath('/api/dsh-sound-atelier/update'), '/api/dsh-tts/update')
  assert.equal(legacyRoutePath('/other/path'), null)
  const seen = []
  const off = registerRoute({ register: (spec) => { seen.push(spec.path); return () => seen.splice(seen.indexOf(spec.path), 1) } }, { kind: 'exact', path: '/dsh-sound-atelier/x', handler() {} })
  assert.deepEqual(seen, ['/dsh-sound-atelier/x', '/dsh-tts/x'])
  off()
  assert.deepEqual(seen, [])
  const fixture = await hostFixture({ speakReplies: false })
  try {
    const paths = [...fixture.routes.keys()]
    const modern = paths.filter((p) => p.startsWith(API_BASE + '/') || p.startsWith('/api' + API_BASE + '/'))
    assert.ok(modern.length >= 30, '新路徑數量：' + modern.length)
    for (const p of modern) assert.ok(fixture.routes.has(legacyRoutePath(p)), '缺少舊路徑別名：' + p)
    assert.ok(!paths.some((p) => p.startsWith(LEGACY_API_BASE + '/') && !fixture.routes.has(API_BASE + p.slice(LEGACY_API_BASE.length))), '沒有只存在於舊路徑的路由')
    assert.equal(fixture.routes.get('/dsh-sound-atelier/status'), fixture.routes.get('/dsh-tts/status'), '新舊路徑是同一個處理函式')
  } finally {
    fixture.close()
  }
})

test('套件改名：改名後不提供一鍵更新（避免把上游的舊名套件另外裝進來）', async () => {
  const options = { packageName: '@goodandready/dsh-tts', manifestUrl: new URL('../package.json', import.meta.url), localFork: true, fetch: async () => ({ ok: true, json: async () => ({ 'dist-tags': { latest: '99.0.0' }, version: '99.0.0' }) }) }
  const result = await updaterStatus(options, { profileName: 'desktop', cliEntry: 'x' })
  assert.equal(result.updateAvailable, false)
  assert.equal(result.canAutoUpdate, false)
  assert.equal(result.localFork, true)
})
