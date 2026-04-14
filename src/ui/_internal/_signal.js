// UI library — signal helper.
//
// All input widgets in EF.ui take a caller-owned signal as `value`. This file
// provides three small helpers that every widget reuses:
//
//   asSig(v)             → returns v if it's a signal, or wraps a constant
//   bind(el, sig, fn)    → run fn(value) immediately + every time sig changes;
//                          auto-cleanup is registered on el.__efCleanups
//   collect(el, fn)      → push a cleanup callback onto el.__efCleanups
//
// Cleanup model: every widget root element grows an `__efCleanups: fn[]`
// array. EF.ui.dispose(el) runs them in reverse order and removes el from
// its parent. Callers that mount UI widgets inside a framework panel should
// call ctx.onCleanup(() => EF.ui.dispose(el)) so cleanups fire when the
// panel is removed.
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  function isSignal(v) {
    return typeof v === 'function' && typeof v.peek === 'function' && typeof v.set === 'function'
  }
  ui.isSignal = isSignal

  function asSig(v) {
    if (isSignal(v)) return v
    return EF.signal(v)
  }
  ui.asSig = asSig

  function collect(el, fn) {
    if (!el.__efCleanups) el.__efCleanups = []
    el.__efCleanups.push(fn)
  }
  ui.collect = collect

  // bind(el, sig, fn): runs fn(sig()) once + on every change; cleanup auto.
  function bind(el, sig, fn) {
    const stop = EF.effect(function () { fn(sig()) })
    collect(el, stop)
    return stop
  }
  ui.bind = bind

  // dispose: run all cleanups in reverse, then detach.
  ui.dispose = function (el) {
    if (!el) return
    const list = el.__efCleanups
    if (list) {
      for (let i = list.length - 1; i >= 0; i--) {
        try { list[i]() } catch (e) { console.error('[ef.ui] cleanup error', e) }
      }
      el.__efCleanups = null
    }
    if (el.parentNode) el.parentNode.removeChild(el)
  }

  // tiny element helper — keeps widget files terse.
  ui.h = function (tag, cls, attrs) {
    const el = document.createElement(tag)
    if (cls) el.className = cls
    if (attrs) for (const k in attrs) {
      if (k === 'text') el.textContent = attrs[k]
      else if (k === 'html') el.innerHTML = attrs[k]
      else if (k === 'style') el.style.cssText = attrs[k]
      else if (k.charCodeAt(0) === 111 && k.charCodeAt(1) === 110) el[k.toLowerCase()] = attrs[k] // onClick etc.
      else el.setAttribute(k, attrs[k])
    }
    return el
  }
})(window.EF = window.EF || {})
