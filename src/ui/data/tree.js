// EF.ui.tree — virtualized tree (flatten + reuse list virtualization).
//
// Data shape: opts.items: signal<TreeNode[]>
//   TreeNode = { id, label, icon?, children?: TreeNode[] }
// Expansion is tracked per-node id in an internal Set (signalized so the
// flat row list is reactive).
//
// opts:
//   items     : signal<TreeNode[]>
//   selected? : signal<id | null>
//   rowHeight?: number      (default 22)
//   onActivate? : (node) => void
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.tree = function (opts) {
    const o = opts || {}
    const items = ui.asSig(o.items != null ? o.items : [])
    const selected = o.selected
    const rowH = o.rowHeight || 22
    const expanded = EF.signal(new Set())

    // Flat view = derived signal that reads items + expanded.
    const flat = EF.derived(function () {
      const out = []
      const ex = expanded()
      function walk(nodes, depth) {
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i]
          const hasKids = n.children && n.children.length
          out.push({ node: n, depth: depth, hasKids: !!hasKids, expanded: ex.has(n.id) })
          if (hasKids && ex.has(n.id)) walk(n.children, depth + 1)
        }
      }
      walk(items(), 0)
      return out
    })

    function render(row, idx) {
      const el = ui.h('div', 'ef-ui-tree-row')
      el.style.paddingLeft = (4 + row.depth * 14) + 'px'
      const arrow = ui.h('span', 'ef-ui-tree-arrow', { text: row.hasKids ? (row.expanded ? '▾' : '▸') : '' })
      arrow.addEventListener('click', function (e) {
        e.stopPropagation()
        const ex = new Set(expanded.peek())
        if (ex.has(row.node.id)) ex.delete(row.node.id); else ex.add(row.node.id)
        expanded.set(ex)
      })
      el.appendChild(arrow)
      if (row.node.icon) el.appendChild(ui.icon({ glyph: row.node.icon, size: 'sm' }))
      const label = ui.h('span', 'ef-ui-tree-label', { text: row.node.label != null ? row.node.label : String(row.node.id) })
      el.appendChild(label)
      if (selected && selected.peek() === row.node.id) el.classList.add('ef-ui-tree-row-active')
      return el
    }

    return ui.list({
      items: flat,
      rowHeight: rowH,
      render: render,
      selected: selected ? mapSelected(flat, selected) : null,
      onActivate: o.onActivate ? function (row) { o.onActivate(row.node) } : null,
    })

    // The list expects selected on `item` (the flat row). Bridge so
    // selected.set(node.id) ⇔ flat row whose node.id matches.
    function mapSelected(flatSig, idSig) {
      const proxy = EF.signal(null)
      EF.effect(function () {
        const id = idSig()
        const arr = flatSig()
        const row = arr.find(function (r) { return r.node.id === id })
        if (proxy.peek() !== row) proxy.set(row)
      })
      EF.effect(function () {
        const r = proxy()
        if (r && idSig.peek() !== r.node.id) idSig.set(r.node.id)
      })
      return proxy
    }
  }
})(window.EF = window.EF || {})
