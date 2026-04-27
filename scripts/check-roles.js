import pg from "pg";
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});
await client.connect();
const res = await client.query(`SELECT rolname FROM pg_roles WHERE rolname LIKE '%anon%' OR rolname LIKE '%neon%' OR rolname LIKE '%public%' OR rolname LIKE '%auth%' ORDER BY rolname`);
console.log("Roles:", res.rows.map(r => r.rolname));
await client.end();
