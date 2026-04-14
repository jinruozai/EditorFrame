// Immutable N-ary split tree. Pure functions, structural sharing.
//
// Nodes:
//   { type: 'dock',  id, ...content }
//   { type: 'split', direction: 'horizontal'|'vertical', sizes: number[], children: Node[] }
//
// direction='horizontal' → children laid out left→right (flex row)
// direction='vertical'   → children laid out top→bottom (flex column)
;(function (EF) {
  'use strict'

  let _id = 1
  function nextId(prefix) { return (prefix || 'dock') + '-' + (_id++) }

  function dock(overrides) {
    overrides = overrides || {}
    return Object.assign({ type: 'dock', id: overrides.id || nextId() }, overrides)
  }

  function split(direction, children, sizes) {
    if (direction !== 'horizontal' && direction !== 'vertical')
      throw new Error('bad direction: ' + direction)
    if (!children || children.length < 1) throw new Error('split needs children')
    const n = children.length
    return {
      type: 'split',
      direction: direction,
      sizes: normalize(sizes || new Array(n).fill(1 / n)),
      children: children,
    }
  }

  function normalize(sizes) {
    let sum = 0
    for (let i = 0; i < sizes.length; i++) sum += sizes[i]
    if (sum === 0) sum = 1
    return sizes.map(function (s) { return s / sum })
  }

  // ─── navigation ────────────────────────────────────────────────

  function findDock(tree, id, path) {
    path = path || []
    if (tree.type === 'dock') return tree.id === id ? { node: tree, path: path } : null
    for (let i = 0; i < tree.children.length; i++) {
      const r = findDock(tree.children[i], id, path.concat(i))
      if (r) return r
    }
    return null
  }

  function getAt(tree, path) {
    let node = tree
    for (let i = 0; i < path.length; i++) {
      if (node.type !== 'split') return null
      node = node.children[path[i]]
    }
    return node
  }

  // ─── mutation (pure) ───────────────────────────────────────────

  function replaceAt(tree, path, newNode) {
    if (path.length === 0) return newNode
    if (tree.type !== 'split') throw new Error('replaceAt: bad path')
    const i = path[0]
    const rest = path.slice(1)
    const children = tree.children.slice()
    children[i] = replaceAt(tree.children[i], rest, newNode)
    return Object.assign({}, tree, { children: children })
  }

  function removeAt(tree, path) {
    if (path.length === 0) return null
    if (path.length === 1) {
      if (tree.type !== 'split') throw new Error('removeAt: bad path')
      const idx = path[0]
      const children = tree.children.filter(function (_, i) { return i !== idx })
      const sizes = normalize(tree.sizes.filter(function (_, i) { return i !== idx }))
      if (children.length === 0) return null
      if (children.length === 1) return children[0]
      return Object.assign({}, tree, { children: children, sizes: sizes })
    }
    const i = path[0]
    const rest = path.slice(1)
    const newChild = removeAt(tree.children[i], rest)
    if (newChild === null) return removeAt(tree, [i])
    const children = tree.children.slice()
    children[i] = newChild
    return Object.assign({}, tree, { children: children })
  }

  function resizeAt(tree, path, newSizes) {
    const node = getAt(tree, path)
    if (!node || node.type !== 'split') return tree
    return replaceAt(tree, path, Object.assign({}, node, { sizes: normalize(newSizes) }))
  }

  // Split a dock — insert a new dock before/after along `direction`.
  // If parent is already a split with the same direction, inserts into
  // its children flatly. Otherwise wraps the dock in a new split.
  //   side  : 'before' | 'after' — where the NEW dock goes
  //   ratio : fraction (0..1) of the NEW dock
  function splitDock(tree, dockId, direction, side, ratio, newDock) {
    const found = findDock(tree, dockId)
    if (!found) return tree
    newDock = newDock || dock()
    ratio = Math.max(0.05, Math.min(0.95, ratio))

    const parentPath = found.path.slice(0, -1)
    const parent = parentPath.length === 0 ? null : getAt(tree, parentPath)
    const childIdx = found.path[found.path.length - 1]

    // Flat insert into existing same-direction parent split
    if (parent && parent.type === 'split' && parent.direction === direction) {
      const children = parent.children.slice()
      const sizes = parent.sizes.slice()
      const origSize = sizes[childIdx]
      const newSize = origSize * ratio
      sizes[childIdx] = origSize - newSize
      const insertAt = side === 'before' ? childIdx : childIdx + 1
      children.splice(insertAt, 0, newDock)
      sizes.splice(insertAt, 0, newSize)
      return replaceAt(tree, parentPath,
        Object.assign({}, parent, { children: children, sizes: normalize(sizes) }))
    }

    // Wrap in a new split
    const children = side === 'before' ? [newDock, found.node] : [found.node, newDock]
    const sizes = side === 'before' ? [ratio, 1 - ratio] : [1 - ratio, ratio]
    return replaceAt(tree, found.path,
      { type: 'split', direction: direction, children: children, sizes: sizes })
  }

  // Merge `neighborId` into `sourceId`. Source absorbs the neighbor's size.
  // Only valid when the two are direct siblings in the same split.
  function mergeDocks(tree, sourceId, neighborId) {
    if (sourceId === neighborId) return tree
    const src = findDock(tree, sourceId)
    const nbr = findDock(tree, neighborId)
    if (!src || !nbr) return tree

    const srcParent = src.path.slice(0, -1)
    const nbrParent = nbr.path.slice(0, -1)
    if (srcParent.length !== nbrParent.length) return tree
    for (let i = 0; i < srcParent.length; i++)
      if (srcParent[i] !== nbrParent[i]) return tree

    const parent = srcParent.length === 0 ? tree : getAt(tree, srcParent)
    if (!parent || parent.type !== 'split') return tree

    const srcIdx = src.path[src.path.length - 1]
    const nbrIdx = nbr.path[nbr.path.length - 1]
    const children = parent.children.slice()
    const sizes = parent.sizes.slice()
    sizes[srcIdx] += sizes[nbrIdx]
    children.splice(nbrIdx, 1)
    sizes.splice(nbrIdx, 1)

    if (children.length === 1) return replaceAt(tree, srcParent, children[0])
    return replaceAt(tree, srcParent,
      Object.assign({}, parent, { children: children, sizes: normalize(sizes) }))
  }

  function swapDocks(tree, idA, idB) {
    if (idA === idB) return tree
    const a = findDock(tree, idA)
    const b = findDock(tree, idB)
    if (!a || !b) return tree
    const t1 = replaceAt(tree, a.path, b.node)
    return replaceAt(t1, b.path, a.node)
  }

  EF.nextId     = nextId
  EF.dock       = dock
  EF.split      = split
  EF.findDock   = findDock
  EF.getAt      = getAt
  EF.replaceAt  = replaceAt
  EF.removeAt   = removeAt
  EF.resizeAt   = resizeAt
  EF.splitDock  = splitDock
  EF.mergeDocks = mergeDocks
  EF.swapDocks  = swapDocks
})(window.EF = window.EF || {})
