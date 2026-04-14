// EF.ui.drawer — slide-in side panel.
//
// EF.ui.drawer({ side?: 'right'|'left'|'top'|'bottom', title?, content, onClose? })
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.drawer = function (opts) {
    const o = opts || {}
    const side = o.side || 'right'
    const back = ui.h('div', 'ef-ui-drawer-backdrop')
    const panel = ui.h('div', 'ef-ui-drawer ef-ui-drawer-' + side)
    if (o.title) {
      const head = ui.h('div', 'ef-ui-drawer-head')
      head.appendChild(ui.h('span', 'ef-ui-drawer-title', { text: o.title }))
      const x = ui.h('button', 'ef-ui-modal-close', { type: 'button', text: '×' })
      x.addEventListener('click', function () { close() })
      head.appendChild(x)
      panel.appendChild(head)
    }
    const body = ui.h('div', 'ef-ui-drawer-body')
    if (o.content) body.appendChild(o.content)
    panel.appendChild(body)
    back.appendChild(panel)
    const unmount = ui.portal(back)
    requestAnimationFrame(function () { panel.classList.add('ef-ui-drawer-open') })
    function onKey(e) { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    back.addEventListener('mousedown', function (e) { if (e.target === back) close() })

    let closed = false
    function close() {
      if (closed) return
      closed = true
      document.removeEventListener('keydown', onKey)
      panel.classList.remove('ef-ui-drawer-open')
      setTimeout(function () { unmount(); o.onClose && o.onClose() }, 220)
    }
    return { el: panel, close: close }
  }
})(window.EF = window.EF || {})
