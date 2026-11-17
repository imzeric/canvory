import { describe, expect, it } from "vitest";
import { mergeExportTask } from "./task-merge.js";

describe("mergeExportTask", () => {
  it("prefers a newer remote terminal status over the local queued cache", () => {
    const merged = mergeExportTask(
      { id: "t", status: "queued" as const, artifactAssetId: null },
      { id: "t", status: "succeeded" as const, artifactAssetId: "a1" },
    );
    expect(merged).toMatchObject({ status: "succeeded", artifactAssetId: "a1" });
  });

  it("does not let a stale remote queued snapshot clobber a local success", () => {
    const merged = mergeExportTask(
      { id: "t", status: "succeeded" as const, artifactAssetId: "a1" },
      { id: "t", status: "queued" as const, artifactAssetId: null },
    );
    expect(merged?.status).toBe("succeeded");
    expect(merged?.artifactAssetId).toBe("a1");
  });

  it("keeps cancelled even if the worker snapshot is still running", () => {
    const merged = mergeExportTask(
      { id: "t", status: "cancelled" as const },
      { id: "t", status: "running" as const, progress: 10 },
    );
    expect(merged?.status).toBe("cancelled");
  });

  it("uses the remote snapshot when this process has no memory entry", () => {
    const remote = { id: "t", status: "succeeded" as const };
    expect(mergeExportTask(undefined, remote)).toEqual(remote);
  });
});
