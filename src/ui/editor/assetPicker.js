// EF.ui.assetPicker — path text field + preview thumbnail, for images / audio
// / any project-resource field.
//
// opts:
//   value: string | signal<string>   the asset path (relative or absolute)
//   onChange?: (v) => void
//   kind?: 'image' | 'audio' | 'file'   preview style (default 'image')
//   placeholder?: string|signal        path hint
//   accept?: string                    comma-separated extensions ".png,.jpg"
//                                      (only informational — shown in placeholder
//                                       and used by the built-in browse button)
//   onBrowse?: (current) => Promise<string|null> | string | null
//                                      custom "pick" action; if omitted the
//                                      widget falls back to a hidden <input
//                                      type=file> (object URL only — no server
//                                      round-trip, suitable for demo content).
//
// Layout: [preview][path-input][browse-btn]. preview shows a thumbnail for
// kind=image, a ♪ glyph for audio, and a file icon otherwise. Clicking the
// preview opens the browser (same as the button).
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.assetPicker = function (opts) {
    const o = opts || {}
    const sig         = ui.asSig(o.value       != null ? o.value       : '')
    const placeholder = ui.asSig(o.placeholder != null ? o.placeholder : '')
    const kind        = o.kind || 'image'
    const accept      = o.accept || ''
    const doWrite     = ui.writer(sig, o.onChange, 'ui.assetPicker')

    const wrap = ui.h('div', 'ef-ui-asset-picker ef-ui-field')

    // Preview slot.
    const prev = ui.h('div', 'ef-ui-asset-preview')
    wrap.appendChild(prev)
    function paintPreview(v) {
      prev.innerHTML = ''
      if (kind === 'image' && v) {
        const img = document.createElement('img')
        img.src = v
        img.onerror = function () { img.remove(); prev.appendChild(placeholderIcon()) }
        prev.appendChild(img)
      } else if (kind === 'audio') {
        prev.appendChild(ui.icon({ name: 'music', size: 'md' }))
      } else {
        prev.appendChild(placeholderIcon())
      }
    }
    function placeholderIcon() {
      return ui.icon({ name: kind === 'image' ? 'image' : 'file', size: 'md' })
    }

    // Path input.
    const pathSig = EF.signal(String(sig.peek() || ''))
    const input = ui.input({
      value:       pathSig,
      placeholder: placeholder,
    })
    // Make input stretch; it arrives already wrapped in a .ef-ui-field so we
    // remove that layer to keep our own wrapper as the visual frame.
    input.classList.add('ef-ui-asset-path')
    input.style.flex = '1 1 auto'
    input.style.minWidth = '0'
    // Strip the inner `.ef-ui-input` of its box styling — our wrapper owns it.
    const innerInput = input.querySelector('input')
    if (innerInput) innerInput.style.border = '0'
    wrap.appendChild(input)

    // Browse button.
    const browse = ui.iconButton({
      icon:  'folder',
      title: 'Browse',
      onClick: doBrowse,
    })
    wrap.appendChild(browse)

    // Sync both directions: signal → path input, path input → signal.
    ui.bind(wrap, sig, function (v) {
      const s = v == null ? '' : String(v)
      if (pathSig.peek() !== s) pathSig.set(s)
      paintPreview(s)
    })
    EF.effect(function () {
      const s = pathSig()
      if (s !== String(sig.peek() || '')) doWrite(s)
    })

    prev.addEventListener('click', doBrowse)

    function doBrowse() {
      if (typeof o.onBrowse === 'function') {
        const res = o.onBrowse(sig.peek())
        if (res && typeof res.then === 'function') {
          res.then(function (v) { if (v != null) doWrite(v) })
        } else if (res != null) {
          doWrite(res)
        }
        return
      }
      // Fallback: open a hidden file chooser and store an object URL.
      const f = document.createElement('input')
      f.type = 'file'
      if (accept) f.accept = accept
      f.style.display = 'none'
      document.body.appendChild(f)
      function cleanup() { if (f.parentNode) f.parentNode.removeChild(f) }
      f.addEventListener('change', function () {
        const file = f.files && f.files[0]
        if (file) doWrite(URL.createObjectURL(file))
        cleanup()
      })
      f.addEventListener('cancel', cleanup)
      f.click()
    }

    paintPreview(sig.peek())
    return wrap
  }
})(window.EF = window.EF || {})
