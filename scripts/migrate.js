// Database migration script — creates schema on Neon PostgreSQL
// Run: node scripts/migrate.js

import pg from "pg";

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

const DDL = `
CREATE TABLE IF NOT EXISTS strategies (
  id        INTEGER PRIMARY KEY,
  name      TEXT    NOT NULL,
  short_name TEXT,
  department TEXT
);

CREATE TABLE IF NOT EXISTS tactics (
  id          SERIAL  PRIMARY KEY,
  code        TEXT    NOT NULL,
  name        TEXT    NOT NULL,
  strategy_id INTEGER NOT NULL REFERENCES strategies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS plans (
  id         SERIAL  PRIMARY KEY,
  name       TEXT    NOT NULL,
  tactic_id  INTEGER NOT NULL REFERENCES tactics(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS projects (
  id              SERIAL  PRIMARY KEY,
  name            TEXT    NOT NULL,
  objective       TEXT,
  target          TEXT,
  kpi             TEXT,
  expected_result TEXT,
  department      TEXT,
  plan_id         INTEGER REFERENCES plans(id) ON DELETE SET NULL,
  status          TEXT    NOT NULL DEFAULT 'planning'
                          CHECK (status IN ('planning','in_progress','completed','cancelled')),
  source_sheet    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_budgets (
  id         SERIAL  PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  year       INTEGER NOT NULL,
  amount     NUMERIC NOT NULL DEFAULT 0,
  UNIQUE (project_id, year)
);

CREATE TABLE IF NOT EXISTS equipment (
  id           SERIAL PRIMARY KEY,
  plan_name    TEXT,
  category     TEXT,
  item_type    TEXT,
  target       TEXT,
  department   TEXT,
  budget_2566  NUMERIC NOT NULL DEFAULT 0,
  budget_2567  NUMERIC NOT NULL DEFAULT 0,
  budget_2568  NUMERIC NOT NULL DEFAULT 0,
  budget_2569  NUMERIC NOT NULL DEFAULT 0,
  budget_2570  NUMERIC NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_projects_plan_id    ON projects(plan_id);
CREATE INDEX IF NOT EXISTS idx_projects_department ON projects(department);
CREATE INDEX IF NOT EXISTS idx_projects_status     ON projects(status);
CREATE INDEX IF NOT EXISTS idx_project_budgets_year ON project_budgets(year);

-- ═══════════════════════════════════════════════════════════════════════════════
-- New columns on existing tables
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='amendment_version') THEN
    ALTER TABLE projects ADD COLUMN amendment_version TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='source_row') THEN
    ALTER TABLE projects ADD COLUMN source_row INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='import_batch_id') THEN
    ALTER TABLE projects ADD COLUMN import_batch_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_budgets' AND column_name='ordinance_amount') THEN
    ALTER TABLE project_budgets ADD COLUMN ordinance_amount NUMERIC DEFAULT 0;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Text Box Annotation Tables (from OOXML drawing extraction)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS project_annotations (
  id              SERIAL PRIMARY KEY,
  project_id      INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  source_sheet    TEXT NOT NULL,
  source_row      INTEGER NOT NULL,
  annotation_type TEXT NOT NULL
    CHECK (annotation_type IN (
      'amendment','change','addition','transfer','merge',
      'duplicate','budget_source','status_note','form_index','cover_metadata'
    )),
  raw_text        TEXT NOT NULL,
  amendment_type  TEXT,
  amendment_number INTEGER,
  amendment_year  INTEGER,
  target_plan     TEXT,
  target_ref      TEXT,
  funding_source  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_annotations_project   ON project_annotations(project_id);
CREATE INDEX IF NOT EXISTS idx_annotations_type      ON project_annotations(annotation_type);
CREATE INDEX IF NOT EXISTS idx_annotations_sheet_row ON project_annotations(source_sheet, source_row);

CREATE TABLE IF NOT EXISTS sheet_metadata (
  id            SERIAL PRIMARY KEY,
  sheet_name    TEXT NOT NULL UNIQUE,
  sheet_index   INTEGER NOT NULL,
  form_type     TEXT,
  form_title    TEXT,
  col_layout    TEXT CHECK (col_layout IN ('17-col','12-col','summary','equipment','other')),
  row_count     INTEGER,
  strategy_num  TEXT,
  tactic_code   TEXT,
  plan_name     TEXT
);

CREATE TABLE IF NOT EXISTS document_metadata (
  id    SERIAL PRIMARY KEY,
  key   TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Import Pipeline Tables (staging + audit)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file TEXT NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  imported_by TEXT,
  sheet_count INTEGER,
  project_count INTEGER,
  equipment_count INTEGER,
  status TEXT CHECK (status IN ('staging','validated','committed','rolled_back')),
  error_log JSONB
);

CREATE TABLE IF NOT EXISTS staging_projects (
  id SERIAL PRIMARY KEY,
  batch_id UUID REFERENCES import_batches(id),
  source_sheet TEXT,
  source_row INTEGER,
  raw_data JSONB,
  parsed_strategy TEXT,
  parsed_tactic_code TEXT,
  parsed_plan_name TEXT,
  project_name TEXT,
  objective TEXT,
  target TEXT,
  budget_2566 NUMERIC,
  budget_2567 NUMERIC,
  budget_2568 NUMERIC,
  budget_2569 NUMERIC,
  budget_2570 NUMERIC,
  ordinance_2566 NUMERIC,
  ordinance_2567 NUMERIC,
  ordinance_2568 NUMERIC,
  ordinance_2569 NUMERIC,
  ordinance_2570 NUMERIC,
  kpi TEXT,
  expected_result TEXT,
  department TEXT,
  amendment_version TEXT,
  textbox_annotations JSONB,
  validation_status TEXT CHECK (validation_status IN ('pending','valid','warning','error')),
  validation_errors JSONB,
  committed_project_id INTEGER REFERENCES projects(id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Departments table + FK (Data Integrity)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS departments (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- Populate from existing project departments
INSERT INTO departments (name)
  SELECT DISTINCT department FROM projects
  WHERE department IS NOT NULL AND department <> ''
ON CONFLICT (name) DO NOTHING;

-- Add department_id FK column if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='department_id') THEN
    ALTER TABLE projects ADD COLUMN department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Back-fill department_id from department text
UPDATE projects p
  SET department_id = d.id
  FROM departments d
  WHERE p.department = d.name AND p.department_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_projects_department_id ON projects(department_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Audit Events table
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS audit_events (
  id         SERIAL PRIMARY KEY,
  action     TEXT NOT NULL CHECK (action IN ('create','update','delete','import','status_change')),
  entity     TEXT NOT NULL,
  entity_id  INTEGER,
  before     JSONB,
  after      JSONB,
  timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON audit_events(action);
CREATE INDEX IF NOT EXISTS idx_audit_events_ts     ON audit_events(timestamp DESC);
`;

async function migrate() {
  await client.connect();
  console.log("Connected to Neon PostgreSQL");
  await client.query(DDL);
  console.log("Schema migration complete.");
  await client.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
