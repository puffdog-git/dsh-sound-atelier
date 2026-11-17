import test from 'node:test'
import assert from 'node:assert/strict'
import { hostFixture } from './host-fixture.mjs'
import { audioResult } from '../lib/providers/controls.js'

const wav = audioResult('edge', Buffer.alloc(2400, 20), 'pcm').audio
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function withWarnings(run) {
  const original = console.warn
  const warnings = []
  console.warn = (...args) => warnings.push(args.join(' '))
  try {
    await run(warnings)
  } finally {
    console.warn = original
  }
}

function japaneseFixture(tts, llm) {
  return hostFixture(
    { spokenLanguage: 'ja', chain: [{ provider: 'edge', voice: 'ja-JP-NanamiNeural' }] },
    (_deps, req) => ({
      edge: async () => {
        tts.push(req.text)
        return { ok: true, provider: 'edge', mime: 'audio/wav', audio: wav }
      },
    }),
    { services: { llm } },
  )
}

test('a reply whose preparation fails is not spoken and the reason is logged once', async () => {
  await withWarnings(async (warnings) => {
    const tts = []
    const f = await japaneseFixture(tts, {
      async *stream() {
        yield { text: 'not json' }
      },
    })
    try {
      const emit = f.events.get('session/event')
      emit({ id: 'fail' }, { type: 'assistant/message', data: { text: '你好，今天也辛苦了。' } })
      emit({ id: 'fail' }, { type: 'turn/end' })
      for (let i = 0; i < 100 && warnings.length === 0; i++) await sleep(5)
      await sleep(20)
      const mine = warnings.filter((line) => line.includes('這則回覆沒有朗讀'))
      assert.equal(mine.length, 1)
      assert.match(mine[0], /會話 fail/)
      assert.match(mine[0], /有效 JSON/)
      assert.equal(tts.length, 0)
    } finally {
      f.close()
    }
  })
})

test('a turn cancelled while it is being prepared stays quiet', async () => {
  await withWarnings(async (warnings) => {
    const tts = []
    let started = 0
    const f = await japaneseFixture(tts, {
      async *stream(request) {
        started++
        await new Promise((_, reject) =>
          request.signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true }),
        )
        yield { text: '' }
      },
    })
    try {
      const emit = f.events.get('session/event')
      emit({ id: 'quiet' }, { type: 'assistant/message', data: { text: '你好，今天也辛苦了。' } })
      emit({ id: 'quiet' }, { type: 'turn/end' })
      for (let i = 0; i < 100 && started === 0; i++) await sleep(5)
      assert.equal(started, 1)
    } finally {
      f.close()
    }
    await sleep(30)
    assert.equal(warnings.filter((line) => line.includes('這則回覆沒有朗讀')).length, 0)
    assert.equal(tts.length, 0)
  })
})
