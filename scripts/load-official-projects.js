// Load the official multi-sheet workbook staging data into Neon.
// Requires local generated files:
//   scripts/staging-projects.json
// Optional:
//   scripts/textbox-data.json
// Run:
//   node --env-file=.env scripts/load-official-projects.js

import crypto from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Client } = pg;

const YEARS = [2566, 2567, 2568, 2569, 2570];
const VALID_STATUS = new Set(["not_set", "planning", "in_progress", "completed", "cancelled"]);

const stagingPath = join(__dirname, "staging-projects.json");
const textboxPath = join(__dirname, "textbox-data.json");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

if (!existsSync(stagingPath)) {
  console.error("scripts/staging-projects.json not found. Run scripts/import-projects.cjs first.");
  process.exit(1);
}

const staging = JSON.parse(readFileSync(stagingPath, "utf8"));
const textboxData = existsSync(textboxPath)
  ? JSON.parse(readFileSync(textboxPath, "utf8"))
  : null;

const NON_PROJECT_ANNOTATION_TYPES = new Set(["form_index", "cover_metadata"]);

function shortStrategyName(name, id) {
  if (!name) return `ยุทธศาสตร์ที่ ${id}`;
  return name.replace(/^ยุทธศาสตร์เทศบาลนครนครสวรรค์ด้าน/, "").trim() || name;
}

function strategyIdForSheet(sheet) {
  const direct = Number(sheet.preamble?.strategyNum);
  if (Number.isInteger(direct) && direct > 0) return direct;
  const code = String(sheet.preamble?.tacticCode ?? "");
  const inferred = Number(code.split(".")[0]);
  return Number.isInteger(inferred) && inferred > 0 ? inferred : 99;
}

function strategyNameForSheet(sheet, id) {
  return sheet.preamble?.strategyName
    || (String(sheet.preamble?.tacticName ?? "").startsWith("ยุทธศาสตร์") ? sheet.preamble.tacticName : null)
    || `ยุทธศาสตร์ที่ ${id}`;
}

function tacticCodeForSheet(sheet, id) {
  const code = String(sheet.preamble?.tacticCode ?? "").trim();
  if (/^\d+\.\d+$/.test(code)) return code;
  if (/^\d+\.$/.test(code)) return `${id}.0`;
  return `${id}.0`;
}

function tacticNameForSheet(sheet, code) {
  const name = sheet.preamble?.tacticName;
  if (name && !String(name).startsWith("ยุทธศาสตร์")) return name;
  return `ไม่ระบุกลยุทธ์ (${code})`;
}

function planNameForSheet(sheet) {
  return sheet.preamble?.planName || `ไม่ระบุแผนงาน (${sheet.sheetName})`;
}

function normalizedProjectStatus(status) {
  return VALID_STATUS.has(status) ? status : "not_set";
}

function numericBudget(value) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function findAnnotationOwner(projects, sourceRow) {
  if (!projects?.length || sourceRow === null || sourceRow === undefined) return null;

  const exact = projects.find((project) => project.sourceRow === sourceRow);
  if (exact) return exact;

  let owner = null;
  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    const next = projects[i + 1];
    if (project.sourceRow <= sourceRow && (!next || sourceRow < next.sourceRow)) {
      owner = project;
    }
    if (project.sourceRow > sourceRow) break;
  }
  return owner;
}

async function loadOfficialProjects() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  const batchId = crypto.randomUUID();
  await client.connect();

  let projectCount = 0;
  let budgetCount = 0;
  let annotationCount = 0;
  let linkedAnnotationCount = 0;
  let unmatchedAnnotationCount = 0;
  let projectSheetAnnotationCount = 0;
  let projectSheetUnmatchedCount = 0;
  let sheetMetaCount = 0;
  let docMetaCount = 0;

  const strategies = new Map();
  const tactics = new Map();
  const plans = new Map();
  const projectsBySheet = new Map();

  try {
    await client.query("BEGIN");

    await client.query(`
      TRUNCATE project_budgets, project_annotations, projects, plans, tactics, strategies
      RESTART IDENTITY CASCADE
    `);

    for (const sheet of staging.sheets) {
      const strategyId = strategyIdForSheet(sheet);
      const strategyName = strategyNameForSheet(sheet, strategyId);
      if (!strategies.has(strategyId)) {
        strategies.set(strategyId, {
          id: strategyId,
          name: strategyName,
          short_name: shortStrategyName(strategyName, strategyId),
        });
      }

      const tacticCode = tacticCodeForSheet(sheet, strategyId);
      const tacticKey = `${strategyId}:${tacticCode}:${tacticNameForSheet(sheet, tacticCode)}`;
      if (!tactics.has(tacticKey)) {
        tactics.set(tacticKey, {
          code: tacticCode,
          name: tacticNameForSheet(sheet, tacticCode),
          strategy_id: strategyId,
          id: null,
        });
      }

      const planKey = `${tacticKey}:${planNameForSheet(sheet)}`;
      if (!plans.has(planKey)) {
        plans.set(planKey, {
          name: planNameForSheet(sheet),
          tacticKey,
          id: null,
        });
      }
    }

    for (const strategy of strategies.values()) {
      await client.query(
        `INSERT INTO strategies (id, name, short_name, department)
         VALUES ($1, $2, $3, NULL)`,
        [strategy.id, strategy.name, strategy.short_name],
      );
    }

    for (const [key, tactic] of tactics) {
      const result = await client.query(
        `INSERT INTO tactics (code, name, strategy_id)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [tactic.code, tactic.name, tactic.strategy_id],
      );
      tactics.set(key, { ...tactic, id: result.rows[0].id });
    }

    for (const [key, plan] of plans) {
      const tactic = tactics.get(plan.tacticKey);
      const result = await client.query(
        `INSERT INTO plans (name, tactic_id)
         VALUES ($1, $2)
         RETURNING id`,
        [plan.name, tactic.id],
      );
      plans.set(key, { ...plan, id: result.rows[0].id });
    }

    for (const sheet of staging.sheets) {
      const strategyId = strategyIdForSheet(sheet);
      const tacticCode = tacticCodeForSheet(sheet, strategyId);
      const tacticKey = `${strategyId}:${tacticCode}:${tacticNameForSheet(sheet, tacticCode)}`;
      const planKey = `${tacticKey}:${planNameForSheet(sheet)}`;
      const plan = plans.get(planKey);

      for (const project of sheet.projects) {
        const inserted = await client.query(
          `INSERT INTO projects
             (name, objective, target, kpi, expected_result, department, plan_id, status,
              source_sheet, source_row, amendment_version, import_batch_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           RETURNING id`,
          [
            project.name,
            project.objective || null,
            project.target || null,
            project.kpi || null,
            project.expectedResult || null,
            project.department || null,
            plan.id,
            normalizedProjectStatus(project.status),
            project.sourceSheet,
            project.sourceRow,
            project.amendmentVersion || null,
            batchId,
          ],
        );
        const projectId = inserted.rows[0].id;
        const sheetProjects = projectsBySheet.get(project.sourceSheet) ?? [];
        sheetProjects.push({ id: projectId, sourceRow: project.sourceRow });
        projectsBySheet.set(project.sourceSheet, sheetProjects);
        projectCount++;

        for (const year of YEARS) {
          const amount = numericBudget(project[`budget${year}`]);
          const ordinanceAmount = numericBudget(project[`ordinance${year}`]);
          if (amount > 0 || ordinanceAmount > 0) {
            await client.query(
              `INSERT INTO project_budgets (project_id, year, amount, ordinance_amount)
               VALUES ($1,$2,$3,$4)`,
              [projectId, year, amount, ordinanceAmount],
            );
            budgetCount++;
          }
        }
      }
    }

    if (textboxData?.sheets) {
      for (const sheet of textboxData.sheets) {
        const formIndexTB = sheet.textBoxes.find((tb) => tb.type === "form_index");
        await client.query(
          `INSERT INTO sheet_metadata (sheet_name, sheet_index, form_type, form_title)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (sheet_name) DO UPDATE SET
             sheet_index = EXCLUDED.sheet_index,
             form_type = EXCLUDED.form_type,
             form_title = EXCLUDED.form_title`,
          [sheet.sheetName, sheet.sheetIndex, formIndexTB?.formType || null, formIndexTB?.formTitle || null],
        );
        sheetMetaCount++;

        for (const tb of sheet.textBoxes.filter((item) => item.type === "cover_metadata")) {
          const key = `${sheet.sheetName}_row${tb.fromRow}`;
          await client.query(
            `INSERT INTO document_metadata (key, value)
             VALUES ($1,$2)
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
            [key, tb.rawText],
          );
          docMetaCount++;
        }

        for (const tb of sheet.textBoxes) {
          const isProjectAnnotation = !NON_PROJECT_ANNOTATION_TYPES.has(tb.type);
          let projectId = null;

          if (isProjectAnnotation) {
            const candidates = projectsBySheet.get(sheet.sheetName) ?? [];
            const owner = findAnnotationOwner(candidates, tb.fromRow);
            if (candidates.length > 0) {
              projectSheetAnnotationCount++;
            }

            if (owner) {
              projectId = owner.id;
              linkedAnnotationCount++;
            } else {
              unmatchedAnnotationCount++;
              if (candidates.length > 0) {
                projectSheetUnmatchedCount++;
              }
            }
          }

          await client.query(
            `INSERT INTO project_annotations
               (project_id, source_sheet, source_row, annotation_type, raw_text,
                amendment_type, amendment_number, amendment_year, target_plan, target_ref, funding_source)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [
              projectId,
              sheet.sheetName,
              tb.fromRow,
              tb.type,
              tb.rawText,
              tb.amendmentType || null,
              tb.amendmentNumber || null,
              tb.amendmentYear || null,
              tb.targetPlan || null,
              tb.targetRef || null,
              tb.fundingSource || null,
            ],
          );
          annotationCount++;
        }
      }
    }

    await client.query(`
      INSERT INTO departments (name)
        SELECT DISTINCT department FROM projects
        WHERE department IS NOT NULL AND department <> ''
      ON CONFLICT (name) DO NOTHING
    `);
    await client.query(`
      UPDATE projects p
      SET department_id = d.id
      FROM departments d
      WHERE p.department = d.name
        AND EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'projects' AND column_name = 'department_id'
        )
    `);

    await client.query("COMMIT");
    console.log(JSON.stringify({
      batchId,
      strategies: strategies.size,
      tactics: tactics.size,
      plans: plans.size,
      projects: projectCount,
      budgets: budgetCount,
      annotations: annotationCount,
      linkedAnnotations: linkedAnnotationCount,
      unmatchedProjectAnnotations: unmatchedAnnotationCount,
      projectSheetAnnotations: projectSheetAnnotationCount,
      unmatchedProjectSheetAnnotations: projectSheetUnmatchedCount,
      sheetMetadata: sheetMetaCount,
      documentMetadata: docMetaCount,
    }, null, 2));
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

loadOfficialProjects().catch((err) => {
  console.error("Official project load failed:", err);
  process.exit(1);
});
