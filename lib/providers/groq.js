import { DEFAULT_MODELS } from './constants.js';
import { speechInstruction } from './controls.js';
import { readAudioBody, speechChunks, joinPcmWavs, parsePcmWav } from './audio.js';

export const GROQ_ENGLISH_VOICES = ['autumn', 'diana', 'hannah', 'austin', 'daniel', 'troy'];
export const GROQ_ARABIC_VOICES = ['abdullah', 'fahad', 'sultan', 'lulwa', 'noura', 'aisha'];

export async function synthesizeGroq({ cfg, req, key, fetchImpl, signal }) {
  const model = req.models?.groq || DEFAULT_MODELS.groq;
  if (/^playai-tts/.test(model)) throw Error('Groq retired PlayAI TTS. Select canopylabs/orpheus-v1-english.');
  const english = model === 'canopylabs/orpheus-v1-english', arabic = model === 'canopylabs/orpheus-arabic-saudi';
  const voice = req.voices?.groq || (arabic ? 'fahad' : 'hannah');
  if ((english || arabic) && !(arabic ? GROQ_ARABIC_VOICES : GROQ_ENGLISH_VOICES).includes(voice)) throw Error('Groq voice is incompatible with the selected model');
  const instruction = english ? speechInstruction(cfg, req.role, 'groq').replace(/[\[\]\r\n]/g, ' ') : '';
  if (instruction.length > 100) throw Error('Groq vocal direction must be at most 100 characters');
  const prefix = instruction ? `[${instruction}] ` : '';
  const chunks = speechChunks(req.text, 200 - prefix.length), parts = []; let total = 0;
  if (!chunks.length) throw Error('Groq input is empty');
  for (const chunk of chunks) {
    signal?.throwIfAborted();
    const res = await fetchImpl('https://api.groq.com/openai/v1/audio/speech', {
      method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, signal, redirect: 'error',
      body: JSON.stringify({ model, input: prefix + chunk, voice, response_format: 'wav' }),
    });
    if (!res.ok) { await res.body?.cancel?.(); throw Error(`Groq HTTP ${res.status}`); }
    const bytes = await readAudioBody(res, signal);
    parsePcmWav(bytes); total += bytes.length;
    if (total > 32 * 1024 * 1024) throw Error('Groq audio exceeds size limit');
    parts.push(bytes);
  }
  return { ok: true, provider: 'groq', audio: parts.length === 1 ? parts[0] : joinPcmWavs(parts), mime: 'audio/wav' };
}
