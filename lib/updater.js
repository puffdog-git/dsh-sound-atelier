import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname, isAbsolute, resolve, sep } from 'node:path'
import { registerRoute } from './http-util.js'
import { fileURLToPath } from 'node:url'

/**
 * Host-side one-click updater for dsh-sound-atelier (derived from @goodandready/dsh-tts).
 * Implements the unified DSH plugin updater specification.
 */

const UPDATE_HEADER = 'x-dsh-plugin-update'
const UPDATE_TIMEOUT_MS = 10 * 60_000
const VERSION_CACHE_MS = 5 * 60_000
let latestCache = undefined

function header(request, name) {
  const value = request?.headers?.[name]
  return Array.isArray(value) ? value[0] : value
}

function isLoopback(value) {
  const address = value?.toLowerCase().replace(/^\[|\]$/g, '')
  return (
    address === 'localhost' ||
    address === 'localhost.' ||
    address === '::1' ||
    address?.startsWith('127.') === true ||
    address?.startsWith('::ffff:127.') === true
  )
}

function isPrivateLan(value) {
  const address = value?.toLowerCase().replace(/^\[|\]$/g, '')
  if (!address) return false
  const ipv4 = address.startsWith('::ffff:') ? address.slice(7) : address
  return (
    ipv4.startsWith('192.168.') ||
    ipv4.startsWith('10.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ipv4)
  )
}

export function isTrustedUpdateRequest(request) {
  if (header(request, UPDATE_HEADER) !== '1') return false
  const remote = request.socket?.remoteAddress
  if (!isLoopback(remote) && !isPrivateLan(remote)) return false
  const site = header(request, 'sec-fetch-site')
  if (site !== undefined && site !== 'same-origin') return false
  const origin = header(request, 'origin')
  const host = header(request, 'host')
  if (origin === undefined || host === undefined) return false
  try {
    const url = new URL(origin)
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      (isLoopback(url.hostname) || isPrivateLan(url.hostname)) &&
      url.host === host
    )
  } catch {
    return false
  }
}

function validProfileName(value) {
  return (
    typeof value === 'string' &&
    value !== '' &&
    value !== '.' &&
    value !== '..' &&
    !value.includes('/') &&
    !value.includes('\\') &&
    !/[\0-\x1f\x7f]/.test(value)
  )
}

function profileNameFromArgv(argv) {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--profile' && argv[index + 1] !== undefined) return argv[index + 1]
    if (typeof arg === 'string' && arg.startsWith('--profile=')) return arg.slice(10)
  }
  return undefined
}

function packageAbove(start, exists, read) {
  let directory = start
  for (let depth = 0; depth < 6; depth += 1) {
    const manifestPath = resolve(directory, 'package.json')
    if (exists(manifestPath)) {
      try {
        return { directory, manifest: JSON.parse(read(manifestPath, 'utf8')) }
      } catch {
        // 讀不懂就繼續往上層找
      }
    }
    const parent = dirname(directory)
    if (parent === directory) return undefined
    directory = parent
  }
  return undefined
}

/**
 * 找出可以執行 `dsh plugin add` 的命令列進入點。
 * 1. 以命令列啟動（`dsh web`）：目前的進入點本身就是 CLI。
 * 2. DSH 桌面版：宿主的進入點是 dsh-desktop-host/lib/index.js，CLI 是同資料夾的 cli.js。
 * 找不到就回傳 undefined，介面會說明改用市集或安裝指令更新。
 */
export function findDshCliEntry(input = {}) {
  const argv = input.argv ?? process.argv
  const exists = input.exists ?? existsSync
  const read = input.read ?? readFileSync
  const entry = argv[1]
  if (typeof entry !== 'string' || entry === '') return undefined
  const entryPath = resolve(entry)
  const owner = packageAbove(dirname(entryPath), exists, read)
  if (owner === undefined) return undefined
  const { directory, manifest } = owner
  if (manifest.name === '@deepseek-ai/dsh') {
    const bin =
      typeof manifest.bin === 'string'
        ? manifest.bin
        : typeof manifest.bin === 'object' && manifest.bin !== null
          ? manifest.bin.dsh
          : undefined
    if (typeof bin === 'string' && !isAbsolute(bin) && resolve(directory, bin) === entryPath) return entryPath
    return undefined
  }
  if (manifest.name === '@deepseek-ai/dsh-desktop-host') {
    const cli = resolve(directory, 'lib', 'cli.js')
    return exists(cli) ? cli : undefined
  }
  return undefined
}

/** 從套件自己的安裝位置推出 profile 資料夾：<DSH_HOME>/profiles/<名稱>/node_modules/... */
export function profileDirFromInstall(fileUrl = import.meta.url) {
  let file
  try {
    file = fileURLToPath(fileUrl)
  } catch {
    return undefined
  }
  const parts = file.split(sep)
  for (let index = 2; index < parts.length; index += 1)
    if (parts[index] === 'node_modules' && parts[index - 2] === 'profiles') return parts.slice(0, index).join(sep)
  return undefined
}

/** 執行 CLI 用的參數與環境：桌面版的執行檔是 Electron，要當成 Node 執行並帶上宿主啟動時的旗標。 */
export function cliLaunch(input = {}) {
  const execArgv = input.execArgv ?? process.execArgv
  const env = input.env ?? process.env
  const electron = input.electron ?? process.versions.electron !== undefined
  return {
    execArgv: execArgv.includes('--expose-internals') ? ['--expose-internals'] : [],
    env: { ...env, NO_COLOR: '1', ...(electron ? { ELECTRON_RUN_AS_NODE: '1' } : {}) },
  }
}

function runtime() {
  const profileDir = resolve(
    process.env.DSH_PROFILE_DIR ?? profileDirFromInstall() ?? resolve(homedir(), '.dsh', 'profiles', 'web')
  )
  const selected = profileNameFromArgv(process.argv)
  const profileName = validProfileName(selected)
    ? selected
    : validProfileName(basename(profileDir))
      ? basename(profileDir)
      : 'web'
  const cliEntry = process.env.DSH_CLI_ENTRY ?? findDshCliEntry()
  return cliEntry === undefined ? { profileName, profileDir } : { profileName, profileDir, cliEntry }
}

function parseSemver(value) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(value)
  if (match === null) return undefined
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4]?.split('.') ?? [],
  }
}

function comparePrerelease(left, right) {
  if (left.length === 0 || right.length === 0) return left.length === right.length ? 0 : left.length === 0 ? 1 : -1
  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    const a = left[index]
    const b = right[index]
    if (a === undefined || b === undefined) return a === b ? 0 : a === undefined ? -1 : 1
    if (a === b) continue
    const aNumeric = /^\d+$/.test(a)
    const bNumeric = /^\d+$/.test(b)
    if (aNumeric && bNumeric) {
      const aNumber = BigInt(a)
      const bNumber = BigInt(b)
      if (aNumber !== bNumber) return aNumber > bNumber ? 1 : -1
      continue
    }
    if (aNumeric !== bNumeric) return aNumeric ? -1 : 1
    return a > b ? 1 : -1
  }
  return 0
}

export function isNewerVersion(currentValue, candidateValue) {
  const current = parseSemver(currentValue)
  const candidate = parseSemver(candidateValue)
  if (current === undefined || candidate === undefined) return false
  for (let index = 0; index < 3; index += 1) {
    if (candidate.core[index] !== current.core[index]) return candidate.core[index] > current.core[index]
  }
  return comparePrerelease(candidate.prerelease, current.prerelease) > 0
}

async function latestVersion(packageName, registry, options) {
  if (typeof options?.latestVersionImpl === 'function') {
    return await options.latestVersionImpl(packageName, registry)
  }
  if (
    latestCache?.packageName === packageName &&
    latestCache.registry === registry &&
    Date.now() < latestCache.expiresAt
  ) {
    return latestCache.version
  }
  try {
    const response = await fetch(`${registry.replace(/\/$/, '')}/${encodeURIComponent(packageName)}/latest`, {
      signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined,
    })
    if (!response.ok) return undefined
    const value = await response.json()
    if (typeof value?.version !== 'string' || value.version === '') return undefined
    latestCache = { packageName, registry, version: value.version, expiresAt: Date.now() + VERSION_CACHE_MS }
    return value.version
  } catch {
    return undefined
  }
}

async function currentVersion(manifestUrl) {
  const value = JSON.parse(await readFile(manifestUrl, 'utf8'))
  if (typeof value?.version !== 'string' || value.version === '') {
    throw new Error('Cannot read current plugin version.')
  }
  return value.version
}

/** 套件不在 node_modules 內＝從來源資料夾安裝（本機連結）；這種安裝不提供一鍵更新。 */
export function isSourceInstall(moduleUrl) {
  return !fileURLToPath(moduleUrl).split(sep).includes('node_modules')
}

export async function status(options, target) {
  const current = await currentVersion(options.manifestUrl)
  const latest = await latestVersion(options.packageName, options.registry ?? 'https://registry.npmjs.org', options)
  return {
    packageName: options.packageName,
    currentVersion: current,
    ...(latest === undefined ? {} : { latestVersion: latest }),
    latestCheckFailed: latest === undefined,
    // localFork：從來源資料夾安裝的版本。一鍵更新會把本機連結換成 npm 套件，
    // 所以只顯示已發布的版本供參考，不提供更新。
    updateAvailable: !options.localFork && latest !== undefined && isNewerVersion(current, latest),
    profileName: target.profileName,
    canAutoUpdate: !options.localFork && target.cliEntry !== undefined,
    ...(options.localFork ? { localFork: true } : {}),
  }
}

async function installExact(target, packageSpec, options) {
  if (target.cliEntry === undefined) throw new Error('Automatic update is unavailable in this runtime.')
  await new Promise((resolvePromise, reject) => {
    const spawnCall = options?.spawnImpl || spawn
    const launch = cliLaunch()
    const child = spawnCall(
      process.execPath,
      [
        ...launch.execArgv,
        target.cliEntry,
        'plugin',
        '--profile',
        target.profileName,
        'add',
        packageSpec,
        `--registry=${options.registry ?? 'https://registry.npmjs.org/'}`,
      ],
      {
        cwd: target.profileDir,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: launch.env,
      }
    )
    let detail = ''
    child.stdout?.on('data', (chunk) => {
      detail = (detail + String(chunk)).slice(-4000)
    })
    child.stderr?.on('data', (chunk) => {
      detail = (detail + String(chunk)).slice(-4000)
    })
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('Update timed out; use the normal DSH update flow.'))
    }, UPDATE_TIMEOUT_MS)
    child.once('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.once('exit', (code) => {
      clearTimeout(timer)
      if (code === 0) resolvePromise()
      else reject(new Error(detail.trim() || `Update exited with code ${String(code)}.`))
    })
  })
}

function json(response, statusCode, value) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  response.end(JSON.stringify(value))
}

export function registerPluginUpdater(ctx, options) {
  const mutex = options?.mutex || { installing: false }
  if (typeof ctx?.webServer?.register !== 'function') {
    ctx?.logger?.warn?.('[dsh-tts] webServer service unavailable, updater skipped')
    return () => {}
  }

  return registerRoute(ctx.webServer, {
    kind: 'exact',
    path: options.endpoint,
    handler: async (request, response) => {
      try {
        const target = runtime()
        if (request.method === 'GET' || request.method === 'HEAD') {
          const payload = await status(options, target)
          response.writeHead(200, {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store',
          })
          response.end(request.method === 'HEAD' ? undefined : JSON.stringify(payload))
          return
        }
        if (request.method !== 'POST') {
          response.writeHead(405, { allow: 'GET, HEAD, POST' })
          response.end()
          return
        }
        if (!isTrustedUpdateRequest(request)) {
          json(response, 403, { error: 'Rejected non-local or cross-origin update request.' })
          return
        }
        if (options.localFork) {
          json(response, 409, { error: '這是從資料夾安裝的版本，沒有一鍵更新；要更新請換上新版資料夾，再照安裝說明重新安裝一次。' })
          return
        }
        if (mutex.installing) {
          json(response, 409, { error: 'This plugin is already updating.' })
          return
        }
        mutex.installing = true
        try {
          const before = await status(options, target)
          if (before.latestVersion === undefined) {
            json(response, 503, { error: 'The latest version is temporarily unavailable.' })
            return
          }
          if (!before.updateAvailable) {
            json(response, 200, before)
            return
          }
          await installExact(target, `${options.packageName}@${before.latestVersion}`, options)
          json(response, 200, {
            ...before,
            updatedVersion: before.latestVersion,
            restartRequired: true,
          })
        } catch (err) {
          json(response, 503, { error: `Plugin update failed: ${String(err?.message || err)}` })
        } finally {
          mutex.installing = false
        }
      } catch (error) {
        ctx?.logger?.warn?.(`[dsh-tts] plugin updater failed: ${String(error)}`)
        json(response, 503, { error: 'Plugin update failed; see server logs.' })
      }
    },
  })
}
