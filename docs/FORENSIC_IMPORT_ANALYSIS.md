# Forensic Import & Mapping Analysis

## แผนพัฒนาท้องถิ่น (พ.ศ.2566–2570) — เทศบาลนครนครสวรรค์

**Source Workbook**: `ส่วนที่ 3.2  แผนพัฒนาท้องถิ่น 5 ปี 66-70  20 10 64.xlsx`
**Analysis Date**: 2025-06
**Document Version**: 1.0
**Status**: Production-grade forensic analysis for import pipeline design

---

## Table of Contents

- [Phase 1: Full Workbook Forensic Inspection](#phase-1-full-workbook-forensic-inspection) *(includes §1.4 Text Box / Drawing Object Inventory)*
- [Phase 2: Structural Interpretation](#phase-2-structural-interpretation)
- [Phase 3: Cross-Sheet Reconciliation](#phase-3-cross-sheet-reconciliation)
- [Phase 4: Source-to-Target Mapping Specification](#phase-4-source-to-target-mapping-specification)
- [Phase 5: Import Risk Analysis](#phase-5-import-risk-analysis)
- [Phase 6: Production-Grade Import Architecture](#phase-6-production-grade-import-architecture)
- [Phase 7: Intelligent Executive Reporting Module](#phase-7-intelligent-executive-reporting-module)
- [Phase 8: Reporting Design Requirements](#phase-8-reporting-design-requirements)

---

## Phase 1: Full Workbook Forensic Inspection

### 1.1 Workbook Overview

| Attribute | Value |
|-----------|-------|
| Total sheets | **47** |
| Non-empty sheets | **42** (5 are empty: กราฟ, Sheet2, Sheet2 (2) + 2 stub sheets) |
| Total data rows (est.) | **~5,200** across all sheets |
| Merge regions | **~560** total across all sheets |
| Fiscal years covered | **2566–2570** (พ.ศ.) |
| Entity | เทศบาลนครนครสวรรค์ (Nakhon Sawan City Municipality) |
| Plan revision | ทบทวน ครั้งที่ 2/2565 |

### 1.2 Complete Sheet Inventory

Sheets are classified into **7 functional categories**:

#### Category A: Strategy Cross-Reference (1 sheet)

| # | Sheet Name | Rows | Cols | Merges | Purpose |
|---|-----------|------|------|--------|---------|
| 2 | แผนงาน | 31 | 10 | 40 | Maps 6 national strategies → provincial strategies → municipal strategies → tactics → plans → departments |

**Key finding**: This sheet is the **master hierarchy map**. Row 4 = header, Rows 5–30 = 6 strategy entries with deeply merged cells. Row 31 = totals (6 strategies, 9 SDG goals, 18 tactics, 10 plans, 6 departments). Multi-line values within cells (newline-separated plan names within single cells).

#### Category B: Summary Reports (2 sheets)

| # | Sheet Name | Rows | Cols | Merges | Purpose |
|---|-----------|------|------|--------|---------|
| 3 | ผ.01 สรุป | 84 | 13 | 10 | Master budget summary by strategy/tactic/plan × 5 fiscal years |
| 4 | ผ.01 .1 สรุป ชุมชน | 74 | 14 | 11 | Community-level summary: 67 communities × 5 fiscal years |

**Key findings**:
- **ผ.01 สรุป** contains 3 sub-sections within one sheet: (1) ผ.01 rows 1–62 main project summary, (2) ผ.02/1 rows 64–70 provincial coordination summary, (3) ผ.03 rows 75–84 equipment summary.
- Grand totals visible: **1,186 projects** / **฿2,847,165,072** across 5 years (main plan); **60 projects** / **฿3,489,999,000** provincial coordination; equipment totals also present.
- **ผ.01 .1 สรุป ชุมชน**: 67 communities, each with 3 projects/year × 5 years = 15 projects each, ฿20,000/project. Grand total: **1,005 projects** / **฿6,700,000**.

#### Category C: Project Detail Sheets (33 sheets)

These are the **core data sheets** containing individual project records organized by Strategy.Tactic → Plan:

| # | Sheet Name | Rows | Cols | Layout | Strategy.Tactic | Plan |
|---|-----------|------|------|--------|-----------------|------|
| 5 | ยุทธ1.1แผนงานสาธารณสุข | 46 | 17 | 17-col | 1.1 | สาธารณสุข |
| 6 | ยุทธ1.2แผนงานการพาณิชย์ | 21 | 17 | 17-col | 1.1 (sic: 1.2) | การพาณิชย์ |
| 7 | ยุทธ1.2แผนงานการศาสนาวัฒนธรรม | 19 | 17 | 17-col | 1.2 | ศาสนาวัฒนธรรม |
| 8 | ยุทธ1.2แผนงานสร้างความเข้มแข็งข | 26 | 17 | 17-col | 1.2 | สร้างความเข้มแข็ง |
| 9 | ยุทธ1.3แผนงานเคหะชุมชน | 38 | 12 | 12-col | 1.3 | เคหะชุมชน |
| 10 | ยุทธ1.3แผนงานบริหารงานทั่วไป | 33 | 17 | 17-col | 1.3 | บริหารงานทั่วไป |
| 11 | ยุทธ2.1แผนงานการศึกษา | 141 | 17 | 17-col | 2.1 | การศึกษา |
| 12 | ยุทธ2.2แผนงานศาสนาวัฒนธรรม | 40 | 17 | 17-col | 2.2 | ศาสนาวัฒนธรรม |
| 13 | ยุทธ2.2แผนงานการศึกษา | 18 | 12 | 12-col | 2.2 | การศึกษา |
| 14 | ยุทธ2.3แผนงานศาสนา | 39 | 17 | 17-col | 2.3 | ศาสนา |
| 15 | ยุทธ2.3แผนงานบริหารงานทั่วไป | 34 | 17 | 17-col | 2.3 | บริหารงานทั่วไป |
| 16 | ยุทธ3.2แผนงานสร้างความเข้มแข็งช | 57 | 17 | 17-col | 3.2 | สร้างความเข้มแข็ง |
| 17 | ยุทธ3.3แผนงานสังคมสงเคราะห์ | 31 | 12 | 12-col | 3.3 | สังคมสงเคราะห์ |
| 18 | ยุทธ4.1ผง.อุตสาหกรรมและการโยธา | 150 | 17 | 17-col | 4.1 | อุตสาหกรรมและการโยธา |
| 19 | ยุทธ4.2 บริหารทั่วไป | 19 | 12 | 12-col | 4.2 | บริหารทั่วไป |
| 20 | ยุทธ4.3ผง.การพาณิชย์ | 75 | 17 | 17-col | 4.3 | การพาณิชย์ |
| 21 | ยุทธ5.1ผง.บริหารงานทั่วไป | 41 | 17 | 17-col | 5.1 | บริหารงานทั่วไป |
| 22 | ยุทธ5.2ผง.การรักษาความสงบ | 36 | 13 | 13-col | 5.2 | รักษาความสงบ |
| 23 | ยุทธ6.2ผง.บริหารงานทั่วไป | **422** | 17 | 17-col | 6.2 | บริหารงานทั่วไป |
| 24 | ยุทธ6.2ผง.การพานิชย์ | 22 | 17 | 17-col | 6.2 | การพาณิชย์ |
| 25 | ยุทธ6.2ผง.การศึกษา | **401** | 17 | 17-col | 6.2 | การศึกษา |
| 26 | ยุทธ6.3ผง.อุตสาหกรรมและโยธา | 18 | 17 | 17-col | 6.3 | อุตสาหกรรมและโยธา |
| 27 | ยุทธ6.3ผง.บริหารงานทั่วไป | **400** | 12 | 12-col | 6.3 | บริหารงานทั่วไป |
| 28 | ยุทธ6.3ผง.การศึกษา | **403** | 12 | 12-col | 6.3 | การศึกษา |
| 29 | ยุทธ6.4ผง.การศึกษา | 91 | 12 | 12-col | 6.4 | การศึกษา |
| 30 | ยุทธ6.5ผง.สังคมสงเคราะห์ | 20 | 17 | 17-col | 6.5 | สังคมสงเคราะห์ |
| 31 | ยุทธ6.6ผง.สาธารณสุข | **404** | 12 | 12-col | 6.6 | สาธารณสุข |
| 32 | ยุทธ6.7ผง.ศาสานา | **404** | 12 | 12-col | 6.7 | ศาสนา |
| 33 | ยุทธ6.3ผง.การพานิชย์ | 21 | 17 | 17-col | 6.3 | การพาณิชย์ |
| 34 | ยุทธ6.3ผง.การศึกษา (2) | 27 | 12 | 12-col | 6.3 | การศึกษา (dup) |
| 35 | ยุทธ6.3ผง.บริหาร | 21 | 12 | 12-col | 6.3 | บริหาร |
| 36 | ยุทธ6.3ผง.สาธา | **400** | 12 | 12-col | 6.3 | สาธารณสุข |
| 37 | ยุทธ6.3ผง.อุตสาหกรรมและการโยธา | **401** | 12 | 12-col | 6.3 | อุตสาหกรรมและการโยธา |

#### Category D: Community-Level Project Sheets (3 sheets)

| # | Sheet Name | Rows | Cols | Merges | Purpose |
|---|-----------|------|------|--------|---------|
| 38 | 02.1 แผนงานสร้างความเข้มแข็งข | 237 | 12 | 11 | Community strengthening projects (67 communities) |
| 45 | 02.1 แผนงานสร้างความเข้มแข็ (2) | 208 | 12 | 0 | Likely a working copy / earlier version |
| 47 | แผนชุมชน | 24 | 17 | 11 | Community plan template |

#### Category E: Provincial Coordination (2 sheets)

| # | Sheet Name | Rows | Cols | Merges | Purpose |
|---|-----------|------|------|--------|---------|
| 39 | ผ.02.2 ประสาน จว | 71 | 28 | 12 | Provincial coordination projects (wide layout) |
| 40 | ผ.02.2 ประสาน จว (2) | 45 | 19 | 12 | Subset or alternate version |

#### Category F: Equipment/Procurement (2 sheets)

| # | Sheet Name | Rows | Cols | Merges | Purpose |
|---|-----------|------|------|--------|---------|
| 41 | ผ.08 ครุภัณฑ์ | 391 | 11 | 4 | Equipment detail: item-level list with 5-year budgets |
| 42 | สรุปครุภัณฑ์ | 439 | 11 | 0 | Equipment summary pivot (mostly empty — only rows 3–12 have data) |

#### Category G: Empty / Chart Sheets (4 sheets)

| # | Sheet Name | Purpose |
|---|-----------|---------|
| 1 | กราฟ | Chart placeholder (empty data range) |
| 43 | Sheet2 | Empty |
| 44 | Sheet2 (2) | Empty |
| 46 | สรุปชุมชน | Community summary (71 rows, 11 cols, no merges) |

### 1.3 Critical Structural Observations

1. **Two distinct column layouts** across detail sheets:
   - **17-column layout** (cols A–Q): Includes both `งบประมาณ` (plan budget) cols E–I AND `เทศบัญญัติ` (municipal ordinance budget) cols M–Q
   - **12-column layout** (cols A–L): Only plan budget cols E–I, no ordinance budget section

2. **Multi-row headers** (3 rows): All detail sheets use rows 12–14 as a 3-tier header:
   - Row 12: Top-level column groups (merged cells for budget year groups)
   - Row 13: Sub-labels ("ผลผลิตของโครงการ", fiscal year numbers 2566–2570)
   - Row 14: Units ("(บาท)")

3. **Metadata preamble** (rows 1–11): Every detail sheet has 11 rows of context before the data table:
   - Row 1: "รายละเอียดโครงการพัฒนา" (form title)
   - Row 2: "แผนพัฒนาท้องถิ่น (พ.ศ.2566 - 2570) ทบทวน ครั้งที่ 2/2565"
   - Row 3: "เทศบาลนครนครสวรรค์"
   - Rows 4–8: Strategy hierarchy references (ก–จ labels)
   - Row 9: Municipal strategy name + number
   - Row 10: Tactic name + code
   - Row 11: Plan number + name

4. **Plan amendment markers**: Several sheets contain **in-band amendment annotations**:
   - "ทบทวน ครั้งที่ 3/2565" — revision markers
   - "เพิ่มเติมครั้งที่ 5 / 2567" — supplemental addition markers
   - "เพิ่มเติมครั้งที่ 3 / 2568"
   - These appear as rows with text in column B and null elsewhere, acting as **section dividers** within the data.

5. **Number resets at amendment boundaries**: Project numbering (col A) resets to 1 after each amendment marker. This means project #1 can appear multiple times within a single sheet.

6. **Very large sheets with mostly empty rows**: Several sheets (e.g., ยุทธ6.6, ยุทธ6.7) show 400+ rows but only ~10–30 data rows; the rest are blank stubs from copy-paste operations.

7. **Budget value anomalies**:
   - Mix of formatted strings (`" 1,632,820 "`) and raw numbers
   - Some cells contain `" -   "` (dash with spaces) representing zero/not-applicable
   - Some cells are `undefined` (truly empty — no budget allocated that year)
   - Occasional `.00` suffix inconsistency (e.g., `10,500,000.00` vs `500,000`)

8. **Multi-line cell values**: Department names, objectives, and targets frequently contain newlines within a single cell (e.g., "สำนักสาธารณสุขฯ\nงานบริการรักษาความสะอาด").

### 1.4 Text Box / Drawing Object Inventory

**SheetJS does NOT extract drawing objects.** Text boxes in Excel are stored as OOXML `<xdr:twoCellAnchor>` elements within `xl/drawings/drawingN.xml` inside the .xlsx ZIP package. A dedicated extractor (`scripts/extract-textboxes.cjs`) reads these directly.

**Results**: **43 drawing XML files** contain **212 text box annotations** across **42 sheets**.

#### Annotation Type Classification

| Type | Code | Count | Description | Example |
|------|------|-------|-------------|---------|
| Form Index | `form_index` | 40 | Header text boxes identifying official form type | "แบบ ผ.02", "2. บัญชีโครงการพัฒนาท้องถิ่น" |
| Amendment | `amendment` | 122 | Row-anchored แก้ไข ครั้งที่ X / YYYY markers | "แก้ไข ครั้งที่ 2 / 2568" at Row 18 |
| Change | `change` | 30 | Row-anchored เปลี่ยนแปลง ครั้งที่ X / YYYY | "เปลี่ยนแปลง ครั้งที่ 3 / 2567" at Row 31 |
| Addition | `addition` | 1 | Row-anchored เพิ่มเติม ครั้งที่ X / YYYY | "เพิ่มเติม ครั้งที่ 2 / 2568" at Row 19 |
| Cover Metadata | `cover_metadata` | 12 | Document titles, meeting dates, authoring dept | "ทบทวนครั้งที่ 1/2566" on Sheet2 |
| Budget Source | `budget_source` | 6 | External co-funding source annotations | "พอช.,ท้องถิ่น, ประชาชนสมทบ" |
| Status Note | `status_note` | 1 | Compilation/progress notes | "รวมเล่มถึง ปี 68 เรียบร้อย" |

#### Why Text Box Data Is Critical

1. **Amendment annotations are row-anchored** — they identify which *specific project row* was affected by which amendment, which is more precise than cell-level AMENDMENT_MARKER rows (which are section dividers only).

2. **Cross-references embedded in amendments** reveal project transfers and merges:
   - "ย้ายไปแผนงานอุตสาหกรรม" → project moved to another plan (prevents phantom duplicates)
   - "ซ้ำลำดับที่ 63" → project is a duplicate of item #63
   - "รวมกับลำดับที่ 2" → project merged with item #2
   - "ไปประสาน 02/2" → transferred to provincial coordination form

3. **Budget source annotations** (Type D) indicate external co-funding not captured in cell data:
   - "พอช.,ท้องถิ่น, ประชาชนสมทบ" = CODI + local gov + public co-funding

4. **Form index annotations** (Type A) provide the official form classification per sheet:
   - `ผ.01` = Summary reports
   - `ผ.02` = Project detail
   - `ผ.02/1` = Community projects
   - `ผ.02/2` = Provincial coordination
   - `ผ.03` = Equipment/procurement

#### Form Type Distribution by Sheet Category

| Form Type | Sheet Category | Sheet Count |
|-----------|---------------|-------------|
| ผ.01 | B: Summary Reports | 2 |
| ผ.02 | C: Project Detail | 33 |
| ผ.02/1 | D: Community | 2 |
| ผ.02/2 | E: Provincial Coordination | 2 |
| ผ.03 | F: Equipment | 1 |

#### Extraction Architecture

```
.xlsx (ZIP archive)
├── xl/workbook.xml                    → sheet names + rId mapping
├── xl/_rels/workbook.xml.rels         → rId → sheetN.xml
├── xl/worksheets/_rels/sheetN.xml.rels → sheetN → drawingN.xml
└── xl/drawings/drawingN.xml           → <xdr:twoCellAnchor> + <a:t> text
```

- **Tool**: `scripts/extract-textboxes.cjs` (uses `adm-zip` for ZIP reading)
- **Output**: `scripts/textbox-data.json` (machine-readable) + `scripts/textbox-report.txt` (human-readable)
- **Row indexing**: 0-based (matches SheetJS convention), so text box anchored at Row 33 corresponds to Excel row 34

---

## Phase 2: Structural Interpretation

### 2.1 Data Hierarchy Discovered in Workbook

```
เทศบาลนครนครสวรรค์ (Municipality)
├── 6 Strategies (ยุทธศาสตร์)
│   ├── Strategy 1: ด้านการสาธารณสุขและสิ่งแวดล้อม
│   │   ├── Tactic 1.1: ส่งเสริมสนับสนุนให้เด็ก เยาวชน และประชาชน...
│   │   ├── Tactic 1.2: เพิ่มความรู้ความเข้าใจ และปลูกฝังจิตสำนึก...
│   │   └── Tactic 1.3: ส่งเสริม พัฒนา สร้างจิตสำนึกในการดูแล...
│   ├── Strategy 2: ด้านการศึกษา ศาสนา วัฒนธรรมและนันทนาการ
│   │   ├── Tactic 2.1: พัฒนาระบบการบริหารจัดการศึกษา...
│   │   ├── Tactic 2.2: ส่งเสริมและพัฒนากีฬา นันทนาการ...
│   │   └── Tactic 2.3: การอนุรักษ์และส่งเสริมศิลปวัฒนธรรม...
│   ├── Strategy 3: ด้านสวัสดิการสังคมและชุมชน
│   │   ├── Tactic 3.2: เสริมสร้างความเข้มแข็งให้กับชุมชน
│   │   └── Tactic 3.3: จัดสวัสดิการให้กับประชาชนอย่างเสมอภาค...
│   ├── Strategy 4: พัฒนากายภาพเมือง
│   │   ├── Tactic 4.1: พัฒนาระบบคมนาคม การจราจรและขนส่ง...
│   │   ├── Tactic 4.2: ปรับปรุงภูมิทัศน์พัฒนาแหล่งท่องเที่ยว...
│   │   └── Tactic 4.3: ปรับปรุงและเพิ่มประสิทธิภาพ การขยายระบบประปา...
│   ├── Strategy 5: ด้านการรักษาความสงบเรียบร้อยและความมั่นคง
│   │   ├── Tactic 5.1: พัฒนาระบบการป้องกันและบรรเทาสาธารณภัย...
│   │   └── Tactic 5.2: (แผนงานรักษาความสงบ)
│   └── Strategy 6: ด้านการบริหารจัดการที่ดี
│       ├── Tactic 6.2: พัฒนาระบบเทคโนโลยีและสารสนเทศ...
│       ├── Tactic 6.3: (multiple sub-plan sheets)
│       ├── Tactic 6.4: (การศึกษา)
│       ├── Tactic 6.5: (สังคมสงเคราะห์)
│       ├── Tactic 6.6: (สาธารณสุข)
│       └── Tactic 6.7: (ศาสนา)
├── Plans (แผนงาน) — 10 distinct plans:
│   1. แผนงานสาธารณสุข
│   2. แผนงานการพาณิชย์
│   3. แผนงานการศาสนาวัฒนธรรมและนันทนาการ
│   4. แผนงานสร้างความเข้มแข็งของชุมชน
│   5. แผนงานเคหะและชุมชน
│   6. แผนงานบริหารงานทั่วไป
│   7. แผนงานการศึกษา
│   8. แผนงานสังคมสงเคราะห์
│   9. แผนงานอุตสาหกรรมและการโยธา
│   10. แผนงานรักษาความสงบภายใน
├── Projects → Budget allocations per fiscal year (2566–2570)
└── Equipment → Budget allocations per fiscal year (2566–2570)
```

### 2.2 Row Type Classification for Detail Sheets

Every detail sheet (Category C) contains these row types:

| Row Type | Identification Rule | Example |
|----------|-------------------|---------|
| **TITLE** | Rows 1–3: merged across all columns, form identification text | "รายละเอียดโครงการพัฒนา" |
| **CONTEXT** | Rows 4–8: strategy hierarchy references, single col A text | "ก. ยุทธศาสตร์ชาติ 20 ปี..." |
| **STRATEGY_REF** | Row 9: municipal strategy number + name | "1. ยุทธศาสตร์เทศบาลนครนครสวรรค์ด้านการสาธารณสุข..." |
| **TACTIC_REF** | Row 10: indented tactic code + name | "    1.1 กลยุทธ์ส่งเสริมสนับสนุนให้เด็ก..." |
| **PLAN_REF** | Row 11: plan number in parentheses + name | "    (1) แผนงานสาธารณสุข" |
| **HEADER** | Rows 12–14: 3-tier merged column headers | ที่ / โครงการ / วัตถุประสงค์ / เป้าหมาย / งบประมาณ 2566–2570 / ตัวชี้วัด / ผลที่คาดว่าจะได้รับ / หน่วยงาน |
| **PROJECT** | Data rows after header: col A = numeric sequence, col B = project name | "1 \| กิจกรรมรณรงค์ 3Rs..." |
| **CONTINUATION** | col A = undefined, other cols have data (overflow from previous project row) | Multi-line objectives/targets |
| **AMENDMENT_MARKER** | col B = "ทบทวน..." or "เพิ่มเติม...", all other cols empty/undefined | "เพิ่มเติมครั้งที่ 5 / 2567" |
| **TEXTBOX_ANNOTATION** | *(Not in cell data)* — Extracted from OOXML `<xdr:twoCellAnchor>` drawing objects; row-anchored to specific project rows. Types: amendment, change, addition, transfer, merge, duplicate, budget_source. See §1.4. | "แก้ไข ครั้งที่ 2 / 2568" anchored to Row 18 |
| **SUMMARY_BUDGET** | col D = "รวมงบประมาณ", cols E–I = totals | Sheet-level budget totals |
| **SUMMARY_COUNT** | col D = "รวมจำนวนโครงการ", cols E–I = counts | Sheet-level project counts |
| **BLANK** | All cols undefined | Trailing blank rows |

### 2.3 Column Mapping for 17-Column Layout (Primary)

| Col | Header (Row 12) | Header (Row 13) | Header (Row 14) | DB Field | Notes |
|-----|-----------------|-----------------|-----------------|----------|-------|
| A | ที่ | — | — | (sequence #, not imported as PK) | Resets at amendment boundaries |
| B | โครงการ | — | — | `projects.name` | Project name |
| C | วัตถุประสงค์ | — | — | `projects.objective` | May be multi-line |
| D | เป้าหมาย | (ผลผลิตของโครงการ) | — | `projects.target` | May be multi-line |
| E | งบประมาณ | 2566 | (บาท) | `project_budgets.amount` WHERE year=2566 | Plan budget |
| F | — | 2567 | (บาท) | `project_budgets.amount` WHERE year=2567 | |
| G | — | 2568 | (บาท) | `project_budgets.amount` WHERE year=2568 | |
| H | — | 2569 | (บาท) | `project_budgets.amount` WHERE year=2569 | |
| I | — | 2570 | (บาท) | `project_budgets.amount` WHERE year=2570 | |
| J | ตัวชี้วัด (KPI) | — | — | `projects.kpi` | May be multi-line |
| K | ผลที่คาดว่าจะได้รับ | — | — | `projects.expected_result` | May be multi-line |
| L | หน่วยงานที่รับผิดชอบหลัก | — | — | `projects.department` | May contain multiple dept names |
| M | เทศบัญญัติ | 2566 | (บาท) | **NEW: `project_budgets.ordinance_amount`** | Municipal ordinance budget |
| N | — | 2567 | (บาท) | — | |
| O | — | 2568 | (บาท) | — | |
| P | — | 2569 | (บาท) | — | |
| Q | — | 2570 | (บาท) | — | |

### 2.4 Column Mapping for 12-Column Layout (Secondary)

Same as 17-col but **without columns M–Q** (no เทศบัญญัติ section). All other columns are identical positions A–L.

### 2.5 Equipment Sheet Column Mapping (ผ.08)

| Col | Header | DB Field | Notes |
|-----|--------|----------|-------|
| A | ที่ | (sequence #) | |
| B | แผนงาน | `equipment.plan_name` | Plan category name |
| C | หมวด | `equipment.category` | Always "ค่าครุภัณฑ์" |
| D | ประเภท | `equipment.item_type` | Equipment type category |
| E | เป้าหมาย (ผลผลิตของครุภัณฑ์) | `equipment.target` | Description + quantity |
| F | 2566 (บาท) | `equipment.budget_2566` | |
| G | 2567 (บาท) | `equipment.budget_2567` | |
| H | 2568 (บาท) | `equipment.budget_2568` | |
| I | 2569 (บาท) | `equipment.budget_2569` | |
| J | 2570 (บาท) | `equipment.budget_2570` | |
| K | หน่วยงานรับผิดชอบหลัก | `equipment.department` | |

### 2.6 Uncertainty Classification

| Field | Confidence | Issue |
|-------|-----------|-------|
| Strategy identification | **HIGH** | Directly stated in sheet preamble (row 9) and sheet name |
| Tactic identification | **HIGH** | Stated in row 10 of each sheet |
| Plan identification | **HIGH** | Stated in row 11 of each sheet |
| Project name | **HIGH** | Col B, clear text |
| Budget amounts | **MEDIUM** | Mix of formatted strings, dashes, empty = need parsing rules |
| Department | **MEDIUM** | Multi-line cells with sub-department names, inconsistent naming |
| Amendment version | **MEDIUM** | Markers exist but not always consistent format |
| Ordinance budget | **LOW** | Many sheets use 12-col layout (missing entirely); even in 17-col, often all undefined |
| Project uniqueness | **LOW** | Same project name can appear in different amendments within same sheet |

---

## Phase 3: Cross-Sheet Reconciliation

### 3.1 Summary ↔ Detail Reconciliation Points

The **ผ.01 สรุป** sheet provides expected totals that must be verified against detail sheet sums:

| Strategy | Expected Projects (5yr) | Expected Budget (5yr ฿) | Detail Sheets |
|----------|------------------------|--------------------------|---------------|
| 1) สาธารณสุขฯ | 157 | 146,771,200 | Sheets 5–10 |
| 2) การศึกษาฯ | 423 | 1,394,434,000 | Sheets 11–15 |
| 3) สวัสดิการฯ | 129 (note: missing 3.1) | 93,590,000 | Sheets 16–17 |
| 4) กายภาพเมือง | 186 | 744,546,972 | Sheets 18–20 |
| 5) ความสงบฯ | 147 | 246,210,000 | Sheets 21–22 |
| 6) บริหารจัดการฯ | 144 | 221,612,900 | Sheets 23–37 |
| **TOTAL** | **1,186** | **2,847,165,072** | |

### 3.2 Known Discrepancies and Gaps

1. **Missing tactic 3.1**: Strategy 3 has tactics 3.2 and 3.3 but no 3.1 sheet. The summary skips from "3.2 กลยุทธ์เสริมสร้าง..." directly. This is likely intentional (no 3.1 in this municipality's plan).

2. **Strategy 6 has many sub-tactics (6.2–6.7)**: The naming suggests 6.1 is missing. Strategy 6 has an unusually large number of sheets and sub-tactics compared to the 2-3 per strategy elsewhere. Several of these large sheets (400+ rows) are mostly blank rows.

3. **Duplicate sheet names**: "ยุทธ6.3ผง.การศึกษา" and "ยุทธ6.3ผง.การศึกษา (2)" — the (2) variant has only 27 rows. Must determine if it's an amendment supplement or accidental duplicate.

4. **Community sheets have their own separate budget**: ผ.01 .1 shows 1,005 community projects / ฿6,700,000 which is **NOT** included in the 1,186 / ฿2,847M main total. These are separate community-level plans.

5. **Provincial coordination**: ผ.02.2 ประสาน จว contains projects coordinated with the provincial government (e.g., flood drainage, water supply). These have **very large budgets** (e.g., ฿1.47B for drainage alone) and are **separate** from the main total.

6. **Equipment**: ผ.08 ครุภัณฑ์ contains 391 rows of equipment items, with its own budget totals also appearing in ผ.01 สรุป rows 75–84. The สรุปครุภัณฑ์ sheet provides a summary pivot.

### 3.3 Cross-Sheet Data Flow

```
แผนงาน (hierarchy) ──────┐
                          ▼
ผ.01 สรุป (totals) ◄── ยุทธX.X sheets (project detail) ──► project_budgets
                          │
                          ├── ผ.02.2 ประสาน จว (provincial coordination)
                          │
                          ├── 02.1 แผนงานสร้างความเข้มแข็ง (community projects)
                          │
                          └── ผ.08 ครุภัณฑ์ (equipment) ──► equipment table
```

---

## Phase 4: Source-to-Target Mapping Specification

### 4.1 Target Database Schema (Current)

```sql
strategies (id, name, short_name, department)
tactics (id, code, name, strategy_id)
plans (id, name, tactic_id)
projects (id, name, objective, target, kpi, expected_result, department, plan_id, status, source_sheet)
project_budgets (id, project_id, year, amount)
equipment (id, plan_name, category, item_type, target, department, budget_2566..2570)
```

### 4.2 Required Schema Changes

The actual workbook data reveals fields and relationships not captured by the current schema:

#### New columns needed:

```sql
-- Add to projects table:
ALTER TABLE projects ADD COLUMN amendment_version TEXT;       -- "ทบทวน 2/2565", "เพิ่มเติม 5/2567"
ALTER TABLE projects ADD COLUMN source_row INTEGER;          -- original Excel row number for traceability
ALTER TABLE projects ADD COLUMN import_batch_id UUID;        -- links to import_audit table

-- Add ordinance budget tracking:
ALTER TABLE project_budgets ADD COLUMN ordinance_amount NUMERIC DEFAULT 0;  -- เทศบัญญัติ budget

-- New table for import audit trail:
CREATE TABLE import_batches (
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

-- New staging table (mirror of projects but for validation):
CREATE TABLE staging_projects (
  id SERIAL PRIMARY KEY,
  batch_id UUID REFERENCES import_batches(id),
  source_sheet TEXT,
  source_row INTEGER,
  raw_data JSONB,                  -- original cell values for audit
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
  validation_status TEXT CHECK (validation_status IN ('pending','valid','warning','error')),
  validation_errors JSONB,
  committed_project_id INTEGER REFERENCES projects(id),
  textbox_annotations JSONB             -- array of text box annotations anchored to this row
);

-- New table for text box / drawing annotations (from §1.4):
CREATE TABLE project_annotations (
  id              SERIAL PRIMARY KEY,
  project_id      INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  source_sheet    TEXT NOT NULL,
  source_row      INTEGER NOT NULL,      -- 0-indexed Excel row the text box is anchored to
  annotation_type TEXT NOT NULL
    CHECK (annotation_type IN (
      'amendment','change','addition','transfer','merge',
      'duplicate','budget_source','status_note','form_index'
    )),
  raw_text        TEXT NOT NULL,         -- original text box content
  amendment_type  TEXT,                  -- แก้ไข / เปลี่ยนแปลง / เพิ่มเติม
  amendment_number INTEGER,              -- ครั้งที่ N
  amendment_year  INTEGER,               -- พ.ศ. YYYY
  target_plan     TEXT,                  -- for transfers: destination plan name
  target_ref      TEXT,                  -- for merges: "ลำดับที่ N" or form ref "02/2"
  funding_source  TEXT,                  -- for budget source: "พอช.,ท้องถิ่น,ประชาชน"
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_annotations_project ON project_annotations(project_id);
CREATE INDEX idx_annotations_type ON project_annotations(annotation_type);
CREATE INDEX idx_annotations_sheet_row ON project_annotations(source_sheet, source_row);

-- New table for per-sheet metadata (form type from text boxes + structural info):
CREATE TABLE sheet_metadata (
  id            SERIAL PRIMARY KEY,
  sheet_name    TEXT NOT NULL UNIQUE,
  sheet_index   INTEGER NOT NULL,
  form_type     TEXT,                    -- ผ.01, ผ.02, ผ.02/1, ผ.02/2, ผ.03
  form_title    TEXT,                    -- "2. บัญชีโครงการพัฒนาท้องถิ่น"
  col_layout    TEXT CHECK (col_layout IN ('17-col','12-col','summary','equipment','other')),
  row_count     INTEGER,
  strategy_num  TEXT,
  tactic_code   TEXT,
  plan_name     TEXT
);

-- New table for document-level metadata (from cover page text boxes on Sheet2):
CREATE TABLE document_metadata (
  id    SERIAL PRIMARY KEY,
  key   TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL
);
-- Example rows:
-- ('plan_name',      'แผนพัฒนาท้องถิ่น (พ.ศ.2566-2570)')
-- ('revision',       'ทบทวนครั้งที่ 1/2566')
-- ('approval_date',  '23 กุมภาพันธ์ 2566')
-- ('authoring_dept', 'กองวิชาการและแผนงาน')
```

### 4.3 Strategy Mapping (Source → Target)

**CRITICAL**: Current seed data uses **generic** strategy names. Must be replaced with **actual** names from workbook:

| Source # | Source Strategy Name (from workbook) | Target `strategies.id` | Target `strategies.name` |
|----------|--------------------------------------|------------------------|--------------------------|
| 1 | ด้านการสาธารณสุขและสิ่งแวดล้อม | 1 | ยุทธศาสตร์ด้านการสาธารณสุขและสิ่งแวดล้อม |
| 2 | ด้านการศึกษา ศาสนา วัฒนธรรมและนันทนาการ | 2 | ยุทธศาสตร์ด้านการศึกษา ศาสนา วัฒนธรรมและนันทนาการ |
| 3 | ด้านสวัสดิการสังคมและชุมชน | 3 | ยุทธศาสตร์ด้านสวัสดิการสังคมและชุมชน |
| 4 | พัฒนากายภาพเมือง | 4 | ยุทธศาสตร์พัฒนากายภาพเมือง |
| 5 | ด้านการรักษาความสงบเรียบร้อยและความมั่นคง | 5 | ยุทธศาสตร์ด้านการรักษาความสงบเรียบร้อยและความมั่นคง |
| 6 | ด้านการบริหารจัดการที่ดี | 6 | ยุทธศาสตร์ด้านการบริหารจัดการที่ดี |

### 4.4 Tactic Mapping (Source → Target)

| Code | Source Tactic Name | Strategy |
|------|-------------------|----------|
| 1.1 | ส่งเสริมสนับสนุนให้เด็ก เยาวชน และประชาชน ทุกกลุ่มวัยมีสุขภาพดี | 1 |
| 1.2 | เพิ่มความรู้ความเข้าใจ และปลูกฝังจิตสำนึกในการดูแลรักษาสิ่งแวดล้อม | 1 |
| 1.3 | ส่งเสริม พัฒนา สร้างจิตสำนึกในการดูแลรักษาสิ่งแวดล้อม | 1 |
| 2.1 | พัฒนาระบบการบริหารจัดการศึกษาและพัฒนาแหล่งการเรียนรู้ | 2 |
| 2.2 | ส่งเสริมและพัฒนากีฬา นันทนาการ กิจกรรมเด็กและเยาวชน | 2 |
| 2.3 | การอนุรักษ์และส่งเสริมศิลปวัฒนธรรม ประเพณีและภูมิปัญญาท้องถิ่น | 2 |
| 3.2 | เสริมสร้างความเข้มแข็งให้กับชุมชน | 3 |
| 3.3 | จัดสวัสดิการให้กับประชาชนอย่างเสมอภาค | 3 |
| 4.1 | พัฒนาระบบคมนาคม การจราจรและขนส่ง ติดตั้งระบบสาธารณูปโภค | 4 |
| 4.2 | ปรับปรุงภูมิทัศน์พัฒนาแหล่งท่องเที่ยว | 4 |
| 4.3 | ปรับปรุงและเพิ่มประสิทธิภาพ การขยายระบบประปา | 4 |
| 5.1 | พัฒนาระบบการป้องกันและบรรเทาสาธารณภัย | 5 |
| 5.2 | (การรักษาความสงบภายใน) | 5 |
| 6.2 | พัฒนาระบบเทคโนโลยีและสารสนเทศ | 6 |
| 6.3 | (ส่งเสริมการบริหารจัดการตามหลักธรรมาภิบาล) | 6 |
| 6.4 | (การศึกษา — ด้านบริหารจัดการ) | 6 |
| 6.5 | (สังคมสงเคราะห์ — ด้านบริหารจัดการ) | 6 |
| 6.6 | (สาธารณสุข — ด้านบริหารจัดการ) | 6 |
| 6.7 | (ศาสนา — ด้านบริหารจัดการ) | 6 |

### 4.5 Plan Mapping (Source → Target)

Plans map to tactics via the sheet name encoding. Each sheet name encodes: `ยุทธ{tactic_code}แผนงาน{plan_name}` or `ยุทธ{tactic_code}ผง.{plan_name}`.

| Plan Name (Source) | Appears Under Tactics |
|--------------------|----------------------|
| แผนงานสาธารณสุข | 1.1, 6.6 |
| แผนงานการพาณิชย์ | 1.2, 4.3, 6.2, 6.3 |
| แผนงานการศาสนาวัฒนธรรมและนันทนาการ | 1.2, 2.2, 2.3, 6.7 |
| แผนงานสร้างความเข้มแข็งของชุมชน | 1.2, 3.2 |
| แผนงานเคหะและชุมชน | 1.3 |
| แผนงานบริหารงานทั่วไป | 1.3, 2.3, 4.2, 5.1, 6.2, 6.3 |
| แผนงานการศึกษา | 2.1, 2.2, 6.2, 6.3, 6.4 |
| แผนงานสังคมสงเคราะห์ | 3.3, 6.5 |
| แผนงานอุตสาหกรรมและการโยธา | 4.1, 6.3 |
| แผนงานรักษาความสงบภายใน | 5.2 |

**Key insight**: Plans are **shared across multiple tactics**. The current schema's `plans.tactic_id` foreign key implies a single-tactic relationship. The real data shows plans appear under multiple tactics. This needs a **junction table** or a redefined relationship where each plan instance is duplicated per tactic context.

### 4.6 Extraction Rules per Row Type

```
PRE-STEP: Load textbox-data.json → build lookup: Map<sheetName, Map<row, TextBoxAnnotation[]>>

FOR EACH sheet in Category C:
  0. Look up sheet in textbox lookup → get form_type from form_index annotations
  1. Parse rows 1-11 → extract strategy_num, tactic_code, plan_name
  2. Skip rows 12-14 (headers)
  3. current_amendment = "original"
  4. FOR EACH row starting from row 15:
     a. IF row is BLANK → skip
     b. IF row is AMENDMENT_MARKER → current_amendment = parse_amendment(col_B)
     c. IF row is SUMMARY_BUDGET or SUMMARY_COUNT → record for validation, skip
     d. IF row is PROJECT (col_A is numeric):
        → Create new project record
        → Set amendment_version = current_amendment
        → Parse budgets from cols E-I (handle dash, empty, formatted numbers)
        → Parse ordinance budgets from cols M-Q (if 17-col layout)
        → Check textbox lookup for this row:
          - If amendment/change/addition annotation exists → override current_amendment
          - If transfer annotation exists → set status = 'transferred', record target_plan
          - If merge/duplicate annotation exists → record cross-reference
          - If budget_source annotation exists → record funding_source
        → Store all matched textbox annotations in textbox_annotations JSONB
     e. IF row is CONTINUATION (col_A is empty but other cols have data):
        → Append values to previous project record (concatenate objectives, etc.)
```

### 4.7 Budget Value Parsing Rules

| Source Value | Parsed As | Rule |
|-------------|-----------|------|
| `" 1,632,820 "` | 1632820 | Strip spaces, remove commas, parse as number |
| `" -   "` or `"-"` | 0 | Dash = zero budget for that year |
| `undefined` / `null` | NULL | No budget allocated (distinct from zero) |
| `""` (empty string) | NULL | Same as undefined |
| `" 10,500,000.00 "` | 10500000 | Strip spaces/commas, handle .00 |
| `"     "` (whitespace only) | NULL | |

---

## Phase 5: Import Risk Analysis

### 5.1 Risk Register

| ID | Risk | Severity | Likelihood | Detection | Control |
|----|------|----------|------------|-----------|---------|
| R1 | **Duplicate projects across amendments** — same project name appears in base plan + amendment with different budgets | HIGH | HIGH | Parse amendment markers; track version per project | Import as separate records with amendment_version tag; reconciliation report |
| R2 | **Budget sum mismatch** — detail sheet totals don't match ผ.01 สรุป | HIGH | MEDIUM | Post-import validation against summary sheet | Automated reconciliation check; flag discrepancies for review |
| R3 | **Multi-line cell splitting** — objectives/targets span multiple logical fields within one cell | MEDIUM | HIGH | Use raw cell value (preserve newlines) | Store full text; parse numbered lists as structured data in a future phase |
| R4 | **Inconsistent department names** — same department appears with different spellings ("สำนักสาธารณสุขฯ" vs "สำนักสาธารณสุขและสิ่งแวดล้อม") | MEDIUM | HIGH | Fuzzy matching + normalization lookup table | Build department alias table; normalize on import |
| R5 | **Large sheets with many blank rows** — 400+ row sheets where only 10-30 have data | LOW | HIGH | Skip blank rows | Row type classifier handles this |
| R6 | **Number format inconsistency** — ".00" suffix, thousand separators, dash-as-zero | MEDIUM | HIGH | Parsing rules in 4.7 | Unit test all edge cases |
| R7 | **Plan-tactic relationship is many-to-many** — current schema assumes 1-to-1 | HIGH | CERTAIN | Schema redesign needed | See Phase 4.5; add tactic_id context to plan assignment |
| R8 | **Sheet naming inconsistency** — typos in sheet names (e.g., "ศาสานา" vs "ศาสนา", "พานิชย์" vs "พาณิชย์") | MEDIUM | HIGH | Normalize plan names using alias table | Build mapping dict; log unmatched names |
| R9 | **Provincial coordination data** — very large budgets (billions) in ผ.02.2 may inflate totals if mixed with regular projects | HIGH | MEDIUM | Separate import stream | Tag with `source_category = 'provincial'`; exclude from standard reports unless explicitly included |
| R10 | **Community project data** — 1,005 small projects from 02.1 sheets | MEDIUM | LOW | Separate import stream | Tag with `source_category = 'community'` |
| R11 | **Text box annotations lost** — 212 drawing-object annotations (amendments, transfers, merges, budget sources) invisible to SheetJS cell extraction. Without these, transferred projects become phantom duplicates and amendment provenance is lost. | HIGH | CERTAIN | `scripts/extract-textboxes.cjs` extracts from OOXML drawings | Pre-load `textbox-data.json` into import pipeline; attach per-row annotations during project parsing. See §1.4 and §4.2 (`project_annotations` table). |

### 5.2 Error Classification

| Class | Description | Action |
|-------|------------|--------|
| **FATAL** | Cannot determine strategy/tactic/plan from sheet | Reject entire sheet; log for manual review |
| **ERROR** | Budget value unparseable; required field missing | Mark row as error; import to staging only |
| **WARNING** | Budget sum ≠ summary total; department name unmatched | Import but flag for review |
| **INFO** | Blank rows skipped; amendment boundary detected | Log for audit trail |

---

## Phase 6: Production-Grade Import Architecture

### 6.1 Pipeline Overview

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌─────────────┐
│  Excel File  │───►│  EXTRACT     │───►│  STAGING     │───►│  VALIDATE   │
│  (.xlsx)     │    │  (SheetJS +  │    │  (staging_*  │    │  (rules     │
└──────┬──────┘    │   OOXML ZIP) │    │   tables)    │    │   engine)   │
       │           └──────────────┘    └──────────────┘    └──────┬──────┘
       │                                                          │
       │  ┌──────────────┐             ┌──────────────┐    ┌──────▼──────┐
       └─►│  TEXT BOX    │────────────►│  PRODUCTION  │◄───│  COMMIT /   │
          │  EXTRACTION  │  (merged)   │  (projects,  │    │  ROLLBACK   │
          │  (adm-zip)   │             │   budgets,   │    │             │
          └──────────────┘             │  annotations)│    └─────────────┘
                                       └──────────────┘
```

### 6.2 Stage 1: Extract

**1a. Text Box Extraction** (OOXML ZIP — runs first):
- Open .xlsx as ZIP with `adm-zip`
- Traverse `xl/drawings/drawingN.xml` for all sheets
- Parse `<xdr:twoCellAnchor>` → extract anchor rows + `<a:t>` text
- Classify annotations (amendment, change, addition, transfer, merge, budget_source, form_index)
- Output: `textbox-data.json` → loaded as `Map<sheetName, Map<row, Annotation[]>>`

**1b. Cell Data Extraction** (SheetJS):
- Read workbook with SheetJS (`cellStyles: true, cellDates: true, sheetStubs: true`)
- For each non-empty sheet:
  - Classify sheet category (A–G)
  - Enrich with `form_type` from text box `form_index` annotations
  - Parse metadata preamble (rows 1–11) → strategy, tactic, plan
  - Detect column layout (12-col vs 17-col)
  - Classify each row by type
  - Parse project rows with continuation handling
  - Parse budget values using rules from Phase 4.7
  - Attach text box annotations for each project row (see §4.6)
- Output: JSON array of `StagingProject` objects per sheet (includes `textbox_annotations`)

### 6.3 Stage 2: Staging

- Create `import_batches` record
- Insert all extracted records into `staging_projects`
- Store `raw_data` (original cell values as JSONB) for every row
- Store `textbox_annotations` (JSONB array of matched text box annotations)
- Tag each record with `source_sheet`, `source_row`, `batch_id`
- Insert `sheet_metadata` rows (form type, layout, strategy/tactic/plan per sheet)
- Insert `document_metadata` rows (cover page info from Sheet2 text boxes)

### 6.4 Stage 3: Validate

Run validation rules in sequence:

| Rule | Check | Class |
|------|-------|-------|
| V1 | `project_name` is non-empty | ERROR |
| V2 | At least one budget year has a non-null amount | WARNING |
| V3 | Budget amounts are non-negative numbers | ERROR |
| V4 | Strategy/tactic/plan resolved to valid reference data | ERROR |
| V5 | Department name matches normalization table | WARNING |
| V6 | No duplicate (project_name + tactic_code + amendment_version) | WARNING |
| V7 | Sheet-level budget sum matches SUMMARY_BUDGET row | WARNING |
| V8 | Total budget across all sheets matches ผ.01 สรุป grand total | WARNING |

Set `validation_status` to 'valid', 'warning', or 'error' per row.

### 6.5 Stage 4: Commit / Rollback

- If no FATAL/ERROR rows: proceed to commit
- Within a database transaction:
  1. Upsert reference data (strategies, tactics, plans) with actual names from workbook
  2. Insert projects from staging where `validation_status IN ('valid', 'warning')`
  3. Insert corresponding `project_budgets` rows
  4. Set `staging_projects.committed_project_id` to link staging → production
  5. Update `import_batches.status = 'committed'`
- If any step fails: ROLLBACK entire transaction; set status = 'rolled_back'

### 6.6 Reconciliation Report

Post-commit, generate:

1. **Budget reconciliation**: Compare imported totals vs ผ.01 สรุป per strategy
2. **Project count reconciliation**: Compare imported counts vs summary counts
3. **Unmatched items**: List any staging rows not committed
4. **Department normalization report**: List all department aliases used
5. **Amendment distribution**: Count of projects per amendment version

---

## Phase 7: Intelligent Executive Reporting Module

### 7.1 Report Types

#### RT-1: Dashboard Summary
- Total projects, total budget, budget by year
- Projects by status (planning/in_progress/completed/cancelled)
- Budget utilization by strategy (sparkline charts)
- Top 10 highest-budget projects

#### RT-2: Strategy Performance Report
- Per-strategy breakdown: project count, budget, completion rate
- Year-over-year budget trend per strategy
- Tactic-level drill-down with plan details

#### RT-3: Budget Analysis Report
- Budget distribution: plan budget vs ordinance budget (เทศบัญญัติ)
- Budget concentration (Pareto: top 20% projects = ?% of budget)
- Year-over-year budget growth rate
- Budget by department (treemap)

#### RT-4: Community Impact Report
- 67 communities × project/budget distribution
- Community equity analysis (uniform ฿20K/project vs variance)
- Geographic coverage assessment

#### RT-5: Equipment Procurement Report
- Equipment by category, department, fiscal year
- Procurement timeline (when items are budgeted)
- High-value equipment flagging (>฿1M items)

#### RT-6: Anomaly Detection Report
- Projects with zero budget in all years
- Projects appearing in multiple amendments (version conflicts)
- Budget outliers (>3σ from mean within plan category)
- Sheets with summary mismatch
- Department assignment inconsistencies

#### RT-7: Import Audit Report
- Batch history with timestamps and operators
- Validation error/warning distribution
- Reconciliation results per batch
- Rollback history

### 7.2 Export Formats

| Format | Use Case |
|--------|----------|
| PDF | Executive reports for management |
| Excel | Data analysis by planners |
| CSV | Integration with other systems |
| JSON | API consumers |

### 7.3 Alerting Rules

| Alert | Trigger | Severity |
|-------|---------|----------|
| Budget discrepancy | Import reconciliation shows >1% difference | HIGH |
| Orphan projects | Projects without valid plan assignment | MEDIUM |
| Duplicate detection | Same project name in multiple contexts | MEDIUM |
| Schema drift | New sheet names or column layouts detected | HIGH |

---

## Phase 8: Reporting Design Requirements

### 8.1 Key Performance Indicators (KPIs)

| KPI | Formula | Target |
|-----|---------|--------|
| Plan coverage | Projects imported / Expected from summary | 100% |
| Budget integrity | Imported budget total / Summary total | 100% ±0.1% |
| Data completeness | Non-null field rate across required fields | >95% |
| Amendment tracking | Projects with version tag / Total projects | 100% |
| Import success rate | Committed rows / Total staging rows | >98% |

### 8.2 User Personas

| Persona | Needs |
|---------|-------|
| **ผู้บริหาร (Executive)** | High-level dashboard, budget overview, strategy progress |
| **นักวิเคราะห์ (Analyst)** | Detailed drill-down, cross-tabulation, export to Excel |
| **เจ้าหน้าที่แผน (Planner)** | Project-level detail, amendment history, department assignment |
| **ผู้ตรวจสอบ (Auditor)** | Import audit trail, reconciliation reports, data lineage |

### 8.3 Visualization Types

| Report | Primary Viz | Secondary Viz |
|--------|------------|---------------|
| Dashboard | KPI cards + donut charts | Sparkline trends |
| Strategy perf | Stacked bar (budget by year) | Table with conditional formatting |
| Budget analysis | Treemap (by department) | Pareto chart |
| Community | Heatmap grid (67 communities × 5 years) | Summary statistics |
| Equipment | Grouped bar chart | Data table with sort/filter |
| Anomaly | Alert list with severity badges | Drill-down modals |

### 8.4 Data Trust & Lineage

Every report must display:
- **Import batch ID** and timestamp
- **Source file name** and sheet reference
- **Validation status** summary (% valid/warning/error)
- **Reconciliation score** (match % against summary totals)

### 8.5 Governance Requirements

1. **Immutable audit trail**: All import batches and validation results must be permanently stored
2. **Role-based access**: Audit reports visible only to authorized roles
3. **Data versioning**: Support for comparing current vs previous import batches
4. **Reconciliation sign-off**: Manual approval step before imported data is used in official reports
5. **Error resolution workflow**: Warnings/errors must be resolvable with documented justification

---

## Appendix A: Department Normalization Table

| Source Variants | Normalized Name |
|-----------------|-----------------|
| สำนักสาธารณสุขฯ, สำนักสาธารณสุขและสิ่งแวดล้อม | สำนักสาธารณสุขและสิ่งแวดล้อม |
| สำนักการศึกษา, สำนักการศึกษา (trailing space) | สำนักการศึกษา |
| กองสวัสดิการสังคม | กองสวัสดิการสังคม |
| สำนักช่าง, สำนักการช่าง | สำนักช่าง |
| สำนักการประปา | สำนักการประปา |
| สำนักปลัดเทศบาล | สำนักปลัดเทศบาล |
| กองยุทธศาสตร์และงบประมาณ | กองยุทธศาสตร์และงบประมาณ |

**Note**: Sub-department names (e.g., "งานบริการรักษาความสะอาด", "กลุ่มงานส่งเสริมสุขภาพ") appear as newline-separated values within the department cell. The importer should extract the **primary department** (first line) and store sub-departments separately if needed.

## Appendix B: Amendment Version Patterns

| Pattern | Regex | Example |
|---------|-------|---------|
| Base plan | (default) | No marker = original plan |
| Revision | `ทบทวน\s*ครั้งที่\s*(\d+)\s*/\s*(\d{4})` | ทบทวน ครั้งที่ 2/2565 |
| Supplement | `เพิ่มเติมครั้งที่\s*(\d+)\s*/\s*(\d{4})` | เพิ่มเติมครั้งที่ 5 / 2567 |
| Change | `เปลี่ยนแปลงครั้งที่\s*(\d+)\s*/\s*(\d{4})` | (not yet observed but expected) |

## Appendix C: Sheet Name → Tactic/Plan Decoder

```
Sheet name pattern: ยุทธ{X}.{Y}[แผนงาน|ผง.]{plan_name}
  - X = strategy number (1-6)
  - Y = tactic sub-number
  - plan_name = Thai plan name (may be abbreviated/truncated)

Examples:
  "ยุทธ1.1แผนงานสาธารณสุข" → strategy=1, tactic=1.1, plan=แผนงานสาธารณสุข
  "ยุทธ4.3ผง.การพาณิชย์"  → strategy=4, tactic=4.3, plan=แผนงานการพาณิชย์
  "ยุทธ6.3ผง.สาธา"        → strategy=6, tactic=6.3, plan=แผนงานสาธารณสุข (abbreviated!)
```

## Appendix D: Grand Total Verification Checkpoints

| Checkpoint | Source | Expected Value |
|-----------|--------|----------------|
| Total projects (main plan) | ผ.01 สรุป R62 | 1,186 |
| Total budget (main plan) | ผ.01 สรุป R62 | ฿2,847,165,072 |
| Total projects (provincial) | ผ.01 สรุป R70 | 60 |
| Total budget (provincial) | ผ.01 สรุป R70 | ฿3,489,999,000 |
| Total communities | ผ.01 .1 สรุป ชุมชน R75 | 67 |
| Total community projects | ผ.01 .1 สรุป ชุมชน R75 | 1,005 |
| Total community budget | ผ.01 .1 สรุป ชุมชน R75 | ฿6,700,000 |
| Total equipment items | ผ.08 ครุภัณฑ์ | ~375 items |
| Equipment budget summary | สรุปครุภัณฑ์ R12 | ฿452,162,560 (est.) |

---

*End of Forensic Import & Mapping Analysis v1.0*
