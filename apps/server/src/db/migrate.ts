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
  const dir = path.join(__dirname, "migrations");
  const files = fs.readdirSync(dir).filter((name) => name.endsWith(".sql")).sort();
  for (const name of files) {
    await client.query(fs.readFileSync(path.join(dir, name), "utf8"));
  }
  await client.end();
  console.log(`Migrations applied: ${files.join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
