# dsh-model-organizer

给 DSH（DeepSeek Harness）换个更好用的模型选择器：**按供应商分组、可折叠、可拖拽排序**。

## 它解决什么问题

官方那个模型下拉是一个扁平长列表——供应商只是粘性小标题，模型多的时候要滚很久，也没法按自己的习惯排序。这个插件把它改成两级：**先看供应商，点开才看模型**，并且供应商和模型的顺序都能直接拖。

## 功能

**输入框的模型菜单**
- 默认只列供应商，点一下展开它的模型，当前模型打 ✓
- 按钮上显示 `模型 · 推理等级`，菜单最底部的「推理等级」可单独切换（只在模型声明了等级时出现，怎么声明见下文）
- 外观沿用官方样式（同一个弹层、同一套图标），不会突兀

**排序**
- 在「设置 → 模型」右下角的浮窗里，**直接拖动**供应商行或模型行
- 模型顺序保存到 DSH 的 `settings.yaml`：换浏览器、清缓存都不丢，所有打开这份 DSH 的设备共用；供应商顺序只记在当前浏览器里

## 安装

```sh
dsh plugin --profile web add dsh-model-organizer
```

装完重启 web 服务（关掉再 `dsh web`）。卸载：

```sh
dsh plugin --profile web remove dsh-model-organizer
```

也可以从 GitHub 或本地目录装：

```sh
dsh plugin --profile web add github:NimoXie15/dsh-model-organizer
dsh plugin --profile web add link:/absolute/path/to/dsh-model-organizer
```

> **兼容性**：已在 DSH `0.1.7`、`0.2.0-rc.1` 上核验，`0.1.5` 起都可用（0.1.7 调整了一处内部接口，本插件已做兼容处理）。注意 0.2.0 起官方主题把菜单背景改成了半透明，模型菜单也随之变通透——这是跟随官方新皮肤，不是故障。
>
> 升级插件后如果界面没变化，按 **Ctrl+Shift+R** 强刷一次（浏览器可能还在用缓存的旧版本）。

## 截图

📷 待补充。

## 想让「推理等级」出现，需要模型自己声明

只有模型提供了等级，菜单里才会出现「推理等级」入口——这与官方行为一致。在你的 `settings.yaml` 里给模型加上：

```yaml
# settings.yaml → llm-pi-ai.providers.<供应商>.models[]
- id: <你的模型 ID>
  reasoningEfforts:      # 键=菜单里显示的等级，值=选中时发给模型的 API 参数；只有 off 可以留空
    off:
    high: high
```

## 已知限制

- 排序浮窗只列「设置 → 模型」里自己添加的供应商，**DeepSeek 官方供应商不能排序**（输入框菜单里照常出现、可选）
- 供应商顺序、浮窗位置只存在当前浏览器；模型顺序存在 `settings.yaml` 里，同一份 DSH 的所有设备共用——两台机器各装一份 DSH 则互不相通
- 不修改 DSH 本体，只通过官方提供的扩展点接入

## 许可

MIT

---

想自己改这个插件、或者想了解它内部怎么实现的，见 [DEVELOPING.md](./DEVELOPING.md)。
