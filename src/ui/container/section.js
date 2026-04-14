// EF.ui.section — collapsible labeled section header + body.
//
// opts: { title, collapsed?: signal<boolean>, children?: HTMLElement[] | HTMLElement }
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.section = function (opts) {
    const o = opts || {}
    const sig = ui.asSig(o.collapsed != null ? o.collapsed : false)
    const el = ui.h('section', 'ef-ui-section')
    const head = ui.h('button', 'ef-ui-section-head', { type: 'button' })
    const arrow = ui.h('span', 'ef-ui-section-arrow', { text: '▾' })
    const title = ui.h('span', 'ef-ui-section-title', { text: o.title || '' })
    head.appendChild(arrow); head.appendChild(title)
    const body = ui.h('div', 'ef-ui-section-body')
    el.appendChild(head); el.appendChild(body)
    head.addEventListener('click', function () { sig.set(!sig.peek()) })
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
