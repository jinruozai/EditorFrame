// Minimal reactive core — signal / effect / batch / onCleanup.
// Exposed on the global EF namespace. No imports, no modules.
;(function (EF) {
  'use strict'

  let currentEffect = null
  let batchDepth = 0
  const pending = new Set()

  function signal(initial) {
    let value = initial
    const subs = new Set()
    const read = function () {
      if (currentEffect) { subs.add(currentEffect); currentEffect.deps.add(subs) }
      return value
    }
    read.set = function (v) {
      if (Object.is(v, value)) return
      value = v
      const list = Array.from(subs)
      for (let i = 0; i < list.length; i++) schedule(list[i])
    }
    read.update = function (fn) { read.set(fn(value)) }
    read.peek = function () { return value }
    return read
  }

  function schedule(eff) {
    if (eff.disposed) return
    if (batchDepth > 0) pending.add(eff)
    else run(eff)
  }

  function run(eff) {
    if (eff.disposed) return
    eff.deps.forEach(function (s) { s.delete(eff) })
    eff.deps.clear()
    for (let i = 0; i < eff.cleanups.length; i++) {
      try { eff.cleanups[i]() } catch (e) { console.error(e) }
    }
    eff.cleanups = []
    const prev = currentEffect
    currentEffect = eff
    try { eff.fn() } finally { currentEffect = prev }
  }

  function effect(fn) {
    const eff = { fn: fn, deps: new Set(), cleanups: [], disposed: false }
    run(eff)
    return function dispose() {
      eff.disposed = true
      eff.deps.forEach(function (s) { s.delete(eff) })
      eff.deps.clear()
      for (let i = 0; i < eff.cleanups.length; i++) {
        try { eff.cleanups[i]() } catch (e) {}
      }
    }
  }

  function onCleanup(fn) {
    if (currentEffect) currentEffect.cleanups.push(fn)
  }

  function batch(fn) {
    batchDepth++
    try { fn() } finally {
      if (--batchDepth === 0) {
        const list = Array.from(pending); pending.clear()
        for (let i = 0; i < list.length; i++) run(list[i])
      }
    }
  }

  EF.signal = signal
  EF.effect = effect
  EF.onCleanup = onCleanup
  EF.batch = batch
})(window.EF = window.EF || {})
