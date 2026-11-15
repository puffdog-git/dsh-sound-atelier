import { open, stat } from 'node:fs/promises';
import path from 'node:path';
import { parsePcmWav } from './audio.js';
const local = name => path.isAbsolute(name) && !/^[/\\]{2}/.test(name);
export async function fileFingerprint(name) {
  if (!name) return '';
  if (!local(name)) return name + ':invalid';
  try { const s = await stat(name); return [name, s.size, s.mtimeMs, s.ctimeMs].join(':'); } catch { return name + ':missing'; }
}
export async function readReferenceDataUrl(name, { provider = 'MiMo', wavOnly = false, maxSeconds = Infinity, signal } = {}) {
  signal?.throwIfAborted();
  if (!local(name || '')) throw Error(provider + ' reference must be an absolute local ' + (wavOnly ? 'WAV' : 'WAV or MP3') + ' path');
  const file = await open(name, 'r');
  try {
    const s = await file.stat();
    if (!s.isFile() || s.size < 44 || Math.ceil(s.size / 3) * 4 + 32 > 10_000_000) throw Error(provider + ' reference must fit the 10 MB encoded limit');
    const bytes = Buffer.alloc(s.size); let offset = 0;
    while (offset < bytes.length) { signal?.throwIfAborted(); const { bytesRead } = await file.read(bytes, offset, bytes.length - offset, offset); if (!bytesRead) throw Error(provider + ' reference changed while reading'); offset += bytesRead; }
    const after = await file.stat();
    if (after.size !== s.size || after.mtimeMs !== s.mtimeMs || after.ctimeMs !== s.ctimeMs) throw Error(provider + ' reference changed while reading');
    let mime;
    if (bytes.toString('ascii', 0, 4) === 'RIFF') {
      const { fmt, pcm } = parsePcmWav(bytes);
      const byteRate = fmt.readUInt32LE(4) * fmt.readUInt16LE(12);
      if (wavOnly && (fmt.readUInt16LE(0) !== 1 || fmt.readUInt32LE(8) !== byteRate)) throw Error(provider + ' reference requires PCM WAV with a valid byte rate');
      if (pcm.length / byteRate >= maxSeconds) throw Error(provider + ' reference must be shorter than ' + maxSeconds + ' seconds');
      mime = 'audio/wav';
    }
    else if (!wavOnly && (bytes.toString('ascii', 0, 3) === 'ID3' || bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) mime = 'audio/mpeg';
    else throw Error(provider + ' reference must contain ' + (wavOnly ? 'PCM WAV' : 'WAV or MP3') + ' audio');
    signal?.throwIfAborted();
    return `data:${mime};base64,${bytes.toString('base64')}`;
  } finally { await file.close(); }
}
