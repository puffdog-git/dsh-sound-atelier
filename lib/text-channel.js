// One consumer, bounded pending input, and cancellation even while next() waits.
export function textChannel(signal, limit = 256 * 1024) {
  const queue = []; let wake, ended = false, failure, size = 0
  const notify = () => { wake?.(); wake = null }
  const abort = () => { failure = signal.reason || Error('Text input cancelled'); ended = true; notify() }
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) abort()
  return {
    push(text) {
      if (ended) throw Error('Text input is closed')
      if (typeof text !== 'string') throw Error('Text chunks must be strings')
      size += Buffer.byteLength(text)
      if (size > limit) throw Error('Streaming text exceeds size limit')
      if (text) queue.push(text)
      notify()
    },
    end() { ended = true; notify() },
    close() { ended = true; signal?.removeEventListener('abort', abort); notify() },
    async *[Symbol.asyncIterator]() {
      try {
        for (;;) {
          if (failure) throw failure
          if (queue.length) { yield queue.shift(); continue }
          if (ended) return
          await new Promise(resolve => { wake = resolve })
        }
      } finally { signal?.removeEventListener('abort', abort) }
    },
  }
}
