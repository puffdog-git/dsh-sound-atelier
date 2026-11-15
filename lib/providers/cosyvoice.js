import { open, stat } from 'node:fs/promises';
import path from 'node:path';
import { speechInstruction, audioResult } from './controls.js';
import { readAudioBody, parsePcmWav } from './audio.js';

const MAX_REFERENCE = 10 * 1024 * 1024;
const modes = { sft: 'inference_sft', instruct: 'inference_instruct', instruct2: 'inference_instruct2', 'zero-shot': 'inference_zero_shot', 'cross-lingual': 'inference_cross_lingual' };

export async function referenceFingerprint(cfg) {
  const name = cfg.cosyvoiceReferencePath || '';
  if (!name) return '';
  if (!path.isAbsolute(name) || /^[/\\]{2}/.test(name)) return name + ':invalid';
  try { const s = await stat(name); return [name, s.size, s.mtimeMs, s.ctimeMs].join(':'); }
  catch { return name + ':missing'; }
}

async function referenceAudio(name) {
  // Configured local files only. Do not silently upload a remote URL or network share.
  if (!path.isAbsolute(name) || /^[/\\]{2}/.test(name)) throw Error('CosyVoice reference must be an absolute local audio path');
  const file = await open(name, 'r');
  try {
    const info = await file.stat();
    if (!info.isFile() || info.size < 44 || info.size > MAX_REFERENCE) throw Error('CosyVoice reference must be a WAV file below 10 MiB');
    const bytes = Buffer.alloc(info.size); let offset = 0;
    while (offset < bytes.length) { const { bytesRead } = await file.read(bytes, offset, bytes.length - offset, offset); if (!bytesRead) throw Error('CosyVoice reference changed while reading'); offset += bytesRead; }
    parsePcmWav(bytes);
    return new Blob([bytes], { type: 'audio/wav' });
  } finally { await file.close(); }
}

export async function synthesizeCosyVoice({ cfg, req, fetchImpl, signal }) {
  const base = new URL((cfg.cosyvoiceUrl || 'http://127.0.0.1:9233').replace(/\/+$/, '') + '/');
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw Error('Invalid CosyVoice endpoint');
  const api = cfg.cosyvoiceApiMode || 'auto', mode = cfg.cosyvoiceMode || 'sft';
  if (!['auto', 'official', 'bridge'].includes(api) || !modes[mode]) throw Error('Unsupported CosyVoice API or synthesis mode');
  const voice = req.voices?.cosyvoice || '中文女', model = req.models?.cosyvoice || 'CosyVoice2-0.5B';
  const instruction = speechInstruction(cfg, req.role, 'cosyvoice');
  const rate = Number(cfg.cosyvoiceSampleRate) || 24000;
  if (!Number.isInteger(rate) || rate < 8000 || rate > 48000) throw Error('Invalid CosyVoice PCM sample rate');
  if (api === 'bridge' && mode !== 'sft') throw Error('CosyVoice advanced modes require the official API');
  if (mode.startsWith('instruct') && !instruction) throw Error('CosyVoice instruct mode requires a speech instruction');
  signal?.throwIfAborted();
  let official = api !== 'bridge', res;
  if (official) {
    const form = new FormData();
    form.set('tts_text', req.text);
    if (mode === 'sft' || mode === 'instruct') form.set('spk_id', voice);
    if (mode.startsWith('instruct')) form.set('instruct_text', instruction);
    if (['instruct2', 'zero-shot', 'cross-lingual'].includes(mode)) {
      const reference = await referenceAudio(cfg.cosyvoiceReferencePath || '');
      signal?.throwIfAborted();
      form.set('prompt_wav', reference, 'reference.wav');
    }
    if (mode === 'zero-shot') {
      if (!cfg.cosyvoiceReferenceText?.trim()) throw Error('CosyVoice zero-shot mode requires the reference transcript');
      form.set('prompt_text', cfg.cosyvoiceReferenceText);
    }
    res = await fetchImpl(new URL(modes[mode], base).href, { method: 'POST', body: form, signal, redirect: 'error' });
    // Only an absent endpoint proves no synthesis ran. Never retry a transport or
    // inference error on a second endpoint.
    if (api === 'auto' && mode === 'sft' && [404, 405].includes(res.status)) { await res.body?.cancel?.(); official = false; }
  }
  if (!official) {
    signal?.throwIfAborted();
    res = await fetchImpl(new URL('tts', base).href, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: req.text, voice, model }), signal, redirect: 'error' });
  }
  if (!res.ok) { await res.body?.cancel?.(); throw Error(`CosyVoice HTTP ${res.status}`); }
  const contentType = String(res.headers?.get('content-type') || '').toLowerCase();
  const bytes = await readAudioBody(res, signal);
  if (!bytes.length) throw Error('CosyVoice returned empty audio');
  let jsonBody = false;
  if (/^[\s]*[\[{]/.test(bytes.subarray(0, 20).toString('ascii'))) {
    try { JSON.parse(bytes.toString('utf8')); jsonBody = true; } catch { /* PCM may start with any byte. */ }
  }
  if (contentType.includes('json') || jsonBody) throw Error('CosyVoice returned JSON instead of audio');
  if (bytes.toString('ascii', 0, 4) === 'RIFF') { parsePcmWav(bytes); return audioResult('cosyvoice', bytes, 'wav'); }
  if (official) return audioResult('cosyvoice', bytes, 'pcm', rate);
  if (contentType.includes('audio/mpeg')) return audioResult('cosyvoice', bytes, 'mp3');
  if (contentType.includes('audio/flac')) return audioResult('cosyvoice', bytes, 'flac');
  throw Error('CosyVoice bridge did not return a supported audio container');
}
