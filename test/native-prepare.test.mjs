import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { prepareIndexNative } from '../lib/local-admin-routes.js'

function fakeApi({ ready = false, becomesReady = true, launchError } = {}) {
  const calls = []
  const state = { ready }
  return {
    calls,
    api: {
      nativeRuntime: { status: () => ({ packages: { dots: false, index2: state.ready, 'index2.5': state.ready } }) },
      localModelRuntime: {
        launch: async (_cfg, input) => {
          calls.push(['launch', input.name, input.uid, input.gpus])
          if (launchError) throw Error(launchError)
          if (becomesReady) state.ready = true
        },
        unload: async (_cfg, uid) => {
          calls.push(['unload', uid])
        },
      },
    },
  }
}

test('一鍵準備 IndexTTS：請 Xinference 載入一次、確認環境出現、再卸下模型', async () => {
  const f = fakeApi()
  const logs = []
  const result = await prepareIndexNative(f.api, {}, { kind: 'index2', gpus: 1 }, undefined, (line) => logs.push(line))
  assert.deepEqual(result, { prepared: true, kind: 'index2', alreadyPrepared: false })
  assert.deepEqual(f.calls, [['launch', 'IndexTTS2', 'dsh-prepare-index2', 1], ['unload', 'dsh-prepare-index2']])
  assert.equal(logs.length, 2)
  const cpu = fakeApi()
  await prepareIndexNative(cpu.api, {}, { kind: 'index2.5', gpus: 0 })
  assert.deepEqual(cpu.calls[0], ['launch', 'IndexTTS-2.5', 'dsh-prepare-index2-5', 0])
})

test('一鍵準備 IndexTTS：已經準備好就不重複下載', async () => {
  const f = fakeApi({ ready: true })
  assert.deepEqual(await prepareIndexNative(f.api, {}, { kind: 'index2' }), { prepared: true, kind: 'index2', alreadyPrepared: true })
  assert.equal(f.calls.length, 0)
})

test('一鍵準備 IndexTTS：載入失敗、環境沒出現、種類不對時都回報錯誤', async () => {
  const failing = fakeApi({ launchError: 'Xinference model management requires an account access token; API keys are query/inference only' })
  await assert.rejects(prepareIndexNative(failing.api, {}, { kind: 'index2' }), /account access token/)
  assert.deepEqual(failing.calls.map((c) => c[0]), ['launch'], '沒有載入成功就不用卸下')
  const missing = fakeApi({ becomesReady: false })
  await assert.rejects(prepareIndexNative(missing.api, {}, { kind: 'index2' }), /was not created/)
  assert.deepEqual(missing.calls.map((c) => c[0]), ['launch', 'unload'], '即使環境沒出現也把模型卸下')
  await assert.rejects(prepareIndexNative(fakeApi().api, {}, { kind: 'dots' }), /Unknown native model kind/)
})

test('介面：dots／IndexTTS 有一鍵準備，RVC 是五個步驟的引導，錯誤有中文說明', () => {
  const ui = fs.readFileSync(new URL('../lib/client-src/25-local-engines.js', import.meta.url), 'utf8')
  assert.match(ui, /data-native-prepare/)
  assert.match(ui, /job\('native-prepare', \{ kind: 'index2\.5'/)
  assert.equal((ui.match(/guideStep\(\n\s+[1-5],/g) || []).length, 5)
  assert.match(ui, /data-rvc-action': 'enable'/)
  const quick = fs.readFileSync(new URL('../lib/client-src/25a-local-quickstart.js', import.meta.url), 'utf8')
  for (const pattern of ['Prepare the isolated RVC runtime first', 'Index environment was not created', 'Select a managed native backend'])
    assert.ok(quick.includes(pattern), '有對應的中文說明：' + pattern)
  const routes = fs.readFileSync(new URL('../lib/local-admin-routes.js', import.meta.url), 'utf8')
  assert.match(routes, /b\.action==='native-prepare'/)
})
