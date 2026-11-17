import { describe, expect, it, beforeEach } from "vitest";
import { DocumentsService } from "../documents/documents.service.js";
import { TasksService } from "./tasks.service.js";
import { memory } from "../db/pool.js";
import type { AuthUser } from "../auth/auth.guard.js";
import { NotFoundException } from "@nestjs/common";

const user: AuthUser = {
  id: "u-export",
  email: "e@canvory.local",
  displayName: "E",
};

function sampleCdm() {
  const now = Date.now();
  return {
    id: "doc-export",
    schemaVersion: "1.0.0",
    title: "export-me",
    type: "presentation" as const,
    settings: { width: 1920, height: 1080, unit: "px" as const },
    scenes: [
      {
        id: "s1",
        name: "P1",
        type: "slide" as const,
        children: [
          {
            id: "t1",
            type: "text" as const,
            transform: { x: 10, y: 10, width: 200, height: 40, rotation: 0 },
            content: {
              runs: [
                {
                  text: "hi",
                  fontFamily: "Arial",
                  fontSize: 18,
                  fontWeight: "400",
                  color: "#000",
                },
              ],
            },
          },
        ],
      },
    ],
    assets: [],
    animations: [],
    interactions: [],
    metadata: { createdAt: now, updatedAt: now, version: 1 },
  };
}

describe("export tasks (V6)", () => {
  beforeEach(() => {
    memory.documents.clear();
    memory.jobs.clear();
    memory.assets.clear();
    process.env.EXPORT_INLINE = "1";
  });

  it("succeeds and only then exposes artifact; failed has no download", async () => {
    const docs = new DocumentsService();
    const tasks = new TasksService(docs);
    const created = await docs.create(user, "t", sampleCdm());

    const { taskId } = await tasks.create(user, {
      documentId: created.id,
      mode: "auto",
    });

    // 内联 process 为 fire-and-forget；短暂等待
    await new Promise((r) => setTimeout(r, 200));
    for (let i = 0; i < 20; i++) {
      const st = await tasks.get(taskId, user);
      if (st.status === "succeeded" || st.status === "failed") break;
      await new Promise((r) => setTimeout(r, 100));
    }

    const st = await tasks.get(taskId, user);
    expect(st.status).toBe("succeeded");
    expect(st.downloadUrl).toContain("/artifact");
    const file = await tasks.artifact(taskId, user);
    expect(file.buffer.byteLength).toBeGreaterThan(1000);

    const { taskId: t2 } = await tasks.create(user, {
      documentId: created.id,
      mode: "auto",
    });
    await tasks.cancel(t2, user);
    const cancelled = await tasks.get(t2, user);
    expect(cancelled.downloadUrl).toBeUndefined();
    await expect(tasks.artifact(t2, user)).rejects.toBeInstanceOf(NotFoundException);
  });
});
