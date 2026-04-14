// EF.ui.textarea — multi-line text bound to a signal.
//
// opts: { value: signal<string>, placeholder?, rows?, disabled?, mono? }
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.textarea = function (opts) {
    const o = opts || {}
    const sig = ui.asSig(o.value != null ? o.value : '')
    const el = ui.h('textarea', 'ef-ui-textarea' + (o.mono ? ' ef-ui-textarea-mono' : ''), {
      placeholder: o.placeholder || '',
      rows: String(o.rows || 4),
    })
    ui.bind(el, sig, function (v) {
      if (document.activeElement !== el) el.value = v == null ? '' : String(v)
    })
    el.addEventListener('input', function () { sig.set(el.value) })
    if (o.disabled != null) {
      if (ui.isSignal(o.disabled)) ui.bind(el, o.disabled, function (v) { el.disabled = !!v })
      else el.disabled = !!o.disabled
    }
    return el
  }
})(window.EF = window.EF || {})
