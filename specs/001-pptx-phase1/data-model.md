# Data Model: 001-pptx-phase1

## 概述

运行时与持久化的核心是 **CDM（Canvory Document）**。关系数据库存元数据与整份 CDM JSONB；对象存储存二进制资源与导出产物。

## 实体关系

```text
Workspace 1──* Project 1──* Document 1──* DocumentVersion
                              │
                              ├── content: CanvoryDocument (JSONB)
                              └── * ExportTask → artifact (对象存储，仅成功可用户下载)
Asset（按 workspace/project 作用域）←── Node.assetId 引用
FontMappingConfig（工作区或系统级）
```

## 1. CanvoryDocument（CDM）

| 字段 | 类型 | 约束 |
|------|------|------|
| id | string (UUID) | 必填 |
| schemaVersion | string | 必填，语义化，如 `1.0.0` |
| title | string | 必填 |
| type | enum | 第一阶段：`presentation` |
| settings.width / height | number | 像素；导出前校验各 Scene 一致 |
| settings.unit | `"px"` | 第一阶段固定 |
| settings.background | Paint? | 可选文档级默认 |
| themeId | string? | 可选 |
| scenes | Scene[] | ≥1 才能导出 |
| assets | AssetRef[] | 文档内资源清单 |
| animations | Animation[] | 可空占位 |
| interactions | Interaction[] | 可空占位 |
| metadata.createdAt / updatedAt | number | epoch ms |
| metadata.version | number | 与 DocumentVersion 对齐的逻辑版本 |

**校验规则**

- 导出前：所选 scenes 的画幅（或继承的文档 settings）尺寸必须一致，否则 `SIZE_MISMATCH`。
- `schemaVersion` 不受支持则拒绝处理并提示升级/迁移。

## 2. Scene

| 字段 | 类型 | 约束 |
|------|------|------|
| id | string | 必填 |
| name | string | 建议 `NN_标题` |
| type | enum | 第一阶段主用 `slide` |
| duration | number? | 占位 |
| background | Paint? | |
| children | Node[] | |
| transition | object? | 占位，导出 PPTX 时可忽略或告警 |
| notes | string? | 演讲者备注 → PPTX notes |

## 3. Node（可辨识联合）

公共：`id`, `type`, `transform{x,y,width,height,rotation}`, `opacity`, `visible`, `z`（或数组序）

| type | 关键内容 |
|------|----------|
| text | content.runs[]（fontFamily/Size/Weight/italic/color/…）, align, valign |
| shape | shapeKind: rect\|ellipse\|line；fill/stroke/radius/shadow |
| image | assetId, crop? |
| path | 简单路径可映射；复杂 → 降级 |
| group | children[]（导出时展开） |
| raster | 仅导出管线中间态，**不得**作为 CDM 持久真相写回 |

**规则**

- `visible=false` 或宽高为 0 或空文本 → L3 跳过并记报告。
- 节点通过 `assetId` 引用资源，禁止只存易变 URL 作为唯一依据。

## 4. Asset / AssetRef

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 稳定 ID |
| type | image\|font\|svg\|… | |
| hash | string? | 内容去重 |
| storageKey | string | 对象存储键 |
| mimeType | string | |
| width/height/size | number | |

## 5. DocumentVersion（持久化）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | |
| documentId | UUID | |
| version | int | 递增 |
| content | JSONB | 完整 CDM 快照 |
| createdAt | timestamptz | |
| label | string? | 可选备注 |

**状态**：创建 →（当前）可恢复。  
**恢复语义（MUST）**：恢复操作 MUST 将目标快照 **拷贝为新的 DocumentVersion**（version 递增），并将该新版本设为当前导出基准；MUST NOT 仅移动当前指针覆盖/丢弃中间历史。

## 6. ExportTask

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | |
| documentId | UUID | |
| documentVersion | int | 导出所基于的版本 |
| mode | auto\|editable\|fidelity | |
| scope | { sceneIds[] \| "all", sort: position\|name } | |
| channel | browser\|server | |
| status | queued\|running\|succeeded\|failed\|cancelled | |
| errorMessage | string? | 用户可读中文 |
| artifactKey | string? | 成功时对象存储键 |
| failureArtifactKey | string? | 仅运维；用户 API 不可见 |
| report | ExportReport JSONB? | |
| createdAt / updatedAt / finishedAt | timestamptz | |

**状态转移**

```text
queued → running → succeeded
                 → failed
queued|running → cancelled
```

- `succeeded`：用户可下载 `artifactKey`。
- `failed`/`cancelled`：用户不可下载产物；可 `POST .../retry`。

## 7. ExportReport（预检/导出）

| 字段 | 说明 |
|------|------|
| schemaVersion | 报告格式版本 |
| mode | 导出模式 |
| pages[] | 每页 L0–L3 计数与 items[] |
| fonts[] | 源字体、映射字体、安装提示 |
| totals | 汇总 |
| blockingErrors[] | 如 SIZE_MISMATCH（有则不可导出） |

每条 item：`nodeId`, `level`, `reasonCode`, `messageZh`

## 8. FontMappingConfig

| 字段 | 说明 |
|------|------|
| sourceFamily | 创作端字体名 |
| targetFamily | PPT 字体名 |
| enabled | bool |

## 验证与质量度量（非表字段）

从黄金样例与回归任务计算：可编辑文本率、基础图形原生率、位置误差、耗时——对应 SC-001–004。
