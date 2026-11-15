import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { isLocalRequest } from '../lib/speech-bridge/local-request.js'

const req = (host, remoteAddress = '127.0.0.1') => ({ socket: { remoteAddress }, headers: host === undefined ? {} : { host } })

test('狀態端點只接受本機來源且 Host 為本機位址的請求', () => {
  for (const host of ['127.0.0.1:3080', 'localhost:3000', '[::1]:3000', 'LOCALHOST', undefined]) assert.equal(isLocalRequest(req(host)), true, String(host))
  assert.equal(isLocalRequest(req('127.0.0.1:3080', '::ffff:127.0.0.1')), true)
  assert.equal(isLocalRequest(req('attacker.example:3080')), false, 'DNS rebinding')
  assert.equal(isLocalRequest(req('127.0.0.1.attacker.example')), false)
  assert.equal(isLocalRequest(req('127.0.0.1:3080', '192.168.1.5')), false)
  assert.equal(isLocalRequest({ headers: {} }), false)
})

test('入口使用共用的本機請求檢查', () => {
  const index = fs.readFileSync(new URL('../lib/speech-bridge/index.js', import.meta.url), 'utf8')
  assert.match(index, /isLocalRequest\(req\)/)
  assert.doesNotMatch(index, /\.includes\(remote\)/)
})
