// createDockLayout — public entry. Builds a LayoutRuntime, drives one
// reconcile effect, and exposes the LayoutHandle described in § 4.9 Layer 1.
//
// This is the only file in dock/ that touches the public EF surface.
;(function (EF) {
  'use strict'

  const signal = EF.signal
  const effect = EF.effect
  const RT     = EF._dock

  let _globalListenersInstalled = false

  function installGlobalErrorListeners() {
    if (_globalListenersInstalled) return
    _globalListenersInstalled = true
    window.addEventListener('error', function (e) {
      EF.reportError({ scope: 'global' }, e.error || new Error(e.message))
    })
    window.addEventListener('unhandledrejection', function (e) {
      EF.reportError({ scope: 'global' }, e.reason || new Error('unhandledrejection'))
    })
  }

  function createDockLayout(container, config) {
    config = config || {}
    if (!config.tree) throw new Error('createDockLayout: config.tree is required')

    installGlobalErrorListeners()
    container.classList.add('ef-root')

    const tree   = signal(config.tree)
    const layout = RT.createLayoutRuntime(container, tree, {
      lru:   config.lru,
      hooks: config.hooks,
    })

    effect(function () {
      const t = tree()
      RT.reconcile(layout, t)
    })

    // Phase 6 — popup mode handshake. No-op in regular windows.
    if (RT.bindMigrationReceiver) RT.bindMigrationReceiver(layout)

    // ── LayoutHandle ───────────────────────────────────
    const handle = {
      tree:      function ()  { return tree.peek() },
      setTree:   function (t) { tree.set(t) },
      subscribe: function (fn) { return effect(function () { fn(tree()) }) },

      addPanel: function (dockId, partial, opts) {
        const r = EF.addPanel(tree.peek(), dockId, partial, opts)
        tree.set(r.tree)
        layout.markActivation(r.panelId)
        return { panelId: r.panelId }
      },
      removePanel: function (panelId) { layout.removePanel(panelId) },
      activatePanel: function (panelId) { layout.activatePanel(panelId) },
      promotePanel: function (panelId) { tree.set(EF.promotePanel(tree.peek(), panelId)) },
      movePanel: function (panelId, dstDockId, dstIndex) {
        tree.set(EF.movePanel(tree.peek(), panelId, dstDockId, dstIndex))
        layout.markActivation(panelId)
      },

      splitDock: function (dockId, dir, side, ratio, opts) {
        // § 4.1 — seed new dock from active panel widget defaults.
        const seed = computeSplitSeed(tree.peek(), dockId)
        const r = EF.splitDock(tree.peek(), dockId, dir, side, ratio, { seedPanels: seed })
        tree.set(r.tree)
        return { newDockId: r.newDockId, newPanelId: r.newPanelId }
      },

      mergeDocks: function (winnerId, loserId) {
        const r = EF.mergeDocks(tree.peek(), winnerId, loserId)
        if (r.discardedPanels.some(function (p) { return p.dirty })) {
          const hook = layout.hooks.onDirtyDiscard
          const choice = hook ? hook(r.discardedPanels) : 'cancel'
          if (choice !== 'discard') return false
        }
        tree.set(r.tree)
        return true
      },
    }

    // Expose the runtime on the handle for interactions.js (private use).
    handle._runtime = layout
    return handle
  }

  // Compute seedPanels for a split — § 4.1: same widget as source's active
  // panel + that widget's defaults. Empty source dock → empty new dock.
  function computeSplitSeed(tree, srcDockId) {
    const f = EF.findDock(tree, srcDockId)
    if (!f || !f.node.activeId) return null
    const active = f.node.panels.find(function (p) { return p.id === f.node.activeId })
    if (!active) return null
    const defaults = EF.widgetDefaults(active.widget)
    return [Object.assign({}, defaults, { widget: active.widget })]
  }

  EF.createDockLayout = createDockLayout
  EF._dock = EF._dock || {}
  EF._dock.computeSplitSeed = computeSplitSeed
})(window.EF = window.EF || {})
