// EF.ui.iconButton — square icon-only button (toolbars, table row actions).
//
// opts: { icon, title, size?, kind?, disabled?, onClick }
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.iconButton = function (opts) {
    const o = opts || {}
    const size = o.size || 'md'
    const kind = o.kind || 'ghost'
    const el = ui.h('button',
      'ef-ui-icon-btn ef-ui-icon-btn-' + size + ' ef-ui-btn-' + kind,
      { type: 'button', title: o.title || '' })
    el.appendChild(ui.icon({ glyph: o.icon || '·', size: size }))
    if (o.disabled != null) {
      if (ui.isSignal(o.disabled)) ui.bind(el, o.disabled, function (v) { el.disabled = !!v })
      else el.disabled = !!o.disabled
    }
    if (o.onClick) el.addEventListener('click', function (e) { if (!el.disabled) o.onClick(e) })
    return el
  }
})(window.EF = window.EF || {})
