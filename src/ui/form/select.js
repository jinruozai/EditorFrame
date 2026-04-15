// EF.ui.select — dropdown selector with custom-styled menu (no native <select>).
//
// opts: { value: signal<any>, options: [{ value, label, icon? }], placeholder? }
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.select = function (opts) {
    const o = opts || {}
    const sig = ui.asSig(o.value)
    const el = ui.h('button', 'ef-ui-select', { type: 'button' })
    const labelEl = ui.h('span', 'ef-ui-select-label')
    const arrow = ui.h('span', 'ef-ui-select-arrow', { text: '▾' })
    el.appendChild(labelEl); el.appendChild(arrow)

    function findLabel(v) {
      const items = o.options || []
      for (let i = 0; i < items.length; i++) if (items[i].value === v) return items[i].label
      return null
    }
    ui.bind(el, sig, function (v) {
      const lbl = findLabel(v)
      if (lbl != null) { labelEl.textContent = lbl; labelEl.classList.remove('ef-ui-select-placeholder') }
      else { labelEl.textContent = o.placeholder || 'Select...'; labelEl.classList.add('ef-ui-select-placeholder') }
    })

    let pop = null
    el.addEventListener('click', function () {
      if (pop) { pop.close(); pop = null; return }
      const list = ui.h('div', 'ef-ui-menu')
      const items = o.options || []
      for (let i = 0; i < items.length; i++) {
        const it = items[i]
        const row = ui.h('button', 'ef-ui-menu-item' + (it.value === sig.peek() ? ' ef-ui-menu-item-active' : ''), { type: 'button' })
        if (it.icon) row.appendChild(ui.icon({ glyph: it.icon }))
        const sp = ui.h('span', null, { text: it.label != null ? it.label : String(it.value) })
        row.appendChild(sp)
        row.addEventListener('click', function () { sig.set(it.value); pop && pop.close(); pop = null })
        list.appendChild(row)
      }
      pop = ui.popover({ anchor: el, content: list, side: 'bottom', align: 'start', onDismiss: function () { pop = null } })
      list.style.minWidth = el.getBoundingClientRect().width + 'px'
    })
    ui.collect(el, function () { if (pop) { pop.close(); pop = null } })

    return el
  }
})(window.EF = window.EF || {})
