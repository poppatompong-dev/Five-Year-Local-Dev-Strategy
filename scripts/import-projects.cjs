/**
 * Import Pipeline — Stage 1: Extract + Annotate
 *
 * Reads the Excel workbook with SheetJS, attaches text box annotations
 * from the OOXML drawing extraction, and outputs staging-ready JSON.
 *
 * Prerequisites:
 *   1. Run extract-textboxes.cjs first (generates textbox-data.json)
 *
 * Output:
 *   scripts/staging-projects.json   — per-sheet staging project data with annotations
 *
 * Usage: node scripts/import-projects.cjs
 */
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const { buildTextboxLookup } = require("./lib/textbox-lookup.cjs");

// ─── Source file ──────────────────────────────────────────────────────────────
const SRC = path.join(
  __dirname,
  "..",
  "src",
  "ส่วนที่ 3.2  แผนพัฒนาท้องถิ่น 5 ปี 66-70  20 10 64.xlsx"
);

// ─── Load textbox lookup ─────────────────────────────────────────────────────
const textboxPath = path.join(__dirname, "textbox-data.json");
if (!fs.existsSync(textboxPath)) {
  console.error("ERROR: textbox-data.json not found. Run extract-textboxes.cjs first.");
  process.exit(1);
}
const lookup = buildTextboxLookup(textboxPath);
console.log(`Loaded textbox lookup: ${lookup.stats.totalTextBoxes} annotations across ${lookup.stats.totalSheets} sheets`);

// ─── Load workbook ───────────────────────────────────────────────────────────
const wb = XLSX.readFile(SRC, { cellStyles: true, cellDates: true, sheetStubs: true });

// ─── Budget parsing (Phase 4.7 rules) ───────────────────────────────────────
function parseBudget(cell) {
  if (!cell || cell.v === null || cell.v === undefined) return null;
  if (cell.t === "n") return cell.v;
  const s = String(cell.w || cell.v).trim();
  if (!s || /^\s*$/.test(s)) return null;
  if (/^-+$/.test(s.replace(/\s/g, ""))) return 0;
  const cleaned = s.replace(/,/g, "").replace(/\s/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// ─── Cell text helper ────────────────────────────────────────────────────────
function cellText(ws, r, c) {
  const addr = XLSX.utils.encode_cell({ r, c });
  const cell = ws[addr];
  if (!cell || cell.v === null || cell.v === undefined) return null;
  return String(cell.w || cell.v).trim() || null;
}

function cellNumeric(ws, r, c) {
  const addr = XLSX.utils.encode_cell({ r, c });
  const cell = ws[addr];
  if (!cell) return null;
  return parseBudget(cell);
}

// ─── Classify sheet category ─────────────────────────────────────────────────
function classifySheet(sheetName, formMeta) {
  const formType = formMeta?.formType;
  if (formType === "ผ.01") return "summary";
  if (formType === "ผ.02/1") return "community";
  if (formType === "ผ.02/2") return "provincial";
  if (formType === "ผ.03" || /ครุภัณฑ์/.test(sheetName)) return "equipment";
  if (formType === "ผ.02" || /^ยุทธ/.test(sheetName)) return "project_detail";
  if (/แผนงาน/.test(sheetName) && !(/^ยุทธ/.test(sheetName))) return "hierarchy";
  if (/กราฟ|Sheet2|สรุป/.test(sheetName)) return "other";
  return "other";
}

// ─── Parse metadata preamble (rows 1-11) ─────────────────────────────────────
function parsePreamble(ws, sheetName) {
  const meta = {
    sheetName,
    formTitle: null,
    planDoc: null,
    entity: null,
    strategyNum: null,
    strategyName: null,
    tacticCode: null,
    tacticName: null,
    planName: null,
  };

  // Row 0 (Excel row 1): form title
  meta.formTitle = cellText(ws, 0, 0) || cellText(ws, 0, 1);
  // Row 1 (Excel row 2): plan document reference
  meta.planDoc = cellText(ws, 1, 0) || cellText(ws, 1, 1);
  // Row 2 (Excel row 3): entity name
  meta.entity = cellText(ws, 2, 0) || cellText(ws, 2, 1);

  // Row 8 (Excel row 9): strategy
  const strategyText = cellText(ws, 8, 0) || cellText(ws, 8, 1) || "";
  const stratMatch = strategyText.match(/(\d+)\.\s*(ยุทธศาสตร์.+)/);
  if (stratMatch) {
    meta.strategyNum = stratMatch[1];
    meta.strategyName = stratMatch[2];
  }

  // Row 9 (Excel row 10): tactic
  const tacticText = cellText(ws, 9, 0) || cellText(ws, 9, 1) || "";
  const tacticMatch = tacticText.match(/([\d.]+)\s*(?:กลยุทธ์)?(.+)/);
  if (tacticMatch) {
    meta.tacticCode = tacticMatch[1].trim();
    meta.tacticName = tacticMatch[2].trim();
  }

  // Row 10 (Excel row 11): plan
  const planText = cellText(ws, 10, 0) || cellText(ws, 10, 1) || "";
  const planMatch = planText.match(/\(\d+\)\s*(แผนงาน\S+)/);
  if (planMatch) {
    meta.planName = planMatch[1];
  }

  return meta;
}

// ─── Detect column layout ────────────────────────────────────────────────────
function detectLayout(ws) {
  const ref = ws["!ref"];
  if (!ref) return "unknown";
  const range = XLSX.utils.decode_range(ref);
  const totalCols = range.e.c - range.s.c + 1;
  if (totalCols >= 17) return "17-col";
  if (totalCols >= 12) return "12-col";
  return "narrow";
}

// ─── Parse amendment marker from cell text ───────────────────────────────────
function parseAmendmentMarker(text) {
  if (!text) return null;
  const m = text.match(
    /(ทบทวน|แก้ไข|เปลี่ยนแปลง|เพิ่มเติม)\s*(?:ครั้งที่\s*)?(\d+)\s*\/\s*(\d{4})/
  );
  if (m) {
    return { type: m[1], number: parseInt(m[2], 10), year: parseInt(m[3], 10) };
  }
  return null;
}

// ─── MAIN EXTRACTION ─────────────────────────────────────────────────────────
const results = {
  sourceFile: path.basename(SRC),
  extractedAt: new Date().toISOString(),
  sheets: [],
};

let totalProjects = 0;
let totalAnnotated = 0;

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const ref = ws["!ref"];
  if (!ref) continue;

  const formMeta = lookup.getFormType(name);
  const category = classifySheet(name, formMeta);

  // Only process project detail sheets
  if (category !== "project_detail") continue;

  const range = XLSX.utils.decode_range(ref);
  const layout = detectLayout(ws);
  const preamble = parsePreamble(ws, name);

  const projects = [];
  let currentAmendment = "original";
  let lastProject = null;

  // Data rows start at row 14 (0-indexed), after 3-row header at rows 11-13
  const dataStart = 14;

  for (let r = dataStart; r <= range.e.r; r++) {
    const colA = cellText(ws, r, 0); // sequence number
    const colB = cellText(ws, r, 1); // project name or amendment marker

    // Check if row is blank
    let hasData = false;
    for (let c = 0; c <= Math.min(range.e.c, 11); c++) {
      if (cellText(ws, r, c)) { hasData = true; break; }
    }
    if (!hasData) continue;

    // Check for amendment marker (text in col B, nothing in col A, no budget data)
    if (!colA && colB) {
      const amendParsed = parseAmendmentMarker(colB);
      if (amendParsed) {
        currentAmendment = `${amendParsed.type} ${amendParsed.number}/${amendParsed.year}`;
        continue;
      }
    }

    // Check for summary rows
    const colD = cellText(ws, r, 3);
    if (colD && /(รวมงบประมาณ|รวมจำนวนโครงการ)/.test(colD)) continue;

    // PROJECT row: col A is numeric
    const seqNum = colA ? parseInt(colA, 10) : NaN;
    if (!isNaN(seqNum) && colB) {
      // Get text box annotations for this row.
      // Also check row-1 and row+1 to catch textboxes that visually straddle the
      // boundary between header and first data cell (fromRow may be off by 1).
      const rawAnnotations = [
        ...lookup.getAnnotationsForRow(name, r - 1),
        ...lookup.getAnnotationsForRow(name, r),
        ...lookup.getAnnotationsForRow(name, r + 1),
      ];
      // Deduplicate by type+number+year (same amendment captured from adjacent rows)
      const seen = new Set();
      const annotationsFiltered = rawAnnotations.filter((a) => {
        if (a.type === "form_index") return false;
        const k = `${a.type}:${a.amendmentNumber || ""}:${a.amendmentYear || ""}:${a.rawText.slice(0, 30)}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      // If multiple amendment annotations exist, pick the one with the HIGHEST
      // (year, number) — that represents the most recent authoritative revision.
      let effectiveAmendment = currentAmendment;
      const amendAnnots = annotationsFiltered.filter(
        (a) => a.type === "amendment" || a.type === "change" || a.type === "addition"
      );
      if (amendAnnots.length > 0) {
        const latest = amendAnnots.reduce((best, cur) =>
          cur.amendmentYear > best.amendmentYear ||
          (cur.amendmentYear === best.amendmentYear && cur.amendmentNumber > best.amendmentNumber)
            ? cur
            : best
        );
        effectiveAmendment = `${latest.amendmentType} ${latest.amendmentNumber}/${latest.amendmentYear}`;
      }
      const amendAnnot = amendAnnots.length > 0 ? amendAnnots[amendAnnots.length - 1] : null;

      // Determine transfer/merge status
      let projectStatus = "planning";
      const transferAnnot = annotationsFiltered.find((a) => a.type === "transfer");
      const mergeAnnot = annotationsFiltered.find((a) => a.type === "merge");
      const dupAnnot = annotationsFiltered.find((a) => a.type === "duplicate");

      if (transferAnnot) projectStatus = "transferred";
      if (mergeAnnot) projectStatus = "merged";
      if (dupAnnot) projectStatus = "duplicate";

      const project = {
        sourceSheet: name,
        sourceRow: r,
        sequenceNum: seqNum,
        name: colB,
        objective: cellText(ws, r, 2),
        target: cellText(ws, r, 3),
        budget2566: cellNumeric(ws, r, 4),
        budget2567: cellNumeric(ws, r, 5),
        budget2568: cellNumeric(ws, r, 6),
        budget2569: cellNumeric(ws, r, 7),
        budget2570: cellNumeric(ws, r, 8),
        kpi: cellText(ws, r, 9),
        expectedResult: cellText(ws, r, 10),
        department: cellText(ws, r, 11),
        // 17-col layout: ordinance budgets in cols 12-16
        ...(layout === "17-col"
          ? {
              ordinance2566: cellNumeric(ws, r, 12),
              ordinance2567: cellNumeric(ws, r, 13),
              ordinance2568: cellNumeric(ws, r, 14),
              ordinance2569: cellNumeric(ws, r, 15),
              ordinance2570: cellNumeric(ws, r, 16),
            }
          : {}),
        amendmentVersion: effectiveAmendment,
        // All amendment events attached to this row (full history)
        allAmendments: amendAnnots.length > 0
          ? amendAnnots.map((a) => `${a.amendmentType} ${a.amendmentNumber}/${a.amendmentYear}`)
          : null,
        status: projectStatus,
        // Parsed preamble context
        strategyNum: preamble.strategyNum,
        tacticCode: preamble.tacticCode,
        planName: preamble.planName,
        // Text box annotations (full detail)
        textboxAnnotations: annotationsFiltered.length > 0 ? annotationsFiltered : null,
        // Cross-references
        transferTarget: transferAnnot?.targetPlan || transferAnnot?.targetRef || null,
        sourcePlan: annotationsFiltered.find((a) => a.sourcePlan)?.sourcePlan || null,
        mergeTarget: mergeAnnot?.targetRef || null,
        duplicateOf: dupAnnot?.targetRef || null,
        fundingSource: annotationsFiltered.find((a) => a.type === "budget_source")?.fundingSource || null,
      };

      projects.push(project);
      lastProject = project;
      totalProjects++;
      if (annotationsFiltered.length > 0) totalAnnotated++;
    }
    // CONTINUATION row: col A is empty, but other columns have data
    else if (!colA && lastProject) {
      // Append to previous project's multi-line fields
      const obj = cellText(ws, r, 2);
      const tgt = cellText(ws, r, 3);
      const kpi = cellText(ws, r, 9);
      const er = cellText(ws, r, 10);
      const dept = cellText(ws, r, 11);

      if (obj) lastProject.objective = (lastProject.objective || "") + "\n" + obj;
      if (tgt) lastProject.target = (lastProject.target || "") + "\n" + tgt;
      if (kpi) lastProject.kpi = (lastProject.kpi || "") + "\n" + kpi;
      if (er) lastProject.expectedResult = (lastProject.expectedResult || "") + "\n" + er;
      if (dept) lastProject.department = (lastProject.department || "") + "\n" + dept;

      // Also check text box annotations on continuation rows
      const contAnnotations = lookup.getAnnotationsForRow(name, r)
        .filter((a) => a.type !== "form_index");
      if (contAnnotations.length > 0) {
        if (!lastProject.textboxAnnotations) {
          lastProject.textboxAnnotations = [];
        }
        lastProject.textboxAnnotations.push(...contAnnotations);
      }
    }
  }

  if (projects.length > 0) {
    results.sheets.push({
      sheetName: name,
      category,
      layout,
      formType: formMeta?.formType || null,
      preamble,
      projectCount: projects.length,
      projects,
    });
  }
}

// ─── Summary ─────────────────────────────────────────────────────────────────
results.totalSheets = results.sheets.length;
results.totalProjects = totalProjects;
results.totalAnnotated = totalAnnotated;

const outPath = path.join(__dirname, "staging-projects.json");
fs.writeFileSync(outPath, JSON.stringify(results, null, 2), "utf8");

console.log(`\nExtraction complete:`);
console.log(`  Sheets processed: ${results.totalSheets}`);
console.log(`  Projects extracted: ${totalProjects}`);
console.log(`  Projects with text box annotations: ${totalAnnotated}`);
console.log(`  → ${outPath}`);

// ─── Quick stats per sheet ───────────────────────────────────────────────────
console.log(`\nPer-sheet breakdown:`);
for (const sheet of results.sheets) {
  const annotated = sheet.projects.filter((p) => p.textboxAnnotations).length;
  console.log(
    `  ${sheet.sheetName.padEnd(40)} ${String(sheet.projectCount).padStart(4)} projects  ${String(annotated).padStart(3)} annotated  [${sheet.layout}]`
  );
}
