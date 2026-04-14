// EF.ui.rangeSlider — two-thumb slider for [min, max] ranges.
//
// opts: { value: signal<[number, number]>, min, max, step? }
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.rangeSlider = function (opts) {
    const o = opts || {}
    const sig = ui.asSig(o.value != null ? o.value : [0, 1])
    const min = o.min != null ? o.min : 0
    const max = o.max != null ? o.max : 1
    const step = o.step != null ? o.step : (max - min) / 100

    const el = ui.h('div', 'ef-ui-slider ef-ui-slider-range')
    const track = ui.h('div', 'ef-ui-slider-track')
    const fill  = ui.h('div', 'ef-ui-slider-fill')
    const t1 = ui.h('div', 'ef-ui-slider-thumb')
    const t2 = ui.h('div', 'ef-ui-slider-thumb')
    track.appendChild(fill); track.appendChild(t1); track.appendChild(t2)
    el.appendChild(track)

    function quantize(v) {
      v = Math.max(min, Math.min(max, v))
      if (step) v = Math.round((v - min) / step) * step + min
      return v
    }
    function pct(v) { return ((v - min) / (max - min)) * 100 }

    ui.bind(el, sig, function (v) {
      const p1 = pct(v[0]), p2 = pct(v[1])
      fill.style.left  = p1 + '%'
      fill.style.right = (100 - p2) + '%'
      t1.style.left = p1 + '%'
      t2.style.left = p2 + '%'
    })

    function fromEvent(e) {
      const r = track.getBoundingClientRect()
      return quantize(min + ((e.clientX - r.left) / r.width) * (max - min))
    }
    function attach(thumb, idx) {
      ui.attachDrag(thumb, {
        onStart: function (e) { e.stopPropagation(); update(e) },
        onMove:  update,
      })
      function update(e) {
        const v = sig.peek().slice()
        v[idx] = fromEvent(e)
        if (v[0] > v[1]) { const t = v[0]; v[0] = v[1]; v[1] = t }
        sig.set(v)
      }
    }
    attach(t1, 0); attach(t2, 1)

    return el
  }
})(window.EF = window.EF || {})
