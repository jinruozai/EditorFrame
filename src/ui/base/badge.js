// EF.ui.badge — small numeric / dot indicator.
//
// EF.ui.badge({ text?: string|signal, kind?: 'default'|'success'|'warn'|'error'|'info', dot?: boolean })
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.badge = function (opts) {
    const o = opts || {}
    const kind = o.kind || 'default'
    const el = ui.h('span', 'ef-ui-badge ef-ui-badge-' + kind + (o.dot ? ' ef-ui-badge-dot' : ''))
    if (!o.dot && o.text != null) {
      if (ui.isSignal(o.text)) ui.bind(el, o.text, function (v) { el.textContent = v == null ? '' : String(v) })
      else el.textContent = String(o.text)
    }
    return el
  }
})(window.EF = window.EF || {})
