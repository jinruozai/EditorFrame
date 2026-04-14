// EF.ui.combobox — text input + filtered dropdown.
//
// opts: { value: signal<string>, options: string[] | [{value,label}], placeholder? }
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  function norm(items) {
    return (items || []).map(function (it) {
      if (typeof it === 'string') return { value: it, label: it }
      return it
    })
  }

  ui.combobox = function (opts) {
    const o = opts || {}
    const sig = ui.asSig(o.value != null ? o.value : '')
    const items = norm(o.options)
    const wrap = ui.h('div', 'ef-ui-field ef-ui-combobox')
    const inp = ui.h('input', 'ef-ui-input', { type: 'text', placeholder: o.placeholder || '' })
    const arrow = ui.h('span', 'ef-ui-field-suffix', { text: '▾' })
    wrap.appendChild(inp); wrap.appendChild(arrow)
    ui.bind(wrap, sig, function (v) { if (document.activeElement !== inp) inp.value = v == null ? '' : String(v) })

    let pop = null
    function open() {
      if (pop) return
      const list = ui.h('div', 'ef-ui-menu')
      const term = inp.value.toLowerCase()
      const filtered = items.filter(function (it) { return !term || String(it.label).toLowerCase().indexOf(term) >= 0 })
      if (!filtered.length) {
        const empty = ui.h('div', 'ef-ui-menu-empty', { text: 'No matches' })
        list.appendChild(empty)
      }
      for (let i = 0; i < filtered.length; i++) {
        const it = filtered[i]
        const row = ui.h('button', 'ef-ui-menu-item', { type: 'button', text: it.label })
        row.addEventListener('mousedown', function (e) { e.preventDefault(); sig.set(it.value); inp.value = it.value; close() })
        list.appendChild(row)
      }
      list.style.minWidth = wrap.getBoundingClientRect().width + 'px'
      list.style.maxHeight = '240px'; list.style.overflow = 'auto'
      pop = ui.popover({ anchor: wrap, content: list, side: 'bottom', align: 'start', onDismiss: function () { pop = null } })
    }
    function close() { if (pop) { pop.close(); pop = null } }
    function reopen() { close(); open() }

    inp.addEventListener('focus', open)
    inp.addEventListener('input', function () { sig.set(inp.value); reopen() })
    arrow.addEventListener('mousedown', function (e) { e.preventDefault(); inp.focus(); pop ? close() : open() })

    return wrap
  }
})(window.EF = window.EF || {})
