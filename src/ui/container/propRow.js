// EF.ui.propRow — Blender-style property row: label on the left, control on the right.
//
// opts: { label, control: HTMLElement, hint? }
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.propRow = function (opts) {
    const o = opts || {}
    const el = ui.h('div', 'ef-ui-prop-row')
    const lab = ui.h('label', 'ef-ui-prop-label', { text: o.label || '' })
    if (o.hint) lab.title = o.hint
    const ctrl = ui.h('div', 'ef-ui-prop-control')
    if (o.control) ctrl.appendChild(o.control)
    el.appendChild(lab); el.appendChild(ctrl)
    return el
  }
})(window.EF = window.EF || {})
