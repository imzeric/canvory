export type MergeableTaskStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

const RANK: Record<MergeableTaskStatus, number> = {
  queued: 0,
  running: 1,
  succeeded: 2,
  failed: 2,
  cancelled: 3,
};

/**
 * 同一进程内存与 Redis 状态合并。
 * 取消优先于 Worker 尚未覆盖的中间态；其余取更靠后的状态，避免把 succeeded 读成创建时的 queued。
 */
export function mergeExportTask<T extends { status: MergeableTaskStatus }>(
  local: T | undefined,
  remote: T | null,
): T | undefined {
  if (!remote) return local;
  if (!local) return remote;
  if (local.status === "cancelled" || remote.status === "cancelled") {
    const cancelled = local.status === "cancelled" ? local : remote;
    const other = local.status === "cancelled" ? remote : local;
    return { ...other, ...cancelled, status: "cancelled" };
  }
  if (RANK[remote.status] >= RANK[local.status]) {
    return { ...local, ...remote };
  }
  return local;
}
