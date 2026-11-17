/**
 * MinIO / S3 兼容存储（T015c / BK-06）
 * 未配置 MINIO_ENDPOINT 时回退到内存 Map。
 */
import { memory } from "../db/pool.js";

export type StoredObject = {
  key: string;
  mime: string;
  buffer: Buffer;
};

const memObjects = new Map<string, StoredObject>();

export function storageConfigured(): boolean {
  return Boolean(process.env.MINIO_ENDPOINT && process.env.MINIO_ACCESS_KEY);
}

export async function putObject(
  key: string,
  buffer: Buffer,
  mime: string,
): Promise<{ storageKey: string }> {
  if (!storageConfigured()) {
    memObjects.set(key, { key, mime, buffer });
    return { storageKey: key };
  }

  // 动态导入，避免未安装时阻塞本地内存模式
  const { Client } = await import("minio");
  const client = new Client({
    endPoint: process.env.MINIO_ENDPOINT!,
    port: Number(process.env.MINIO_PORT ?? 9000),
    useSSL: process.env.MINIO_USE_SSL === "1",
    accessKey: process.env.MINIO_ACCESS_KEY!,
    secretKey: process.env.MINIO_SECRET_KEY!,
  });
  const bucket = process.env.MINIO_BUCKET ?? "canvory";
  const exists = await client.bucketExists(bucket);
  if (!exists) await client.makeBucket(bucket, "us-east-1");
  await client.putObject(bucket, key, buffer, buffer.byteLength, {
    "Content-Type": mime,
  });
  return { storageKey: key };
}

export async function getObject(key: string): Promise<StoredObject | null> {
  if (!storageConfigured()) {
    return memObjects.get(key) ?? null;
  }
  const { Client } = await import("minio");
  const client = new Client({
    endPoint: process.env.MINIO_ENDPOINT!,
    port: Number(process.env.MINIO_PORT ?? 9000),
    useSSL: process.env.MINIO_USE_SSL === "1",
    accessKey: process.env.MINIO_ACCESS_KEY!,
    secretKey: process.env.MINIO_SECRET_KEY!,
  });
  const bucket = process.env.MINIO_BUCKET ?? "canvory";
  const stream = await client.getObject(bucket, key);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return {
    key,
    mime: "application/octet-stream",
    buffer: Buffer.concat(chunks),
  };
}

/** 将导出产物写入 storage，并登记 memory.assets */
export async function storeExportArtifact(
  assetId: string,
  key: string,
  buffer: Buffer,
  mime: string,
): Promise<void> {
  await putObject(key, buffer, mime);
  memory.assets.set(assetId, {
    id: assetId,
    kind: "export_artifact",
    mime,
    byteSize: buffer.byteLength,
    storageKey: key,
    buffer,
    createdAt: new Date().toISOString(),
  });
}
