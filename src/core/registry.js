// Widget registry — the only way to introduce a widget into the framework.
// Process-global Map<name, WidgetSpec>. See § 4.8.
//
//   EF.registerWidget(name, spec)
//   EF.resolveWidget(name)            → spec     (throws if missing)
//   EF.widgetDefaults(name)           → object   (spec.defaults?.() ?? {})
//
// WidgetSpec = {
//   create:       (props, ctx) => HTMLElement,    // required
//   defaults?:    () => ({ title?, icon?, props?, toolbarItems? }),
//   dispose?:     (el) => void,
//   serialize?:   (el) => any,                    // cross-window only (§ 4.16)
//   deserialize?: (el, state) => void,
// }
;(function (EF) {
  'use strict'

  const widgets = new Map()

  function registerWidget(name, spec) {
    if (typeof name !== 'string' || name.length === 0)
      throw new Error('registerWidget: name must be a non-empty string')
    if (widgets.has(name))
      throw new Error('registerWidget: duplicate widget name "' + name + '"')
    if (!spec || typeof spec.create !== 'function')
      throw new Error('registerWidget: spec.create must be a function')
    widgets.set(name, spec)
  }

  function resolveWidget(name) {
    const spec = widgets.get(name)
    if (!spec) throw new Error('resolveWidget: unknown widget "' + name + '"')
    return spec
  }

  function widgetDefaults(name) {
    const spec = resolveWidget(name)
    return (spec.defaults && spec.defaults()) || {}
  }

  EF.registerWidget = registerWidget
  EF.resolveWidget  = resolveWidget
  EF.widgetDefaults = widgetDefaults
})(window.EF = window.EF || {})
