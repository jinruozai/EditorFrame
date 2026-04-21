// EF.ui.propertyEditor — dispatches a single field to its registered
// renderer and returns a DOM element.
//
//   EF.ui.propertyEditor(fieldDef, value, onChange, [ctx])
//     fieldDef: FieldDef (raw, unresolved) OR an already-resolved TypeDef
//     value   : current value (plain — propertyEditor wraps into a signal
//               internally) OR a signal<any> supplied by caller
//     onChange: (nv) => void   callback invoked when renderer commits
//     ctx?    : free-form context passed through to renderers (panel,
//               pathKey, entityId, etc.) — opaque to the framework
//
// Every renderer receives:
//   { fieldDef: ResolvedFieldDef, sig: signal<any>, write: (v)=>void, ctx }
// and must return an HTMLElement.
//
// Built-in renderers registered here (all delegate to EF.ui.*):
//   input_string | input_int | input_float | textarea | range | enum
//   | toggle | color | date | img | snd | id | ref_id | struct | array
;(function (EF) {
  'use strict'
  const ui = EF.ui = EF.ui || {}

  function propertyEditor(fieldDef, value, onChange, ctx) {
    // 1) Resolve the field against the TypeConfig.
    const resolved = fieldDef && fieldDef._resolved
      ? fieldDef
      : ui.resolveFieldDef(fieldDef || {})
    if (resolved) resolved._resolved = true

    // 2) Value → signal. Accept a signal directly (by reference), else wrap.
    const sig = (value && typeof value === 'function' && typeof value.peek === 'function')
      ? value
      : EF.signal(value)
    const write = function (nv) {
      if (typeof onChange === 'function') onChange(nv)
      else if (typeof sig.set === 'function') sig.set(nv)
    }

    const kind = (resolved && resolved.type_render) || 'input_string'
    const fn = ui.getRenderer(kind) || ui.getRenderer('input_string')
    return fn({ fieldDef: resolved, sig: sig, write: write, ctx: ctx || {} })
  }

  ui.propertyEditor = propertyEditor

  // ── Built-in renderers ───────────────────────────────────────
  // Each renderer is a thin adapter between ResolvedFieldDef + signal and
  // a ui.* primitive. They intentionally do NOT pull from `ctx` unless
  // specified; domain-specific behavior (ref_id cross-table navigation,
  // custom picker dialogs) lives in user-registered renderers.

  function asPlain(v) { return (v && typeof v === 'function' && typeof v.peek === 'function') ? v.peek() : v }

  ui.registerRenderer('input_string', function (args) {
    return ui.input({ value: args.sig, onChange: args.write })
  })
  ui.registerRenderer('textarea', function (args) {
    return ui.textarea({ value: args.sig, onChange: args.write })
  })
  // Numeric renderers need a sanitized value signal — numberInput's bind
  // effects run a clamp check on every mount, and `clamp(undefined)` yields
  // NaN which (NaN !== undefined) triggers a spurious doWrite feedback loop.
  // Wrap the caller's sig through a coerced signal so the numeric widget
  // always sees a finite number.
  function asNumericSig(sig, fallback) {
    const fb = fallback != null ? fallback : 0
    const tap = EF.signal(toNumOr(asPlain(sig), fb))
    EF.effect(function () { tap.set(toNumOr(asPlain(sig), fb)) })
    return tap
  }
  function toNumOr(v, fallback) {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
  }

  ui.registerRenderer('input_int', function (args) {
    const agv = args.fieldDef.type_agv || {}
    return ui.numberInput({
      value: asNumericSig(args.sig), onChange: args.write,
      step: 1, precision: 0,
      radix: agv.radix || 'dec',
    })
  })
  ui.registerRenderer('input_float', function (args) {
    const agv = args.fieldDef.type_agv || {}
    return ui.numberInput({
      value: asNumericSig(args.sig), onChange: args.write,
      step: agv.step != null ? agv.step : 0.01,
      precision: agv.decimal_places,
      percent: !!agv.percent,
    })
  })
  ui.registerRenderer('range', function (args) {
    const agv = args.fieldDef.type_agv || {}
    const isInt = args.fieldDef.base_type === 'int'
    const min = agv.min != null ? agv.min : 0
    return ui.slider({
      value: asNumericSig(args.sig, min), onChange: function (v) { args.write(isInt ? Math.trunc(v) : v) },
      min: min,
      max: agv.max != null ? agv.max : 100,
      step: agv.step != null ? agv.step : (isInt ? 1 : 0.01),
      showValue: true,
    })
  })
  ui.registerRenderer('enum', function (args) {
    const agv = args.fieldDef.type_agv || {}
    const options = normEnumOptions(agv.options)
    const isInt = args.fieldDef.base_type === 'int'
    return ui.select({
      value: args.sig,
      onChange: function (v) { args.write(isInt ? Number(v) : v) },
      options: options,
    })
  })
  ui.registerRenderer('toggle', function (args) {
    const isInt = args.fieldDef.base_type === 'int'
    // Normalize: external storage may be 0/1 OR true/false.
    const shimSig = EF.signal(!!asPlain(args.sig))
    // Bridge: sig → shim (on read), shim → sig (on write).
    EF.effect(function () { shimSig.set(!!asPlain(args.sig)) })
    return ui.switch({
      value: shimSig,
      onChange: function (v) { args.write(isInt ? (v ? 1 : 0) : !!v) },
    })
  })
  ui.registerRenderer('color', function (args) {
    const agv = args.fieldDef.type_agv || {}
    return ui.colorInput({
      value:     args.sig,
      onChange:  args.write,
      valueKind: agv.valueKind || (args.fieldDef.base_type === 'int' ? 'int' : 'hex'),
    })
  })
  ui.registerRenderer('date', function (args) {
    return ui.dateInput({ value: args.sig, onChange: args.write })
  })
  ui.registerRenderer('img', function (args) {
    const agv = args.fieldDef.type_agv || {}
    return ui.assetPicker({
      value:    args.sig,
      onChange: args.write,
      kind:     'image',
      accept:   agv.accept || '.png,.jpg,.jpeg,.gif,.webp',
      placeholder: agv.placeholder || agv.suffix || '',
    })
  })
  ui.registerRenderer('snd', function (args) {
    const agv = args.fieldDef.type_agv || {}
    return ui.assetPicker({
      value:    args.sig,
      onChange: args.write,
      kind:     'audio',
      accept:   agv.accept || '.mp3,.wav,.ogg',
      placeholder: agv.placeholder || agv.suffix || '',
    })
  })
  ui.registerRenderer('id', function (args) {
    return ui.input({ value: args.sig, readOnly: true })
  })
  ui.registerRenderer('ref_id', function (args) {
    // Default ref_id behavior: plain int input, no cross-table jump — apps
    // that know about table topology should override this renderer.
    return ui.numberInput({ value: args.sig, onChange: args.write, step: 1, precision: 0 })
  })

  // ── Struct renderer ──────────────────────────────────────────
  ui.registerRenderer('struct', function (args) {
    const wrap = ui.h('div', 'ef-ui-struct')
    let def = args.fieldDef.struct_def
    // Accept two shapes for struct_def:
    //   { field1: typeName, field2: typeName }                          (flat)
    //   { wrapperKey: { field1: typeName, field2: typeName } }           (nested)
    if (def && typeof def === 'object') {
      const keys = Object.keys(def)
      if (keys.length === 1 && def[keys[0]] && typeof def[keys[0]] === 'object') {
        const inner = def[keys[0]]
        const allString = Object.keys(inner).every(function (k) { return typeof inner[k] === 'string' })
        if (allString) {
          const norm = {}
          Object.keys(inner).forEach(function (k) { norm[k] = { type: inner[k] } })
          def = norm
        } else {
          def = inner
        }
      }
    }
    if (!def) { wrap.textContent = '(invalid struct_def)'; return wrap }

    const curr = asPlain(args.sig)
    const isArr = Array.isArray(curr)
    const fields = Object.keys(def)
    fields.forEach(function (fname, idx) {
      const sub = def[fname]
      const subFd = typeof sub === 'string' ? { type: sub } : sub
      const resolved = ui.resolveFieldDef(subFd)
      let subVal = isArr ? (curr || [])[idx] : (curr && curr[fname])
      if (subVal === undefined && resolved) subVal = resolved.default

      const row = ui.h('div', 'ef-ui-struct-row')
      row.appendChild(ui.h('span', 'ef-ui-struct-label', {
        text: (resolved && resolved.name && resolved.name !== resolved.base_type) ? resolved.name : fname,
      }))
      const cell = ui.h('div', 'ef-ui-struct-cell')
      cell.appendChild(propertyEditor(resolved, subVal, function (nv) {
        let next
        if (isArr) { next = (curr || []).slice(); next[idx] = nv }
        else       { next = Object.assign({}, curr || {}); next[fname] = nv }
        args.write(next)
      }, args.ctx))
      row.appendChild(cell)
      wrap.appendChild(row)
    })
    return wrap
  })

  // ── Array renderer ───────────────────────────────────────────
  ui.registerRenderer('array', function (args) {
    const wrap = ui.h('div', 'ef-ui-array')
    const arr = Array.isArray(asPlain(args.sig)) ? asPlain(args.sig).slice() : []
    const agv = args.fieldDef.type_agv || {}
    const elemType = agv.elem_type || parseArrayElemType(args.fieldDef.type) || 'var'
    const elemFd = ui.resolveFieldDef({ type: elemType })

    const list = ui.h('div', 'ef-ui-array-items')
    arr.forEach(function (item, idx) {
      const row = ui.h('div', 'ef-ui-array-row')
      row.appendChild(ui.h('span', 'ef-ui-array-index', { text: '[' + idx + ']' }))
      const cell = ui.h('div', 'ef-ui-array-cell')
      cell.appendChild(propertyEditor(elemFd, item, function (nv) {
        const next = arr.slice(); next[idx] = nv; args.write(next)
      }, args.ctx))
      row.appendChild(cell)
      const del = ui.iconButton({
        icon: 'x', title: 'Remove', size: 'sm',
        onClick: function () { const next = arr.slice(); next.splice(idx, 1); args.write(next) },
      })
      row.appendChild(del)
      list.appendChild(row)
    })
    wrap.appendChild(list)
    const addBtn = ui.button({
      text: '+ Add', kind: 'ghost', size: 'sm',
      onClick: function () {
        const seed = elemFd && elemFd.default !== undefined
          ? JSON.parse(JSON.stringify(elemFd.default))
          : null
        args.write(arr.concat([seed]))
      },
    })
    addBtn.classList.add('ef-ui-array-add')
    wrap.appendChild(addBtn)
    return wrap
  })

  // ── helpers ──────────────────────────────────────────────────
  function normEnumOptions(opts) {
    if (!opts) return []
    if (Array.isArray(opts)) {
      return opts.map(function (o) {
        if (o == null) return null
        if (typeof o === 'object') return { value: o.value, label: o.label != null ? o.label : String(o.value) }
        return { value: o, label: String(o) }
      }).filter(Boolean)
    }
    return Object.keys(opts).map(function (k) {
      const raw = opts[k]
      if (raw && typeof raw === 'object') {
        return { value: k, label: raw.label || raw.value || k }
      }
      return { value: k, label: String(raw) }
    })
  }

  function parseArrayElemType(typeName) {
    if (typeof typeName !== 'string') return null
    const m = /^array\[(.+)\]$/.exec(typeName)
    return m ? m[1] : null
  }
})(window.EF = window.EF || {})
