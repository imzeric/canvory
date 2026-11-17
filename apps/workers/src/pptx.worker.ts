/**
 * BullMQ PPTX worker（T037 / T067 / T082）
 * 上传 MinIO、写 Redis 任务状态；未配置 REDIS_URL 时 idle。
 * buildPptx 注入 resolveStorageKey，支持仅含 storageKey 的 Asset。
 */
import { Worker, type Job } from "bullmq";
import { randomUUID } from "node:crypto";
import { buildPptx } from "@canvory/exporter-pptx";
import { parseCanvoryDocument } from "@canvory/document-model";
import type { ExportMode } from "@canvory/core";

export type PptxJobData = {
  taskId: string;
  document: unknown;
  mode: ExportMode;
  scope?: { sceneIds: string[] | "all"; sort?: "position" | "name" };
  createdBy: string;
  documentId: string;
  versionId: string;
};

function minioClient() {
  if (!process.env.MINIO_ENDPOINT) return null;
  // dynamic import caller
  return import("minio").then(({ Client }) => {
    return new Client({
      endPoint: process.env.MINIO_ENDPOINT!,
      port: Number(process.env.MINIO_PORT ?? 9000),
      useSSL: process.env.MINIO_USE_SSL === "1",
      accessKey: process.env.MINIO_ACCESS_KEY!,
      secretKey: process.env.MINIO_SECRET_KEY!,
    });
  });
}

async function putMinio(key: string, buffer: Buffer, mime: string) {
  const client = await minioClient();
  if (!client) {
    return { storageKey: key, uploaded: false };
  }
  const bucket = process.env.MINIO_BUCKET ?? "canvory";
  if (!(await client.bucketExists(bucket))) {
    await client.makeBucket(bucket, "us-east-1");
  }
  await client.putObject(bucket, key, buffer, buffer.byteLength, {
    "Content-Type": mime,
  });
  return { storageKey: key, uploaded: true };
}

async function getMinioObject(key: string): Promise<Buffer | null> {
  const client = await minioClient();
  if (!client) return null;
  const bucket = process.env.MINIO_BUCKET ?? "canvory";
  try {
    const stream = await client.getObject(bucket, key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  } catch {
    return null;
  }
}

async function resolveStorageKeyToDataUrl(storageKey: string): Promise<string | undefined> {
  const buf = await getMinioObject(storageKey);
  if (!buf) return undefined;
  const mime =
    storageKey.endsWith(".png")
      ? "image/png"
      : storageKey.endsWith(".jpg") || storageKey.endsWith(".jpeg")
        ? "image/jpeg"
        : storageKey.endsWith(".webp")
          ? "image/webp"
          : "application/octet-stream";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function saveRedisTask(task: Record<string, unknown>) {
  const url = process.env.REDIS_URL;
  if (!url) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import("ioredis");
  const RedisCtor = mod.default ?? mod.Redis ?? mod;
  const redis = new RedisCtor(url);
  try {
    await redis.set(
      `canvory:export-task:${task.id}`,
      JSON.stringify(task),
      "EX",
      60 * 60 * 24,
    );
  } finally {
    redis.disconnect();
  }
}

export async function processPptxJob(data: PptxJobData): Promise<{
  ok: boolean;
  artifactKey?: string;
  failureArtifactKey?: string;
  errorMessage?: string;
  report?: unknown;
}> {
  const now = () => new Date().toISOString();
  const base = {
    id: data.taskId,
    documentId: data.documentId,
    versionId: data.versionId,
    mode: data.mode,
    scope: data.scope,
    createdBy: data.createdBy,
    createdAt: now(),
    artifactAssetId: null as string | null,
    failureArtifactKey: null as string | null,
    errorMessage: null as string | null,
    report: null as unknown,
    finishedAt: null as string | null,
  };

  try {
    await saveRedisTask({
      ...base,
      status: "running",
      progress: 10,
    });

    const cdm = parseCanvoryDocument(data.document);
    const result = await buildPptx(cdm, {
      mode: data.mode,
      scope: data.scope ?? { sceneIds: "all" },
      resolveStorageKey: resolveStorageKeyToDataUrl,
    });

    const artifactKey = `exports/${data.taskId}.pptx`;
    const mime =
      "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    await putMinio(artifactKey, result.buffer, mime);
    const assetId = randomUUID();

    await saveRedisTask({
      ...base,
      status: "succeeded",
      progress: 100,
      artifactAssetId: assetId,
      report: result.report,
      updatedAt: now(),
      finishedAt: now(),
      artifactKey,
    });

    return { ok: true, artifactKey, report: result.report };
  } catch (e) {
    const failureArtifactKey = `exports/failures/${data.taskId}.log`;
    const errorMessage = e instanceof Error ? e.message : String(e);
    await putMinio(failureArtifactKey, Buffer.from(errorMessage, "utf8"), "text/plain").catch(
      () => undefined,
    );
    await saveRedisTask({
      ...base,
      status: "failed",
      progress: 0,
      failureArtifactKey,
      errorMessage,
      updatedAt: now(),
      finishedAt: now(),
    });
    return { ok: false, failureArtifactKey, errorMessage };
  }
}

async function main() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.log(
      "[pptx.worker] REDIS_URL unset — worker idle. Server inline export still works.",
    );
    return;
  }

  const worker = new Worker<PptxJobData>(
    "pptx-export",
    async (job: Job<PptxJobData>) => processPptxJob(job.data),
    { connection: { url: redisUrl } },
  );

  worker.on("completed", (job) => console.log(`job ${job.id} completed`));
  worker.on("failed", (job, err) => console.error(`job ${job?.id} failed`, err));
  console.log("[pptx.worker] listening on queue pptx-export");
}

const isDirect =
  process.argv[1] &&
  (import.meta.url === `file://${process.argv[1]}` ||
    import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/")));

if (isDirect) {
  void main();
}

export { main };
