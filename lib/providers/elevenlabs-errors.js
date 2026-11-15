import { readAudioBody } from './audio.js'

// Never relay upstream messages: they may contain request text or credentials.
const reasons = {
  invalid_api_key: ['invalid_key', 'API Key 無效或已撤銷'],
  missing_api_key: ['invalid_key', '服務未收到 API Key'],
  invalid_authorization_header: ['invalid_key', '驗證標頭無效'],
  missing_permissions: ['permission', 'API Key 缺少所需權限'],
  insufficient_permissions: ['permission', 'API Key 缺少所需權限'],
  workspace_access_denied: ['permission', '沒有工作區存取權限'],
  quota_exceeded: ['credits', '帳戶或 API Key 額度不足，請檢查兩者的額度限制'],
  insufficient_credits: ['credits', '帳戶或 API Key 額度不足，請檢查兩者的額度限制'],
  subscription_required: ['plan', '此功能需要符合條件的訂閱方案'],
  feature_not_available: ['plan', '目前方案無法使用此功能'],
  voice_access_denied: ['voice_access', '無法使用此音色，請檢查音色權限與方案限制'],
  paid_plan_required: ['plan', '此功能需要付費方案'],
  detected_unusual_activity: ['free_tier_blocked', '服務偵測到異常使用並限制免費方案，請檢查帳戶狀態或聯絡 ElevenLabs'],
}
const permissions = ['text_to_speech', 'models_read', 'voices_read']

export async function elevenLabsError(response, signal) {
  let detail
  try {
    const data = JSON.parse((await readAudioBody(response, signal, 16 * 1024)).toString('utf8'))
    detail = data?.detail ?? data?.error ?? data
  } catch { signal?.throwIfAborted() }
  const upstreamCode = [detail?.code, detail?.status].find(code => Object.hasOwn(reasons, code))
  const fallback = response.status === 402 ? ['payment', '付款、額度或方案限制，服務未提供可辨識的詳細原因']
    : [401, 403].includes(response.status) ? ['auth', '驗證或權限不足，尚不能確定 API Key 無效']
    : response.status === 429 ? ['rate_limit', '請求頻率或同時連線數超過限制']
    : ['http', '服務拒絕請求']
  const [code, reason] = reasons[upstreamCode] || fallback
  // Legacy permission errors put the permission name in a free-form message.
  const permission = code === 'permission' ? permissions.find(p =>
    detail?.permission === p || (typeof detail?.message === 'string' && new RegExp('\\b' + p + '\\b').test(detail.message))) : undefined
  return Object.assign(new Error(`ElevenLabs HTTP ${response.status}: ${reason}${permission ? ' (' + permission + ')' : ''}${upstreamCode ? ' [' + upstreamCode + ']' : ''}`), {
    status: response.status, code,
    ...(upstreamCode ? { upstreamCode } : {}), ...(permission ? { permission } : {}),
  })
}
