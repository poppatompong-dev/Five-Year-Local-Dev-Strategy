/**
 * Text Box / Drawing Object Extractor
 *
 * Reads the .xlsx file as a ZIP archive, parses OOXML drawing XML files,
 * and extracts all text box annotations with their anchor positions and
 * classified types.
 *
 * SheetJS does NOT read drawing objects — this script accesses them directly
 * from the OOXML package structure.
 *
 * Output:
 *   scripts/textbox-data.json       (machine-readable, per-sheet annotations)
 *   scripts/textbox-report.txt      (human-readable summary)
 */
const AdmZip = require("adm-zip");
const fs = require("fs");
const path = require("path");

// ─── Source file ──────────────────────────────────────────────────────────────
const SRC = path.join(
  __dirname,
  "..",
  "src",
  "ส่วนที่ 3.2  แผนพัฒนาท้องถิ่น 5 ปี 66-70  20 10 64.xlsx"
);

const zip = new AdmZip(SRC);

// ─── Helper: read ZIP entry as UTF-8 string ──────────────────────────────────
function readEntry(entryPath) {
  const entry = zip.getEntry(entryPath);
  if (!entry) return null;
  return entry.getData().toString("utf8");
}

// ─── Step 1: Build rId → sheet filename mapping from workbook.xml.rels ───────
function buildRIdToSheetFile() {
  const content = readEntry("xl/_rels/workbook.xml.rels");
  if (!content) return {};
  const map = {};
  const re = /Id="(rId\d+)"[^>]*Target="([^"]+)"/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    if (m[2].includes("worksheets/sheet")) {
      map[m[1]] = m[2]; // e.g. rId1 → "worksheets/sheet1.xml"
    }
  }
  return map;
}

// ─── Step 2: Build rId → sheet name mapping from workbook.xml ────────────────
function buildRIdToSheetName() {
  const content = readEntry("xl/workbook.xml");
  if (!content) return {};
  const map = {};
  const re = /<sheet name="([^"]+)"[^>]*r:id="(rId\d+)"/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    map[m[2]] = m[1]; // e.g. rId1 → "กราฟ"
  }
  return map;
}

// ─── Step 3: Build sheetN → drawingN mapping from per-sheet .rels ────────────
function buildSheetToDrawing() {
  const map = {};
  const entries = zip.getEntries();
  for (const entry of entries) {
    const match = entry.entryName.match(
      /^xl\/worksheets\/_rels\/sheet(\d+)\.xml\.rels$/
    );
    if (!match) continue;
    const sheetNum = parseInt(match[1], 10);
    const content = entry.getData().toString("utf8");
    const dm = content.match(/Target="\.\.\/drawings\/(drawing\d+\.xml)"/);
    if (dm) {
      map[sheetNum] = dm[1]; // e.g. 5 → "drawing4.xml"
    }
  }
  return map;
}

// ─── Step 4: Parse a single drawing XML → array of text box objects ──────────
function parseDrawing(drawingFileName) {
  const content = readEntry("xl/drawings/" + drawingFileName);
  if (!content) return [];

  const results = [];
  const anchorRe =
    /<xdr:twoCellAnchor>(.*?)<\/xdr:twoCellAnchor>/gs;
  let anchorMatch;

  while ((anchorMatch = anchorRe.exec(content)) !== null) {
    const block = anchorMatch[1];

    // Extract anchor coordinates
    const fromRowM = block.match(
      /<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/
    );
    const fromColM = block.match(
      /<xdr:from>[\s\S]*?<xdr:col>(\d+)<\/xdr:col>/
    );
    const toRowM = block.match(
      /<xdr:to>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/
    );
    const toColM = block.match(
      /<xdr:to>[\s\S]*?<xdr:col>(\d+)<\/xdr:col>/
    );

    if (!fromRowM) continue;

    const fromRow = parseInt(fromRowM[1], 10);
    const fromCol = parseInt(fromColM ? fromColM[1] : "0", 10);
    const toRow = parseInt(toRowM ? toRowM[1] : String(fromRow), 10);
    const toCol = parseInt(toColM ? toColM[1] : String(fromCol), 10);

    // Extract all <a:t> text fragments and join them
    const textFragments = [];
    const textRe = /<a:t>([^<]+)<\/a:t>/g;
    let tm;
    while ((tm = textRe.exec(block)) !== null) {
      textFragments.push(tm[1]);
    }

    if (textFragments.length === 0) continue;

    // Join fragments (some text boxes split a single phrase across multiple <a:t> runs)
    // Then collapse internal multi-spaces and fix split numbers like "256 8" → "2568"
    let rawText = textFragments
      .map((t) => t.trim())
      .filter(Boolean)
      .join(" ");
    // Fix split year numbers: "256 8" → "2568", "1 1" before "/" → "11"
    rawText = rawText.replace(/(\d)\s+(\d)/g, "$1$2");

    // Classify the text box
    // classifyTextBox now returns an ARRAY (multi-amendment support)
    const classifiedList = classifyTextBox(rawText, fromRow, toRow, fromCol, toCol);

    for (const classified of classifiedList) {
      results.push({
        fromRow,
        fromCol,
        toRow,
        toCol,
        rawText,
        fragments: textFragments,
        ...classified,
      });
    }
  }

  return results;
}

// ─── Step 5: Classification engine ───────────────────────────────────────────
// Returns an ARRAY of annotation objects (most text boxes yield 1, but
// multi-amendment boxes like "แก้ไข 1/2566 แก้ไข 2/2568" yield multiple).
function classifyTextBox(text, fromRow, toRow, fromCol, toCol) {
  // ── Type A: Form Index — "แบบ ผ.XX" at header rows (typically row 0-3)
  const formMatch = text.match(/แบบ\s*(ผ\.\d+(?:\/\d+)?)/i);
  if (formMatch && fromRow <= 3) {
    return [{ type: "form_index", formType: formMatch[1] }];
  }

  // ── Type A variant: "บัญชีโครงการพัฒนาท้องถิ่น" header label
  if (
    /บัญชีโครงการพัฒนาท้องถิ่น/.test(text) &&
    fromRow <= 3 &&
    !/(แก้ไข|เปลี่ยนแปลง|เพิ่มเติม)/.test(text)
  ) {
    return [{ type: "form_index", formType: null, formTitle: text }];
  }

  // ── Type D: Budget source (check early — no amendment keywords)
  if (/พอช\.|ท้องถิ่น.*สมทบ|ประชาชนสมทบ/.test(text)) {
    return [{ type: "budget_source", fundingSource: text }];
  }

  // ── Type E: Status note — compilation / progress
  if (/รวมเล่ม|เรียบร้อย/.test(text)) {
    return [{ type: "status_note" }];
  }

  // ── Type F: Cover metadata — document titles, meeting dates, authoring dept
  if (
    /แผนพัฒนาท้องถิ่น|แผนการดำเนินงาน|ทบทวน|เทศบาล|กองวิชาการ|ฝ่ายแผนงาน|คณะกรรมการ|การประชุม/.test(text) &&
    fromRow >= 5
  ) {
    return [{ type: "cover_metadata" }];
  }

  // ── Type C: Standalone transfer / cross-ref (no amendment keyword)
  // Transfer — "ย้ายไปแผนงาน..."
  const pureTransferMatch = text.match(/^ย้ายไป(แผนงาน\S+)$/);
  if (pureTransferMatch) {
    return [{ type: "transfer", targetPlan: pureTransferMatch[1] }];
  }
  // Cross-ref — "ไปประสาน 02/2"
  const pureCoordMatch = text.match(/^ไปประสาน\s*(\S+)$/);
  if (pureCoordMatch) {
    return [{ type: "transfer", targetRef: pureCoordMatch[1] }];
  }
  // Merge — "รวมกับลำดับที่ N"
  const pureMergeMatch = text.match(/^รวม(?:กับ)?ลำดับที่\s*(\d+)$/);
  if (pureMergeMatch) {
    return [{ type: "merge", targetRef: "ลำดับที่ " + pureMergeMatch[1] }];
  }
  // Duplicate — "ซ้ำลำดับที่ N"
  const pureDupMatch = text.match(/^ซ้ำลำดับที่\s*(\d+)$/);
  if (pureDupMatch) {
    return [{ type: "duplicate", targetRef: "ลำดับที่ " + pureDupMatch[1] }];
  }
  // Plan reference (standalone) — "แผนงานXXX"
  const planRefMatch = text.match(/^(แผนงาน\S+)$/);
  if (planRefMatch) {
    return [{ type: "transfer", targetPlan: planRefMatch[1] }];
  }

  // ── Types B: Amendment / Change / Addition
  // A single text box may record MULTIPLE amendment events separated by spaces.
  // We extract ALL occurrences, not just the first one.
  const results = parseAllAmendments(text);
  if (results.length > 0) return results;

  // Fallback: unclassified
  return [{ type: "unclassified" }];
}

// ─── Parse ALL amendment events in a text box ─────────────────────────────────
// Handles patterns:
//   "แก้ไข ครั้งที่ X / YYYY"
//   "แก้ไข X/YYYY"
//   "แก้ไข ครั้งที่ X ประจำปี พ.ศ. YYYY"
//   "เปลี่ยนแปลง ครั้งที่ X / YYYY"
//   "เพิ่มเติม ครั้งที่ X / YYYY"
// Multiple events may appear in the same text box (all are captured).
function parseAllAmendments(text) {
  const results = [];

  // Extract a plan-name prefix if it appears before any amendment keyword
  // e.g. "แผนงานสาธารณสุข แก้ไข ครั้งที่ 4 / 2567"
  const planPrefixMatch = text.match(/^([^แ]*?แผนงาน[^\s]+)\s+(?=แก้ไข|เปลี่ยนแปลง|เพิ่มเติม|เปลี่ยน)/);
  const sourcePlan = planPrefixMatch ? planPrefixMatch[1].trim() : null;

  // Regex: keyword + optional ครั้งที่ + number + separator + 4-digit year
  const amendRe =
    /(แก้ไข|เปลี่ยนแปลง|เปลี่ยน|เพิ่มเติม)\s*(?:ครั้งที่\s*)?(\d+)\s*(?:\/|ประจ[ํา]*ปี\s*(?:พ\.?ศ\.?)?\s*)\s*(\d{4})/g;

  let m;
  while ((m = amendRe.exec(text)) !== null) {
    const keyword = m[1];
    const num = parseInt(m[2], 10);
    const year = parseInt(m[3], 10);

    let type = "amendment";
    let amendmentType = "แก้ไข";
    if (keyword === "เปลี่ยนแปลง" || keyword === "เปลี่ยน") {
      type = "change";
      amendmentType = "เปลี่ยนแปลง";
    } else if (keyword === "เพิ่มเติม") {
      type = "addition";
      amendmentType = "เพิ่มเติม";
    }

    const entry = {
      type,
      amendmentType,
      amendmentNumber: num,
      amendmentYear: year,
    };

    // Attach source plan if found
    if (sourcePlan) entry.sourcePlan = sourcePlan;

    // Extract cross-refs embedded in the full text
    const extra = extractCrossRef(text);
    Object.assign(entry, extra);

    results.push(entry);
  }

  return results;
}

// ─── Helper: extract cross-reference info embedded within amendment text ──────
function extractCrossRef(text) {
  const extra = {};

  // "ย้ายไปแผนงาน..."
  const transferM = text.match(/ย้ายไป(แผนงาน[^\s,]+)/);
  if (transferM) extra.targetPlan = transferM[1];

  // "ไปประสาน 02/2"
  const coordM = text.match(/ไปประสาน\s*([\w./]+)/);
  if (coordM) extra.targetRef = coordM[1];

  // "ซ้ำลำดับที่ N"
  const dupM = text.match(/ซ้ำลำดับที่\s*(\d+)/);
  if (dupM) extra.targetRef = "ลำดับที่ " + dupM[1];

  // "รวมกับลำดับที่ N"
  const mergeM = text.match(/รวม(?:กับ)?ลำดับที่\s*(\d+)/);
  if (mergeM) extra.targetRef = "ลำดับที่ " + mergeM[1];

  return Object.keys(extra).length > 0 ? extra : {};
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const rIdToFile = buildRIdToSheetFile();
const rIdToName = buildRIdToSheetName();
const sheetToDrawing = buildSheetToDrawing();

// Build sheet number → sheet name lookup
const sheetNumToName = {};
for (const [rId, sheetName] of Object.entries(rIdToName)) {
  const filePath = rIdToFile[rId];
  if (!filePath) continue;
  const numMatch = filePath.match(/sheet(\d+)\.xml/);
  if (numMatch) {
    sheetNumToName[parseInt(numMatch[1], 10)] = sheetName;
  }
}

// ─── Process all drawings ────────────────────────────────────────────────────
const allSheets = [];
let totalTextBoxes = 0;
const typeCounts = {};

let report = "";
function log(s = "") {
  report += s + "\n";
}

log("=".repeat(100));
log(`TEXT BOX / DRAWING OBJECT EXTRACTION: ${path.basename(SRC)}`);
log(`Extraction date: ${new Date().toISOString()}`);
log("=".repeat(100));

// Sort sheet numbers
const sheetNums = Object.keys(sheetToDrawing)
  .map(Number)
  .sort((a, b) => a - b);

for (const sheetNum of sheetNums) {
  const drawingFile = sheetToDrawing[sheetNum];
  const sheetName = sheetNumToName[sheetNum] || `(unknown sheet ${sheetNum})`;

  const textBoxes = parseDrawing(drawingFile);

  if (textBoxes.length === 0) continue;

  totalTextBoxes += textBoxes.length;
  for (const tb of textBoxes) {
    typeCounts[tb.type] = (typeCounts[tb.type] || 0) + 1;
  }

  const sheetData = {
    sheetName,
    sheetIndex: sheetNum,
    drawingFile,
    textBoxes,
  };
  allSheets.push(sheetData);

  // ─── Human-readable report ───────────────────────────────────────────
  log("");
  log("─".repeat(80));
  log(
    `SHEET ${sheetNum}: "${sheetName}"   Drawing: ${drawingFile}   TextBoxes: ${textBoxes.length}`
  );
  log("─".repeat(80));

  // Group entries by rawText to avoid printing the same text multiple times
  const seenRaw = new Set();
  for (const tb of textBoxes) {
    const rowRange =
      tb.fromRow === tb.toRow
        ? `Row ${tb.fromRow}`
        : `Row ${tb.fromRow}-${tb.toRow}`;
    const colRange =
      tb.fromCol === tb.toCol
        ? `Col ${tb.fromCol}`
        : `Col ${tb.fromCol}-${tb.toCol}`;
    const typeTag = `[${tb.type.toUpperCase()}]`;
    const rawKey = `${tb.fromRow}:${tb.fromCol}:${tb.rawText}:${tb.type}:${tb.amendmentNumber || ''}/${tb.amendmentYear || ''}`;

    // Skip exact duplicates in the report (same raw + type + position already logged)
    if (seenRaw.has(rawKey)) continue;
    seenRaw.add(rawKey);

    let detail = `  ${rowRange}  ${colRange}  ${typeTag}  "${tb.rawText}"`;

    if (tb.formType) detail += `  → form=${tb.formType}`;
    if (tb.amendmentType)
      detail += `  → ${tb.amendmentType} #${tb.amendmentNumber}/${tb.amendmentYear}`;
    if (tb.sourcePlan) detail += `  → sourcePlan=${tb.sourcePlan}`;
    if (tb.targetPlan) detail += `  → target=${tb.targetPlan}`;
    if (tb.targetRef) detail += `  → ref=${tb.targetRef}`;
    if (tb.fundingSource) detail += `  → funding=${tb.fundingSource}`;

    log(detail);
  }
}

// ─── Summary ─────────────────────────────────────────────────────────────────
log("");
log("=".repeat(100));
log("SUMMARY");
log("=".repeat(100));
log(`Total sheets with drawings: ${allSheets.length}`);
log(`Total text boxes extracted: ${totalTextBoxes}`);
log("");
log("By type:");
for (const [type, count] of Object.entries(typeCounts).sort(
  (a, b) => b[1] - a[1]
)) {
  log(`  ${type.padEnd(20)} ${count}`);
}

// ─── Output JSON ─────────────────────────────────────────────────────────────
const outputData = {
  sourceFile: path.basename(SRC),
  extractedAt: new Date().toISOString(),
  totalSheets: allSheets.length,
  totalTextBoxes,
  typeCounts,
  sheets: allSheets,
};

const jsonPath = path.join(__dirname, "textbox-data.json");
const reportPath = path.join(__dirname, "textbox-report.txt");

fs.writeFileSync(jsonPath, JSON.stringify(outputData, null, 2), "utf8");
fs.writeFileSync(reportPath, report, "utf8");

console.log(`Done. Extracted ${totalTextBoxes} text boxes from ${allSheets.length} sheets.`);
console.log(`  → ${jsonPath}`);
console.log(`  → ${reportPath}`);
console.log("");
console.log("Type distribution:");
for (const [type, count] of Object.entries(typeCounts).sort(
  (a, b) => b[1] - a[1]
)) {
  console.log(`  ${type.padEnd(20)} ${count}`);
}
