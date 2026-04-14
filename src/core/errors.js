// Global error handling — single source of truth for all framework errors.
//
//   EF.errors          : signal<ErrorEntry[]>
//   EF.reportError(src, err)
//   EF.dismissError(id)
//   EF.clearErrors()
//   EF.safeCall(src, fn) : runs fn synchronously, routes throws, returns null
//
// ErrorEntry = { id, time, source, error, message, stack }
// source     = { scope: 'widget'|'global'|'bus'|..., dockId?, panelId?, widget?, topic? }
//
// The window 'error' / 'unhandledrejection' listeners are NOT installed here.
// They live in dock/layout.js and are attached once on the first
// createDockLayout() call (§ 4.7). This file is pure data; it must not touch
// window globals so it can be loaded in tests / non-DOM contexts.
;(function (EF) {
  'use strict'

  const errors = EF.signal([])
  let _nextId = 1

  function reportError(source, err) {
    const entry = {
      id:      'err-' + (_nextId++),
      time:    Date.now(),
      source:  source || { scope: 'unknown' },
      error:   err,
      message: (err && err.message) || String(err),
      stack:   (err && err.stack)   || null,
    }
    errors.update(function (list) { return list.concat([entry]) })
    return entry
  }

  function dismissError(id) {
    errors.update(function (list) {
      return list.filter(function (e) { return e.id !== id })
    })
  }

  function clearErrors() {
    errors.set([])
  }

  // Synchronous try/catch wrapper. Async errors inside fn (setTimeout,
  // Promises, event handlers attached by fn) are NOT caught — those go
  // through the global window listeners installed in dock/layout.js.
  function safeCall(source, fn) {
    try { return fn() }
    catch (e) { reportError(source, e); return null }
  }

  EF.errors       = errors
  EF.reportError  = reportError
  EF.dismissError = dismissError
  EF.clearErrors  = clearErrors
  EF.safeCall     = safeCall
})(window.EF = window.EF || {})
