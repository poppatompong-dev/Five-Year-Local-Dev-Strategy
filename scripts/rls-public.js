// Grant public read access (anon role) to all data tables
// Run: node scripts/rls-public.js

import pg from "pg";

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

const SQL = `
-- Enable RLS on all tables (required for Neon Data API)
ALTER TABLE strategies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tactics           ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans             ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_budgets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment         ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_annotations ENABLE ROW LEVEL SECURITY;

-- Allow anonymous (unauthenticated) read on all public data tables
DO $$ BEGIN
  CREATE POLICY "anon_read_strategies"      ON strategies         FOR SELECT TO anonymous USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "anon_read_tactics"         ON tactics            FOR SELECT TO anonymous USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "anon_read_plans"           ON plans              FOR SELECT TO anonymous USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "anon_read_projects"        ON projects           FOR SELECT TO anonymous USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "anon_read_project_budgets" ON project_budgets    FOR SELECT TO anonymous USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "anon_read_equipment"       ON equipment          FOR SELECT TO anonymous USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "anon_read_departments"     ON departments        FOR SELECT TO anonymous USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "anon_read_audit_events"    ON audit_events       FOR SELECT TO anonymous USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "anon_read_annotations"     ON project_annotations FOR SELECT TO anonymous USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow authenticated users full CRUD on all tables
DO $$ BEGIN
  CREATE POLICY "auth_all_strategies"       ON strategies         FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "auth_all_tactics"          ON tactics            FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "auth_all_plans"            ON plans              FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "auth_all_projects"         ON projects           FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "auth_all_project_budgets"  ON project_budgets    FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "auth_all_equipment"        ON equipment          FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "auth_all_departments"      ON departments        FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "auth_all_audit_events"     ON audit_events       FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "auth_all_annotations"      ON project_annotations FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
`;

async function run() {
  await client.connect();
  console.log("Connected to Neon PostgreSQL");
  await client.query(SQL);
  console.log("RLS policies applied — public read + authenticated write.");
  await client.end();
}

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
