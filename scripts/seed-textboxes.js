// Seed text box annotation data into project_annotations and sheet_metadata tables
// Reads from scripts/textbox-data.json (output of extract-textboxes.cjs)
// Run: node scripts/seed-textboxes.js

import pg from "pg";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Client } = pg;

const client = new Client({
  connectionString:
    "postgresql://neondb_owner:npg_9S4KAqlyiCUO@ep-plain-darkness-ao06zq83-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
});

const textboxDataPath = join(__dirname, "textbox-data.json");
const data = JSON.parse(readFileSync(textboxDataPath, "utf8"));

async function seedTextboxes() {
  await client.connect();
  console.log("Connected to Neon PostgreSQL");

  // ─── Clear existing data ──────────────────────────────────────────────────
  await client.query("DELETE FROM project_annotations");
  await client.query("DELETE FROM sheet_metadata");
  await client.query("DELETE FROM document_metadata");
  console.log("Cleared existing annotation/metadata tables");

  let annotationCount = 0;
  let sheetMetaCount = 0;
  let docMetaCount = 0;

  for (const sheet of data.sheets) {
    // ─── Seed sheet_metadata ──────────────────────────────────────────────
    const formIndexTB = sheet.textBoxes.find((tb) => tb.type === "form_index");
    const formType = formIndexTB?.formType || null;
    const formTitle = formIndexTB?.formTitle || null;

    await client.query(
      `INSERT INTO sheet_metadata (sheet_name, sheet_index, form_type, form_title)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (sheet_name) DO UPDATE SET
         sheet_index = EXCLUDED.sheet_index,
         form_type = EXCLUDED.form_type,
         form_title = EXCLUDED.form_title`,
      [sheet.sheetName, sheet.sheetIndex, formType, formTitle]
    );
    sheetMetaCount++;

    // ─── Seed project_annotations ─────────────────────────────────────────
    for (const tb of sheet.textBoxes) {
      await client.query(
        `INSERT INTO project_annotations
           (source_sheet, source_row, annotation_type, raw_text,
            amendment_type, amendment_number, amendment_year,
            target_plan, target_ref, funding_source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
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
        ]
      );
      annotationCount++;
    }

    // ─── Seed document_metadata (from cover_metadata text boxes) ──────────
    if (sheet.textBoxes.some((tb) => tb.type === "cover_metadata")) {
      for (const tb of sheet.textBoxes.filter(
        (t) => t.type === "cover_metadata"
      )) {
        const key = `${sheet.sheetName}_row${tb.fromRow}`;
        try {
          await client.query(
            `INSERT INTO document_metadata (key, value) VALUES ($1, $2)
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
            [key, tb.rawText]
          );
          docMetaCount++;
        } catch {
          // skip duplicate key errors
        }
      }
    }
  }

  console.log(`Seeded ${sheetMetaCount} sheet_metadata rows`);
  console.log(`Seeded ${annotationCount} project_annotations rows`);
  console.log(`Seeded ${docMetaCount} document_metadata rows`);

  await client.end();
  console.log("Seed complete.");
}

seedTextboxes().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
