// EF.ui.badge — small numeric / dot indicator.
//
// EF.ui.badge({
//   text?: string|signal,
//   kind?: 'default'|'success'|'warn'|'error'|'info' | signal,
//   dot?:  boolean|signal,
// })
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.badge = function (opts) {
    const o = opts || {}
    const text = ui.asSig(o.text != null ? o.text : '')
    const kind = ui.asSig(o.kind != null ? o.kind : 'default')
    const dot  = ui.asSig(o.dot  != null ? o.dot  : false)
    const el = ui.h('span', 'ef-ui-badge')
    ui.bindClass(el, kind, 'ef-ui-badge-')
    ui.bind(el, dot, function (v) { el.classList.toggle('ef-ui-badge-dot', !!v) })
    ui.bind(el, text, function (v) {
      // Dot-style badges show no text even if text is provided.
      el.textContent = dot.peek() ? '' : (v == null ? '' : String(v))
    })
    return el
  }
})(window.EF = window.EF || {})
