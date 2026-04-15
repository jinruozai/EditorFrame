// EF.ui.icon — minimal icon primitive.
//
// The framework does NOT ship an icon set. Icons are simply text content
// inside an `.ef-ui-icon` span — pass a unicode glyph, an emoji, or any
// character. If you need real SVG icons, register them as a `name → svg`
// map in your app and write a thin wrapper.
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  // EF.ui.icon({ glyph: '⛶' | signal, size: 'sm' | 'md' | 'lg' | signal })
  ui.icon = function (opts) {
    const o = opts || {}
    const glyph = ui.asSig(o.glyph != null ? o.glyph : '')
    const size  = ui.asSig(o.size  != null ? o.size  : 'md')
    const el = ui.h('span', 'ef-ui-icon')
    ui.bindClass(el, size, 'ef-ui-icon-')
    ui.bindText(el, glyph)
    return el
  }
})(window.EF = window.EF || {})
