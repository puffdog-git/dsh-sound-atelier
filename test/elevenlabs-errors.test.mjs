import test from 'node:test'
import assert from 'node:assert/strict'
import { elevenLabsError } from '../lib/providers/elevenlabs-errors.js'
import { createCatalogService } from '../lib/catalog.js'
import { makeCloudProviders } from '../lib/providers/cloud.js'

const response = (detail, status = 401) => new Response(JSON.stringify({ detail }), { status })

test('ElevenLabs distinguishes legacy permissions, invalid keys, quota and plan errors without leaking bodies', async () => {
  for (const [upstreamCode, code, status] of [
    ['missing_permissions', 'permission', 401], ['invalid_api_key', 'invalid_key', 401],
    ['quota_exceeded', 'credits', 402], ['insufficient_credits', 'credits', 402],
    ['subscription_required', 'plan', 402], ['voice_access_denied', 'voice_access', 403],
    ['detected_unusual_activity', 'free_tier_blocked', 401],
  ]) {
    const err = await elevenLabsError(response({ status: upstreamCode, message: 'SECRET text_to_speech' }, status))
    assert.equal(err.code, code)
    assert.equal(err.upstreamCode, upstreamCode)
    assert.equal(err.status, status)
    assert.equal(err.permission, code === 'permission' ? 'text_to_speech' : undefined)
    assert.equal(err.message.includes('SECRET'), false)
  }
  const modern = await elevenLabsError(response({ type: 'authorization_error', code: 'insufficient_permissions', permission: 'models_read' }, 403))
  assert.equal(modern.permission, 'models_read')
})

test('Unknown, malformed and oversized ElevenLabs errors retain status without asserting key invalidity', async () => {
  for (const res of [response({ code: 'SECRET', message: 'SECRET' }, 402), new Response('SECRET', { status: 402 }),
    new Response('SECRET'.repeat(4000), { status: 402 }), response({ code: '__proto__' }, 402)]) {
    const err = await elevenLabsError(res)
    assert.equal(err.code, 'payment')
    assert.equal(err.upstreamCode, undefined)
    assert.equal(err.message.includes('SECRET'), false)
  }
  assert.equal((await elevenLabsError(new Response('', { status: 401 }))).code, 'auth')
  const controller = new AbortController(); controller.abort()
  await assert.rejects(elevenLabsError(response({ code: 'invalid_api_key' }), controller.signal), { name: 'AbortError' })
})

test('ElevenLabs catalog preserves field-specific safe permission diagnostics', async () => {
  const catalog = createCatalogService({ resolveKey: async () => 'SECRET', fetchImpl: async url => response({
    status: 'missing_permissions', message: 'SECRET missing ' + (url.endsWith('/models') ? 'models_read' : 'voices_read'),
  }) })
  const out = await catalog.discover('elevenlabs', {})
  assert.deepEqual(out.warnings.map(w => [w.field, w.code, w.permission]).sort(), [
    ['models', 'permission', 'models_read'], ['voices', 'permission', 'voices_read'],
  ])
  assert.equal(JSON.stringify(out).includes('SECRET'), false)
})

test('ElevenLabs synthesis returns a safe quota reason and always clears its timeout', async () => {
  let cleaned = false
  const providers = makeCloudProviders({ cfg: {}, resolveKey: async () => 'SECRET',
    fetchImpl: async () => response({ code: 'quota_exceeded', message: 'SECRET' }, 402),
  }, { text: 'Hello', models: {}, voices: {} }, () => ({ signal: new AbortController().signal, cleanup() { cleaned = true } }))
  await assert.rejects(providers.elevenlabs(), err => err.code === 'credits' && err.message.includes('quota_exceeded') && !err.message.includes('SECRET'))
  assert.equal(cleaned, true)
})
