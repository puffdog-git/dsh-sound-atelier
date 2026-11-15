// Provider synthesis controls are separate from browser/Discord playback tuning.
// Never spread arbitrary JSON into an upstream body (credentials, text and model stay owned here).
const fields = {
  custom:{format:['mp3','wav','opus','flac','pcm'],speed:[.25,4]},
  doubao: { transport: ['http', 'websocket'], timestamps: 'boolean',format:['mp3','pcm'] },
  fish: { format: ['mp3', 'wav', 'pcm', 'opus'], sampleRate: [8000, 48000], temperature: [0, 1], topP: [0, 1], speed: [.5, 2], volume: [-20, 20],transport:['http','sse','websocket'],timestamps:'boolean',referencePath:'path',referenceText:'text',referenceIds:'json',normalize:'boolean',language:'string',latency:['low','normal','balanced'],chunkLength:[100,300],mp3Bitrate:[64,192],opusBitrate:[-1000,64000],maxNewTokens:[1,8192],minChunkLength:[0,100],conditionOnPreviousChunks:'boolean',earlyStopThreshold:[0,1],dictionary:'json' },
  cartesia: { format: ['mp3', 'wav', 'pcm'], sampleRate: [8000, 48000], speed: [.6, 1.5], volume: [.5, 2], language: 'string', emotion: ['neutral', 'happy', 'excited', 'calm', 'angry', 'content', 'sad', 'scared', 'surprised', 'curious', 'sympathetic', 'sarcastic'],transport:['http','sse','websocket'],timestamps:'boolean',phonemes:'boolean',dictionary:'string',normalization:'string',accent:'string' },
  dashscope: { format: ['mp3', 'wav', 'pcm', 'opus'], sampleRate: [8000, 48000], speed: [.5, 2], pitch: [.5, 2], volume: [0, 100], language: ['zh', 'en', 'fr', 'de', 'ja', 'ko', 'ru', 'pt', 'th', 'id', 'vi', 'es', 'it', 'ms', 'fil', 'ar', 'other'],transport:['http','sse','websocket'],timestamps:'boolean',seed:[0,65535],bitRate:[6,510],hotFix:'json' },
  polly: { format: ['mp3', 'wav', 'pcm', 'opus'], sampleRate: [8000, 48000], language: 'string', marks: 'json', lexicons: 'json', transport: ['http', 'stream'] },
  inworld: { format: ['mp3', 'wav', 'pcm', 'opus'], sampleRate: [8000, 48000], temperature: [0, 2],transport:['http','stream','websocket'],timestamps:['none','word','character'],lipsync:'boolean',language:'string',deliveryMode:['STABLE','BALANCED','CREATIVE'],normalization:['ON','OFF'],dictionaries:'json',customPronunciation:'boolean',autoMode:['CLIENT_SEGMENTED','SENTENCE_BOUNDARY'],context:'json' },
  'google-cloud': { format: ['mp3', 'wav', 'opus'], sampleRate: [8000, 48000], speed: [.25, 2], pitch: [-20, 20], volume: [-96, 16], language: 'string', transport: ['http','stream'], timestamps:'boolean', inputMode:['text','markup'], pronunciations:'json', lowLatency:'boolean', auth:['service-account','adc'] },
  openai: { speed: [.25, 4], format: ['mp3', 'wav', 'opus', 'flac', 'aac', 'pcm'] },
  elevenlabs: { stability: [0, 1], similarity_boost: [0, 1], style: [0, 1], speed: [.7, 1.2], use_speaker_boost: 'boolean' },
  deepgram: { speed: [.5, 1.5], expressivity: [-2, 2], normalize_volume: 'boolean' },
  azure: { style: 'string', styleDegree: [.01, 2], role: 'string' },
  openrouter: { format: ['mp3', 'pcm'], pcmSampleRate: [8000, 48000], speed: [.25, 4] },
  siliconflow: { speed: [.25, 4], gain: [-10, 10], format: ['mp3', 'wav', 'opus', 'pcm'], sampleRate: [8000, 48000] },
  deepinfra: { format: ['mp3', 'wav', 'opus', 'flac', 'pcm'], pcmSampleRate: [8000, 48000], language: ['Auto', 'Chinese', 'English', 'Japanese', 'Korean', 'German', 'French', 'Russian', 'Portuguese', 'Spanish', 'Italian'], native: 'json', timestamps: 'boolean' },
  minimax: { speed: [.5, 2], vol: [0, 10], pitch: [-12, 12], emotion: ['happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised', 'calm', 'fluent', 'whisper'], format: ['mp3', 'wav', 'pcm', 'flac'], sampleRate: [8000, 44100], languageBoost: 'string', normalization: ['basic', 'quality'], modifyPitch: [-100, 100], intensity: [-100, 100], timbre: [-100, 100], soundEffects: ['spacious_echo', 'auditorium_echo', 'lofi_telephone', 'robotic'] },
};

export function providerOptions(cfg, provider) {
  let all;
  try { all = JSON.parse(cfg.providerOptions || '{}'); } catch { throw Error('providerOptions must be valid JSON'); }
  if (!all || Array.isArray(all) || typeof all !== 'object') throw Error('providerOptions must be a JSON object');
  const options = all[provider] ?? {};
  if (!options || Array.isArray(options) || typeof options !== 'object') throw Error(provider + ' controls must be an object');
  const rules = fields[provider] || {};
  for (const [key, value] of Object.entries(options)) {
    const rule = rules[key];
    if (!rule) throw Error(provider + ': unknown synthesis control');
    if (typeof rule === 'string') {
      if (rule==='path'||rule==='text') {if(typeof value!=='string'||value.length>(rule==='path'?2048:8000)||value.includes('\u0000'))throw Error(provider+': invalid '+key);continue}
      if (rule === 'json') { if (!value || typeof value !== 'object' || JSON.stringify(value).length > 64000) throw Error(provider + ': invalid ' + key); continue }
      if (typeof value !== rule || rule === 'string' && (value.length > 100 || /[\r\n<>]/.test(value))) throw Error(provider + ': invalid ' + key);
    } else if (typeof rule[0] === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < rule[0] || value > rule[1]) throw Error(provider + ': invalid ' + key);
    } else if (!rule.includes(value)) throw Error(provider + ': unsupported ' + key);
  }
  if (provider === 'deepgram') {
    if (options.expressivity !== undefined && !Number.isInteger(options.expressivity)) throw Error('Deepgram expressivity must be an integer');
    if (options.speed !== undefined && Math.abs(options.speed * 20 - Math.round(options.speed * 20)) > 1e-7) throw Error('Deepgram speed must use 0.05 increments');
  }
  if (provider === 'minimax') {
    if (options.vol === 0) throw Error('MiniMax vol must be above zero');
    for (const key of ['pitch', 'modifyPitch', 'intensity', 'timbre']) if (options[key] !== undefined && !Number.isInteger(options[key])) throw Error('MiniMax ' + key + ' must be an integer');
    if (options.sampleRate !== undefined && ![8000, 16000, 22050, 24000, 32000, 44100].includes(options.sampleRate)) throw Error('MiniMax sampleRate is unsupported');
  }
  for (const key of ['pcmSampleRate', 'sampleRate']) if (options[key] !== undefined && !Number.isInteger(options[key])) throw Error(provider + ': invalid sample rate');
  if (provider === 'dashscope') {
    if (options.sampleRate !== undefined && ![8000, 12000, 16000, 22050, 24000, 44100, 48000].includes(options.sampleRate)) throw Error('DashScope: unsupported sampleRate');
    if (options.volume !== undefined && !Number.isInteger(options.volume)) throw Error('DashScope volume must be an integer');
  }
  return options;
}

export function speechInstruction(cfg, role, provider) {
  return String(cfg.roles?.[role]?.instruction || cfg[provider + 'Instruction'] || cfg.speechInstruction || '').trim().slice(0, 2000);
}

export function audioResult(provider, raw, format = 'mp3', sampleRate = 24000) {
  let audio = Buffer.from(raw);
  if (format === 'pcm') {
    if (audio.length % 2 || !Number.isInteger(sampleRate)) throw Error(provider + ': invalid PCM audio');
    const h = Buffer.alloc(44);
    h.write('RIFF'); h.writeUInt32LE(36 + audio.length, 4); h.write('WAVEfmt ', 8);
    h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
    h.writeUInt32LE(sampleRate, 24); h.writeUInt32LE(sampleRate * 2, 28);
    h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(audio.length, 40);
    audio = Buffer.concat([h, audio]); format = 'wav';
  }
  return { ok: raw.length > 0, provider, audio, mime: ({ mp3: 'audio/mpeg', wav: 'audio/wav', opus: 'audio/ogg', aac: 'audio/aac', flac: 'audio/flac' })[format], reason: raw.length ? '' : 'empty audio' };
}
