// EF.ui.numberInput — Blender-style numeric input with drag-to-scrub.
//
// • Click the value to type a number directly.
// • Drag horizontally on the field to scrub (multiplied by `step`).
// • Hold Shift while dragging → ×10. Hold Ctrl → ÷10.
// • Keyboard ↑/↓ adjust by `step`.
//
// opts: { value: signal<number>, min?, max?, step?, precision?, suffix?, label? }
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.numberInput = function (opts) {
    const o = opts || {}
    const sig = ui.asSig(o.value != null ? o.value : 0)
    const min = o.min != null ? o.min : -Infinity
    const max = o.max != null ? o.max :  Infinity
    const step = o.step != null ? o.step : 1
    const prec = o.precision != null ? o.precision : (step >= 1 ? 0 : 3)

    const el = ui.h('div', 'ef-ui-num')
    if (o.label != null) {
      const lab = ui.h('span', 'ef-ui-num-label', { text: o.label })
      el.appendChild(lab)
    }
    const dec = ui.h('button', 'ef-ui-num-step ef-ui-num-step-l', { type: 'button', text: '‹' })
    const txt = ui.h('input', 'ef-ui-num-text', { type: 'text' })
    const inc = ui.h('button', 'ef-ui-num-step ef-ui-num-step-r', { type: 'button', text: '›' })
    el.appendChild(dec); el.appendChild(txt); el.appendChild(inc)
    if (o.suffix) {
      const sfx = ui.h('span', 'ef-ui-num-suffix', { text: o.suffix })
      el.appendChild(sfx)
    }

    function clamp(v) { return Math.max(min, Math.min(max, v)) }
    function fmt(v)   { return Number(v).toFixed(prec) }
    function commit(v) {
      const n = clamp(Number(v))
      if (!Number.isFinite(n)) return
      sig.set(Number(fmt(n)))
    }

    let editing = false
    ui.bind(el, sig, function (v) { if (!editing) txt.value = fmt(v) })

    txt.addEventListener('focus', function () { editing = true; txt.select() })
    txt.addEventListener('blur',  function () { editing = false; commit(txt.value); txt.value = fmt(sig.peek()) })
    txt.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { txt.blur() }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); commit(sig.peek() + step) }
      else if (e.key === 'ArrowDown') { e.preventDefault(); commit(sig.peek() - step) }
    })
    dec.addEventListener('click', function () { commit(sig.peek() - step) })
    inc.addEventListener('click', function () { commit(sig.peek() + step) })

    // Drag-to-scrub on the entire body (except buttons / typing field).
    let scrub = null
    ui.attachDrag(el, {
      onStart: function (e, ctx) {
        if (e.target === txt || e.target === dec || e.target === inc) return
        scrub = { start: sig.peek() }
        el.classList.add('ef-ui-num-scrubbing')
      },
      onMove: function (e, ctx) {
        if (!scrub) return
        let mul = step
        if (e.shiftKey) mul *= 10
        if (e.ctrlKey || e.metaKey) mul /= 10
        commit(scrub.start + ctx.dx * mul)
      },
      onEnd: function () {
        if (!scrub) return
        scrub = null
        el.classList.remove('ef-ui-num-scrubbing')
      },
    })

    return el
  }
})(window.EF = window.EF || {})
