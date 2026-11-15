import { PROVIDER_KEYS, OPENAI_COMPATIBLE, DEFAULT_MODELS, DEFAULT_VOICES } from "./providers/constants.js"
import { makeCloudProviders } from "./providers/cloud.js"
import { makeLocalProviders } from "./providers/local.js"

export { PROVIDER_KEYS, OPENAI_COMPATIBLE, DEFAULT_MODELS, DEFAULT_VOICES }

export function makeProviders(deps, req) {
  const { cfg } = deps
  const { signal: parentSignal } = req
  const cloudTimeoutMs = Number(cfg.cloudTimeoutMs) > 0 ? Number(cfg.cloudTimeoutMs) : 10000

  function withCloudTimeout(timeoutMs = cloudTimeoutMs) {
    const controller = new AbortController()
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort(new Error())
    }, timeoutMs)
    let onParentAbort = null
    if (parentSignal) {
      if (parentSignal.aborted) controller.abort(parentSignal.reason)
      else {
        onParentAbort = () => controller.abort(parentSignal.reason)
        parentSignal.addEventListener('abort', onParentAbort, { once: true })
      }
    }
    return {
      signal: controller.signal,
      cleanup: () => {
        clearTimeout(timer)
        if (parentSignal && onParentAbort) {
          try { parentSignal.removeEventListener('abort', onParentAbort) } catch (_err) { /* parent abort listener already removed */ }
        }
      },
    }
  }

  const cloud = makeCloudProviders(deps, req, withCloudTimeout)
  const local = makeLocalProviders(deps, req)

  return Object.assign({}, cloud, local, { minimax: async () => {
    req.signal?.throwIfAborted()
    const mode = cfg.minimaxTransport || 'auto'
    if (!['auto', 'http', 'cli'].includes(mode)) throw Error('Unsupported MiniMax transport')
    if (mode === 'cli') return local.minimax()
    const key = await deps.resolveKey(cfg.minimaxKeyEnv || 'MINIMAX_API_KEY')
    if (!key && mode === 'auto') return local.minimax()
    return cloud.minimax()
  } })
}
