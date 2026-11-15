import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { localAccessInfo, saveLocalCredentials } from '../lib/local-credentials.js'

const windows = process.platform === 'win32'

test('登入資訊：讀回安裝時建立的帳號，網址不符或沒有帳號時不回傳', { skip: !windows && '代管帳號用 Windows DPAPI 保護' }, async (t) => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'atelier-access-'))
  t.after(() => fsp.rm(root, { recursive: true, force: true }))
  const cfg = { localTtsBaseUrl: 'http://127.0.0.1:9997' }
  assert.equal(await localAccessInfo(cfg, { root }), null, '還沒建立帳號')
  await saveLocalCredentials(
    { origin: 'http://127.0.0.1:9997', username: 'admin-a', password: 'pw-a', clientUsername: 'client-b', clientPassword: 'pw-b', apiKey: 'sk-test', apiKeyId: 7, createdAt: '2026-01-01T00:00:00.000Z' },
    { root },
  )
  assert.deepEqual(await localAccessInfo(cfg, { root }), {
    origin: 'http://127.0.0.1:9997',
    uiUrl: 'http://127.0.0.1:9997/',
    admin: { username: 'admin-a', password: 'pw-a' },
    client: { username: 'client-b', password: 'pw-b' },
    apiKey: 'sk-test',
    createdAt: '2026-01-01T00:00:00.000Z',
  })
  assert.equal(await localAccessInfo({ localTtsBaseUrl: 'http://127.0.0.1:9998' }, { root }), null, '帳號綁定的網址不同就不給')
  await assert.rejects(localAccessInfo({ localTtsBaseUrl: 'http://example.com:9997' }, { root }), /loopback/)
  const stored = await fsp.readFile(path.join(root, 'tts-runtimes', 'credentials', 'xinference-local.dpapi'))
  assert.ok(!stored.includes('pw-a') && !stored.includes('sk-test'), '磁碟上的檔案是加密的')
})

test('登入資訊的接口：只接受 POST、要通過登入檢查、沒有帳號時用中文說明', () => {
  const routes = fs.readFileSync(new URL('../lib/routes.js', import.meta.url), 'utf8')
  const start = routes.indexOf("path:'/dsh-sound-atelier/local/access'")
  assert.ok(start > 0)
  const block = routes.slice(start, routes.indexOf("path:'/dsh-sound-atelier/local/service'"))
  assert.match(block, /req\.method!=='POST'/)
  assert.match(block, /rejectIfUntrusted\(req,res,\{requireAuth:true\}\)/)
  assert.match(block, /沒有替這個本機服務建立帳號/)
  assert.ok(!/console\.|logger/.test(block), '登入資訊不寫進記錄')
  const ui = fs.readFileSync(new URL('../lib/client-src/25-local-engines.js', import.meta.url), 'utf8')
  assert.match(ui, /data-action': 'xinference-open'/)
  assert.match(ui, /rel: 'noopener noreferrer'/)
  assert.match(ui, /data-ui-verbatim/)
  assert.match(ui, /setTimeout\(\(\) => setAccess\(null\), 120000\)/)
})
