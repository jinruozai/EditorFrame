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
// opts: {
//   value: number|signal, onChange?,
//   min?: number|signal, max?: number|signal, step?: number|signal,
//   precision?: number|signal,
//   suffix?: string|signal, label?: string|signal,
// }
//
// Note: min/max/step are live signals — changing them at runtime re-clamps
// the displayed value and re-quantizes future scrub/nudge sessions.
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.numberInput = function (opts) {
    const o = opts || {}
    const sig    = ui.asSig(o.value     != null ? o.value     : 0)
    const minS   = ui.asSig(o.min       != null ? o.min       : -Infinity)
    const maxS   = ui.asSig(o.max       != null ? o.max       :  Infinity)
    const stepS  = ui.asSig(o.step      != null ? o.step      : 1)
    const precS  = ui.asSig(o.precision != null ? o.precision : null)  // null = derive
    const label  = ui.asSig(o.label     != null ? o.label     : '')
    const suffix = ui.asSig(o.suffix    != null ? o.suffix    : '')
    const doWrite = ui.writer(sig, o.onChange, 'ui.numberInput')

    const el  = ui.h('div', 'ef-ui-num')
    const lab = ui.h('span', 'ef-ui-num-label')
    const dec = ui.h('button', 'ef-ui-num-step ef-ui-num-step-l', { type: 'button', text: '‹' })
    const txt = ui.h('input', 'ef-ui-num-text', { type: 'text' })
    const inc = ui.h('button', 'ef-ui-num-step ef-ui-num-step-r', { type: 'button', text: '›' })
    const sfx = ui.h('span', 'ef-ui-num-suffix')
    txt.readOnly = true
    el.appendChild(lab); el.appendChild(dec); el.appendChild(txt); el.appendChild(inc); el.appendChild(sfx)

    ui.bindText(lab, label)
    ui.bind(el, label,  function (v) { lab.style.display = (v == null || v === '') ? 'none' : '' })
    ui.bindText(sfx, suffix)
    ui.bind(el, suffix, function (v) { sfx.style.display = (v == null || v === '') ? 'none' : '' })

    function prec() {
      const p = precS.peek()
      if (p != null) return p
      return stepS.peek() >= 1 ? 0 : 3
    }
    function clamp(v) { return Math.max(minS.peek(), Math.min(maxS.peek(), v)) }
    function fmt(v)   { return Number(v).toFixed(prec()) }
    function commit(v) {
      const n = clamp(Number(v))
      if (!Number.isFinite(n)) return
      doWrite(Number(fmt(n)))
    }

    let editing = false
    // Re-render when value OR min/max/step/precision changes.
    ui.bind(el, sig,   function ()  { if (!editing) txt.value = fmt(sig.peek()) })
    ui.bind(el, minS,  function ()  { if (!editing) { const c = clamp(sig.peek()); if (c !== sig.peek()) doWrite(c); else txt.value = fmt(sig.peek()) } })
    ui.bind(el, maxS,  function ()  { if (!editing) { const c = clamp(sig.peek()); if (c !== sig.peek()) doWrite(c); else txt.value = fmt(sig.peek()) } })
    ui.bind(el, stepS, function ()  { if (!editing) txt.value = fmt(sig.peek()) })
    ui.bind(el, precS, function ()  { if (!editing) txt.value = fmt(sig.peek()) })

    function enterEdit() {
      if (editing) return
      editing = true
      txt.readOnly = false
      el.classList.add('ef-ui-num-editing')
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

    const SCRUB_THRESHOLD = 3
    el.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return
      if (editing) return
      if (e.target === dec || e.target === inc) return
      e.preventDefault()
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
        let mul = stepS.peek()
        if (ev.shiftKey) mul *= 10
        if (ev.ctrlKey || ev.metaKey) mul /= 10
        commit(startVal + dx * mul)
      }
      function onUp(ev) {
        el.removeEventListener('pointermove', onMove)
        el.removeEventListener('pointerup', onUp)
        el.removeEventListener('pointercancel', onUp)
        try { el.releasePointerCapture(ev.pointerId) } catch (_) {}
        if (scrubbing) el.classList.remove('ef-ui-num-scrubbing')
        else if (targetWasText) enterEdit()
      }
      el.addEventListener('pointermove', onMove)
      el.addEventListener('pointerup', onUp)
      el.addEventListener('pointercancel', onUp)
    })

    el.addEventListener('dblclick', function (e) {
      if (e.target === dec || e.target === inc) return
      enterEdit()
    })

    txt.addEventListener('blur', function () { exitEdit(true) })
    txt.addEventListener('keydown', function (e) {
      if (e.key === 'Enter')           { txt.blur() }
      else if (e.key === 'Escape')     { txt.value = fmt(sig.peek()); txt.blur() }
      else if (e.key === 'ArrowUp')    { e.preventDefault(); commit(sig.peek() + stepS.peek()) }
      else if (e.key === 'ArrowDown')  { e.preventDefault(); commit(sig.peek() - stepS.peek()) }
    })
    dec.addEventListener('click', function () { commit(sig.peek() - stepS.peek()) })
    inc.addEventListener('click', function () { commit(sig.peek() + stepS.peek()) })

    return el
  }
})(window.EF = window.EF || {})
