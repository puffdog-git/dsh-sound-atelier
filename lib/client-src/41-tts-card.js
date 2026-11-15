function TtsCard(props) {
  useUiLanguage()
  const t = (props && props.t) || ((key) => key)
  const [open, setOpen] = React.useState(false)
  return React.createElement(
    'li',
    { className: 'dts-card' },
    React.createElement(
      'button',
      {
        type: 'button',
        className: 'dts-head',
        onClick: () => setOpen(!open),
        'aria-expanded': open,
      },
      React.createElement(
        'div',
        { className: 'dts-headText' },
        React.createElement('div', { className: 'dts-title' }, t('title')),
        React.createElement('div', { className: 'dts-sub' }, t('cardHint')),
      ),
      ChevronIcon
        ? React.createElement(ChevronIcon, { className: 'dts-chev' + (open ? ' dts-chevOpen' : '') })
        : React.createElement(
            'svg',
            {
              className: 'dts-chev' + (open ? ' dts-chevOpen' : ''),
              width: 14,
              height: 14,
              viewBox: '0 0 16 16',
              fill: 'none',
            },
            React.createElement('path', {
              d: 'M4 6l4 4 4-4',
              stroke: 'currentColor',
              'stroke-width': 1.5,
              'stroke-linecap': 'round',
              'stroke-linejoin': 'round',
            }),
          ),
    ),
    open
      ? React.createElement(
          'div',
          { className: 'dts-body' },
          React.createElement(
            ErrorBoundary,
            null,
            React.createElement(TtsSection, Object.assign({}, props, { compact: true, ctx: props && props.ctx })),
          ),
        )
      : null,
  )
}

// Per-message speak button in the reply action strip (left of the feedback
// thumbs). The slot only hands over the durable message id, so the reply
// text is read back from the rendered turn: the same prose blocks the
// built-in copy button copies.
