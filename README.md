# dsh-model-organizer

给 DSH（DeepSeek Harness）换个更好用的模型选择器：**按供应商分组、可折叠、可拖拽排序**。

## 它解决什么问题

官方那个模型下拉是一个扁平长列表——供应商只是粘性小标题，模型多的时候要滚很久，也没法按自己的习惯排序。这个插件把它改成两级：**先看供应商，点开才看模型**，并且供应商和模型的顺序都能直接拖。

## 功能

**输入框的模型菜单**
- 默认只列供应商，点一下展开它的模型，当前模型打 ✓
- 触发器显示 `模型 · 推理等级`，等级可以在菜单底部单独切换
- 外观沿用官方样式（同一个弹层、同一套图标），不会突兀

**排序**
- 在「设置 → 模型」右下角的浮窗里，**直接拖动**供应商行或模型行
- 模型顺序写进 `settings.yaml`（永久、跨设备）；供应商顺序存在本机

## 安装

```sh
dsh plugin --profile web add dsh-model-organizer
```

装完重启 web 服务（关掉再 `dsh web`）。卸载：

```sh
dsh plugin --profile web remove dsh-model-organizer
```

也可以从 GitHub 或本地目录装（`dsh plugin` 只是转发给 pnpm，不需要发布到 npm）：

```sh
dsh plugin --profile web add github:NimoXie15/dsh-model-organizer
dsh plugin --profile web add link:/absolute/path/to/dsh-model-organizer
```

> **兼容性**：已在 DSH `0.1.7` 上实测，`0.1.5` 起都可用（0.1.7 调整了一处内部接口，本插件已做兼容处理）。
>
> 升级插件后如果界面没变化，按 **Ctrl+Shift+R** 强刷一次（浏览器可能还在用缓存的旧版本）。

## 截图

📷 待补充。

## 想让「推理等级」出现，需要模型自己声明

只有模型提供了等级，菜单里才会出现「推理等级」入口——这与官方行为一致。在你的 `settings.yaml` 里给模型加上：

```yaml
# settings.yaml → llm-pi-ai.providers.<供应商>.models[]
- id: <你的模型 ID>
  reasoningEfforts:      # 键=可选等级，值=发给上游的线值；只有 off 可以留空
    off:
    high: high
```

## 已知限制

- 只对「设置 → 模型」里自己添加的供应商生效，**DeepSeek 官方供应商不在其中**
- 供应商顺序、浮窗位置只保存在本机浏览器，不跨设备同步；模型顺序写在设置里，会跟着走
- 不修改 DSH 本体，只通过官方提供的扩展点接入

## 许可

MIT

---

想自己改这个插件、或者想了解它内部怎么实现的，见 [DEVELOPING.md](./DEVELOPING.md)。
