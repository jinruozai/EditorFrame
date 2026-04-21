// EF.ui.iconButton — square icon-only button (toolbars, table row actions).
//
// opts: { icon, title, ariaLabel?, size?, kind?, disabled?, onClick }
//
// All display props (icon, size, kind, disabled) accept either a plain value
// or a signal. `title` and `ariaLabel` are construction-time identity strings
// and stay plain — at least one of them is required for accessibility (§ a11y
// contract), and we throw loudly at construction if neither is supplied.
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.iconButton = function (opts) {
    const o = opts || {}
    const label = o.ariaLabel || o.title
    if (!label) {
      throw new Error('ui.iconButton: `title` or `ariaLabel` is required for accessibility')
    }
    const icon     = ui.asSig(o.icon     != null ? o.icon     : '·')
    const size     = ui.asSig(o.size     != null ? o.size     : 'md')
    const kind     = ui.asSig(o.kind     != null ? o.kind     : 'ghost')
    const disabled = ui.asSig(o.disabled != null ? o.disabled : false)

    const el = ui.h('button', 'ef-ui-icon-btn',
      { type: 'button', title: o.title || label, 'aria-label': label })
    ui.bindClass(el, size, 'ef-ui-icon-btn-')
    ui.bindClass(el, kind, 'ef-ui-btn-')
    ui.bindAttr(el, disabled, 'disabled')

    // Inner icon tracks both name (registered SVG) and size via the same
    // signals. `icon` is forwarded as `name` — ui.icon resolves it to a
    // registered SVG first; otherwise falls back to rendering the value as
    // a text glyph, so legacy single-char values like '＋' still work.
    el.appendChild(ui.icon({ name: icon, size: size }))

    if (o.onClick) el.addEventListener('click', function (e) { if (!el.disabled) o.onClick(e) })
    return el
  }
})(window.EF = window.EF || {})
