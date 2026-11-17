# Penpot 上的 AI PPT 设计规格

状态：待审核。没有实现，没有实施计划。  
日期：2026-11-18。  
基线：`main` `55a615b`。宿主依据：Penpot `2.4.3` 标签源码。

## 0. 当前方案

用户在 Penpot 空白画布上打开 Canvory 助手，选择 PPT 模式，输入需求并挂上资料。助手生成章节和文字，在当前 Page 上逐块创建 Board。之后用户把一张或几张 Board 挂到助手上，只改这些画板。

2026-11-17 的独立网页和四步向导不再是当前方案，只留在第 12 节。

设计过程：再次运行 Impeccable 4.5.1 的 `context`，目标路径是本文件。解析结果仍是没有可扫描的网页实现。按 `shape` 只做浮窗的层级和交互，没有运行 `concept-seed`，没有效果图，没有 `craft`。

## 1. 名词

| 词 | 在 Penpot 2.4.3 里 | 在本设计里 |
|---|---|---|
| File | `currentFile`，含 `pages` | 一份演示稿 |
| Page | 文件里的文档标签。`createPage` / `openPage`。`pagechange` 在当前 page id 变化时触发 | 不拿来当幻灯片。一份演示稿使用一个 Page |
| Board | `createBoard()` 实际创建 `:frame`（`frontend/src/app/plugins/api.cljs`） | 一张幻灯片 |
| Root Frame | id `00000000-0000-0000-0000-000000000000` | 不是幻灯片。导出继续跳过 |

推荐映射：一个 Penpot 文件 = 一份演示稿；其中一个 Page = 整套幻灯片所在的画布；每个 Board = 一张幻灯片。这样多选和缩略名单都在同一视图里。不把幻灯片做成多个 Page，否则选几张幻灯片就要跨标签。

## 2. 宿主能力（已核对）

来源：`penpot/penpot` 标签 `2.4.3` 的 `frontend/src/app/plugins/*.cljs` 与 `frontend/resources/plugins-runtime/index.js`。本仓库插件已在这个版本上创建过画板、文本、矩形和图片填充。

插件做得到：

- 入口是插件管理器里的打开。运行时 `penpot.ui.open` 创建 `<plugin-modal>`，绝对定位、可调大小、可关闭。这不是停靠侧栏。
- 权限枚举：`content:read`、`content:write`、`library:read`、`library:write`、`user:read`、`comment:read`、`comment:write`、`allow:downloads`。绘制和写入 metadata 需要 `content:write`。
- 事件：`selectionchange`（选中 id 数组）、`pagechange`、`filechange`（当前文件 id 变化，不是每次保存）、`shapechange`、`contentsave`、`themechange`、`finish`（离开文件）。
- `createBoard`、`createText`、`createRectangle`、`createShapeFromSvg`、`appendChild`、`insertChild`。`appendChild` 只接受 frame、group、svg-raw、bool 作为父级。
- `setPluginData` / `getPluginData` 写在 shape、page 或 file 上，键属于该插件 id。也有 `shared` 命名空间。
- `history.undoBlockBegin` / `undoBlockFinish` 调用工作区的 undo transaction，需要 `content:write`。
- 创建形状走 `commit-changes`，因此和手改进入同一套变更。协作冲突由 Penpot 的文件保存处理，插件没有单独的合并接口。

插件做不到，不能写成已有能力：

- 没有停靠、常驻、跨文件仍打开的全局侧栏。浮窗随插件关闭而消失。`filechange` 表示当前文件换了，旧文件的内存会话不能继续往新文件画。
- 没有 chart 图层。
- 不能执行模型返回的任意代码。设计只允许下面第 5 节的固定操作。

若产品要求助手停靠在画布左侧或右侧、并且换文件后仍在，那就要在自托管的 Penpot 前端加一个面板槽，把同一 iframe 放进去。这是小范围宿主改动，不是 fork 整套 Penpot，也不是退回独立网站。默认路径不改宿主。

## 3. 三条集成路径

1. **推荐：只做插件浮窗。** 用现有 `ui.open`、选择监听、画板写入和 `pluginData`。导出仍走现有服务端队列。限制写进界面：这是可拖动浮窗，不是侧栏。
2. **自托管前端加一个面板槽。** 仅当第 2 节的停靠要求被确认。槽位只承载现有插件 iframe，不重写画布。
3. **独立网页主应用。** 已放弃。保留为决策历史。

## 4. 旅程和状态

没有步骤轨。一个浮窗里完成。

```
[ PPT ]
挂载： （空，或画板名 ×）
[ 需求与资料…………………… ]
章节
  1  ……  待绘制
[ 绘制 ]  [ 停止 ]
```

状态：`idle`、`reading`、`chapters_ready`、`drawing`、`paused`、`failed`。

默认行为：需求提交后先在浮窗里列出章节，然后自动开始逐张绘制。每一张 Board 提交前都可以停止。停止留下已提交的画板，不删除。这不是六步向导；用户也可以在列表出现后按停止，只保留章节文字、不继续画。不增加「必须先点确认才允许画」的门。

绘制一张的顺序：`undoBlockBegin`，创建 Board，写入文字和预览，`setPluginData`，`undoBlockFinish`。用户撤销一次应撤掉这一张，而不是半张。实现时要验证 `commit-changes` 确实落在该事务里；若宿主把每次创建都变成单独撤销步，就停下来改调用方式，不能假装已经是一步。

比例和模板在浮窗的 PPT 模式里，是折叠的一组字段，不是全屏页面。

## 5. 选区、挂载、任务

`selectionchange` 只更新「当前选区」显示，不改变挂载集。

挂载集是用户显式加入的 Board id 列表，存在 file 的 `pluginData`（`canvory.mounts`）。标签显示名称。移除、锁定都改这份列表。锁定的 Board 不接受写入。

修改只作用于挂载集。未挂载的画板不改。选区变了也不改挂载集。

任务开始时记录快照：挂载 id、每块 Board 的 `pluginData` 修订号、以及这些 id 是否仍在当前 Page。生成过程中若 `shapechange` 命中某块已挂载 Board，且修订不是本任务写的，则该张跳过并标「你已手改」。不覆盖。

删除：目标 id 已不存在则该张失败，可重试其余张。取消中止未发出的张。已 `undoBlockFinish` 的张保留，用户用 Penpot 撤销自行撤掉。

局部重试只重做失败的章节。手改过的文字节点若 `pluginData` 标了 `userEdited`，重试时跳过该节点。

## 6. 工具协议

模型不返回可执行代码。它只返回 JSON。服务端用 schema 校验，非法字段整段拒绝。

允许的操作只有：

- `createBoard`
- `createText` 并 `appendChild` 到指定 Board
- `createRectangle` / `createEllipse` 并放入 Board
- `setPluginData`
- `uploadMedia` 后把图片填进矩形
- 替换本任务先前创建的、且未标 `userEdited` 的节点文本

超出这份名单的操作丢弃并记入任务错误。资料文件先上传解析成文本块，块 id 写进生成结果的 `sourceRefs`。用户资料不放进系统提示，只作为内容字段。

长输入不设产品字数硬顶。按标题和段落切块，每块有预算配置。进度、取消、单块重试与先前设计相同。没有供应商密钥时绘制按钮不可用。

## 7. 图表双模型

Penpot 上没有 chart。每张数据图表有：

- sidecar：`pluginData` 里的 `ChartData`（柱、条、折线、饼、散点；类目和系列）。
- 画布预览：一组矩形或折线，id 记在 sidecar 的 `previewGroupId`。预览只给人看。

导出 PPTX 时只读 sidecar，调用 `pptxgenjs@3.12.0` 的 `addChart`。验收仍是图表部件和数值，不是 `ppt/media` 里的一张图。PowerPoint 改数据的实机项未做，不豁免。四软件矩阵和五人试用仍维持原豁免，不自动恢复。

用户手改预览形状后，sidecar 数据不变，并标 `previewDiverged`。导出前提示：外观手改不会进入 PowerPoint 图表，导出仍用数据表。助手里改数据表会在一次撤销事务中重建预览组；若 `previewDiverged`，先要求确认再重建。

不从矩形反推数据。

第一批类型和范围与 `CHART_NAME` 里的 `bar`、`line`、`pie`、`scatter` 对应。柱和条都用 `bar`，方向待生成的 chart XML 核对，不在类型声明里猜 `barDir` 的枚举。

## 8. SVG、Mermaid、AntV

对象保存 `kind`、`source`、解析后的 `data`（若有）、图说、可选预览资源。

画布上显示的是形状或图片。SVG 源在写入前去掉 script、事件属性和外链。可编辑指：在助手里改 source，并在能拆成矩形、椭圆、直线和不超过 8 点的折线时写成 Penpot 形状。拆不开则预检阻断，用户明确接受后才作为不可结构化编辑的图导出。

PNG 只替换整张、改位置和图说。

这些都不是原生 chart。

## 9. 模板和三种导出

模板字段在浮窗内。提取规则不变：字体名、色板、背景、版式占位框；丢弃原页正文、动画、宏、OLE、外链。缺字体只警告并回退，不嵌入未授权字体。

导出时从当前 File 读取 Board 几何和文本，从 `pluginData` 读取图表、图源和图说，组成一份 CDM，再分发：

- PPTX：现有导出器加 `addChart`。
- HTML：同一 CDM 的只读包，SVG 再净化。
- PDF：同一 CDM 的页图。渲染器仍是运行前配置，不在本设计里挑选库。

Penpot 上的手改在下一次导出时重新读取。没有第二条隐藏文档。

## 10. 子系统

| 子系统 | 依赖 | 独立验收 |
|---|---|---|
| 浮窗、PPT 模式、挂载集 | 插件 `ui.open` 与 `selectionchange` | 改选区不改挂载 |
| 分块生成与固定操作 | provider 接口 | 无密钥不画；非法操作被拒 |
| 逐张 Board 与撤销事务 | `createBoard`、`undoBlockBegin` | 停止后已完成的板还在；一页一次撤销 |
| 模板提取 | 上传的 PPTX | 结果无原正文 |
| sidecar 与原生 chart | `addChart` | 包内有 chart 部件和数值 |
| 图源与预检 | 形状或图片写入 | 不能保真时不产生新的 media |
| HTML / PDF | 同一 CDM | 与 PPTX 的文字一致；PDF 不声称可编辑 |

顺序可以分里程碑，但原生 chart 仍是整份目标的硬要求，不是可选项。

## 11. 验收

| 项 | 现在 |
|---|---|
| 浮窗不是侧栏 | 源码已证明 UI 形态。产品未做 |
| 挂载与选区分离 | 未做 |
| 一页一个 undo 事务 | API 存在。是否包住 `commit-changes` 要在实现时验证，现未验证 |
| 模板无正文 | 未做 |
| chart XML 含数据且幻灯片关系不是只指向图片 | 未做 |
| PowerPoint 中改数据 | 未做，不豁免 |
| 不能保真的图被拦住 | 未做 |
| 四软件全矩阵、五人试用 | 维持原豁免 |

没有性能达标数字。实现后对固定页数记录墙钟。

## 12. 决策历史

2026-11-17 的规格 `2026-11-17-web-ppt-studio-design.md` 把主入口写成独立网页和四步向导。该方向已被本文件取代。模板范围、原生图表、分块、图源和两项历史豁免仍然有效。

## 13. 待确认

是否接受官方插件浮窗作为助手。它可拖动、可关闭，但不是停靠侧栏，换文件会结束当前会话。若必须停靠且跨文件仍在，才在自托管前端加面板槽。默认是浮窗，不改宿主，也不回到独立网站。
