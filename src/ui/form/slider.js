// EF.ui.slider — horizontal numeric slider with optional value bubble.
//
// opts: { value: signal<number>, min, max, step?, showValue?, suffix? }
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.slider = function (opts) {
    const o = opts || {}
    const sig = ui.asSig(o.value != null ? o.value : 0)
    const min = o.min != null ? o.min : 0
    const max = o.max != null ? o.max : 1
    const step = o.step != null ? o.step : (max - min) / 100

    const el = ui.h('div', 'ef-ui-slider')
    const track = ui.h('div', 'ef-ui-slider-track')
    const fill  = ui.h('div', 'ef-ui-slider-fill')
    const thumb = ui.h('div', 'ef-ui-slider-thumb')
    track.appendChild(fill)
    track.appendChild(thumb)
    el.appendChild(track)

    let valueEl = null
    if (o.showValue) {
      valueEl = ui.h('span', 'ef-ui-slider-value')
      el.appendChild(valueEl)
    }

    function quantize(v) {
      v = Math.max(min, Math.min(max, v))
      if (step) v = Math.round((v - min) / step) * step + min
      return v
    }
    function pct(v) { return ((v - min) / (max - min)) * 100 }

    ui.bind(el, sig, function (v) {
      const p = pct(v)
      fill.style.width = p + '%'
      thumb.style.left = p + '%'
      if (valueEl) valueEl.textContent = (Number(v).toFixed(step < 1 ? 2 : 0)) + (o.suffix || '')
    })

    function fromEvent(e) {
      const r = track.getBoundingClientRect()
      const t = (e.clientX - r.left) / r.width
      return quantize(min + t * (max - min))
    }
    ui.attachDrag(track, {
      onStart: function (e) { sig.set(fromEvent(e)) },
      onMove:  function (e) { sig.set(fromEvent(e)) },
    })

    return el
  }
})(window.EF = window.EF || {})
