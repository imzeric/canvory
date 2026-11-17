# Canvory — 产品整体技术设计方案

> 版本：v1.0  
> 日期：2026-11-17  
> 定位：以统一画布和内容模型为基础，生产演示文稿、网页、绘本、动画和互动教学内容的多形态视觉内容创作平台。

---

## 一、产品定位与核心原则

Canvory 不应只是一个 PPT 导出工具，而应成为一个统一的视觉内容生产平台。

用户在一个创作空间中完成内容创作，再根据使用场景输出为不同形态：

- 演示文稿：PPTX、HTML Slides、PDF。
- 互动绘本：翻页式 HTML、音频、交互与动效。
- 动画内容：时间轴、关键帧、动画播放。
- 教学白板：自由画布、书写、讲解与互动。
- 网页内容：产品介绍、信息展示、交互式页面等。

核心产品原则：

1. **统一创作，多种输出。** 不为 PPT、HTML、绘本、动画和白板分别建设一套内容数据系统。
2. **内容与表现分离。** 内容、布局样式、动画和交互应有清晰边界。
3. **PPTX 是第一个输出格式，而不是技术边界。**
4. **HTML 是正式的产品交付形态。** 不应只把 HTML 当作 PPT 的中间转换格式。
5. **编辑器与内容模型解耦。** 初期可以使用 Penpot 加快验证，但 Canvory 长期应拥有自己的内容模型、运行时和导出引擎。

产品方向建议：

> **One Creative Canvas. Multiple Ways to Experience.**  
> 一个创作空间，多种内容表达方式。

## 二、产品整体架构

### 2.1 产品分层

建议将 Canvory 分成三个主要层次：

| 层次 | 职责 |
|---|---|
| 内容层 Content | 文字、图片、图形、媒体、数据、内容关系 |
| 表现层 Presentation | 布局、主题、样式、动画、页面转场 |
| 运行层 Runtime | 播放、交互、翻页、讲解、用户操作 |

例如，一个标题文字属于内容层；标题从左侧滑入属于表现层；用户点击按钮后才显示标题属于运行层。

三个层次不能混为一体。这样才能在不破坏原始内容的情况下，切换不同输出形式。

### 2.2 产品形态

| 内容形态 | 核心能力 | 典型输出 |
|---|---|---|
| 演示文稿 Presentation | 多页面、图层、模板、备注、转场 | PPTX、HTML、PDF、PNG |
| 互动绘本 Storybook | 图文分页、翻页、配音、阅读进度、互动 | HTML、PDF |
| 动画 Animation | 时间轴、轨道、关键帧、缓动、音画同步 | HTML，后续 MP4 |
| 教学白板 Whiteboard | 无限画布、手写、标注、讲解、协作 | HTML、图片、PDF |
| 网页内容 Webpage | 页面区块、响应式布局、组件、交互 | HTML |

### 2.3 核心架构图

```text
Canvory Studio — 创作端
  ├── Web Editor
  ├── Canvas
  ├── Layers
  ├── Properties
  ├── Timeline
  ├── Asset Manager
  └── Theme / Template

              │
              ▼

Canvory Document Model（统一文档模型）
  ├── Document / Project
  ├── Scenes / Pages
  ├── Nodes
  ├── Styles / Layout
  ├── Animations
  └── Interactions

              │
              ▼

Canvory Core Engine
  ├── Layout Engine
  ├── Geometry Engine
  ├── Style Engine
  ├── Animation Engine
  ├── Interaction Engine
  ├── Asset Engine
  └── Theme Engine

              │
              ▼

Renderers / Exporters
  ├── Web Renderer        → HTML / Web Runtime
  ├── PPTX Exporter       → Editable PPTX
  ├── Static Renderer     → PDF / PNG / SVG
  └── Media Renderer      → 后续视频输出

              │
              ▼

Infrastructure
  ├── API
  ├── PostgreSQL
  ├── Redis / Valkey
  ├── Object Storage
  ├── Job Queue
  └── CDN
```

建议采用模块化单体起步，将核心模块边界设计清楚；业务规模和并发增长后，再考虑拆分独立服务。

## 三、参考 Slidev 的产品思路

[Slidev](https://sli.dev/) 值得借鉴的地方包括：

- HTML 页面直接运行，而不是只生成静态截图。
- 动画、转场和点击触发内容可以在浏览器中运行。
- 支持主题、组件、布局和可复用模板。
- 支持独立部署和分享。
- 同一份内容可以通过不同机制输出。

但 Slidev 更偏向开发者使用 Markdown 和 Vue 编写演示内容；Canvory 的目标用户应能通过可视化画布创作。

因此建议：

- Canvory 自己维护统一的 Document Model。
- HTML Runtime 负责将 Document Model 渲染为网页。
- PPTX Exporter 将 Document Model 转换为 PowerPoint 原生对象。
- Slidev 作为技术参考，未来可考虑成为可选的导入或导出适配器。
- 不将 Markdown 或 Slidev 文件作为 Canvory 唯一底层数据结构。

## 四、统一文档模型：Canvory Document Model（CDM）

这是整个产品最重要的技术资产。原有面向 PPTX 的 IR 应升级为与编辑器和输出格式无关的 Canvory Document Model。

### 4.1 数据层级

```text
Document
  ├── Scenes / Pages
  │     ├── Nodes
  │     │     ├── Text / Shape / Image / Video / Audio
  │     │     ├── Group / Path / Chart / Component / Embed
  │     │     └── Styles / Layout
  │     ├── Transition
  │     └── Notes
  ├── Assets
  ├── Themes
  ├── Animations
  └── Interactions
```

动画和交互建议作为独立引用关系保存，而不是全部塞进每个 Node 的子属性。这样可以支持一个动画控制多个对象，也能支持场景级交互。

### 4.2 Document 类型示例

```ts
interface CanvoryDocument {
  id: string;
  schemaVersion: string;
  title: string;

  type:
    | "presentation"
    | "storybook"
    | "animation"
    | "whiteboard"
    | "webpage";

  settings: {
    width: number;
    height: number;
    unit: "px";
    background: string;
    aspectRatio?: string;
  };

  themeId?: string;

  scenes: Scene[];
  assets: Asset[];
  animations: Animation[];
  interactions: Interaction[];

  metadata: {
    createdAt: number;
    updatedAt: number;
    version: number;
  };
}
```

### 4.3 Scene 类型示例

统一使用 `Scene`，而不是将页面概念限定为 `Slide`。

```ts
interface Scene {
  id: string;
  name: string;

  type:
    | "slide"
    | "book-page"
    | "animation-scene"
    | "whiteboard"
    | "web-section";

  duration?: number;

  background?: Paint;
  children: Node[];

  transition?: Transition;
  notes?: string;
}
```

### 4.4 Node 类型

```ts
type Node =
  | TextNode
  | ShapeNode
  | ImageNode
  | VideoNode
  | AudioNode
  | GroupNode
  | PathNode
  | ChartNode
  | ComponentNode
  | EmbedNode;
```

文本节点示例：

```ts
interface TextNode {
  id: string;
  type: "text";

  transform: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
  };

  content: {
    html?: string;
    runs?: TextRun[];
  };

  style: {
    fontFamily: string;
    fontSize: number;
    color: string;
    fontWeight: number;
    align: string;
  };
}
```

建议保留富文本 Runs，而不是单纯存储 HTML。HTML 可以作为编辑器内部富文本表达或缓存，但不能成为所有格式转换的唯一依据，否则 PPTX 原生文本转换会比较困难。

### 4.5 动画模型

第一阶段可以不开发动画编辑界面，但应预留标准化数据结构。

```ts
interface Animation {
  id: string;
  targetIds: string[];

  trigger:
    | "on-enter"
    | "on-click"
    | "after-previous"
    | "with-previous";

  type:
    | "fade"
    | "move"
    | "scale"
    | "rotate"
    | "reveal"
    | "custom";

  duration: number;
  delay: number;
  easing: string;

  from: Record<string, unknown>;
  to: Record<string, unknown>;

  startTime?: number;
  endTime?: number;
}
```

动画数据只保存标准化描述，不保存 GSAP 运行时对象。Runtime 再将描述交给 GSAP 或其他执行引擎。

未来可支持时间轴、多对象并行动画、顺序动画、点击触发、循环动画、场景转场，以及声音与动画同步。

### 4.6 交互模型

```ts
interface Interaction {
  id: string;
  sourceId: string;

  event:
    | "click"
    | "hover"
    | "double-click"
    | "key-press";

  action:
    | "navigate"
    | "show"
    | "hide"
    | "play-animation"
    | "play-audio"
    | "toggle"
    | "open-url";

  targetId?: string;
  value?: unknown;
}
```

由此支持页面跳转、图片放大、答案显示、音频播放、悬停提示和对象动画触发等功能。

## 五、编辑器技术路线

### 5.1 短期与长期策略

建议短期继续使用 Penpot 验证画布到 PPTX 的工作流，但将 Penpot 定位为过渡性的设计数据来源，而不是 Canvory 永久依赖的核心编辑器。

| 方案 | 优点 | 缺点 |
|---|---|---|
| 继续使用 Penpot | 画布和图层能力成熟，已有技术方案 | 产品交互和编辑能力受 Penpot 限制 |
| 自研 Canvory Editor | 功能、界面、数据结构可控 | 开发工作量更大 |
| 直接基于 Slidev | HTML 演示能力成熟 | 不适合自由画布式可视化编辑 |

推荐路线：短期 Penpot + 长期自研 Canvory Studio。

原有的 Penpot 插件负责读取画板、提取元素和生成 IR；未来将提取层抽象为 Source Adapter：

```text
Source Adapters
  ├── Penpot Adapter
  ├── Canvory Editor Adapter
  ├── SVG Adapter
  ├── PPTX Import Adapter
  └── AI Generation Adapter
            │
            ▼
     Canvory Document Model
            │
            ▼
        Core Engine
```

更换编辑器时，只需要替换对应 Adapter，不需要重写核心导出逻辑。

### 5.2 编辑器工作台布局

建议采用类似 Figma / Canva 的工作台：

| 区域 | 功能 |
|---|---|
| 顶部工具栏 | 文件、撤销、重做、预览、分享、导出 |
| 左侧面板 | 页面、图层、素材、模板、组件 |
| 中央画布 | 可视化创作区域 |
| 右侧面板 | 位置、尺寸、字体、颜色、布局、动画 |
| 底部面板 | 时间轴、动画序列、音视频轨道 |

底部时间轴可以先预留，MVP 不必实现完整动画编辑能力。

### 5.3 画布渲染技术

建议混合渲染，而不是整个编辑器全部使用 Canvas：

- **HTML DOM：** 富文本、复杂组件、交互元素。
- **SVG：** 矢量图形、路径、线条、形状。
- **Canvas：** 大量自由绘制、白板笔迹、复杂绘制操作。
- **CSS：** 动画、过渡和部分视觉效果。
- **Konva：** 可作为大量图形操作和白板绘制的辅助技术。

DOM + SVG 更适合演示文稿和视觉设计编辑器；Canvas 适合自由绘制，但富文本编辑、选中、拖拽和无障碍支持需要额外开发。

## 六、不同内容形态的实现

### 6.1 演示文稿 Presentation

核心功能：

- 多页面管理、页面排序、页面模板。
- 文本、图片、图形、表格。
- 图层管理、主题、母版。
- 演讲者备注。
- 页面转场。
- PPTX 导出。
- HTML Slides 展示。

输出：PPTX、HTML、PDF、PNG。

HTML 展示可支持全屏播放、键盘翻页、页面导航、演讲者模式和动画。

### 6.2 互动绘本 Storybook

绘本强调阅读体验，而不是演讲展示。

| 功能 | 实现方式 |
|---|---|
| 翻页效果 | CSS 3D Transform |
| 阅读模式 | 单页、双页 |
| 配音 | HTML Audio API |
| 文字高亮 | 与音频时间轴关联 |
| 点击互动 | Interaction Engine |
| 图片动画 | CSS / GSAP |
| 阅读进度 | Runtime 状态管理 |

例如，用户点击绘本中的小动物，小动物可以跳动，同时播放声音。

这类交互不适合强行塞进 PPTX，应作为 HTML 原生能力。

### 6.3 动画 Animation

建议独立建设 Animation Engine。

核心功能：

- 时间轴、多轨道。
- 关键帧。
- 位置、缩放、旋转、透明度动画。
- 缓动曲线。
- 图层顺序。
- 音频轨道。
- 场景转场。
- 播放、暂停、循环。

技术组合：

- GSAP：时间轴和动画执行。
- CSS Animation：简单网页动画。
- Web Animations API：浏览器原生动画。
- SVG：矢量动画。
- Canvas：复杂绘制动画。

未来 MP4 输出可通过 Playwright / Chromium 捕获画面，再使用 FFmpeg 合成视频和音频。属于后期功能，首版不建议开发视频渲染服务。

### 6.4 教学白板 Whiteboard

白板强调自由空间、实时书写和互动。

核心功能：

- 无限画布。
- 手写笔迹、橡皮擦。
- 图形绘制。
- 图片和文字。
- 激光笔。
- 讲解模式。
- 分步骤播放。
- 实时协作。
- 多人光标。

技术建议：

- Canvas / Konva：笔迹和自由绘制。
- SVG：矢量对象。
- Yjs：协同编辑数据同步。
- WebSocket：实时通信。
- IndexedDB：本地缓存。

需要区分白板内容播放与多人实时协作。前者可在单机 HTML Runtime 实现；后者才需要协同同步服务。

## 七、多格式渲染与导出引擎

### 7.1 统一输出架构

所有输出适配器都应读取 Canvory Document Model，不应分别读取 Penpot 数据或数据库原始结构。

```text
Canvory Document
       │
       ▼
Export Adapter
  ├── 能力检测
  ├── 元素映射
  └── 降级处理
       │
       ├── PPTX Exporter  → PptxGenJS
       ├── HTML Publisher → React Runtime
       ├── PDF / PNG      → Playwright
       └── Video Exporter → Chromium + FFmpeg（后期）
```

### 7.2 PPTX 导出

继续使用 PptxGenJS 作为第一阶段的 PPTX 生成方案。它可以生成文本、图形、图片、表格和图表等 PowerPoint 对象。

建议提供三种导出模式：

| 模式 | 特点 |
|---|---|
| 高保真 PPTX | 尽可能保持视觉效果，复杂元素允许图片化 |
| 可编辑 PPTX | 尽可能映射成 PowerPoint 原生对象 |
| 自动优化 PPTX | 根据元素能力自动选择原生对象或图片降级，作为默认模式 |

映射建议：

| Canvory 内容 | PPTX 输出 |
|---|---|
| 普通文本 | 原生文本框 |
| 矩形、圆形 | 原生形状 |
| 普通图片 | 图片对象 |
| 简单路径 | 可映射的原生线条或形状 |
| 复杂 SVG | 图片 |
| 渐变、模糊 | 图片降级 |
| HTML 交互组件 | 不支持原生交互，提示降级 |
| CSS 动画 | 静态化或提示动画降级 |

Canvory 的 HTML 能力会超过 PPTX 能力，这是正常的。不应为了保证所有 HTML 功能都能导出 PPT，而限制 HTML 的能力。

### 7.3 HTML 发布

HTML 应成为正式的产品交付形态，而不是只作为 PPT 的中间格式。

发布流程：

1. 将文档编译成 HTML 页面。
2. 打包图片、字体、音频、视频等资源。
3. 生成 Runtime 所需 CSS、JS。
4. 生成页面导航和播放控制。
5. 输出独立静态网站。
6. 提供在线访问链接。
7. 后续支持自定义域名和访问权限。

两种发布模式：

**在线发布**

```text
canvory.com/view/abc123
```

**下载 HTML 项目**

```text
my-project/
├── index.html
├── assets/
│   ├── images/
│   ├── audio/
│   └── fonts/
├── runtime/
│   ├── player.js
│   └── styles.css
└── manifest.json
```

HTML 导出应尽可能生成可独立托管的静态文件，不要求用户必须依赖 Canvory 服务器才能展示。

## 八、后端与数据库架构

### 8.1 架构策略

前期采用模块化单体（Modular Monolith），不要一开始就拆分微服务。

### 8.2 后端模块

| 模块 | 职责 |
|---|---|
| Auth | 用户登录、权限 |
| Workspace | 团队、工作空间 |
| Project | 项目管理 |
| Document | 文档和页面数据 |
| Asset | 图片、音频、视频管理 |
| Template | 模板和组件库 |
| Theme | 字体、颜色、主题 |
| Export | PPTX、PDF、PNG 导出任务 |
| Publish | HTML 构建、发布、分享 |
| Version | 文档历史版本 |
| Collaboration | 后续实时协作 |
| AI | 后续 AI 内容生成 |

### 8.3 数据库设计

核心数据使用 PostgreSQL。

初期主要表：

```text
users
workspaces
workspace_members

projects
documents
document_versions

scenes
assets
templates
themes

export_tasks
publish_tasks
publish_versions
```

不建议每一个画布元素都设计成独立数据库记录。一个页面可能包含数百甚至数千个节点，编辑器需要频繁保存整个文档结构。

建议：

- PostgreSQL 保存项目、文档元数据、版本索引。
- 文档主体以 JSONB 保存。
- 大型图片、音频、视频放在对象存储。
- 高频编辑时采用本地状态管理和增量保存。
- 定时生成文档快照，支持版本恢复。

示例：

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  title TEXT NOT NULL,
  document_type VARCHAR(32),
  schema_version VARCHAR(16),
  content JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### 8.4 资源管理

统一建设 Asset Manager，文档节点通过 Asset ID 引用资源，而不是直接存储图片 URL。

```ts
interface Asset {
  id: string;

  type:
    | "image"
    | "audio"
    | "video"
    | "font"
    | "svg";

  url: string;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
  size: number;
}
```

这样可以支持 PPTX 嵌入、HTML 资源打包、资源去重和团队素材共享。

### 8.5 导出任务队列

复杂导出放在后台执行：

```text
用户点击导出
      │
      ▼
Export API
      │
      ▼
创建 Export Task
      │
      ▼
Redis / BullMQ
      │
      ▼
Export Worker
      ├── 读取文档快照
      ├── 转换 Document Model
      ├── 运行 Export Engine
      ├── 生成 PPTX / PDF
      ├── 上传 S3
      └── 返回下载链接
```

小型文档可以考虑浏览器端直接导出；复杂文档交给 Worker。

## 九、代码工程结构

建议使用 pnpm + Turborepo 管理 Monorepo。

```text
canvory/
│
├── apps/
│   ├── studio/
│   │   ├── editor/
│   │   ├── canvas/
│   │   ├── panels/
│   │   ├── timeline/
│   │   └── workspace/
│   │
│   ├── viewer/
│   │   ├── presentation/
│   │   ├── storybook/
│   │   ├── animation/
│   │   └── whiteboard/
│   │
│   ├── web/
│   │   ├── dashboard/
│   │   ├── project/
│   │   └── account/
│   │
│   ├── server/
│   │   ├── auth/
│   │   ├── document/
│   │   ├── asset/
│   │   ├── export/
│   │   └── publish/
│   │
│   └── workers/
│       ├── pptx/
│       ├── pdf/
│       ├── html/
│       └── video/
│
├── packages/
│   ├── document-model/
│   │   ├── schema/
│   │   ├── nodes/
│   │   ├── scenes/
│   │   └── migrations/
│   │
│   ├── core/
│   │   ├── layout/
│   │   ├── geometry/
│   │   ├── style/
│   │   └── validation/
│   │
│   ├── renderer/
│   │   ├── web/
│   │   ├── svg/
│   │   └── canvas/
│   │
│   ├── animation/
│   │   ├── timeline/
│   │   ├── keyframes/
│   │   └── playback/
│   │
│   ├── interaction/
│   ├── exporters/
│   │   ├── pptx/
│   │   ├── html/
│   │   ├── pdf/
│   │   └── png/
│   │
│   ├── adapters/
│   │   ├── penpot/
│   │   ├── svg/
│   │   └── pptx/
│   │
│   ├── assets/
│   ├── themes/
│   ├── components/
│   ├── ui/
│   └── shared/
│
├── infrastructure/
│   ├── docker/
│   ├── nginx/
│   └── storage/
│
├── docs/
│   ├── architecture/
│   ├── document-model/
│   └── api/
│
└── turbo.json
```

核心边界：

1. Studio 负责创作。
2. Core 负责理解和处理内容。
3. Renderer / Exporter 负责展示和输出。

未来更换编辑器、增加新的内容类型、增加新的导出格式，都不应要求重构整个系统。

`viewer` 和 `studio` 应共享 Renderer 的底层组件，避免分别维护两套图形绘制逻辑。

## 十、AI 能力预留

AI 应成为统一内容模型的生产者和修改者，而不是仅仅成为一个聊天框。

| AI 功能 | 产生内容 |
|---|---|
| 输入主题生成 PPT | Document + Scenes |
| 输入故事生成绘本 | Storybook Scenes |
| 输入教学内容生成白板 | Whiteboard Nodes |
| 输入文字生成网页 | Web Sections |
| 选择元素修改样式 | Node Patch |
| 生成页面动画 | Animation |
| 自动排版 | Layout Updates |
| 生成插画 | Asset |

### 10.1 AI 操作协议

AI 不直接操作浏览器 DOM，而是生成可校验的文档变更：

```ts
interface DocumentPatch {
  documentId: string;

  operations: Array<{
    op: "add" | "update" | "delete";
    targetId: string;
    changes?: Record<string, unknown>;
  }>;
}
```

处理流程：

```text
用户自然语言
      │
      ▼
AI 理解需求
      │
      ▼
生成 Document Patch
      │
      ▼
Schema Validation
      │
      ▼
用户预览 / 确认
      │
      ▼
修改 Document Model
      │
      ▼
Renderer 自动更新
```

AI 生成的是内容结构，而不是一张最终图片。

## 十一、部署与基础设施

### 11.1 推荐部署结构

```text
                  Internet
                     │
                     ▼
                Nginx / CDN
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
     Canvory Studio       Canvory Viewer
          │                     │
          └──────────┬──────────┘
                     │
                     ▼
                NestJS API
                     │
       ┌─────────────┼─────────────┐
       │             │             │
       ▼             ▼             ▼
  PostgreSQL       Redis        S3 / MinIO
       │             │             │
       │             ▼             │
       │        Export Workers     │
       │             │             │
       └─────────────┴─────────────┘
                     │
                     ▼
             Export / Publish
                     │
                     ▼
                 CDN / S3
```

初期建议：

- Docker Compose。
- PostgreSQL。
- Redis。
- MinIO 或 S3。
- NestJS。
- Nginx。

后期并发增长后，再考虑 Kubernetes、独立 Worker 集群和 CDN 多区域分发。

### 11.2 HTML 发布安全

- 用户上传的 HTML、SVG 和媒体文件不能无条件执行。
- 不允许不受信任的用户内容直接执行任意 JavaScript。
- 限制 iframe 和第三方嵌入。
- 发布页面最好使用独立域名或隔离的子域名。
- 发布时进行资源打包和校验，避免资源链接失效。

## 十二、实施路线图

### Phase 0：架构基础与 PoC

**建议周期：1–2 周。**

任务：

- 确认 Canvory Document Model。
- 建立 TypeScript Monorepo。
- 搭建 Penpot 自托管环境。
- 开发 Penpot Adapter。
- 完成矩形、图片、文本读取。
- 建立统一 Core。
- 完成第一个 PPTX 导出。
- 验证文本可编辑性。
- 验证图片和字体映射。

交付：可以将 Penpot 画板转换成可编辑 PPTX 的最小产品。

### Phase 1：PPTX 产品正式版

**建议周期：3–6 周，视是否直接自研编辑器而定。**

任务：

- 完善 PPTX 导出。
- 增加预检和错误报告。
- 支持富文本。
- 支持图形、路径和图片。
- 支持页面备注。
- 支持主题与字体映射。
- 增加导出配置。
- 增加文档版本管理。
- 增加导出任务队列。
- 完成跨软件兼容测试。

这一阶段可以先通过 Penpot 作为主要创作工具，但所有内容必须进入 Canvory Document Model，再交给 PPTX Exporter。

### Phase 2：HTML 展示引擎

**建议周期：3–5 周。**

任务：

- 建立 Canvory Viewer。
- HTML Renderer。
- 页面导航。
- 全屏播放。
- 键盘控制。
- 页面转场。
- 简单动画。
- 主题系统。
- HTML 静态打包。
- 在线发布。
- 分享链接。

交付：同一个项目可以同时导出 PPTX 和 HTML。这是 Canvory 从 PPT 导出工具变成多形态内容平台的重要里程碑。

### Phase 3：自研可视化编辑器

**建议周期：6–10 周，具体取决于功能范围。**

任务：

- Studio 工作台。
- 图层面板。
- 画布操作。
- 节点编辑。
- 文本编辑。
- 图片管理。
- 组件库。
- 撤销与重做。
- 自动保存。
- 页面管理。
- 直接创建 Canvory Document。

逐步减少 Penpot 依赖。

### Phase 4：动画与互动能力

**建议周期：4–8 周作为首个可用版本。**

任务：

- Animation Engine。
- Timeline。
- Keyframes。
- 页面转场。
- 点击触发。
- 元素显示隐藏。
- HTML 交互组件。
- 音频播放。
- 动画预览。

### Phase 5：绘本、教学白板和多媒体

根据实际用户需求持续迭代。

任务：

- Storybook Runtime。
- 翻页效果。
- 阅读模式。
- 音频同步。
- Whiteboard Runtime。
- 自由绘制。
- 讲解模式。
- 实时协作。
- 视频导出。

## 十三、第一阶段验收标准

| 指标 | 第一阶段目标 |
|---|---|
| PPTX 原生可编辑文本 | ≥95% |
| 基础图形原生可编辑 | ≥90% |
| 复杂元素降级 | 有明确报告 |
| 页面尺寸与坐标 | 误差 ≤0.5% 页宽 |
| 20 页文档导出 | 目标 30 秒以内 |
| PPTX 兼容性 | PowerPoint、WPS、Keynote、LibreOffice |
| Document Model | 支持 schemaVersion |
| HTML Renderer | 能读取相同 Document Model |
| 资源管理 | 支持 ID 引用和资源打包 |
| 版本管理 | 支持保存和恢复 |

建议增加三个架构验收测试：

**测试 A：一份文档，两个输出。**

使用同一份 Document Model 导出 PPTX 和渲染 HTML，检查页面结构、尺寸、内容和布局是否一致。

**测试 B：不经过 Penpot 创建文档。**

手动构建一份 Canvory Document，直接生成 PPTX 和 HTML，以证明系统没有将 Penpot 数据结构当作自己的数据结构。

**测试 C：增加一种新场景类型。**

例如增加 Storybook Scene，不修改 PPTX 核心和 Document Model 基础结构，只增加对应 Runtime，以验证架构扩展性。

## 十四、关键技术决策

| 决策 | 建议 |
|---|---|
| 是否继续使用 Penpot | 第一阶段继续，长期逐步自研 |
| 是否直接采用 Slidev | 不作为核心，借鉴其 HTML Runtime 和展示能力 |
| 是否独立建立 IR | 必须，升级为 Canvory Document Model |
| 是否先开发动画系统 | 先定义数据结构，后开发界面 |
| 是否先开发 HTML | 先做最小 Renderer，第二阶段正式产品化 |
| 是否采用微服务 | 暂时不采用，模块化单体即可 |

特别注意：不要让 PPTX 成为 Document Model 的设计标准。

- 不要只支持 PPT 的固定页面尺寸。
- 不要将 Scene 限制成 Slide。
- 不要把动画设计成 PPT 动画效果的集合。
- 不要把交互限制为页面翻页。
- 不要将复杂对象强制转换成图片后再保存到 Document Model。

应该始终以 Canvory 自己的内容表达能力为准。PPTX 只是一个输出适配器。

## 十五、最终产品体验

建议未来用户流程：

```text
1. 创建项目
   ├── 演示文稿
   ├── 互动绘本
   ├── 动画创作
   ├── 教学白板
   ├── 网页内容
   └── 自由画布

          │
          ▼

2. 创作内容
   ├── 拖拽
   ├── 排版
   ├── 编辑
   ├── 素材
   ├── 组件
   ├── 动画
   └── AI 辅助创作

          │
          ▼

3. 预览与播放
   ├── 实时预览
   ├── 动画播放
   ├── 互动测试
   └── 页面检查

          │
          ▼

4. 导出与发布
   ├── PPTX
   ├── HTML
   ├── PDF
   └── MP4（后期）
```

## 十六、最终建议

如果由一个技术团队负责 Canvory 的长期建设，建议坚持三个原则：

### 1. 先解决内容模型，而不是先堆功能

统一的 Document Model 是未来所有功能的基础。先设计好，未来每增加一种输出形态，开发成本都会更可控。

### 2. 先完成 PPTX 商业闭环，但从第一天就保证 HTML 能力

优先完成：

```text
Penpot
   │
   ▼
Canvory Document Model
   │
   ▼
PPTX Exporter
```

同时完成最基础的：

```text
Canvory Document Model
   │
   ▼
HTML Renderer
```

不建议为了未来功能拖慢第一版交付，也不建议第一版架构完全围绕 PPTX 建立。

### 3. 逐渐从工具集变成平台

Penpot 可以帮助快速验证第一阶段，但 Canvory 的长期价值不应该依赖 Penpot。

最终应该拥有自己的：

- Studio。
- Document Model。
- Runtime。
- Export Engine。
- Asset Manager。
- Theme / Component System。

**Canvory 不应该只是一个 PPT 工具。**

它应该是一个以统一画布和内容模型为基础，能够生产演示文稿、网页、绘本、动画和互动教学内容的创作平台。

> PPTX 是第一个切入点，HTML 是第二个重要出口，而统一的内容引擎才是 Canvory 真正需要长期积累的核心资产。

## 十七、技术参考资料

| 项目 | 参考方向 | 地址 |
|---|---|---|
| Slidev | HTML 演示、动画、主题、展示运行时 | https://sli.dev/ |
| Penpot | 初期画布和插件数据提取 | https://help.penpot.app/plugins/getting-started/ |
| PptxGenJS | PPTX 原生对象生成 | https://github.com/gitbrent/PptxGenJS |
| Konva | Canvas 图形与交互 | https://konvajs.org/ |
| GSAP | 动画与时间轴 | https://gsap.com/ |
| Tiptap | 富文本编辑 | https://tiptap.dev/ |
| Yjs | 后续多人协作 | https://docs.yjs.dev/ |
| Playwright | HTML、PDF 和页面渲染 | https://playwright.dev/ |
