// EF.ui.tagInput — chip list with add-on-Enter and click-to-remove.
//
// opts: { value: signal<string[]>, placeholder? }
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.tagInput = function (opts) {
    const o = opts || {}
    const sig = ui.asSig(o.value != null ? o.value : [])
    const el = ui.h('div', 'ef-ui-field ef-ui-taginput')
    const list = ui.h('div', 'ef-ui-taginput-list')
    const inp = ui.h('input', 'ef-ui-taginput-input', { type: 'text', placeholder: o.placeholder || 'Add...' })
    el.appendChild(list); el.appendChild(inp)

    function rebuild(arr) {
      list.replaceChildren()
      for (let i = 0; i < arr.length; i++) {
        const idx = i
        const t = ui.tag({ text: arr[idx], onClose: function () {
          const next = sig.peek().slice(); next.splice(idx, 1); sig.set(next)
        }})
        list.appendChild(t)
      }
    }
    ui.bind(el, sig, rebuild)

    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && inp.value.trim()) {
        sig.set(sig.peek().concat(inp.value.trim()))
        inp.value = ''
      } else if (e.key === 'Backspace' && !inp.value && sig.peek().length) {
        sig.set(sig.peek().slice(0, -1))
      }
    })
    el.addEventListener('click', function () { inp.focus() })
    return el
  }
})(window.EF = window.EF || {})
