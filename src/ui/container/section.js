// EF.ui.section — collapsible labeled section header + body.
//
// opts: {
//   title?: string|signal,
//   collapsed?: bool|signal, onToggle?,
//   children?: HTMLElement[] | HTMLElement,
// }
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.section = function (opts) {
    const o = opts || {}
    const sig   = ui.asSig(o.collapsed != null ? o.collapsed : false)
    const title = ui.asSig(o.title     != null ? o.title     : '')
    const doWrite = ui.writer(sig, o.onToggle, 'ui.section')
    const el = ui.h('section', 'ef-ui-section')
    const head = ui.h('button', 'ef-ui-section-head', { type: 'button' })
    const arrow = ui.h('span', 'ef-ui-section-arrow', { text: '▾' })
    const titleEl = ui.h('span', 'ef-ui-section-title')
    ui.bindText(titleEl, title)
    head.appendChild(arrow); head.appendChild(titleEl)
    const body = ui.h('div', 'ef-ui-section-body')
    el.appendChild(head); el.appendChild(body)
    head.addEventListener('click', function () { doWrite(!sig.peek()) })
    ui.bind(el, sig, function (v) {
      el.classList.toggle('ef-ui-section-collapsed', !!v)
      arrow.textContent = v ? '▸' : '▾'
    })
    if (o.children) {
      const list = Array.isArray(o.children) ? o.children : [o.children]
      for (let i = 0; i < list.length; i++) body.appendChild(list[i])
    }
    el.body = body
    return el
  }
})(window.EF = window.EF || {})
