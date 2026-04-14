// EF.ui.tag — label chip with optional close button.
//
// EF.ui.tag({ text, color?, onClose? })
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.tag = function (opts) {
    const o = opts || {}
    const el = ui.h('span', 'ef-ui-tag')
    if (o.color) el.style.setProperty('--ef-tag-color', o.color)
    const sp = ui.h('span', 'ef-ui-tag-text', { text: o.text || '' })
    el.appendChild(sp)
    if (o.onClose) {
      const x = ui.h('button', 'ef-ui-tag-close', { type: 'button', text: '×' })
      x.addEventListener('click', function (e) { e.stopPropagation(); o.onClose(e) })
      el.appendChild(x)
    }
    return el
  }
})(window.EF = window.EF || {})
