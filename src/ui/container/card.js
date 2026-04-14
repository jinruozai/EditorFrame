// EF.ui.card — bordered container with optional title bar.
//
// opts: { title?, children?: HTMLElement[] | HTMLElement, padded? }
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.card = function (opts) {
    const o = opts || {}
    const el = ui.h('div', 'ef-ui-card' + (o.padded === false ? '' : ' ef-ui-card-padded'))
    if (o.title) {
      const head = ui.h('div', 'ef-ui-card-head', { text: o.title })
      el.appendChild(head)
    }
    const body = ui.h('div', 'ef-ui-card-body')
    el.appendChild(body)
    if (o.children) {
      const list = Array.isArray(o.children) ? o.children : [o.children]
      for (let i = 0; i < list.length; i++) body.appendChild(list[i])
    }
    el.body = body
    return el
  }
})(window.EF = window.EF || {})
