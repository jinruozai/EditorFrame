// EF.ui.progressBar — determinate progress bar (0..1) or indeterminate.
//
// opts: { value: signal<number> | number, indeterminate?, label? }
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.progressBar = function (opts) {
    const o = opts || {}
    const el = ui.h('div', 'ef-ui-progress' + (o.indeterminate ? ' ef-ui-progress-ind' : ''))
    const fill = ui.h('div', 'ef-ui-progress-fill')
    el.appendChild(fill)
    if (o.label != null) {
      const lab = ui.h('span', 'ef-ui-progress-label', { text: String(o.label) })
      el.appendChild(lab)
    }
    if (o.value != null) {
      const sig = ui.asSig(o.value)
      ui.bind(el, sig, function (v) {
        const p = Math.max(0, Math.min(1, Number(v) || 0))
        fill.style.width = (p * 100) + '%'
      })
    }
    return el
  }
})(window.EF = window.EF || {})
