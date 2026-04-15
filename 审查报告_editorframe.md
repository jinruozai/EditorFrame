# editorframe 项目审查报告（代码质量 / 安全 / UI·UX）

日期：2026-04-15  
审查范围：`/src`（框架与 UI 组件库）、`/tools`（构建脚本）、`/index.html`（Demo 入口）  
审查方式：静态阅读 + 规则扫描（Web Interface Guidelines）+ 关键路径抽样检查（交互/弹层/跨窗迁移）+ 构建与语法校验（Node）

---

## 1. 总体结论（简洁版）

项目在“零依赖、零构建、IIFE、单命名空间”的约束下，整体架构 **非常优秀且一致**：分层清晰、核心机制（不可变树 + runtime/render 分离 + detached DOM 激活）选择正确，代码风格整体克制。

但 **还不够“完美”**。存在以下必须修复问题，否则会影响“统一稳定健壮”和“优秀 UI/UX”目标：

### 必须修复（Must fix）
1) **Popover 的 outside-dismiss 逻辑存在跨浏览器不稳定点**：依赖全局 `event`（非标准），可能导致“点锚点 toggle”出现错误行为。  
2) **跨窗口迁移 `postMessage('*')` 且不校验 `origin`**：存在被导航/劫持后数据泄露、被错误消息驱动的风险。  
3) **基础可访问性能力不完整**：icon-only button、modal、toast、tooltip、select/combobox 缺少关键 ARIA/键盘/焦点管理策略，难以称为优秀 UI/UX。

---

## 2. 项目概览（架构与工程）

### 2.1 结构与技术栈
- 纯前端、零依赖、无 npm/无打包器：源文件为 IIFE，统一挂载 `window.EF`。
- 构建：`tools/build.mjs` 按依赖序拼接 `src/` → `dist/ef.js` 与 `dist/ef.css`（“cat with banner”）。
- 架构三层：Dock / Panel / Widget；Dock 布局树为不可变数据结构；Runtime 管生命周期与 detached DOM；Render 管 DOM 构建与 reconcile；Interactions 管拖拽/命中/视觉反馈。

### 2.2 构建与语法检查结果
- `node tools/build.mjs`：成功生成 `dist/ef.js`/`dist/ef.css`。
- `node --check dist/ef.js`：语法检查通过。

> 注：项目无 npm 依赖，因此“不存在依赖漏洞扫描”这类传统环节；风险集中于 DOM 注入面与跨窗口通信面。

---

## 3. 代码质量评估

### 3.1 优点（保持即可）
- **分层与职责边界清晰**：tree 纯函数（无 DOM）、runtime/render/interactions 拆分合理。
- **性能策略正确**：非 active panel detached DOM，避免隐藏但仍 layout/paint 的浪费；LRU 可选淘汰策略明确。
- **错误隔离模型好**：`EF.safeCall` + `EF.errors` 让用户 widget 的异常不会拉垮框架；`EF.bus` 对每个 handler 独立 safeCall，符合“互不信任插件”模型。
- **一致性较好**：IIFE 统一、命名空间统一、信号绑定与 cleanup 模型一致（`__efCleanups` + `ui.dispose`）。

### 3.2 主要问题（与“完美”差距）
#### A) 交互正确性出现“补丁式依赖”
popover 关闭逻辑在设计上应该是“可证明正确”的公共能力，目前出现对全局 `event` 的依赖，这是不稳定/不可移植的信号。

#### B) 可访问性未成为系统级约束
UI 库很多微交互打磨很到位，但 A11y（ARIA/键盘/焦点陷阱/aria-live）缺少统一规范与统一实现，容易在后续扩展中变成“到处补一点”。

#### C) 安全信任边界未被显式定义
跨窗口迁移属于“信任边界跨越”，必须显式限制 origin/消息类型/握手状态机，否则默认就是“任何窗口都能对你发指令/收数据”。

---

## 4. 安全审查（风险与隐患）

### 4.1 主要风险面
1) **跨窗口通信**（`postMessage`）：若 popup 被导航到非同源页面或被恶意脚本介入，存在敏感信息泄露与被驱动执行迁移流程的风险。  
2) **DOM 注入面**（`innerHTML`）：框架提供 `ui.h({ html })` 与 `codeInput` 的高亮注入点，必须明确“只接受可信 HTML”或提供安全封装策略（默认转义/严格白名单）。

### 4.2 未发现项（本次抽查范围内）
- 未发现 `eval` / `new Function`。
- 未发现 `onPaste preventDefault`（指南反模式）。
- 无服务端与鉴权/权限边界（项目为纯前端库），因此传统后端漏洞（SQLi/SSRF/IDOR）不在范围内。

---

## 5. UI/UX 与交互审查（按 Web Interface Guidelines）

结论：视觉与微交互表现优秀，但 **语义化与键盘/读屏体验不足**。

### 5.1 Must fix（基础无障碍）
- icon-only button 需要可访问名称（`aria-label`），仅 `title` 不够稳定。
- modal 需要 `role="dialog" aria-modal="true"`、标题关联、焦点陷阱与关闭后焦点恢复。
- toast 属于异步更新，需要 `aria-live="polite"` / `role="status"` 等播报机制。
- tooltip 需要键盘触发（focus/blur）并通过 `aria-describedby` 关联目标元素。
- 自定义 select/combobox 需要 `aria-expanded` / `aria-controls` / `role` 与统一键盘导航模型。

### 5.2 交互一致性
建议统一 overlay 的关闭与优先级（外部点击、ESC、嵌套弹层栈），避免各组件自行实现造成不一致与边角 bug。

---

## 6. 性能与流畅度（潜在热点）

### 6.1 潜在 layout-read 热点
存在多处 `getBoundingClientRect()`，其中一部分合理（拖拽/定位/测量），但需注意：
- 在 `pointermove` 中频繁读取 layout（例如角标 hover 计算）可能造成不必要的布局开销。

> 建议：将高频测量改为缓存、用 rAF 合帧、或尽量用事件自带坐标（例如 `offsetX/offsetY` 在合适场景下可替代）。

---

## 7. 整改清单（按优先级）

### P0 / 必须改（影响正确性/安全/可用性）
1) Popover outside-dismiss：移除全局 `event` 依赖；将事件对象贯通，正确忽略 anchor 点击；统一 toggle 行为。  
2) 跨窗口迁移安全收口：`postMessage` 使用明确 `targetOrigin` + receiver 校验 `ev.origin`；补充失败/超时/撤销路径。  
3) A11y 基座补齐：iconButton/modal/toast/tooltip/select/combobox 的 ARIA + 键盘 + 焦点策略系统化。

### P1 / 建议改（提升一致性与可维护性）
4) Overlay Controller：抽出统一的 overlay 栈与 dismiss/focus 管理内核，减少重复逻辑与边角 bug。  
5) 明确信号写入契约：组件若会写入 `value`，要求传入 WritableSignal（`.set` 存在）；只读展示组件允许 readonly signal。

### P2 / 可选优化（体验与细节）
6) 文案统一（省略号 `…`）与空状态/占位符策略统一（例如 `Select…`、`Add…`）。  
7) 进一步梳理高频测量点（drag/hover/placement），在不牺牲交互手感的前提下降低布局读。

---

## 8. 关键定位（file:line）

### 交互正确性（Popover）
- `src/ui/base/popover.js:33`：依赖全局 `event` 来判断锚点点击（非标准/不稳定）。  
- `src/ui/_internal/_floating.js:79-89`：`dismissOnOutside` 不传 event，导致上层只能“猜事件来源”。  

### 安全（跨窗口迁移）
- `src/dock/migrate.js:74-79`：`w.postMessage(..., '*')`。  
- `src/dock/migrate.js:98-103`：receiver 未校验 `ev.origin`。  
- `src/dock/migrate.js:108 / 126 / 155`：多处 `postMessage(..., '*')`。  

### DOM 注入面（需要明确信任边界）
- `src/ui/_internal/_signal.js:68`：`ui.h` 支持 `{ html }` → `innerHTML`。  
- `src/ui/editor/codeInput.js:121`：`highlightFn` 输出直接 `innerHTML`。  

### 可访问性缺口（抽样）
- `src/ui/base/iconButton.js:14`：icon-only 仅 `title`，缺少 `aria-label`。  
- `src/ui/overlay/modal.js:10-41`：缺少 dialog 语义与 focus trap/restore。  
- `src/ui/overlay/toast.js:27-56`：缺少 aria-live/status。  
- `src/ui/base/tooltip.js:26-33`：缺少 focus/blur 与 aria-describedby。  
- `src/ui/form/select.js:11-43`：自定义 select 缺少 aria-expanded/role/键盘模型。  
- `src/ui/form/combobox.js:15-51`：combobox 缺少 aria 与键盘模型。  

### 性能热点（抽样）
- `src/dock/render.js:156-167`：`pointermove` + `getBoundingClientRect()`。  

---

## 9. 结语

该项目“主体架构”已经达到很高水准；要达到“完美/统一/健壮/优秀 UIUX”，关键不是增加功能，而是**把 Overlay/A11y/跨窗信任边界这三块变成系统级约束**，避免零散补丁与边角风险。

