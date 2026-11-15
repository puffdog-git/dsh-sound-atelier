import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { checksumFromFile, ensureUv, findUv, managedUvDir, uvAsset } from '../lib/uv-installer.js'
import { installRuntime } from '../lib/maintenance-jobs.js'

const asset = 'uv-x86_64-pc-windows-msvc.zip'
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')

function fakeFetch(files) {
  const calls = []
  const impl = async (url) => {
    calls.push(String(url))
    const name = String(url).split('/').pop()
    if (!(name in files)) return new Response('', { status: 404 })
    return new Response(files[name])
  }
  return { impl, calls }
}

test('uv：平台對應的官方檔名、校驗檔解析、尋找順序', () => {
  assert.equal(uvAsset('win32', 'x64'), asset)
  assert.equal(uvAsset('win32', 'arm64'), 'uv-aarch64-pc-windows-msvc.zip')
  assert.equal(uvAsset('linux', 'x64'), null)
  assert.equal(checksumFromFile('a'.repeat(64) + '  ' + asset + '\n', asset), 'a'.repeat(64))
  assert.equal(checksumFromFile('a'.repeat(64) + ' *' + asset, asset), 'a'.repeat(64))
  assert.equal(checksumFromFile('a'.repeat(64) + '  other.zip', asset), null)
  assert.equal(checksumFromFile('not a checksum', asset), null)
  const root = path.join('C:', 'home', '.dsh')
  const managed = path.join(managedUvDir(root), 'uv.exe')
  const onPath = path.join('C:', 'tools', 'uv.exe')
  const env = { Path: [path.join('C:', 'tools'), path.join('C:', 'other')].join(path.delimiter) }
  assert.equal(findUv({ env, root, platform: 'win32', exists: (file) => file === onPath }), onPath)
  assert.equal(findUv({ env, root, platform: 'win32', exists: (file) => file === managed || file === onPath }), managed, '自己資料夾裡的優先')
  assert.equal(findUv({ env, root, platform: 'win32', exists: () => false }), null)
})

test('uv：已經有就不連網', async () => {
  const fetch = fakeFetch({})
  const found = path.join('C:', 'tools', 'uv.exe')
  const result = await ensureUv({ root: 'C:/none', env: { PATH: path.dirname(found) }, exists: (file) => file === found, fetchImpl: fetch.impl, platform: 'win32', arch: 'x64' })
  assert.deepEqual(result, { path: found, dir: path.dirname(found), downloaded: false })
  assert.equal(fetch.calls.length, 0)
})

test('uv：沒有時從官方發行頁下載、核對校驗、放進聲音工坊的資料夾', async (t) => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'atelier-uv-'))
  t.after(() => fsp.rm(root, { recursive: true, force: true }))
  const zip = Buffer.from('fake zip bytes')
  const fetch = fakeFetch({ [asset]: zip, [asset + '.sha256']: sha(zip) + '  ' + asset + '\n' })
  const logs = []
  const expand = async (zipPath, out) => {
    assert.deepEqual(await fsp.readFile(zipPath), zip)
    await fsp.mkdir(out, { recursive: true })
    await fsp.writeFile(path.join(out, 'uv.exe'), 'binary')
  }
  const result = await ensureUv({ root, env: { PATH: '' }, fetchImpl: fetch.impl, expand, log: (line) => logs.push(line), platform: 'win32', arch: 'x64' })
  const target = path.join(root, 'tts-runtimes', 'bin', 'uv.exe')
  assert.deepEqual(result, { path: target, dir: path.dirname(target), downloaded: true })
  assert.equal(await fsp.readFile(target, 'utf8'), 'binary')
  assert.ok(fetch.calls.every((url) => url.startsWith('https://github.com/astral-sh/uv/releases/latest/download/')))
  assert.deepEqual(fs.readdirSync(path.dirname(target)), ['uv.exe'], '暫存資料夾已清掉')
  assert.equal(logs.length, 2)
})

test('uv：校驗不符、找不到校驗、壓縮檔內容不對、不支援的系統，都不會留下檔案', async (t) => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'atelier-uv-'))
  t.after(() => fsp.rm(root, { recursive: true, force: true }))
  const zip = Buffer.from('fake zip bytes')
  const base = { root, env: { PATH: '' }, platform: 'win32', arch: 'x64' }
  const noExpand = async () => assert.fail('校驗不過不應該解壓縮')
  await assert.rejects(
    ensureUv({ ...base, expand: noExpand, fetchImpl: fakeFetch({ [asset]: zip, [asset + '.sha256']: 'b'.repeat(64) + '  ' + asset }).impl }),
    /校驗不符/,
  )
  await assert.rejects(ensureUv({ ...base, expand: noExpand, fetchImpl: fakeFetch({ [asset]: zip, [asset + '.sha256']: 'x' }).impl }), /校驗檔裡找不到/)
  await assert.rejects(ensureUv({ ...base, expand: noExpand, fetchImpl: fakeFetch({ [asset]: zip }).impl }), /下載失敗/)
  await assert.rejects(
    ensureUv({ ...base, expand: async (_zip, out) => fsp.mkdir(out, { recursive: true }), fetchImpl: fakeFetch({ [asset]: zip, [asset + '.sha256']: sha(zip) + '  ' + asset }).impl }),
    /沒有 uv\.exe/,
  )
  await assert.rejects(ensureUv({ ...base, platform: 'linux', fetchImpl: fakeFetch({}).impl }), /docs\.astral\.sh/)
  const bin = path.join(root, 'tts-runtimes', 'bin')
  assert.deepEqual(fs.existsSync(bin) ? fs.readdirSync(bin) : [], [])
})

test('安裝引擎：需要 uv 的引擎先確認 uv，並只在這次安裝的 PATH 加上它；Kokoro 與輔助檔案不需要', { skip: process.platform !== 'win32' && '安裝腳本只支援 Windows' }, async () => {
  const run = async (backend) => {
    let ensured = 0
    let spawned
    const spawnImpl = (file, args, options) => {
      spawned = { file, args, env: options.env }
      const child = new EventEmitter()
      child.stdout = new EventEmitter()
      child.stderr = new EventEmitter()
      setImmediate(() => child.emit('exit', 0))
      return child
    }
    const result = await installRuntime(backend, 'cpu', undefined, () => {}, spawnImpl, { ensureUvImpl: async () => (ensured++, { path: 'X:/uvdir/uv.exe', dir: 'X:/uvdir', downloaded: true }) })
    const pathKey = Object.keys(spawned.env).find((key) => key.toLowerCase() === 'path')
    return { ensured, first: spawned.env[pathKey].split(path.delimiter)[0], backendArg: spawned.args[spawned.args.indexOf('-Backend') + 1], result }
  }
  for (const backend of ['xinference', 'rvc', 'dots', 'rvc-portable']) {
    const r = await run(backend)
    assert.deepEqual({ ensured: r.ensured, first: r.first, backend: r.backendArg }, { ensured: 1, first: 'X:/uvdir', backend })
    assert.equal(r.result.prepared, true)
  }
  for (const backend of ['kokoro', 'index-cache']) {
    const r = await run(backend)
    assert.equal(r.ensured, 0)
    assert.notEqual(r.first, 'X:/uvdir')
  }
  await assert.rejects(
    installRuntime('rvc', 'cpu', undefined, () => {}, () => assert.fail('uv 沒有就不該開始安裝'), { ensureUvImpl: async () => { throw Error('uv 下載後校驗不符，已捨棄，沒有安裝') } }),
    /校驗不符/,
  )
})
