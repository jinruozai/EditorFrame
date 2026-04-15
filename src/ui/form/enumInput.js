// EF.ui.enumInput — bitmask flags editor (toggle multiple flags from a set).
//
// opts:
//   value    : signal<number>        bitmask
//   onChange?: (v) => void
//   options  : [{ value: number, label: string }]
//   disabled?: bool|signal
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.enumInput = function (opts) {
    const o = opts || {}
    const sig      = ui.asSig(o.value    != null ? o.value    : 0)
    const disabled = ui.asSig(o.disabled != null ? o.disabled : false)
    const doWrite = ui.writer(sig, o.onChange, 'ui.enumInput')
    const el = ui.h('div', 'ef-ui-enum')
    const items = o.options || []
    const btns = []
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      const b = ui.h('button', 'ef-ui-enum-btn', { type: 'button', text: it.label, title: '0x' + it.value.toString(16) })
      b.addEventListener('click', function () {
        if (disabled.peek()) return
        const cur = sig.peek()
        doWrite((cur & it.value) ? (cur & ~it.value) : (cur | it.value))
      })
      ui.bindAttr(b, disabled, 'disabled')
      btns.push({ b: b, val: it.value })
      el.appendChild(b)
    }
    ui.bind(el, sig, function (v) {
      for (let i = 0; i < btns.length; i++) btns[i].b.classList.toggle('ef-ui-enum-on', !!(v & btns[i].val))
    })
    return el
  }
})(window.EF = window.EF || {})
