// EF.ui.propertyPanel — renders an object as a labeled form driven by a
// struct_def-shaped schema. This is the one spot in the UI layer that
// touches type_config: for each field it resolves the FieldDef, picks a
// renderer via ui.editorFor, and hands the row off to ui.structInput.
//
// opts:
//   value:     signal<object>                                required
//   schema:    signal<struct_def> | struct_def                either is fine
//              — the plain form is wrapped once and never updates.
//   onChange?: (fname, newValue, nextObject) => void
//              if omitted, edits write directly into `value`.
//   ctx?:      any                                            forwarded to editors
//
// Schema changes (rare) rebuild the rows. Value changes (frequent) flow
// through per-slot derived signals inside structInput — the row DOM,
// pointer captures, focus, and in-flight edits survive untouched.
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.propertyPanel = function (opts) {
    const o = opts || {}
    if (!ui.isSignal(o.value)) throw new Error('ui.propertyPanel: `value` must be a signal')
    const value     = o.value
    const schemaSig = ui.isSignal(o.schema) ? o.schema : EF.signal(o.schema || {})
    const onChange  = typeof o.onChange === 'function' ? o.onChange : null
    const ctx       = o.ctx

    const root = ui.h('div', 'ef-ui-property-panel')
    let current = null

    const stopSchema = EF.effect(function () {
      const schema = schemaSig() || {}
      EF.untracked(function () {
        if (current) ui.dispose(current)
        const fields = Object.keys(schema).map(function (fname) {
          const raw   = schema[fname]
          const subFd = ui.resolveFieldDef(typeof raw === 'string' ? { type: raw } : raw)
          return {
            key:    fname,
            label:  fname,
            editor: function (sig, write, innerCtx) { return ui.editorFor(subFd, sig, write, innerCtx) },
          }
        })
        current = ui.structInput({
          value:    value,
          fields:   fields,
          onChange: onChange ? function (next, key, nv) { onChange(key, nv, next) } : null,
          ctx:      ctx,
        })
        root.appendChild(current)
      })
    })
    ui.collect(root, stopSchema)
    ui.collect(root, function () { if (current) ui.dispose(current) })

    return root
  }
})(window.EF = window.EF || {})
