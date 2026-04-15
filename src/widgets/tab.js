// Tab widget — three presets share one implementation (§ 4.6).
//
//   tab-standard    closeButton:'hover', addButton:true
//   tab-compact     closeButton:'never', minShowCount:2
//   tab-collapsible collapsible:true (click active tab → collapse dock)
//
// This widget is just a regular toolbar widget. It has no special API:
// everything it does is reachable from any third-party widget through the
// public ctx.dock surface (panels signal, activeId signal, activatePanel /
// removePanel / addPanel / setCollapsed).
//
// Drag-out is also the same — pointerdown on a tab calls
// EF._dock.beginPanelDrag, which any widget could call. The framework gives
// it no special privileges.
;(function (EF) {
  'use strict'

  // Tab bar with stable-DOM reconciliation keyed by panelId.
  //
  // The critical property: clicking a tab triggers activatePanel, which writes
  // tree → fires the panels/activeId effect below. If we rebuilt buttons on
  // every run (replaceChildren), the clicked element would be replaced mid-
  // gesture and its `:active` CSS state would never paint. Instead we keep a
  // `Map<panelId, entry>` of live buttons, reuse them in place, and only
  // flip class names / reorder / append / detach as the panel list changes.
  function buildTabBar(props, ctx) {
    const root = document.createElement('div')
    root.className = 'ef-tabs'

    const closeMode   = props.closeButton || 'hover'   // 'hover' | 'always' | 'never'
    const showAdd     = !!props.addButton
    const minShow     = props.minShowCount != null ? props.minShowCount : 0
    const collapsible = !!props.collapsible
    const vertical    = !!props.vertical
    const iconOnly    = !!props.iconOnly

    if (closeMode === 'hover') root.classList.add('ef-tabs-close-hover')
    if (vertical)              root.classList.add('ef-tabs-vertical')
    if (iconOnly)              root.classList.add('ef-tabs-icon-only')

    // Stable button registry. Each entry caches the last-known panel fields
    // so we can skip DOM writes that would be no-ops.
    const entries = new Map() // panelId → { btn, titleEl, iconEl, closeEl, last: { title, icon, transient, dirty, active } }
    let addBtn = null

    function ensureEntry(p) {
      let e = entries.get(p.id)
      if (e) return e
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'ef-tab'
      btn.dataset.panelId = p.id

      let iconEl = null
      let titleEl = null
      if (iconOnly) {
        iconEl = document.createElement('span')
        iconEl.className = 'ef-tab-icon'
        btn.appendChild(iconEl)
      } else {
        iconEl = document.createElement('span')
        iconEl.className = 'ef-tab-icon'
        // Only attached when the panel actually has an icon.
        titleEl = document.createElement('span')
        titleEl.className = 'ef-tab-title'
        btn.appendChild(titleEl)
      }

      let closeEl = null
      if (closeMode !== 'never' && !iconOnly) {
        closeEl = document.createElement('span')
        closeEl.className = 'ef-tab-close'
        closeEl.textContent = '×'
        closeEl.addEventListener('pointerdown', function (ev) { ev.stopPropagation() })
        closeEl.addEventListener('click', function (ev) {
          ev.stopPropagation()
          ctx.dock.removePanel(btn.dataset.panelId)
        })
        btn.appendChild(closeEl)
      }

      btn.addEventListener('click', function () {
        const pid = btn.dataset.panelId
        const curActive = ctx.dock.activeId()
        if (collapsible && pid === curActive && ctx.dock.canCollapse()) {
          ctx.dock.setCollapsed(!ctx.dock.collapsed())
          return
        }
        ctx.dock.activatePanel(pid)
        if (collapsible && ctx.dock.canCollapse()) ctx.dock.setCollapsed(false)
      })

      btn.addEventListener('pointerdown', function (ev) {
        if (ev.button !== 0) return
        if (ev.target && ev.target.classList && ev.target.classList.contains('ef-tab-close')) return
        const dragFn = EF._dock && EF._dock.beginPanelDrag
        if (dragFn) dragFn(ev, btn.dataset.panelId, ctx.dock.id(), ctx._layout)
      })

      e = { btn: btn, titleEl: titleEl, iconEl: iconEl, closeEl: closeEl, last: {} }
      entries.set(p.id, e)
      return e
    }

    function syncEntry(e, p, isActive) {
      const last = e.last
      const title = p.title || p.widget

      if (last.active !== isActive) {
        e.btn.classList.toggle('ef-tab-active', isActive)
        last.active = isActive
      }
      if (last.transient !== !!p.transient) {
        e.btn.classList.toggle('ef-tab-transient', !!p.transient)
        last.transient = !!p.transient
      }
      if (last.dirty !== !!p.dirty) {
        e.btn.classList.toggle('ef-tab-dirty', !!p.dirty)
        last.dirty = !!p.dirty
      }
      if (last.title !== title) {
        e.btn.title = title
        if (iconOnly) {
          e.iconEl.textContent = p.icon || title.charAt(0).toUpperCase()
        } else {
          e.titleEl.textContent = title
        }
        last.title = title
      }
      if (!iconOnly && last.icon !== (p.icon || '')) {
        if (p.icon) {
          e.iconEl.textContent = p.icon
          if (!e.iconEl.parentNode) e.btn.insertBefore(e.iconEl, e.titleEl)
        } else if (e.iconEl.parentNode) {
          e.iconEl.remove()
        }
        last.icon = p.icon || ''
      } else if (iconOnly && last.icon !== (p.icon || '')) {
        e.iconEl.textContent = p.icon || title.charAt(0).toUpperCase()
        last.icon = p.icon || ''
      }
    }

    function ensureAddBtn() {
      if (addBtn) return addBtn
      addBtn = document.createElement('button')
      addBtn.type = 'button'
      addBtn.className = 'ef-tab-add'
      addBtn.textContent = '+'
      addBtn.addEventListener('click', function () {
        const panels = ctx.dock.panels()
        const curActive = ctx.dock.activeId()
        const active = panels.find(function (p) { return p.id === curActive })
        if (!active) return
        const defaults = EF.widgetDefaults(active.widget)
        ctx.dock.addPanel(Object.assign({}, defaults, { widget: active.widget }))
      })
      return addBtn
    }

    // Render reactively against the dock's panels + activeId signals.
    // ctx.onCleanup wires the effect dispose into the runtime cleanups.
    ctx.onCleanup(EF.effect(function () {
      const panels = ctx.dock.panels()
      const activeId = ctx.dock.activeId()

      // tab-compact: hide entire tab strip below the threshold, but keep
      // cached button entries so they survive the next show cycle.
      if (panels.length < minShow) {
        entries.forEach(function (e) { if (e.btn.parentNode) e.btn.remove() })
        if (addBtn && addBtn.parentNode) addBtn.remove()
        return
      }

      // 1. Prune entries whose panels are gone.
      const live = new Set()
      for (let i = 0; i < panels.length; i++) live.add(panels[i].id)
      entries.forEach(function (e, id) {
        if (!live.has(id)) {
          if (e.btn.parentNode) e.btn.remove()
          entries.delete(id)
        }
      })

      // 2. Ensure + sync entries in the target order, repositioning only when
      //    the node at index i is not already the expected button.
      for (let i = 0; i < panels.length; i++) {
        const p = panels[i]
        const e = ensureEntry(p)
        syncEntry(e, p, p.id === activeId)
        const cur = root.childNodes[i]
        if (cur !== e.btn) {
          // insertBefore handles both "not mounted yet" and "reorder" cases.
          root.insertBefore(e.btn, cur || null)
        }
      }

      // 3. Append / detach the add button at the end.
      if (showAdd) {
        const b = ensureAddBtn()
        if (b.parentNode !== root || root.lastChild !== b) root.appendChild(b)
      } else if (addBtn && addBtn.parentNode) {
        addBtn.remove()
      }

      // 4. Drop any stray nodes past the expected tail (defensive against
      //    external tampering; cost is O(0) in the steady state).
      const expected = panels.length + (showAdd ? 1 : 0)
      while (root.childNodes.length > expected) root.lastChild.remove()
    }))

    return root
  }

  // ── registration ───────────────────────────────────
  // Each preset bakes its own default props into a wrapped `create` so the
  // per-item ToolbarItemSpec.props (passed to create as `props`) is merged
  // OVER the preset defaults. This is the only way per-item overrides reach
  // buildTabBar — runtime.js just hands spec.props through verbatim.
  function preset(defaults) {
    return function (props, ctx) {
      return buildTabBar(Object.assign({}, defaults, props), ctx)
    }
  }

  EF.registerWidget('tab-standard', {
    defaults: function () { return { title: 'Tabs' } },
    create:   preset({ closeButton: 'hover', addButton: true }),
  })

  EF.registerWidget('tab-compact', {
    defaults: function () { return { title: 'Tabs' } },
    create:   preset({ closeButton: 'never', minShowCount: 2 }),
  })

  EF.registerWidget('tab-collapsible', {
    defaults: function () { return { title: 'Tabs' } },
    create:   preset({ closeButton: 'hover', addButton: false, collapsible: true }),
  })

  // Sidebar preset — icon-only vertical tabs, collapsible (click active →
  // collapse dock). Intended for left/right toolbars. Per-item props can
  // override any of these (e.g. `props: { iconOnly: false }` for text mode).
  EF.registerWidget('tab-sidebar', {
    defaults: function () { return { title: 'Tabs' } },
    create:   preset({
      closeButton: 'never',
      iconOnly:    true,
      vertical:    true,
      collapsible: true,
    }),
  })
})(window.EF = window.EF || {})
