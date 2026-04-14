# editorframe — Claude 工作交接

> 这个文件是给 Claude 看的项目状态说明,任何新的 Claude 会话开始前都必须读完。
> 用户在不同电脑之间切换工作环境,本文件保证上下文不丢失。

---

## 1. 项目是什么

**editorframe** —— 一个纯前端、零依赖、Blender 风格的通用编辑器 UI 库。

- **零构建**:经典 `<script>` 标签,直接 `file://` 双击 `index.html` 就能跑
- **零依赖**:不用 npm,不用打包工具,不用任何框架
- **单命名空间**:所有东西挂在 `window.EF` 下
- **三层架构**:Dock(布局容器)/ Panel(内容单元)/ Widget(UI 组件)
- **核心机制**:不可变 N 叉分割树 + 自研 ~70 行响应式 signal + 按 dock id 的 keyed reconciliation

完整设计规格见 `doc/DESIGN.md`(权威文档,本 CLAUDE.md 与它如有冲突以与用户已确认的为准)。

---

## 2. 硬规则(不可违反)

这些是和用户多次对话后确立的红线,违反会让用户失望。

### 2.1 零内置快捷键
**框架代码绝对不许 `addEventListener('keydown', ...)`**。
我们是通用库,不是某个特定的编辑器应用。Focus Mode、关闭 panel、切换 tab、命令面板……所有"可能有快捷键"的功能都只暴露 API(例如 `ctx.dock.toggleFocus()`),由调用方决定怎么绑键。Demo 里可以演示一种绑法,但绝不写进 `src/`。

### 2.2 零构建、零模块系统
**不许用 ES modules,不许引入打包工具,不许写 `import/export`。**
所有源文件都是 IIFE,挂载到 `window.EF`:
```js
;(function (EF) {
  'use strict'
  // ...
  EF.something = something
})(window.EF = window.EF || {})
```
HTML 用 `<script src="...">` 按依赖顺序加载。用户必须能双击 `index.html` 直接看到运行效果。

### 2.3 设计先行(Design-First)
**任何非平凡的改动,先写计划,等用户明确说"开始"再动代码。**
顺序:
1. 列数据模型 / 文件清单 / API 表面 / 与 `doc/DESIGN.md` 的偏差
2. 列出待决问题并明确请用户拍板
3. 用户回复后修订计划,可能多轮
4. 用户回复"开始" / "go" / "确认开始"才动代码

用户在动代码之前更正过设计方向多次。如果你跳过这一步直接动手,会浪费工作量。当用户说"先不着急改代码"或类似的话,意思就是只设计不写代码。

### 2.4 一个独立功能一个文件
独立的功能单元住在独立的文件里。`src/` 下用子目录把相关关注点分组(`core/`、`tree/`、`widgets/`、`dock/`、`style/`)。不要把 6 个不相关的概念塞进一个 800 行的文件。但也不要把 30 行的"焦点模式"硬拆出去 —— 见 § 5 的目录方案。

### 2.5 不写防御性代码
框架内部相互调用是受信任的契约,不需要 try/catch、null 检查、参数兜底。**只有在用户 widget 调用边界用 `safeCall` 包裹**(因为用户代码可能抛错)。不为不可能发生的情况写代码。

### 2.6 不擅自加功能
- 没让你做的功能不要做("顺手清理一下"、"加点配置项"、"补个 docstring"全都不要)
- 没让你重构的代码不要重构
- 修 bug 时不连带改无关代码
- 不在没改的代码上加注释 / 类型 / 文档
- 不为假想的未来需求做准备

### 2.7 不擅自破坏性操作
不未经允许:`git push --force`、`git reset --hard`、删文件、改 git 配置、`--no-verify`。

---

## 3. 当前代码状态(已实现)

目录:
```
editorframe/
  index.html          # demo,验证 keyed reconciliation 的 input + 计数器
  src/
    signal.js         # 响应式核心 ~80 行(signal/effect/batch/onCleanup)
    tree.js           # 不可变分割树 + 纯函数操作 ~190 行
    dock.js           # 渲染器 + Blender 交互 + keyed reconciliation ~340 行
    dock.css          # 样式 ~170 行
  doc/
    DESIGN.md         # 完整设计规格(权威)
    editor_style.html # 视觉 token 调色板参考
```

**已实现的能力:**
- 不可变 N 叉树:`dock` / `split` 节点,纯函数 `findDock` / `getAt` / `replaceAt` / `removeAt` / `resizeAt` / `splitDock` / `mergeDocks` / `swapDocks`
- 响应式核心:`signal` / `effect` / `batch` / `onCleanup`,带依赖追踪
- Dock 渲染 + Blender 三种交互:
  - 拖拽 splitter 调整尺寸(直接改 flex,pointerup 才提交到 signal,零重绘延迟)
  - 角拖向内 → split(产生新的空 dock)
  - 角拖向外到邻居 → merge(只允许直接兄弟,Blender-correct)
- **Keyed reconciliation by dock id**:tree 变化时只重建 split 框架,所有 dock element 通过 `data-dock-id` 复用,内部 panel 状态(input 文字、Monaco 编辑器、canvas 等)完全保留
- 3×3 网格 hover:鼠标进入 dock 的角落格子时才显示对应的三角形把手
- 拖拽时的 overlay preview(分割线 / merge 高亮)

**目前还没有的(v1 要做的):**
- Panel 系统(目前 dock 直接 `renderPanel(node)` 渲染整个内容,没有多 panel / 切换概念)
- Toolbar
- Tab widget
- 错误处理系统
- Widget 注册表
- LRU、Transient、Focus Mode、Collapsed
- (跨窗口、Tab 拖拽 → v2,本轮不做)

---

## 4. v1 已确认的设计决策(全部要遵守)

这些是和用户反复讨论后定下的,**不要再改**。如果觉得某条不对,先问用户,不要自作主张。

### 4.1 Split 角拖语义
角拖产生的新 dock,初始 panel **不是来源 dock active panel 的状态克隆**,而是:
- 同样的 widget 类型
- 用 widget 注册表的 `defaults()` 拿默认参数
- 全新 panel id

也就是说,如果 active panel 是一个打开了 `foo.ts` 的 monaco 编辑器,新 dock 出来的是一个**空白的** monaco 编辑器,不是另一个打开 `foo.ts` 的副本。这正好对齐 Blender 的语义(分割 area 后两半都是同类型编辑器但状态独立)。

### 4.2 Merge 语义
合并时**直接吞并**,被吞 dock 的所有 panels **直接丢弃**。winner dock 保持自己的 panels 和 active 不变,只是面积扩大。这是 Blender-correct 的 —— merge 不是数据合并,是几何吞并。

### 4.3 LRU
- 默认 `lru.max = -1`(永不淘汰)
- 配置后:激活过的 panel 用 `content-visibility: hidden` 留在 DOM,超出上限后按最久未用淘汰
- dirty panel 永不淘汰
- 淘汰前调 widget 的 `getState()` 序列化,重建后 `setState()` 恢复
- v1 把骨架搭好,真实序列化协议跑通就行,不用搞极致优化

### 4.4 Transient Panel
**仅 API 层支持**,不做双击 / 编辑触发的自动升级:
- `addPanel(tree, dockId, panel, { transient: true })` —— 标记瞬态
- `ctx.panel.promote()` —— widget 主动升级为常驻
- Tab 上瞬态 panel 标题用斜体显示
- 不监听双击事件,不监听编辑事件

### 4.5 Focus Mode
**仅 API 层支持**,纯 CSS 切换:
- `ctx.dock.toggleFocus()` / `ctx.dock.setFocus(bool)`
- 实现:给 dock 加 `data-focused` 属性,CSS `position:fixed; inset:0; z-index:100`
- **绝不绑任何快捷键**(参见 § 2.1)

### 4.6 Tab Widget
三个内置 tab widget,**实现是同一个组件 + 三套预设默认 props**(不要写三份代码):
| Widget | 关键默认 props |
|---|---|
| `tab-standard` | `closeButton:'hover', addButton:true, draggable:true, reorderable:true` |
| `tab-compact` | `closeButton:'never', minShowCount:2`(单 panel 时 tab 栏隐藏) |
| `tab-collapsible` | `collapsible:true`(点击已激活 tab 折叠/展开整个 dock) |

第一版 tab widget **不做拖拽**(reorder / drag-out 都是 v2)。
第一版 close 按钮支持 `'hover' | 'never'` 两种值。

### 4.7 错误处理系统
统一的错误处理 + panel 错误隔离:
- `EF.errors`:`signal([])`,每条 `{ id, time, source: { dockId, panelId, widget }, error, message, stack }`
- `EF.reportError(source, err)` / `EF.clearErrors()` / `EF.dismissError(id)`
- `EF.safeCall(source, fn)`:try/catch 包裹,失败 push 到 errors 并返回 `null`
- 所有 widget factory / getState / setState / dispose 的调用都走 `safeCall` 包裹
- 单个 panel 出错只显示红色错误框,**不影响其他 panel**
- 内置 widget `error-log`:订阅 `EF.errors` 渲染错误列表,用户可以把它放进任何 dock 当 "Problems" 面板用

### 4.8 Widget 注册表
- `EF.registerWidget(name, factoryOrSpec)`
  - factory 形式:`function(props, ctx) { return DOM }`
  - spec 形式:`{ create, defaults?, getState?, setState?, dispose? }`
- `EF.resolveWidget(nameOrFn)`:string 查表;function 直接当 factory
- `EF.widgetDefaults(nameOrFn)`:返回 `{ title?, icon?, props? }` 或 `{}`
- widget 字段在配置里**同时接受 string 和 function**

### 4.9 PanelData 与 PanelRuntime 分离
- **PanelData**:住在 tree 里的纯数据,可以 JSON 序列化:
  ```
  { id, widget, title?, icon?, dirty?, badge?, props?, transient? }
  ```
- **PanelRuntime**:住在 dock 内部 `Map<panelId, runtime>`,框架的运行时包装:
  ```
  {
    data,                // PanelData 引用
    title, icon, dirty, badge, transient, active, size,  // 全是 signal
    contentEl,           // HTMLElement | null,懒创建
    ctx,                 // WidgetContext
    lastActiveTime,      // for LRU
  }
  ```
- contentEl 是 PanelRuntime 的一个字段,**不是单独的"第三层"**。我之前文档里画的 Level 2 / Level 3 是讲生命周期差异:runtime 在 panel 加入 dock 时就建,contentEl 在第一次 activate 才建(懒创建,允许 add 一堆 panel 不付出构造代价)。

### 4.10 单 dock 单 toolbar
**Toolbar 是 dock 的属性,不是 panel 的属性。**
- 一个 dock 永远只有 1 条 toolbar,在 4 个方向(top/bottom/left/right)选 1 个
- 切换 active panel 时 toolbar 不重建
- toolbar 上的 tab widget 通过订阅 `dock.panels` 和 `dock.active` 信号自动更新
- panel 想要自己的工具栏(如 minimap 开关)是 panel content 内部的事,与 dock toolbar 无关

### 4.11 Toolbar 不写时
toolbar 字段为空数组或不写时,**完全不渲染** toolbar 区域,content 占满整个 dock。**不要默认插入** `tab-standard`。

### 4.12 activePanel 为 null 时
content 区域**留空**(空 div)。不显示提示文字,不让用户传 emptyContent 渲染器。

### 4.13 v2 才做的(本轮明确不做)
- 跨窗口(BroadcastChannel + sub window + 序列化迁移)
- Tab 拖拽(同 dock reorder + 跨 dock 移动 + 跨窗口移动)
- Transient 双击升级、编辑升级
- Overlay / Peek
- 命令系统、菜单系统、主题切换

---

## 5. v1 目标目录结构

```
editorframe/
  index.html
  CLAUDE.md            # 本文件
  doc/
    DESIGN.md
    editor_style.html

  src/
    core/
      signal.js        # 响应式核心:signal / effect / derived / batch / onCleanup
      errors.js        # 全局错误信号 + reportError + safeCall

    tree/
      tree.js          # 不可变树节点 + 所有纯函数(无 DOM)

    widgets/
      registry.js      # registerWidget / resolveWidget / widgetDefaults
      context.js       # WidgetContext 工厂(panel + dock 接口构造)
      tab.js           # 单 tab 组件 + 三套预设(standard/compact/collapsible)
      error-log.js     # 内置 error-log widget

    dock/
      runtime.js       # PanelRuntime + activate/LRU/transient/focus/collapsed
      render.js        # reconcile / build / createSplit / createDock / createToolbar
      interactions.js  # splitter drag + corner drag + 3×3 hover
      layout.js        # createDockLayout 入口胶水

    style/
      dock.css         # dock / split / splitter / corner / overlay / focused / collapsed
      widget.css       # toolbar / tab / error-log / panel-error
```

**`<script>` 加载顺序**(依赖自顶向下,无环):
```html
<script src="./src/core/signal.js"></script>
<script src="./src/core/errors.js"></script>
<script src="./src/tree/tree.js"></script>
<script src="./src/widgets/registry.js"></script>
<script src="./src/widgets/context.js"></script>
<script src="./src/dock/runtime.js"></script>
<script src="./src/dock/render.js"></script>
<script src="./src/dock/interactions.js"></script>
<script src="./src/dock/layout.js"></script>
<script src="./src/widgets/tab.js"></script>
<script src="./src/widgets/error-log.js"></script>
```

**行数预算**(每个文件目标上限,超了反思粒度切错没):

| 文件 | 上限 |
|---|---|
| core/signal.js | 100 |
| core/errors.js | 80 |
| tree/tree.js | 400 |
| widgets/registry.js | 60 |
| widgets/context.js | 80 |
| widgets/tab.js | 300 |
| widgets/error-log.js | 80 |
| dock/runtime.js | 250 |
| dock/render.js | 250 |
| dock/interactions.js | 300 |
| dock/layout.js | 80 |
| style/dock.css | 250 |
| style/widget.css | 200 |

---

## 6. v1 实现顺序(增量可验证)

1. **Phase 1 — 核心数据层(无 UI)**
   - `core/signal.js`:加 `derived`
   - `core/errors.js`:全局错误系统
   - `tree/tree.js`:扩展 panels/toolbar/lru/collapsed 字段 + 所有新纯函数(`addPanel` / `removePanel` / `activatePanel` / `movePanel` / `reorderPanel` / `updatePanel` / `promotePanel` / `updateDock` / `setCollapsed`),修正 `splitDock` 和 `mergeDocks`
   - `widgets/registry.js`、`widgets/context.js`
   - 阶段验证:console 跑几次纯函数,对结构断言

2. **Phase 2 — Dock 渲染重构**
   - `dock/runtime.js`:PanelRuntime 生命周期 + activate 切换 + LRU 骨架 + focus/collapsed/transient 状态
   - `dock/render.js`:toolbar 渲染 + dock body + content 区域 + 复用现有 keyed reconciliation
   - `dock/interactions.js`:从现 dock.js 抽出 splitter/corner drag,split 角拖时按 4.1 克隆默认参数
   - `dock/layout.js`:`createDockLayout` 入口
   - 阶段验证:demo 能看到多 panel + tab 切换

3. **Phase 3 — Tab Widget**
   - `widgets/tab.js`:单组件 + 三套预设默认 props
   - 阶段验证:三种 tab 样式都能用,collapsible 折叠正常

4. **Phase 4 — 错误隔离**
   - `widgets/error-log.js`:错误列表 widget
   - 在 demo 里注册一个 buggy widget,验证抛错只影响那一个 panel,error-log 能看到

5. **Phase 5 — Demo 收尾**
   - `index.html`:注册 monaco-fake / preview-fake / terminal-fake / buggy 几个假 widget
   - 多 dock 配多 panel,演示 Focus / Collapsed / Promote Transient 按钮
   - 验证 Split 克隆语义(角拖出新 dock 是默认参数的同 widget)

---

## 7. 与用户协作的方式

- **用户用中文**,你也用中文回复
- **简洁优先**,不要长篇大论解释你"打算怎么做",直接给方案
- **不要在每条回复末尾总结你刚刚做了什么**,用户能看 diff
- **不要无脑同意**,有更好的方案要直说,但要给充分理由
- **拿不准就问**,用户喜欢明确的开放问题清单,不喜欢含糊的"差不多吧"
- **遇到设计冲突时,以用户已确认的为准**,即使和 `doc/DESIGN.md` 不一致也以用户为准
- **每个 commit 都要 Co-Authored-By: Claude**,但不要在 commit message 里写"我"或自我吹嘘

---

## 8. 上次会话结束时的状态

- 已经把 v1 计划反复打磨完成(本文 § 4 - § 6)
- 用户已确认所有设计决策
- 用户已确认目录结构 + 行数预算
- **下一步等用户回复"开始"就动手**,从 `src/core/signal.js` 起按 § 6 的 Phase 顺序实现
- 没有任何代码动过,目前 `src/` 下还是初始的 signal/tree/dock/dock.css 老结构

晚安 👋
