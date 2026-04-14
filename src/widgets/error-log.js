// Built-in error-log widget. Subscribes to EF.errors and renders the list.
// Click a row to dismiss it. Newest entries on top.
//
// This widget exists as both a working "Problems" panel for editor-style
// applications AND a self-test for the error pipeline (§ 4.7) — register it
// in any dock and you immediately see every panel error / global throw /
// async rejection / bus handler crash routed to one place.
;(function (EF) {
  'use strict'

  function create(props, ctx) {
    const root = document.createElement('div')
    root.className = 'ef-error-log'

    ctx.onCleanup(EF.effect(function () {
      const list = EF.errors()
      if (list.length === 0) {
        root.replaceChildren(makeEmpty())
        return
      }
      const frag = document.createDocumentFragment()
      for (let i = list.length - 1; i >= 0; i--) {
        frag.appendChild(makeRow(list[i]))
      }
      root.replaceChildren(frag)
    }))

    return root
  }

  function makeEmpty() {
    const d = document.createElement('div')
    d.className = 'ef-error-empty'
    d.textContent = 'No errors. Try ctx.safeCall(() => { throw new Error("boom") }).'
    return d
  }

  function makeRow(entry) {
    const row = document.createElement('div')
    row.className = 'ef-error-row'

    const src = document.createElement('div')
    src.className = 'src'
    src.textContent = formatSource(entry.source)
    row.appendChild(src)

    const msg = document.createElement('div')
    msg.className = 'msg'
    msg.textContent = entry.message
    row.appendChild(msg)

    if (entry.stack) {
      const stk = document.createElement('div')
      stk.className = 'stk'
      stk.textContent = entry.stack
      row.appendChild(stk)
    }

    row.title = 'click to dismiss'
    row.addEventListener('click', function () { EF.dismissError(entry.id) })
    return row
  }

  function formatSource(s) {
    if (!s) return 'unknown'
    const parts = [s.scope || 'unknown']
    if (s.widget)  parts.push('widget=' + s.widget)
    if (s.dockId)  parts.push('dock=' + s.dockId)
    if (s.panelId) parts.push('panel=' + s.panelId)
    if (s.topic)   parts.push('topic=' + s.topic)
    return parts.join(' · ')
  }

  EF.registerWidget('error-log', {
    defaults: function () { return { title: 'Problems', icon: '!' } },
    create: create,
  })
})(window.EF = window.EF || {})
