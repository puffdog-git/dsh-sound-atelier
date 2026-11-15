// 確保 ffmpeg-static 的執行檔存在。
//
// 從插件市集（pnpm）安裝時，依賴套件的安裝腳本不會執行，ffmpeg-static 的執行檔因此沒有下載，
// 所有需要轉檔的功能（播放調整、音訊合併、RVC）都會失敗。這裡在插件啟動時檢查一次，
// 缺少時執行 ffmpeg-static 自己的安裝腳本——和 npm 安裝時會做的是同一件事。
//
// - 使用者用環境變數 FFMPEG_BIN 指定了執行檔時不下載，只回報。
// - 同一個 profile 裡可能有別的插件共用同一份 ffmpeg-static，用資料夾鎖避免兩邊同時下載。
// - 失敗不影響插件啟動，只回報原因。
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, rmdir, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const LOCK = '.dsh-ffmpeg-install.lock';
const STALE_LOCK_MS = 10 * 60_000;
let pending;

function locate() {
  const binary = require('ffmpeg-static');
  const dir = dirname(require.resolve('ffmpeg-static/package.json'));
  return { binary, dir, installer: join(dir, 'install.js') };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForBinary(binary, lock, { exists, timeoutMs, now }) {
  const deadline = now() + timeoutMs;
  while (now() < deadline) {
    // 鎖消失才代表對方下載結束；檔案先出現不算。
    if (!exists(lock)) return exists(binary);
    await sleep(250);
  }
  return exists(binary);
}

function runInstaller({ installer, dir, spawnImpl, timeoutMs, env }) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(error);
    };
    let child;
    try {
      // ELECTRON_RUN_AS_NODE：桌面版的 execPath 是 Electron，需要這個才會把腳本當 Node 執行。
      child = spawnImpl(process.execPath, [installer], {
        cwd: dir,
        env: { ...env, ELECTRON_RUN_AS_NODE: '1' },
        stdio: 'ignore',
        windowsHide: true,
      });
    } catch (error) {
      finish(String(error?.message || error));
      return;
    }
    const timer = setTimeout(() => {
      child.kill?.();
      finish('下載逾時');
    }, timeoutMs);
    child.once('error', (error) => finish(String(error?.message || error)));
    child.once('exit', (code) => finish(code === 0 ? '' : '安裝腳本結束碼 ' + code));
  });
}

/**
 * 回傳 { ok, path, downloaded, reason }。reason：
 *   unsupported-platform  ffmpeg-static 沒有這個平台的執行檔
 *   custom-path-missing   FFMPEG_BIN 指到不存在的檔案（不自動下載）
 *   download-failed       安裝腳本失敗或逾時，error 是原因
 */
export async function checkFfmpeg({
  location = locate,
  exists = existsSync,
  spawnImpl = spawn,
  env = process.env,
  timeoutMs = 5 * 60_000,
  now = Date.now,
} = {}) {
  let found;
  try {
    found = location();
  } catch (error) {
    return { ok: false, path: '', downloaded: false, reason: 'download-failed', error: String(error?.message || error) };
  }
  const { binary, dir, installer } = found;
  if (!binary) return { ok: false, path: '', downloaded: false, reason: 'unsupported-platform' };
  const lock = join(dir, LOCK);
  // 下載中的檔案會先出現在最終位置；鎖還在就代表可能只寫了一半，要等它完成。
  if (exists(binary) && (env.FFMPEG_BIN || !exists(lock))) return { ok: true, path: binary, downloaded: false };
  if (env.FFMPEG_BIN) return { ok: false, path: binary, downloaded: false, reason: 'custom-path-missing' };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await mkdir(lock);
    } catch (error) {
      if (error?.code !== 'EEXIST')
        return { ok: false, path: binary, downloaded: false, reason: 'download-failed', error: String(error?.message || error) };
      // 別的插件正在下載同一份；鎖太舊就當作上次中斷留下的。
      const age = await stat(lock).then((s) => now() - s.mtimeMs, () => 0);
      if (age > STALE_LOCK_MS) {
        await rmdir(lock).catch(() => {});
        continue;
      }
      const ok = await waitForBinary(binary, lock, { exists, timeoutMs, now });
      return ok
        ? { ok: true, path: binary, downloaded: false }
        : { ok: false, path: binary, downloaded: false, reason: 'download-failed', error: '另一個下載沒有完成' };
    }
    try {
      const error = await runInstaller({ installer, dir, spawnImpl, timeoutMs, env });
      if (!error && exists(binary)) return { ok: true, path: binary, downloaded: true };
      return { ok: false, path: binary, downloaded: false, reason: 'download-failed', error: error || '安裝腳本結束但找不到執行檔' };
    } finally {
      await rmdir(lock).catch(() => {});
    }
  }
  return { ok: false, path: binary, downloaded: false, reason: 'download-failed', error: '無法取得下載鎖' };
}

/** 啟動時呼叫一次；同一個程序內重複呼叫共用同一次檢查。 */
export function ensureFfmpeg(options) {
  pending ||= checkFfmpeg(options);
  return pending;
}
