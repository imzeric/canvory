import { randomUUID } from "node:crypto";
import pg from "pg";
import { closePool } from "../src/db/pool.js";
import { readMaterial, saveMaterial } from "../src/assistant/material-store.js";
import { getObject } from "../src/storage/minio.js";

const owner = {
  id: "00000000-0000-4000-8000-0000000000aa",
  email: "m2-restart@canvory.local",
  displayName: "M2 Restart",
};
const fileId = "6f71c274-da7c-80fc-8008-f5ab48e51a0d";
const marker = process.argv[2] === "read" ? "" : `IT7484-M2-MATERIAL-${randomUUID()}`;

async function writePhase() {
  const saved = await saveMaterial({
    ownerId: owner.id,
    email: owner.email,
    displayName: owner.displayName,
    fileId,
    text: marker,
    mime: "text/plain",
    storeBytes: true,
  });
  await closePool();
  process.stdout.write(`${saved.id}\t${marker}\t${saved.storage}\n`);
}

async function readPhase(id: string, text: string) {
  const row = await readMaterial(owner.id, fileId, id);
  const other = await readMaterial("00000000-0000-4000-8000-0000000000bb", fileId, id);
  await closePool();
  if (!row || row.text !== text) {
    console.error("MATERIAL_NOT_RESTORED");
    process.exit(1);
  }
  if (other) {
    console.error("MATERIAL_OWNER_LEAK");
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const count = await pool.query("SELECT count(*)::int AS n FROM assistant_materials WHERE id=$1", [id]);
  await pool.end();
  if (count.rows[0]?.n !== 1) {
    console.error("MATERIAL_ROW_MISSING");
    process.exit(1);
  }
  process.stdout.write(`restored\t${id}\n`);
}

async function minioPhase(id: string) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const result = await pool.query("SELECT storage_key, body FROM assistant_materials WHERE id=$1", [id]);
  await pool.end();
  const key = result.rows[0]?.storage_key as string | null;
  const body = result.rows[0]?.body as string;
  if (!key) {
    console.error("MINIO_KEY_MISSING");
    process.exit(2);
  }
  const got = await getObject(key);
  if (!got || got.buffer.toString("utf8") !== body) {
    console.error("MINIO_BYTES_MISMATCH");
    process.exit(1);
  }
  process.stdout.write(`minio-restored\t${got.buffer.length}\n`);
}

const mode = process.argv[2] ?? "write";
if (mode === "write") await writePhase();
else if (mode === "minio") await minioPhase(process.argv[3] ?? "");
else await readPhase(process.argv[3] ?? "", process.argv[4] ?? "");
