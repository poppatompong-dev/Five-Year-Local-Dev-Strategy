import { neon } from "@neondatabase/serverless";

let _sql: ReturnType<typeof neon> | null = null;

export function getSql() {
  if (!_sql) {
    const url = process.env["DATABASE_URL"];
    if (!url) throw new Error("DATABASE_URL environment variable is not set. Add it in Vercel → Project Settings → Environment Variables.");
    _sql = neon(url);
  }
  return _sql;
}
