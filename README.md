# dsh-model-organizer

给 DSH（DeepSeek Harness）换个更好用的模型选择器：**按供应商分组、可折叠、可拖拽排序**。

## 它解决什么问题

官方那个模型下拉是一个扁平长列表——供应商只是粘性小标题，模型多的时候要滚很久，也没法按自己的习惯排序。这个插件把它改成两级：**根层先选「模型」或「推理等级」，模型层里按供应商分组**，供应商和模型的顺序都能直接拖。

## 功能

**输入框的模型菜单**
- 根层与官方一致：「模型」「推理等级」两个入口——「推理等级」**常驻**，未配置等级的模型上置灰、不可点
- 「模型」里保留本插件的改进：按供应商分组、可折叠，顺序与设置页浮窗一致，当前模型打 ✓
- 模型多于 4 个时，「模型」层顶部有官方同款的「搜索模型」框（0.2.0-rc.2 起官方才有此样式，旧版自动隐藏）
- 外观完全沿用官方样式（同一个菜单表面、同一套图标，含官方的毛玻璃背景）

**排序**
- 在「设置 → 模型」右下角的浮窗里，**直接拖动**供应商行或模型行
- 模型顺序通过官方设置接口持久化（跟着 DSH 的配置走，不存浏览器）；供应商顺序只记在当前浏览器里

## 安装

```sh
dsh plugin --profile web add @nimoxie/dsh-model-organizer
```

装完重启 web 服务（关掉再 `dsh web`）。卸载：

```sh
dsh plugin --profile web remove @nimoxie/dsh-model-organizer
```

也可以从 GitHub 或本地目录装：

```sh
dsh plugin --profile web add github:NimoXie15/dsh-model-organizer
dsh plugin --profile web add link:/absolute/path/to/dsh-model-organizer
```

> **兼容性**：已在 DSH `0.1.7`、`0.2.0-rc.1`（web）、`0.2.0-rc.2`（桌面端）上核验，`0.1.5` 起都可用。
>
> 升级插件后如果界面没变化，按 **Ctrl+Shift+R** 强刷一次（浏览器可能还在用缓存的旧版本）。

## 想让「推理等级」可用，需要模型自己声明

「推理等级」入口常驻菜单根层；只有模型声明了等级，它才可点、才会在按钮上显示当前等级。在模型配置里加上（`llm-pi-ai.providers.<供应商>.models[]`；0.2.x 在 profile 的 `cordis.patch.yml`，0.1.x 在 `settings.yaml`）：

```yaml
# llm-pi-ai.providers.<供应商>.models[]（0.2.x 在 profile 的 cordis.patch.yml；0.1.x 在 settings.yaml）
- id: <你的模型 ID>
  reasoningEfforts:      # 键=菜单里显示的等级，值=选中时发给模型的 API 参数；只有 off 可以留空
    off:
    high: high
```

## 已知限制

- 排序浮窗只列「设置 → 模型」里自己添加的供应商，**DeepSeek 官方供应商不能排序**（输入框菜单里照常出现、可选）
- 供应商顺序、浮窗位置只存在当前浏览器；模型顺序存在 DSH 的用户配置里，同一份 DSH 的所有设备共用——两台机器各装一份 DSH 则互不相通
- 不修改 DSH 本体，只通过官方提供的扩展点接入

## 许可

MIT

---

想自己改这个插件、或者想了解它内部怎么实现的，见 [DEVELOPING.md](./DEVELOPING.md)。
