// EF.ui.gradientInput — color stop list for a linear gradient.
//
// opts:
//   value : signal<{ stops: [{ pos: number(0..1), color: string }] }>
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.gradientInput = function (opts) {
    const o = opts || {}
    const sig = ui.asSig(o.value != null ? o.value : { stops: [{ pos: 0, color: '#000000' }, { pos: 1, color: '#ffffff' }] })

    const el = ui.h('div', 'ef-ui-gradient')
    const bar = ui.h('div', 'ef-ui-gradient-bar')
    const stopsLayer = ui.h('div', 'ef-ui-gradient-stops')
    el.appendChild(bar)
    el.appendChild(stopsLayer)

    let selectedIdx = 0

    function rebuild() {
      const data = sig.peek()
      const css = data.stops.map(function (s) { return s.color + ' ' + (s.pos * 100).toFixed(1) + '%' }).join(', ')
      bar.style.background = 'linear-gradient(to right, ' + css + ')'
      stopsLayer.replaceChildren()
      for (let i = 0; i < data.stops.length; i++) {
        const idx = i
        const s = data.stops[idx]
        const dot = ui.h('div', 'ef-ui-gradient-stop' + (idx === selectedIdx ? ' ef-ui-gradient-stop-active' : ''))
        dot.style.left = (s.pos * 100) + '%'
        dot.style.background = s.color
        ui.attachDrag(dot, {
          onStart: function (e) { e.stopPropagation(); selectedIdx = idx; rebuild() },
          onMove: function (e) {
            const r = bar.getBoundingClientRect()
            const p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
            const next = sig.peek()
            const stops = next.stops.slice()
            stops[idx] = { pos: p, color: stops[idx].color }
            sig.set({ stops: stops })
          },
        })
        dot.addEventListener('dblclick', function () {
          if (sig.peek().stops.length <= 2) return
          const stops = sig.peek().stops.slice()
          stops.splice(idx, 1)
          if (selectedIdx >= stops.length) selectedIdx = stops.length - 1
          sig.set({ stops: stops })
        })
        stopsLayer.appendChild(dot)
      }
    }
    bar.addEventListener('click', function (e) {
      const r = bar.getBoundingClientRect()
      const p = (e.clientX - r.left) / r.width
      const stops = sig.peek().stops.slice()
      stops.push({ pos: p, color: '#888888' })
      stops.sort(function (a, b) { return a.pos - b.pos })
      selectedIdx = stops.findIndex(function (s) { return s.pos === p })
      sig.set({ stops: stops })
    })
    ui.bind(el, sig, rebuild)

    // Selected color editor
    const editorRow = ui.h('div', 'ef-ui-gradient-editor')
    const colorSig = EF.signal('#888888')
    EF.effect(function () {
      const data = sig()
      const s = data.stops[selectedIdx]
      if (s) colorSig.set(s.color)
    })
    EF.effect(function () {
      const c = colorSig()
      const data = sig.peek()
      const s = data.stops[selectedIdx]
      if (s && s.color !== c) {
        const stops = data.stops.slice()
        stops[selectedIdx] = { pos: s.pos, color: c }
        sig.set({ stops: stops })
      }
    })
    editorRow.appendChild(ui.colorInput({ value: colorSig }))
    el.appendChild(editorRow)

    return el
  }
})(window.EF = window.EF || {})
