# M3 宿主绘制实测

日期：2026-11-18。绘制用的是标成「测试夹具，不是模型生成」的固定操作，不是外部模型。

## 命令

`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` 退出码都是 0。有断言的测试 82 个：document-model 4、core 30、exporter-pptx 3、server 19、penpot-plugin 26。

## 执行器

- 新建画板不要求事先挂载。编辑已有画板必须在挂载集里，并且该画板自己的 `canvory.board-rev` 与任务开始时一致。挂载集修订号不变但画板修订号变了，仍然跳过。
- 每个画板一对 `undoBlockBegin` / `undoBlockFinish`。Penpot 2.4.3 插件 history 没有 `undo()`，失败的画板会结束当前事务并标失败，不会假装已经自动撤销。
- 取消或文件、页、epoch 不再匹配时，已画完的画板留下，后面的标停止，不再调用宿主。
- 模型带来的 `setPluginData` 在宿主执行前被拒绝。图片资源必须是当前页已有 id，不抓 URL。
- 沙箱脚本不打包 Zod，避免 Penpot 插件运行时把 `toString` 写成只读而打不开浮窗。

## 实机

本地 HTTP 夹具返回两条操作。插件「生成」显示「传输结果，不是外部模型验收。已校验 2 条操作，尚未绘制。」然后「绘制」才在宿主创建 `IT7484-M3-TRANSPORT` 和它的文字。这不是外部模型。

焦点回到画布后按一次 Ctrl+Z，该画板和文字一起从图层消失。失败画板没有自动回滚；界面写明要用 Penpot 撤销，插件不能自动回滚。

把已挂载画板上文字宽度从 880 改到 140 之后，插件读到的画板修订仍是 1，随后的编辑没有跳过。宿主手改跳过这次没有被证明。单元测试覆盖修订号不一致时跳过。`shapechange` 按官方事件接收形状代理，并另记一份外部修改计数，但这次属性修改没有让计数增加。

图片沿用当前页已有 id 的放置函数已接上。这次实机没有拿现成图片 id 画出新矩形。M4 需要 `uploadMediaData` 这条导入路径，不能永远只引用已有图片。

截图：

- `/opt/cursor/artifacts/m3-fixture-created.png`
- `/opt/cursor/artifacts/m3-fixture-edit.png`

没有用真实模型密钥。
