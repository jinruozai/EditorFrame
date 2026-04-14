// EF.ui.button — text button with optional icon.
//
// opts:
//   text     : string                              required (or icon)
//   icon     : string (glyph) | HTMLElement
//   kind     : 'default' | 'primary' | 'ghost' | 'danger'  ('default')
//   size     : 'sm' | 'md' | 'lg'                          ('md')
//   disabled : boolean | signal<boolean>
//   onClick  : (e) => void
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.button = function (opts) {
    const o = opts || {}
    const kind = o.kind || 'default'
    const size = o.size || 'md'
    const el = ui.h('button', 'ef-ui-btn ef-ui-btn-' + kind + ' ef-ui-btn-' + size, { type: 'button' })
    if (o.icon) {
      const ic = (o.icon instanceof HTMLElement) ? o.icon : ui.icon({ glyph: o.icon, size: size })
      el.appendChild(ic)
    }
    if (o.text) {
      const sp = ui.h('span', 'ef-ui-btn-text')
      sp.textContent = o.text
      el.appendChild(sp)
    }
    if (o.disabled != null) {
      if (ui.isSignal(o.disabled)) ui.bind(el, o.disabled, function (v) { el.disabled = !!v })
      else el.disabled = !!o.disabled
    }
    if (o.onClick) el.addEventListener('click', function (e) { if (!el.disabled) o.onClick(e) })
    return el
  }
})(window.EF = window.EF || {})
