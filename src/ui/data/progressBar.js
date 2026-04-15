// EF.ui.progressBar — determinate progress bar (0..1) or indeterminate.
//
// opts: {
//   value?: number|signal,
//   indeterminate?: bool|signal,
//   label?: string|signal,
// }
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.progressBar = function (opts) {
    const o = opts || {}
    const indeterminate = ui.asSig(o.indeterminate != null ? o.indeterminate : false)
    const el = ui.h('div', 'ef-ui-progress')
    const fill = ui.h('div', 'ef-ui-progress-fill')
    el.appendChild(fill)
    ui.bind(el, indeterminate, function (v) { el.classList.toggle('ef-ui-progress-ind', !!v) })

    if (o.label != null) {
      const label = ui.asSig(o.label)
      const lab = ui.h('span', 'ef-ui-progress-label')
      ui.bindText(lab, label)
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
