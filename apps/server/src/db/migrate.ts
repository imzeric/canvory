import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL required");
    process.exit(1);
  }
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  const sql = fs.readFileSync(path.join(__dirname, "migrations/001_init.sql"), "utf8");
  await client.query(sql);
  await client.end();
  console.log("Migration 001_init applied");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
