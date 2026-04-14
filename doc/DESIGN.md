# Editor Framework 设计方案

> 版本：v3.0 — 精简重构

---

## 目录

1. [概述](#1-概述)
2. [响应式系统](#2-响应式系统)
3. [布局系统](#3-布局系统)
4. [Dock](#4-dock)
5. [Panel](#5-panel)
6. [Widget 系统](#6-widget-系统)
7. [通信与快捷键](#7-通信与快捷键)
8. [主题与交互](#8-主题与交互)
9. [插件与配置](#9-插件与配置)
10. [工程规划](#10-工程规划)

---


# 1. 概述

一个纯前端编辑器框架库。零外部依赖，浏览器环境独立运行。

**核心三层：**

```
Dock      布局容器，Blender 风格自由分割
Panel     内容单元，用户完全自定义
Widget    UI 组件库，风格统一，主题可切换
```

Dock 管布局，Panel 管内容，Widget 管 UI。三层解耦，互不侵入。

**一个关键洞察：** Dock 只是一个纯容器——管 Panel 列表、渲染 Toolbar、约束尺寸。Tab 栏是 Toolbar 里的一个普通 Widget，和按钮、文本没有区别。换一个 Tab Widget（或换它的 props），Dock 的"性格"就变了。StatusBar、MenuBar 也只是 Dock + maxHeight + toolbar 里放不同 Widget。没有任何特殊概念。

**设计原则：**
- 数据驱动 — 布局是可序列化的 JSON
- 完全同构 — 所有 Dock 平等，无特殊角色，无特殊区域
- 概念极简 — 不加新概念，已有概念的配置组合能覆盖就不加
- 解耦 — Panel 不感知其他 Panel，通过命令和事件通信
- 不可变布局树 — 修改产生新树，共享未变分支，撤销 = 指针切换

**整体结构：**

```
Editor
  ├── SplitTree              N 叉布局树
  │     ├── SplitNode        分割节点（N 个子节点）
  │     └── DockNode         叶子节点（内含 Panel 列表）
  ├── ReactiveSystem         Signal 响应式核心
  ├── CommandSystem          命令（中间件链）
  ├── EventBus               事件总线
  ├── ContextSystem          全局 key-value
  ├── KeymapSystem           快捷键
  ├── ThemeSystem            两层 Token 主题
  └── PluginSystem           插件扩展
```


---


# 2. 响应式系统

所有 UI 渲染的基础。Signal 细粒度响应式 + `h()` DOM 构建器，约 250 行核心代码。

**为什么不用 Virtual DOM：** 编辑器场景大量细粒度更新（光标、选区、状态栏），Signal 的更新是 O(1)——signal 变化直接更新绑定的那个 DOM 节点，不需要 diff 整棵树。


## 2.1 响应式原语

```typescript
// 可变响应式值
const count = signal(0)
count()              // 读取（自动追踪依赖）
count.set(5)         // 写入
count.update(n => n + 1)

// 派生值（惰性，缓存）
const doubled = computed(() => count() * 2)

// 副作用（依赖变化时自动重执行）
const dispose = effect(() => {
  console.log(count())   // count 变化时自动打印
})

// 清理（effect 重执行或 dispose 前调用）
effect(() => {
  const timer = setInterval(tick, 1000)
  onCleanup(() => clearInterval(timer))
})

// 批量更新（多个 set 合并为一次 effect 执行）
batch(() => {
  a.set(1)
  b.set(2)   // 只触发一次 effect
})
```

实现原理：全局 effect 栈 → signal 读取时自动收集依赖 → set 时通知订阅者。约 150 行。


## 2.2 DOM 构建器

```typescript
// 创建元素，函数类型的 prop 自动包裹 effect
h('div', { class: () => `item ${active() ? 'on' : ''}` },
  h('span', {}, () => `Count: ${count()}`),   // 响应式文本
  h('button', { onclick: () => count.update(n => n + 1) }, '+'),
)

// 条件渲染
show(() => visible(), () => h('div', {}, 'Hello'))

// 列表渲染（键控，最小 DOM 变更）
list(() => items(), item => item.id, (item) =>
  h('div', { class: 'row' }, item.name)
)
```

`h()` 返回真实 DOM 元素，不是虚拟节点。元素移除时自动 dispose 所有关联 effect。


## 2.3 调度器

不同优先级的更新分开处理：

```typescript
scheduler.urgent(fn)    // 同步，拖拽跟手、键盘输入
scheduler.normal(fn)    // rAF 批量，signal 触发的 UI 更新（默认）
scheduler.idle(fn)      // requestIdleCallback，持久化、性能采集
```


---


# 3. 布局系统

N 叉 SplitTree + Blender 风格交互。布局树不可变，修改产生新树。


## 3.1 数据结构

```typescript
// 根节点
{ type: "root", child: SplitNode | DockNode }

// 分割节点：N 个子节点
{
  type: "split",
  direction: "horizontal" | "vertical",
  sizes: [0.2, 0.6, 0.2],       // 占比，总和为 1，长度 = children.length
  children: (DockNode | SplitNode)[]
}

// 叶子节点：Dock（详见 §4）
{
  type: "dock",
  id: "dock-1",
  preset: "editor",          // 引用预设
  toolbarPosition: "top",
  toolbar: [ ... ],          // 工具栏项（Tab Widget 就在里面）
  panels: [ ... ],           // Panel 列表
  activePanel: "p1",
  acceptPanels: ["code-editor"],
}
```

N 叉树优势：三列布局 `[sidebar, editor, properties]` 是一个 SplitNode，拖动任一分割线只改一个 sizes 数组。


## 3.2 Blender 风格布局交互

布局操作和内容操作完全分离：

| 操作 | 触发 | 作用 |
|------|------|------|
| **分割** | 拖 Dock 角上的三角手柄 | 创建新空 Dock |
| **合并** | 从共享边向邻居方向拖 | 吞并邻居 Dock |
| **交换** | Ctrl + 拖角到另一个 Dock | 交换两者内容 |
| **调整大小** | 拖共享边 | 修改 sizes |
| **移动 Panel** | 拖 Tab 标签 | Panel 在 Dock 间移动 |

**角分割：**

```
每个 Dock 四角有隐藏三角手柄，hover 显示。

  ┌─◣──────────────┐        ┌───────┬────────┐
  │  → 向右拖       │  →     │ 新Dock │ 原Dock │
  └────────────────┘        └───────┴────────┘

  ┌─◣──────────────┐        ┌────────────────┐
  │  ↓ 向下拖       │  →     │    新Dock      │
  └────────────────┘        ├────────────────┤
                             │    原Dock      │
                             └────────────────┘

拖拽方向决定分割方向，释放位置决定占比。
新 Dock 克隆当前 Dock 的配置，并创建 acceptPanels[0] 默认 Panel。
```

**边合并：**

```
  ┌──────┬──────┐         ┌─────────────┐
  │      →      │         │             │
  │  A   →  B   │   →     │      A      │  B 的 Panel 合并进 A
  │      →      │         │             │
  └──────┴──────┘         └─────────────┘

条件：两个 Dock 必须共享完整一条边。
```

**拖 Tab 时的放置区域：**

```
拖 Tab 进入目标 Dock 时，根据鼠标位置决定放置方式：

  ┌─────────────────────────┐
  │          上（25%）        │    上下左右：分割出新 Dock
  ├──────┬──────────┬───────┤
  │ 左   │   中间   │  右   │    中间：加入当前 Dock（变成新 Tab）
  │(25%) │  (50%)   │(25%)  │
  ├──────┴──────────┴───────┤
  │          下（25%）        │
  └─────────────────────────┘

对应的半透明 accent 色高亮实时跟随鼠标。
```


## 3.3 不可变树 + 结构共享

```typescript
// 修改一个节点 → 沿路径创建新节点，其余分支共享引用
const tree2 = layout.updateDock("dock-3", { collapsed: true })

tree1.dockA === tree2.dockA   // true，未修改的分支零拷贝
tree1 !== tree2               // true，根节点是新的

// 撤销 = 指向旧树，重做 = 指向新树
// 无需 execute/undo 闭包，无需序列化快照
```


## 3.4 分割线交互

- 拖动即时跟手，零延迟（urgent 优先级）
- 智能吸附：接近 50%、33%、25% 等比例时自动吸附
- 拖动时全局 cursor 锁定（pointer-events: none on body）
- 不允许低于 DockNode 的 minWidth / minHeight


## 3.5 多窗口与浮动

每个 Panel 都可以拖出为独立浏览器窗口。每个窗口拥有完整的 SplitTree，内部可以自由分割。

**数据结构：**

```typescript
{
  windows: [
    { id: "main",  tree: SplitTree, floats: [FloatDock, ...] },
    { id: "sub-1", tree: SplitTree, floats: [...] },  // 独立窗口，完整布局树
    { id: "sub-2", tree: SplitTree, floats: [...] },
  ]
}

// 浮动 Dock = DockNode + 位置尺寸
interface FloatDock extends DockNode {
  x: number; y: number; width: number; height: number
}
```

浮动 Dock 和嵌入 Dock 数据结构一致，可互相转换。独立窗口和主窗口也可互相迁移 Panel。

**主从架构：Main Window 是唯一的 source of truth。**

```
Main Window
  ├── 完整核心系统（layout tree, commands, context, eventbus, config）
  ├── BroadcastChannel hub
  └── 自己的渲染

Sub Window（window.open）
  ├── 自己的 Reactive + DOM（渲染独立，DOM 不跨窗口）
  ├── Context 只读副本（Main → Sub 单向同步）
  ├── Commands 代理（执行转发给 Main）
  └── EventBus 桥接（双向）
```

**跨窗口同步策略（BroadcastChannel，仅 JSON 可序列化数据）：**

| 系统 | 策略 |
|------|------|
| Layout Tree | Main 持有，修改后序列化同步给 Sub |
| Context | Main → Sub 单向同步。带函数引用的 key 是 window-local，不跨窗口 |
| Commands | Sub 执行 → 转发 Main → Main 执行 → 结果回传 |
| EventBus | 双向桥接 |
| Theme | adoptedStyleSheets 共享引用，零同步成本（见 §8.1）|
| Reactive | 不跨窗口 — 每个窗口有自己的 signal 实例 |

**跨窗口 Tab 拖拽：**

```
Window A 拖出 Tab
  → A 通过 BroadcastChannel 广播 { type: "panel.drag-start", panel: PanelData }
  → 所有窗口显示 drop 区域高亮
  → 用户在 Window B 放下
  → B 广播 { type: "panel.drop", target: dockId, zone: "center" }
  → Main 执行：从 A 移除 Panel，插入 B 的目标 Dock
  → Panel 在 B 重建（getState → 销毁 → 重建 → setState，与 LRU 恢复同一套机制）
```


## 3.6 Focus Mode

任意 Dock 一键最大化，不修改布局树，纯 CSS 层切换：

```css
.dock.focused {
  position: fixed;
  inset: 0;
  z-index: 100;
  /* spring 动画：从原位置/大小 → 全屏 */
}
```


---


# 4. Dock

Dock 是布局的叶子节点。**它只做三件事：管 Panel 列表、渲染 Toolbar、约束自身尺寸。**

Tab 栏是 Toolbar 里的一个普通 Widget，和按钮、文本没有区别。Tab Widget 的 props 决定了 Dock 的"性格"——Dock 本身不知道也不关心 Tab 的行为。

> **设计原则：不加新概念，让已有概念足够灵活。**
> StatusBar = Dock + maxHeight + 空 panels + toolbar 放文字组件
> MenuBar = Dock + maxHeight + 空 panels + toolbar 放下拉菜单
> 侧边栏 / 编辑区 / 底部面板 = 同一个 DockNode，只是 toolbar 里的 Tab Widget 不同


## 4.1 DockNode 结构

```typescript
interface DockNode {
  type:    'dock'
  id:      string
  preset?: string                // 引用预设模板，局部字段可覆盖

  // Panel 管理
  panels:       PanelData[]      // 当前 Dock 内的 Panel 列表
  activePanel:  string | null    // 当前激活 Panel id，空 Dock 为 null
  acceptPanels: string[]         // 允许的 Panel 类型
                                 //   [] = 接受所有已注册类型（默认）
                                 //   [0] = 默认类型（"添加面板" / 分割克隆时使用）
                                 //   同时决定拖入过滤：不在列表里的 Panel 拖不进来
  lru:          { max: number }  // Panel 缓存上限，-1 = 不销毁

  // 工具栏
  toolbarPosition: 'top' | 'bottom' | 'left' | 'right'
  toolbar:         ToolbarItem[] // 扁平列表（Tab 组件就在里面）

  // 状态
  collapsed:    boolean          // 是否折叠

  // 尺寸约束
  minWidth:     number           // 默认 80
  minHeight:    number           // 默认 60
  maxWidth?:    number           // 有值时锁定最大宽度
  maxHeight?:   number           // 有值时锁定最大高度
}
```


## 4.2 Toolbar

扁平列表，按 `align` + `order` 排列：

```typescript
interface ToolbarItem {
  id:      string
  widget:  string              // Widget 类型
  props:   any                 // 透传给 Widget
  panel?:  string              // 关联 Panel id → 该 Panel 激活时才显示
  align:   'start' | 'end'    // 靠左 or 靠右
  order:   number              // 同侧内排序
  flex?:   number              // 0 = 内容撑开，>0 = 弹性占比
}
```

渲染：`[start items →]   [← end items]`，中间自然留白。
方向跟随 `toolbarPosition`：top/bottom 横排，left/right 竖排。

**Tab 组件是 toolbar 里的一个普通 item：**

```typescript
// 典型编辑区 toolbar
[
  { id: "tabs", widget: "tab-standard", align: "start", flex: 1, order: 0,
    props: { closeButton: "hover", addButton: true, draggable: true, reorderable: true } },
  { id: "dock-menu", widget: "dock-menu-button", align: "end", order: 999 },
]

// 侧边栏 toolbar
[
  { id: "tabs", widget: "tab-compact", align: "start", flex: 1, order: 0,
    props: { minShowCount: 2, closeButton: "never" } },
  { id: "dock-menu", widget: "dock-menu-button", align: "end", order: 999 },
]

// StatusBar（纯 toolbar，无 Tab，无 Panel）
[
  { id: "cursor",   widget: "text", align: "start", order: 0,  props: { text: () => "Ln 42, Col 15" } },
  { id: "encoding", widget: "text", align: "end",   order: 10, props: { text: "UTF-8" } },
  { id: "language", widget: "text", align: "end",   order: 20, props: { text: () => ctx.context.get("editor.language") } },
]

// MenuBar（纯 toolbar，无 Panel）
[
  { id: "file", widget: "dropdown", align: "start", order: 0, props: { label: "File", menu: "app.file" } },
  { id: "edit", widget: "dropdown", align: "start", order: 1, props: { label: "Edit", menu: "app.edit" } },
  { id: "view", widget: "dropdown", align: "start", order: 2, props: { label: "View", menu: "app.view" } },
]
```

Panel 可动态注册自己的 toolbar item（激活时显示，切走时隐藏）。


## 4.3 内置 Tab Widget

三个内置 Tab 组件，区别只在 props 默认值：

| Widget id | 默认 props 差异 |
|-----------|----------------|
| `tab-standard` | `closeButton: 'hover', addButton: true, draggable: true` — 完整标签页 |
| `tab-compact` | `closeButton: 'never', minShowCount: 2` — 精简，单 Panel 时隐藏 Tab 栏 |
| `tab-collapsible` | `collapsible: true, closeButton: 'never'` — 点击激活 Tab 折叠/展开 Dock |

用户可以注册自定义 Tab Widget，放入 toolbar 即用。也可以直接用内置 Tab + 覆盖部分 props。

Tab Widget 接收的标准 props（按需取用）：

```typescript
interface TabWidgetProps {
  // 可见性
  minShowCount?: number      // Panel 数量 >= 此值时才显示 Tab 栏（默认 1 = 始终显示）
                             //   0 = 始终显示（含空 Dock）
                             //   1 = 始终显示（有 Panel 时）— 默认
                             //   2 = 两个及以上才显示
  singleStyle?:  'full' | 'plain' | 'static'
                             // 仅 1 个 Panel 时的 Tab 样式：
                             //   full = 完整标签（有背景框、可点击）— 默认
                             //   plain = 纯文字（无背景框）
                             //   static = 纯文字 + 不可点击

  // 按钮
  closeButton?:  'always' | 'hover' | 'never' | 'dirty'
                             // 关闭按钮的显示策略，默认 'hover'
  addButton?:    boolean     // 是否显示加号按钮（默认 false）

  // 行为
  collapsible?:  boolean     // 点击已激活 Tab 是否折叠 Dock（默认 false）
  draggable?:    boolean     // Tab 可拖出到其他 Dock（默认 true）
  reorderable?:  boolean     // Tab 可栏内拖拽排序（默认 true）

  // 溢出
  overflow?:     'scroll' | 'shrink' | 'dropdown'
                             // Tab 过多时的处理方式（默认 'scroll'）
}
```

**折叠逻辑：** `collapsible: true` 时，点击已经激活的 Tab → Dock 折叠（高度/宽度收缩到仅 toolbar），再点击任意 Tab → 展开并激活该 Panel。折叠状态存在 `DockNode.collapsed` 里，布局树记录。

**Tab ↔ Panel 数据绑定：** Tab 渲染时从 `PanelData` 读取 `title`、`icon`、`dirty`、`badge` 等字段。这些字段是响应式的——Panel 通过 `ctx.panel.setTitle()` / `ctx.panel.setDirty(true)` 修改，Tab 自动更新。典型场景：文件名改变 → title 变 → Tab 文字跟着变；文件未保存 → dirty = true → Tab 显示修改标记。

框架通过 WidgetContext 向 Tab Widget 注入数据和回调：

```typescript
// WidgetContext.dock — Tab Widget（及其他 toolbar Widget）可访问的 Dock 接口
interface WidgetContextDock {
  panels:       () => PanelData[]    // 响应式 Panel 列表
  activePanel:  () => string | null  // 响应式当前激活 Panel id
  collapsed:    () => boolean        // 响应式折叠状态

  activate(id: string):  void        // 激活指定 Panel
  close(id: string):     void        // 关闭指定 Panel
  add(type?: string):    void        // 添加新 Panel（默认 acceptPanels[0]）
  reorder(from: number, to: number): void  // 调整 Tab 顺序
  setCollapsed(v: boolean): void     // 设置折叠状态
}
```

Tab Widget 通过 `ctx.dock` 拿到一切所需数据，自行决定如何渲染。


## 4.4 Panel 注册表

使用者注册可用的 Panel 类型，Dock 菜单和 acceptPanels 过滤都读这个注册表：

```typescript
api.panels.register({
  type:         'code-editor',
  label:        'Code Editor',
  icon:         'file-code',
  category:     'editor',        // 菜单里按 category 分组
  defaultProps: {},
})

api.panels.register({
  type:         'terminal',
  label:        'Terminal',
  icon:         'terminal',
  category:     'tool',
})
```


## 4.5 Dock 菜单

三个点按钮（`dock-menu-button`）打开 Dock 级菜单：

```
Dock 菜单（三个点按钮）
  ├── 添加面板          ▸   所有已注册 Panel 类型（按 category 分组）
  │                          受 acceptPanels 过滤
  │                          acceptPanels[0] 标记为默认
  ├── 切换面板          ▸   当前 Dock 内已有的 Panel 列表
  │                          当前 activePanel 打勾
  │                          空 Dock 时 disabled
  ├── ──────
  ├── 显示模式          ▸   切换 Tab Widget 类型（standard / compact / collapsible）
  ├── 标签位置          ▸   top / bottom / left / right（修改 toolbarPosition）
  ├── ──────
  └── 布局              ▸   向右分割 / 向下分割 / 浮动 / 最大化 / 关闭 Dock
```

Tab 右键菜单（Panel 级，与 Dock 菜单分离）：

```
Tab 右键菜单
  ├── 关闭
  ├── 关闭其他
  ├── 关闭全部
  ├── ──────
  ├── 复制（同类型再开一个）
  └── 固定 / 取消固定（瞬态 ↔ 固定）
```


## 4.6 分割行为

```
角拖拽分割 → 新 Dock 克隆当前 Dock 的配置
  ├── 继承：preset、toolbar 配置、acceptPanels、toolbarPosition
  ├── 新建：新 id
  └── 内容：创建 acceptPanels[0] 类型的默认 Panel
             acceptPanels 为空 → 新 Dock 为空

菜单"向右/下分割" → 同上

拖 Tab 到五区域 → 中间：Panel 移入目标 Dock（受 acceptPanels 过滤）
                   上下左右：分割出新 Dock，继承目标 Dock 配置，Panel 移入
```


## 4.7 Dock 预设

预设是具名的配置模板，支持继承：

```json
{
  "presets": {
    "base": {
      "acceptPanels": [],
      "lru": { "max": 10 },
      "toolbarPosition": "top"
    },
    "editor": {
      "extends": "base",
      "acceptPanels": ["code-editor"],
      "toolbar": [
        { "id": "tabs", "widget": "tab-standard", "align": "start", "flex": 1, "order": 0,
          "props": { "closeButton": "hover", "addButton": true, "draggable": true } },
        { "id": "dock-menu", "widget": "dock-menu-button", "align": "end", "order": 999 }
      ]
    },
    "sidebar": {
      "extends": "base",
      "acceptPanels": ["file-explorer", "outline", "search"],
      "toolbar": [
        { "id": "tabs", "widget": "tab-compact", "align": "start", "flex": 1, "order": 0,
          "props": { "minShowCount": 2, "closeButton": "never" } },
        { "id": "dock-menu", "widget": "dock-menu-button", "align": "end", "order": 999 }
      ]
    },
    "statusbar": {
      "extends": "base",
      "maxHeight": 24,
      "acceptPanels": [],
      "toolbar": []
    }
  }
}
```

DockNode 引用 preset，局部字段可覆盖。


## 4.8 自适应密度

Dock 根据自身宽度自动切换密度，通过 ResizeObserver + Context 实现：

```
宽度 > 200px → normal（图标+文字）
宽度 120~200px → compact（截断文字）
宽度 < 120px → icon-only（纯图标）
```

Widget 通过 `ctx.context.get("dock.density")` 响应式读取，自动调整。


---


# 5. Panel

Panel 是内容单元，框架只管元数据和生命周期，具体内容由 Widget 实现。


## 5.1 数据结构

```typescript
interface PanelData {
  id:          string           // 全局唯一（nanoid 自动生成）
  widget:      string           // Widget 类型
  props:       any              // 透传给 Widget
  title:       string           // 响应式 — Panel 可通过 setTitle() 修改，Tab 自动同步
  icon?:       string           // 响应式 — 同上
  dirty?:      boolean          // 响应式 — 修改标记（Tab 显示 dot / 特殊样式）
  badge?:      number | string  // 响应式 — 角标（如未读数）
  description?: string          // 悬停提示文字
  transient?:  boolean          // 瞬态面板（单击打开，再单击别的会被替换）
}
```


## 5.2 生命周期（Signal 驱动）

不用记 7 个钩子的调用顺序。框架注入 signal，Panel 用 effect 响应：

```typescript
interface PanelContext {
  // 框架注入的响应式状态
  active:   () => boolean              // 是否是当前激活的 Panel
  size:     () => { w: number, h: number }  // Panel 尺寸
  visible:  () => boolean              // 是否可见（含 LRU 状态）

  // Panel 需要实现的
  getState():          object          // 序列化 UI 状态
  setState(s: object): void            // 恢复 UI 状态
  onClose(): Promise<'save' | 'discard' | 'cancel'>  // 关闭确认（dirty 时）

  // 框架能力 — 修改 PanelData 的响应式字段，Tab 自动同步
  setTitle(t: string): void
  setIcon(i: string):  void
  setDirty(d: boolean): void
  setBadge(b: number | string | undefined): void
}

// 实际使用
const CodeEditor: WidgetComponent = (props, ctx) => {
  // 相当于 onActivate / onDeactivate
  effect(() => {
    if (ctx.panel.active()) {
      editor.focus()
    }
  })

  // 相当于 onResize
  effect(() => {
    const { w, h } = ctx.panel.size()
    editor.layout({ width: w, height: h })
  })

  // 相当于 onDestroy
  onCleanup(() => editor.dispose())

  return h('div', { class: 'code-editor' }, ...)
}
```


## 5.3 瞬态面板

解决"打开 10 个文件标签栏就爆了"的问题：

```
单击文件 → 打开为瞬态（标签名斜体）
再单击别的文件 → 替换掉瞬态面板（不新增标签）
双击 / 开始编辑 → 瞬态变固定（标签名正体）

每个 Dock 最多一个瞬态 Panel。
```


## 5.4 LRU 缓存

- 激活过的 Panel 用 `content-visibility: hidden` 保留 DOM
- 超出 `lru.max` 后按最久未激活销毁，dirty 的跳过
- 销毁前调用 `getState()` 保存，重建后调用 `setState()` 恢复
- `lru.max = -1` 永不销毁（终端类 Dock 适用）


## 5.5 Overlay / Peek

在当前 Panel 上方临时浮出内容，不修改布局树：

```typescript
dock.overlay({
  widget: 'code-editor',
  props:  { filePath: 'bar.ts', line: 12 },
  anchor: { x: 200, y: 300 },  // 锚点位置
})
// Esc 关闭，Enter 跳转到完整视图
// 用于 Peek Definition、颜色选择器、自动补全
```


---


# 6. Widget 系统

一切可见 UI 的最小单元。按钮、输入框、Tab 栏、完整的编辑器面板，全部是 Widget。统一注册，按名字索引。


## 6.1 注册与使用

```typescript
// Widget 是纯函数
type WidgetComponent<P = any> = (props: P, ctx: WidgetContext) => HTMLElement

// 注册
widgets.register('button', Button)
widgets.register('my-plugin.timeline', MyTimeline)

// 使用（在 Dock 配置、Toolbar、Panel 的 widget 字段中填名字）
{ "widget": "button", "props": { "action": "file.save" } }
```


## 6.2 内置组件库

```
primitives/     Button, Input, Textarea, Select, Checkbox, Toggle,
                Slider, NumberInput, ColorPicker, Dropdown,
                ContextMenu, Tooltip, Badge, Separator, Spacer, Icon

display/        Label, Tag, ProgressBar, Spinner, Avatar, Image, CodeSnippet

layout/         Group, Stack, Grid, Scrollable, Collapsible, Divider

navigation/     Breadcrumb, TreeView, VirtualList, VirtualTree

overlay/        Modal, Popover, Toast, Dialog

dock/           TabStandard, TabCompact, TabCollapsible, DockMenu
```

每个组件独立文件，自定义 props，框架不约束。全部通过主题 CSS 变量控制样式。


## 6.3 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 内置 | kebab-case | `button`, `tab-standard` |
| 插件 | 命名空间.组件名 | `my-plugin.timeline` |


## 6.4 扩展

Widget 是纯函数，扩展通过高阶函数包装：

```typescript
const MyTimeline = (props, ctx) => {
  const base = Timeline({ ...props, fps: 60 }, ctx)
  return h('div', {},
    h('div', { class: 'my-toolbar' }, ...),
    base,
  )
}
```


---


# 7. 通信与快捷键


## 7.1 命令系统

"我要做某件事"——有明确意图，保证被处理，支持异步，可绑快捷键。

```typescript
// 执行
commands.execute("file.open", { path: "src/main.ts" })

// 注册（中间件链，显式 next() 才继续）
commands.register("file.open", async (args, next) => {
  if (!hasPermission(args.path)) throw new Error("denied")
  const result = await next(args)   // 不调用 = 拦截
  log("opened", args)
  return result
})

// 命令可用状态
commands.register("editor.format", {
  handler: async (args, next) => { ... },
  isEnabled: () => context.get("editor.hasSelection")
})
```


## 7.2 事件总线

"我做了某件事"——通知类，不保证被处理。

```typescript
bus.on("file.saved", ({ path }) => { ... })
bus.emit("file.saved", { path: "src/main.ts" })

// Dock 级总线（随 Dock 销毁自动清理）
dock.bus.on("selection.change", handler)
```


## 7.3 Context 系统

全局响应式 key-value store，供快捷键条件判断、Widget 动态行为、Panel 间数据共享使用：

```typescript
context.set("panel.widget", "code-editor")
context.get("editor.hasSelection")
context.on("editor.language", (val) => { ... })
```

内置 key：`panel.id`, `panel.widget`, `panel.dirty`, `dock.id`, `dock.density`, `editor.language`, `editor.hasSelection`, `editor.readOnly`, `theme.id`, `os`

插件 key 必须带命名空间前缀：`my-plugin.isConnected`

**Panel 间数据共享：Context 存标识和引用，不存数据体。**

```typescript
// ✅ 存轻量标识 — 可跨窗口同步（JSON 可序列化）
context.set("viewport.selection", { source: "viewport-1", ids: ["a", "b"], version: 3 })

// ✅ 存服务引用 — 同窗口内 Panel 直接调用（window-local，不跨窗口）
context.set("viewport.api", {
  getSelected: () => scene.getSelectedObjects(),
  highlight:   (ids) => scene.highlight(ids),
})

// ❌ 不要存大数据体
context.set("viewport.selectedObjects", [...hundredsOfObjects])
```

两条规则：
1. Context 保持轻量 — 存 id / 版本号 / 服务引用，消费者按需查询完整数据
2. 带函数引用的 key 是 window-local 的 — 不跨窗口同步（见 §3.5）


## 7.4 快捷键

```json
[
  { "key": "Cmd+S",           "command": "file.save",   "when": "panel.dirty" },
  { "key": "Cmd+W",           "command": "panel.close" },
  { "key": "Cmd+K Cmd+S",     "command": "keymaps.open" },
  { "key": "Cmd+Shift+Enter", "command": "dock.focusMode" }
]
```

优先级：Panel 级 > Dock 级 > 全局。`when` 对 Context 求值。用户自定义 merge 覆盖默认。


## 7.5 右键菜单

贡献注册制，不同插件向同一菜单 id 注册项，框架合并排序：

```typescript
api.menus.register({
  menu:    "tab.context",       // 目标菜单
  label:   "Close Others",
  command: "panel.closeOthers",
  group:   "close",             // 同组连续显示，组间分割线
  order:   20,
  when:    "dock.panelCount > 1",
})
```

内置菜单 id：`tab.context`、`editor.context`、`tree.context`、`dock.context`。


---


# 8. 主题与交互


## 8.1 两层 Token

```css
/* Primitive Token — 原始色阶，不直接使用 */
:root { --violet-500: #6c63ff; --gray-950: #0a0a0c; ... }

/* Semantic Token — 语义映射，Widget 只引用这层 */
[data-theme="dark"] {
  --color-bg-base:       var(--gray-950);
  --color-bg-surface:    var(--gray-900);
  --color-text-primary:  var(--gray-50);
  --color-text-secondary:var(--gray-400);
  --color-accent:        var(--violet-500);
  --color-border:        rgba(255,255,255,0.07);
  --color-interactive-hover:  rgba(255,255,255,0.06);
  --color-interactive-active: rgba(255,255,255,0.10);

  --shadow-sm: 0 1px 3px rgba(0,0,0,0.30), 0 1px 2px rgba(0,0,0,0.20);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.40), 0 2px 4px rgba(0,0,0,0.25);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.55), 0 4px 8px rgba(0,0,0,0.30);

  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --radius-sm: 3px; --radius-md: 5px; --radius-lg: 7px;
  --font-ui: "Geist", system-ui, sans-serif;
  --font-mono: "Geist Mono", monospace;
}
```

**主题切换与多窗口同步：adoptedStyleSheets**

```typescript
// 框架启动时创建 Constructable Stylesheets
const tokenSheet = new CSSStyleSheet()       // 主题 Token（Primitive + Semantic）
const componentSheets = [...]                 // 组件样式

tokenSheet.replaceSync(generateTokenCSS('dark'))
document.adoptedStyleSheets = [tokenSheet, ...componentSheets]

// 创建 Sub Window 时 — 直接共享同一个 StyleSheet 引用
subWindow.document.adoptedStyleSheets = [tokenSheet, ...componentSheets]

// 切换主题 — 修改一次，所有窗口同时生效
tokenSheet.replaceSync(generateTokenCSS('light'))
```

同源窗口间共享 CSSStyleSheet 对象引用。Main 修改 → 所有 Sub Window 立即生效，无需 BroadcastChannel 同步，零开销。


## 8.2 Spring 物理动画

替代 CSS ease-in/ease-out，中途打断时自然过渡：

```typescript
const height = spring(expandedHeight, {
  stiffness: 200, damping: 20, mass: 1
})

height.to(collapsedHeight)   // 弹簧动画到折叠
// 用户中途点展开 → height.to(expandedHeight) → 自然反弹
```

用于：Dock 折叠/展开、Focus Mode 进出、浮动 Dock 弹出、拖放释放归位。

拖拽跟手和分割线拖动**不用 spring**，必须零延迟。


## 8.3 交互状态

所有可交互组件统一四态，颜色由主题变量提供：

| 状态 | 视觉 |
|------|------|
| hover | 背景 `--color-interactive-hover`，80ms |
| active | 背景 `--color-interactive-active` + `scale(0.97)`，80ms |
| focus | `outline: 2px solid var(--color-accent); outline-offset: 2px` |
| disabled | `opacity: 0.38; pointer-events: none` |


## 8.4 视觉规则

- 阴影只表达层级：嵌入 Dock 无阴影，浮动 Dock L2，Modal L3
- 禁止 `filter: drop-shadow/blur`、`text-shadow`、`box-shadow spread > 0`
- 拖拽 ghost：`will-change: transform` + L3 阴影
- Tab 选中：底部 2px `accent` 实线，无阴影
- 所有 Dock/Panel 强制 CSS Containment：`contain: layout style paint`
- 不可见 Panel：`content-visibility: hidden`（零渲染开销）
- 尊重 `prefers-reduced-motion`


## 8.5 拖放系统

全部基于 PointerEvents（统一鼠标/触摸/笔），拖动阈值 4px 防误触。

**完整拖放场景：**

| 类型 | 触发 | 效果 |
|------|------|------|
| 角拖拽 | Dock 四角三角手柄 | 分割出新 Dock（§3.2）|
| 边拖拽 | 从共享边向邻居拖 | 合并 Dock（§3.2）|
| 分割线拖拽 | 拖共享边 | 调整 sizes（§3.4）|
| Tab 栏内拖拽 | 拖 Tab 在同一栏内 | 重新排序 |
| Tab 跨 Dock | 拖 Tab 到另一个 Dock | 五区域放置（§4.6）|
| Tab 脱离 | 拖 Tab 到空白区域 | 浮动 Dock / 独立窗口 |
| Tab 跨窗口 | 拖 Tab 到另一个窗口 | Panel 迁移（§3.5）|
| 外部文件拖入 | 从 OS 文件管理器拖入 | 触发 `file.drop` 命令 |

**反馈规则：**

```
Tab 拖拽：
  → 原 Tab 半透明 0.5
  → ghost 跟手（L3 阴影，will-change: transform）
  → 目标 Dock 高亮放置区域（accent 半透明蒙层）
  → Esc 取消：ghost 弹回原位（spring 动画）

分割线拖拽：
  → hover 时 accent 高亮
  → 拖动时全局 cursor 锁定
  → 智能吸附到 50%/33%/25% 等比例
```

**外部文件拖入：**

框架在最外层监听 `dragenter`/`dragover`/`drop`（浏览器原生拖放 API，非 PointerEvents），捕获 `DataTransfer.files` 后转发命令：

```typescript
commands.execute("file.drop", {
  files: FileList,         // 原生 FileList
  targetDock: string,      // 鼠标所在 Dock id
  zone: "center" | "top" | "bottom" | "left" | "right"
})
```

框架不决定如何处理文件——使用者注册 `file.drop` 命令处理器，决定接受哪些类型、创建什么 Panel。


---


# 9. 插件与配置


## 9.1 插件

```typescript
interface Plugin {
  id:       string
  version:  string
  requires?: string[]       // 依赖的插件 id
  activate(api: PluginAPI): void | Promise<void>
  deactivate(): void | Promise<void>
}

interface PluginAPI {
  widgets:  { register(name, component) }
  commands: { register(id, handler) }
  keymaps:  { register(bindings[]) }
  themes:   { register(theme) }
  menus:    { register(item) }
  bus:      EventBus
  context:  ContextSystem
  layout:   LayoutAPI
  config:   ConfigSystem
  i18n:     { register(locale, messages) }
  ai:       { context: AIContextBuilder, registerProvider(provider) }
  storage:  { get(key), set(key, val) }  // 插件私有存储
}
```

框架按依赖拓扑排序加载，activate 报错不阻塞其他插件。


## 9.2 配置

四层 merge，优先级从低到高：

```
框架默认 → 应用配置（createEditor 传入）→ 工作区配置 → 用户配置
```

```typescript
config.get('editor.tabSize', 2)           // 读
config.set('editor.tabSize', 4)           // 写（用户配置层）
config.on('editor.theme', (val) => ...)   // 监听
```


## 9.3 持久化

```
workspace.json    完整布局树 + Dock 配置（带版本号，格式升级用迁移脚本）
state.json        所有 Panel 的 getState() 结果
settings.json     用户配置
keymaps.json      用户快捷键
```

自动保存：操作后 2s 防抖 + 每 30s 定时 + 关闭时保存。走 idle 调度，不卡 UI。


## 9.4 FileSystem

框架定义统一接口，Panel 只依赖接口：

```typescript
interface FileSystem {
  readText(path): Promise<string>
  write(path, data): Promise<void>
  delete(path): Promise<void>
  rename(from, to): Promise<void>
  list(dir): Promise<FileEntry[]>
  stat(path): Promise<FileStat>
  watch(path, handler): Unsubscribe
  search(query): AsyncIterable<SearchMatch>
}
```

内置实现：MemoryFS（测试/demo）、BrowserFS（OPFS）。使用者可注入自定义实现（如 NodeFS、RemoteFS）。


## 9.5 AI

框架提供 Context 收集 + 通用 HTTP Provider（基于 fetch，兼容 OpenAI 格式）：

```typescript
// 内置 Provider：不到 100 行，纯 fetch + SSE 流解析
const provider = createHTTPProvider({
  baseUrl: "https://api.openai.com/v1",
  apiKey:  "sk-...",
  model:   "gpt-4o",
})

// 框架提供 Context 收集
const ctx = api.ai.context.build({
  include: ["selection", "activeFile"],
})

// 插件也可注册自定义 Provider
api.ai.registerProvider(myCustomProvider)
```

隐私：`excludePatterns` 在 Context 收集阶段过滤，匹配的文件内容不进入 AIContext。


## 9.6 i18n

```typescript
import { t, tn } from "@editor/i18n"

t("dock.close")                         // → "关闭"
t("file.opened", { name: "main.ts" })   // → "已打开 main.ts"
tn("file.count", 5)                     // → "5 files" / "5 个文件"
```

语言包按需加载，框架只打包默认语言。插件注册自己的翻译（key 带命名空间）。支持 RTL（CSS 逻辑属性）。


## 9.7 错误边界

每个 Panel 和 Widget 自动包裹错误边界。单个崩溃不影响其他组件：

```
Panel 崩溃 → 显示错误占位 UI（Reload / Close）
Widget 崩溃 → 显示 "!" 小图标替代
插件 activate 报错 → 跳过该插件，不阻塞启动
```


---


# 10. 工程规划


## 10.1 启动流程

```
createEditor(config)
  → Bootstrap    初始化核心系统（bus, context, commands）
  → Theme        应用主题 Token
  → Plugins      按依赖顺序加载插件
  → Layout       恢复布局树（workspace.json）
  → Ready        bus.emit("editor.ready")

每阶段失败都有降级：配置损坏用默认值，插件失败跳过，布局损坏用空布局。
```


## 10.2 createEditor API

```typescript
const editor = createEditor({
  container:  document.getElementById('app'),
  theme:      'dark',
  locale:     'zh-CN',
  plugins:    [gitPlugin, aiPlugin],
  layout:     { type: 'root', child: { type: 'dock', preset: 'editor' } },
  presets:    { ... },
  filesystem: new BrowserFS(),
  persistence: { adapter: 'localStorage', key: 'my-editor' },
})

await editor.ready()
editor.commands.execute('file.open', { path: 'src/main.ts' })
editor.dispose()   // 销毁
```


## 10.3 目录结构

```
src/
  reactive/           响应式核心（~250 行）
    signal.ts         signal / computed / effect / batch
    dom.ts            h() / list() / show()
    scheduler.ts      urgent / normal / idle
    spring.ts         spring 物理动画

  core/               框架核心
    editor.ts         createEditor 入口
    split-tree.ts     N 叉布局树（不可变 + 结构共享）
    dock.ts           DockNode 管理
    panel.ts          Panel 生命周期
    toolbar.ts        Toolbar 渲染
    command.ts        命令系统（中间件）
    event-bus.ts      事件总线
    context.ts        Context 系统
    keymap.ts         快捷键
    config.ts         四层配置
    menu.ts           右键菜单贡献
    drag.ts           拖放系统
    focus.ts          焦点管理
    persistence.ts    持久化
    error-boundary.ts 错误边界
    snap.ts           智能吸附

  theme/              主题
    tokens/           CSS Token 文件
    theme.ts          主题管理

  i18n/               国际化
    i18n.ts
    locales/

  widgets/            内置组件库
    primitives/
    display/
    layout/
    navigation/
    overlay/
    dock/
    register.ts

  filesystem/         文件系统
    types.ts          接口定义
    memory-fs.ts      MemoryFS
    browser-fs.ts     BrowserFS (OPFS)

  ai/                 AI（框架侧）
    types.ts          接口
    context-builder.ts
    http-provider.ts  通用 HTTP Provider

  plugin/             插件系统
    plugin.ts
    api.ts

  testing/            测试工具
    index.ts

  index.ts            公共导出
```


## 10.4 系统依赖关系

```
ReactiveSystem ──→ 无依赖（最底层）
     ↑
  所有 UI 渲染
     ↑
EventBus ──→ 无依赖
ContextSystem ──→ 无依赖
CommandSystem ──→ ContextSystem
KeymapSystem ──→ CommandSystem + ContextSystem
ThemeSystem ──→ 无依赖
SplitTree ──→ ReactiveSystem
DockNode ──→ SplitTree + ReactiveSystem
Panel ──→ DockNode + ReactiveSystem
WidgetSystem ──→ ReactiveSystem
PluginSystem ──→ WidgetSystem + CommandSystem
Persistence ──→ SplitTree + Panel
```


## 10.5 完整布局示例

一个 VS Code 风格编辑器的完整布局（MenuBar + 三列 + StatusBar）：

```json
{
  "type": "root",
  "child": {
    "type": "split",
    "direction": "vertical",
    "sizes": [0.03, 0.94, 0.03],
    "children": [
      {
        "type": "dock", "preset": "menubar", "maxHeight": 32,
        "panels": [], "activePanel": null,
        "toolbar": [
          { "id": "file", "widget": "dropdown", "align": "start", "order": 0, "props": { "label": "File" } },
          { "id": "edit", "widget": "dropdown", "align": "start", "order": 1, "props": { "label": "Edit" } },
          { "id": "view", "widget": "dropdown", "align": "start", "order": 2, "props": { "label": "View" } }
        ]
      },
      {
        "type": "split", "direction": "horizontal", "sizes": [0.2, 0.55, 0.25],
        "children": [
          {
            "type": "dock", "preset": "sidebar",
            "panels": [
              { "id": "p1", "widget": "file-explorer", "title": "Files" },
              { "id": "p2", "widget": "outline", "title": "Outline" }
            ],
            "activePanel": "p1"
          },
          {
            "type": "split", "direction": "vertical", "sizes": [0.7, 0.3],
            "children": [
              {
                "type": "dock", "preset": "editor",
                "panels": [
                  { "id": "p3", "widget": "code-editor", "props": { "file": "main.ts" }, "title": "main.ts" },
                  { "id": "p4", "widget": "code-editor", "props": { "file": "app.ts" }, "title": "app.ts" }
                ],
                "activePanel": "p3"
              },
              {
                "type": "dock", "preset": "bottom",
                "panels": [
                  { "id": "p5", "widget": "terminal", "title": "Terminal" },
                  { "id": "p6", "widget": "problems", "title": "Problems" }
                ],
                "activePanel": "p5"
              }
            ]
          },
          {
            "type": "dock", "preset": "sidebar",
            "panels": [
              { "id": "p7", "widget": "properties", "title": "Properties" }
            ],
            "activePanel": "p7"
          }
        ]
      },
      {
        "type": "dock", "preset": "statusbar", "maxHeight": 24,
        "panels": [], "activePanel": null,
        "toolbar": [
          { "id": "cursor", "widget": "text", "align": "start", "order": 0, "props": { "text": "Ln 1, Col 1" } },
          { "id": "encoding", "widget": "text", "align": "end", "order": 10, "props": { "text": "UTF-8" } },
          { "id": "language", "widget": "text", "align": "end", "order": 20, "props": { "text": "TypeScript" } }
        ]
      }
    ]
  }
}
```

注意 MenuBar 和 StatusBar 就是普通的 Dock，没有任何特殊处理。`maxHeight: 32/24` 锁死高度，空 panels，toolbar 里放文字和下拉菜单组件。
