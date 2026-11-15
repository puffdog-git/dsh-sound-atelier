import test from 'node:test'
import assert from 'node:assert/strict'
import { join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { cliLaunch, findDshCliEntry, profileDirFromInstall } from '../lib/updater.js'

function fakeFs(files) {
  const table = new Map(Object.entries(files).map(([name, value]) => [resolve(name), value]))
  return {
    exists: (name) => table.has(resolve(name)),
    read: (name) => {
      const value = table.get(resolve(name))
      if (value === undefined) throw new Error('ENOENT')
      return value
    },
  }
}

const hostDir = join('app', 'dsh', 'node_modules', '@deepseek-ai', 'dsh-desktop-host')
const hostManifest = JSON.stringify({ name: '@deepseek-ai/dsh-desktop-host' })

test('桌面版：宿主從 index.js 啟動時，使用同資料夾的 cli.js', () => {
  const fs = fakeFs({ [join(hostDir, 'package.json')]: hostManifest, [join(hostDir, 'lib', 'cli.js')]: '' })
  const entry = findDshCliEntry({ argv: ['exe', join(hostDir, 'lib', 'index.js'), 'app/dsh', 'profiles/desktop'], ...fs })
  assert.equal(entry, resolve(hostDir, 'lib', 'cli.js'))
})

test('命令列啟動（dsh web）：進入點本身就是 cli.js', () => {
  const fs = fakeFs({ [join(hostDir, 'package.json')]: hostManifest, [join(hostDir, 'lib', 'cli.js')]: '' })
  assert.equal(findDshCliEntry({ argv: ['exe', join(hostDir, 'lib', 'cli.js'), 'web'], ...fs }), resolve(hostDir, 'lib', 'cli.js'))
})

test('獨立的 @deepseek-ai/dsh 套件：進入點要和 bin 欄位相符', () => {
  const dir = join('global', 'node_modules', '@deepseek-ai', 'dsh')
  const fs = fakeFs({ [join(dir, 'package.json')]: JSON.stringify({ name: '@deepseek-ai/dsh', bin: { dsh: 'bin/dsh.js' } }) })
  assert.equal(findDshCliEntry({ argv: ['node', join(dir, 'bin', 'dsh.js')], ...fs }), resolve(dir, 'bin', 'dsh.js'))
  assert.equal(findDshCliEntry({ argv: ['node', join(dir, 'lib', 'other.js')], ...fs }), undefined)
})

test('不是 DSH 的進入點、或桌面版沒有 cli.js 時，不提供一鍵更新', () => {
  const other = fakeFs({ [join('x', 'package.json')]: JSON.stringify({ name: 'something-else' }) })
  assert.equal(findDshCliEntry({ argv: ['node', join('x', 'main.js')], ...other }), undefined)
  const noCli = fakeFs({ [join(hostDir, 'package.json')]: hostManifest })
  assert.equal(findDshCliEntry({ argv: ['exe', join(hostDir, 'lib', 'index.js')], ...noCli }), undefined)
  assert.equal(findDshCliEntry({ argv: ['exe'], ...other }), undefined)
  const broken = fakeFs({ [join('y', 'package.json')]: '{ not json' })
  assert.equal(findDshCliEntry({ argv: ['node', join('y', 'main.js')], ...broken }), undefined)
})

test('profile 資料夾從套件的安裝位置推出，不是固定猜 web', () => {
  const home = resolve('home', '.dsh')
  const direct = join(home, 'profiles', 'desktop', 'node_modules', 'dsh-sound-atelier', 'lib', 'updater.js')
  assert.equal(profileDirFromInstall(pathToFileURL(direct).href), join(home, 'profiles', 'desktop'))
  const nested = join(home, 'profiles', 'web', 'node_modules', '.pnpm', 'dsh-sound-atelier@1.0.0', 'node_modules', 'dsh-sound-atelier', 'lib', 'updater.js')
  assert.equal(profileDirFromInstall(pathToFileURL(nested).href), join(home, 'profiles', 'web'))
  assert.equal(profileDirFromInstall(pathToFileURL(resolve('src', 'dsh-sound-atelier', 'lib', 'updater.js')).href), undefined)
  assert.equal(profileDirFromInstall('not a url'), undefined)
  assert.ok(sep)
})

test('執行 CLI：桌面版把執行檔當成 Node 執行，並帶上宿主啟動時的旗標', () => {
  const desktop = cliLaunch({ execArgv: ['--expose-internals', '--other'], env: { KEEP: '1' }, electron: true })
  assert.deepEqual(desktop.execArgv, ['--expose-internals'])
  assert.deepEqual(desktop.env, { KEEP: '1', NO_COLOR: '1', ELECTRON_RUN_AS_NODE: '1' })
  const node = cliLaunch({ execArgv: [], env: {}, electron: false })
  assert.deepEqual(node.execArgv, [])
  assert.deepEqual(node.env, { NO_COLOR: '1' })
})
