# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

现有仓库是 TypeScript monorepo。主入口是自托管 Penpot 2.4.3 里的 Canvory 插件。服务端仍用现有的文档、版本、队列和对象存储做导出。不新做独立网页主应用。

## Users

在 Penpot 空白文件里做演示稿的人。他们打开 AI 助手，选择 PPT 模式，说出需求并挂上资料，然后在同一张画布上改画板。

## Product Purpose

Penpot 是主画布。AI 助手生成章节和文字，并在当前 Page 上逐张创建可编辑的 Board。之后用户把一张或几张 Board 挂到助手上，只改这些画板的文字、版式或配图。成功是：画布上的对象能手改，数据图表在 PowerPoint 里能改数据，模板不把原 PPT 正文带进来。

## Positioning

一张幻灯片是一个 Board，不是 Penpot 的 Page。Page 是文件里的文档标签。一份演示稿优先对应一个 Penpot 文件、其中一页 Page、多块 Board。数据图表的数据在插件 metadata 里，导出时写成 Office 原生 chart，不用图片冒充。

## Operating Context

用户已在 Penpot 编辑器中。助手是插件浮窗，不是六步向导，也不是 Penpot 自带的停靠侧栏。绘制可以中途停止。手改过的图层要留下来。

## Capabilities and Constraints

已确认：

- 需求输入不设产品字数硬顶。模型调用分块，有进度、取消和局部重试。
- 供应商和密钥未配置。没有配置就不生成。mock 只用于测试。
- 模板 PPT 只提取字体、配色、背景、版式。不导入原页正文。
- 数据图表必须是 PowerPoint 可改数据的原生 chart。Penpot 没有图表图层，画布上的图形只是预览。
- Mermaid、AntV 等保留类型、源和图说。不能保真时预检阻断，不自动截图。不承诺任意 SVG 在 PowerPoint 里可编辑。
- PNG 只有像素。
- PPTX、HTML、PDF 读同一次从 Penpot 和 sidecar 读出的内容。
- 四款办公软件全面矩阵和五人试用维持原豁免。原生图表的实机改数据不豁免。

未决，且会改变是否改宿主：

- 官方插件只能开浮窗。若必须是停靠在画布旁、切换文件仍在的侧栏，就要在自托管前端加一个面板槽。默认不改宿主，也不退回独立网站。

## Brand Commitments

名称 Canvory。画布是 Penpot 自己的画布，助手不另做一套桌面。面板跟随 Penpot 的明暗主题，字用中文黑体，主操作只有一个。

## Evidence on Hand

Penpot 2.4.3 源码（tag `2.4.3`）和本仓库已跑通的插件导出。没有全局停靠助手，没有原生图表导出，没有模板库。这些都还是设计。

## Product Principles

- 画布上的图层归用户。助手只在挂载范围内写入，并且放进一次撤销事务。
- 选区和挂载集是两套名单。
- 图表的数据表决定 PPTX。画布上的预览形状不反推数据。
- 做不到的宿主能力写明，不把浮窗叫成侧栏。

## Accessibility & Inclusion

浮窗里的挂载名单、输入和数据表可用键盘到达，焦点可见。序列不单靠颜色区分。中文长需求在浮窗内滚动，不设字数截断。对比度未实测，不写达标数字。
