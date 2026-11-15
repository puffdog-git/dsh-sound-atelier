import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { Config, plainConfig } from '../lib/index.js'

const file = (rel) => fileURLToPath(new URL(rel, import.meta.url))

test('lib/client.js is built from lib/client-src', () => {
  const result = spawnSync(process.execPath, [file('../tools/build-client.mjs'), '--check'], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr || result.stdout)
})

test('a fresh install speaks Chinese with the key-free Edge voice and stays silent until enabled', () => {
  const defaults = plainConfig(Config({}))
  assert.equal(defaults.chain[0].provider, 'edge')
  assert.equal(defaults.chain[0].voice, 'zh-TW-HsiaoChenNeural')
  assert.equal(defaults.language, 'zh-TW')
  // 自動朗讀仍預設關閉：不在使用者沒預期時突然出聲。
  assert.equal(defaults.speakReplies, false)
})

test('every chime name offered in the UI has its own sound and the barge-in switch is exposed', () => {
  const player = fs.readFileSync(file('../lib/client-src/10-player.js'), 'utf8')
  const chimes = fs.readFileSync(file('../lib/client-src/29-packs-chimes-stats.js'), 'utf8')
  const section = fs.readFileSync(file('../lib/client-src/40-tts-section.js'), 'utf8')
  const offered = /const chimes = \[([^\]]+)\]/.exec(chimes)[1].match(/'(\w+)'/g).map((name) => name.slice(1, -1))
  for (const name of offered.filter((item) => item !== 'none'))
    assert.match(player, new RegExp(`\\b${name}: \\[\\[`), name + ' has no tone definition')
  assert.match(player, /kind === 'none'/)
  assert.match(section, /boolField\(\s*'vadBargeIn'/)
  // CosyVoice 網址只出現一次（選到該服務時），不重複放在進階區。
  assert.equal(section.split("textField('cosyvoiceUrl'").length - 1, 1)
})

test('built-in voice packs offer a zh-TW and a zh-CN Edge voice and keep the fallback chain', () => {
  const core = fs.readFileSync(file('../lib/client-src/04-core.js'), 'utf8')
  const section = fs.readFileSync(file('../lib/client-src/40-tts-section.js'), 'utf8')
  const packs = [...core.matchAll(/voices: \{ 'zh-TW': '([^']+)', 'zh-CN': '([^']+)' \}/g)]
  assert.equal(packs.length, 5)
  for (const [, tw, cn] of packs) {
    assert.match(tw, /^zh-TW-\w+Neural$/)
    assert.match(cn, /^zh-CN-\w+Neural$/)
  }
  assert.doesNotMatch(core.slice(core.indexOf('const VOICE_PACKS')), /en-US-/)
  // 套用音色包只換主要服務，不丟掉備援。
  assert.match(section, /setTop\('chain', \[patch\.entry, \.\.\.\(draft\.chain \|\| \[\]\)\.slice\(1\)\]\)/)
})

test('spoken reminders default to Chinese to match the default voice', () => {
  const defaults = plainConfig(Config({}))
  assert.equal(defaults.approvalText, '需要你的批准')
  assert.equal(defaults.questionText, '助理有問題想問你')
  assert.equal(defaults.approvalDecidedText, '已收到批准決定')
})
