import {
  Injectable,
  NotFoundException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { buildPptx } from "@canvory/exporter-pptx";
import { parseCanvoryDocument, type CanvoryDocument } from "@canvory/document-model";
import { preflight, type ExportMode } from "@canvory/core";
import { PAGE_SOFT_LIMIT } from "@canvory/shared";
import { memory } from "../db/pool.js";
import type { AuthUser } from "../auth/auth.guard.js";
import { DocumentsService } from "../documents/documents.service.js";
import { enqueuePptxJob, queueEnabled } from "./queue.js";
import { getObject, storeExportArtifact } from "../storage/minio.js";
import { loadTaskStatus, saveTaskStatus } from "./task-status-store.js";
import { mergeExportTask } from "./task-merge.js";
import { upsertExportJob } from "../db/postgres-documents.js";

type TaskStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export type ExportTask = {
  id: string;
  documentId: string;
  versionId: string;
  mode: ExportMode;
  scope?: { sceneIds: string[] | "all"; sort?: "position" | "name" };
  status: TaskStatus;
  progress: number;
  artifactAssetId: string | null;
  failureArtifactKey: string | null;
  errorMessage: string | null;
  report: unknown;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
};

function isCancelled(taskId: string): boolean {
  const t = memory.jobs.get(taskId) as unknown as ExportTask | undefined;
  return t?.status === "cancelled";
}

async function persistJobRow(task: ExportTask): Promise<void> {
  // artifact_asset_id 外键指向 assets。BullMQ 路径的字节在 MinIO `exports/{taskId}.pptx`，
  // 不把尚未登记的 UUID 写入该列，避免任务状态更新被外键拒绝。
  await upsertExportJob({
    id: task.id,
    documentId: task.documentId,
    versionId: task.versionId,
    format: "pptx",
    mode: task.mode,
    status: task.status,
    progress: task.progress,
    artifactAssetId: null,
    errorMessage: task.errorMessage,
    createdBy: task.createdBy,
  });
}

@Injectable()
export class TasksService {
  constructor(private readonly docs: DocumentsService) {}

  async create(
    user: AuthUser,
    input: {
      documentId: string;
      version?: number;
      mode: ExportMode;
      scope?: { sceneIds: string[] | "all"; sort?: "position" | "name" };
    },
  ) {
    const { versionId, cdm } = await this.docs.getCdmByVersion(
      input.documentId,
      user,
      input.version,
    );
    const taskId = randomUUID();
    const now = new Date().toISOString();
    const task: ExportTask = {
      id: taskId,
      documentId: input.documentId,
      versionId,
      mode: input.mode,
      scope: input.scope,
      status: "queued",
      progress: 0,
      artifactAssetId: null,
      failureArtifactKey: null,
      errorMessage: null,
      report: null,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
      finishedAt: null,
    };
    memory.jobs.set(taskId, task as unknown as Record<string, unknown>);
    await saveTaskStatus(task);
    await persistJobRow(task);

    const enqueued = await enqueuePptxJob({
      taskId,
      document: cdm,
      mode: input.mode,
      scope: input.scope,
      createdBy: user.id,
      documentId: input.documentId,
      versionId,
    });
    if (!enqueued) {
      void this.process(taskId, cdm, input.mode, input.scope);
    }

    const hints =
      cdm.scenes.length > PAGE_SOFT_LIMIT
        ? {
            largeDocument: true,
            message: "页数较多，导出可能需要较长时间，请在后台查看进度。",
          }
        : undefined;

    return {
      taskId,
      status: "queued" as const,
      hints,
      transport: enqueued ? "bullmq" : "inline",
      queueEnabled: queueEnabled(),
    };
  }

  private async process(
    taskId: string,
    cdmRaw: CanvoryDocument,
    mode: ExportMode,
    scope?: { sceneIds: string[] | "all"; sort?: "position" | "name" },
  ) {
    const task = memory.jobs.get(taskId) as unknown as ExportTask | undefined;
    if (!task || task.status === "cancelled") return;
    try {
      task.status = "running";
      task.progress = 10;
      task.updatedAt = new Date().toISOString();
      await saveTaskStatus(task);

      const cdm = parseCanvoryDocument(cdmRaw);
      const report = preflight(cdm, mode, scope ?? { sceneIds: "all" });
      task.report = report;
      task.progress = 40;

      if (isCancelled(taskId)) return;

      const result = await buildPptx(cdm, {
        mode,
        scope: scope ?? { sceneIds: "all" },
        resolveStorageKey: async (key) => {
          const obj = await getObject(key);
          if (!obj) return undefined;
          return `data:application/octet-stream;base64,${obj.buffer.toString("base64")}`;
        },
      });
      if (isCancelled(taskId)) return;

      const assetId = randomUUID();
      const mime =
        "application/vnd.openxmlformats-officedocument.presentationml.presentation";
      await storeExportArtifact(assetId, `exports/${taskId}.pptx`, result.buffer, mime);

      const latest = memory.jobs.get(taskId) as unknown as ExportTask | undefined;
      if (!latest || latest.status === "cancelled") return;
      latest.artifactAssetId = assetId;
      latest.report = result.report;
      latest.progress = 100;
      latest.status = "succeeded";
      latest.finishedAt = new Date().toISOString();
      latest.updatedAt = latest.finishedAt;
      await saveTaskStatus(latest);
      await persistJobRow(latest);
    } catch (e) {
      if (isCancelled(taskId)) return;
      const latest = memory.jobs.get(taskId) as unknown as ExportTask | undefined;
      if (!latest || latest.status === "cancelled") return;
      latest.status = "failed";
      latest.failureArtifactKey = `exports/failures/${taskId}.log`;
      latest.errorMessage = e instanceof Error ? e.message : String(e);
      latest.finishedAt = new Date().toISOString();
      latest.updatedAt = latest.finishedAt;
      await saveTaskStatus(latest);
      await persistJobRow(latest);
    }
  }

  private async hydrate(taskId: string): Promise<ExportTask | undefined> {
    const local = memory.jobs.get(taskId) as unknown as ExportTask | undefined;
    const remote = await loadTaskStatus(taskId);
    const merged = mergeExportTask(local, remote);
    if (merged) {
      memory.jobs.set(taskId, merged as unknown as Record<string, unknown>);
    }
    return merged;
  }

  async get(taskId: string, user: AuthUser) {
    const task = await this.hydrate(taskId);
    if (!task || task.createdBy !== user.id) {
      throw new NotFoundException({
        error: { code: "NOT_FOUND", message: "任务不存在" },
      });
    }
    if (task.status === "succeeded" || task.status === "failed" || task.status === "cancelled") {
      await persistJobRow(task);
    }
    return {
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      errorMessage: task.errorMessage ?? undefined,
      report: task.report ?? undefined,
      downloadUrl:
        task.status === "succeeded"
          ? `/api/v1/export/tasks/${taskId}/artifact`
          : undefined,
    };
  }

  async cancel(taskId: string, user: AuthUser) {
    const task = await this.hydrate(taskId);
    if (!task || task.createdBy !== user.id) {
      throw new NotFoundException({
        error: { code: "NOT_FOUND", message: "任务不存在" },
      });
    }
    if (task.status === "queued" || task.status === "running") {
      task.status = "cancelled";
      task.updatedAt = new Date().toISOString();
      task.finishedAt = task.updatedAt;
      memory.jobs.set(taskId, task as unknown as Record<string, unknown>);
      await saveTaskStatus(task);
      await persistJobRow(task);
    }
    return { status: task.status };
  }

  async retry(taskId: string, user: AuthUser) {
    const task = await this.hydrate(taskId);
    if (!task || task.createdBy !== user.id) {
      throw new NotFoundException({
        error: { code: "NOT_FOUND", message: "任务不存在" },
      });
    }
    return this.create(user, {
      documentId: task.documentId,
      mode: task.mode,
      scope: task.scope,
    });
  }

  async artifact(taskId: string, user: AuthUser) {
    const view = await this.get(taskId, user);
    const task = memory.jobs.get(taskId) as unknown as ExportTask;
    if (view.status !== "succeeded" || !task.artifactAssetId) {
      throw new NotFoundException({
        error: {
          code: "TASK_NOT_DOWNLOADABLE",
          message: "任务未成功，无法下载",
        },
      });
    }
    const asset = memory.assets.get(task.artifactAssetId);
    if (asset?.buffer) {
      return {
        buffer: asset.buffer as Buffer,
        filename: `export-${taskId}.pptx`,
        mime: String(asset.mime),
      };
    }
    const key = `exports/${taskId}.pptx`;
    const obj = await getObject(key);
    if (!obj) {
      throw new NotFoundException({
        error: { code: "TASK_NOT_DOWNLOADABLE", message: "产物不存在" },
      });
    }
    return {
      buffer: obj.buffer,
      filename: `export-${taskId}.pptx`,
      mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    };
  }

  runPreflight(body: {
    document: unknown;
    mode?: ExportMode;
    scope?: { sceneIds: string[] | "all"; sort?: "position" | "name" };
  }) {
    const cdm = parseCanvoryDocument(body.document);
    const mode = body.mode ?? "auto";
    const report = preflight(cdm, mode, body.scope ?? { sceneIds: "all" });
    if (report.blockingErrors.length > 0) {
      throw new HttpException(report, HttpStatus.CONFLICT);
    }
    return report;
  }
}
