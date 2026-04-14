// EF.ui.breadcrumbs — path crumbs with click handlers.
//
// opts: { items: [{ label, onClick? }] | signal<...> , separator? }
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.breadcrumbs = function (opts) {
    const o = opts || {}
    const items = ui.asSig(o.items != null ? o.items : [])
    const sep = o.separator || '›'
    const el = ui.h('nav', 'ef-ui-crumbs')
    function rebuild(arr) {
      el.replaceChildren()
      for (let i = 0; i < arr.length; i++) {
        const it = arr[i]
        const isLast = i === arr.length - 1
        const node = it.onClick ? ui.h('button', 'ef-ui-crumbs-link', { type: 'button', text: it.label }) : ui.h('span', 'ef-ui-crumbs-static', { text: it.label })
        if (it.onClick) node.addEventListener('click', it.onClick)
        if (isLast) node.classList.add('ef-ui-crumbs-last')
        el.appendChild(node)
        if (!isLast) el.appendChild(ui.h('span', 'ef-ui-crumbs-sep', { text: sep }))
      }
    }
    ui.bind(el, items, rebuild)
    return el
  }
})(window.EF = window.EF || {})
