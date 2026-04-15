// EF.ui.alert — inline alert/banner (not a modal).
//
// opts: {
//   kind?: 'info'|'success'|'warn'|'error' | signal,
//   title?: string|signal,
//   message?: string|signal,
//   onClose?,
// }
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  const ICONS = { info: 'ⓘ', success: '✓', warn: '⚠', error: '⨯' }

  ui.alert = function (opts) {
    const o = opts || {}
    const kind    = ui.asSig(o.kind    != null ? o.kind    : 'info')
    const title   = ui.asSig(o.title   != null ? o.title   : '')
    const message = ui.asSig(o.message != null ? o.message : '')
    const el = ui.h('div', 'ef-ui-alert')
    ui.bindClass(el, kind, 'ef-ui-alert-')
    ui.bind(el, kind, function (v) {
      const assertive = v === 'error' || v === 'warn'
      el.setAttribute('role',       assertive ? 'alert'     : 'status')
      el.setAttribute('aria-live',  assertive ? 'assertive' : 'polite')
    })

    const iconEl = ui.h('span', 'ef-ui-alert-icon', { 'aria-hidden': 'true' })
    ui.bind(el, kind, function (v) { iconEl.textContent = ICONS[v] || 'ⓘ' })
    el.appendChild(iconEl)

    const inner = ui.h('div', 'ef-ui-alert-body')
    const titleEl = ui.h('div', 'ef-ui-alert-title')
    ui.bindText(titleEl, title)
    ui.bind(el, title, function (v) { titleEl.style.display = (v == null || v === '') ? 'none' : '' })
    inner.appendChild(titleEl)
    const msgEl = ui.h('div', 'ef-ui-alert-msg')
    ui.bindText(msgEl, message)
    inner.appendChild(msgEl)
    el.appendChild(inner)

    if (o.onClose) {
      const x = ui.h('button', 'ef-ui-alert-close',
        { type: 'button', text: '×', 'aria-label': 'Dismiss alert' })
      x.addEventListener('click', o.onClose)
      el.appendChild(x)
    }
    return el
  }
})(window.EF = window.EF || {})
