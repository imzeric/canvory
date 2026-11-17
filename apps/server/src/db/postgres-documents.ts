/**
 * Postgres 持久化（T069）— USE_MEMORY_DB=1 或无 DATABASE_URL 时不启用。
 */
import { randomUUID } from "node:crypto";
import type { CanvoryDocument } from "@canvory/document-model";
import { getPool, useMemoryDb } from "./pool.js";

export function postgresEnabled(): boolean {
  return !useMemoryDb();
}

export async function ensureUser(id: string, email: string, displayName: string) {
  if (!postgresEnabled()) return;
  const pool = getPool();
  await pool.query(
    `INSERT INTO users (id, email, display_name) VALUES ($1,$2,$3)
     ON CONFLICT (id) DO NOTHING`,
    [id, email, displayName],
  );
}

export async function insertDocument(
  id: string,
  ownerId: string,
  title: string,
  versionId: string,
  cdm: CanvoryDocument,
) {
  if (!postgresEnabled()) return;
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO documents (id, owner_id, title) VALUES ($1,$2,$3)`,
      [id, ownerId, title],
    );
    await client.query(
      `INSERT INTO document_versions (id, document_id, version_no, schema_version, cdm_json, created_by)
       VALUES ($1,$2,1,$3,$4,$5)`,
      [versionId, id, cdm.schemaVersion, JSON.stringify(cdm), ownerId],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function insertVersion(
  documentId: string,
  versionNo: number,
  cdm: CanvoryDocument,
  createdBy: string,
  versionId: string = randomUUID(),
  label?: string,
): Promise<string> {
  if (!postgresEnabled()) return versionId;
  const pool = getPool();
  await pool.query(
    `INSERT INTO document_versions (id, document_id, version_no, schema_version, cdm_json, created_by)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [versionId, documentId, versionNo, cdm.schemaVersion, JSON.stringify(cdm), createdBy],
  );
  await pool.query(`UPDATE documents SET title=$1, updated_at=NOW() WHERE id=$2`, [
    cdm.title,
    documentId,
  ]);
  void label;
  return versionId;
}

export async function loadDocumentFromPg(documentId: string, ownerId: string) {
  if (!postgresEnabled()) return null;
  const pool = getPool();
  const doc = await pool.query(
    `SELECT id, title, updated_at FROM documents WHERE id=$1 AND owner_id=$2`,
    [documentId, ownerId],
  );
  if (!doc.rowCount) return null;
  const versions = await pool.query(
    `SELECT id, version_no, schema_version, cdm_json, created_at
     FROM document_versions WHERE document_id=$1 ORDER BY version_no ASC`,
    [documentId],
  );
  return {
    id: doc.rows[0].id as string,
    title: doc.rows[0].title as string,
    updatedAt: new Date(doc.rows[0].updated_at).toISOString(),
    versions: versions.rows.map((v) => ({
      id: v.id as string,
      versionNo: v.version_no as number,
      schemaVersion: v.schema_version as string,
      cdm: v.cdm_json,
      createdAt: new Date(v.created_at).toISOString(),
    })),
  };
}

export async function upsertExportJob(row: {
  id: string;
  documentId: string;
  versionId: string | null;
  format: string;
  mode: string;
  status: string;
  progress: number;
  artifactAssetId?: string | null;
  errorMessage?: string | null;
  createdBy: string;
}) {
  if (!postgresEnabled()) return;
  const pool = getPool();
  await pool.query(
    `INSERT INTO export_jobs
      (id, document_id, version_id, format, mode, status, progress, artifact_asset_id, error_message, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (id) DO UPDATE SET
       status=EXCLUDED.status,
       progress=EXCLUDED.progress,
       artifact_asset_id=EXCLUDED.artifact_asset_id,
       error_message=EXCLUDED.error_message,
       updated_at=NOW(),
       finished_at=CASE WHEN EXCLUDED.status IN ('succeeded','failed','cancelled') THEN NOW() ELSE export_jobs.finished_at END`,
    [
      row.id,
      row.documentId,
      row.versionId,
      row.format,
      row.mode,
      row.status,
      row.progress,
      row.artifactAssetId ?? null,
      row.errorMessage ?? null,
      row.createdBy,
    ],
  );
}
