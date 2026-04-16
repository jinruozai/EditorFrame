// EF.ui.toast — transient notification, auto-dismisses.
//
// EF.ui.toast({ kind?: 'info'|'success'|'warn'|'error', title?, message, duration? })
//   duration in ms, default 3500. Use 0 for sticky.
//
// Returns { close }. Stacks in top-right corner via a single shared stack root.
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  let stackEl = null

  function ensureStack() {
    if (stackEl && stackEl.isConnected) return stackEl
    stackEl = ui.h('div', 'ef-ui-toast-stack')
    ui.portalRoot().appendChild(stackEl)
    return stackEl
  }

  ui.toast = function (opts) {
    const o = opts || {}
    const kind = o.kind || 'info'
    const dur = o.duration == null ? 3500 : o.duration
    const stack = ensureStack()

    // ARIA: errors/warnings use role=alert (assertive) so screen readers
    // interrupt; info/success use role=status (polite).
    const assertive = kind === 'error' || kind === 'warn'
    const el = ui.h('div', 'ef-ui-toast ef-ui-toast-' + kind, {
      role:           assertive ? 'alert'     : 'status',
      'aria-live':    assertive ? 'assertive' : 'polite',
      'aria-atomic':  'true',
    })
    // Icon glyph comes from `::before { content: var(--ef-icon-<kind>) }`.
    el.appendChild(ui.h('span', 'ef-ui-toast-icon', { 'aria-hidden': 'true' }))
    const body = ui.h('div', 'ef-ui-toast-body')
    if (o.title) body.appendChild(ui.h('div', 'ef-ui-toast-title', { text: o.title }))
    body.appendChild(ui.h('div', 'ef-ui-toast-msg', { text: o.message || '' }))
    el.appendChild(body)
    const x = ui.h('button', 'ef-ui-toast-close',
      { type: 'button', text: '×', 'aria-label': 'Dismiss notification' })
    el.appendChild(x)

    stack.appendChild(el)
    requestAnimationFrame(function () { el.classList.add('ef-ui-toast-in') })

    let closed = false
    let timer = null
    function close() {
      if (closed) return
      closed = true
      if (timer) { clearTimeout(timer); timer = null }
      el.classList.remove('ef-ui-toast-in')
      el.classList.add('ef-ui-toast-out')
      // Exit transition uses --ef-dur-slow (see ui-overlay.css toast rule).
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el)
        if (stackEl && stackEl.children.length === 0 && stackEl.parentNode) {
          stackEl.parentNode.removeChild(stackEl)
          stackEl = null
        }
      }, ui.readNum('--ef-dur-slow', 240))
    }
    x.addEventListener('click', close)
    if (dur > 0) timer = setTimeout(close, dur)
    return { el: el, close: close }
  }
})(window.EF = window.EF || {})
