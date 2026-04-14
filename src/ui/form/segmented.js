// EF.ui.segmented — segmented button group (single selection).
//
// opts: { value: signal<any>, options: [{ value, label, icon? }] }
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.segmented = function (opts) {
    const o = opts || {}
    const sig = ui.asSig(o.value)
    const el = ui.h('div', 'ef-ui-seg')
    const btns = []
    const items = o.options || []
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      const b = ui.h('button', 'ef-ui-seg-btn', { type: 'button' })
      if (it.icon) b.appendChild(ui.icon({ glyph: it.icon }))
      if (it.label != null) {
        const sp = ui.h('span', null, { text: it.label })
        b.appendChild(sp)
      }
      b.addEventListener('click', function () { sig.set(it.value) })
      btns.push({ b: b, val: it.value })
      el.appendChild(b)
    }
    ui.bind(el, sig, function (v) {
      for (let i = 0; i < btns.length; i++) btns[i].b.classList.toggle('ef-ui-seg-active', btns[i].val === v)
    })
    return el
  }
})(window.EF = window.EF || {})
