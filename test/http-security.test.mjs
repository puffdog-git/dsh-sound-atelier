import test from 'node:test'
import assert from 'node:assert/strict'
import { getRejectionStatus } from '../lib/http-util.js'

const request = (headers, remoteAddress = '127.0.0.1') => ({ headers, socket: { remoteAddress } })

test('本機來源且 Host 是本機位址時維持放行', () => {
  for (const host of ['127.0.0.1:3080', 'localhost:3000', '[::1]:3000', '127.0.0.1']) {
    assert.equal(
      getRejectionStatus(request({ host, origin: 'http://' + host, 'sec-fetch-site': 'same-origin' }), { requireAuth: true }),
      undefined,
      host,
    )
  }
  // 行程內或其他插件的呼叫沒有瀏覽器標頭。
  assert.equal(getRejectionStatus(request({ host: '127.0.0.1:3080' }), { requireAuth: true }), undefined)
  assert.equal(getRejectionStatus(request({}), { requireAuth: true }), undefined)
})

test('DNS rebinding：本機來源但 Host 不是本機位址時不得直接放行', () => {
  const headers = { host: 'attacker.example:3080', origin: 'http://attacker.example:3080', 'sec-fetch-site': 'same-origin' }
  // 沒有宿主登入服務時一律拒絕。
  assert.notEqual(getRejectionStatus(request(headers), { requireAuth: true }), undefined)
  assert.notEqual(getRejectionStatus(request(headers), {}), undefined)
  // 有宿主登入服務時交給它判斷，而不是略過。
  let asked = 0
  const deny = { requestRejection: () => (asked++, 401) }
  assert.equal(getRejectionStatus(request(headers), { requireAuth: true, connection: deny }), 401)
  assert.equal(asked, 1)
  const allow = { requestRejection: () => undefined }
  assert.equal(getRejectionStatus(request(headers), { requireAuth: true, connection: allow }), undefined)
})

test('本機位址的 Host 不會多問宿主登入服務', () => {
  let asked = 0
  const connection = { requestRejection: () => (asked++, 401) }
  assert.equal(getRejectionStatus(request({ host: '127.0.0.1:3080' }), { requireAuth: true, connection }), undefined)
  assert.equal(asked, 0)
})
