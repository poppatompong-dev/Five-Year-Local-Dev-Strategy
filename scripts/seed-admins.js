// Seed custom admin users.
// Run: node --env-file=.env scripts/seed-admins.js

const DEFAULT_USERS = [
  { username: "pop", password: "pop" },
  { username: "pok", password: "pok" },
];

function parseUsers() {
  const raw = process.env.ADMIN_USERS;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ADMIN_USERS is required when NODE_ENV=production; refusing to seed default admin credentials");
    }
    return DEFAULT_USERS;
  }
  return raw.split(",").map((entry) => {
    const [username, password] = entry.split(":");
    if (!username?.trim() || !password) {
      throw new Error("ADMIN_USERS must use username:password pairs separated by commas");
    }
    return { username: username.trim().toLowerCase(), password };
  });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const users = parseUsers();
  const [{ default: bcrypt }, { default: pg }] = await Promise.all([
    import("bcryptjs"),
    import("pg"),
  ]);
  const { Client } = pg;

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id            SERIAL PRIMARY KEY,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await client.query(
      `
        INSERT INTO admin_users (username, password_hash)
        VALUES ($1, $2)
        ON CONFLICT (username)
        DO UPDATE SET password_hash = EXCLUDED.password_hash
      `,
      [user.username, passwordHash],
    );
    console.log(`Seeded admin user: ${user.username}`);
  }

  await client.end();
}

main().catch((err) => {
  console.error("Admin seed failed:", err);
  process.exit(1);
});
