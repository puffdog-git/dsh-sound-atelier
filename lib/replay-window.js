// Replay window for polling/reconnecting browsers.
// Completed items keep their whole audio as base64, so the window is bounded by
// bytes as well as by count. A pending reservation, and anything queued behind
// it, is never removed; the newest item always stays.
export const REPLAY_MAX_BYTES = 64 * 1024 * 1024

export function trimReplayWindow(pending, { limit = 256, maxBytes = REPLAY_MAX_BYTES } = {}) {
  while (pending.length > limit && pending[0].kind !== 'reserved') pending.shift()
  let bytes = 0
  for (const item of pending) bytes += typeof item.audioBase64 === 'string' ? item.audioBase64.length : 0
  while (bytes > maxBytes && pending.length > 1 && pending[0].kind !== 'reserved') {
    const dropped = pending.shift()
    bytes -= typeof dropped.audioBase64 === 'string' ? dropped.audioBase64.length : 0
  }
  return pending
}
