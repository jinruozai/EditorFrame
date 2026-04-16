# editorframe

纯前端、零依赖、零构建的 Blender 风格编辑器 UI 库。

- **零构建**:源码是 IIFE,`tools/build.mjs` 只是 `cat` —— 双击 `index.html` 即可运行
- **零依赖**:不用 npm / 打包器 / 框架,所有东西挂在 `window.EF` 下
- **三层架构**:Dock(布局容器)/ Panel(内容单元)/ Widget(UI 组件)
- **核心机制**:不可变 N 叉分割树 + 约 70 行响应式 signal + 按 dock id 的 keyed reconciliation
- **完整能力**:split / merge / 跨 dock 拖放 / pop-out 独立窗口 / LRU dispose / focus mode / 两段 toolbar

---

## 快速开始

### 方式一:直接双击

```
git clone https://gitee.com/lazygoo/editor-frame.git
cd editor-frame
open index.html   # 或者 Windows 双击,Linux xdg-open
```

`dist/ef.{js,css}` 是已提交的产物,无需任何构建步骤。

### 方式二:本地 dev server(推荐)

```
npx http-server -p 5570
# 浏览器访问 http://localhost:5570
```

### 方式三:修改源码 + watch 构建

```
node tools/build.mjs --watch
```

`src/` 下的源码变动会自动重新拼接到 `dist/ef.{js,css}`;刷新浏览器即可看到效果。**只改 `demo/` 下的文件不需要 rebuild**(demo 是 `<script>` 直接加载的)。

---

## 最小使用示例

```html
<!DOCTYPE html>
<link rel="stylesheet" href="./dist/ef.css">
<div id="app" style="width:100vw;height:100vh"></div>
<script src="./dist/ef.js"></script>
<script>
  // 1. 注册一个 widget
  EF.registerWidget('hello', {
    create: function (props, ctx) {
      const el = document.createElement('div')
      el.style.padding = '16px'
      el.textContent = 'Hello from ' + (props.who || 'widget')
      return el
    },
  })

  // 2. 构造布局树
  const { createDockLayout, dock, split, panel } = EF
  const tree = split('horizontal', [
    dock({
      name: 'left',
      toolbar: { direction: 'top', items: [{ widget: 'tab-standard' }] },
      panels: [ panel({ widget: 'hello', title: 'Hello', props: { who: 'A' } }) ],
    }),
    dock({
      name: 'right',
      toolbar: { direction: 'top', items: [{ widget: 'tab-standard' }] },
      panels: [ panel({ widget: 'hello', title: 'World', props: { who: 'B' } }) ],
    }),
  ], [0.5, 0.5])

  // 3. 挂载
  const layout = createDockLayout(document.getElementById('app'), { tree: tree })

  // 4. 运行时可编程
  layout.addPanel('left', { widget: 'hello', title: 'New', props: { who: 'C' } })
</script>
```

---

## 项目结构

```
src/
  core/        signal / errors / bus / registry / context
  tree/        不可变 N 叉分割树 + 所有纯函数写接口
  dock/        runtime / render / interactions / panel-drag / migrate / layout
  style/       theme.css(三层 token)+ 各模块 CSS
  ui/          _internal / base / form / editor / container / data / overlay / panel

demo/          组件浏览器 demo(catalog + state + 5 个 panel widget)
dist/          已提交的 bundle 产物(ef.js + ef.css)
tools/
  build.mjs    零构建的载体 —— `cat` with banners
doc/
  editor_style.html   视觉调色板参考
```

`index.html` 是 demo 入口;`createDockLayout` 是 API 入口(见 `src/dock/layout.js`)。

---

## 内置能力

**布局**:
- Dock / Split(N 叉)/ Panel 三层
- 角拖出 split / 边缘拖 merge(dirty panel 有保护)
- Splitter 拖拽调整比例
- Focus mode(`position:fixed` 铺满)、Collapsed(CSS `display:none`)
- Transient(预览槽)语义:`addPanel(..., { transient: true })` 自动驱逐同 dock 旧的 transient

**Panel**:
- 多 panel + 同时只有一个 active(非 active 的 DOM 完全 detach,零 layout / 零 paint)
- 跨 dock 拖放(内部走 detach + re-attach,不重建 widget)
- Pop-out 独立窗口(BroadcastChannel + `serialize` / `deserialize`)
- LRU dispose(`lru.max = N`;dirty panel 永不被淘汰)
- Accept 白名单(`dock.accept = ['xxx']`,同时约束拖放和 addPanel)

**Widget / UI 组件库**(`EF.ui.*`,50+ 个):
- **Base**:button / iconButton / icon / tooltip / popover / kbd / badge / tag / spinner / divider
- **Form**:input / textarea / numberInput / vectorInput / slider / rangeSlider / checkbox / switch / radio / segmented / select / combobox / colorInput / enumInput / tagInput / tab
- **Editor**:gradientInput / curveInput / codeInput / pathInput / fileInput
- **Container**:section / propRow / card / scrollArea / tabPanel
- **Data**(全部虚拟化):list / tree / table / breadcrumbs / progressBar
- **Overlay**:menu / modal / drawer / alert / toast(焦点陷阱 + LIFO 栈 + 统一 portal)

全部基于 caller-owned `value: signal<T>` 的"信号优先"设计,组件不持有自己的 state。

**主题 / 配置**:
- `src/style/theme.css` 三层 token:原子色 → 角色色 → 组件 token
- 三套内置主题(`documentElement[data-ef-theme]` 切换):
  - **Dark(默认,无属性)** —— Godot Minimal 风:`#272727` 中性炭灰 + `#569eff` 冷蓝 accent,"inset 输入框"(字段比面板更深)
  - **Dracula**(`data-ef-theme="dracula"`) —— 更冷调的深灰 + `#7b6ef6` 紫,"raised 输入框"(字段比面板更亮)+ 更深阴影
  - **Light**(`data-ef-theme="light"`) —— 白面板 + 浅灰 inset 字段 + `#5b4ee0` 深紫 accent
- 所有可调数值(drag 阈值、动画时长、z-index、图标字符)都是 `--ef-*` CSS 变量。JS 侧通过 `EF.ui.readNum(name, fallback)` 读取,换主题 / 换图标集只改 theme.css 一份

---

## 开发规范(摘要)

完整规范见 [`CLAUDE.md`](./CLAUDE.md) —— 本文件是项目的唯一设计权威。

- **零 ES modules**:所有源文件是 IIFE,挂 `window.EF`
- **不写应用级快捷键**:本库只暴露 API(如 `ctx.dock.toggleFocus()`),由调用方决定绑不绑键
- **不写防御性代码**:框架内部相互调用是受信任契约;用户 widget 边界才用 `safeCall` 包裹
- **不写自动化测试**:验证靠 `index.html` demo + DevTools
- **改 `src/` 必须 rebuild**:`node tools/build.mjs` 重新生成 `dist/`
- **Widget 引用永远是 string**:`panel.widget` / `toolbarItem.widget` 必须是已注册名;tree 严格 JSON 可序列化

---

## 许可

内部项目。

---

## 更多阅读

- [`CLAUDE.md`](./CLAUDE.md) —— 设计文档 / 架构决策 / 数据模型 / 实现顺序(唯一设计权威)
- [`doc/editor_style.html`](./doc/editor_style.html) —— 视觉调色板参考
