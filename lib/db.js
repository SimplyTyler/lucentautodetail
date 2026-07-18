import pg from "pg";

const { Pool } = pg;
const globalForDb = globalThis;

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export function getPool() {
  if (!hasDatabase()) {
    return null;
  }

  if (!globalForDb.__lucentPool) {
    globalForDb.__lucentPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 8,
      idleTimeoutMillis: 30000
    });
  }

  return globalForDb.__lucentPool;
}

export async function query(text, params = []) {
  const pool = getPool();
  if (!pool) {
    throw new Error("DATABASE_URL is not configured.");
  }
  return pool.query(text, params);
}
