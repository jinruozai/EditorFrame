// EF.ui.switch — toggle switch (functionally identical to checkbox, different look).
//
// opts: { value: signal<bool>, label?, disabled? }
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui['switch'] = function (opts) {
    const o = opts || {}
    const sig = ui.asSig(o.value != null ? o.value : false)
    const el = ui.h('label', 'ef-ui-switch')
    const box = ui.h('input', 'ef-ui-switch-box', { type: 'checkbox' })
    const track = ui.h('span', 'ef-ui-switch-track')
    const knob  = ui.h('span', 'ef-ui-switch-knob')
    track.appendChild(knob)
    el.appendChild(box); el.appendChild(track)
    if (o.label) {
      const lab = ui.h('span', 'ef-ui-switch-label', { text: o.label })
      el.appendChild(lab)
    }
    ui.bind(el, sig, function (v) { box.checked = !!v; el.classList.toggle('ef-ui-switch-on', !!v) })
    box.addEventListener('change', function () { sig.set(box.checked) })
    if (o.disabled != null) {
      if (ui.isSignal(o.disabled)) ui.bind(el, o.disabled, function (v) { box.disabled = !!v })
      else box.disabled = !!o.disabled
    }
    return el
  }
})(window.EF = window.EF || {})
