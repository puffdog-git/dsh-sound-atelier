// uv 是本機引擎一鍵安裝用的工具（建立獨立的 Python 環境、安裝固定版本的套件）。
// 電腦上已經有就直接用；沒有就從 astral-sh/uv 的官方發行頁下載單一執行檔，核對同一發行版的 SHA-256 後，
// 放到聲音工坊自己的資料夾（<DSH 家目錄>/tts-runtimes/bin），不改動系統的 PATH 或其他設定。
// 校驗能擋下載損毀與中途竄改，擋不了發行頁本身被入侵。
import { spawn } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const RELEASE = 'https://github.com/astral-sh/uv/releases/latest/download/'
const MAX_BYTES = 120 * 1024 * 1024

/** 這個平台對應的官方檔名；不支援的平台回傳 null。 */
export function uvAsset(platform = process.platform, arch = process.arch) {
  if (platform !== 'win32') return null
  if (arch === 'x64') return 'uv-x86_64-pc-windows-msvc.zip'
  if (arch === 'arm64') return 'uv-aarch64-pc-windows-msvc.zip'
  return null
}

export function managedUvDir(root = path.join(os.homedir(), '.dsh')) {
  return path.join(root, 'tts-runtimes', 'bin')
}

/** 在 PATH 與聲音工坊自己的資料夾裡找 uv。 */
export function findUv({ env = process.env, root, exists = existsSync, platform = process.platform } = {}) {
  const name = platform === 'win32' ? 'uv.exe' : 'uv'
  const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path') || 'PATH'
  const folders = [managedUvDir(root), ...String(env[pathKey] || '').split(path.delimiter).filter(Boolean)]
  for (const folder of folders) {
    const candidate = path.join(folder, name)
    if (exists(candidate)) return candidate
  }
  return null
}

/** 校驗檔的格式是「<64 位十六進位>  <檔名>」。 */
export function checksumFromFile(text, asset) {
  for (const line of String(text || '').split(/\r?\n/)) {
    const match = /^([0-9a-fA-F]{64})\s+\*?(\S+)\s*$/.exec(line.trim())
    if (match && match[2] === asset) return match[1].toLowerCase()
  }
  return null
}

async function download(url, fetchImpl, signal) {
  const response = await fetchImpl(url, { redirect: 'follow', signal })
  if (!response.ok) throw Error('下載失敗（HTTP ' + response.status + '）')
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length > MAX_BYTES) throw Error('下載的檔案大小不合理')
  return bytes
}

function expandZip(zip, destination, spawnImpl, signal) {
  return new Promise((resolve, reject) => {
    const child = spawnImpl(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', 'Expand-Archive -LiteralPath $env:DSH_UV_ZIP -DestinationPath $env:DSH_UV_OUT -Force'],
      { windowsHide: true, stdio: 'ignore', env: { ...process.env, DSH_UV_ZIP: zip, DSH_UV_OUT: destination }, signal },
    )
    child.once('error', () => reject(Error('無法解壓縮 uv')))
    child.once('exit', (code) => (code === 0 ? resolve() : reject(Error('解壓縮 uv 失敗'))))
  })
}

/**
 * 確保有 uv 可以用。回傳 { path, dir, downloaded }。
 * 已經有的時候不連網；要下載時先寫到暫存資料夾，校驗通過才放到正式位置。
 */
export async function ensureUv({
  root,
  env = process.env,
  exists = existsSync,
  fetchImpl = fetch,
  spawnImpl = spawn,
  expand = expandZip,
  log = () => {},
  signal,
  platform = process.platform,
  arch = process.arch,
} = {}) {
  const found = findUv({ env, root, exists, platform })
  if (found) return { path: found, dir: path.dirname(found), downloaded: false }
  const asset = uvAsset(platform, arch)
  if (!asset) throw Error('這個系統沒有可以自動下載的 uv，請先照官方說明安裝 uv：https://docs.astral.sh/uv/')
  log('找不到 uv，正在從官方發行頁下載（約 20 MB）…')
  const [zip, sums] = await Promise.all([download(RELEASE + asset, fetchImpl, signal), download(RELEASE + asset + '.sha256', fetchImpl, signal)])
  const expected = checksumFromFile(sums.toString('utf8'), asset)
  if (!expected) throw Error('官方校驗檔裡找不到 ' + asset)
  const actual = createHash('sha256').update(zip).digest('hex')
  if (actual !== expected) throw Error('uv 下載後校驗不符，已捨棄，沒有安裝')
  const dir = managedUvDir(root)
  const work = path.join(dir, '.uv-' + randomUUID())
  await fs.mkdir(work, { recursive: true })
  try {
    const zipPath = path.join(work, asset)
    await fs.writeFile(zipPath, zip)
    await expand(zipPath, path.join(work, 'out'), spawnImpl, signal)
    const extracted = path.join(work, 'out', 'uv.exe')
    if (!exists(extracted)) throw Error('下載的壓縮檔裡沒有 uv.exe')
    const target = path.join(dir, 'uv.exe')
    await fs.rename(extracted, target)
    log('uv 已安裝到聲音工坊的資料夾。')
    return { path: target, dir, downloaded: true }
  } finally {
    await fs.rm(work, { recursive: true, force: true })
  }
}
