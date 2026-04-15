// Global logging + error handling — single source of truth for all framework
// messages (info/warn/debug/error).
//
//   EF.logs                    : signal<LogEntry[]>      all levels
//   EF.errors                  : derived<LogEntry[]>     level === 'error' subset
//   EF.log(level, source, msg) : push any-level entry
//   EF.reportError(source, err): convenience for level='error'
//   EF.dismissLog(id)          : remove one entry
//   EF.clearLogs()             : clear all
//   EF.safeCall(source, fn)    : runs fn synchronously, routes throws
//
//   // Back-compat aliases (older code used these):
//   EF.dismissError = EF.dismissLog
//   EF.clearErrors  = EF.clearLogs
//
// LogEntry = { id, time, level, source, message, error?, stack? }
// level    = 'error' | 'warn' | 'info' | 'debug'
// source   = { scope: 'widget'|'global'|'bus'|..., dockId?, panelId?, widget?, topic? }
//
// The window 'error' / 'unhandledrejection' listeners are NOT installed here —
// they live in dock/layout.js and attach on first createDockLayout() (§ 4.7).
// This file is pure data and must not touch window globals.
;(function (EF) {
  'use strict'

  const logs = EF.signal([])
  let _nextId = 1

  function log(level, source, msg, err) {
    const entry = {
      id:      'log-' + (_nextId++),
      time:    Date.now(),
      level:   level || 'info',
      source:  source || { scope: 'unknown' },
      message: msg != null ? String(msg) : ((err && err.message) || ''),
      error:   err || null,
      stack:   (err && err.stack) || null,
    }
    logs.update(function (list) { return list.concat([entry]) })
    return entry
  }

  function reportError(source, err) {
    return log('error', source, (err && err.message) || String(err), err)
  }

  function dismissLog(id) {
    logs.update(function (list) {
      return list.filter(function (e) { return e.id !== id })
    })
  }

  function clearLogs() { logs.set([]) }

  // Synchronous try/catch wrapper. Async errors inside fn (setTimeout,
  // Promises, event handlers attached by fn) are NOT caught — those go
  // through the global window listeners installed in dock/layout.js.
  function safeCall(source, fn) {
    try { return fn() }
    catch (e) { reportError(source, e); return null }
  }

  // Derived projection: errors = logs where level === 'error'. Existing
  // callers that bind to EF.errors keep working with no change.
  const errors = EF.derived(function () {
    return logs().filter(function (e) { return e.level === 'error' })
  })

  EF.logs         = logs
  EF.errors       = errors
  EF.log          = log
  EF.reportError  = reportError
  EF.dismissLog   = dismissLog
  EF.clearLogs    = clearLogs
  EF.safeCall     = safeCall

  // Back-compat aliases.
  EF.dismissError = dismissLog
  EF.clearErrors  = clearLogs
})(window.EF = window.EF || {})
