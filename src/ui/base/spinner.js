// EF.ui.spinner — indeterminate loading indicator (CSS-only).
//
// EF.ui.spinner({ size?: 'sm'|'md'|'lg' | signal })
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.spinner = function (opts) {
    const o = opts || {}
    const size = ui.asSig(o.size != null ? o.size : 'md')
    const el = ui.h('span', 'ef-ui-spinner')
    ui.bindClass(el, size, 'ef-ui-spinner-')
    return el
  }
})(window.EF = window.EF || {})
