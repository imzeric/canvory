/**
 * BullMQ 路径下任务状态跨进程可见（Redis）
 */
import type { ExportTask } from "./tasks.service.js";

const PREFIX = "canvory:export-task:";

async function redisClient() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import("ioredis");
  const RedisCtor = mod.default ?? mod.Redis ?? mod;
  return new RedisCtor(process.env.REDIS_URL!);
}

export async function saveTaskStatus(task: ExportTask): Promise<void> {
  if (!process.env.REDIS_URL) return;
  const redis = await redisClient();
  try {
    await redis.set(PREFIX + task.id, JSON.stringify(task), "EX", 60 * 60 * 24);
  } finally {
    redis.disconnect();
  }
}

export async function loadTaskStatus(taskId: string): Promise<ExportTask | null> {
  if (!process.env.REDIS_URL) return null;
  const redis = await redisClient();
  try {
    const raw = await redis.get(PREFIX + taskId);
    if (!raw) return null;
    return JSON.parse(raw) as ExportTask;
  } finally {
    redis.disconnect();
  }
}
