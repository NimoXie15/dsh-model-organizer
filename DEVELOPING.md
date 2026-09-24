# 开发笔记

面向改这个插件的人（包括未来的我）。用户文档在 [README.md](./README.md)。

## ⚠️ 改代码前务必先读：踩过的坑

1. **profile bundle 必须声明 `dsh.bundle.patch`**（指向 `cordis.patch.yml`）。缺了它 dsh 启动即报
   `profile bundle "..." declares no dsh.bundle in its package.json`。

2. **顶层 `inject` 必须声明座位 standardProps 会读取的每一个服务**（本插件：`locale, slots, sessions, remote, remote.session, remote.settings`）。
   少一个 → 渲染时抛 `cannot get property "remote.session" without inject` → **条目被静默弃权（abdicate）并回退到内置 UI**，界面无任何报错。
   调用 `remote.settings.mutate` 还必须显式声明 **`remote.settings`**。

3. **owner props 以组件 props 传入，不经过座位的 `inject` 工厂**：`settings.models.provider-card` 的 `inject` 不接收参数，必须读 `props.provider`。

4. **`single` 座位优先级**：同优先级注册会**直接抛错**；运行时为非 chain 座位**自动分配**优先级（`--nextPriority` 递减），**后注册者胜出**。

5. **drop 事件会在行与容器上各触发一次**（冒泡），需用 ref 加锁，否则重复写入。

6. **边框必须用 longhand**（`borderWidth/borderStyle/borderColor`）。用 shorthand `border` 再叠加 `borderColor` 时，React 会把 shorthand 展开成 longhand；回退时移除 `borderColor`，`border-color` 就落回 **currentColor** —— 表现为「拖拽结束后高亮边框一直不消失」。

7. **拖拽会把源行留在焦点上**。行加 `tabIndex:-1`、drop/dragend 时 `blur()`；并且**不要给行画 `:focus-visible` 背景**（官方 `option` 类自带一条，会变成「拖完还留一块灰底」）。

8. **原生拖拽会让文字变成可拖对象**（浏览器弹「松开鼠标即可搜索」）。解决：`-webkit-user-drag:none` 加在**行的内容**上，不要加在行本身（加在行上会让行也拖不动）。这条是从侧边栏会话行的实现里学来的。

9. **primitive 图标不转发 inline `style`**：需要旋转/变色请传 `className`（本插件为此注入一张极小的自有样式表）。

10. **数组顺序可控，record 键顺序不可控**：`providers` 是 record，宿主要规范化键顺序，整体 `set` 与 `unset`+`set` 都实测无效 —— 所以供应商顺序只能存本机偏好。

11. **面板里用到的每个局部变量都要真的声明**：曾在 `ProviderModelOrder` 里用了 `C`（官方类名映射）却没定义 → `ReferenceError` → 条目再次被静默弃权，表现为「面板整个不见了」。

12. 浏览器半只需 `react` / `react-dom` / `@deepseek-ai/dsh-client-ui-primitives`（都在 shell 的 PLATFORM_MODULES 种子里），无需 `dsh.client.external`。

## 兼容性与鲁棒性（已核查）

### 已发现并修复的真实冲突

**`settings.models.provider-card` 被 `@linxin666/dsh-client-ui-model-capabilities` 占用。**
该座位是 **keyed**，key 由官方页面固定派发为供应商的 settings namespace（`llm-pi-ai`）；而该插件已经用同一个 key 注册了「模型能力」面板。SlotCore 对 keyed 座位**一个 key 只保留一个占用者**，且同 key 同优先级会直接抛错 —— 它用 `try/catch` 吞掉异常，所以**本插件早期版本一直在静默压制它的「模型能力」面板**（实测：让出该座位后，每个供应商卡片立刻出现「模型能力」）。

**修复**：本插件不再占用该座位，模型排序改由自己拥有的 `settings.models.footer`（list 座位，`id: model-organizer-provider-order`）承载 —— list 座位按 id 去重，天然可与该插件的 `ui-model-capabilities` 共存。

### 其它已做的加固

| 风险 | 处理 |
| :-- | :-- |
| 官方 CSS module 哈希变化 / 被别的模块误命中 | 运行时解析前缀，并用**只有该模块才有的第二个类**（`_optionCopy`）校验；缓存与样式表数量绑定；全部失败则退回内置回退样式 |
| 座位契约变更（prop 改名等） | **不拦截**：让渲染抛错 → SlotCore 弃权该条目 → 官方内置组件自动回填 |
| 座位被重命名 / 移除 | `slots.inject` 永不触发 → 对应面板静默消失，其它功能不受影响 |
| 单个座位注册失败 | 每个座位注册独立 `guard`，失败只记一条 warn，**不会拖垮整个插件** |
| 写入被拒绝 / ops 契约变化 | `mutate` 的同步抛错与 promise 拒绝都有捕获，并在表头显示失败原因 |
| 本机偏好 | `localStorage` key 带命名空间，读写都有 try/catch |
| 注入的样式表 | `<style id="dsh-model-organizer-style">`，类名统一 `dsh-mo-*` 前缀，注入幂等 |
| 服务端半边 | 只有空 `apply()`，不注册任何宿主能力 |

### 仍然存在的风险（无法在插件侧消除）

- **`conversation.input.model` 是 single 座位**：将来若另一个插件以相同优先级注册，SlotCore 会抛错（本插件的 `guard` 会记 warn，官方内置组件仍会渲染）。
- **官方模型页若改变 keyed 派发约定**，依赖该座位的插件会失效 —— 本插件已不依赖它。
- **官方 CSS module 若改名**（例如删掉 `optionCopy`），校验会失败并退回回退样式：功能可用、外观降级。
- **卡片排序**是本插件唯一会改官方 DOM 的地方（给官方列表设 `display:flex` + 给 `li` 设 CSS `order`，不移动节点）。若 DSH 改那棵 DOM，该功能会静默降级，其余功能不受影响。

## 排查手册

### 让 agent 浏览器不显示窗口（消除抢焦点）

`dsh-ego-browser` 驱动的 Chromium 是 DSH 的子进程，默认以真实窗口存在，并且**每次动作工具都会 `Target.activateTarget` 把它顶到前台**（这就是「用着用着 Chrome 跳出来」的原因）。让它完全不出现窗口：

```powershell
# 只对当前终端会话生效（先这样试）
$env:EGO_LINUX_HEADLESS = 1
dsh web

# 永久生效（设完必须重开终端，再启动 DSH）
setx EGO_LINUX_HEADLESS 1
```

- 显式设置 `1/true/yes/on` **优先于**「有没有显示环境」的自动推断（含 Windows）。
- 浏览器是**单例常驻**进程：改完要重启 DSH（或 `ego-browser --stop`）才冷启动生效。
- **代价**：只损失「实时观察窗」；其余 `ego_*` 工具（导航/点击/输入/JS/截图/下载）全部照常。
- 不要用 `chromeArgs` 传 `--headless` —— 它在 `CHROME_BLOCKED` 黑名单里，会被过滤掉。

### 改了插件代码但界面没变化

DSH 把客户端 bundle 以 `Cache-Control: public, max-age=31536000, immutable` 下发，而 URL 不随代码变化 —— 普通刷新会一直用缓存。**必须 Ctrl+Shift+R**（或在 DevTools → Network 勾 Disable cache）。

## 发版流程

```sh
# 1. 改代码后升版本号（npm 不允许覆盖已发布的版本）
#    package.json 的 version：0.3.2 → 0.3.3
# 2. 提交并推送
git add -A && git commit -m "..." && git push
# 3. 发布
npm publish
```

发布需要带 **Bypass 2FA** 的 Granular Access Token（npm 2025-11 起只支持 granular token）。配置方式：
npmjs.com → 头像 → Access Tokens → Generate New Token → Packages 选 **All Packages + Read and write (publish and stage)**、**Organizations 选 No access**、勾 **Bypass two-factor authentication**；然后
`npm config set //registry.npmjs.org/:_authToken=npm_xxx`（写进用户级 `.npmrc`，不要放进仓库）。

## 附：关于「(modlens vision)」供应商分组

这些是 **`@liustack/modlens` 自动生成的「视觉变体」路由**，不是配置重复项：

- 机制：modlens 扫描已注册 provider，找出上游元数据声明为 `text` 且不含 image 的模型（默认按 `deepseek` / `glm` / `mimo` 前缀族匹配），为它们注册一条**声明支持图片输入**的伴随路由，界面名加 `(modlens vision)`。
- 用途：选中该分组下的模型后，粘贴/拖拽图片会走 DSH 原生附件流程，在调用（纯文本）模型前把图片转成证据文本。不选这个分组时，纯文本模型无法接收图片。
- 调整：编辑 `$DSH_HOME/profiles/<profile>/cordis.patch.yml` 里的 `modlens` 配置（`families` / `discover`），整条关掉用 `visionProvider: false`。视觉引擎配置在 `~/.modlens/config.json`。
