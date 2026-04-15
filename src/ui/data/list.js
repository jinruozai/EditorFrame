// EF.ui.list — virtualized fixed-row list.
//
// opts:
//   items     : signal<any[]>            row data (signal so updates auto-render)
//   rowHeight : number                   pixels per row
//   render    : (item, index) => HTMLElement       row factory (called on demand)
//   selected? : signal<any>              optional single selection (item ref)
//   onSelect? : (item) => void            optional write path for `selected`
//                                         (required only if `selected` is read-only)
//   onActivate? : (item, index) => void   double-click handler
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.list = function (opts) {
    const o = opts || {}
    const items = ui.asSig(o.items != null ? o.items : [])
    const rowH = o.rowHeight || 22
    const render = o.render || function (it) { return ui.h('div', null, { text: String(it) }) }
    const selected = o.selected
    const writeSelected = selected ? ui.writer(selected, o.onSelect, 'ui.list') : null

    const el = ui.h('div', 'ef-ui-list ef-ui-scrollarea')
    const spacer = ui.h('div', 'ef-ui-list-spacer')
    const win = ui.h('div', 'ef-ui-list-window')
    el.appendChild(spacer)
    spacer.appendChild(win)

    const cache = new Map()  // index → element

    function paint() {
      const arr = items.peek()
      spacer.style.height = (arr.length * rowH) + 'px'
      const top = el.scrollTop
      const h = el.clientHeight || 200
      const start = Math.max(0, Math.floor(top / rowH) - 4)
      const end   = Math.min(arr.length, Math.ceil((top + h) / rowH) + 4)
      win.style.transform = 'translateY(' + (start * rowH) + 'px)'

      // Reuse cached elements; rebuild window if cache key is stale.
      const want = new Set()
      for (let i = start; i < end; i++) want.add(i)
      cache.forEach(function (el2, key) {
        if (!want.has(key)) { if (el2.parentNode) el2.parentNode.removeChild(el2); cache.delete(key) }
      })
      for (let i = start; i < end; i++) {
        if (!cache.has(i)) {
          const row = render(arr[i], i)
          row.style.height = rowH + 'px'
          row.classList.add('ef-ui-list-row')
          row.dataset.idx = i
          if (selected && selected.peek() === arr[i]) row.classList.add('ef-ui-list-row-active')
          row.addEventListener('click', function () { if (writeSelected) writeSelected(arr[i]) })
          if (o.onActivate) row.addEventListener('dblclick', function () { o.onActivate(arr[i], i) })
          cache.set(i, row)
          win.appendChild(row)
        }
      }
    }
    el.addEventListener('scroll', paint, { passive: true })
    ui.bind(el, items, function () { cache.forEach(function (e) { if (e.parentNode) e.parentNode.removeChild(e) }); cache.clear(); paint() })
    if (selected) ui.bind(el, selected, function () {
      const arr = items.peek()
      cache.forEach(function (row, i) { row.classList.toggle('ef-ui-list-row-active', selected.peek() === arr[i]) })
    })
    // Schedule a paint after mount (need clientHeight).
    requestAnimationFrame(paint)
    return el
  }
})(window.EF = window.EF || {})
