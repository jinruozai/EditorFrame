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

    // Render reactively against the dock's panels + activeId signals.
    // ctx.onCleanup wires the effect dispose into the runtime cleanups.
    ctx.onCleanup(EF.effect(function () {
      const panels = ctx.dock.panels()
      const activeId = ctx.dock.activeId()

      // tab-compact: hide entire tab strip below the threshold.
      if (panels.length < minShow) {
        root.replaceChildren()
        return
      }

      const frag = document.createDocumentFragment()
      for (let i = 0; i < panels.length; i++) {
        frag.appendChild(buildTabButton(panels[i], activeId, closeMode, ctx, collapsible, iconOnly))
      }
      if (showAdd) frag.appendChild(buildAddButton(ctx))
      root.replaceChildren(frag)
    }))

    return root
  }

  function buildTabButton(p, activeId, closeMode, ctx, collapsible, iconOnly) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'ef-tab'
    if (p.id === activeId) btn.classList.add('ef-tab-active')
    if (p.transient)       btn.classList.add('ef-tab-transient')
    if (p.dirty)           btn.classList.add('ef-tab-dirty')
    btn.dataset.panelId = p.id
    btn.title = p.title || p.widget

    if (iconOnly) {
      const icon = document.createElement('span')
      icon.className = 'ef-tab-icon'
      icon.textContent = p.icon || (p.title || p.widget).charAt(0).toUpperCase()
      btn.appendChild(icon)
    } else {
      if (p.icon) {
        const ic = document.createElement('span')
        ic.className = 'ef-tab-icon'
        ic.textContent = p.icon
        btn.appendChild(ic)
      }
      const title = document.createElement('span')
      title.className = 'ef-tab-title'
      title.textContent = p.title || p.widget
      btn.appendChild(title)
    }

    if (closeMode !== 'never' && !iconOnly) {
      const x = document.createElement('span')
      x.className = 'ef-tab-close'
      x.textContent = '×'
      x.addEventListener('pointerdown', function (e) { e.stopPropagation() })
      x.addEventListener('click', function (e) {
        e.stopPropagation()
        ctx.dock.removePanel(p.id)
      })
      btn.appendChild(x)
    }

    btn.addEventListener('click', function (e) {
      // Click on close button is handled above with stopPropagation.
      // Collapsible path only fires when the dock is actually collapsible
      // at its current tree position — otherwise it would flip a flag that
      // render.js refuses to honor, leaving the user wondering why nothing
      // happened. canCollapse is a pure topology check (see tree.js).
      if (collapsible && p.id === activeId && ctx.dock.canCollapse()) {
        ctx.dock.setCollapsed(!ctx.dock.collapsed())
        return
      }
      ctx.dock.activatePanel(p.id)
      if (collapsible && ctx.dock.canCollapse()) ctx.dock.setCollapsed(false)
    })

    // Drag start — delegate to the framework's panel-drag helper.
    btn.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return
      // Don't start a drag from the close button.
      if (e.target && e.target.classList && e.target.classList.contains('ef-tab-close')) return
      const dragFn = EF._dock && EF._dock.beginPanelDrag
      if (dragFn) dragFn(e, p.id, ctx.dock.id(), ctx._layout)
    })

    return btn
  }

  function buildAddButton(ctx) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'ef-tab-add'
    btn.textContent = '+'
    btn.addEventListener('click', function () {
      // § 4.1 spirit: clone widget type from current active panel. If the
      // dock is empty there's nothing sensible to add; bail.
      const panels = ctx.dock.panels()
      const activeId = ctx.dock.activeId()
      const active = panels.find(function (p) { return p.id === activeId })
      if (!active) return
      const defaults = EF.widgetDefaults(active.widget)
      ctx.dock.addPanel(Object.assign({}, defaults, { widget: active.widget }))
    })
    return btn
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
