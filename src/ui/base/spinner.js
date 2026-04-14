// EF.ui.spinner — indeterminate loading indicator (CSS-only).
//
// EF.ui.spinner({ size?: 'sm'|'md'|'lg' })
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.spinner = function (opts) {
    const o = opts || {}
    return ui.h('span', 'ef-ui-spinner ef-ui-spinner-' + (o.size || 'md'))
  }
})(window.EF = window.EF || {})
