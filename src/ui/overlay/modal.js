// EF.ui.modal — centered modal dialog with backdrop.
//
// EF.ui.modal({ title, content: HTMLElement, footer?: HTMLElement, onClose? })
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.modal = function (opts) {
    const o = opts || {}
    const back = ui.h('div', 'ef-ui-modal-backdrop')
    const box  = ui.h('div', 'ef-ui-modal')
    if (o.title) {
      const head = ui.h('div', 'ef-ui-modal-head')
      head.appendChild(ui.h('span', 'ef-ui-modal-title', { text: o.title }))
      const x = ui.h('button', 'ef-ui-modal-close', { type: 'button', text: '×' })
      x.addEventListener('click', function () { close() })
      head.appendChild(x)
      box.appendChild(head)
    }
    const body = ui.h('div', 'ef-ui-modal-body')
    if (o.content) body.appendChild(o.content)
    box.appendChild(body)
    if (o.footer) {
      const foot = ui.h('div', 'ef-ui-modal-foot')
      foot.appendChild(o.footer)
      box.appendChild(foot)
    }
    back.appendChild(box)
    const unmount = ui.portal(back)
    function onKey(e) { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    back.addEventListener('mousedown', function (e) { if (e.target === back) close() })

    let closed = false
    function close() {
      if (closed) return
      closed = true
      document.removeEventListener('keydown', onKey)
      unmount()
      o.onClose && o.onClose()
    }
    return { el: box, close: close }
  }
})(window.EF = window.EF || {})
