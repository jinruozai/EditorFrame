// EF.ui.curveInput — animation/easing curve editor (cubic bezier 4-pt).
//
// opts:
//   value : signal<[x1, y1, x2, y2]>  (control points in [0,1] like CSS bezier)
//   width?, height?
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.curveInput = function (opts) {
    const o = opts || {}
    const sig = ui.asSig(o.value != null ? o.value : [0.42, 0, 0.58, 1])
    const W = o.width  || 200
    const H = o.height || 140

    const el = ui.h('div', 'ef-ui-curve')
    const cv = ui.h('canvas', 'ef-ui-curve-canvas')
    cv.width = W; cv.height = H
    cv.style.width  = W + 'px'
    cv.style.height = H + 'px'
    el.appendChild(cv)
    const ctx = cv.getContext('2d')

    function getCss(name) {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#7b6ef6'
    }

    function draw() {
      const v = sig.peek()
      const PAD = 12
      const innerW = W - PAD * 2
      const innerH = H - PAD * 2

      ctx.clearRect(0, 0, W, H)

      // grid
      ctx.strokeStyle = getCss('--ef-border')
      ctx.lineWidth = 1
      ctx.strokeRect(PAD + .5, PAD + .5, innerW, innerH)
      ctx.beginPath()
      for (let i = 1; i < 4; i++) {
        ctx.moveTo(PAD + (innerW * i / 4), PAD)
        ctx.lineTo(PAD + (innerW * i / 4), PAD + innerH)
        ctx.moveTo(PAD,             PAD + (innerH * i / 4))
        ctx.lineTo(PAD + innerW,    PAD + (innerH * i / 4))
      }
      ctx.stroke()

      function map(x, y) { return [PAD + x * innerW, PAD + (1 - y) * innerH] }

      const p0 = map(0, 0)
      const p1 = map(v[0], v[1])
      const p2 = map(v[2], v[3])
      const p3 = map(1, 1)

      // handle lines
      ctx.strokeStyle = getCss('--ef-fg-3')
      ctx.beginPath()
      ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1])
      ctx.moveTo(p3[0], p3[1]); ctx.lineTo(p2[0], p2[1])
      ctx.stroke()

      // bezier
      ctx.strokeStyle = getCss('--ef-accent')
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(p0[0], p0[1])
      ctx.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1])
      ctx.stroke()

      // handles
      ctx.fillStyle = getCss('--ef-accent')
      ;[p1, p2].forEach(function (p) {
        ctx.beginPath(); ctx.arc(p[0], p[1], 5, 0, Math.PI * 2); ctx.fill()
      })
    }

    ui.bind(el, sig, draw)

    let dragIdx = -1
    cv.addEventListener('pointerdown', function (e) {
      const r = cv.getBoundingClientRect()
      const PAD = 12
      const innerW = W - PAD * 2, innerH = H - PAD * 2
      const v = sig.peek()
      const px = e.clientX - r.left, py = e.clientY - r.top
      const p1 = [PAD + v[0] * innerW, PAD + (1 - v[1]) * innerH]
      const p2 = [PAD + v[2] * innerW, PAD + (1 - v[3]) * innerH]
      const d1 = (px - p1[0]) ** 2 + (py - p1[1]) ** 2
      const d2 = (px - p2[0]) ** 2 + (py - p2[1]) ** 2
      dragIdx = (d1 < d2) ? 0 : 1
      cv.setPointerCapture(e.pointerId)
    })
    cv.addEventListener('pointermove', function (e) {
      if (dragIdx < 0) return
      const r = cv.getBoundingClientRect()
      const PAD = 12
      const innerW = W - PAD * 2, innerH = H - PAD * 2
      const x = Math.max(0, Math.min(1, (e.clientX - r.left - PAD) / innerW))
      const y = Math.max(-.5, Math.min(1.5, 1 - (e.clientY - r.top - PAD) / innerH))
      const v = sig.peek().slice()
      v[dragIdx * 2]     = x
      v[dragIdx * 2 + 1] = y
      sig.set(v)
    })
    cv.addEventListener('pointerup', function () { dragIdx = -1 })

    return el
  }
})(window.EF = window.EF || {})
