import { describe, expect, it, beforeEach } from "vitest";
import { DocumentsService } from "./documents.service.js";
import { memory } from "../db/pool.js";
import type { AuthUser } from "../auth/auth.guard.js";

const user: AuthUser = {
  id: "u1",
  email: "t@canvory.local",
  displayName: "T",
};

function sampleCdm(title: string) {
  const now = Date.now();
  return {
    id: "doc-restore",
    schemaVersion: "1.0.0",
    title,
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
            transform: { x: 0, y: 0, width: 100, height: 40, rotation: 0 },
            content: {
              runs: [
                {
                  text: title,
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

describe("versions restore = copy new version (V7)", () => {
  beforeEach(() => {
    memory.documents.clear();
    memory.users.clear();
  });

  it("restore copies snapshot as new version without deleting history", async () => {
    const docs = new DocumentsService();
    const created = await docs.create(user, "v1", sampleCdm("v1-content"));
    await docs.putVersion(created.id, user, sampleCdm("v2-content"));
    const before = await docs.listVersions(created.id, user);
    expect(before).toHaveLength(2);

    const restored = await docs.restore(created.id, 1, user);
    expect(restored.version).toBe(3);

    const after = await docs.listVersions(created.id, user);
    expect(after).toHaveLength(3);
    expect(after.map((v) => v.version)).toEqual([1, 2, 3]);

    const current = await docs.get(created.id, user);
    expect((current.cdm as { title: string }).title).toBe("v1-content");
  });
});
