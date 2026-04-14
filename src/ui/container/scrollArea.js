// EF.ui.scrollArea — styled scroll container (relies on browser scrollbars,
// but applies the framework's scrollbar theming via WebKit pseudo-elements
// and Firefox `scrollbar-color`).
//
// opts: { children?, maxHeight?, both? }
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.scrollArea = function (opts) {
    const o = opts || {}
    const el = ui.h('div', 'ef-ui-scrollarea' + (o.both ? ' ef-ui-scrollarea-both' : ''))
    if (o.maxHeight != null) el.style.maxHeight = (typeof o.maxHeight === 'number' ? o.maxHeight + 'px' : o.maxHeight)
    if (o.children) {
      const list = Array.isArray(o.children) ? o.children : [o.children]
      for (let i = 0; i < list.length; i++) el.appendChild(list[i])
    }
    return el
  }
})(window.EF = window.EF || {})
