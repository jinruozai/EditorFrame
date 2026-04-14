// EF.ui.menu — context / dropdown menu.
//
// This is just a normal UI widget; the framework does NOT bind global menu
// hotkeys or right-click handlers. Callers wire it up: pointerdown / Ctrl+K /
// button click → call EF.ui.menu({ ... }) to open it.
//
// opts:
//   anchor   : HTMLElement                    required (popover anchor)
//   items    : MenuItem[]
//                MenuItem = { label, icon?, kbd?, onSelect?, disabled?, danger? }
//                         | { type: 'divider' }
//                         | { type: 'header', label }
//                         | { label, items: MenuItem[] }    nested submenu
//   side?, align?
//
// Returns a popover handle.
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  function buildMenu(items, onClose) {
    const list = ui.h('div', 'ef-ui-menu')
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (it.type === 'divider') {
        list.appendChild(ui.h('div', 'ef-ui-menu-divider'))
        continue
      }
      if (it.type === 'header') {
        list.appendChild(ui.h('div', 'ef-ui-menu-header', { text: it.label }))
        continue
      }
      const row = ui.h('button', 'ef-ui-menu-item' +
        (it.disabled ? ' ef-ui-menu-item-disabled' : '') +
        (it.danger ? ' ef-ui-menu-item-danger' : ''),
        { type: 'button' })
      if (it.icon) row.appendChild(ui.icon({ glyph: it.icon, size: 'sm' }))
      const labelEl = ui.h('span', 'ef-ui-menu-item-label', { text: it.label || '' })
      row.appendChild(labelEl)
      if (it.kbd) {
        const k = ui.kbd(it.kbd)
        k.classList.add('ef-ui-menu-item-kbd')
        row.appendChild(k)
      }
      if (it.items && it.items.length) {
        const arrow = ui.h('span', 'ef-ui-menu-item-sub', { text: '▸' })
        row.appendChild(arrow)
        let subPop = null
        row.addEventListener('mouseenter', function () {
          if (subPop) return
          const sub = buildMenu(it.items, onClose)
          subPop = ui.popover({ anchor: row, content: sub, side: 'right', align: 'start' })
        })
        row.addEventListener('mouseleave', function () {
          // submenu has its own dismiss-on-outside; let it manage itself
        })
      } else {
        row.addEventListener('click', function () {
          if (it.disabled) return
          if (it.onSelect) it.onSelect()
          onClose && onClose()
        })
      }
      list.appendChild(row)
    }
    return list
  }

  ui.menu = function (opts) {
    const o = opts || {}
    let pop = null
    function close() { if (pop) { pop.close(); pop = null } }
    const list = buildMenu(o.items || [], close)
    pop = ui.popover({ anchor: o.anchor, content: list, side: o.side || 'bottom', align: o.align || 'start' })
    return pop
  }
})(window.EF = window.EF || {})
