// EF.ui.kbd — keyboard shortcut hint chip (e.g. ⌘K, Ctrl+S).
//
// EF.ui.kbd('Ctrl+S')
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.kbd = function (text) {
    const el = ui.h('kbd', 'ef-ui-kbd')
    el.textContent = text || ''
    return el
  }
})(window.EF = window.EF || {})
