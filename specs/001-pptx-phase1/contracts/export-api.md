# Contract: Export & Document API

**Base**: `/api/v1`（内网服务）  
**Auth（MUST，对应 Spec FR-016）**: 所有文档 / 版本 / 导出端点要求已认证主体（Penpot 访问令牌或内部网关会话）。未认证 → `401`，且不得返回文档 JSON 或产物下载。授权不足 → `403`。  
**语言**: 错误 `message` 为简体中文

## 文档版本

### `POST /documents/{documentId}/versions`

保存当前 CDM 快照为新版本。

**Body**: `{ "content": CanvoryDocument, "label?": string }`  
**200**: `{ "version": number, "id": string }`

### `GET /documents/{documentId}/versions`

**200**: `{ "items": [{ "id", "version", "createdAt", "label?" }] }`

### `POST /documents/{documentId}/restore`

**Body**: `{ "version": number }`  
**200**: `{ "version": number, "id": string }` — **MUST** 将目标快照拷贝为新版本并返回新 `version`；禁止仅移动当前指针。

## 预检

### `POST /export/preflight`

**Body**:

```json
{
  "document": { "...CDM..." },
  "mode": "auto",
  "scope": { "sceneIds": "all", "sort": "position" }
}
```

**200**: `ExportReport`  
**409**: 含 `blockingErrors`（如尺寸不一致），body 仍给报告细节

## 导出任务（服务端）

### `POST /export/tasks`

**Body**: `{ "documentId", "version?", "mode", "scope" }`  
（若不传 version 则用当前版本）

**201**: `{ "taskId", "status": "queued" }`

### `GET /export/tasks/{taskId}`

**200**: `{ "taskId", "status", "errorMessage?", "report?", "downloadUrl?" }`  
- 仅 `succeeded` 返回 `downloadUrl`  
- `failed`/`cancelled` **不**返回用户可下载 URL

### `POST /export/tasks/{taskId}/cancel`

**200**: `{ "status": "cancelled" }`

### `POST /export/tasks/{taskId}/retry`

**201**: 新 `taskId`（或重置同任务，实现二选一并在 tasks 固定）

### `GET /export/tasks/{taskId}/artifact`

成功：`application/vnd.openxmlformats-officedocument.presentationml.presentation`  
失败：`404`（含运维产物存在时亦对用户 404）

## 浏览器导出

插件本地调用 `packages/exporters/pptx`；不强制经任务 API。  
取消/失败：不触发下载。可选：将报告 `POST /export/reports` 归档（非必达）。

## 建议后台提示（客户端契约）

| 条件 | 客户端行为 |
|------|------------|
| 所选 scene 数 > 20 | 默认选中「后台导出」并展示中文建议 |
| 浏览器导出已用时 ≥ 25s 仍未完成 | 弹出提示改走后台，可继续浏览器 |

## 错误码（示例）

| code | HTTP | 含义 |
|------|------|------|
| UNAUTHORIZED | 401 | 未认证 |
| FORBIDDEN | 403 | 已认证但无权限 |
| SIZE_MISMATCH | 409 | 画板尺寸不一致 |
| SCHEMA_UNSUPPORTED | 400 | schemaVersion 不支持 |
| TASK_NOT_DOWNLOADABLE | 404 | 任务未成功 |
