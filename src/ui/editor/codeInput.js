// EF.ui.codeInput — monospace text editor with line numbers + tab indent.
//
// Light-weight: not Monaco. Just a styled <textarea> with a gutter overlay,
// Tab-key handling for indentation, and signal-bound value. Use Monaco /
// CodeMirror inside a real panel widget when you need intellisense.
//
// opts: { value: signal<string>, language?, rows? }
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.codeInput = function (opts) {
    const o = opts || {}
    const sig = ui.asSig(o.value != null ? o.value : '')
    const el = ui.h('div', 'ef-ui-code')
    const gutter = ui.h('div', 'ef-ui-code-gutter')
    const ta = ui.h('textarea', 'ef-ui-code-text', {
      spellcheck: 'false',
      rows: String(o.rows || 12),
    })
    if (o.language) {
      const tag = ui.h('span', 'ef-ui-code-lang', { text: o.language })
      el.appendChild(tag)
    }
    el.appendChild(gutter); el.appendChild(ta)

    function refreshGutter() {
      const lines = (ta.value.match(/\n/g) || []).length + 1
      let s = ''
      for (let i = 1; i <= lines; i++) s += i + '\n'
      gutter.textContent = s
    }
    ui.bind(el, sig, function (v) {
      if (document.activeElement !== ta) ta.value = v == null ? '' : String(v)
      refreshGutter()
    })
    ta.addEventListener('input', function () { sig.set(ta.value); refreshGutter() })
    ta.addEventListener('scroll', function () { gutter.scrollTop = ta.scrollTop })
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') {
        e.preventDefault()
        const s = ta.selectionStart, n = ta.selectionEnd
        ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(n)
        ta.selectionStart = ta.selectionEnd = s + 2
        sig.set(ta.value); refreshGutter()
      }
    })
    return el
  }
})(window.EF = window.EF || {})
