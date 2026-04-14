// EF.bus — global pub/sub for decoupled panel/dock/widget communication.
//
//   EF.bus.on(topic, handler)  → unsubscribe fn
//   EF.bus.off(topic, handler)
//   EF.bus.emit(topic, payload)
//
// Handlers fire synchronously. Each handler is wrapped individually so a
// throw in one subscriber routes to EF.errors but does NOT abort the rest of
// the emit (§ 4.15 — error isolation across mutually distrustful widgets).
//
// Auto-unsubscribe is NOT done here; it lives in widgets/context.js where
// the WidgetContext factory has access to the runtime's `cleanups` array.
// Calling EF.bus.on directly (without ctx.bus) gives no auto-unsubscribe —
// the caller manages the returned fn themselves.
;(function (EF) {
  'use strict'

  const topics = new Map() // topic → Set<handler>

  function on(topic, handler) {
    let set = topics.get(topic)
    if (!set) { set = new Set(); topics.set(topic, set) }
    set.add(handler)
    return function unsubscribe() { off(topic, handler) }
  }

  function off(topic, handler) {
    const set = topics.get(topic)
    if (!set) return
    set.delete(handler)
    if (set.size === 0) topics.delete(topic)
  }

  function emit(topic, payload) {
    const set = topics.get(topic)
    if (!set) return
    // Snapshot before iteration: handlers may unsubscribe themselves.
    const list = Array.from(set)
    for (let i = 0; i < list.length; i++) {
      EF.safeCall({ scope: 'bus', topic: topic }, function () { list[i](payload) })
    }
  }

  EF.bus = { on: on, off: off, emit: emit }
})(window.EF = window.EF || {})
