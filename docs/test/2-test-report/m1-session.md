# M1 会话与浮窗实测

日期：2026-11-18。只覆盖会话子计划。生成、绘制、模板和导出都没有实现。

## 命令

在仓库根目录连续执行，全部退出码 0：

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

`pnpm test` 里有断言的用例 38 个：

| 包 | 通过 |
| --- | ---: |
| `@canvory/document-model` | 4 |
| `@canvory/core` | 9 |
| `@canvory/exporter-pptx` | 3 |
| `@canvory/server` | 9 |
| `@canvory/penpot-plugin` | 13 |

没有测试文件的包以 `--passWithNoTests` 退出码 0，不计入 38。

插件用例覆盖：1.0.0 仍可解析且缺省 `outline`/`charts` 为 `[]`；1.1.0 接受章节和图表字段；换文件不带走挂载和资料；未挂载、锁定、文件 id、页 id 或修订号不一致时 `allowWrite` 为 false；非用户画板（含页面根）不能写入挂载；选区变化不改挂载名单；「绘制」保持禁用。

## 宿主

Penpot 2.4.3 官方 `plugin-modal`。插件由 `penpot.ui.open` 打开，界面写明可拖动、可关闭。宿主标识为 Penpot。

同一文件内点击「挂载当前选区」后，名单出现画板「文本」，选区 id 单独显示。等待宿主保存插件数据后重新加载并再次打开插件，挂载名「文本」仍在，选区为空，因此挂载没有跟着选区走。再开一个新的浏览器上下文，进入同一文件后挂载名已经存在。

立即重载、赶在宿主把 `pluginData` 写入文件之前，可能读不到刚挂上的名单。这次通过的证据是等待约 8 秒后的重开，以及随后新浏览器上下文里的读回。

会话存在当前文件的 `pluginData` 键 `canvory.mounts`。值是完整 `FileSession`（文件 id、页 id、修订号、挂载、资料 id），不只是 id 数组。

## 还没有做

- 没有模型调用，也没有生成画板。
- 写入闸门核对的修订号是挂载集修订号。手改图层还不会改这个数字；逐画板 `pluginData` 修订和 `shapechange` 冲突留到绘制里程碑。
- 没有合并。
