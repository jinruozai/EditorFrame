// EF.ui.inlineTabs — local tab strip used inside a panel body.
//
// Different from the framework tab widget (`tab-standard` etc.) which lives
// in the dock toolbar and operates on dock panels. This one is a self-contained
// chooser whose contents are arbitrary elements.
//
// opts:
//   value : signal<string>                   active tab id
//   tabs  : [{ id, label, content: HTMLElement }]
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.inlineTabs = function (opts) {
    const o = opts || {}
    const tabs = o.tabs || []
    const sig = ui.asSig(o.value != null ? o.value : (tabs[0] && tabs[0].id))
    const el = ui.h('div', 'ef-ui-inline-tabs')
    const head = ui.h('div', 'ef-ui-inline-tabs-head')
    const body = ui.h('div', 'ef-ui-inline-tabs-body')
    el.appendChild(head); el.appendChild(body)
    const buttons = []
    for (let i = 0; i < tabs.length; i++) {
      const t = tabs[i]
      const b = ui.h('button', 'ef-ui-inline-tabs-btn', { type: 'button', text: t.label })
      b.addEventListener('click', function () { sig.set(t.id) })
      buttons.push({ b: b, id: t.id, content: t.content })
      head.appendChild(b)
    }
    ui.bind(el, sig, function (active) {
      body.replaceChildren()
      for (let i = 0; i < buttons.length; i++) {
        const x = buttons[i]
        x.b.classList.toggle('ef-ui-inline-tabs-active', x.id === active)
        if (x.id === active && x.content) body.appendChild(x.content)
      }
    })
    return el
  }
})(window.EF = window.EF || {})
