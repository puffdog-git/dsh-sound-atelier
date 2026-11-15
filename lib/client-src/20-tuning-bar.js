const TUNING_DEFAULTS = { rate: 1, pitch: 0, volume: 1, voaiPitch: 0, doubaoPitch: 0, styleWeight: 0.5, breathPause: 0 }

function TuningBar(props) {
  const t = props.t
  const pitchSupported = ['edge', 'azure'].includes(props.provider)
  const value = Object.assign(
    { rate: 1, pitch: 0, volume: 1, voaiPitch: 0, doubaoPitch: 0, styleWeight: 0.5, breathPause: 0 },
    props.value,
  )
  const [text, setText] = React.useState(() => t('tuneExample'))
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')
  const slider = (key, title, min, max, step, low, high, format, disabled) =>
    React.createElement(
      'label',
      { className: 'dts-tune-slider' },
      React.createElement(
        'span',
        { className: 'dts-tune-label' },
        t(title),
        React.createElement('output', null, format(value[key])),
      ),
      React.createElement('input', {
        type: 'range',
        min,
        max,
        step,
        value: value[key],
        disabled: !props.writable || disabled,
        'aria-label': t(title),
        'aria-valuetext': format(value[key]),
        onChange: (e) => props.onChange({ [key]: Number(e.target.value) }),
      }),
      React.createElement(
        'span',
        { className: 'dts-tune-ends' },
        React.createElement('span', null, t(low)),
        React.createElement('span', null, t(high)),
      ),
    )
  const preview = async () => {
    setBusy(true)
    setError('')
    try {
      await props.onPreview(text, value)
    } catch (err) {
      setError(String(err?.message || err))
    } finally {
      setBusy(false)
    }
  }
  return React.createElement(
    'div',
    { className: 'dts-tune' },
    React.createElement(
      'div',
      { className: 'dts-tune-header' },
      React.createElement('strong', null, t('tuneTitle')),
      React.createElement(
        'button',
        {
          type: 'button',
          className: 'dts-link',
          // 全部已是預設值時停用，避免按了沒有任何變化。
          disabled: !props.writable || Object.keys(TUNING_DEFAULTS).every((key) => value[key] === TUNING_DEFAULTS[key]),
          onClick: () => props.onChange({ ...TUNING_DEFAULTS }),
        },
        t('tuneReset'),
      ),
    ),
    React.createElement(
      'div',
      { className: 'dts-row' },
      [
        { label: 'tuneNatural', rate: 1, pitch: 0, volume: 1 },
        { label: 'tuneWarm', rate: 0.9, pitch: -15, volume: 0.8 },
        { label: 'tuneBright', rate: 1.15, pitch: 15, volume: 0.95 },
      ].map((p) => {
        const patch = {
          rate: p.rate,
          pitch: pitchSupported ? p.pitch : 0,
          volume: p.volume,
          ...(props.provider === 'voai' ? { voaiPitch: p.pitch / 10, breathPause: 0, styleWeight: 0.5 } : {}),
        }
        return React.createElement(
          'button',
          {
            key: p.label,
            type: 'button',
            className: 'dts-btn',
            disabled: !props.writable,
            // 目前數值已經等於這組預設時標示為已選取，讓使用者知道再按不會有變化。
            'aria-pressed': Object.keys(patch).every((key) => value[key] === patch[key]),
            onClick: () => props.onChange(patch),
          },
          t(p.label),
        )
      }),
    ),
    slider('rate', 'tuneSpeed', 0.5, 2, 0.05, 'tuneSlow', 'tuneFast', (n) => Number(n).toFixed(2) + '×'),
    props.provider === 'doubao'
      ? slider('doubaoPitch', 'doubaoPitch', -12, 12, 1, 'tuneLow', 'tuneHigh', (n) => (n > 0 ? '+' : '') + n)
      : props.provider === 'voai'
        ? slider('voaiPitch', 'voaiPitch', -5, 5, 0.5, 'tuneLow', 'tuneHigh', (n) => (n > 0 ? '+' : '') + n)
        : slider(
            'pitch',
            'tunePitch',
            -50,
            50,
            1,
            'tuneLow',
            'tuneHigh',
            (n) => (n > 0 ? '+' : '') + n + ' Hz',
            !pitchSupported,
          ),
    slider('volume', 'tuneVolume', 0, 1, 0.05, 'tuneQuiet', 'tuneLoud', (n) => Math.round(n * 100) + '%'),
    props.provider === 'voai'
      ? slider('breathPause', 'voaiPause', 0, 10, 0.1, 'voaiShort', 'voaiLong', (n) => Number(n).toFixed(1) + ' s')
      : null,
    props.provider === 'voai' && props.model === 'Classic'
      ? slider('styleWeight', 'voaiWeight', 0, 1, 0.05, 'voaiSoft', 'voaiStrong', (n) => Math.round(n * 100) + '%')
      : null,
    React.createElement(
      'div',
      { className: 'dts-sub' },
      t(
        props.provider === 'voai'
          ? 'voaiHint'
          : props.provider === 'doubao'
            ? 'doubaoHint'
            : pitchSupported
              ? 'tuneHint'
              : 'tuneUnsupported',
      ),
    ),
    ['fish', 'dashscope'].includes(props.provider) ||
      (props.provider === 'inworld' && (!props.model || props.model === 'inworld-tts-2')) ||
      props.provider === 'mimo' ||
      props.provider === 'google' ||
      (props.provider === 'google-cloud' && /^gemini-.*tts/.test(props.model || '')) ||
      (props.provider === 'deepinfra' && /^Qwen\/Qwen3-TTS/.test(props.model || '')) ||
      (props.provider === 'groq' && (!props.model || props.model === 'canopylabs/orpheus-v1-english')) ||
      (props.provider === 'cosyvoice' && (props.cosyvoiceMode || value.cosyvoiceMode || '').startsWith('instruct')) ||
      (props.provider === 'siliconflow' && /cosyvoice/i.test(props.model || '')) ||
      (props.provider === 'openai' && !/^tts-1/.test(props.model || '')) ||
      (props.provider === 'elevenlabs' && /^eleven_v[34]/.test(props.model || '')) ||
      (props.provider === 'openrouter' && /^(openai|google|fish-audio)\//.test(props.model || '')) ||
      (props.provider === 'doubao' && (!props.model || props.model === 'seed-tts-2.0'))
      ? React.createElement(
          'div',
          { className: 'dts-catalog-field' },
          React.createElement('strong', null, t('speechInstruction')),
          React.createElement(
            'div',
            { className: 'dts-row' },
            [
              ['styleNatural', ''],
              ['styleGentle', 'Speak gently, warmly and calmly.'],
              ['styleLively', 'Speak with a bright, upbeat and lively tone.'],
              ['styleNarrator', 'Read clearly as a composed storyteller, with natural pauses.'],
            ].map(([label, instruction]) =>
              React.createElement(
                'button',
                {
                  key: label,
                  type: 'button',
                  className: 'dts-btn',
                  disabled: !props.writable,
                  'aria-pressed': (value.instruction || '') === instruction,
                  onClick: () => props.onChange({ instruction }),
                },
                t(label),
              ),
            ),
          ),
          React.createElement('input', {
            className: 'dts-input',
            'aria-label': t('speechInstruction'),
            value: value.instruction || '',
            maxLength: props.provider === 'groq' ? 100 : 2000,
            disabled: !props.writable,
            onChange: (e) => props.onChange({ instruction: e.target.value }),
          }),
          props.provider === 'groq'
            ? React.createElement(
                'span',
                { className: 'dts-sub' },
                '英文 Orpheus 語氣提示最多 100 字元，建議使用簡短英文。',
              )
            : null,
          props.model === 'mimo-v2.5-tts-voicedesign' || props.model === 'Qwen/Qwen3-TTS-VoiceDesign'
            ? React.createElement(
                'label',
                { className: 'dts-catalog-field' },
                t('mimoDesign'),
                React.createElement('textarea', {
                  className: 'dts-input',
                  style: { height: 80, padding: 10 },
                  value: value.voiceDesign || '',
                  maxLength: 2000,
                  disabled: !props.writable,
                  onChange: (e) => props.onChange({ voiceDesign: e.target.value }),
                }),
                React.createElement('span', { className: 'dts-sub' }, t('mimoDesignHint')),
              )
            : null,
        )
      : null,
    React.createElement(
      'label',
      { className: 'dts-catalog-field' },
      t('tuneText'),
      React.createElement('textarea', {
        className: 'dts-input',
        style: { height: 64, padding: '10px' },
        value: text,
        maxLength: 500,
        onChange: (e) => setText(e.target.value),
      }),
    ),
    React.createElement(
      'button',
      { type: 'button', className: 'dts-btn', disabled: busy || !text.trim() || !props.provider, onClick: preview },
      busy ? t('tunePreviewing') : '▶ ' + t('preview'),
    ),
    error ? React.createElement('div', { className: 'dts-bad', role: 'alert' }, error) : null,
  )
}
