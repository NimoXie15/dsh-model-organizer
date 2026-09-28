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
- `single` 座位同优先级注册会**直接抛错**；运行时会为非 chain 座位自动分配优先级，后注册者胜出。
- 未声明的局部变量（`ReferenceError`）同样会导致弃权，表现就是"整个面板不见了"。

## 与官方模块的耦合

- **官方 CSS-module 类名靠运行时解析**：锚定只有该模块才有的类名，并用第二个类名（如 `_optionCopy`）校验；解析失败退回内置回退样式（功能可用、外观降级）。
- **0.1.7-rc.1 的构建丢了官方菜单规则的两条属性**：线上生效的 `_7KE1Ra_menu` 里既没有 `background` 也没有 `border-radius`（源码里是 `var(--dsw-specific-menu)` 和 `16px`），所以**官方菜单本身表现为全透明+直角**。本插件不依赖那条规则：运行时从 `document.body` 解析 `--dsw-specific-menu` 内联补上背景，并补 `var(--dsw-radius-lg)` 圆角。升级后可重新检查这条规则是否已修复。
- **浮层必须 `ReactDOM.createPortal` 到 `document.body`**：座位在设置页很深的子树里，`position: fixed` 会被困在那个子树的堆叠上下文，被别的插件的悬浮组件盖住 —— 提高 z-index 也没用。
- **不要占用 `settings.models.provider-card`**：它是 keyed 座位，key 是供应商的 settings namespace，已被 `@linxin666/dsh-client-ui-model-capabilities` 占用；keyed 座位一个 key 只留一个占用者，同 key 同优先级注册会抛错（而且对方用 try/catch 吞掉，等于静默压制它）。本插件只用自己的 `settings.models.footer`（list 座位，按 id 去重）。

## 开发环境

- **`file:` 依赖是打包快照，`link:` 才是符号链接。** profile 里写 `"file:../../../dsh-model-organizer"` 时 pnpm 把目录打包**复制**进 store，DSH 加载的是 `profiles/<p>/node_modules/.../lib/client.js` 那份副本 —— 改仓库**不生效**。
  排查：grep 那份副本的 `BUILD` 常量，和仓库对比。
  修法：`dsh plugin --profile web remove dsh-model-organizer && dsh plugin --profile web add link:./dsh-model-organizer`
- **改完要 Ctrl+Shift+R**：客户端 bundle 以 `Cache-Control: immutable, max-age=31536000` 下发，且 URL 不随代码变化，普通刷新一直用缓存。
- **浏览器半只需 `react` / `react-dom` / `@deepseek-ai/dsh-client-ui-primitives`**（都在 shell 的 PLATFORM_MODULES 种子里），不需要 `dsh.client.external`。
- profile bundle 必须声明 `dsh.bundle.patch`（指向 `cordis.patch.yml`），否则 dsh 启动即报 `declares no dsh.bundle`。

## 写 UI 时踩过的坑

- **边框必须用 longhand**（`borderWidth/borderStyle/borderColor`）。用 shorthand `border` 再叠加 `borderColor` 时 React 会展开 shorthand；回退时移除 `borderColor`，`border-color` 落回 `currentColor` → "拖拽结束后高亮边框一直不消失"。
- **拖拽会把源行留在焦点上**：行加 `tabIndex:-1`，drop/dragend 时 `blur()`；并且不要给行画 `:focus-visible` 背景（官方 `option` 类自带一条 → "拖完还留一块灰底"）。
- **原生拖拽会让文字变成可拖对象**（浏览器弹「松开鼠标即可搜索」）：`-webkit-user-drag:none` 加在**行的内容**上，不要加在行本身（加在行上会让行也拖不动）。
- **drop 会在行与容器上各触发一次**（冒泡），需加锁，否则重复写入。
- **primitive 图标不转发 inline `style`**：需要旋转/变色请传 `className`。
- **`providers` 是 record，键顺序由宿主规范化**：整体 `set` 与 `unset`+`set` 都实测无效，所以供应商顺序只能存 `localStorage`（模型顺序是数组，可以写进文档）。

## 发版

```sh
# npm 不允许覆盖已发布的版本号：先升版本，再提交，最后发布
npm version patch        # 或手改 package.json 的 version
git add -A && git commit -m "..." && git push
npm publish
```

发布需要带 **Bypass 2FA** 的 Granular Access Token（npm 2025-11 起只支持 granular token）：npmjs.com → 头像 → Access Tokens → Generate New Token → Packages 选 **All Packages + Read and write (publish and stage)**、**Organizations 选 No access**、勾 **Bypass two-factor authentication**；然后 `npm config set //registry.npmjs.org/:_authToken=npm_xxx`（写进用户级 `.npmrc`，不要放进仓库）。
