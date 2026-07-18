import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const { Client } = pg;

if (!process.env.DATABASE_URL) {
  console.log("DATABASE_URL is not set; skipping database migration.");
  process.exit(0);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const schema = await readFile(path.join(scriptDir, "..", "db", "schema.sql"), "utf8");
const client = new Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();
  await client.query(schema);
  console.log("Lucent database schema is ready.");
} finally {
  await client.end();
}
