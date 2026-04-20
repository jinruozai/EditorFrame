# editorframe

纯前端、零依赖、零构建的 **Blender 风格编辑器 UI 框架**。

[![npm](https://img.shields.io/npm/v/@gooooo/editorframe.svg)](https://www.npmjs.com/package/@gooooo/editorframe)
[![license](https://img.shields.io/npm/l/@gooooo/editorframe.svg)](./LICENSE)

---

## 理念

你只需要做两件事:

1. **用 widget 写内容**  —— 每个 widget 就是一个返回 DOM 元素的函数,用框架自带的 50+ UI 组件或者你自己的组件都行
2. **用 dock 组织布局** —— 把 widget 放进 panel,把 panel 放进 dock,dock 之间可以分裂、合并、拖拽、弹窗

整个编辑器就是这样写出来的。

```
Layout(N 叉分割树)
 └─ Dock ×M            ← 可分裂 / 合并 / 调整大小的矩形容器
     ├─ Toolbar         ← tab 栏 + 自定义按钮(可选)
     └─ Panel ×N        ← 每个 panel 装一个 widget,同一时刻只显示 active 那个
```

---

## 安装

```html
<!-- CDN(推荐,一行搞定） -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@gooooo/editorframe@1/dist/ef.css">
<script src="https://cdn.jsdelivr.net/npm/@gooooo/editorframe@1/dist/ef.js"></script>
```

```bash
# 或者 npm
npm install @gooooo/editorframe
```

```html
<!-- 手动下载 dist/ef.js + dist/ef.css 也行 -->
```

加载后所有 API 挂在 `window.EF` 下。

---

## 快速上手

### 1. 注册 widget

Widget 是编辑器里的一切内容。一个 widget 就是一个 `create` 函数,接收 `props` 和 `ctx`,返回一个 DOM 元素:

```js
EF.registerWidget('my-editor', {
  create: function (props, ctx) {
    var el = document.createElement('div')
    el.style.padding = '16px'
    el.textContent = 'Editing: ' + (props.file || 'untitled')

    // ctx.panel 可以读写面板状态
    ctx.panel.setTitle(props.file || 'New File')
    ctx.panel.setDirty(false)

    // ctx.dock 可以操作所在 dock
    // ctx.bus 可以跨面板通讯

    return el
  },
  // 可选:面板关闭时清理资源
  dispose: function (el) { /* ... */ },
  // 可选:新建面板时的默认参数
  defaults: function () { return { title: 'Editor', props: { file: '' } } },
})
```

注册后这个 widget 可以在任何 dock 里当 panel 用,也可以当 toolbar 组件用。

### 2. 构建布局

用 `split` / `dock` / `panel` 三个工厂函数描述布局树:

```js
var tree = EF.split('horizontal', [
  // 左侧：文件树
  EF.dock({
    toolbar: { direction: 'top', items: [{ widget: 'tab-standard' }] },
    panels: [
      EF.panel({ widget: 'file-tree', title: 'Files' }),
    ],
  }),
  // 右侧：编辑器 + 预览
  EF.split('vertical', [
    EF.dock({
      toolbar: { direction: 'top', items: [{ widget: 'tab-standard' }] },
      panels: [
        EF.panel({ widget: 'my-editor', title: 'main.js', props: { file: 'main.js' } }),
        EF.panel({ widget: 'my-editor', title: 'style.css', props: { file: 'style.css' } }),
      ],
    }),
    EF.dock({
      toolbar: { direction: 'top', items: [{ widget: 'tab-compact' }] },
      panels: [
        EF.panel({ widget: 'preview', title: 'Preview' }),
      ],
    }),
  ], [0.7, 0.3]),
], [0.25, 0.75])
```

### 3. 挂载

```js
var layout = EF.createDockLayout(document.getElementById('app'), { tree: tree })
```

完成。你已经有一个可以拖拽分割、带 tab 切换的编辑器了。

### 4. 运行时操作

`layout` 返回一个 handle,可以在运行时动态操作布局:

```js
// 添加新面板
layout.addPanel('dock-1', { widget: 'my-editor', title: 'new.js', props: { file: 'new.js' } })

// 关闭面板
layout.removePanel('panel-3')

// 分裂 dock
layout.splitDock('dock-1', 'horizontal', 'after', 0.5)

// 合并 dock
layout.mergeDocks('dock-1', 'dock-2')
```

---

## 核心概念

### Dock —— 容器

Dock 是一个矩形区域,装 0~N 个 panel,同一时刻只显示 active 的那个。Dock 的行为全靠配置:

```js
EF.dock({
  // 稳定名称，用于代码中引用（可选）
  name: 'sidebar',

  // 工具栏：位置 + 组件
  toolbar: {
    direction: 'top',        // 'top' | 'bottom' | 'left' | 'right'
    items: [
      { widget: 'tab-standard', align: 'start' },  // tab 栏
      { widget: 'my-toolbar-btn', align: 'end' },   // 自定义按钮
    ],
  },

  // 面板白名单：只接受特定 widget 类型（可选，默认接受所有）
  accept: ['my-editor', 'preview'],

  // 初始面板
  panels: [ EF.panel({ widget: 'my-editor', title: 'Hello' }) ],
})
```

**没有 toolbar = 没有 tab 栏**。如果你的 dock 只需要一个固定面板（比如侧边栏），可以完全不配 toolbar。

**Dock 不是一种类型,是一种配法**。不管你想要 tab 编辑器、工具栏面板、侧边树、底部日志、弹出窗口,都是同一个 `dock()` + 不同的 toolbar/panel 配置。

### Panel —— 内容

Panel 是 widget 的实例化载体。每个 panel 有 id、title、icon、dirty 标记、props 等元数据:

```js
EF.panel({
  widget: 'my-editor',          // 已注册的 widget 名（必填）
  title: 'main.js',             // 标题（默认等于 widget 名）
  icon: '📄',                   // 图标
  props: { file: 'main.js' },   // 传给 widget.create() 的参数，必须 JSON 可序列化
  transient: true,               // 预览模式（斜体 tab，被新的 transient 自动替换）
})
```

**非 active 的 panel 不占资源**：框架直接把它的 DOM 从页面摘除（不是 `display:none`），浏览器对它零 layout、零 paint。切回来时原样恢复,所有状态保留。

### Widget —— 组件定义

Widget 通过 `EF.registerWidget(name, spec)` 注册,一次注册,到处使用:

```js
EF.registerWidget('my-widget', {
  // 创建 DOM 元素（必需）
  create: function (props, ctx) {
    var el = document.createElement('div')
    // ...
    return el
  },

  // 清理资源（可选）
  dispose: function (el) { /* 取消订阅 / 关 WebSocket / ... */ },

  // 新建时的默认参数（可选，角拖分裂时用）
  defaults: function () { return { title: 'My Widget', props: {} } },

  // 跨窗口迁移用（可选）
  serialize: function (el) { return { scrollTop: el.scrollTop } },
  deserialize: function (el, state) { el.scrollTop = state.scrollTop },
})
```

### ctx —— widget 的上下文

widget 的 `create(props, ctx)` 中 `ctx` 暴露了所有框架能力:

```js
// 面板相关（读写标题、dirty、关闭、弹窗...）
ctx.panel.title()              // 读标题（signal）
ctx.panel.setTitle('new name') // 写标题
ctx.panel.setDirty(true)       // 标记未保存
ctx.panel.close()              // 关闭自己
ctx.panel.popOut()             // 弹出为独立窗口
ctx.panel.promote()            // 从预览升级为常驻

// Dock 相关（读写所在 dock 的状态）
ctx.dock.panels()              // 当前 dock 的所有 panel（signal）
ctx.dock.activeId()            // 当前 active panel id（signal）
ctx.dock.activatePanel(id)     // 切换 active
ctx.dock.addPanel(partial)     // 在当前 dock 添加新 panel
ctx.dock.removePanel(id)       // 关闭指定 panel
ctx.dock.toggleFocus()         // 全屏聚焦当前 dock
ctx.dock.setCollapsed(bool)    // 折叠/展开 dock

// 跨面板通讯
ctx.bus.emit('file:saved', { path: '/a.js' })
ctx.bus.on('file:saved', function (payload) { /* ... */ })  // 面板关闭时自动取消订阅

// 生命周期
ctx.active                     // signal<boolean>：DOM 是否挂载
ctx.onCleanup(fn)              // 注册清理函数
```

---

## 内置 Tab Widget

框架自带三种 tab 组件,直接写在 toolbar items 里用:

| Widget 名 | 效果 |
|---|---|
| `tab-standard` | 标准 tab 栏,带关闭按钮 + 新建按钮 |
| `tab-compact` | 紧凑模式,单 panel 时自动隐藏 tab 栏 |
| `tab-collapsible` | 点击已激活的 tab 折叠/展开整个 dock |

Tab 不是特殊机制 —— 它就是一个普通的 toolbar widget,订阅了 `ctx.dock.panels` 来渲染 tab 按钮。你可以写自己的 tab 组件完全替换它。

---

## 内置 UI 组件库

`EF.ui.*` 提供 50+ 即用组件,全部基于"调用方持有 signal"的设计:

```js
var name = EF.signal('world')

// 创建一个输入框,双向绑定到 name signal
var input = EF.ui.input({ value: name, placeholder: 'Enter name' })

// 创建一个按钮
var btn = EF.ui.button({ label: 'Greet', onClick: function () { alert('Hello ' + name()) } })
```

**Base**: button / iconButton / icon / tooltip / popover / kbd / badge / tag / spinner / divider
**Form**: input / textarea / numberInput / vectorInput / slider / rangeSlider / checkbox / switch / radio / segmented / select / combobox / colorInput / enumInput / tagInput / tab
**Editor**: gradientInput / curveInput / codeInput / pathInput / fileInput
**Container**: section / propRow / card / scrollArea / tabPanel
**Data**（虚拟化）: list / tree / table / breadcrumbs / progressBar
**Overlay**: menu / modal / drawer / alert / toast

---

## 主题

三套内置主题,通过 `data-ef-theme` 属性切换:

```js
// Dark（默认,Godot Minimal 风） —— 无需设置
// Dracula
document.documentElement.setAttribute('data-ef-theme', 'dracula')
// Light
document.documentElement.setAttribute('data-ef-theme', 'light')
```

所有颜色、间距、圆角、动画时长都是 `--ef-*` CSS 变量,可以单独覆盖:

```css
:root {
  --ef-c-accent: #ff6b6b;     /* 换个 accent 色 */
  --ef-r-2: 8px;               /* 加大圆角 */
  --ef-dur-slow: 300ms;        /* 放慢动画 */
}
```

---

## 完整示例

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@gooooo/editorframe@1/dist/ef.css">
  <style> html, body { margin: 0; height: 100% } #app { width: 100vw; height: 100vh } </style>
</head>
<body>
  <div id="app"></div>
  <script src="https://cdn.jsdelivr.net/npm/@gooooo/editorframe@1/dist/ef.js"></script>
  <script>
    // 注册 widget
    EF.registerWidget('note', {
      create: function (props, ctx) {
        var el = document.createElement('div')
        el.style.padding = '16px'
        var ta = EF.ui.textarea({
          value: EF.signal(props.text || ''),
          placeholder: 'Type something...',
        })
        el.appendChild(ta)
        return el
      },
      defaults: function () { return { title: 'Note', props: { text: '' } } },
    })

    // 构建布局
    var layout = EF.createDockLayout(document.getElementById('app'), {
      tree: EF.split('horizontal', [
        EF.dock({
          toolbar: { direction: 'top', items: [{ widget: 'tab-standard' }] },
          panels: [
            EF.panel({ widget: 'note', title: 'Note 1', props: { text: 'Hello' } }),
            EF.panel({ widget: 'note', title: 'Note 2', props: { text: 'World' } }),
          ],
        }),
        EF.dock({
          toolbar: { direction: 'top', items: [{ widget: 'tab-compact' }] },
          panels: [
            EF.panel({ widget: 'note', title: 'Scratch' }),
          ],
        }),
      ], [0.5, 0.5]),
    })
  </script>
</body>
</html>
```

这个例子给你一个双栏编辑器,左边有两个 tab 可切换,右边一个。你可以拖拽中间的分割线调整大小,拖角落的三角拆分/合并 dock。

---

## Dock 的高级能力

| 能力 | 用法 |
|---|---|
| **角拖分裂** | 拖拽 dock 角落的三角,把一个 dock 拆成两个 |
| **边缘合并** | 拖拽三角到相邻 dock,吞并它（dirty panel 有保护） |
| **跨 dock 拖放** | 拖 tab 到另一个 dock,panel 连同状态一起迁移,零重建 |
| **弹出独立窗口** | `ctx.panel.popOut()` 或拖 tab 到窗口外 |
| **Focus 全屏** | `ctx.dock.toggleFocus()`,dock 铺满整个视口 |
| **折叠** | `ctx.dock.setCollapsed(true)`,dock 缩成一条线 |
| **预览模式** | `addPanel(id, partial, { transient: true })`,新预览自动替换旧预览 |
| **Accept 白名单** | `dock({ accept: ['editor'] })`,只接受指定类型的 panel |
| **LRU 内存控制** | `createDockLayout(el, { tree, lru: { max: 10 } })`，自动淘汰最久未用的非 dirty panel |

---

## 跨面板通讯

`ctx.bus` 是解耦的 pub/sub 总线:

```js
// 面板 A：发布事件
ctx.bus.emit('file:saved', { path: '/main.js' })

// 面板 B：订阅事件（面板关闭时自动取消）
ctx.bus.on('file:saved', function (data) {
  console.log('Saved:', data.path)
})
```

Signal 适合**状态**（有当前值,晚订阅也能读到），Bus 适合**事件**（一次性通知,错过不补）。

---

## 本地开发

```bash
git clone https://gitee.com/lazygoo/editor-frame.git
cd editor-frame
node tools/build.mjs --watch     # src/ 变动自动重新拼接到 dist/
npx http-server -p 5570          # 浏览器访问 http://localhost:5570
```

`demo/` 下的文件不进 bundle,改完 reload 即可。

---

## 许可

[MIT](./LICENSE) © gooooo

---

## 更多

- [`CLAUDE.md`](./CLAUDE.md) —— 完整架构设计 / 数据模型 / 所有 API 定义
- [`doc/editor_style.html`](./doc/editor_style.html) —— 视觉调色板参考
- [`index.html`](./index.html) —— 组件浏览器 demo（50+ UI 组件现场演示）
