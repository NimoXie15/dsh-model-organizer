# 开发笔记

面向改这个插件的人。用户文档在 [README.md](./README.md)。

## 升级 DSH 后座位凭空消失？先查服务名

cordis 的 `ctx.inject([...])` **只要有一个服务永不出现，回调就永远不执行** —— 不报错、不打日志。所以服务改名会让整个座位静默消失。

已发生一次：0.1.7 把客户端设置镜像服务 `settingsScope` 改名为 `configForms`（提供者仍是 `@deepseek-ai/dsh-client-ui-settings`，`describe()` 返回同一个 mirror）。设置页浮窗因此消失，而输入框菜单照常（它注入的 `slots/modelDirectories/sessions` 没变）。

`apply()` 里同时注入两个名字，一次性标志保证只挂载一次：

```js
ctx.inject(["slots", "configForms", "remote", "remote.settings"], (s) => mountOrderPanel(s, s.configForms.describe()));
ctx.inject(["slots", "settingsScope", "remote", "remote.settings"], (s) => mountOrderPanel(s, s.settingsScope.describe()));
```

**规律**：升级后座位不见了，第一件事是去新版 `dsh-client-ui-*` 包里 grep 自己注入的每个服务名。

## 座位的失败模式（决定了代码结构）

- **条目渲染时抛错 → 被静默弃权，官方内置 UI 自动回填**，界面上没有任何提示。
- **座位注册本身失败 → 该座位静默消失**，其它功能不受影响。
- 所以：每个座位注册各套一层 `guard`（失败只记 warn，不拖垮插件）；组件外套 `PanelBoundary`（把抛错变成页面上的一行红字，而不是"凭空消失"）。
- **顶层 `inject` 必须列全座位 standardProps 会读的每个服务**（本插件：`locale, slots, sessions, remote, remote.session, remote.settings`）。少一个 → 渲染抛 `cannot get property "..." without inject` → 弃权。用 `remote.settings.mutate` 必须显式声明 `remote.settings`。
- `single` 座位在**同一优先级已有注册**时会直接抛错。不写 `priority` 时，运行时会为非 chain 座位自动分配一个唯一的优先级（后注册的更低，渲染时胜出），所以只有显式写了撞车的 `priority` 才会抛。
- 未声明的局部变量（`ReferenceError`）同样会导致弃权，表现就是"整个面板不见了"。

## 与官方模块的耦合

- **官方 CSS-module 类名靠运行时解析**：锚定只有该模块才有的类名，并用第二个类名（如 `_optionCopy`）校验；解析失败退回内置回退样式（功能可用、外观降级）。**某个类名在新版被删掉时要按类探测**（见 `hasGroupSection`）——盲拼出来的类名在样式表里根本不存在，连回退样式都拿不到。
- **官方菜单规则长期缺 `background` 和 `border-radius`**：0.1.7-rc.1 的构建把这两条属性丢了（源码里是 `var(--dsw-specific-menu)` 和 `16px`），0.2.0-rc.1 依旧如此、类名 hash 还是 `_7KE1Ra`，官方菜单本身仍是全透明+直角。本插件不依赖那条规则：运行时从 `document.body` 解析 `--dsw-specific-menu` 内联补上背景，并补 `var(--dsw-radius-lg)` 圆角。
- **0.2.0 起 `--dsw-specific-menu` 变成半透明**（=`--dsw-menu-surface-fill`，浅色 `#f8f9fa94` / 深色 `#43454a73`）。官方菜单的"磨砂"其实是 **`MenuSurface` 原语**的 material 层：半透明填充 + `--dsw-menu-backdrop-filter` 模糊；`_menu` 类只管几何（且长期缺 background）。只把 token 内联当背景、没有模糊，观感是"透"而不是"磨砂"——composer 菜单已改走 `MenuSurface`，内联 token 只作为原语缺失时的回退。**任何新浮层照同一配方**（浮窗 `S.floatPanel` 与设置页选模型弹窗 `S.pickCard` 都是）：`background: color-mix(in srgb, var(--dsw-specific-menu, #26262a) 50%, transparent)` + `backdrop-filter: var(--dsw-menu-backdrop-filter, blur(28px) saturate(1.6))`；漏了 backdrop-filter 或直接用 token，弹窗就是半透明的。
- **composer 菜单的层级跟官方 `ModelSelect` 对齐**：根层 = 「模型 / 推理等级」两个 cell，各 drill 进自己的列表；「模型」层放本插件的改进（供应商分组、可折叠、按保存顺序），「推理等级」层是官方样式的单选列表。无返回行（官方就没有）：Esc 逐层返回，选中或点外部关闭。↑/↓ 在当前层循环移焦点，drill/返回时焦点交接（进层聚焦首行或搜索框，回根层聚焦首 cell）。搜索框（rc.2+）也照搬：>4 个模型才出现、`rankByName` 排序、清除按钮回焦输入框、搜索时强制展开全部分组；rc.1 的样式表没有 search 类，解析器以 `hasSearchRow` 探测，没有就不渲染。**portal 必须作为根 div 的 React 子节点**（合成事件沿 React 树冒泡而非 DOM 树），否则菜单内的 ↑/↓ 收不到。
- **0.2.0-rc.2 的 CSS hash 从 `_7KE1Ra` 变为 `_wq12jW`**（新增 search 类所致），`.menu` 规则逐属性未变——运行时解析不受影响，但别在任何地方硬编码 hash。
- **选择失败走官方 Toast**（`P.Toast`，`text/icon/anchor/onDone`）报错，不静默；select 面具把 `RemoteResult.error` 透传给组件。**设置页卡片顺序用 CSS `order` 镜像**（`.rows` 本就是 flex column）：卡片 DOM 里没有供应商标识，按 `rowName` 文本↔`displayName` 匹配，同名供应商会歧义；镜像锚在 seat 原位的隐藏标记上，MutationObserver 兜底卡片增删。**未匹配的卡片（官方供应商、添加草稿）刻意钉在最前**：给它们写空 `order`（默认值 0）而不是 `1000+`，既排在已配置供应商之前，又顺手清掉历史脏值。观察器盯的是**容纳列表的区段容器**、而不是列表本身——列表会被 React 整体替换，盯它就会在替换后失效；另加 rAF + 300ms 两次兜底，覆盖首屏卡片晚到的那一趟。**对话框菜单里未匹配的供应商同样置顶**：`applyProviderOrder(ids, preferred, true)`，且 id 按最后一段比较（菜单给的是路由 id `llm-pi-ai/amd`，设置页存的是 `amd`）。
- **0.2.0-rc.1 核验记录**：`configForms` 仍在、`settingsScope` 已彻底移除（`apply()` 里双注入两个名字的写法继续有效）；`settings.models.footer` 与 `conversation.input.model` 两个座位均未改名；官方 CSS hash 未变，运行时类名解析不用改。
- **0.2.1-rc.2 核验记录**：两个座位（`conversation.input.model`、`settings.models.footer`）、`modelDirectories.directoryFor` 服务、`remote.settings.mutate` 通道全部健在；解析锚点（`_triggerEffort`/`_optionCopy`/`_chevronOpen`/`_cellValue`）全部命中，hash 仍是 `_wq12jW`。官方 sheet 的类名表由 29 项变 27 项：**`group`、`groupTitle` 被移除**，新增 `modelOption`、`optionActive`。解析器是按 `CLASS_SUFFIXES` **盲拼**类名的，所以这次：`groupTitle` 直接从表里删（渲染本来没用到它）；`group` 改为运行时探测 `hasGroupSection`（正则 `\.prefix_group(?![A-Za-z0-9_-])`，负向先行断言是为了不误命中 `_groups`），探测不到就让分组 section 退回 `fallbackGroup`。**顺带修掉一个历史 bug**：那处回退曾把样式对象当 `className` 传（渲染成 `[object Object]`），现在回退走 `style`。
- **0.2.1-rc.2 起官方有了「获取可用模型」**（`remote.llm.discoverModels(settingsNs, { provider, baseURL, api, apiKey? })`，入口在供应商编辑卡片的模型区）：catalog 路由零网络直出目录（含 contextWindow/maxTokens/输入模态），只有 catalog 不认识的路由才走网线（OpenAI 系 `GET {baseURL}/models` + Bearer，Anthropic `GET {root}/v1/models` + `x-api-key`；Azure/Codex 等协议明确不可探测），4MB 上限；表单没填 key 时宿主解析已存凭据；结果只填**草稿**，保存才落配置。**本插件刻意不重复这个交互**（单供应商、草稿内、逐个点）。要差异化只剩「批量探测 + 与已配 `models[]` 的差集视图」，实现上直接调 `remote.llm` 即可，不需要自带密钥。
- **官方 `providers` 顺序仍是固定排序**：0.2.1-rc.2 新增 `provider-order.js`（account → official → 其余，`toSorted`），不是用户可配 —— 本插件的拖拽排序因此仍有价值。
- **浮层必须 `ReactDOM.createPortal` 到 `document.body`**：座位在设置页很深的子树里，`position: fixed` 会被困在那个子树的堆叠上下文，被别的插件的悬浮组件盖住 —— 提高 z-index 也没用。
- **不要占用 `settings.models.provider-card`**：它是 keyed 座位，key 是供应商的 settings namespace，已被 `@linxin666/dsh-client-ui-model-capabilities` 占用；keyed 座位一个 key 只留一个占用者，同 key 同优先级注册会抛错（而且对方用 try/catch 吞掉，等于静默压制它）。本插件只用自己的 `settings.models.footer`（list 座位，按 id 去重）。
- **行不要内联 `cursor` / `background`**：浮窗的"抓握光标 + 悬停高亮"全部来自官方 sheet（`.dsh-mo-list .dsh-mo-head{cursor:grab}`、`.dsh-mo-head:hover{...}`），而**内联样式优先级高于样式表**。设置页第一版给供应商行内联了 `cursor:pointer` + `background:transparent`，于是两个效果同时消失。规则：官方类名解析成功时行**不内联** background/cursor，状态标记只用不冲突的属性（当前行用 `box-shadow` 画左侧强调条）；官方没有对应类名的行（可编辑的模型行）才用插件自己的 `.dsh-mo-pagerow`（`:hover` 由规则给）加 `.dsh-mo-grip`（光标给把手）。**把行从 inline style 改成 class 时，布局必须一起搬进那条规则**：第一版只把背景搬了过去，行就退化成 block，一行输入框全部竖着堆（实机截图即此）；模型行因此改成「id 行 + 字段行」两行结构，字段行用 grid 固定 `minmax(0,1fr) 68px 68px auto`（0.5.0 起字段行随行内编辑一起撤掉：模型行只剩绿点 + 名称 + 参数摘要，编辑移进「模型详情」弹窗）。
- **0.2.1-rc.2 起本插件多了一个真正的设置页**：注册在 `settings.section`（list 座位，平台标注 replaceRisk none），`id: "model-organizer"`、`order: 11`，紧跟在官方「模型」(order 10) 之后。**id 必须自成一格，绝不能写 `models`**：list 座位的导航栏读的是原始 `entries()`（不去重），同 id 会多出一行；而内容渲染走 `entriesOfSlot()`（每格优先级最低的活条目），插件注册又会被运行时强制改写成更低优先级 —— 写 `models` 会直接把官方页遮掉，那是 B 方案（见下），不是本步。页面数据来自与浮窗**同一个** settings mirror（`configForms`/`settingsScope` 的 `describe()`），写入走 `remote.settings.mutate`（`set`/`unset` 两种 op，path 打在 `providers.<路由>.<字段>`），密钥走 `remote.credentials.set/unset`（引用名与官方同一条 `deriveKeyRef` 规则）。`remote.credentials` 与 `remote.llm` 用**独立的 `ctx.inject` 单独申请**并写进 `bridge`：缺任一服务时页面照常挂载，只是密钥区显示"不可用"，不会因为少一个服务就丢掉整个座位。DOM 标记 `[data-mo="page-mounted"]` 表示该座位已挂载。

## 开发环境

- **`file:` 依赖是打包快照，`link:` 才是符号链接。** profile 里写 `"file:../../../dsh-model-organizer"` 时 pnpm 把目录打包**复制**进 store，DSH 加载的是 `profiles/<p>/node_modules/.../lib/client.js` 那份副本 —— 改仓库**不生效**。
  排查：grep 那份副本的 `BUILD` 常量，和仓库对比。
  修法：`dsh plugin --profile <profile> remove @nimoxie/dsh-model-organizer && dsh plugin --profile <profile> add link:./dsh-model-organizer`
- **改完要 Ctrl+Shift+R**：客户端 bundle 以 `Cache-Control: immutable, max-age=31536000` 下发，且 URL 不随代码变化，普通刷新一直用缓存。
- **浏览器侧（`lib/client.js`）只需 `react` / `react-dom` / `@deepseek-ai/dsh-client-ui-primitives`**——三者都是 shell 内置提供给插件的模块（PLATFORM_MODULES），所以 `dsh.client` 里不需要 `external` 声明。
- profile bundle 必须声明 `dsh.bundle.patch`（指向 `cordis.patch.yml`），否则 dsh 启动即报 `declares no dsh.bundle`。

## 写 UI 时踩过的坑

- **primitives 的新组件（MenuSurface/Input/StateDot 等）是 `React.forwardRef` 包装的——是对象不是函数**。`typeof X === "function"` 永远为 false，所有这类门控静默失败、全部走降级路径（本插件因此丢过 MenuSurface 的磨砂和整个搜索框）。组件判定用 `isComponent`：函数，或带 `.render` 函数的对象。`rankByName` 这类工具函数才是真函数。
- **图标名要用 primitives 实际导出的名字**：只有 `IconXxxOutlineRegular` / `IconXxxOutlineMedium` / `IconXxxFillRegular` 这类后缀，**没有 `IconXxxOutline16`/`14` 尺寸数字名**。猜错名字 `icon()` 静默返回 null——本插件的勾、分组箭头因此从第一版起就没渲染过，靠触发器的文字兜底掩盖至今。发新图标前先 grep 导出表。

- **边框必须用 longhand**（`borderWidth/borderStyle/borderColor`）。用 shorthand `border` 再叠加 `borderColor` 时 React 会展开 shorthand；回退时移除 `borderColor`，`border-color` 落回 `currentColor` → "拖拽结束后高亮边框一直不消失"。
- **拖拽会把源行留在焦点上**：行加 `tabIndex:-1`，drop/dragend 时 `blur()`；并且不要给行画 `:focus-visible` 背景（官方 `option` 类自带一条 → "拖完还留一块灰底"）。
- **原生拖拽会让文字变成可拖对象**（浏览器弹「松开鼠标即可搜索」）：`-webkit-user-drag:none` 加在**行的内容**上，不要加在行本身（加在行上会让行也拖不动）。
- **drop 会在行与容器上各触发一次**（冒泡），需加锁，否则重复写入。
- **primitive 图标不转发 inline `style`**：需要旋转/变色请传 `className`。
- **`providers` 是 record，键顺序由宿主规范化**：整体 `set` 与 `unset`+`set` 都实测无效，所以供应商顺序只能存 `localStorage`（模型顺序是数组，可以写进文档）。

### B2：替换官方「模型」页（默认接管，菜单完全不变）

**先说两条被实机验证过的机制事实**（都写在客户端槽核心里，我读了源码）：

1. `entries(key)` 返回**原始条目列表**，按 `priority` 升序、再按 `order` 排序——**不按 id 去重**。设置页导航用的正是它（`rows = ctx.slots.entries("settings.section")…`），所以只要我们注册了一条，菜单里就一定多一格。
2. `entriesOfSlot(key)` 在这个序列上**按 id 去重取第一个**（`if (!n.has(id)) { n.add(id); i.push(entry) }`）——也就是说**同 id 下 priority 最小者赢**。

于是"替换"根本不需要换 id、不需要反注册、也不需要点导航：

- **只注册一条**，`id` 永远是 `models`、`order` 10、label 是我们自己的文字（仅用于识别"哪一格是我们的"）；
- **谁赢这一格只看 priority**：接管 = `-1`（赢），交还 = `1e6`（让它输给官方）。**菜单行本身不动**，因为可见的那一格始终是官方那格、文字始终是「模型」；
- 我们那一格（nav 由原始列表渲染出来的多余格）**在两种状态下都隐藏**：不变量是"带我们 label 的格子必须隐藏、其它格子必须可见"，由 `MutationObserver` 常驻维持；
- 两格同 id ⇒ shell 里 `key={row.id}` 重复，React 可能把**我们隐藏过的节点复用给官方行** —— 一旦如此官方行就永久消失（实机截图抓到的就是这个）。所以维持逻辑必须**双向**：被复用（label 不再是我们）的节点要恢复显示，新渲染出来的我们那格要重新隐藏；而且判断"要不要动手"必须看 **DOM 现状**，不能只看"我之前藏过谁"；
- 页面横幅只剩一颗按钮：本页的「官方模型页」= 把这一行**交还**（priority 变 1e6）；官方页浮窗的「模型管理页」= **接替**（priority 变 -1）。两个方向都不需要导航。
- **状态不落盘**（产品决定：既然装了插件，默认就是我们的页）：接管状态只活在本次加载里，每次激活（重载/重启）都从"接管"开始；"交还官方页"只对当前这次运行有效。
- **priority 必须是相对的**（`shippedSectionPriority() + -1 / +1`）：写死 `-1` 只有在"官方条目恰好是 0"时才成立，而官方条目的优先级由 runner 决定、不保证是 0 —— 一旦它更低，我们就赢不下这一格，默认就变回官方页。冒烟测试把假条目设成 `-5`，断言新激活注册出来的优先级是 `-6`。
- **不做"打开设置就跳到模型页"**：那是另一件事（用户明确否掉）。默认是指"这一行背后是我们的页"，不是"强制切分区"；用户切到别的分区不会被拽回来。
- **交还只对"这一次打开设置"有效**（实机场景）：设置面板关闭时（DOM 观察者看到导航从"有"变"无"）把优先级切回接管，于是下次打开又是我们的页 —— 不落盘，也不需要用户手动按回来。判断"面板是否打开"时**不能只认我们自己的 label**（重渲染可能有一帧丢格），必须同时认官方 label 作为锚点。冒烟测试覆盖：关闭 → 恰好多注册一次且优先级回到"赢"；再触发一次（仍然关闭）→ 不会再注册。

### B3：跨页跳转（已做）

官方设置 shell 把 `openSection` 关在 `createSettingsShellStore()` 里，只作为 props 交给 `settings.onboarding` 这一个座位；导航项是 `<button>`，**没有 id / data 属性**，只有一个 label span。所以做法是：

1. 目标标签从**座位条目**解析（`slots.entriesOfSlot("settings.section")` → `options.label()`）—— 与 shell 用同一份字典，任何语言都对得上；
2. 找设置导航：**同一父节点下 ≥4 个 button，且同时包含「我」和「目标」两个标签**（这条自校验把分段按钮、浮窗按钮、其它 4 连按钮列表全部排除）；
3. 点它。

找不到导航时返回 false，页面显示「没找到设置导航，请在左侧直接点『模型』页」——**不静默失败**。两个入口：本插件页面头部的「官方模型页」、官方模型页浮窗里的「插件管理页」（放在头部之下单独一行：头部那一行既是折叠控制又是拖动面，塞按钮会同时触发拖动）。

### 新建路由（添加模型提供商）

入口放在左栏列表**最下元素之后**，形态与官方模型页一致（整宽虚线框 + 加号），点击弹出一个自绘对话框（复用 fetch 弹窗的毛玻璃卡片）。字段：路由 ID（必填）、显示名称、API 地址、API 格式（复用同一组分段按钮）、API 密钥（可留空）。

- **校验先于写入**：空 ID、字符集（`^[A-Za-z0-9._-]+$）、重名三种都在**发起写入之前**拦下并在弹窗里给出文案；
- **一次写入**：profile 与 `apiKeyEnv` 打进**同一个 mutate 的多个 op**（一个 revision，并发编辑不会插进中间）；密钥单独走 `credentials.set`，引用名用官方同一条 `deriveKeyRef`；
- 成功后关闭弹窗并把新路由选到右栏；密钥写失败时保持弹窗打开并显示错误（配置已创建，不会假装整体失败）。

### 设置页的开关：插件侧可见性

pi-ai 的 profile 与 `modelFields` **都没有 enabled/disabled 字段**，所以开关不可能写进配置而不撒谎。做法：开关存本机（`dsh-model-organizer.hiddenProviders` / `dsh-model-organizer.hiddenModels`，键分别是 `路由` 与 `路由/模型ID`，与拖拽顺序同一层），语义只有一条 —— **把它从本插件的模型选择菜单里移除**，配置不动。三条不变量：

1. 隐藏的路由/模型不出现在 composer 的模型菜单（`visibleGroupsFor()` 过滤；它是**纯函数**，通过 `module.exports.__test` 暴露，好让冒烟测试直接钉语义，而不用去渲染宿主自己的菜单）；
2. **绝不隐藏当前正在使用的那一项** —— 否则选中的模型会在脚底下消失；
3. 过滤后若为空，回退到完整列表（空菜单比不过滤更糟）。

页面上的表现：每行左侧一颗绿点，启用＝亮、停用＝暗（行本身也变淡），tooltip 说明「只影响本插件、DSH 配置原样保留」。0.5.0 起模型行与供应商行共用这一个语义——此前供应商行的绿点是**读取现状**（配置过 baseURL / 密钥），不是开关。冒烟测试覆盖开关持久化、变淡、以及上述三条语义，并有对照证明改坏即失败。

### 0.5.0：左栏取数、模型详情弹窗与浮窗头部

**只读一个 settings 命名空间会漏掉别的适配器注册的路由。** 0.4.0 的左栏数据源是 `llm-pi-ai` 那一个命名空间的设置文档，于是 DeepSeek 官方那两条路由根本不出现——它们的设置在**自己的**命名空间里。教训：一个 provider 的配置归属由适配器决定，插件不能假定「我认识的那个 namespace 里没写，就等于这个 provider 不存在」。

**官方模型页自己的口径是 join，本插件没照抄**：官方页用 `remote.llm.listProviders()`（宿主已知的全部路由）∪ `remote.llm.listConfigurableProviders()`（可在设置页编辑的目录）——对 `deepseek-account` / `deepseek-official` 这两条来说两个来源结果相同。本插件只调 `listConfigurableProviders()`，再与 `llm-pi-ai` 设置文档求并：目录里 `settingsPath` 为空的条目（官方 / 内置）渲染成只读行置顶；`settingsPath` 非空、且**已经写进设置文档**的才进拖拽列表，再按 `entry.declared` 分成「官方目录 / 自定义供应商」。教训：只从一个来源取数就会漏（0.4.0 只读设置文档，官方路由整批消失），但也别把官方页的 join 说成自己的口径——文档要写实现真正调的那个 API。

**`settingsPath` 为空 = 命名空间级（官方 / 内置）路由。** 这类路由没有 `providers.<id>` 这一层，编辑要打在它自己命名空间的根上；本插件因此把它们渲染成**只读行**（顶部分组「官方（内置）」，悬停提示「官方路由 · 请到官方模型页编辑（点击前往）」），点击 = `setTakeover(false)`（把「模型」这一行交还官方页，与本页头部「官方模型页」按钮同一个动作）。插件不替它们写配置，只负责把它们列出来并给出出口。

**模型行是即时写盘，没有草稿状态。** 0.5.0 把模型区的行内输入框和页面底部的「保存模型」一起删掉，编辑全部收进「模型详情」弹窗，点保存立刻 `mutate` 一条 op 写回该路由的 `models[]`。原因：模型拖拽排序本来就是把 `models[]` 整体 `set`（必须即时提交），留着草稿行会在拖完之后与配置对不上——既然有一个动作必须即时，索性全部即时，页面状态就只剩「配置的镜像 + 本机 localStorage 里的顺序 / 可见性」。弹窗里能改的字段就是会写进配置的那些：`id`、显示名（`name`，留空则删掉该字段）、`contextWindow`、`maxTokens`、输入模态（文本 / 图片，至少留一个）、`reasoningEfforts`（继承 = 不写、不支持 = `false`、自定义 = 等级字典）；改模型 ID 会把本机的「隐藏」键一起迁移。推理等级的 YAML 声明不再是唯一途径，但仍可继续使用。

**0.5.0 的 DOM 契约**（冒烟测试与手工核对都用；已按 `lib/client.js` 逐项核对）：

- 官方只读行：`[data-mo="page-provider"][data-mo-official="true"]`，`data-mo-id=<路由>`，`role="button"`，`title` =「官方路由 · 请到官方模型页编辑（点击前往）」，点击 / Enter = `setTakeover(false)`；它们不进拖拽列表（拖了也无法生效）；
- 可编辑供应商行：`[data-mo="page-provider"]`（不带 `data-mo-official`）+ `data-mo-id`；启用点 `[data-mo="page-provider-dot"]` 带 `data-mo-on="true|false"`；
- 模型行（单行元素）：`[data-mo="page-model"]` + `data-mo-id` + `role="button"` + `draggable`，内含 `[data-mo="page-model-dot"]`（带 `data-mo-on`），行内只剩「名称 + 摘要」两段文本；旧的 `page-model-id` / `-context` / `-max` / `-vision` / `-handle` 与底部的 `page-models-save` 已全部删除；
- 模型详情弹窗（`ReactDOM.createPortal` 到 `document.body`）：`model-dialog`（背板）/ `-card` / `-close` / `-id` / `-name` / `-context` / `-max` / `-text`（disabled、恒勾选）/ `-image` / `-reasoning-option`（三个，`data-mo-id` = `inherit` / `none` / `custom`）/ `-level` / `-level-value` / `-level-add` / `-level-remove` / `-switch` / `-error` / `-delete`（仅编辑态）/ `-cancel` / `-save`；`page-model-add` 打开它的新建态；
- 浮窗：可排序供应商 < 2 时 `[data-mo="panel"]` 仍然渲染（头部含 `panel-open-organizer` 与 `providers.onlyOne` 文案），只是不渲染列表。

**浮窗头部在「可排序供应商 < 2」时仍然渲染。** 0.5.0 之前浮窗的挂载条件里带着「可排序供应商 ≥ 2」，于是只挂了官方路由（或只有一个自定义供应商）的用户**连那颗「模型管理页」按钮都看不到**——而它是回到本插件页的唯一入口，等于整页失联。修法是把「头部」与「列表」的渲染条件拆开：头部无条件挂载，列表在无可排序项时收起（折叠状态仍由 `panelOpen` 控制）。不变量：**入口的可见性不能依赖它要排序的内容是否存在**。

---

## 设置页的 UI 约定（都是实机截图打回来的）

### 基础两条（0.4.0）

1. **控件必须 `boxSizing: "border-box"`**：`width: "100%"` 配默认 content-box 时，宽度是 100% 再加 padding 与边框，输入框会顶出设置列（实机截图里 API 地址那栏）。凡会被拉伸的输入框/选择器/按钮都显式声明 border-box。
2. **不要用原生 `<select>`**：下拉列表由平台绘制，本主题下是白底浅字（截图里「完全看不清」）。协议选择改用三个自绘的 radio 分段按钮（`pageSegments`/`pageSegment`），完整标签放 `title` 与下方提示行。

### 0.5.12：按钮的尺寸、对齐、颜色与文案

- **尺寸**：三颗行内图标键（供应商删除、模型测试、模型删除）共用 `ACTION_BOX`（19×17、圆角 6、`border-l1`）。高度**刻意等于启用开关的 17**——早期 26×22 被截图指出「比开关高一头」；宽度按截图在 20 → 22 → 21 → 17 → 19 之间收敛定稿，图标 13px。
- **对齐**：详情头部是 `align-items: baseline`。图标键与开关都没有文字基线（前者首个 flex 项是 SVG，后者是带 2px padding + 1px 边框的圆点盒），各自按自己的基线对，盒子同高却差 1–2px。两者都加 `alignSelf: "center"`：文字仍按基线排，控件按中线互相对齐。
- **颜色**：删除键 = `DELETE_ACTION`（共享盒子 + 红框、透明底、红图标）；测速键 = `TEST_ACTION`（只覆盖 `background` 为普通按钮的浅底）。结论色只留在图标上（`.dsh-mo-act-ok/-miss/-danger`），不染边框。
- **文案**：悬停只回答「这个按钮做什么 / 现在什么状态」，一行说完；实现细节留在本文档。冒烟测试钉「提示 ≤16 字、结论 ≤18 字」，防止长段落回流。

### 按钮悬停：规则为什么只能写在注入样式表里

页面与四个弹窗的按钮**静止态是内联样式**（`S.pageButton` 等），而内联样式赢过普通 `:hover`——直接写 `.foo:hover{background:…}` 会静默失效（与 0.4.0「内联背景盖掉官方 hover」是同一个坑）。做法：

- 悬停/按下/禁用三态写在 `ensureOwnStyles()` 注入的样式表里，且用 `!important`（只用于这三个状态，静止态仍由内联样式负责）；
- 作用域 `:where(page、panel、四个弹窗的 button)`：`:where()` 优先级为 0，变体规则（主要操作保持强调色、危险操作泛红、旁白按钮提亮文字）才能稳定压过通用规则；
- **开关（`role="switch"`）显式排除**：它的底色就是开/关状态，悬停改底色会被误读成状态切换，只加 `box-shadow` 光环；
- 关闭键（`data-mo$="-close"`）悬停时把图标提到 `label-primary`，否则只变底色看不出来。

## 已知的非插件告警：permission preset "auto"（会连带「权限选择消失」和「工具通道断」）

```
dsh: warning: 1 entry did not activate permission (@deepseek-ai/dsh-permission-presets):
Error: permission: cannot restore preset "auto" without its active integration
```

与本插件无关（本插件只写 `llm-pi-ai`，不碰 permission 命名空间）。它其实是**一个循环等待**，然后在两处现形。

**循环**：

1. `dsh-permission-presets/lib/index.js` 的 `pinInitialPermission()`（L370-376）publish 会话时，若该会话的持久化事实是 `permissions.preset = "auto"`，就要求 `autoAdmit` 已存在，否则抛错；
2. `autoAdmit` 唯一的注册点是 `registerAuto()`，唯一调用者是 `@deepseek-ai/dsh-experimental-auto-review`（其 `lib/index.js` L489）；
3. 但 auto-review 自己 `inject: ["permissionPresets"]` —— 正是第 1 步那个条目要提供的服务。所以它**永远不可能先激活**：permission-presets 抛错 → `permissionPresets` 不注册 → auto-review 起不来 → `autoAdmit` 永远没有。**同一轮运行内不会自愈**；重启看着"好了"，只是因为新启动那一刻还没有 auto 会话被 publish，一旦又 resume 到它立刻复发。

**两张脸**：

- **对话栏的权限选择消失**：客户端座位 `conversation.input.permission`（`dsh-client-ui-permission-presets/lib/client.js`）里 `if (selection === void 0 || catalog === null) return null;` —— catalog 来自那条已经死掉的服务；
- **工具通道断**（`cannot get required service "sessionProjections" in inactive context`）：cordis 的上下文代理（`cordis/lib/index.js` 的 `ReflectService.handler.get`，约 L688）在"某个 fiber 把该服务写进 `inject`、而整条 fiber 链上都找不到它"时抛这句话。`sessionProjections` 是**受害者不是凶手**（连 permission-presets 自己也 inject 它，全库约 30 个条目注入），服务图被挖洞后第一个被解析到的就是它。

**触发面**：`<DSH_HOME>/storages/session_projcache/sessions/*.json` 每个会话的 `record.rows.permissions.val`。实测 42 个缓存里 32 个带该行，其中 **23 个是 `preset: "auto"`** —— 所以不是偶发。

**处置**（缓存那条最稳，因为权限选择消失时 UI 里改不了）：

1. 彻底退出 DSH（不是关窗口，运行中它会把内存里的旧值写回去）；
2. 把那些缓存的 `record.rows.permissions.val` 置为 `null`（等于"没有持久化权限事实"，下次打开该会话会按当前默认预设重新 pin），每个文件先备份 `.bak`；
3. 重开客户端 → 权限选择回来、工具通道恢复、warning 消失。

备选：按会话把权限预设从 auto 改掉，或直接删掉那几个会话。真正要修的是 DSH：让 auto-review 不再 `inject permissionPresets`，或者 pin 失败时降级而不是让整个条目激活失败 —— 插件侧改不了。

### 0.5.2：弹窗的焦点陷阱（第一版没修好，第二版才修对）

**症状**：在「添加模型提供商」弹窗里按 Tab，焦点跳到弹窗背后的设置页。

**原因**：每个弹窗都用 `ReactDOM.createPortal` 挂到 `document.body`，在文档顺序里排在整页**之后**。两张脸：① Tab 从卡片最后一个控件继续往前走，浏览器绕回文档开头（也就是设置页的导航）；② 打开瞬间焦点没落进弹窗（宿主壳自己的 focus 流程会把刚插入的 portal 的 `focus()` 抢走），于是第一次 Tab 直接从页面上的按钮继续走。

**0.5.1 为什么没修好**：第一版只在卡片上挂 `onKeyDown`，且**只在边界**（第一个/最后一个）才 `preventDefault`。中间步骤仍交给浏览器自己走；只要焦点不在卡片里（情形②），或者边界判定没命中，浏览器就照旧走到页面上去。**教训：不能让浏览器"帮我们走一步"，必须整段接管。**

**0.5.2 的做法**（`DialogShell`，在 `ModelsPage` 之前）：

1. 卡片契约：`role="dialog"` + `aria-modal="true"` + `tabIndex:-1`（空弹窗的焦点兜底）；
2. **整段接管 Tab**：挂载时在 `document` 的**捕获阶段**监听 `keydown`，Tab/Shift+Tab 一律 `preventDefault` + `stopPropagation`，然后由 `trapTab()` 自己按卡片内的可聚焦列表前后移动并两端循环 —— 宿主壳（以及任何别的插件）的 keydown 根本看不到这个事件；
3. **focusin 兜底**：捕获阶段监听 `focusin`，只要有焦点落到卡片之外（别的插件抢焦点、程序化 blur、宿主壳的 focus 管理），立刻拉回卡片第一个控件；
4. **首帧重试**：挂载时立刻聚焦 `[data-mo-focus]`（添加供应商 → 路由 ID；选模型 → 搜索框；模型详情 → 模型 ID），再用 `requestAnimationFrame` 检查一次"焦点是否真的在卡片里"，不在就再聚焦一次；
5. `Escape` 在同一层关窗；卸载时把焦点还给打开它的元素（`isConnected` 为假就不还）。

`focusableIn()`（经 `__test` 暴露）要跳过浏览器根本聚焦不到的元素（`getClientRects().length === 0`），并且容忍 `null` 根与没有 `querySelectorAll` 的假 DOM——否则无头测试会直接抛。

**回归**：`test/smoke.mjs` 断言卡片契约、`data-mo-focus` 唯一性、Tab/Shift+Tab 手动前后步进与两端循环、焦点在卡片外时回拉、隐藏控件被跳过、Escape 关窗；并做过「把 Tab 分支改成直接 return → 冒烟必须失败」的反向对照。

**线上验证**：`window.__dshModelOrganizerBuild` 应为 `b56`；打开添加供应商弹窗后焦点直接在「路由 ID」，反复 Tab 只在弹窗内循环。


### 0.5.3：新建供应商必须有模型

**症状**：新建供应商后宿主报 `llm-pi-ai: provider "X" resolves no models; the installed catalog does not describe this route, so its models must be listed in configuration`。

**原因**（DSH 侧硬规则，`dsh-llm-pi-ai/lib/index.js` 的 `resolveRouteModels()`）：`entries = configured.length > 0 ? configured : [...catalog]`，然后 `if (entries.length === 0) invalid(provider, "resolves no models…")`。也就是说 **hand-declared 路由（目录里没有的）必须在配置里列出至少一个模型**，否则这条路由解析不出模型。我们原来的「+ 添加模型提供商」只写 `api/baseURL/displayName/apiKeyEnv`，正好踩中。

**做法**：

1. 新建对话框新增必填的「模型 ID」输入（逗号/空格/换行分隔，`parseModelIds()` 去空去重），与 profile、密钥引用在**同一次 mutate** 里写入（`models: [{ id }]`，只写 id，不臆造字段）；
2. 同一对话框加「从网关获取」：用对话框里的草稿（`baseURL` + `api` + 一次性 `apiKey`）调 `remote.llm.discoverModels` —— 这条缝本来就接受"还不存在的路由"的草稿，所以能在创建前把 id 填进来；失败原样显示宿主给的原因；
3. `writeModels()` 增加护栏：**不允许把某条路由的模型删空**（否则又回到 "resolves no models"），拒绝时给出同一条文案；
4. 已有那种"空模型"路由的修法：打开该供应商 → 「获取可用模型」或「+ 添加模型」→ 填至少一个 ID → 保存。

**回归**：冒烟测试覆盖「不带模型提交 → 零写盘 + 明确文案」「从网关获取会填 id」「带 `glm-4.6, qwen-max` 创建 → 同一次 mutate 里 `models` 为两项」。

### 0.5.4：行内「测试 / 删除」与删除供应商

**新增操作**：

1. 供应商详情右上角、启用开关左侧：**删除供应商**（`page-provider-delete`）。走确认弹窗（`provider-delete-dialog`），确认后一次 `unset providers.<route>`，并先清掉该 profile 命名的凭据（`apiKeyEnv`，没有就用 `deriveKeyRef(route)`）；同时把本机顺序表与「停用」表里的这条路由一起清掉。**官方路由不渲染这个按钮**（它们不归本页编辑）。
2. 每条模型行右侧：**测试**（`page-model-test`）与**删除**（`page-model-delete`）。删除 = 过滤后一次写 `models`，仍然受「不允许删空」护栏约束。

**「测试连接」到底测了什么**（重要，别把它说成"发一条消息给模型"）：宿主 `llm` 的远程接口只有 `listProviders / listConfigurableProviders / discoverModels`，**没有**"发送一次请求"的能力，客户端也读不回密钥（凭据只写），所以做不到真正的补全探测。这里的做法是复用 `discoverModels(namespace, { provider, baseURL, api })`（0.5.4 只发了 `provider`，导致全线失败，见 0.5.5）：

- 自建（目录里没有的）路由：宿主会真的 `GET {baseURL}/models`，带已保存的凭据 → **这一步验证了地址、协议、密钥和网关可达性**；
- 目录已描述的路由：适配器直接回目录，不发网络请求；
- 拿到列表后检查该行 id 是否在列表中，结论落在按钮上（`data-mo-state` = `idle | busy | ok | miss | fail`），完整原因放在按钮的 `title` 里。

也就是说：**「✓ 可用」= 网关可达且列表里有这个 ID**，不代表这个 ID 真的能补全；「⚠ 不在列表」= 网关可达但没列出该 ID（多半是拼错或网关没暴露）；「✗ 失败」= 连不上/401/协议不支持（原因见 tooltip）。要做真正的补全探测，得在宿主侧加一个"试跑一次"的接口。

**已知取舍**：行是 `draggable` 的，行内按钮用 `stopPropagation` 阻止冒泡到行的"打开详情"，但无法完全阻止 HTML5 从祖先元素发起拖拽（按钮很小，误拖代价也只是一次排序）。

### 0.5.5：测试连接「全都失败」的真因 + 垃圾桶按钮

**症状**：每个模型的「测试」都失败（红色 ✗），包括明明能正常对话的供应商。

**真因**：`testModel()` 只发了 `{ provider }`，没带 `baseURL` / `api`。而 `dsh-llm-pi-ai` 的 `discoverModels()` 顺序是：

1. 若 provider 在安装目录里 → 直接回目录（不发网络请求）；
2. 否则 `if (request.baseURL === void 0 || request.baseURL.length === 0) throw "pi-ai ships no catalog for provider X, so its models can only be listed by hand"`。

也就是说：**目录里没有的自建路由（本插件的用户几乎全是这种）必须带 `baseURL`**，否则宿主直接拒绝 —— 不是网络不通，是参数不全。`fetchModels()` 一直带着它，所以「获取可用模型」是好的，只有新加的「测试」漏了。

**修法**：测试请求与 `fetchModels()` 对齐 —— `{ provider, baseURL, api }`（优先取详情面板里正在编辑的值，其次取已保存的 profile）；并把 `ships no catalog` 这条宿主原文映射成一句可操作的中文（先在 API 地址里填上地址再测）。

**教训**：凡是「问宿主网关」的调用，参数要和已经跑通的那条路径逐项对一遍；冒烟测试里固定断言 `request.baseURL`，防止再退化。

### 0.5.6–0.5.11：行内图标键的四次返工（教训）

- **别自己画图标**：emoji `🗑` 的墨迹远小于字号，手绘 SVG 又和界面里的东西不像；改用 DSH 自带 primitives（0.5.8，98 个图标），`kitIcon()` 取不到时退回同尺寸文字 glyph，无头测试仍能跑。
- **尺寸别靠眼估**：盒子在 `56×20 → 32×20 → 36×22 → 20×17` 之间反复；真正的判据是「与相邻控件同高」（开关 17），最终统一 19×17（见 0.5.12）。
- **「转圈看不见」不是动画没写**：本地网关 50ms 就答完，React 会把 busy 与结论合并进同一帧，屏幕上从未出现转圈帧。修法：点击回调里直接给 DOM 加 `dsh-mo-act-busy` 并起 CSS 动画（`startSpinNow`），结论至少 450ms 后才落状态；动画作用在 `svg` 上，按钮尺寸不变。
- **测试连接失败先查参数**：`discoverModels()` 对目录外路由要求 `baseURL`，只发 `{ provider }` 会被宿主拒绝（0.5.5 的真因）；凡是问宿主的调用，参数与已经跑通的那条路径逐项对齐。

## 测试

`test/smoke.mjs` 是零依赖的无头冒烟测试：桩 React（带真正的 hook 槽位和一层子组件解析，所以 DragList 的行也在树里）、桩 DOM、假宿主。它检查——三个座位仍然注册；设置页在「有数据 / 空 / 加载中」三态可渲染；**拖拽与编辑真的会写**：供应商行与模型行都带 HTML5 拖拽处理器且保留 `dsh-mo-list`（grab 光标）类；模型的增删改都会把 `models[]` 写进 `llm-pi-ai`（0.5.0 起走「模型详情」弹窗、即时写盘）；空 ID 在**写之前**被拒并给出文案；API 地址与协议各写自己的字段；密钥只走 `credentials.set`（引用名由路由派生）。

```sh
node test/smoke.mjs        # 或 npm test
```

为什么值得留着：座位渲染时抛错会被**静默弃权**（官方 UI 悄悄回填），在浏览器里只看到「面板不见了」。这是提交前唯一能撞出这类错误的手段；改座位注册或页面结构后先跑它。

0.5.1–0.5.12 新增的覆盖面：

- **弹窗焦点**：卡片契约（`role=dialog` + `aria-modal` + `tabIndex -1`）、`data-mo-focus` 唯一、Tab/Shift+Tab **手动步进**与两端循环、焦点在卡片外时回拉、隐藏控件被跳过、Escape 关窗；
- **新建供应商**：缺模型时**零写盘**并给文案、`从网关获取` 会填 id、一次 mutate 同时带 `models` 与 `apiKeyEnv`；
- **删除**：供应商删除必须**先确认**（取消不写盘）、确认后 `unset providers.<route>` + 清派生凭据、模型删除写回剩余列表；
- **测试连接**：请求必须带 `baseURL`、点击**同帧**起转（`dsh-mo-act-busy` + `dsh-mo-spin`）、busy 图标是 `loading`、≥450ms 后落到结论、结论把图标换成 `check`/`warn`；
- **图标与布局**：图标来自 primitives 桩（断言 `data-icon`）；三颗图标键同一个盒子（19×17）；删除键红框、测速键浅底；悬停规则、开关光环与基线对齐（`alignSelf: center`）；悬停文案 ≤16 字、结论 ≤18 字。

### 0.4.0 验证范围

- 设置页「模型管理页」：三态渲染、拖拽排序、开关、获取可用模型（弹窗勾选）、添加提供商（校验先于写入、一次 mutate 写 profile + apiKeyEnv）、密钥只走 `credentials.set`；
- 接管：默认赢下 `models` 这一格、`priority` 相对官方计算、交还只对一次打开有效（关闭设置即收回）、节点被 React 复用时双向自愈；
- 以上全部由 `node test/smoke.mjs` 覆盖（零依赖，桩 React + 桩 DOM + 假宿主），并逐条做过"故意改坏 → 必须失败"的反向对照。

### 0.5.0 变更与验证范围

- 左栏取数 = `listConfigurableProviders()` 目录 ∪ `llm-pi-ai` 设置文档：官方路由（`settingsPath` 为空）以只读行进入顶部分组「官方（内置）」，点击走 `setTakeover(false)` 回官方模型页；其余按 `entry.declared` 分「官方目录 / 自定义供应商」；
- 模型行改成一整行（绿点 + 名称 + 参数摘要）：整行可拖动排序、单击打开「模型详情」弹窗，弹窗内改全部字段并即时写盘，模型区不再有行内输入框与「保存模型」；
- 每行绿点统一为「启用」（插件侧可见性，配置不动）；供应商行不再拿「配置过 baseURL / 密钥」当绿点含义；
- 官方模型页浮窗的头部在可排序供应商 < 2 时仍渲染，列表可收起。

- 冒烟覆盖（`node test/smoke.mjs` 全绿、退出码 0）：三个座位仍注册；官方只读行与可编辑行分离、只读行点击交还；模型单行（`role=button` + `draggable` + `page-model-dot`）且旧行内标记与底部保存按钮均已消失；详情弹窗全套 `model-dialog*` 标记、推理等级三态、启用开关、取消不写盘、空 ID 保存被拒；保存 = 单次 `mutate` 写 `providers.<route>.models`；获取可用模型弹窗；添加提供商；浮窗 <2 供应商仍渲染头部与 `panel-open-organizer`；优先级交还与设置 / 凭据写入；
- 逐条做过「故意改坏 → 必须失败」的反向对照。

## B 方案：用自己的页接管官方「模型」这一行（0.4.0 已落地）

**结论先行**：最终落地的做法是「同 id + 相对优先级」——注册一条 `id: "models"` 的 section，`priority = 官方条目优先级 − 1` 时赢下这一格（接管），`+ 1` 时交还（见上文 B2）。下面三条是当初的调研记录，它们仍然解释了这套约束从哪来：

1. **开关没有公开 API**：设置壳的 `openSection(id)` 只存在于 `ui-settings-general` 内部的 `createSettingsShellStore()`，只经 `sidebar.settings` 座位下发；全量扫描客户端 bundle 没有别的调用方，section 的 owner props 也只有 `{ close }`。所以「切回官方页」只能靠撤销遮挡（dispose 自己的注册）或 DOM 点击，不能靠调 API 切页。
2. **同 id 遮挡可行但有副作用**：SlotCore 对 list 座位只在「同 id **且** 同优先级」时抛错；插件注册会被运行时强制改成更低优先级，所以 `id: "models"` 能压掉官方内容，但导航栏读原始 `entries()` 会多出一行同 id 的「模型」。
3. **官方页的 footer 座位会失联**：遮挡期间 `settings.models.footer`（本插件浮窗的落点）不再挂载，开关的「回路」要另找地方（本页页头 + 官方页 footer 各放一份是可行解）。

调研时倾向的「portal 进官方内容列」**没有被采用**：接管靠优先级换格，因此不依赖官方 DOM 结构，也不用往官方内容列里插节点；代价是本插件自己那一格要常驻隐藏（B2 里的双向自愈）。

### 截图里剩下的差异（逐条结案）

1. **供应商行左侧的行图标 —— 已否决，不做**。当初的设想是给每条供应商行加一个**供应商 logo / 品牌图标**帮助辨识；结论是不做：这些图标只能按路由名去猜，猜不到就是随机图形，反而比纯文字更乱，而行首的绿点已经承担了"启用/停用"这个唯一有意义的视觉信号。（若哪天真要做，名字表是现成的：0.5.8 核对过 primitives 的 98 个图标，取不到时 `icon()` 返回 null、`kitIcon()` 有文字兜底。）
2. **每模型行的操作图标 —— 已定（0.5.0）**：模型行改成整行单击开「模型详情」弹窗，行上不再挂「链接 / 铅笔 / 垃圾桶」三枚图标，删除收进弹窗。（0.5.4 之后行尾只保留「测试连接 + 删除」两枚，理由是这两个是高频动作。）
3. **每模型 / 每供应商开关 —— 已定（0.5.0）**：pi-ai 的 `modelFields` 与 profile 都**没有** enabled/disabled 字段，所以开关落在插件侧存储（`dsh-model-organizer.hiddenProviders` / `.hiddenModels`），语义只有「从本插件的菜单里移除」；表现统一成每行左侧的绿点。
4. **顶部「+ 添加供应商」—— 已做（0.5.0 起，0.5.3 补上模型必填）**：一次 mutate 同时写 profile（baseURL/api/models）与凭据引用（`deriveKeyRef`），路由重名与字符集在写之前拦；模型 ID 必填（宿主对目录外的路由硬要求），可「从网关获取」自动填。
5. **顶部右侧「切回官方页」开关 —— 已做**：本页页头右侧的「官方模型页」按钮就是它，动作是 `setTakeover(false)`（只对这一次打开设置有效）。

已对齐截图的部分：两栏主从布局、供应商分组（官方目录 / 自定义供应商，来自 `remote.llm.listConfigurableProviders`）、API 地址 / API 格式 / API 密钥三行、模型列表的增删改与拖拽、浮窗同款的悬停与抓握光标、模型列表标题右侧的「获取可用模型」（`remote.llm.discoverModels`）—— 交互与官方一致：**弹窗勾选**，只列配置里还没有的模型、默认全选、可搜索与全选/取消全选，**取消/关闭都不写配置**，只有「添加所选」才落盘，以及**模型显示名**的处理（0.4.0 不写 `name` 字段、宿主回退到 id；0.5.0 起在「模型详情」弹窗里可以直接填显示名，保存时写进该模型的 `name`）。

## 发版

```sh
# npm 不允许覆盖已发布的版本号：先升版本，再提交，最后发布
npm version patch        # 或手改 package.json 的 version
git add -A
git commit -m "..."
git push origin main
git tag v0.5.12          # 与 package.json 的 version 对齐
git push origin v0.5.12
npm publish
```

发布前先 `npm whoami`：`401 Unauthorized` 说明 token 已失效（例如重置过 2FA），重新登录或按下一段换 token 再发。

发布需要带 **Bypass 2FA** 的 Granular Access Token（npm 2025-11 起只支持 granular token）：npmjs.com → 头像 → Access Tokens → Generate New Token → Packages 选 **All Packages + Read and write (publish and stage)**、**Organizations 选 No access**、勾 **Bypass two-factor authentication**；然后 `npm config set //registry.npmjs.org/:_authToken=npm_xxx`（写进用户级 `.npmrc`，不要放进仓库）。

包是 scoped 名（`@nimoxie/dsh-model-organizer`，用户作用域），`publishConfig.access: "public"` 已写进 package.json，`npm publish` 不用再带参数。老的无作用域名 `dsh-model-organizer` 已停更，记得发一次 `npm deprecate dsh-model-organizer "已迁移到 @nimoxie/dsh-model-organizer"` 留路标。

**改包名是牵一发动全身的**——包名是宿主解析插件的文件系统坐标，不止 package.json：`cordis.patch.yml` 的 `insert.name`（按包名从 node_modules 找插件，找不到则插件整体不加载）、`lib/client.js` 的 `__ModuleLoader__.load({ id })`（模块 id 必须等于包名，否则 bundle 二次执行时被判定为重复抢注，boot 直接失败）。localStorage 键和 locale 命名空间是纯数据键，刻意不改（改了丢用户排序数据）。
