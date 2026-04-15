// EF.ui.kbd — keyboard shortcut hint chip (e.g. ⌘K, Ctrl+S).
//
// Signature accepts either a plain string (legacy short form) or an opts
// object with a signal-aware `text` field. Both map to the same DOM.
//   EF.ui.kbd('Ctrl+S')
//   EF.ui.kbd({ text: sig })
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.kbd = function (arg) {
    const text = ui.asSig(
      arg && typeof arg === 'object' && !ui.isSignal(arg)
        ? (arg.text != null ? arg.text : '')
        : (arg != null ? arg : '')
    )
    const el = ui.h('kbd', 'ef-ui-kbd')
    ui.bindText(el, text)
    return el
  }
})(window.EF = window.EF || {})
