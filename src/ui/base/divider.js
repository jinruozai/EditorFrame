// EF.ui.divider — horizontal or vertical separator line.
//
// EF.ui.divider({ vertical?: boolean, label?: string })
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.divider = function (opts) {
    const o = opts || {}
    const cls = 'ef-ui-divider ef-ui-divider-' + (o.vertical ? 'v' : 'h')
    const el = ui.h('div', cls + (o.label ? ' ef-ui-divider-labeled' : ''))
    if (o.label) el.appendChild(ui.h('span', 'ef-ui-divider-label', { text: o.label }))
    return el
  }
})(window.EF = window.EF || {})
