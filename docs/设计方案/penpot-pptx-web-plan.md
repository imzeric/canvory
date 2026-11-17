# 基于 Penpot 的 PPTX 导出平台：技术实现方案（Web 版）

*版本 v0.2 · 2026-11-17 · 状态：待 PoC 验证*
*变更说明：相比 v0.1，去掉 Electron 本地客户端内容，改为「自托管 Penpot + 浏览器插件 + 可选服务端批量导出」，新增部署架构、插件分发、服务端导出三章。*

---

## 1. 目标与范围

**目标**：团队在自托管的 Penpot 中按画板绘制幻灯片，通过自研插件一键导出**可编辑的 .pptx**；需要时可由服务端对整份文件批量导出。不经过 HTML 中转。

**范围内**

- 部署：基于官方 Docker Compose 的内网自托管 Penpot。
- 插件：画板转幻灯片；矩形、椭圆、文本、图片、线条、矢量路径；纯色填充、描边、圆角、透明度、外阴影；富文本；演讲者备注；导出前预检与告警报告。
- 服务端导出（可选）：对整份 Penpot 文件批量生成 PPTX。

**范围外（首版）**：动画与转场、交互原型、竖排文字、PPT 母版版式、改造 Penpot 前端源码。

**建议验收指标**（需与业务方确认）

| 指标 | 目标 |
|---|---|
| 文本保持为原生可编辑文本框的比例 | 不低于 95% |
| 元素位置误差 | 不超过页宽的 0.5% |
| 20 页以内浏览器端导出耗时 | 低于 30 秒 |
| 导出文件在 PowerPoint、WPS、Keynote、LibreOffice 中打开 | 无修复提示 |

## 2. 方案选型

### 2.1 导出路线

| 维度 | A. HTML 中转 | B. 插件直出（采用） |
|---|---|---|
| 转换次数 | 两次（画布到 HTML，HTML 到 PPTX） | 一次（画布到 PPTX） |
| 位置来源 | 浏览器重新测量渲染结果 | 直接读取 Penpot 已计算好的坐标 |
| 文本与样式 | 经 CSS 间接表达，易失真 | 直接读取字体、字号、对齐等属性 |
| 可控性 | 受 HTML 导出质量和转换工具限制 | 映射与降级规则完全自控 |
| 开发量 | 低 | 中 |
| 主要风险 | 误差叠加；导出的 HTML 不规整 | 插件 API 能力边界；文本排版差异 |

**结论**：采用 B；A 保留为对照与兜底，同一批画板可用于比对保真度。

### 2.2 二次开发层次

| 层级 | 内容 | 决策 |
|---|---|---|
| 部署与配置 | Compose、特性开关、反向代理、登录方式 | 做 |
| 插件 | PPTX 导出、规范校验、品牌组件 | 主战场 |
| 服务端扩展 | 独立服务批量生成 PPTX | 有批量需求时做 |
| 改前端源码 | fork ClojureScript 前端 | 不做，升级合并成本高 |

### 2.3 底座选择

保持 Penpot：成熟度、插件体系、MCP 与协作能力较完整。OpenPencil、Grida 等新项目放入观察清单；由于 IR 与编辑器无关（见第 6 节），日后迁移只需重写「提取层」。

## 3. 总体架构

```
用户浏览器
  └─ Penpot Web（自托管）
       └─ PPTX 导出插件（静态站点托管，manifest URL 安装）
            plugin.ts：读取画板形状树 → IR（JSON）
            UI iframe：预检 → IR 映射 → PptxGenJS 生成 → 浏览器下载

内网服务器
  ├─ Penpot：frontend / backend / exporter / PostgreSQL / Valkey
  ├─ 反向代理（TLS、同域路由、可选统一登录）
  ├─ 插件静态站点（HTTPS + CORS）
  └─ 批量导出服务（可选）：读取文件 → IR → 同一套映射核心 → PPTX
```

**关键设计：映射核心与运行环境解耦。**

```
packages/
  core/      IR 类型、单位换算、元素映射、降级判定、PPTX 构建（纯 TypeScript，可在浏览器与 Node 运行）
  plugin/    Penpot 插件：提取层 + UI
  server/    可选：批量导出服务（Penpot 文件数据 → IR → core）
  tests/     黄金样例与视觉回归
```

插件与服务端各自负责「提取」，共用 `core` 的「映射与生成」，保证两条路径输出一致。

## 4. 部署架构

### 4.1 服务组成

官方 Compose 包含以下服务：

| 服务 | 职责 | 备注 |
|---|---|---|
| penpot-frontend | Nginx，提供前端并代理 API、WebSocket、导出请求 | 默认对外 9001 端口 |
| penpot-backend | Clojure/JVM API 服务 | 内部 6060；依赖 PostgreSQL 与 Valkey |
| penpot-exporter | Node.js + Puppeteer，无头浏览器导出 PNG、SVG、PDF | 内部 6061；依赖 Valkey |
| PostgreSQL | 主数据存储 | 需持久卷与备份 |
| Valkey | 实时通知 | 仅瞬时数据，可不持久化 |
| 资源存储 | 默认文件系统卷；可换 S3 兼容存储（如 MinIO） | 多实例或扩容时建议用 S3 |

JVM 后端与无头 Chromium 导出器是最吃资源的进程，规格需按并发与文件体量实测确定。

### 4.2 关键配置

| 项目 | 说明 |
|---|---|
| 版本锁定 | 固定 Penpot 镜像版本（示例中常见 2.14 到 2.18 系列），升级走灰度与回归 |
| 插件运行时 | 自托管需确认已开启 `enable-plugins-runtime`，修改后重启 backend 与 frontend |
| 访问令牌 | 服务端导出路线需要 `enable-access-tokens`，令牌作为密钥管理，不入库、不入日志 |
| 登录方式 | Penpot 支持多种认证后端，可对接内部账号体系（具体方式以所用版本文档为准） |
| TLS 与域名 | 由反向代理统一终止 TLS |

### 4.3 反向代理与同域部署（建议）

- Penpot 主站与插件静态站点使用同一主域名下的不同子域名或子路径，由反向代理统一提供 HTTPS 与 CORS。
- 插件站点单独设置缓存策略：`manifest.json` 与入口脚本短缓存，带哈希的静态资源长缓存。
- 此项为建议做法，需在目标环境实测。

### 4.4 运维要点

- 备份：PostgreSQL 与资源卷定时备份，并做恢复演练。
- 监控：backend 内存、exporter 并发与失败率、Valkey 连接。
- 升级：先在预发环境用黄金样例集跑视觉回归，再升级生产。

## 5. 插件分发与权限

### 5.1 manifest 草案

```json
{
  "name": "PPTX Exporter",
  "description": "Export boards to editable PPTX",
  "version": 2,
  "code": "https://plugins.your-domain.com/plugin.js",
  "icon": "https://plugins.your-domain.com/icon.png",
  "permissions": ["content:read", "allow:downloads", "allow:localstorage"]
}
```

权限遵循最小化：只读内容、允许下载、本地保存配置，不申请写入权限。

### 5.2 分发方式

1. 用户在 Penpot 的插件管理器中粘贴 manifest URL 安装，并在安装时批准权限。
2. 提供**一键安装链接**：Penpot 插件页面使用 `#?plugin=<manifest 地址>` 形式的 URL 触发安装，内网版本可沿用同样格式，放进内部文档与新人引导。
3. **全员默认预装**：未找到官方明确机制，社区有人提出过该问题，需在所用版本上验证；兜底方案为「一键安装链接 + 首次登录引导」。

### 5.3 安全边界

- 插件只能使用已批准的权限；PPTX 在浏览器内生成，内容不经过额外服务器。
- 服务端导出路线持有访问令牌，应使用专用账号并限制其可访问的项目范围。
- 插件站点仅内网可访问；发布走代码评审与版本号管理。

## 6. 数据流、坐标与中间表示

### 6.1 数据流

1. 用户选择画板（或导出全部画板），plugin 调用 `waitForLayoutUpdate` 等布局稳定后开始遍历。
2. 对每个画板递归读取形状树，使用相对画板的坐标（`boardX`、`boardY`）、旋转角度（以形状中心为轴）与翻转标志。
3. 提取为 IR 并发送给 UI（`penpot.ui.sendMessage` / `onMessage`）；UI 完成预检、映射、生成与下载。

### 6.2 换算规则（以 1920×1080 画板对应 13.333×7.5 英寸为基准）

| 项目 | 规则 |
|---|---|
| 位置、尺寸 | 英寸 = 像素 ÷ 144 |
| 字号、线宽 | 磅 = 像素 × 0.5 |
| 非 16:9 画板 | 按画板实际比例自定义幻灯片尺寸，同一份文件内要求画板尺寸一致 |
| 叠放顺序 | 沿用 children 顺序 |
| 旋转与翻转 | 以中心为轴，翻转在映射层处理 |

### 6.3 IR 定义

```ts
type Paint =
  | { type: 'solid'; color: string; opacity: number }
  | { type: 'gradient' }
  | { type: 'image'; assetId: string };

interface ElementBase {
  id: string; name: string;
  x: number; y: number; w: number; h: number;   // 相对画板，单位像素
  rotation: number; flipX: boolean; flipY: boolean;
  opacity: number; z: number;
}
interface Run {
  text: string; fontFamily: string; fontSize: number; fontWeight: string;
  italic: boolean; color: string; letterSpacing?: number; underline?: boolean;
}
interface TextEl extends ElementBase {
  kind: 'text'; runs: Run[];
  align: 'left' | 'center' | 'right' | 'justify';
  valign: 'top' | 'middle' | 'bottom'; lineHeight?: number;
}
interface ShapeEl extends ElementBase {
  kind: 'rect' | 'ellipse' | 'line';
  fill?: Paint; stroke?: Stroke; radius?: number; shadow?: Shadow;
}
interface ImageEl extends ElementBase { kind: 'image'; assetId: string; crop?: Crop }
interface RasterEl extends ElementBase { kind: 'raster'; assetId: string; reason: string }

interface SlideIR {
  id: string; title: string; width: number; height: number;
  background?: Paint; notes?: string;
  elements: Array<TextEl | ShapeEl | ImageEl | RasterEl>;
}
```

IR 带版本号，是插件、服务端与未来其他编辑器的统一契约。

## 7. 元素映射规则

| Penpot 元素 | PPTX 输出（PptxGenJS） | 说明 |
|---|---|---|
| 画板（board） | 一页幻灯片 | 纯色背景写入幻灯片背景；渐变或图片背景作为底图栅格化 |
| 矩形（rect） | 矩形或圆角矩形 | 四角统一圆角用圆角半径；四角不同则栅格化 |
| 椭圆（circle） | 椭圆 | 与矩形同样处理填充与描边 |
| 文本（text） | 文本框，多个 run | 固定宽高，关闭自动缩放，边距为 0 |
| 图片（image） | 图片 | 裁剪按 crop 参数；带圆角或蒙版则栅格化 |
| 路径、布尔运算、svg-raw | 简单直线用线条形状；其余导出后作为图片 | 复杂矢量不可编辑，写入告警 |
| 分组与普通 frame | 展开为子元素，保持叠放顺序 | PptxGenJS 无分组；frame 裁剪内容超出时告警 |
| 纯色填充与透明度 | 颜色加透明度 | 透明度取填充透明度与图层透明度的乘积 |
| 渐变填充 | 栅格化 | 首版不做原生渐变 |
| 描边 | 线条属性（颜色、线宽、线型） | 内外描边按半个线宽调整几何，属近似 |
| 外阴影 | 阴影属性 | 内阴影栅格化 |
| 模糊、混合模式 | 栅格化 | 无对应原生表达 |
| Flex、Grid 布局 | 无需映射 | 读取布局完成后的最终坐标 |
| 组件实例 | 与普通形状同理 | 不保留组件关系 |

说明：PptxGenJS 的能力边界（分组、渐变、内阴影等）基于对该库的了解，需在 PoC 中逐项确认。

## 8. 降级策略

每个元素经过判定函数，落入四个等级之一：

- **L0 原生**：完全对应的 PPTX 原生对象，保持可编辑。
- **L1 原生近似**：可编辑，但表现有轻微差异（如内外描边、行高），写入提示级告警。
- **L2 栅格化**：导出该形状及其子树为 PNG（默认 2 倍分辨率），放回原位置与叠放顺序，写入警告并标注不可编辑。
- **L3 跳过**：隐藏图层、尺寸为 0、空文本等，不导出，写入日志。

预检面板展示每页的 L0 到 L3 数量与告警明细，导出时附带一份 JSON 报告。

## 9. 文本处理（最大难点）

- **读取**：文本形状提供字体、字号、字重、斜体、对齐、垂直对齐等属性；样式混合时这些属性返回 mixed，需要按范围（`getRange`）分段读取，每段生成一个 run。
- **字体映射**：维护可配置的映射表（Penpot 字体到 PPT 字体名）。导出前汇总用到的全部字体写入报告，并提示接收方需安装对应字体；PowerPoint 默认不嵌入字体。
- **排版差异**：Penpot 与 PowerPoint 的换行、行高、字间距算法不同。对策：文本框固定宽高、关闭自动缩放、边距为 0；UI 内用 Canvas 的 `measureText` 预估宽度，疑似换行不一致时告警；提供可选的宽度容差（默认关闭，建议 1% 到 2%）。
- **暂不支持**：项目符号列表、竖排、文字描边与渐变文字。处理方式：降级为纯色文本并告警；提供「文字栅格化」选项，默认关闭，因为会失去可编辑性。

## 10. 图片与资源

- 图片按内容哈希去重，同一资源只写入一次。
- 栅格化与图片的最长边设上限（建议 3840 像素），超出则缩放。
- 逐页处理并及时释放中间 Blob，控制浏览器内存峰值。
- 优先读取图片原始数据；读取不到时，对该形状导出 PNG 作为兜底（接口细节见第 15 节）。

## 11. 用户流程与插件界面

1. 按第 12 节规范绘制画板，每个画板对应一页。
2. 打开插件，选择范围（全部画板或选中画板）与排序规则（按画布位置从上到下、从左到右，或按名称前缀）。
3. 预检面板展示告警；可在面板内为每个画板填写演讲者备注，备注保存在画板的 `pluginData` 中，随文件持久化。
4. 点击导出，生成 .pptx 并下载，同时可下载 JSON 报告。

## 12. 画板设计规范（给设计师）

| 项目 | 要求 |
|---|---|
| 画板尺寸 | 统一 1920×1080 |
| 画板命名 | NN_标题，如 01_封面 |
| 字体 | 使用约定字体清单，文字保持为文本图层，不转曲线 |
| 效果 | 避免模糊、混合模式、内阴影；渐变仅用于背景（会栅格化） |
| 图片 | 使用位图，避免过大分辨率 |
| 对齐 | 位置与尺寸尽量取整数像素 |
| 结构 | 组件与分组嵌套不宜过深 |

## 13. 服务端批量导出（可选）

### 13.1 适用场景

整份文件批量转换、定时或流水线导出、不方便让用户逐个打开插件的场景。

### 13.2 实现思路

| 方案 | 做法 | 优点 | 风险 |
|---|---|---|---|
| S1. 读取文件数据 | 用访问令牌通过 Penpot 接口读取文件数据，经适配层转为 IR，再交给 `core` | 轻量、可并发 | 文件数据结构与插件 API 结构不同，需要写适配层；接口稳定性需评估 |
| S2. 无头浏览器运行插件 | 服务端用无头浏览器打开 Penpot，加载同一插件并触发导出 | 与插件输出完全一致，复用提取层 | 资源消耗大，需处理登录与会话 |

建议先做 S2 验证可行性（改动最小），确有批量压力再评估 S1。

### 13.3 适配层要点（S1）

- Penpot 文件格式中的形状类型包括 frame、group、rect、circle、path、text、image、bool、svg-raw 九类，可按类型映射到 IR。
- 文本在文件数据中的内容结构与插件 API 的属性视图不同，适配层需单独处理富文本分段。
- 插件可在形状上存储 `pluginData`，备注等自定义数据可通过同一字段读取。

## 14. 质量保障

- **单元测试**：用模拟的 Penpot API 测试 IR 提取；`core` 做快照测试。
- **黄金样例集**：约 20 个画板，覆盖每种元素与每条降级路径。
- **视觉回归**：同一画板的 Penpot 导出 PNG，与 PPTX 经 LibreOffice 无头渲染得到的 PNG 做像素差或 SSIM 对比，阈值在 PoC 阶段标定；Penpot 升级前必跑。
- **兼容性**：在 PowerPoint、WPS、Keynote、LibreOffice 中打开，无修复提示。
- **导出报告**：记录原生与栅格元素数量、告警明细，便于排查和度量。

## 15. PoC 待验证清单

| 验证项 | 方法 | 失败兜底 |
|---|---|---|
| 插件运行时开关与插件加载 | 在目标环境开启并安装最小插件 | 调整 flag 或部署配置 |
| 全员默认预装机制 | 查阅所用版本文档并实测 | 一键安装链接加引导 |
| 插件与 Penpot 同域部署的 HTTPS 与 CORS | 反向代理配置后安装并运行 | 改用独立域名并放行 CORS |
| 形状导出为 PNG 或 SVG 的接口在插件中是否可用、返回什么类型 | 对矩形、路径、含阴影形状分别调用并检查结果 | 限制栅格化范围，或改用服务端导出 |
| 图片原始数据能否读取 | 读取图片填充的数据并写入 PPTX | 对该形状导出 PNG |
| 富文本分段读取是否完整 | 构造多字重、多颜色文本，对比 run 结果 | 以整体样式导出并告警 |
| PptxGenJS 能否在插件 iframe 内打包运行并下载 | 最小示例导出 1 页 | 调整打包方式，或下载交给宿主页 |
| SVG 图片在 PowerPoint 与 WPS 的兼容性 | 同一 SVG 在多软件打开 | 统一使用 PNG |
| 大画板与多图下的浏览器内存与耗时 | 20 页、含大图的样例 | 分批导出、降低栅格化分辨率 |
| 服务端路线 S2 的稳定性 | 无头浏览器登录、加载插件并触发导出 | 评估 S1 适配层 |

## 16. 风险与对策

| 风险 | 对策 |
|---|---|
| 插件 API 能力不足（图片原始数据、文本分段） | PoC 先验证；兜底为对形状导出 PNG |
| 文本排版差异导致换行不同 | 固定文本框、宽度容差、预估与告警、设计规范约束 |
| 字体缺失 | 字体映射表、导出报告列出字体、接收方安装说明 |
| PptxGenJS 能力边界 | 不支持的元素栅格化；必要时更换生成后端或直接写 OOXML |
| 浏览器内存与耗时 | 逐页处理、图片压缩、进度提示；大文件走服务端 |
| Penpot 版本升级导致 API 行为变化 | 锁定版本、增加适配层、升级前跑回归 |
| 插件无法默认预装 | 一键安装链接加引导 |
| 服务端令牌泄露 | 专用账号、最小范围、密钥管理 |

## 17. 里程碑与工作量（估算，按 1 名熟悉前端的开发者）

| 阶段 | 周期 | 交付 |
|---|---|---|
| M0 PoC | 约 1 周 | 部署测试环境；最小插件读取选区、画板转幻灯片、矩形、文本、图片映射、下载；回答第 15 节关键问题 |
| M1 核心功能 | 约 2 周 | 全元素映射；富文本；描边与阴影；降级与栅格化；预检面板与报告 |
| M2 工程化 | 约 1 到 2 周 | 备注；字体映射；配置；视觉回归 CI；设计规范文档；多软件兼容测试；插件分发与一键安装 |
| M3 服务端导出（可选） | 约 1 到 2 周 | S2 验证与服务化；任务队列与结果下载 |
| M4 可选 | 视需求 | 主题色映射、PPT 母版、基础动画 |

## 18. 扩展方向

- 与 Penpot MCP 配合：由 AI agent 按规范生成画板，再由插件导出 PPTX。
- 设计令牌（颜色、字体）映射为 PPT 主题色与主题字体。
- 反向导入：PPTX 转画板，与已有的 HTML 转 Penpot 类插件形成往返。
- 更换编辑器：只重写提取层，复用 `core` 与服务端。

## 19. 参考资料

- Penpot 插件入门与权限：https://help.penpot.app/plugins/getting-started/
- Penpot 插件 API（全局对象与 UI 通信）：https://doc.plugins.penpot.app/interfaces/Penpot
- Penpot 插件 API（文本形状）：https://doc.plugins.penpot.app/interfaces/Text
- Penpot 插件 API（画板）：https://doc.plugins.penpot.app/interfaces/Board
- Penpot 插件 API（形状基类，含 boardX、阴影、模糊）：https://doc.plugins.penpot.app/interfaces/ShapeBase
- Penpot 文件格式与形状类型：https://help.penpot.app/technical-guide/developer/data-model/penpot-file-format/
- Penpot 官方 Docker Compose：https://github.com/penpot/penpot/blob/develop/docker/images/docker-compose.yaml
- Penpot 插件自托管示例（manifest 与 HTTPS/CORS 要求）：https://railway.com/deploy/penpot-plugins--deploy-penpot-plugins-self-hosted
- Penpot 插件一键安装链接示例（plugin 参数）：https://penpot.app/penpothub/plugins/ultimate-html-to-penpot
- Penpot MCP 服务（插件运行时 flag、访问令牌）：https://github.com/ancrz/penpot-mcp-server
- PptxGenJS：https://github.com/gitbrent/PptxGenJS（地址未经本次检索核实）
