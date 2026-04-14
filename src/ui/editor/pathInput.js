// EF.ui.pathInput — file/folder path with browse button.
//
// In a pure-frontend world we can't actually open OS file dialogs. This
// widget emits an `onBrowse` callback you wire up to your own picker (or
// to <input type=file>). For demos we expose `useFileInput: true` which
// uses the browser file picker to grab a name only.
//
// opts: { value: signal<string>, placeholder?, useFileInput?, onBrowse?, mode?: 'file'|'folder' }
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.pathInput = function (opts) {
    const o = opts || {}
    const sig = ui.asSig(o.value != null ? o.value : '')
    const el = ui.h('div', 'ef-ui-field ef-ui-path')
    const ic = ui.h('span', 'ef-ui-field-prefix', { text: o.mode === 'folder' ? '📁' : '📄' })
    const inp = ui.h('input', 'ef-ui-input', { type: 'text', placeholder: o.placeholder || 'Path...' })
    const btn = ui.h('button', 'ef-ui-path-browse', { type: 'button', text: '…' })
    el.appendChild(ic); el.appendChild(inp); el.appendChild(btn)

    ui.bind(el, sig, function (v) { if (document.activeElement !== inp) inp.value = v || '' })
    inp.addEventListener('input', function () { sig.set(inp.value) })
    btn.addEventListener('click', function () {
      if (o.useFileInput) {
        const f = ui.h('input', null, { type: 'file' })
        f.style.display = 'none'
        document.body.appendChild(f)
        f.addEventListener('change', function () { if (f.files[0]) sig.set(f.files[0].name); document.body.removeChild(f) })
        f.click()
      } else if (o.onBrowse) {
        o.onBrowse(function (path) { if (path) sig.set(path) })
      }
    })
    return el
  }
})(window.EF = window.EF || {})
