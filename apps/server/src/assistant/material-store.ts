import { randomUUID } from "node:crypto";
import { ensureUser, postgresEnabled } from "../db/postgres-documents.js";
import { getPool, memory } from "../db/pool.js";
import { putObject, storageConfigured } from "../storage/minio.js";

export const MATERIAL_TEXT_LIMIT = 200_000;

export type MaterialRow = {
  id: string;
  ownerId: string;
  fileId: string;
  text: string;
  mime: string;
};

export function assertMaterialInput(fileId: string, text: string, mime: string): void {
  if (mime !== "text/plain") throw new Error("MATERIAL_TYPE_UNSUPPORTED");
  if (!fileId || fileId.length > 80 || fileId.includes("/") || fileId.includes("\\") || fileId.includes("..")) {
    throw new Error("FILE_ID_INVALID");
  }
  if (typeof text !== "string" || text.length === 0 || text.length > MATERIAL_TEXT_LIMIT) {
    throw new Error("MATERIAL_TEXT_INVALID");
  }
}

export async function saveMaterial(input: {
  ownerId: string;
  email: string;
  displayName: string;
  fileId: string;
  text: string;
  mime: string;
  storeBytes: boolean;
}): Promise<{ id: string; storage: "postgres" | "memory"; persistent: boolean }> {
  assertMaterialInput(input.fileId, input.text, input.mime);
  const id = randomUUID();
  let storageKey: string | null = null;
  if (input.storeBytes && storageConfigured()) {
    storageKey = `materials/${input.ownerId}/${id}.txt`;
    await putObject(storageKey, Buffer.from(input.text, "utf8"), input.mime);
  }
  if (postgresEnabled()) {
    await ensureUser(input.ownerId, input.email, input.displayName);
    await getPool().query(
      `INSERT INTO assistant_materials (id, owner_id, file_id, mime, body, storage_key)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, input.ownerId, input.fileId, input.mime, input.text, storageKey],
    );
    return { id, storage: "postgres", persistent: true };
  }
  memory.materials.set(id, {
    id,
    ownerId: input.ownerId,
    fileId: input.fileId,
    text: input.text,
    mime: input.mime,
  });
  return { id, storage: "memory", persistent: false };
}

export async function readMaterial(ownerId: string, fileId: string, id: string): Promise<MaterialRow | null> {
  if (postgresEnabled()) {
    const result = await getPool().query(
      `SELECT id, owner_id, file_id, mime, body FROM assistant_materials
       WHERE id=$1 AND owner_id=$2 AND file_id=$3`,
      [id, ownerId, fileId],
    );
    const row = result.rows[0] as { id: string; owner_id: string; file_id: string; mime: string; body: string } | undefined;
    if (!row) return null;
    return { id: row.id, ownerId: row.owner_id, fileId: row.file_id, mime: row.mime, text: row.body };
  }
  const row = memory.materials.get(id);
  if (!row || row.ownerId !== ownerId || row.fileId !== fileId) return null;
  return row;
}
