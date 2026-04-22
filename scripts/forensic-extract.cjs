/**
 * Forensic workbook extractor — dumps full structural metadata + cell data
 * for every sheet in the source Excel workbook.
 *
 * Output: scripts/forensic-output.json  (machine-readable)
 *         scripts/forensic-report.txt   (human-readable summary)
 */
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const SRC = path.join(
  __dirname,
  "..",
  "src",
  "ส่วนที่ 3.2  แผนพัฒนาท้องถิ่น 5 ปี 66-70  20 10 64.xlsx"
);

const wb = XLSX.readFile(SRC, { cellStyles: true, cellDates: true, sheetStubs: true });

const output = {
  file: path.basename(SRC),
  sheetNames: wb.SheetNames,
  sheets: {},
};

let report = "";
function log(s = "") { report += s + "\n"; }

log("=" .repeat(100));
log(`FORENSIC WORKBOOK ANALYSIS: ${path.basename(SRC)}`);
log(`Sheets: ${wb.SheetNames.length}`);
log("=" .repeat(100));

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const ref = ws["!ref"] || "(empty)";
  const merges = ws["!merges"] || [];

  log(`\n${"─".repeat(80)}`);
  log(`SHEET: "${name}"   Range: ${ref}   Merges: ${merges.length}`);
  log("─".repeat(80));

  // Decode range
  let range = null;
  let totalRows = 0, totalCols = 0;
  if (ref !== "(empty)") {
    range = XLSX.utils.decode_range(ref);
    totalRows = range.e.r - range.s.r + 1;
    totalCols = range.e.c - range.s.c + 1;
  }

  // Merged cells detail
  const mergeDetails = merges.map((m) => ({
    range: XLSX.utils.encode_range(m),
    startRow: m.s.r + 1,
    endRow: m.e.r + 1,
    startCol: XLSX.utils.encode_col(m.s.c),
    endCol: XLSX.utils.encode_col(m.e.c),
    rowSpan: m.e.r - m.s.r + 1,
    colSpan: m.e.c - m.s.c + 1,
  }));

  log(`  Rows: ${totalRows}  Cols: ${totalCols}`);
  if (mergeDetails.length > 0) {
    log(`  Merged regions (${mergeDetails.length}):`);
    for (const md of mergeDetails.slice(0, 60)) {
      log(`    ${md.range}  (${md.rowSpan}r × ${md.colSpan}c)`);
    }
    if (mergeDetails.length > 60) log(`    ... and ${mergeDetails.length - 60} more`);
  }

  // Extract ALL rows as arrays (preserving blanks)
  const rows = [];
  if (range) {
    for (let r = range.s.r; r <= range.e.r; r++) {
      const row = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = ws[addr];
        if (cell) {
          row.push({
            addr,
            v: cell.v,          // raw value
            w: cell.w,          // formatted text
            t: cell.t,          // type: s=string, n=number, b=bool, d=date, z=stub
          });
        } else {
          row.push({ addr, v: null, w: "", t: "z" });
        }
      }
      rows.push(row);
    }
  }

  // Dump first 80 rows to report for forensic review (human-readable)
  const dumpLimit = Math.min(rows.length, 80);
  log(`\n  First ${dumpLimit} rows (of ${rows.length}):`);
  for (let i = 0; i < dumpLimit; i++) {
    const cells = rows[i]
      .map((c) => {
        if (c.v === null) return "";
        const val = String(c.w || c.v);
        return val.length > 50 ? val.slice(0, 47) + "..." : val;
      });
    // Only print if row has non-empty cells
    const nonEmpty = cells.filter(Boolean);
    if (nonEmpty.length > 0) {
      const rowNum = (range ? range.s.r : 0) + i + 1;
      log(`  R${String(rowNum).padStart(4, "0")}| ${cells.join(" | ")}`);
    }
  }

  // Detect structural patterns
  const blankRows = [];
  const textOnlyRows = [];
  const numericRows = [];
  for (let i = 0; i < rows.length; i++) {
    const nonEmpty = rows[i].filter((c) => c.v !== null);
    if (nonEmpty.length === 0) {
      blankRows.push(i + 1);
    } else if (nonEmpty.every((c) => c.t === "s")) {
      textOnlyRows.push(i + 1);
    } else if (nonEmpty.some((c) => c.t === "n")) {
      numericRows.push(i + 1);
    }
  }

  log(`\n  Structural summary:`);
  log(`    Blank rows: ${blankRows.length} ${blankRows.length <= 20 ? JSON.stringify(blankRows) : `(first 20: ${JSON.stringify(blankRows.slice(0, 20))})`}`);
  log(`    Text-only rows: ${textOnlyRows.length}`);
  log(`    Numeric rows: ${numericRows.length}`);

  output.sheets[name] = {
    ref,
    totalRows,
    totalCols,
    merges: mergeDetails,
    rows: rows.map((r) => r.map((c) => ({ v: c.v, w: c.w || "", t: c.t }))),
    blankRows,
    textOnlyRows,
    numericRows,
  };
}

log("\n" + "=".repeat(100));
log("END OF CELL DATA EXTRACTION");
log("=".repeat(100));

// ─── Append text box report if available ─────────────────────────────────────
const textboxReportPath = path.join(__dirname, "textbox-report.txt");
if (fs.existsSync(textboxReportPath)) {
  log("\n\n");
  log(fs.readFileSync(textboxReportPath, "utf8"));
} else {
  log("\n(Text box report not found — run extract-textboxes.cjs first)");
}

log("\n" + "=".repeat(100));
log("END OF FORENSIC EXTRACTION");
log("=".repeat(100));

fs.writeFileSync(path.join(__dirname, "forensic-output.json"), JSON.stringify(output, null, 2), "utf8");
fs.writeFileSync(path.join(__dirname, "forensic-report.txt"), report, "utf8");

console.log(`Done. ${wb.SheetNames.length} sheets extracted.`);
console.log(`  → scripts/forensic-output.json`);
console.log(`  → scripts/forensic-report.txt`);
