// demo widget: ui-showcase
//
// A panel that exhibits every UI library widget grouped by category, with a
// segmented nav to switch between Buttons / Inputs / Editor / Containers /
// Data / Overlay. Each subview shows representative variants of each widget
// using the actual UI library — this doubles as a smoke test for the bundle.
//
// Lives in demo/, not in src/. Registers itself as 'ui-showcase' so the demo
// layout can include it as a panel.
;(function (EF) {
  'use strict'
  const ui = EF.ui

  EF.registerWidget('ui-showcase', {
    defaults: function () { return { title: 'UI Showcase', icon: '✦' } },
    create: function (props, ctx) {
      const root = ui.h('div', 'demo-showcase')

      const tab = EF.signal('buttons')
      const nav = ui.segmented({
        value: tab,
        options: [
          { value: 'buttons',    label: 'Buttons' },
          { value: 'inputs',     label: 'Inputs' },
          { value: 'editor',     label: 'Editor' },
          { value: 'containers', label: 'Containers' },
          { value: 'tabs',       label: 'Tabs' },
          { value: 'data',       label: 'Data' },
          { value: 'overlay',    label: 'Overlay' },
        ],
      })
      const navWrap = ui.h('div', 'demo-showcase-nav')
      navWrap.appendChild(nav)

      const body = ui.h('div', 'demo-showcase-body')
      const scroll = ui.scrollArea({ children: body })

      root.appendChild(navWrap)
      root.appendChild(scroll)

      const builders = {
        buttons:    buildButtons,
        inputs:     buildInputs,
        editor:     buildEditor,
        containers: buildContainers,
        tabs:       buildTabs,
        data:       buildData,
        overlay:    buildOverlay,
      }
      ui.bind(root, tab, function (v) {
        // Drop old children — dispose() runs cleanups + detaches each.
        while (body.firstChild) ui.dispose(body.firstChild)
        const fn = builders[v] || builders.buttons
        body.appendChild(fn())
      })

      // When the panel itself is torn down, dispose every UI widget tree
      // currently mounted in the body so signals/effects clean up.
      ctx.onCleanup(function () {
        while (body.firstChild) ui.dispose(body.firstChild)
        ui.dispose(root)
      })

      return root
    },
  })

  // ── helpers ────────────────────────────────────────────────────────

  function group(title, children) {
    return ui.section({ title: title, children: children })
  }
  function row() {
    const r = ui.h('div', 'demo-row')
    for (let i = 0; i < arguments.length; i++) r.appendChild(arguments[i])
    return r
  }
  function note(text) {
    return ui.h('div', 'demo-note', { text: text })
  }

  // ── BUTTONS ────────────────────────────────────────────────────────
  function buildButtons() {
    const wrap = ui.h('div')

    wrap.appendChild(group('Button kinds', [
      row(
        ui.button({ text: 'Default' }),
        ui.button({ text: 'Primary', kind: 'primary' }),
        ui.button({ text: 'Ghost',   kind: 'ghost' }),
        ui.button({ text: 'Danger',  kind: 'danger' }),
        ui.button({ text: 'Disabled', disabled: true }),
      ),
    ]))

    wrap.appendChild(group('Button sizes', [
      row(
        ui.button({ text: 'Small',  size: 'sm', kind: 'primary' }),
        ui.button({ text: 'Medium', size: 'md', kind: 'primary' }),
        ui.button({ text: 'Large',  size: 'lg', kind: 'primary' }),
      ),
    ]))

    wrap.appendChild(group('Buttons with icon', [
      row(
        ui.button({ text: 'Save',    icon: '💾', kind: 'primary' }),
        ui.button({ text: 'Delete',  icon: '🗑', kind: 'danger' }),
        ui.button({ text: 'Refresh', icon: '↻',  kind: 'ghost' }),
      ),
    ]))

    wrap.appendChild(group('Icon buttons', [
      row(
        ui.iconButton({ icon: '✚' }),
        ui.iconButton({ icon: '✕' }),
        ui.iconButton({ icon: '⚙' }),
        ui.iconButton({ icon: '↺' }),
      ),
    ]))

    wrap.appendChild(group('Tags & badges', [
      row(
        ui.tag({ text: 'tag' }),
        ui.tag({ text: 'closeable', onClose: function () {} }),
        ui.badge({ text: '3' }),
        ui.badge({ text: '12', kind: 'error' }),
        ui.badge({ kind: 'success', dot: true }),
      ),
    ]))

    wrap.appendChild(group('Misc', [
      row(
        ui.kbd('Ctrl'), ui.kbd('Shift'), ui.kbd('K'),
        ui.spinner(),
      ),
      ui.divider({ label: 'or' }),
    ]))

    return wrap
  }

  // ── INPUTS (form widgets) ─────────────────────────────────────────
  function buildInputs() {
    const wrap = ui.h('div')

    const sName  = EF.signal('Hello')
    const sBio   = EF.signal('Multi-line text…')
    const sNum   = EF.signal(42)
    const sVec   = EF.signal([1, 2, 3])
    const sSlider= EF.signal(0.5)
    const sRange = EF.signal([0.2, 0.7])
    const sCheck = EF.signal(true)
    const sSwitch= EF.signal(false)
    const sRadio = EF.signal('b')
    const sSeg   = EF.signal('left')
    const sSel   = EF.signal('react')
    const sCombo = EF.signal('')
    const sColor = EF.signal('#7b6ef6')
    const sFlags = EF.signal(0b0101)
    const sTags  = EF.signal(['alpha', 'beta'])

    wrap.appendChild(group('Text fields', [
      ui.propRow({ label: 'Name',     control: ui.input({ value: sName, placeholder: 'Your name' }) }),
      ui.propRow({ label: 'Bio',      control: ui.textarea({ value: sBio, placeholder: 'Tell us…' }) }),
      ui.propRow({ label: 'Search',   control: ui.input({ value: EF.signal(''), placeholder: 'Type to search', prefix: '⌕' }) }),
      ui.propRow({ label: 'Disabled', control: ui.input({ value: EF.signal('readonly'), disabled: true }) }),
    ]))

    wrap.appendChild(group('Numeric', [
      ui.propRow({ label: 'Count',    control: ui.numberInput({ value: sNum, step: 1, min: 0, max: 100 }) }),
      ui.propRow({ label: 'Position', control: ui.vectorInput({ value: sVec, labels: ['X','Y','Z'], step: 0.1, precision: 2 }) }),
      ui.propRow({ label: 'Slider',   control: ui.slider({ value: sSlider, min: 0, max: 1, showValue: true }) }),
      ui.propRow({ label: 'Range',    control: ui.rangeSlider({ value: sRange, min: 0, max: 1 }) }),
    ]))

    wrap.appendChild(group('Toggles', [
      ui.propRow({ label: 'Checkbox', control: ui.checkbox({ value: sCheck, label: 'I agree' }) }),
      ui.propRow({ label: 'Switch',   control: ui['switch']({ value: sSwitch }) }),
      ui.propRow({ label: 'Radio',    control: ui.radio({
        value: sRadio,
        options: [
          { value: 'a', label: 'Option A' },
          { value: 'b', label: 'Option B' },
          { value: 'c', label: 'Option C' },
        ],
      }) }),
      ui.propRow({ label: 'Segmented', control: ui.segmented({
        value: sSeg,
        options: [
          { value: 'left',   label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right',  label: 'Right' },
        ],
      }) }),
    ]))

    wrap.appendChild(group('Select & combo', [
      ui.propRow({ label: 'Select', control: ui.select({
        value: sSel,
        options: [
          { value: 'react',  label: 'React' },
          { value: 'vue',    label: 'Vue' },
          { value: 'svelte', label: 'Svelte' },
          { value: 'solid',  label: 'Solid' },
        ],
      }) }),
      ui.propRow({ label: 'Combobox', control: ui.combobox({
        value: sCombo,
        options: ['apple', 'banana', 'cherry', 'date', 'elderberry'],
      }) }),
    ]))

    wrap.appendChild(group('Specialized', [
      ui.propRow({ label: 'Color', control: ui.colorInput({ value: sColor }) }),
      ui.propRow({ label: 'Flags', control: ui.enumInput({
        value: sFlags,
        options: [
          { value: 1, label: 'Read' },
          { value: 2, label: 'Write' },
          { value: 4, label: 'Execute' },
          { value: 8, label: 'Admin' },
        ],
      }) }),
      ui.propRow({ label: 'Tags', control: ui.tagInput({ value: sTags, placeholder: 'add tag…' }) }),
    ]))

    return wrap
  }

  // Demo-local JS tokenizer — shows how a caller plugs a custom highlighter
  // into ui.codeInput. The framework bundles no language definitions.
  const JS_KW = new Set((
    'var let const function return if else for while do break continue class ' +
    'extends new this super typeof instanceof in of true false null undefined ' +
    'import export from as default async await try catch finally throw switch ' +
    'case void delete yield'
  ).split(' '))
  const JS_RULES = [
    { cls: 'c', re: /\/\/[^\n]*/y },
    { cls: 'c', re: /\/\*[\s\S]*?\*\//y },
    { cls: 's', re: /"(?:\\.|[^"\\\n])*"?/y },
    { cls: 's', re: /'(?:\\.|[^'\\\n])*'?/y },
    { cls: 's', re: /`(?:\\.|[^`\\])*`?/y },
    { cls: 'n', re: /\b(?:0[xX][0-9a-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/y },
    { cls: 'i', re: /[A-Za-z_$][\w$]*/y, kw: JS_KW },
    { cls: 'p', re: /[+\-*/%=<>!&|^~?:,;.()[\]{}]/y },
    { cls: 't', re: /\s+/y },
    { cls: 't', re: /./y },
  ]
  function jsHighlight(src) { return ui.codeInput.tokenize(src, JS_RULES) }

  // ── EDITOR INPUTS (specialized) ───────────────────────────────────
  function buildEditor() {
    const wrap = ui.h('div')

    const sCode = EF.signal('// caller-supplied tokenizer\nfunction hello() {\n  const n = 42\n  return `world ${n}`\n}')
    const sPath = EF.signal('/usr/local/bin/node')
    const sFile = EF.signal(null)
    const sGrad = EF.signal({
      stops: [
        { pos: 0,    color: '#7b6ef6' },
        { pos: 0.5,  color: '#3ecf8e' },
        { pos: 1,    color: '#f0a050' },
      ],
    })
    const sCurve = EF.signal([0.42, 0, 0.58, 1])

    wrap.appendChild(group('Code', [
      ui.codeInput({ value: sCode, language: 'js', rows: 8, highlight: jsHighlight }),
    ]))

    wrap.appendChild(group('Files & paths', [
      ui.propRow({ label: 'Path', control: ui.pathInput({ value: sPath, placeholder: 'pick a file…', useFileInput: true }) }),
      ui.propRow({ label: 'Drop', control: ui.fileInput({ value: sFile }) }),
    ]))

    wrap.appendChild(group('Gradient', [
      ui.gradientInput({ value: sGrad }),
    ]))

    wrap.appendChild(group('Curve', [
      ui.curveInput({ value: sCurve, presets: true }),
    ]))

    return wrap
  }

  // ── CONTAINERS ────────────────────────────────────────────────────
  function buildContainers() {
    const wrap = ui.h('div')

    wrap.appendChild(group('Cards', [
      row(
        ui.card({
          title: 'A card',
          children: ui.h('div', null, { text: 'A bordered container with a title.' }),
        }),
        ui.card({
          children: ui.h('div', null, { text: 'No title — just borders and padding.' }),
        }),
      ),
    ]))

    const inlineSig = EF.signal('one')
    wrap.appendChild(group('Inline tabs', [
      ui.inlineTabs({
        value: inlineSig,
        tabs: [
          { id: 'one',   label: 'Tab one',   content: ui.h('div', null, { text: 'Content for tab one.', style: 'padding:8px' }) },
          { id: 'two',   label: 'Tab two',   content: ui.h('div', null, { text: 'Content for tab two.', style: 'padding:8px' }) },
          { id: 'three', label: 'Tab three', content: ui.h('div', null, { text: 'Content for tab three.', style: 'padding:8px' }) },
        ],
      }),
      note('Local tabs distinct from the framework dock tab widget.'),
    ]))

    wrap.appendChild(group('Section (collapsible)', [
      ui.section({
        title: 'Click me to collapse',
        children: [
          note('Sections wrap any content with a collapsible header.'),
          ui.button({ text: 'Inside section' }),
        ],
      }),
    ]))

    wrap.appendChild(group('Property rows', [
      ui.propRow({ label: 'Width',  control: ui.numberInput({ value: EF.signal(120), suffix: 'px' }) }),
      ui.propRow({ label: 'Height', control: ui.numberInput({ value: EF.signal(40),  suffix: 'px' }) }),
      ui.propRow({ label: 'Locked', control: ui.checkbox({ value: EF.signal(false) }) }),
      note('Blender-style label + control rows.'),
    ]))

    return wrap
  }

  // ── TABS ──────────────────────────────────────────────────────────
  // Demonstrates the inline-tab containers in several variants AND the
  // framework dock-tab widgets (which normally live in dock toolbars).
  function buildTabs() {
    const wrap = ui.h('div')

    // Plain inline tabs.
    const t1 = EF.signal('overview')
    wrap.appendChild(group('Inline tabs (basic)', [
      ui.inlineTabs({
        value: t1,
        tabs: [
          { id: 'overview', label: 'Overview', content: padBlock('Overview content. The active indicator slides between tabs.') },
          { id: 'details',  label: 'Details',  content: padBlock('Detail content with another body.') },
          { id: 'history',  label: 'History',  content: padBlock('History timeline goes here.') },
        ],
      }),
    ]))

    // Tabs with many entries → scrollable / wrap.
    const t2 = EF.signal('a')
    const many = []
    const labels = ['Index','Routes','Models','Views','Controllers','Migrations','Seeds','Tests','Config','Logs']
    for (let i = 0; i < labels.length; i++) {
      many.push({ id: 'k' + i, label: labels[i], content: padBlock('Body for ' + labels[i]) })
    }
    t2.set(many[0].id)
    wrap.appendChild(group('Inline tabs (many)', [
      ui.inlineTabs({ value: t2, tabs: many }),
      note('Use horizontal scroll if the tab strip overflows.'),
    ]))

    // Framework dock tab widgets — show as static markup since they need a
    // real dock context. The actual live tabs are right above this panel
    // (the editor dock's top toolbar) and on every other dock.
    wrap.appendChild(group('Framework dock tabs', [
      note('The three built-in dock tab widgets — they appear in dock toolbars, not inside panels. Click one to switch panels in the dock.'),
      mockTabBar('tab-standard', [
        { label: 'main.ts',  active: true,  close: true },
        { label: 'utils.ts', close: true,  italic: true },
        { label: 'README',   close: true },
        { label: '+',        add: true },
      ]),
      ui.h('div', 'demo-row-pad'),
      mockTabBar('tab-compact', [
        { label: 'Inspector', active: true },
        { label: 'Outline' },
      ]),
      ui.h('div', 'demo-row-pad'),
      mockTabBar('tab-collapsible', [
        { label: 'Console', active: true },
        { label: 'Problems', badge: '3' },
        { label: 'Output' },
      ]),
      note('Live versions are rendered above (editor dock toolbar) and in every other dock in this demo.'),
    ]))

    return wrap
  }
  function padBlock(text) {
    return ui.h('div', 'demo-tab-body', { text: text })
  }
  function mockTabBar(name, items) {
    const bar = ui.h('div', 'demo-mock-tabs')
    const label = ui.h('div', 'demo-mock-tabs-label', { text: name })
    bar.appendChild(label)
    const strip = ui.h('div', 'demo-mock-tabs-strip')
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      const cls = 'demo-mock-tab' +
        (it.active ? ' demo-mock-tab-active' : '') +
        (it.italic ? ' demo-mock-tab-italic' : '') +
        (it.add ? ' demo-mock-tab-add' : '')
      const t = ui.h('div', cls)
      t.appendChild(ui.h('span', null, { text: it.label }))
      if (it.badge) t.appendChild(ui.h('span', 'demo-mock-tab-badge', { text: it.badge }))
      if (it.close) t.appendChild(ui.h('span', 'demo-mock-tab-close', { text: '×' }))
      strip.appendChild(t)
    }
    bar.appendChild(strip)
    return bar
  }

  // ── DATA WIDGETS ──────────────────────────────────────────────────
  function buildData() {
    const wrap = ui.h('div')

    // List
    const listItems = []
    for (let i = 0; i < 200; i++) listItems.push({ id: i, label: 'Row #' + i })
    const listSel = EF.signal(null)
    wrap.appendChild(group('Virtualized list (200 rows)', [
      ui.list({
        items: listItems,
        rowHeight: 22,
        selected: listSel,
        render: function (it) { return ui.h('div', null, { text: it.label }) },
      }),
    ]))

    // Tree
    const treeItems = [
      { id: 'src', label: 'src/', children: [
        { id: 'core', label: 'core/', children: [
          { id: 'signal', label: 'signal.js' },
          { id: 'errors', label: 'errors.js' },
          { id: 'bus',    label: 'bus.js' },
        ]},
        { id: 'tree',   label: 'tree.js' },
        { id: 'dock',   label: 'dock/', children: [
          { id: 'render', label: 'render.js' },
          { id: 'inter',  label: 'interactions.js' },
        ]},
      ]},
      { id: 'demo',  label: 'demo/' },
      { id: 'tools', label: 'tools/' },
    ]
    const treeSel = EF.signal(null)
    wrap.appendChild(group('Tree (virtualized)', [
      ui.tree({ items: treeItems, selected: treeSel }),
    ]))

    // Table
    const tableRows = []
    for (let i = 0; i < 40; i++) tableRows.push({ id: i, name: 'Item ' + i, kind: i % 2 ? 'file' : 'dir', size: (i * 137) % 9999 })
    wrap.appendChild(group('Table (virtualized)', [
      ui.table({
        rows: tableRows,
        rowHeight: 24,
        columns: [
          { key: 'id',   label: '#',    width: 50 },
          { key: 'name', label: 'Name', width: 160 },
          { key: 'kind', label: 'Kind', width: 80 },
          { key: 'size', label: 'Size', width: 80 },
        ],
      }),
    ]))

    // Breadcrumbs
    wrap.appendChild(group('Breadcrumbs', [
      ui.breadcrumbs({
        items: [
          { label: 'src',  onClick: function () {} },
          { label: 'ui',   onClick: function () {} },
          { label: 'data', onClick: function () {} },
          { label: 'list.js' },
        ],
      }),
    ]))

    // Progress
    const progSig = EF.signal(0.4)
    wrap.appendChild(group('Progress', [
      ui.progressBar({ value: progSig, label: '40%' }),
      ui.h('div', 'demo-row-pad'),
      ui.progressBar({ indeterminate: true }),
    ]))

    return wrap
  }

  // ── OVERLAY ───────────────────────────────────────────────────────
  function buildOverlay() {
    const wrap = ui.h('div')

    wrap.appendChild(group('Modal', [
      row(
        ui.button({
          text: 'Open modal', kind: 'primary',
          onClick: function () {
            const body = ui.h('div', null, { text: 'This is a modal dialog. Press ESC or click outside to close.' })
            const okBtn = ui.button({ text: 'OK', kind: 'primary', onClick: function () { m.close() } })
            const m = ui.modal({ title: 'Hello', content: body, footer: okBtn })
          },
        }),
      ),
    ]))

    wrap.appendChild(group('Drawer', [
      row(
        ui.button({ text: 'From right', onClick: function () {
          ui.drawer({ side: 'right', title: 'Right drawer', content: ui.h('div', null, { text: 'Right side content.', style: 'padding:8px' }) })
        }}),
        ui.button({ text: 'From left', onClick: function () {
          ui.drawer({ side: 'left', title: 'Left drawer', content: ui.h('div', null, { text: 'Left side content.', style: 'padding:8px' }) })
        }}),
        ui.button({ text: 'From bottom', onClick: function () {
          ui.drawer({ side: 'bottom', title: 'Bottom drawer', content: ui.h('div', null, { text: 'Bottom content.', style: 'padding:8px' }) })
        }}),
      ),
    ]))

    wrap.appendChild(group('Menu (context)', [
      (function () {
        const btn = ui.button({ text: 'Open menu' })
        btn.addEventListener('click', function () {
          ui.menu({
            anchor: btn,
            items: [
              { type: 'header', label: 'File' },
              { label: 'New',  icon: '✚',  kbd: 'Ctrl+N', onSelect: function () { ui.toast({ kind: 'info', message: 'New' }) } },
              { label: 'Open', icon: '📂', kbd: 'Ctrl+O', onSelect: function () { ui.toast({ kind: 'info', message: 'Open' }) } },
              { label: 'Save', icon: '💾', kbd: 'Ctrl+S', onSelect: function () { ui.toast({ kind: 'success', message: 'Saved' }) } },
              { type: 'divider' },
              { label: 'Submenu', items: [
                { label: 'Sub one', onSelect: function () {} },
                { label: 'Sub two', onSelect: function () {} },
              ] },
              { type: 'divider' },
              { label: 'Delete', icon: '🗑', danger: true, onSelect: function () { ui.toast({ kind: 'error', message: 'Deleted' }) } },
            ],
          })
        })
        return row(btn)
      })(),
    ]))

    wrap.appendChild(group('Alerts (inline)', [
      ui.alert({ kind: 'info',    title: 'Info',    message: 'Just so you know.' }),
      ui.alert({ kind: 'success', title: 'Success', message: 'Operation complete.' }),
      ui.alert({ kind: 'warn',    title: 'Warning', message: 'Heads up — check this.' }),
      ui.alert({ kind: 'error',   title: 'Error',   message: 'Something went wrong.' }),
    ]))

    wrap.appendChild(group('Toasts', [
      row(
        ui.button({ text: 'Info',    onClick: function () { ui.toast({ kind: 'info',    title: 'Info',    message: 'Hello there.' }) } }),
        ui.button({ text: 'Success', kind: 'primary', onClick: function () { ui.toast({ kind: 'success', title: 'Success', message: 'Saved successfully.' }) } }),
        ui.button({ text: 'Warn',    onClick: function () { ui.toast({ kind: 'warn',    title: 'Warning', message: 'Watch out.' }) } }),
        ui.button({ text: 'Error',   kind: 'danger',  onClick: function () { ui.toast({ kind: 'error',   title: 'Error',   message: 'It broke.' }) } }),
      ),
    ]))

    wrap.appendChild(group('Tooltip & popover', [
      (function () {
        const b1 = ui.button({ text: 'Hover me' })
        ui.tooltip(b1, { text: 'A simple tooltip' })
        const b2 = ui.button({ text: 'Open popover' })
        b2.addEventListener('click', function () {
          if (b2._pop) { b2._pop.close(); b2._pop = null; return }
          const content = ui.h('div', null, { text: 'A popover with arbitrary content.', style: 'padding:12px;min-width:180px' })
          b2._pop = ui.popover({ anchor: b2, content: content, side: 'bottom', align: 'start', onDismiss: function () { b2._pop = null } })
        })
        return row(b1, b2)
      })(),
    ]))

    return wrap
  }
})(window.EF = window.EF || {})
