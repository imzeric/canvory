# M3 宿主绘制实测

日期：2026-11-18。绘制用的是标成「测试夹具，不是模型生成」的固定操作，不是外部模型。

## 命令

`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` 退出码都是 0。有断言的测试 81 个：document-model 4、core 30、exporter-pptx 3、server 19、penpot-plugin 25。

## 执行器

- 新建画板不要求事先挂载。编辑已有画板必须在挂载集里，并且该画板自己的 `canvory.board-rev` 与任务开始时一致。挂载集修订号不变但画板修订号变了，仍然跳过。
- 每个画板一对 `undoBlockBegin` / `undoBlockFinish`。Penpot 2.4.3 插件 history 没有 `undo()`，失败的画板会结束当前事务并标失败，不会假装已经自动撤销。
- 取消或文件、页、epoch 不再匹配时，已画完的画板留下，后面的标停止，不再调用宿主。
- 模型带来的 `setPluginData` 在宿主执行前被拒绝。图片资源必须是当前页已有 id，不抓 URL。
- 沙箱脚本不打包 Zod，避免 Penpot 插件运行时把 `toString` 写成只读而打不开浮窗。

## 实机

Penpot 2.4.3 官方浮窗里点击「运行测试夹具」后，图层出现 `IT7484-M3-FIXTURE-1`（含文字和矩形）和 `IT7484-M3-FIXTURE-2`（含文字）。只挂载第一页和原先的「文本」后再点「测试夹具只改已挂载」，这两块出现 `IT7484-M3-EDIT`，未挂载的第二页没有这层。

截图：

- `/opt/cursor/artifacts/m3-fixture-created.png`
- `/opt/cursor/artifacts/m3-fixture-edit.png`

没有用真实模型密钥。
