// EF.ui.radio — radio group bound to a signal.
//
// opts: { value: signal<any>, options: [{ value, label }], orientation? }
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.radio = function (opts) {
    const o = opts || {}
    const sig = ui.asSig(o.value)
    const el = ui.h('div', 'ef-ui-radio-group ef-ui-radio-' + (o.orientation || 'horizontal'))
    const inputs = []
    const items = o.options || []
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      const lab = ui.h('label', 'ef-ui-radio')
      const inp = ui.h('input', 'ef-ui-radio-box', { type: 'radio', name: 'r' + Math.random().toString(36).slice(2) })
      const dot = ui.h('span', 'ef-ui-radio-dot')
      const txt = ui.h('span', 'ef-ui-radio-label', { text: it.label != null ? it.label : String(it.value) })
      lab.appendChild(inp); lab.appendChild(dot); lab.appendChild(txt)
      inp.addEventListener('change', function () { if (inp.checked) sig.set(it.value) })
      inputs.push({ inp: inp, val: it.value })
      el.appendChild(lab)
    }
    ui.bind(el, sig, function (v) {
      for (let i = 0; i < inputs.length; i++) inputs[i].inp.checked = inputs[i].val === v
    })
    return el
  }
})(window.EF = window.EF || {})
