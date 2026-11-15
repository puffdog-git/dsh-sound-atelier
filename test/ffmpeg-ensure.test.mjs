import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { checkFfmpeg } from '../lib/ffmpeg-ensure.js';

async function sandbox(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'atelier-ffmpeg-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const binary = path.join(dir, 'ffmpeg.exe');
  return { dir, binary, location: () => ({ binary, dir, installer: path.join(dir, 'install.js') }) };
}
// 假的安裝程序：可選擇是否真的產生執行檔，以及結束碼。
function installer({ create, code = 0, calls }) {
  return (exe, args, options) => {
    calls.push({ exe, args, options });
    const child = new EventEmitter();
    child.kill = () => {};
    setTimeout(async () => {
      if (create) await fs.writeFile(create, 'binary');
      child.emit('exit', code);
    }, 5);
    return child;
  };
}

test('an existing binary is used without running the installer', async (t) => {
  const s = await sandbox(t),
    calls = [];
  await fs.writeFile(s.binary, 'binary');
  const r = await checkFfmpeg({ location: s.location, spawnImpl: installer({ calls }), env: {} });
  assert.deepEqual({ ok: r.ok, downloaded: r.downloaded }, { ok: true, downloaded: false });
  assert.equal(calls.length, 0);
});

test('a missing binary runs the bundled installer once and releases the lock', async (t) => {
  const s = await sandbox(t),
    calls = [];
  const r = await checkFfmpeg({ location: s.location, spawnImpl: installer({ create: s.binary, calls }), env: { KEEP: '1' } });
  assert.deepEqual({ ok: r.ok, downloaded: r.downloaded, path: r.path }, { ok: true, downloaded: true, path: s.binary });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].exe, process.execPath);
  assert.deepEqual(calls[0].args, [path.join(s.dir, 'install.js')]);
  assert.equal(calls[0].options.cwd, s.dir);
  assert.equal(calls[0].options.env.ELECTRON_RUN_AS_NODE, '1');
  assert.equal(calls[0].options.env.KEEP, '1');
  assert.ok(!existsSync(path.join(s.dir, '.dsh-ffmpeg-install.lock')));
});

test('installer failure is reported, not thrown, and the lock is released', async (t) => {
  const s = await sandbox(t),
    calls = [];
  const r = await checkFfmpeg({ location: s.location, spawnImpl: installer({ code: 1, calls }), env: {} });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'download-failed');
  assert.match(r.error, /結束碼 1/);
  assert.ok(!existsSync(path.join(s.dir, '.dsh-ffmpeg-install.lock')));
  // 結束碼 0 但沒有產生檔案，也算失敗。
  const again = await checkFfmpeg({ location: s.location, spawnImpl: installer({ calls }), env: {} });
  assert.equal(again.ok, false);
  assert.match(again.error, /找不到執行檔/);
});

test('a user-specified FFMPEG_BIN is never replaced by a download', async (t) => {
  const s = await sandbox(t),
    calls = [];
  const r = await checkFfmpeg({ location: s.location, spawnImpl: installer({ create: s.binary, calls }), env: { FFMPEG_BIN: s.binary } });
  assert.deepEqual({ ok: r.ok, reason: r.reason }, { ok: false, reason: 'custom-path-missing' });
  assert.equal(calls.length, 0);
});

test('unsupported platforms are reported without attempting a download', async () => {
  const calls = [];
  const r = await checkFfmpeg({ location: () => ({ binary: null, dir: '', installer: '' }), spawnImpl: installer({ calls }), env: {} });
  assert.deepEqual({ ok: r.ok, reason: r.reason }, { ok: false, reason: 'unsupported-platform' });
  assert.equal(calls.length, 0);
});

test('when another plugin is already downloading, wait for its result instead of downloading twice', async (t) => {
  const s = await sandbox(t),
    calls = [],
    lock = path.join(s.dir, '.dsh-ffmpeg-install.lock');
  await fs.mkdir(lock);
  setTimeout(async () => {
    await fs.writeFile(s.binary, 'binary');
    await fs.rmdir(lock);
  }, 100);
  const r = await checkFfmpeg({ location: s.location, spawnImpl: installer({ calls }), env: {} });
  assert.deepEqual({ ok: r.ok, downloaded: r.downloaded }, { ok: true, downloaded: false });
  assert.equal(calls.length, 0);
});

test('a half-written binary is not trusted while the other download still holds the lock', async (t) => {
  const s = await sandbox(t),
    calls = [],
    lock = path.join(s.dir, '.dsh-ffmpeg-install.lock');
  await fs.mkdir(lock);
  await fs.writeFile(s.binary, 'partial');
  let released = 0;
  setTimeout(async () => {
    await fs.writeFile(s.binary, 'complete');
    released = Date.now();
    await fs.rmdir(lock);
  }, 150);
  const r = await checkFfmpeg({ location: s.location, spawnImpl: installer({ calls }), env: {} });
  assert.equal(r.ok, true);
  assert.ok(released > 0, '應該等到對方釋放鎖才回報完成');
  assert.equal(await fs.readFile(s.binary, 'utf8'), 'complete');
  assert.equal(calls.length, 0);
});

test('a stale lock left by an interrupted download is cleared and the download retried', async (t) => {
  const s = await sandbox(t),
    calls = [],
    lock = path.join(s.dir, '.dsh-ffmpeg-install.lock');
  await fs.mkdir(lock);
  const old = new Date(Date.now() - 30 * 60_000);
  await fs.utimes(lock, old, old);
  const r = await checkFfmpeg({ location: s.location, spawnImpl: installer({ create: s.binary, calls }), env: {} });
  assert.deepEqual({ ok: r.ok, downloaded: r.downloaded }, { ok: true, downloaded: true });
  assert.equal(calls.length, 1);
});
