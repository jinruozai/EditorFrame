// EF.ui.alert — inline alert/banner (not a modal).
//
// EF.ui.alert({ kind: 'info'|'success'|'warn'|'error', title?, message })
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  const ICONS = { info: 'ⓘ', success: '✓', warn: '⚠', error: '⨯' }

  ui.alert = function (opts) {
    const o = opts || {}
    const kind = o.kind || 'info'
    const el = ui.h('div', 'ef-ui-alert ef-ui-alert-' + kind)
    el.appendChild(ui.h('span', 'ef-ui-alert-icon', { text: ICONS[kind] || 'ⓘ' }))
    const inner = ui.h('div', 'ef-ui-alert-body')
    if (o.title) inner.appendChild(ui.h('div', 'ef-ui-alert-title', { text: o.title }))
    inner.appendChild(ui.h('div', 'ef-ui-alert-msg', { text: o.message || '' }))
    el.appendChild(inner)
    if (o.onClose) {
      const x = ui.h('button', 'ef-ui-alert-close', { type: 'button', text: '×' })
      x.addEventListener('click', o.onClose)
      el.appendChild(x)
    }
    return el
  }
})(window.EF = window.EF || {})
