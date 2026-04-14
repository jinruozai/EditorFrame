// EF.ui.popover — anchored floating panel with outside-click dismiss.
//
// Used directly as a generic popover *and* as the implementation primitive
// for menu / select / combobox / colorInput / etc.
//
// EF.ui.popover({ anchor, content, side?, align?, gap?, onDismiss? })
//   anchor  : HTMLElement
//   content : HTMLElement
//   returns : { el, close }
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.popover = function (opts) {
    const o = opts || {}
    const el = ui.h('div', 'ef-ui-popover')
    el.appendChild(o.content)

    const unmount = ui.portal(el)
    ui.place(o.anchor, el, { side: o.side || 'bottom', align: o.align || 'start', gap: o.gap })

    let closed = false
    function close() {
      if (closed) return
      closed = true
      unbind && unbind()
      unmount()
      o.onDismiss && o.onDismiss()
    }
    const unbind = ui.dismissOnOutside(el, function () {
      // Don't close if the click was on the anchor (the anchor's own click
      // handler should toggle), and never close on right-click.
      if (o.anchor && o.anchor.contains(event && event.target)) return
      close()
    })

    return { el: el, close: close }
  }
})(window.EF = window.EF || {})
