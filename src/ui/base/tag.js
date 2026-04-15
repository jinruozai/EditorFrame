// EF.ui.tag — label chip with optional close button.
//
// EF.ui.tag({ text?: string|signal, color?: string|signal, onClose? })
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.tag = function (opts) {
    const o = opts || {}
    const text  = ui.asSig(o.text  != null ? o.text  : '')
    const color = ui.asSig(o.color != null ? o.color : '')
    const el = ui.h('span', 'ef-ui-tag')
    const sp = ui.h('span', 'ef-ui-tag-text')
    el.appendChild(sp)
    ui.bindText(sp, text)
    ui.bind(el, color, function (v) {
      if (v) el.style.setProperty('--ef-tag-color', v)
      else el.style.removeProperty('--ef-tag-color')
    })
    if (o.onClose) {
      const x = ui.h('button', 'ef-ui-tag-close', { type: 'button', text: '×' })
      x.addEventListener('click', function (e) { e.stopPropagation(); o.onClose(e) })
      el.appendChild(x)
    }
    return el
  }
})(window.EF = window.EF || {})
