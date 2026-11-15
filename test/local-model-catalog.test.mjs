import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { localServiceOperation } from '../lib/providers/local-service.js'

const cfg = { localTtsBaseUrl: 'http://127.0.0.1:9997', localTtsBackend: 'xinference' }
const row = (model_name, model_ability, extra = {}) => ({ model_name, model_ability, is_builtin: true, multilingual: false, ...extra })

function fakeFetch(body, status = 200) {
  const calls = []
  const impl = async (url, options) => {
    calls.push({ url: String(url), headers: options.headers })
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  }
  return { impl, calls }
}

test('可載入的模型清單：只留語音合成模型，已適配的排前面，並標出能力', async () => {
  const f = fakeFetch([
    row('whisper-large-v3', ['audio2text']),
    row('ACE-Step1.5', ['text2music']),
    row('MeloTTS-Chinese', ['text2audio']),
    row('Qwen3-TTS-12Hz-0.6B-Base', ['text2audio', 'text2audio_voice_cloning'], { multilingual: true }),
    row('Kokoro-82M', ['text2audio']),
    row('IndexTTS2', ['text2audio', 'text2audio_zero_shot', 'text2audio_emotion_control']),
    row('my-own', ['text2audio', 'text2audio_voice_design'], { is_builtin: false }),
    row('bad name with spaces', ['text2audio']),
    { model_name: 'no-abilities' },
  ])
  const result = await localServiceOperation({ cfg, action: 'available', fetchImpl: f.impl, key: 'k' })
  assert.equal(f.calls[0].url, 'http://127.0.0.1:9997/v1/model_registrations/audio?detailed=true')
  assert.equal(f.calls[0].headers.authorization, 'Bearer k')
  assert.deepEqual(
    result.models.map((m) => m.name),
    ['IndexTTS2', 'Kokoro-82M', 'Qwen3-TTS-12Hz-0.6B-Base', 'MeloTTS-Chinese', 'my-own'],
  )
  const by = Object.fromEntries(result.models.map((m) => [m.name, m]))
  assert.deepEqual(by.IndexTTS2, { name: 'IndexTTS2', family: 'index2', adapted: true, cloning: true, voiceDesign: false, emotion: true, multilingual: false, builtin: true })
  assert.deepEqual(
    { family: by['Qwen3-TTS-12Hz-0.6B-Base'].family, cloning: by['Qwen3-TTS-12Hz-0.6B-Base'].cloning, multilingual: by['Qwen3-TTS-12Hz-0.6B-Base'].multilingual },
    { family: 'qwen3', cloning: true, multilingual: true },
  )
  assert.deepEqual({ adapted: by['MeloTTS-Chinese'].adapted, family: by['MeloTTS-Chinese'].family }, { adapted: false, family: 'generic' })
  assert.deepEqual({ builtin: by['my-own'].builtin, voiceDesign: by['my-own'].voiceDesign }, { builtin: false, voiceDesign: true })
})

test('可載入的模型清單：服務回傳的不是清單、或不是本機網址時拒絕', async () => {
  await assert.rejects(localServiceOperation({ cfg, action: 'available', fetchImpl: fakeFetch({ detail: 'x' }).impl }), /Invalid local model catalog/)
  await assert.rejects(localServiceOperation({ cfg, action: 'available', fetchImpl: fakeFetch([], 401).impl }))
  await assert.rejects(
    localServiceOperation({ cfg: { ...cfg, localTtsBaseUrl: 'http://example.com:9997' }, action: 'available', fetchImpl: fakeFetch([]).impl }),
    /loopback/,
  )
})

test('介面：模型用下拉選單挑、代號自動產生、啟動與停止有清楚的狀態', () => {
  const source = fs.readFileSync(new URL('../lib/client-src/25-local-engines.js', import.meta.url), 'utf8')
  assert.match(source, /data-xinference-models/)
  assert.match(source, /action: 'available'/)
  assert.match(source, /function localModelUid/)
  assert.match(source, /data-xinference-progress/)
  assert.match(source, /聲音工坊已自動登入/)
  assert.ok(!source.includes('請確認帳號連線設定'))
  assert.ok(!source.includes('解除安裝'), '「卸下模型」不再寫成「解除安裝」')
  assert.ok(!source.includes('模型登入名稱'))
})
