// EF.ui.checkbox — boolean toggle with label.
//
// opts: { value: signal<bool>, label?, disabled? }
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.checkbox = function (opts) {
    const o = opts || {}
    const sig = ui.asSig(o.value != null ? o.value : false)
    const el = ui.h('label', 'ef-ui-check')
    const box = ui.h('input', 'ef-ui-check-box', { type: 'checkbox' })
    const mark = ui.h('span', 'ef-ui-check-mark')
    el.appendChild(box); el.appendChild(mark)
    if (o.label) {
      const lab = ui.h('span', 'ef-ui-check-label', { text: o.label })
      el.appendChild(lab)
    }
    ui.bind(el, sig, function (v) { box.checked = !!v })
    box.addEventListener('change', function () { sig.set(box.checked) })
    if (o.disabled != null) {
      if (ui.isSignal(o.disabled)) ui.bind(el, o.disabled, function (v) { box.disabled = !!v })
      else box.disabled = !!o.disabled
    }
    return el
  }
})(window.EF = window.EF || {})
