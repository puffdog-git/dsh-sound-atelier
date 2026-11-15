// VoAI ConnectAPI: https://connect.voai.ai/docs/features/voices.html
// https://connect.voai.ai/docs/features/text-to-speech.html
import { createHash } from 'node:crypto'
import { clamp } from '../tuning.js'

// 留空的模型／音色／風格要查帳號目錄來補；逐句朗讀時每句都查一次太浪費，結果快取五分鐘。
// 快取鍵用金鑰的雜湊（不同帳號的目錄不同），不保存明文金鑰。
const catalogCache = new Map()
const CATALOG_TTL_MS = 5 * 60 * 1000

export const VOAI_BASE_URL = 'https://connect.voai.ai'
export function voaiRoot(cfg) {
  const url = new URL(cfg.voaiBaseUrl || VOAI_BASE_URL)
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Invalid VoAI API address')
  return url.href.replace(/\/+$/, '')
}

export function parseVoAICatalog(payload, selectedModel = '') {
  const groups = payload?.data?.models
  if (!Array.isArray(groups)) throw Object.assign(new Error('Invalid VoAI speaker catalog'), { code: 'invalid_response' })
  const valid = groups.filter(g => typeof g?.info?.version === 'string' && Array.isArray(g.speakers))
  const models = valid.map(g => ({ id: g.info.version, name: g.info.version }))
  const defaultModel = models.some(m => m.id === 'Sota+') ? 'Sota+' : models[0]?.id || ''
  const active = selectedModel || defaultModel
  const voices = valid.filter(g => g.info.version === active).flatMap(g => g.speakers.filter(s => typeof s?.name === 'string').map(s => ({
    id: s.name, name: s.category ? `${s.name} · ${s.category}` : s.name,
    language: 'zh-TW', gender: s.gender || '', model: g.info.version,
    styles: Array.isArray(s.styles) ? s.styles.filter(v => typeof v === 'string') : [],
  })))
  return { models, voices, defaultModel }
}

export function voaiTuning(cfg, role = 'reply') {
  const own = cfg.roles?.[role]
  const source = own?.tuningEnabled ? own : cfg
  return { pitch_shift: clamp(source.voaiPitch, -5, 5, 0), style_weight: clamp(source.styleWeight, 0, 1, .5), breath_pause: clamp(source.breathPause, 0, 10, 0) }
}

export async function synthesizeVoAI({ cfg, req, resolveKey, fetchImpl = fetch, signal }) {
  const key = await resolveKey(cfg.voaiKeyEnv || 'VOAI_API_KEY')
  if (!key) return { ok: false, provider: 'voai', reason: 'VoAI API key is not configured' }
  const root = voaiRoot(cfg)
  let model = req.models?.voai || ''
  let voice = req.voices?.voai || ''
  let style = req.styles?.voai || ''
  const headers = { 'x-api-key': key }
  // Empty fields resolve to actual account capabilities, never hardcoded speakers.
  if (!model || !voice || !style) {
    const cacheId = root + '|' + createHash('sha256').update(String(key)).digest('hex').slice(0, 16)
    let cached = catalogCache.get(cacheId)
    if (!cached || Date.now() - cached.at >= CATALOG_TTL_MS) {
      const res = await fetchImpl(root + '/TTS/GetSpeaker', { headers, signal, redirect: 'error' })
      if (!res.ok) throw new Error(`VoAI catalog HTTP ${res.status}`)
      cached = { at: Date.now(), payload: await res.json() }
      if (catalogCache.size >= 16) catalogCache.delete(catalogCache.keys().next().value)
      catalogCache.set(cacheId, cached)
    }
    const catalog = parseVoAICatalog(cached.payload, model)
    model ||= catalog.defaultModel
    voice ||= catalog.voices[0]?.id || ''
    const selected = catalog.voices.find(v => v.id === voice)
    if (!selected) throw new Error('VoAI voice is not available for this model')
    style ||= selected.styles[0] || ''
  }
  if (!model || !voice || !style) throw new Error('Select a VoAI model, speaker and speaking style')
  if ([...req.text].length > 1000) throw new Error('VoAI accepts up to 1000 characters per request. Enable sentence reading or shorten this text.')
  const res = await fetchImpl(root + '/TTS/Speech', {
    method: 'POST', headers: { ...headers, 'content-type': 'application/json', 'x-output-format': 'mp3' }, signal, redirect: 'error',
    body: JSON.stringify({ version: model, speaker: voice, style, text: req.text, language: cfg.language || 'zh-TW', speed: 1, ...voaiTuning(cfg, req.role) }),
  })
  if (!res.ok) { await res.body?.cancel?.(); throw new Error(`VoAI HTTP ${res.status}${res.status === 529 ? ': concurrency limit reached; retry shortly' : ''}`) }
  if (/json|text\/html/i.test(res.headers.get('content-type') || '')) throw new Error('VoAI returned an error instead of audio')
  const audio = Buffer.from(await res.arrayBuffer())
  if (audio.length < 32) throw new Error('VoAI returned empty audio')
  return { ok: true, provider: 'voai', mime: 'audio/mpeg', audio }
}
