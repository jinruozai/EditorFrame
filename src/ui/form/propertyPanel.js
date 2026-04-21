// EF.ui.propertyPanel — renders an entire object as a labeled form from a
// StructDef-like schema. One row per field: [label] [editor]. Use inside
// Inspector-style panels where you want "declare the schema, get the UI".
//
// opts:
//   schema   : { [fieldName]: FieldDef }   required
//   value    : signal<object>              the backing record
//   onChange?: (fieldName, newValue, nextFullRecord) => void
//   ctx?     : free-form context forwarded to propertyEditor (used by
//              user-registered renderers for scope-dependent behavior, e.g.
//              cross-table navigation on ref_id).
//   header?  : HTMLElement | null          rendered above the rows
//   emptyMsg?: string                      shown when schema has zero fields
//
// `value` must be a signal whose current value is a plain object. On edit,
// propertyPanel computes the next record, calls onChange (if provided), and
// — if onChange is omitted — writes to the signal itself.
//
// The widget observes `value` and `schema` via effects so changing either
// rebuilds the rows. Field identity is not stable across rebuilds; if you
// expect frequent value churn (e.g. real-time replication), consider keeping
// propertyPanel mounted only while one record is selected.
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  ui.propertyPanel = function (opts) {
    const o = opts || {}
    const valueSig = (o.value && typeof o.value === 'function' && typeof o.value.peek === 'function')
      ? o.value
      : EF.signal(o.value || {})
    const schemaSig = (o.schema && typeof o.schema === 'function' && typeof o.schema.peek === 'function')
      ? o.schema
      : EF.signal(o.schema || {})

    const root = ui.h('div', 'ef-ui-prop-panel')
    if (o.header) root.appendChild(o.header)
    const rows = ui.h('div', 'ef-ui-prop-panel-rows')
    root.appendChild(rows)

    function writeField(fname, nv) {
      const cur = valueSig.peek() || {}
      const next = Object.assign({}, cur)
      next[fname] = nv
      if (typeof o.onChange === 'function') {
        o.onChange(fname, nv, next)
      } else if (typeof valueSig.set === 'function') {
        valueSig.set(next)
      }
    }

    function rebuild() {
      rows.innerHTML = ''
      const schema = schemaSig() || {}
      const value  = valueSig() || {}
      const keys = Object.keys(schema)
      if (keys.length === 0) {
        if (o.emptyMsg) rows.appendChild(ui.h('div', 'ef-ui-prop-panel-empty', { text: o.emptyMsg }))
        return
      }
      keys.forEach(function (fname) {
        const fd = schema[fname]
        const resolved = ui.resolveFieldDef(fd)
        const row = ui.h('div', 'ef-ui-prop-row')
        const label = ui.h('div', 'ef-ui-prop-label', {
          title: (resolved && resolved.mem) || fname,
          text:  (resolved && resolved.name && resolved.name !== resolved.base_type)
                  ? (fname + ' · ' + resolved.name) : fname,
        })
        const cell = ui.h('div', 'ef-ui-prop-cell')
        const editor = ui.propertyEditor(resolved, value[fname], function (nv) { writeField(fname, nv) }, o.ctx || {})
        cell.appendChild(editor)
        row.appendChild(label); row.appendChild(cell)
        rows.appendChild(row)
      })
    }

    EF.effect(function () { schemaSig(); valueSig(); rebuild() })
    return root
  }
})(window.EF = window.EF || {})
