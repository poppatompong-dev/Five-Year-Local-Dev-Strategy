/**
 * Textbox Lookup Module
 *
 * Loads textbox-data.json and provides a fast lookup interface:
 *   getAnnotationsForRow(sheetName, row)  → TextBoxAnnotation[]
 *   getFormType(sheetName)                → string | null
 *   getAllSheetMeta()                     → SheetMeta[]
 *
 * Used by the import pipeline to attach text box annotations to project rows
 * during the extraction stage.
 */
const fs = require("fs");
const path = require("path");

const DEFAULT_PATH = path.join(__dirname, "..", "textbox-data.json");

/**
 * Build the lookup from textbox-data.json.
 * @param {string} [jsonPath] - Path to textbox-data.json (defaults to scripts/textbox-data.json)
 * @returns {{ getAnnotationsForRow, getFormType, getAllSheetMeta, getDocumentMeta, stats }}
 */
function buildTextboxLookup(jsonPath) {
  const filePath = jsonPath || DEFAULT_PATH;
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `textbox-data.json not found at ${filePath}. Run extract-textboxes.cjs first.`
    );
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

  // ─── Build Map<sheetName, Map<row, Annotation[]>> ──────────────────────
  // Row key is the fromRow (0-indexed). Annotations with row spans are
  // indexed at every row in [fromRow, toRow].
  const sheetRowMap = new Map();

  // ─── Build Map<sheetName, { formType, formTitle }> ─────────────────────
  const sheetFormMap = new Map();

  // ─── Collect document metadata ─────────────────────────────────────────
  const documentMeta = [];

  for (const sheet of data.sheets) {
    const rowMap = new Map();
    // Track (row, dedup-key) pairs to avoid duplicate annotations on the same row
    const seen = new Set();

    for (const tb of sheet.textBoxes) {
      // Index form type per sheet
      if (tb.type === "form_index") {
        sheetFormMap.set(sheet.sheetName, {
          formType: tb.formType || null,
          formTitle: tb.formTitle || null,
        });
      }

      // Collect document metadata
      if (tb.type === "cover_metadata") {
        documentMeta.push({
          sheetName: sheet.sheetName,
          row: tb.fromRow,
          text: tb.rawText,
        });
      }

      // ANCHOR RULE: index only at fromRow (the visual anchor of the textbox).
      // Using every row in [fromRow, toRow] caused the same annotation to
      // attach to every project that happened to share a row with the span,
      // producing duplicate/incorrect annotations (e.g. budget_source × 6).
      // The fromRow is always the topmost cell the textbox visually points to.
      const anchorRow = tb.fromRow;

      // Build a dedup key: same position + same semantic meaning = skip
      const dedupKey = `${anchorRow}:${tb.fromCol}:${tb.type}:${tb.amendmentNumber || ""}:${tb.amendmentYear || ""}:${tb.rawText.slice(0, 40)}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      if (!rowMap.has(anchorRow)) rowMap.set(anchorRow, []);
      rowMap.get(anchorRow).push({
        type: tb.type,
        rawText: tb.rawText,
        fromRow: tb.fromRow,
        toRow: tb.toRow,
        fromCol: tb.fromCol,
        toCol: tb.toCol,
        amendmentType: tb.amendmentType || null,
        amendmentNumber: tb.amendmentNumber || null,
        amendmentYear: tb.amendmentYear || null,
        sourcePlan: tb.sourcePlan || null,
        targetPlan: tb.targetPlan || null,
        targetRef: tb.targetRef || null,
        fundingSource: tb.fundingSource || null,
        formType: tb.formType || null,
      });
    }

    sheetRowMap.set(sheet.sheetName, rowMap);
  }

  /**
   * Get all text box annotations anchored to a specific row on a sheet.
   * @param {string} sheetName
   * @param {number} row - 0-indexed row number
   * @returns {object[]} Array of annotation objects (empty if none)
   */
  function getAnnotationsForRow(sheetName, row) {
    const rowMap = sheetRowMap.get(sheetName);
    if (!rowMap) return [];
    return rowMap.get(row) || [];
  }

  /**
   * Get the official form type for a sheet (from form_index text box).
   * @param {string} sheetName
   * @returns {{ formType: string|null, formTitle: string|null } | null}
   */
  function getFormType(sheetName) {
    return sheetFormMap.get(sheetName) || null;
  }

  /**
   * Get all sheet metadata entries.
   * @returns {Array<{ sheetName: string, sheetIndex: number, formType: string|null, formTitle: string|null }>}
   */
  function getAllSheetMeta() {
    return data.sheets.map((s) => ({
      sheetName: s.sheetName,
      sheetIndex: s.sheetIndex,
      drawingFile: s.drawingFile,
      textBoxCount: s.textBoxes.length,
      ...(sheetFormMap.get(s.sheetName) || { formType: null, formTitle: null }),
    }));
  }

  /**
   * Get document metadata extracted from cover page text boxes.
   * @returns {Array<{ sheetName: string, row: number, text: string }>}
   */
  function getDocumentMeta() {
    return documentMeta;
  }

  return {
    getAnnotationsForRow,
    getFormType,
    getAllSheetMeta,
    getDocumentMeta,
    stats: {
      totalSheets: data.totalSheets,
      totalTextBoxes: data.totalTextBoxes,
      typeCounts: data.typeCounts,
    },
  };
}

module.exports = { buildTextboxLookup };
