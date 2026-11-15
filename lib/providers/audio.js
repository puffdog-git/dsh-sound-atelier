// Bound provider responses and assemble PCM WAVs without concatenating RIFF headers.
export async function readAudioBody(response, signal, limit = 32 * 1024 * 1024) {
  signal?.throwIfAborted();
  const declared = Number(response.headers?.get('content-length'));
  if (declared > limit) { await response.body?.cancel?.(); throw Error('TTS response exceeds size limit'); }
  if (!response.body?.getReader) {
    const b = Buffer.from(await response.arrayBuffer());
    signal?.throwIfAborted();
    if (b.length > limit) throw Error('TTS response exceeds size limit');
    return b;
  }
  const reader = response.body.getReader(), parts = []; let size = 0;
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    for (;;) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      size += value.length;
      if (size > limit) throw Error('TTS response exceeds size limit');
      parts.push(Buffer.from(value));
    }
    return Buffer.concat(parts, size);
  } catch (e) { await reader.cancel().catch(() => {}); throw e; }
  finally { signal?.removeEventListener('abort', abort); reader.releaseLock(); }
}

export function parsePcmWav(bytes) {
  if (bytes.length < 44 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') throw Error('Invalid WAV response');
  const end = bytes.readUInt32LE(4) + 8;
  if (end > bytes.length || end < 44) throw Error('Truncated WAV response');
  let fmt; const data = [];
  for (let pos = 12; pos < end;) {
    if (pos + 8 > end) throw Error('Truncated WAV chunk');
    const id = bytes.toString('ascii', pos, pos + 4), size = bytes.readUInt32LE(pos + 4);
    const next = pos + 8 + size;
    if (next > end) throw Error('Truncated WAV chunk');
    const part = bytes.subarray(pos + 8, next);
    if (id === 'fmt ') fmt = part;
    if (id === 'data') data.push(part);
    pos = next + (size % 2);
  }
  if (!fmt || fmt.length < 16 || ![1, 3].includes(fmt.readUInt16LE(0)) || !data.length) throw Error('Expected PCM WAV audio');
  const channels = fmt.readUInt16LE(2), bits = fmt.readUInt16LE(14), align = fmt.readUInt16LE(12);
  if (!channels || channels > 8 || ![8, 16, 24, 32].includes(bits) || align !== channels * bits / 8 || !fmt.readUInt32LE(4)) throw Error('Invalid PCM WAV format');
  const pcm = Buffer.concat(data);
  if (!pcm.length || pcm.length % align) throw Error('Incomplete WAV frames');
  return { fmt, pcm };
}

export function joinPcmWavs(waves) {
  if (!waves.length) throw Error('No WAV audio');
  const parsed = waves.map(parsePcmWav), fmt = parsed[0].fmt;
  if (parsed.some(p => !p.fmt.equals(fmt))) throw Error('WAV segments have incompatible formats');
  const pcm = Buffer.concat(parsed.map(p => p.pcm));
  const fmtChunk = Buffer.alloc(8 + fmt.length + fmt.length % 2), dataHeader = Buffer.alloc(8), header = Buffer.alloc(12);
  fmtChunk.write('fmt '); fmtChunk.writeUInt32LE(fmt.length, 4); fmt.copy(fmtChunk, 8);
  header.write('RIFF'); header.writeUInt32LE(4 + fmtChunk.length + 8 + pcm.length + pcm.length % 2, 4); header.write('WAVE', 8);
  dataHeader.write('data'); dataHeader.writeUInt32LE(pcm.length, 4);
  return Buffer.concat([header, fmtChunk, dataHeader, pcm, Buffer.alloc(pcm.length % 2)]);
}

// Preserve Unicode, whitespace and inline direction tags. Every slice fits even if
// the provider counts UTF-16 units rather than Unicode code points.
export function speechChunks(text, maxLength) {
  const atoms = String(text).match(/\[[^\]\r\n]*\]|[\s\S]/gu) || [];
  const chunks = []; let block = '', boundary = 0;
  for (const atom of atoms) {
    if (atom.length > maxLength) throw Error('A speech direction exceeds the provider input limit');
    if (block.length + atom.length > maxLength) {
      const cut = boundary > block.length / 2 ? boundary : block.length;
      chunks.push(block.slice(0, cut)); block = block.slice(cut); boundary = 0;
    }
    // A long tag may still not fit after preserving the trailing word.
    if (block.length + atom.length > maxLength) { chunks.push(block); block = ''; }
    block += atom;
    if (/^[\s.!?。！？,，;；]$/u.test(atom)) boundary = block.length;
  }
  if (block) chunks.push(block);
  return chunks;
}
