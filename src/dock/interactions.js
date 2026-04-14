// Dock interactions — splitter drag + corner drag (split / merge).
//
//   1. Splitter drag      → resizeAt
//   2. Corner drag inward → splitDock (new empty dock)
//   3. Corner drag outward to a sibling → mergeDocks
//
// Drag gestures mutate `flex` styles directly during the gesture and only
// commit to the signal on pointerup, so resizing never triggers reconcile.
;(function (EF) {
  'use strict'

  const findDock = EF.findDock
  const resizeAt = EF.resizeAt

  const DRAG_THRESHOLD = 6 // px

  // attachSplitterDrag / attachCornerDrag both receive the layout runtime
  // (not just the treeSig) so they can route split commits through
  // computeSplitSeed (§ 4.1) and merge commits through the dirty-aware
  // mergeDocks hook (§ 4.2).

  function attachSplitterDrag(splitter, splitEl, splitNode, splitPath, idx, layout) {
    const treeSig = layout.treeSig
    splitter.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return
      e.preventDefault()
      splitter.setPointerCapture(e.pointerId)
      splitter.classList.add('ef-splitter-active')
      document.body.classList.add('ef-dragging', 'ef-dragging-' + splitNode.direction)

      const isH = splitNode.direction === 'horizontal'
      const rect = splitEl.getBoundingClientRect()
      const total = isH ? rect.width : rect.height
      const start = isH ? e.clientX : e.clientY

      const wraps = splitEl.querySelectorAll(':scope > .ef-split-child')
      const a = wraps[idx], b = wraps[idx + 1]
      const sizes = splitNode.sizes.slice()
      const origA = sizes[idx], origB = sizes[idx + 1]
      const combined = origA + origB
      const min = combined * 0.04
      let committed = sizes

      function onMove(ev) {
        const delta = ((isH ? ev.clientX : ev.clientY) - start) / total
        let na = origA + delta, nb = origB - delta
        if (na < min) { na = min; nb = combined - na }
        if (nb < min) { nb = min; na = combined - nb }
        // ×100 — keep grow factors comfortably above the CSS Flex § 9.7.12.3
        // "sum of grows < 1 wastes free space" threshold. Must match render.js
        // createSplit so live drag and committed render use the same scale.
        a.style.flex = (na * 100) + ' 0 0'
        b.style.flex = (nb * 100) + ' 0 0'
        committed = sizes.slice()
        committed[idx] = na
        committed[idx + 1] = nb
      }

      function onUp() {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        document.body.classList.remove('ef-dragging', 'ef-dragging-horizontal', 'ef-dragging-vertical')
        treeSig.set(resizeAt(treeSig.peek(), splitPath, committed))
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    })
  }

  function attachCornerDrag(handle, dockId, corner, layout) {
    const treeSig = layout.treeSig
    handle.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()
      handle.setPointerCapture(e.pointerId)

      const rootEl = handle.closest('.ef-root')
      const dockEl = handle.closest('.ef-dock')
      const dockRect = dockEl.getBoundingClientRect()

      const overlay = document.createElement('div')
      overlay.className = 'ef-overlay'
      rootEl.appendChild(overlay)

      document.body.classList.add('ef-dragging')
      dockEl.classList.add('ef-dock-dragging')

      const startX = e.clientX, startY = e.clientY
      let mode = null
      let mergeTargetId = null
      let ratio = 0.5

      function onMove(ev) {
        const dx = ev.clientX - startX
        const dy = ev.clientY - startY
        if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) {
          overlay.style.display = 'none'
          mode = null
          return
        }

        const inside = ev.clientX >= dockRect.left && ev.clientX <= dockRect.right &&
                       ev.clientY >= dockRect.top  && ev.clientY <= dockRect.bottom

        if (inside) {
          const horizDominant = Math.abs(dx) > Math.abs(dy)
          overlay.style.display = 'block'
          overlay.className = 'ef-overlay ef-overlay-split'
          overlay.style.left   = dockRect.left   + 'px'
          overlay.style.top    = dockRect.top    + 'px'
          overlay.style.width  = dockRect.width  + 'px'
          overlay.style.height = dockRect.height + 'px'
          overlay.replaceChildren()

          if (horizDominant) {
            mode = 'split-h'
            const x = clamp(ev.clientX - dockRect.left, 0, dockRect.width)
            ratio = corner.charAt(1) === 'l'
              ? x / dockRect.width
              : (dockRect.width - x) / dockRect.width
            const line = document.createElement('div')
            line.className = 'ef-preview-line-v'
            line.style.left = x + 'px'
            overlay.appendChild(line)
          } else {
            mode = 'split-v'
            const y = clamp(ev.clientY - dockRect.top, 0, dockRect.height)
            ratio = corner.charAt(0) === 't'
              ? y / dockRect.height
              : (dockRect.height - y) / dockRect.height
            const line = document.createElement('div')
            line.className = 'ef-preview-line-h'
            line.style.top = y + 'px'
            overlay.appendChild(line)
          }
        } else {
          const el = document.elementFromPoint(ev.clientX, ev.clientY)
          const targetDock = el && el.closest && el.closest('.ef-dock')
          if (targetDock && targetDock.dataset.dockId !== dockId &&
              canMergeInto(treeSig.peek(), dockId, targetDock.dataset.dockId)) {
            mode = 'merge'
            mergeTargetId = targetDock.dataset.dockId
            const r = targetDock.getBoundingClientRect()
            overlay.style.display = 'block'
            overlay.className = 'ef-overlay ef-overlay-merge'
            overlay.style.left   = r.left   + 'px'
            overlay.style.top    = r.top    + 'px'
            overlay.style.width  = r.width  + 'px'
            overlay.style.height = r.height + 'px'
            overlay.replaceChildren(makeMergeLabel())
          } else {
            mode = null
            overlay.style.display = 'none'
          }
        }
      }

      function onUp() {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('keydown', onKey)
        document.body.classList.remove('ef-dragging')
        dockEl.classList.remove('ef-dock-dragging')
        overlay.remove()
        if (!mode) return
        const t = treeSig.peek()
        if (mode === 'split-h') {
          const side = corner.charAt(1) === 'l' ? 'before' : 'after'
          const seed = EF._dock.computeSplitSeed(t, dockId)
          treeSig.set(EF.splitDock(t, dockId, 'horizontal', side, ratio, { seedPanels: seed }).tree)
        } else if (mode === 'split-v') {
          const side = corner.charAt(0) === 't' ? 'before' : 'after'
          const seed = EF._dock.computeSplitSeed(t, dockId)
          treeSig.set(EF.splitDock(t, dockId, 'vertical', side, ratio, { seedPanels: seed }).tree)
        } else if (mode === 'merge') {
          // § 4.2 dirty check via layout hook
          const r = EF.mergeDocks(t, dockId, mergeTargetId)
          let proceed = true
          if (r.discardedPanels.some(function (p) { return p.dirty })) {
            const hook = layout.hooks && layout.hooks.onDirtyDiscard
            const choice = hook ? hook(r.discardedPanels) : 'cancel'
            proceed = (choice === 'discard')
          }
          if (proceed) treeSig.set(r.tree)
        }
      }

      function onKey(ev) {
        if (ev.key === 'Escape') { mode = null; onUp() }
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('keydown', onKey)
    })
  }

  function canMergeInto(tree, sourceId, neighborId) {
    if (sourceId === neighborId) return false
    const a = findDock(tree, sourceId)
    const b = findDock(tree, neighborId)
    if (!a || !b) return false
    if (a.path.length !== b.path.length) return false
    for (let i = 0; i < a.path.length - 1; i++)
      if (a.path[i] !== b.path[i]) return false
    return true
  }

  function makeMergeLabel() {
    const el = document.createElement('div')
    el.className = 'ef-merge-label'
    el.textContent = 'Merge →'
    return el
  }

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v }

  // ── Panel drag (Phase 5) ────────────────────────────────────
  // Tab widgets call beginPanelDrag on pointerdown. We track threshold,
  // build a ghost, hit-test target docks AND target tab bars, gate by
  // accept, and on pointerup:
  //   • drop on a tab bar       → movePanel with dstIndex (reorder or
  //                                 cross-dock with specific insertion slot)
  //   • drop on a dock body     → movePanel without dstIndex (append)
  //   • drop outside any dock   → popOutPanel (Phase 6, if available)
  function beginPanelDrag(e, panelId, srcDockId, layout) {
    if (e.button !== 0) return
    e.preventDefault()
    const treeSig = layout.treeSig

    const srcFound = EF.findPanel(treeSig.peek(), panelId)
    if (!srcFound) return
    const label  = srcFound.panel.title || srcFound.panel.widget
    const widget = srcFound.panel.widget

    const startX = e.clientX, startY = e.clientY
    let dragging = false
    let ghost = null
    let lastDockEl = null         // highlighted dock (for drop-target/reject class)
    let lastIndicator = null      // drop-indicator element inside a tab bar
    let dropDockId = null         // resolved drop target dock id (null = reject / outside)
    let dropIndex  = null         // resolved insertion index (null = append)

    function clearHighlights() {
      if (lastDockEl) {
        lastDockEl.classList.remove('ef-drop-target', 'ef-drop-reject')
        lastDockEl = null
      }
      if (lastIndicator) {
        lastIndicator.remove()
        lastIndicator = null
      }
    }

    function onMove(ev) {
      const dx = ev.clientX - startX, dy = ev.clientY - startY
      if (!dragging) {
        if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return
        dragging = true
        ghost = makeGhost(label)
        document.body.appendChild(ghost)
        document.body.classList.add('ef-dragging')
      }
      ghost.style.transform = 'translate(' + (ev.clientX + 8) + 'px,' + (ev.clientY + 8) + 'px)'

      clearHighlights()
      dropDockId = null
      dropIndex  = null

      const el = document.elementFromPoint(ev.clientX, ev.clientY)
      if (!el || !el.closest) return

      const dockEl = el.closest('.ef-dock')
      if (!dockEl) return
      const dstId = dockEl.dataset.dockId
      if (!dstId) return

      const dst = EF.findDock(treeSig.peek(), dstId)
      if (!dst) return
      const a = dst.node.accept
      const accepts = !a || a === '*' || (Array.isArray(a) && a.indexOf(widget) >= 0)

      // Same-dock drop on plain dock body (not on tab bar) is a no-op —
      // we don't paint anything and dropIndex stays null so pointerup does
      // nothing. Reorder only happens when the pointer is on a tab bar.
      if (!accepts) {
        dockEl.classList.add('ef-drop-reject')
        lastDockEl = dockEl
        return
      }

      // Is the pointer inside a tab bar? If yes, compute an insertion index
      // and paint a drop indicator between the two nearest tab buttons.
      const tabsEl = el.closest('.ef-tabs')
      if (tabsEl && dockEl.contains(tabsEl)) {
        const idx = computeTabInsertionIndex(tabsEl, ev.clientX, ev.clientY, panelId)
        dropDockId = dstId
        dropIndex  = idx
        lastIndicator = makeDropIndicator(tabsEl, idx)
        if (dstId !== srcDockId) {
          dockEl.classList.add('ef-drop-target')
          lastDockEl = dockEl
        }
        return
      }

      // On dock body (not tabs) — only cross-dock moves get the big highlight.
      if (dstId !== srcDockId) {
        dockEl.classList.add('ef-drop-target')
        lastDockEl = dockEl
        dropDockId = dstId
        dropIndex  = null   // append
      }
    }

    function cleanup() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('keydown', onKey)
      document.body.classList.remove('ef-dragging')
      if (ghost) ghost.remove()
      clearHighlights()
    }

    function onUp(ev) {
      const resolvedDock  = dropDockId
      const resolvedIndex = dropIndex
      const wasDragging   = dragging
      cleanup()
      if (!wasDragging) return

      if (resolvedDock) {
        // Skip same-dock no-op reorders. computeTabInsertionIndex already
        // filters out the dragging tab, so its returned index is in the
        // post-removal list. A reorder is a no-op iff that slot coincides
        // with the panel's original position in the post-removal list,
        // which equals its original `oldIdx` (everything at/after oldIdx
        // shifts down by 1 → insert at oldIdx puts it right back).
        if (resolvedDock === srcDockId && resolvedIndex != null) {
          const srcDock = EF.findDock(treeSig.peek(), srcDockId).node
          const oldIdx = srcDock.panels.findIndex(function (p) { return p.id === panelId })
          if (resolvedIndex === oldIdx) return
        }
        try {
          treeSig.set(EF.movePanel(treeSig.peek(), panelId, resolvedDock, resolvedIndex))
          layout.markActivation(panelId)
        } catch (err) {
          EF.reportError({ scope: 'global' }, err)
        }
        return
      }

      // Dropped outside any accepting dock — pop out into a new window if
      // the pointer also left the original dock entirely.
      const el = document.elementFromPoint(ev.clientX, ev.clientY)
      const anyDock = el && el.closest && el.closest('.ef-dock')
      if (!anyDock && EF._dock.popOutPanel) {
        EF._dock.popOutPanel(panelId, layout, ev.screenX, ev.screenY)
      }
    }

    function onKey(ev) { if (ev.key === 'Escape') { dragging = false; cleanup() } }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('keydown', onKey)
  }

  // Find which gap between existing tabs the pointer falls into. Works for
  // both horizontal and vertical tab strips. The returned index is the slot
  // in the POST-REMOVAL list (with draggingPanelId filtered out) — that's
  // exactly what EF.movePanel's dstIndex means, so no further adjustment
  // is needed at the call site.
  function computeTabInsertionIndex(tabsEl, clientX, clientY, draggingPanelId) {
    const vertical = tabsEl.classList.contains('ef-tabs-vertical')
    const tabs = tabsEl.querySelectorAll(':scope > .ef-tab')
    let idx = 0
    for (let i = 0; i < tabs.length; i++) {
      if (tabs[i].dataset.panelId === draggingPanelId) continue
      const r = tabs[i].getBoundingClientRect()
      const mid = vertical ? (r.top + r.bottom) / 2 : (r.left + r.right) / 2
      const pos = vertical ? clientY : clientX
      if (pos < mid) return idx
      idx++
    }
    return idx
  }

  // Build a short accent bar between two tabs (or before/after the whole
  // strip) to visualise the insertion slot. Positioned absolutely inside
  // the tabs element (which is position:relative per widget.css).
  function makeDropIndicator(tabsEl, index) {
    const vertical = tabsEl.classList.contains('ef-tabs-vertical')
    const ind = document.createElement('div')
    ind.className = 'ef-tab-drop-indicator'
    const tabs = tabsEl.querySelectorAll(':scope > .ef-tab')
    const barRect = tabsEl.getBoundingClientRect()

    let edge
    if (tabs.length === 0) {
      edge = vertical ? 0 : 0
    } else if (index >= tabs.length) {
      const r = tabs[tabs.length - 1].getBoundingClientRect()
      edge = vertical ? (r.bottom - barRect.top) : (r.right - barRect.left)
    } else {
      const r = tabs[index].getBoundingClientRect()
      edge = vertical ? (r.top - barRect.top) : (r.left - barRect.left)
    }

    if (vertical) {
      ind.style.left   = '2px'
      ind.style.right  = '2px'
      ind.style.top    = (edge - 1) + 'px'
      ind.style.height = '2px'
    } else {
      ind.style.top    = '2px'
      ind.style.bottom = '2px'
      ind.style.left   = (edge - 1) + 'px'
      ind.style.width  = '2px'
    }
    tabsEl.appendChild(ind)
    return ind
  }

  function makeGhost(label) {
    const g = document.createElement('div')
    g.className = 'ef-drag-ghost'
    g.textContent = label
    return g
  }

  EF._dock = EF._dock || {}
  EF._dock.attachSplitterDrag = attachSplitterDrag
  EF._dock.attachCornerDrag   = attachCornerDrag
  EF._dock.beginPanelDrag     = beginPanelDrag
})(window.EF = window.EF || {})
