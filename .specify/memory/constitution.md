<!--
Sync Impact Report
- Version change: (template scaffold) → 1.0.0
- Modified principles: N/A (initial ratification from empty placeholders)
- Added sections:
  - Core Principles I–VI（统一文档模型优先；内容/表现/运行分层；统一创作多种输出；
    编辑器与模型解耦；中文优先；架构可验证与质量门禁）
  - 技术与工程约束
  - 开发与交付工作流
  - Governance
- Removed sections: none
- Follow-up TODOs: none
-->

# Canvory Constitution

## Core Principles

### I. 统一文档模型优先（NON-NEGOTIABLE）

Canvory Document Model（CDM）是产品的核心技术资产，MUST 独立于任何编辑器、
运行时或导出格式存在。所有创作来源（Penpot、自研 Studio、导入、AI 生成）MUST
先进入 CDM，再进入 Core Engine / Renderer / Exporter。禁止以 PPTX、Penpot、
Slidev 或 Markdown 作为唯一底层数据结构。CDM MUST 携带 `schemaVersion`，
并以可演进的方式管理迁移。

**理由：** 先解决内容模型、再堆功能，才能以可控成本扩展形态与输出格式。

### II. 内容、表现、运行分层

内容层（文字、图片、图形、媒体、关系）、表现层（布局、主题、样式、动画、转场）
与运行层（播放、交互、翻页、讲解、用户操作）MUST 保持清晰边界，禁止混为一体。
动画与交互 SHOULD 作为独立引用关系保存，而非全部内嵌到每个 Node 的私有属性中。
动画数据 MUST 保存标准化描述，禁止直接持久化特定运行时对象（如 GSAP 实例）。

**理由：** 分层才能在不破坏原始内容的前提下切换输出形态与运行体验。

### III. 统一创作、多种输出

产品定位是统一视觉内容生产平台，不是单一 PPT 导出工具。同一份 CDM MUST 能
支撑演示文稿、互动绘本、动画、教学白板、网页等内容形态。PPTX 是第一个输出格式，
但 MUST NOT 成为 Document Model 的设计标准；HTML 是正式产品交付形态，
MUST NOT 仅被当作 PPT 的中间转换格式。复杂对象 MUST NOT 为适配某一导出格式
而强制栅格化后回写进 CDM。

**理由：** One Creative Canvas. Multiple Ways to Experience.

### IV. 编辑器与模型解耦

短期可使用 Penpot 验证工作流，但 Penpot MUST 仅作为过渡性 Source Adapter，
不得成为永久核心编辑器。新增或更换创作来源时，MUST 通过 Adapter 接入 CDM，
禁止重写 Core / Exporter。长期目标 MUST 拥有自研 Studio、Runtime、Export Engine、
Asset Manager 与主题/组件体系。`studio` 与 `viewer` SHOULD 共享底层 Renderer，
避免双轨维护绘制逻辑。

**理由：** 边界清晰才能在演进编辑器时保护核心资产。

### V. 中文优先

本项目的治理文档、规格说明、技术设计、任务描述、评审意见与 Agent 交互输出
MUST 使用简体中文。代码标识符、公开 API 名称、协议字段与第三方库约定可保持英文；
用户可见文案默认以中文为第一语言。引用英文专有名词（如 CDM、PPTX、HTML）时，
SHOULD 在首次出现处给出中文释义或保持既定术语表一致。

**理由：** 团队沟通与规格驱动开发以中文为主，降低歧义与协作成本。

### VI. 架构可验证与质量门禁

影响 CDM、导出或 Runtime 的变更 MUST 能被自动化或可重复验收覆盖。至少保留并
持续满足以下架构验收意图：

- **测试 A：** 同一份 CDM 可导出 PPTX 并渲染 HTML，结构与布局一致。
- **测试 B：** 不经 Penpot 手工构建 CDM，仍可生成 PPTX 与 HTML。
- **测试 C：** 新增场景类型时，不破坏 CDM 基础结构与既有导出核心。

第一阶段导出质量门槛（文本可编辑率、尺寸误差、兼容性目标等）以
`docs/设计方案/Canvory_Technical_Architecture_v1.0.md` 第十三章为准；偏离 MUST
在规格或任务中显式记录并获评审同意。

**理由：** 架构承诺必须可测试，否则会退化为口号。

## 技术与工程约束

- **工程形态：** 采用 TypeScript Monorepo（建议 pnpm + Turborepo）；前期使用
  模块化单体，禁止无明确边界与规模理由时过早拆分微服务。
- **核心包边界：** `document-model`、`core`、`renderer`、`exporters`、`adapters`
  职责分离；业务应用不得绕过 CDM 直接耦合导出实现细节。
- **资源引用：** 节点通过 Asset ID 引用媒体与字体，禁止把临时 URL 当作唯一真相。
- **后端数据：** PostgreSQL 存元数据与文档 JSONB；大文件进对象存储；复杂导出走
  任务队列。文档主体不以「每节点一行」方式建模。
- **发布安全：** 用户 HTML/SVG/媒体不可无条件执行任意脚本；限制不可信嵌入；
  发布资源 MUST 打包校验。
- **AI 接入：** AI MUST 产出可校验的 CDM 变更（补丁/操作协议），禁止直接操控 DOM
  作为持久化路径。
- **权威设计参考：** 产品与技术决策以 `docs/设计方案/Canvory_Technical_Architecture_v1.0.md`
  为基线；若实现偏离，MUST 先修订规格或更新本宪法后再落地。

## 开发与交付工作流

1. **规格先行：** 新能力先通过 Spec Kit 流程（constitution → specify → plan →
   tasks → implement）明确意图与验收标准，再编码。
2. **增量交付：** 优先完成 PPTX 商业闭环，同时从第一天保留最小 HTML Renderer
   能力；不为远期功能无限拖延第一版，也不允许第一版架构完全围绕 PPTX 建模。
3. **变更审查：** PR/评审 MUST 检查是否违反 CDM 优先、分层边界、中文文档与
   安全约束；新增复杂度 MUST 给出替代方案被否决的理由。
4. **文档同步：** 影响架构边界的合并 MUST 同步更新相关 `docs/` 与规格产物。

## Governance

本宪法高于习惯做法与临时约定。修订 MUST：

1. 更新 `.specify/memory/constitution.md` 并提升语义化版本；
2. 在文件顶部 Sync Impact Report（提交前可移除）中记录变更摘要；
3. 评估对进行中规格、计划与任务的影响并注明迁移动作。

版本策略：

- **MAJOR：** 删除或重新定义不可协商原则，导致既有实践不兼容；
- **MINOR：** 新增原则/章节，或实质性扩展约束；
- **PATCH：** 措辞澄清、勘误、非语义润色。

合规期望：所有贡献者与 Agent 在规划与实现中 MUST 遵守本宪法；发现冲突时
先修订宪法或规格，再继续实现。运行时开发指引以本文件与
`docs/设计方案/Canvory_Technical_Architecture_v1.0.md` 为准。

**Version**: 1.0.0 | **Ratified**: 2026-11-17 | **Last Amended**: 2026-11-17
