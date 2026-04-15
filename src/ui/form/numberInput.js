// EF.ui.numberInput — Blender-style numeric input with drag-to-scrub.
//
// Interaction model (unified pointer session):
//   • Hover shows an ew-resize cursor on the entire control body.
//   • Press-and-drag (pointer move ≥ 3px) → scrub, step scaled by shift/ctrl.
//   • Press-and-release without movement on the text field → enter edit mode
//     (the field becomes editable, value is selected).
//   • Double-click anywhere on the body → enter edit mode.
//   • Enter / blur commit the edit. Escape cancels.
//   • ↑ / ↓ keys adjust by `step` while editing (and without scrubbing).
//   • ‹ / › buttons nudge by `step`.
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
    txt.readOnly = true
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

    function enterEdit() {
      if (editing) return
      editing = true
      txt.readOnly = false
      el.classList.add('ef-ui-num-editing')
      // Focus + select on next tick so pointerup doesn't immediately deselect.
      requestAnimationFrame(function () { txt.focus(); txt.select() })
    }
    function exitEdit(commitFlag) {
      if (!editing) return
      editing = false
      el.classList.remove('ef-ui-num-editing')
      if (commitFlag) commit(txt.value)
      txt.readOnly = true
      txt.value = fmt(sig.peek())
    }

    // Unified pointer session on the whole body. Identifies drag (scrub) vs
    // click (→ edit if over text field).
    const SCRUB_THRESHOLD = 3
    el.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return
      if (editing) return                                   // let the native input handle clicks
      if (e.target === dec || e.target === inc) return      // nudge buttons own their clicks
      e.preventDefault()                                    // block focus on mousedown
      const startX = e.clientX
      const startVal = sig.peek()
      const targetWasText = (e.target === txt)
      let scrubbing = false
      try { el.setPointerCapture(e.pointerId) } catch (_) {}

      function onMove(ev) {
        const dx = ev.clientX - startX
        if (!scrubbing) {
          if (Math.abs(dx) < SCRUB_THRESHOLD) return
          scrubbing = true
          el.classList.add('ef-ui-num-scrubbing')
        }
        let mul = step
        if (ev.shiftKey) mul *= 10
        if (ev.ctrlKey || ev.metaKey) mul /= 10
        commit(startVal + dx * mul)
      }
      function onUp(ev) {
        el.removeEventListener('pointermove', onMove)
        el.removeEventListener('pointerup', onUp)
        el.removeEventListener('pointercancel', onUp)
        try { el.releasePointerCapture(ev.pointerId) } catch (_) {}
        if (scrubbing) {
          el.classList.remove('ef-ui-num-scrubbing')
        } else if (targetWasText) {
          enterEdit()
        }
      }
      el.addEventListener('pointermove', onMove)
      el.addEventListener('pointerup', onUp)
      el.addEventListener('pointercancel', onUp)
    })

    // Double-click on any body area (including label / suffix) enters edit mode.
    el.addEventListener('dblclick', function (e) {
      if (e.target === dec || e.target === inc) return
      enterEdit()
    })

    txt.addEventListener('blur', function () { exitEdit(true) })
    txt.addEventListener('keydown', function (e) {
      if (e.key === 'Enter')      { txt.blur() }
      else if (e.key === 'Escape') { txt.value = fmt(sig.peek()); txt.blur() }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); commit(sig.peek() + step) }
      else if (e.key === 'ArrowDown') { e.preventDefault(); commit(sig.peek() - step) }
    })
    dec.addEventListener('click', function () { commit(sig.peek() - step) })
    inc.addEventListener('click', function () { commit(sig.peek() + step) })

    return el
  }
})(window.EF = window.EF || {})
