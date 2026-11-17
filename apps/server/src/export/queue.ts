/**
 * 可选 BullMQ 入队（REDIS_URL 存在时）
 * 未配置时 TasksService 继续内联处理。
 */
import type { ExportMode } from "@canvory/core";

export type QueuePayload = {
  taskId: string;
  document: unknown;
  mode: ExportMode;
  scope?: { sceneIds: string[] | "all"; sort?: "position" | "name" };
  createdBy: string;
  documentId: string;
  versionId: string;
};

let queue: import("bullmq").Queue | null = null;

export function queueEnabled(): boolean {
  return Boolean(process.env.REDIS_URL) && process.env.EXPORT_INLINE !== "1";
}

export async function enqueuePptxJob(payload: QueuePayload): Promise<boolean> {
  if (!queueEnabled()) return false;
  const { Queue } = await import("bullmq");
  if (!queue) {
    queue = new Queue("pptx-export", {
      connection: { url: process.env.REDIS_URL! },
    });
  }
  await queue.add("export", payload, {
    removeOnComplete: 100,
    removeOnFail: 100,
  });
  return true;
}
