import type { ErrorCode } from "../errors.js";

export const zhMessages: Record<ErrorCode, string> = {
  SIZE_MISMATCH: "各页画板尺寸不一致，已拒绝导出。请统一页面尺寸后重试。",
  SCHEMA_UNSUPPORTED: "不支持的文档模型版本，请升级客户端或迁移文档。",
  UNAUTHORIZED: "未认证，无法访问文档或导出接口。",
  FORBIDDEN: "已认证但没有权限执行此操作。",
  TASK_NOT_DOWNLOADABLE: "导出任务未成功，无法下载产物。",
  NOT_FOUND: "未找到请求的资源。",
  VALIDATION_ERROR: "请求数据校验失败。",
};

export function messageZh(code: ErrorCode, detail?: string): string {
  const base = zhMessages[code];
  return detail ? `${base} ${detail}` : base;
}
