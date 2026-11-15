// Doubao word times are seconds relative to this provider request, not the
// entire multi-segment speech job. Preserve that scope explicitly.
export function createDoubaoTiming(enabled) {
  const sentences = [], seen = new Set(); let count = 0, size = 0
  return {
    add(packet) {
      if (!enabled) return
      const sentence = packet?.sentence || packet
      if (!Array.isArray(sentence?.words) || !sentence.words.length) return
      const words = sentence.words.map(w => ({ word: typeof w.word === 'string' ? w.word.slice(0, 200) : '', start: w.startTime, end: w.endTime })).filter(w => w.word && Number.isFinite(w.start) && Number.isFinite(w.end) && w.start >= 0 && w.end >= w.start)
      if (!words.length) return
      const text = typeof sentence.text === 'string' ? sentence.text.slice(0, 64000) : words.map(w => w.word).join('')
      const id = JSON.stringify([text, words[0].start, words.at(-1).end])
      if (seen.has(id)) return
      seen.add(id)
      count += words.length
      size += Buffer.byteLength(JSON.stringify({ text, words }))
      if (count > 100000 || size > 4 * 1024 * 1024) throw Error('Doubao timestamps exceed size limit')
      sentences.push({ text, words })
    },
    result() { return enabled ? { provider: 'doubao', unit: 'seconds', scope: 'segment', available: sentences.length > 0, sentences } : undefined },
  }
}
