// Verifies that Excel text boxes are loaded into project_annotations with
// deterministic project ownership. Run after npm run load-official-projects:
//   node --env-file=.env scripts/verify-annotation-links.js

import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Client } = pg;

const stagingPath = join(__dirname, "staging-projects.json");
const textboxPath = join(__dirname, "textbox-data.json");
const NON_PROJECT_ANNOTATION_TYPES = new Set(["form_index", "cover_metadata"]);

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

for (const path of [stagingPath, textboxPath]) {
  if (!existsSync(path)) {
    console.error(`${path} not found. Regenerate import staging data before verifying.`);
    process.exit(1);
  }
}

const staging = JSON.parse(readFileSync(stagingPath, "utf8"));
const textboxData = JSON.parse(readFileSync(textboxPath, "utf8"));

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

function groupKey(row) {
  return [
    row.sourceSheet,
    row.sourceRow,
    row.annotationType,
    row.rawText,
    row.projectSourceRow ?? "null",
  ].join("\u001f");
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

const projectsBySheet = new Map();
for (const sheet of staging.sheets) {
  projectsBySheet.set(
    sheet.sheetName,
    sheet.projects
      .map((project) => ({
        sourceSheet: project.sourceSheet,
        sourceRow: project.sourceRow,
        name: project.name,
      }))
      .sort((a, b) => a.sourceRow - b.sourceRow),
  );
}

const expected = new Map();
const expectedSamples = [];
const sourceStats = {
  totalTextBoxes: 0,
  metadataTextBoxes: 0,
  projectSheetTextBoxes: 0,
  linkedProjectTextBoxes: 0,
  nonProjectSheetTextBoxes: 0,
  unmatchedProjectSheetTextBoxes: 0,
};

for (const sheet of textboxData.sheets) {
  const projects = projectsBySheet.get(sheet.sheetName) ?? [];
  for (const tb of sheet.textBoxes) {
    sourceStats.totalTextBoxes++;
    const isMetadata = NON_PROJECT_ANNOTATION_TYPES.has(tb.type);
    if (isMetadata) sourceStats.metadataTextBoxes++;

    let owner = null;
    if (!isMetadata && projects.length > 0) {
      sourceStats.projectSheetTextBoxes++;
      owner = findAnnotationOwner(projects, tb.fromRow);
      if (owner) sourceStats.linkedProjectTextBoxes++;
      else sourceStats.unmatchedProjectSheetTextBoxes++;
    } else if (!isMetadata) {
      sourceStats.nonProjectSheetTextBoxes++;
    }

    const expectedRow = {
      sourceSheet: sheet.sheetName,
      sourceRow: tb.fromRow,
      annotationType: tb.type,
      rawText: tb.rawText,
      projectSourceRow: owner?.sourceRow ?? null,
    };
    increment(expected, groupKey(expectedRow));
    if (expectedSamples.length < 5 && owner) {
      expectedSamples.push({
        sourceSheet: expectedRow.sourceSheet,
        textBoxRow: expectedRow.sourceRow,
        annotationType: expectedRow.annotationType,
        projectRow: owner.sourceRow,
        projectName: owner.name,
      });
    }
  }
}

const client = new Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();
  const { rows } = await client.query(`
    SELECT
      pa.source_sheet,
      pa.source_row,
      pa.annotation_type,
      pa.raw_text,
      p.source_row AS project_source_row,
      p.name AS project_name
    FROM project_annotations pa
    LEFT JOIN projects p ON p.id = pa.project_id
    ORDER BY pa.source_sheet, pa.source_row, pa.id
  `);

  const actual = new Map();
  for (const row of rows) {
    increment(actual, groupKey({
      sourceSheet: row.source_sheet,
      sourceRow: row.source_row,
      annotationType: row.annotation_type,
      rawText: row.raw_text,
      projectSourceRow: row.project_source_row,
    }));
  }

  const missing = [];
  const extra = [];
  for (const [key, count] of expected) {
    const actualCount = actual.get(key) ?? 0;
    if (actualCount !== count) missing.push({ key, expected: count, actual: actualCount });
  }
  for (const [key, count] of actual) {
    const expectedCount = expected.get(key) ?? 0;
    if (expectedCount !== count) extra.push({ key, expected: expectedCount, actual: count });
  }

  const duplicateLinks = await client.query(`
    SELECT source_sheet, source_row, annotation_type, raw_text, COUNT(DISTINCT project_id)::int AS project_count
    FROM project_annotations
    WHERE project_id IS NOT NULL
    GROUP BY source_sheet, source_row, annotation_type, raw_text
    HAVING COUNT(DISTINCT project_id) > 1
  `);

  const summary = {
    ok:
      rows.length === sourceStats.totalTextBoxes &&
      missing.length === 0 &&
      extra.length === 0 &&
      duplicateLinks.rows.length === 0 &&
      sourceStats.unmatchedProjectSheetTextBoxes === 0,
    sourceStats,
    databaseRows: rows.length,
    duplicateLinkedGroups: duplicateLinks.rows.length,
    mismatches: {
      missing: missing.slice(0, 10),
      extra: extra.slice(0, 10),
      missingCount: missing.length,
      extraCount: extra.length,
    },
    linkedSamples: expectedSamples,
  };

  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exit(1);
} finally {
  await client.end();
}
