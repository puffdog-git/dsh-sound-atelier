export function clamp(value, min, max, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
}

export function voiceTuning(cfg = {}, role = 'reply') {
  const own = cfg.roles?.[role]
  const source = own?.tuningEnabled ? own : cfg
  return { rate: clamp(source.rate, 0.5, 2, 1), pitch: clamp(source.pitch, -50, 50, 0), volume: clamp(source.volume, 0, 1, 1) }
}

export function pitchHz(value) {
  const pitch = Math.round(clamp(value, -50, 50, 0))
  return `${pitch >= 0 ? '+' : ''}${pitch}Hz`
}
