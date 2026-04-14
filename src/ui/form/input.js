// EF.ui.input — single-line text input bound to a signal.
//
// opts:
//   value       : signal<string>      required
//   placeholder : string
//   disabled    : bool | signal
//   readOnly    : bool
//   prefix      : string | HTMLElement   (visual icon/label inside the well)
//   suffix      : string | HTMLElement
//   onCommit    : (v) => void            fired on Enter / blur (not every keystroke)
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.input = function (opts) {
    const o = opts || {}
    const sig = ui.asSig(o.value != null ? o.value : '')
    const wrap = ui.h('div', 'ef-ui-field')
    if (o.prefix != null) wrap.appendChild(slot(o.prefix, 'prefix'))
    const el = ui.h('input', 'ef-ui-input', {
      type: 'text',
      placeholder: o.placeholder || '',
    })
    if (o.readOnly) el.readOnly = true
    wrap.appendChild(el)
    if (o.suffix != null) wrap.appendChild(slot(o.suffix, 'suffix'))

    ui.bind(wrap, sig, function (v) {
      if (document.activeElement !== el) el.value = v == null ? '' : String(v)
    })
    el.addEventListener('input', function () { sig.set(el.value) })
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && o.onCommit) o.onCommit(el.value)
    })
    el.addEventListener('blur', function () { o.onCommit && o.onCommit(el.value) })

    if (o.disabled != null) {
      if (ui.isSignal(o.disabled)) ui.bind(wrap, o.disabled, function (v) { el.disabled = !!v; wrap.classList.toggle('ef-ui-field-disabled', !!v) })
      else { el.disabled = !!o.disabled; if (o.disabled) wrap.classList.add('ef-ui-field-disabled') }
    }
    return wrap
  }

  function slot(content, side) {
    const el = ui.h('span', 'ef-ui-field-' + side)
    if (content instanceof HTMLElement) el.appendChild(content)
    else el.textContent = String(content)
    return el
  }
})(window.EF = window.EF || {})
