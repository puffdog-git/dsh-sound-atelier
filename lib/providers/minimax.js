import { providerOptions, audioResult } from './controls.js';
import { readAudioBody } from './audio.js';

export const MINIMAX_MODELS = ['speech-2.8-hd', 'speech-2.8-turbo', 'speech-2.6-hd', 'speech-2.6-turbo', 'speech-02-hd', 'speech-02-turbo'];

export async function synthesizeMiniMax({ cfg, req, key, fetchImpl, signal }) {
  const model = req.models?.minimax || 'speech-2.8-hd';
  const voice = req.voices?.minimax || 'English_expressive_narrator';
  const opts = providerOptions(cfg, 'minimax');
  const format = opts.format || 'mp3', sampleRate = opts.sampleRate || 32000;
  if (req.text.length >= 10000) throw Error('MiniMax synchronous input must be below 10000 characters');
  if (['fluent', 'whisper'].includes(opts.emotion) && !/^speech-2\.6-(hd|turbo)$/.test(model)) throw Error('MiniMax fluent/whisper emotion requires speech-2.6');
  const url = new URL((cfg.minimaxBaseUrl || 'https://api.minimax.io/v1').replace(/\/+$/, '') + '/t2a_v2');
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw Error('Invalid MiniMax endpoint');
  const setting = { voice_id: voice };
  for (const k of ['speed', 'vol', 'pitch', 'emotion']) if (opts[k] !== undefined) setting[k] = opts[k];
  const modify = {};
  for (const [local, api] of [['modifyPitch', 'pitch'], ['intensity', 'intensity'], ['timbre', 'timbre'], ['soundEffects', 'sound_effects']]) if (opts[local] !== undefined) modify[api] = opts[local];
  if (format === 'pcm' && Object.keys(modify).length) throw Error('MiniMax voice modification does not support PCM output');
  signal?.throwIfAborted();
  const res = await fetchImpl(url.href, {
    method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, signal, redirect: 'error',
    body: JSON.stringify({ model, text: req.text, stream: false, output_format: 'hex', language_boost: opts.languageBoost || 'auto', voice_setting: setting,
      audio_setting: { format, sample_rate: sampleRate, channel: 1, ...(format === 'mp3' ? { bitrate: 128000 } : {}) },
      ...(Object.keys(modify).length ? { voice_modify: modify } : {}),
      ...(opts.normalization ? { text_normalization_mode: opts.normalization } : {}),
    }),
  });
  if (!res.ok) { await res.body?.cancel?.(); throw Error(`MiniMax HTTP ${res.status}`); }
  let data;
  try { data = JSON.parse((await readAudioBody(res, signal, 64 * 1024 * 1024)).toString('utf8')); }
  catch (error) { signal?.throwIfAborted(); if (/size limit/.test(error.message)) throw error; throw Error('MiniMax returned invalid JSON'); }
  if (data.base_resp?.status_code !== 0) throw Error('MiniMax API error ' + (Number.isInteger(data.base_resp?.status_code) ? data.base_resp.status_code : 'unknown'));
  if (data.data?.status !== 2) throw Error('MiniMax did not complete audio generation');
  const hex = data.data?.audio;
  if (typeof hex !== 'string' || !hex || hex.length % 2 || !/^[0-9a-f]+$/i.test(hex)) throw Error('MiniMax returned invalid hex audio');
  if (data.extra_info?.audio_format && data.extra_info.audio_format !== format) throw Error('MiniMax returned an unexpected audio format');
  return audioResult('minimax', Buffer.from(hex, 'hex'), format, sampleRate);
}
