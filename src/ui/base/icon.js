// EF.ui.icon — minimal icon primitive.
//
// The framework does NOT ship an icon set. Icons are simply text content
// inside an `.ef-ui-icon` span — pass a unicode glyph, an emoji, or any
// character. If you need real SVG icons, register them as a `name → svg`
// map in your app and write a thin wrapper.
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  // EF.ui.icon({ glyph: '⛶', size: 'sm' | 'md' | 'lg' })
  ui.icon = function (opts) {
    const o = opts || {}
    const el = ui.h('span', 'ef-ui-icon ef-ui-icon-' + (o.size || 'md'))
    el.textContent = o.glyph || ''
    return el
  }
})(window.EF = window.EF || {})
