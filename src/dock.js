// Dock renderer + Blender-style interactions.
//
// Three interactions, mapped 1:1 to tree ops:
//   1. Splitter drag      → resizeAt
//   2. Corner drag inward → splitDock
//   3. Corner drag outward→ mergeDocks
//
// Rendering: keyed reconciliation by dock id.
//   On every tree commit, we walk the new tree and rebuild all SPLIT frames
//   (cheap structural divs) but REUSE every dock element whose id still
//   appears in the new tree. The dock's DOM, its event listeners, AND the
//   user-supplied panel content inside it are preserved across split / merge
//   / resize / swap. That means a Monaco editor, a <video>, a <canvas>, or
//   any text input inside a panel keeps its full state when you rearrange
//   the layout. renderPanel() is called exactly once per dock id — the first
//   time that id appears.
//
// Drag interactions still mutate `flex` styles directly during the gesture
// and only commit to the signal on pointerup, so resizing never triggers
// reconciliation.
;(function (EF) {
  'use strict'

  const signal     = EF.signal
  const effect     = EF.effect
  const findDock   = EF.findDock
  const getAt      = EF.getAt
  const resizeAt   = EF.resizeAt
  const splitDock  = EF.splitDock
  const mergeDocks = EF.mergeDocks
  const makeDock   = EF.dock

  const CORNERS = ['tl', 'tr', 'bl', 'br']
  const DRAG_THRESHOLD = 6 // px

  function createDockLayout(container, initialTree, options) {
    options = options || {}
    const tree = signal(initialTree)
    // No default content — empty dock is genuinely empty. Caller decides.
    const renderPanel = options.renderPanel || function () { return document.createDocumentFragment() }

    container.classList.add('ef-root')

    effect(function () {
      const t = tree()
      reconcile(container, t, tree, renderPanel)
    })

    return {
      get tree() { return tree.peek() },
      setTree: function (t) { tree.set(t) },
      subscribe: function (fn) { return effect(function () { fn(tree()) }) },
      splitDock: function (id, dir, side, ratio) {
        tree.set(splitDock(tree.peek(), id, dir, side, ratio))
      },
      mergeDocks: function (a, b) { tree.set(mergeDocks(tree.peek(), a, b)) },
    }
  }

  // ─── rendering ───────────────────────────────────────────────

  // Snapshot every existing dock element by id, then rebuild the tree DOM.
  // Reused dock elements get moved (appendChild detaches automatically) into
  // their new wrapper. Anything in the old DOM that wasn't reused is dropped
  // by replaceChildren and GC'd.
  function reconcile(container, newTree, treeSig, renderPanel) {
    const oldDocks = new Map()
    const olds = container.querySelectorAll('.ef-dock')
    for (let i = 0; i < olds.length; i++) {
      oldDocks.set(olds[i].dataset.dockId, olds[i])
    }
    const root = build(newTree, [], oldDocks, treeSig, renderPanel)
    container.replaceChildren(root)
  }

  function build(node, path, oldDocks, treeSig, renderPanel) {
    if (node.type === 'dock') {
      const reused = oldDocks.get(node.id)
      if (reused) return reused          // ← keyed reuse: panel state survives
      return createDock(node, treeSig, renderPanel)
    }
    return createSplit(node, path, oldDocks, treeSig, renderPanel)
  }

  function createSplit(node, path, oldDocks, treeSig, renderPanel) {
    const el = document.createElement('div')
    el.className = 'ef-split ef-split-' + node.direction

    for (let i = 0; i < node.children.length; i++) {
      const wrap = document.createElement('div')
      wrap.className = 'ef-split-child'
      wrap.style.flex = node.sizes[i] + ' 0 0'
      wrap.appendChild(build(node.children[i], path.concat(i), oldDocks, treeSig, renderPanel))
      el.appendChild(wrap)

      if (i < node.children.length - 1) {
        const sp = document.createElement('div')
        sp.className = 'ef-splitter ef-splitter-' + node.direction
        attachSplitterDrag(sp, el, node, path, i, treeSig)
        el.appendChild(sp)
      }
    }
    return el
  }

  function createDock(node, treeSig, renderPanel) {
    const el = document.createElement('div')
    el.className = 'ef-dock'
    el.dataset.dockId = node.id

    const content = document.createElement('div')
    content.className = 'ef-dock-content'
    content.appendChild(renderPanel(node))
    el.appendChild(content)

    for (let i = 0; i < CORNERS.length; i++) {
      const c = CORNERS[i]
      const h = document.createElement('div')
      h.className = 'ef-corner ef-corner-' + c
      h.dataset.corner = c
      attachCornerDrag(h, node.id, c, treeSig)
      el.appendChild(h)
    }
    attachCornerHover(el)
    return el
  }

  // Show only the corner whose 3×3 grid cell the cursor is in (top-left,
  // top-right, bottom-left, bottom-right). Center / edge cells → no corner.
  function attachCornerHover(dockEl) {
    const CLS = ['ef-dock-c-tl', 'ef-dock-c-tr', 'ef-dock-c-bl', 'ef-dock-c-br']
    function clear() {
      for (let i = 0; i < CLS.length; i++) dockEl.classList.remove(CLS[i])
    }
    dockEl.addEventListener('pointermove', function (e) {
      const r = dockEl.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width
      const y = (e.clientY - r.top) / r.height
      const col = x < 1 / 3 ? 'l' : x > 2 / 3 ? 'r' : null
      const row = y < 1 / 3 ? 't' : y > 2 / 3 ? 'b' : null
      if (row && col) {
        const want = 'ef-dock-c-' + row + col
        if (!dockEl.classList.contains(want)) { clear(); dockEl.classList.add(want) }
      } else {
        clear()
      }
    })
    dockEl.addEventListener('pointerleave', clear)
  }

  // ─── splitter drag ───────────────────────────────────────────

  function attachSplitterDrag(splitter, splitEl, splitNode, splitPath, idx, treeSig) {
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
        a.style.flex = na + ' 0 0'
        b.style.flex = nb + ' 0 0'
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

  // ─── corner drag (split / merge) ─────────────────────────────

  function attachCornerDrag(handle, dockId, corner, treeSig) {
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
          treeSig.set(splitDock(t, dockId, 'horizontal', side, ratio, makeDock()))
        } else if (mode === 'split-v') {
          const side = corner.charAt(0) === 't' ? 'before' : 'after'
          treeSig.set(splitDock(t, dockId, 'vertical', side, ratio, makeDock()))
        } else if (mode === 'merge') {
          treeSig.set(mergeDocks(t, dockId, mergeTargetId))
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

  EF.createDockLayout = createDockLayout
})(window.EF = window.EF || {})
