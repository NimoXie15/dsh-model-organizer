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

> **兼容性**：已在 DSH `0.1.7-rc.1` 上验证，同时兼容 `0.1.5`/`0.1.6`（0.1.7 把客户端设置镜像服务从 `settingsScope` 改名为 `configForms`，本插件两个名字都注入，所以两个版本都能用）。
>
> 升级插件后如果界面没变化，按 **Ctrl+Shift+R** 强刷一次（DSH 的客户端 bundle 带一年 immutable 缓存，普通刷新不会重新下载）。

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

- 只处理 `llm-pi-ai` 命名空间下的供应商（DeepSeek 官方供应商不在其中）
- 供应商顺序、浮窗位置是本机偏好，不跨设备同步
- 只占用两个官方扩展点（`conversation.input.model`、`settings.models.footer`），不改官方代码

## 许可

MIT

---

开发笔记、兼容性审计、排查手册见 [DEVELOPING.md](./DEVELOPING.md)。
