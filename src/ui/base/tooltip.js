// EF.ui.tooltip — attach a hover tooltip to any element.
//
// EF.ui.tooltip(target, { text, side?: 'top'|'bottom'|'left'|'right', delay?: 400 })
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.tooltip = function (target, opts) {
    const o = opts || {}
    const side = o.side || 'top'
    const delay = o.delay != null ? o.delay : 400
    let timer = null
    let tip = null

    function show() {
      if (tip) return
      tip = ui.h('div', 'ef-ui-tooltip', { text: o.text || '' })
      ui.portal(tip)
      ui.place(target, tip, { side: side, align: 'center', gap: 6 })
    }
    function hide() {
      if (timer) { clearTimeout(timer); timer = null }
      if (tip) { if (tip.parentNode) tip.parentNode.removeChild(tip); tip = null }
    }
    function onEnter() { timer = setTimeout(show, delay) }
    target.addEventListener('pointerenter', onEnter)
    target.addEventListener('pointerleave', hide)
    target.addEventListener('pointerdown', hide)
    ui.collect(target, function () {
      target.removeEventListener('pointerenter', onEnter)
      target.removeEventListener('pointerleave', hide)
      target.removeEventListener('pointerdown', hide)
      hide()
    })
    return target
  }
})(window.EF = window.EF || {})
