import * as XLSX from "xlsx";
import { STATUS_LABEL, YEARS } from "./mock-data";
import type { ProjectRow } from "./api";
import type { DashboardData } from "./api";

function sanitizeExcelString(value: unknown) {
  if (typeof value !== "string") return value;
  return /^[=+\-@]/.test(value.trimStart()) ? `'${value}` : value;
}

function sanitizeExcelRow(row: unknown[]) {
  return row.map(sanitizeExcelString);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatReportBaht(value: number) {
  return Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function exportProjectsToExcel(projects: ProjectRow[], filename = "projects.xlsx") {
  const generatedAt = new Date();
  const header = [
    "ID",
    "ชื่อโครงการ",
    "หน่วยงาน",
    "ยุทธศาสตร์",
    "กลยุทธ์",
    "แผนงาน",
    "สถานะ",
    ...YEARS.map((y) => `งบปี ${y}`),
    "งบรวม",
  ];

  const rows = projects.map((p) => sanitizeExcelRow([
    p.id,
    p.name,
    p.department ?? "",
    p.strategy_name ?? "",
    p.tactic_code ?? "",
    p.plan_name ?? "",
    p.status,
    ...YEARS.map((y) => (p as any).project_budgets?.find?.((b: any) => b.year === y)?.amount ?? 0),
    p.total_budget,
  ]));

  const ws = XLSX.utils.aoa_to_sheet([sanitizeExcelRow(header), ...rows]);

  // Auto-width columns
  ws["!cols"] = header.map((h, i) => ({
    wch: Math.max(h.length, ...rows.map((r) => String(r[i]).length)) + 2,
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "โครงการ");
  const meta = [
    ["ชื่อชุดข้อมูล", "รายการโครงการแผนพัฒนาท้องถิ่น 5 ปี"],
    ["หน่วยงาน", "เทศบาลนครนครสวรรค์"],
    ["วันที่ส่งออก", generatedAt.toLocaleString("th-TH")],
    ["สถานะข้อมูล", "ข้อมูลเผยแพร่สำหรับประชาชนแบบอ่านอย่างเดียว"],
    ["แหล่งข้อมูล", "แผนพัฒนาท้องถิ่น พ.ศ. 2566-2570 และข้อมูลที่เจ้าหน้าที่เผยแพร่ในระบบ"],
    ["หมายเหตุ", "ไฟล์นี้ไม่รวมข้อมูลผู้ดูแลระบบ audit log internal note หรือข้อมูลที่ยังไม่เผยแพร่เมื่อเปิดใช้ publish_status"],
  ];
  const wsMeta = XLSX.utils.aoa_to_sheet(meta.map(sanitizeExcelRow));
  wsMeta["!cols"] = [{ wch: 24 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(wb, wsMeta, "ข้อมูลกำกับ");
  XLSX.writeFile(wb, filename);
}

export interface ProjectPdfExportOptions {
  title?: string;
  subtitle?: string;
  filterSummary?: string[];
  totalFiltered?: number;
  generatedAt?: Date;
  printWindow?: Window | null;
}

export function exportProjectsToPdf(projects: ProjectRow[], options: ProjectPdfExportOptions = {}) {
  const generatedAt = options.generatedAt ?? new Date();
  const reportNo = `NSW-PROJ-${generatedAt.toISOString().slice(0, 10).replaceAll("-", "")}-${String(generatedAt.getHours()).padStart(2, "0")}${String(generatedAt.getMinutes()).padStart(2, "0")}`;
  const printWindow = options.printWindow ?? window.open("", "_blank", "width=1200,height=800");
  if (!printWindow) {
    throw new Error("POPUP_BLOCKED");
  }

  const totalBudget = projects.reduce((sum, project) => sum + Number(project.total_budget || 0), 0);
  const statusCounts = projects.reduce<Record<string, number>>((acc, project) => {
    acc[project.status] = (acc[project.status] ?? 0) + 1;
    return acc;
  }, {});
  const filterSummary = options.filterSummary?.filter(Boolean) ?? [];

  const statusRows = Object.entries(statusCounts).map(([status, count]) => `
    <tr>
      <td>${escapeHtml(STATUS_LABEL[status as keyof typeof STATUS_LABEL] ?? status)}</td>
      <td class="num">${count.toLocaleString("th-TH")}</td>
    </tr>
  `).join("");

  const projectRows = projects.map((project, index) => `
    <tr>
      <td class="center">${index + 1}</td>
      <td>
        <strong>${escapeHtml(project.name)}</strong>
        ${project.annotation_preview ? `<div class="annotation">Text box: ${escapeHtml(project.annotation_preview)}</div>` : ""}
      </td>
      <td>${escapeHtml(project.department || "-")}</td>
      <td>${escapeHtml(project.strategy_name || "-")}</td>
      <td>${escapeHtml(project.plan_name || "-")}</td>
      <td class="num">${formatReportBaht(project.total_budget)}</td>
      <td>${escapeHtml(STATUS_LABEL[project.status] ?? project.status)}</td>
    </tr>
  `).join("");

  const html = `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(options.title ?? "รายงานรายการโครงการ")} ${reportNo}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #17211d;
      background: #eef1ee;
      font-family: "TH Sarabun New", "IBM Plex Sans Thai", "Sarabun", Arial, sans-serif;
      line-height: 1.45;
    }
    .page {
      width: 297mm;
      min-height: 210mm;
      margin: 0 auto;
      padding: 14mm;
      background: #fff;
      border-top: 6px solid #075c40;
    }
    .header {
      display: grid;
      grid-template-columns: 72px 1fr 190px;
      gap: 16px;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 2px solid #1f2937;
    }
    .logo { width: 64px; height: 64px; object-fit: contain; }
    .kicker { font-size: 13px; color: #6b7280; letter-spacing: .08em; text-transform: uppercase; }
    h1 { margin: 2px 0 0; color: #075c40; font-size: 25px; line-height: 1.15; }
    .subtitle { margin-top: 4px; font-size: 15px; color: #4b5563; }
    .doc-meta { text-align: right; font-size: 12px; color: #374151; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin: 14px 0;
    }
    .summary-card {
      min-height: 70px;
      border: 1px solid #d1d5db;
      background: #fbfbf8;
      padding: 9px 10px;
    }
    .summary-label { font-size: 12px; color: #6b7280; }
    .summary-value { margin-top: 4px; font-size: 20px; font-weight: 800; color: #111827; }
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 10px 0 14px;
    }
    .filter-chip {
      border: 1px solid #b7c4bd;
      background: #f4f7f5;
      color: #254238;
      padding: 3px 8px;
      border-radius: 999px;
      font-size: 12px;
    }
    table { width: 100%; border-collapse: collapse; font-size: 12px; page-break-inside: auto; }
    th, td { border: 1px solid #aab3ad; padding: 5px 6px; vertical-align: top; }
    th { background: #075c40; color: #fff; text-align: left; font-weight: 700; }
    tr { page-break-inside: avoid; }
    .center { text-align: center; }
    .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .annotation { margin-top: 3px; color: #92400e; font-size: 11px; line-height: 1.35; }
    .two-col { display: grid; grid-template-columns: 1fr 2fr; gap: 12px; margin-bottom: 14px; }
    .note {
      border: 1px solid #d1d5db;
      background: #f9fafb;
      padding: 8px 10px;
      color: #4b5563;
      font-size: 12px;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-top: 14px;
      padding-top: 8px;
      border-top: 1px solid #d1d5db;
      color: #6b7280;
      font-size: 11px;
    }
    .screen-actions {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      justify-content: center;
      gap: 8px;
      padding: 10px;
      background: #111827;
    }
    .screen-actions button {
      border: 0;
      border-radius: 6px;
      padding: 8px 12px;
      color: white;
      background: #0f766e;
      cursor: pointer;
      font: inherit;
    }
    .screen-actions button.secondary { background: #4b5563; }
    @media print {
      body { background: white; }
      .screen-actions { display: none; }
      .page { width: auto; min-height: auto; margin: 0; padding: 0; border-top: 0; }
    }
  </style>
</head>
<body>
  <div class="screen-actions">
    <button onclick="window.print()">พิมพ์ / บันทึกเป็น PDF</button>
    <button class="secondary" onclick="window.close()">ปิดหน้าต่าง</button>
  </div>
  <main class="page">
    <header class="header">
      <img class="logo" src="/agency-logo.png" onerror="this.onerror=null;this.src='/agency-logo.svg'" alt="ตราหน่วยงาน" />
      <div>
        <div class="kicker">เอกสารประกอบการติดตามแผน</div>
        <h1>${escapeHtml(options.title ?? "รายงานรายการโครงการตามตัวกรอง")}</h1>
        <div class="subtitle">${escapeHtml(options.subtitle ?? "เทศบาลนครนครสวรรค์ · แผนพัฒนาท้องถิ่น พ.ศ. 2566-2570")}</div>
      </div>
      <div class="doc-meta">
        <div><strong>เลขที่รายงาน</strong></div>
        <div>${reportNo}</div>
        <div><strong>วันที่จัดทำ</strong></div>
        <div>${generatedAt.toLocaleString("th-TH")}</div>
      </div>
    </header>

    <section class="summary-grid">
      <div class="summary-card"><div class="summary-label">โครงการที่ส่งออก</div><div class="summary-value">${projects.length.toLocaleString("th-TH")}</div></div>
      <div class="summary-card"><div class="summary-label">ผลลัพธ์ตามตัวกรองทั้งหมด</div><div class="summary-value">${(options.totalFiltered ?? projects.length).toLocaleString("th-TH")}</div></div>
      <div class="summary-card"><div class="summary-label">งบประมาณรวม</div><div class="summary-value">${formatReportBaht(totalBudget)}</div></div>
      <div class="summary-card"><div class="summary-label">จำนวนสถานะ</div><div class="summary-value">${Object.keys(statusCounts).length.toLocaleString("th-TH")}</div></div>
    </section>

    ${filterSummary.length ? `<section class="filters">${filterSummary.map((item) => `<span class="filter-chip">${escapeHtml(item)}</span>`).join("")}</section>` : ""}

    <section class="two-col">
      <div>
        <table>
          <thead><tr><th>สถานะ</th><th class="num">จำนวน</th></tr></thead>
          <tbody>${statusRows || `<tr><td colspan="2" class="center">ไม่มีข้อมูล</td></tr>`}</tbody>
        </table>
      </div>
      <div class="note">
        รายงานนี้สร้างจากรายการโครงการที่ตรงกับตัวกรองบนหน้าจอในขณะส่งออก รวมถึงการค้นหาจากป้ายและข้อความใน Text box annotation เพื่อให้เจ้าหน้าที่ใช้แนบประกอบการตรวจสอบหรือประชุมได้ทันที
      </div>
    </section>

    <table>
      <thead>
        <tr>
          <th class="center" style="width: 42px;">ลำดับ</th>
          <th>ชื่อโครงการ / ป้าย Text box</th>
          <th style="width: 150px;">หน่วยงาน</th>
          <th style="width: 180px;">ยุทธศาสตร์</th>
          <th style="width: 170px;">แผนงาน</th>
          <th class="num" style="width: 110px;">งบประมาณ</th>
          <th style="width: 100px;">สถานะ</th>
        </tr>
      </thead>
      <tbody>${projectRows || `<tr><td colspan="7" class="center">ไม่มีข้อมูลโครงการที่ตรงกับตัวกรอง</td></tr>`}</tbody>
    </table>

    <footer class="footer">
      <div>ระบบบริหารแผนพัฒนาท้องถิ่น เทศบาลนครนครสวรรค์</div>
      <div>สร้างจากข้อมูลที่กรอง ณ ${generatedAt.toLocaleString("th-TH")}</div>
    </footer>
  </main>
  <script>
    window.addEventListener("load", () => setTimeout(() => window.print(), 350));
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
}

export function exportOfficialDashboardPdf(data: DashboardData) {
  const generatedAt = new Date();
  const reportNo = `NSW-${generatedAt.toISOString().slice(0, 10).replaceAll("-", "")}-${String(generatedAt.getHours()).padStart(2, "0")}${String(generatedAt.getMinutes()).padStart(2, "0")}`;
  const printWindow = window.open("", "_blank", "width=1024,height=768");
  if (!printWindow) {
    throw new Error("POPUP_BLOCKED");
  }

  const statusRows = data.byStatus.map((s) => `
    <tr>
      <td>${escapeHtml(s.label)}</td>
      <td class="num">${s.count.toLocaleString("th-TH")}</td>
    </tr>
  `).join("");

  const yearRows = data.byYear.map((y) => `
    <tr>
      <td class="center">${escapeHtml(y.label)}</td>
      <td class="num">${formatReportBaht(y.total)}</td>
      <td class="num">${y.project_count.toLocaleString("th-TH")}</td>
    </tr>
  `).join("");

  const strategyRows = data.byStrategyProgress.map((s, index) => `
    <tr>
      <td class="center">${index + 1}</td>
      <td>${escapeHtml(s.full_name)}</td>
      <td class="num">${s.project_count.toLocaleString("th-TH")}</td>
      <td class="num">${formatReportBaht(s.total_budget)}</td>
      <td class="num">${s.completion_rate.toLocaleString("th-TH")}%</td>
    </tr>
  `).join("");

  const deptRows = data.topDepts.map((d, index) => `
    <tr>
      <td class="center">${index + 1}</td>
      <td>${escapeHtml(d.department)}</td>
      <td class="num">${d.count.toLocaleString("th-TH")}</td>
      <td class="num">${formatReportBaht(d.budget)}</td>
    </tr>
  `).join("");

  const html = `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>รายงานภาพรวมแผนพัฒนาท้องถิ่น ${reportNo}</title>
  <style>
    @page { size: A4; margin: 16mm 14mm 16mm 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #111827;
      background: #f3f4f6;
      font-family: "TH Sarabun New", "IBM Plex Sans Thai", "Sarabun", Arial, sans-serif;
      line-height: 1.42;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 18mm 16mm;
      background: white;
      border-top: 6px solid #0f513f;
    }
    .header {
      display: grid;
      grid-template-columns: 72px 1fr 150px;
      gap: 16px;
      align-items: center;
      padding-bottom: 14px;
      border-bottom: 2px solid #1f2937;
    }
    .logo { width: 66px; height: 66px; object-fit: contain; }
    .kicker { font-size: 14px; letter-spacing: .08em; color: #6b7280; text-transform: uppercase; }
    h1 { margin: 2px 0 0; font-size: 24px; line-height: 1.15; color: #0f513f; }
    .subtitle { margin-top: 4px; font-size: 15px; color: #374151; }
    .doc-meta { font-size: 12px; color: #374151; text-align: right; }
    .doc-meta div { margin: 2px 0; }
    .section { margin-top: 16px; }
    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 8px;
      font-size: 17px;
      color: #0f513f;
      font-weight: 700;
    }
    .section-title::before { content: ""; width: 4px; height: 20px; background: #c9a84c; display: inline-block; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }
    .summary-card {
      border: 1px solid #d1d5db;
      padding: 10px;
      min-height: 74px;
      background: #fbfbf8;
    }
    .summary-label { font-size: 12px; color: #6b7280; }
    .summary-value { margin-top: 4px; font-size: 20px; font-weight: 800; color: #111827; }
    .summary-note { margin-top: 2px; font-size: 11px; color: #6b7280; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; page-break-inside: auto; }
    th, td { border: 1px solid #9ca3af; padding: 6px 7px; vertical-align: top; }
    th { background: #0f513f; color: white; font-weight: 700; text-align: left; }
    tr { page-break-inside: avoid; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .center { text-align: center; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .official-note {
      border: 1px solid #d1d5db;
      background: #f9fafb;
      padding: 10px 12px;
      font-size: 13px;
      color: #374151;
    }
    .signatures {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-top: 30px;
      font-size: 13px;
      text-align: center;
    }
    .sig-line { border-top: 1px solid #374151; padding-top: 6px; margin-top: 42px; }
    .footer {
      margin-top: 24px;
      padding-top: 8px;
      border-top: 1px solid #d1d5db;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      color: #6b7280;
      font-size: 11px;
    }
    .screen-actions {
      position: sticky;
      top: 0;
      display: flex;
      justify-content: center;
      gap: 8px;
      padding: 10px;
      background: #111827;
      z-index: 10;
    }
    .screen-actions button {
      border: 0;
      border-radius: 6px;
      padding: 8px 12px;
      color: white;
      background: #0f766e;
      cursor: pointer;
      font: inherit;
    }
    .screen-actions button.secondary { background: #4b5563; }
    @media print {
      body { background: white; }
      .screen-actions { display: none; }
      .page { width: auto; min-height: auto; margin: 0; padding: 0; border-top: 0; }
      a { color: inherit; text-decoration: none; }
    }
  </style>
</head>
<body>
  <div class="screen-actions">
    <button onclick="window.print()">พิมพ์ / บันทึกเป็น PDF</button>
    <button class="secondary" onclick="window.close()">ปิดหน้าต่าง</button>
  </div>
  <main class="page">
    <header class="header">
      <img class="logo" src="/agency-logo.png" onerror="this.onerror=null;this.src='/agency-logo.svg'" alt="ตราหน่วยงาน" />
      <div>
        <div class="kicker">เอกสารประกอบการเสนอเรื่อง</div>
        <h1>รายงานภาพรวมแผนพัฒนาท้องถิ่น พ.ศ. 2566-2570</h1>
        <div class="subtitle">เทศบาลนครนครสวรรค์</div>
      </div>
      <div class="doc-meta">
        <div><strong>เลขที่รายงาน</strong></div>
        <div>${reportNo}</div>
        <div><strong>วันที่จัดทำ</strong></div>
        <div>${generatedAt.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}</div>
      </div>
    </header>

    <section class="section">
      <h2 class="section-title">สรุปสำหรับผู้บริหาร</h2>
      <div class="summary-grid">
        <div class="summary-card"><div class="summary-label">จำนวนโครงการทั้งหมด</div><div class="summary-value">${data.totalProjects.toLocaleString("th-TH")}</div><div class="summary-note">โครงการ</div></div>
        <div class="summary-card"><div class="summary-label">งบประมาณรวม</div><div class="summary-value">${formatReportBaht(data.totalBudget)}</div><div class="summary-note">บาท</div></div>
        <div class="summary-card"><div class="summary-label">จำนวนยุทธศาสตร์</div><div class="summary-value">${data.totalStrategies.toLocaleString("th-TH")}</div><div class="summary-note">ยุทธศาสตร์</div></div>
        <div class="summary-card"><div class="summary-label">หน่วยงานรับผิดชอบ</div><div class="summary-value">${data.totalDepartments.toLocaleString("th-TH")}</div><div class="summary-note">หน่วยงาน</div></div>
      </div>
    </section>

    <section class="section two-col">
      <div>
        <h2 class="section-title">สถานะโครงการ</h2>
        <table><thead><tr><th>สถานะ</th><th class="num">จำนวน</th></tr></thead><tbody>${statusRows}</tbody></table>
      </div>
      <div>
        <h2 class="section-title">งบประมาณรายปี</h2>
        <table><thead><tr><th class="center">ปีงบประมาณ</th><th class="num">งบประมาณ (บาท)</th><th class="num">จำนวนโครงการ</th></tr></thead><tbody>${yearRows}</tbody></table>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">ผลสรุปรายยุทธศาสตร์</h2>
      <table>
        <thead><tr><th class="center" style="width:42px">ลำดับ</th><th>ยุทธศาสตร์</th><th class="num">โครงการ</th><th class="num">งบประมาณ (บาท)</th><th class="num">สำเร็จ</th></tr></thead>
        <tbody>${strategyRows}</tbody>
      </table>
    </section>

    <section class="section">
      <h2 class="section-title">หน่วยงานที่มีโครงการสูงสุด</h2>
      <table>
        <thead><tr><th class="center" style="width:42px">ลำดับ</th><th>หน่วยงาน</th><th class="num">โครงการ</th><th class="num">งบประมาณ (บาท)</th></tr></thead>
        <tbody>${deptRows}</tbody>
      </table>
    </section>

    <section class="section">
      <div class="official-note">
        เอกสารฉบับนี้จัดทำจากระบบบริหารแผนพัฒนาท้องถิ่น เพื่อใช้ประกอบการพิจารณา เสนอเรื่อง และติดตามภาพรวมการดำเนินงานตามแผนพัฒนาท้องถิ่นของหน่วยงาน
      </div>
      <div class="signatures">
        <div><div class="sig-line">ผู้จัดทำรายงาน</div></div>
        <div><div class="sig-line">ผู้ตรวจสอบข้อมูล</div></div>
        <div><div class="sig-line">ผู้อนุมัติ / ผู้รับรอง</div></div>
      </div>
    </section>

    <footer class="footer">
      <div>ระบบบริหารแผนพัฒนาท้องถิ่น เทศบาลนครนครสวรรค์</div>
      <div>เครดิต: นักวิชาการคอมพิวเตอร์ · คิดเป็นระบบ เขียนเป็นจริง ขับเคลื่อนเมืองด้วยข้อมูล</div>
    </footer>
  </main>
  <script>
    window.addEventListener("load", () => setTimeout(() => window.print(), 350));
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export function exportDashboardToExcel(data: DashboardData, filename = "dashboard.xlsx") {
  const wb = XLSX.utils.book_new();
  const generatedAt = new Date();

  // Sheet 1: Summary
  const summaryData = [
    ["สรุปภาพรวมแผนพัฒนาท้องถิ่น"],
    [],
    ["จำนวนโครงการทั้งหมด", data.totalProjects],
    ["งบประมาณรวม (บาท)", data.totalBudget],
    ["จำนวนยุทธศาสตร์", data.totalStrategies],
    ["จำนวนแผนงาน", data.totalPlans],
    ["จำนวนหน่วยงาน", data.totalDepartments],
    [],
    ["สถานะ", "จำนวน"],
    ...data.byStatus.map((s) => [s.label, s.count]),
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData.map(sanitizeExcelRow));
  wsSummary["!cols"] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "สรุป");

  // Sheet 2: By Strategy
  const stratHeader = ["ยุทธศาสตร์", "จำนวนโครงการ", "งบประมาณรวม", "วางแผน", "ดำเนินการ", "เสร็จสิ้น", "ยกเลิก", "% เสร็จสิ้น"];
  const stratRows = data.byStrategyProgress.map((s) => sanitizeExcelRow([
    s.full_name,
    s.project_count,
    s.total_budget,
    s.planning,
    s.in_progress,
    s.completed,
    s.cancelled,
    s.completion_rate,
  ]));
  const wsStrat = XLSX.utils.aoa_to_sheet([sanitizeExcelRow(stratHeader), ...stratRows]);
  wsStrat["!cols"] = stratHeader.map((h) => ({ wch: Math.max(h.length + 2, 14) }));
  XLSX.utils.book_append_sheet(wb, wsStrat, "ยุทธศาสตร์");

  // Sheet 3: By Year
  const yearHeader = ["ปีงบประมาณ", "งบประมาณ (บาท)", "จำนวนโครงการ"];
  const yearRows = data.byYear.map((y) => sanitizeExcelRow([y.label, y.total, y.project_count]));
  const wsYear = XLSX.utils.aoa_to_sheet([sanitizeExcelRow(yearHeader), ...yearRows]);
  wsYear["!cols"] = [{ wch: 15 }, { wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsYear, "งบรายปี");

  // Sheet 4: Top Departments
  const deptHeader = ["หน่วยงาน", "จำนวนโครงการ", "งบประมาณ (บาท)"];
  const deptRows = data.topDepts.map((d) => sanitizeExcelRow([d.department, d.count, d.budget]));
  const wsDept = XLSX.utils.aoa_to_sheet([sanitizeExcelRow(deptHeader), ...deptRows]);
  wsDept["!cols"] = [{ wch: 30 }, { wch: 15 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsDept, "หน่วยงาน");

  const meta = [
    ["ชื่อชุดข้อมูล", "สรุปภาพรวมแผนพัฒนาท้องถิ่น 5 ปี"],
    ["หน่วยงาน", "เทศบาลนครนครสวรรค์"],
    ["วันที่ส่งออก", generatedAt.toLocaleString("th-TH")],
    ["สถานะข้อมูล", "ข้อมูลเผยแพร่สำหรับประชาชนแบบอ่านอย่างเดียว"],
    ["แหล่งข้อมูล", "แผนพัฒนาท้องถิ่น พ.ศ. 2566-2570 และข้อมูลที่เจ้าหน้าที่เผยแพร่ในระบบ"],
    ["ขอบเขต", "รวมเฉพาะข้อมูลสรุป public dashboard ไม่รวมข้อมูลผู้ดูแลระบบหรือ audit log"],
  ];
  const wsMeta = XLSX.utils.aoa_to_sheet(meta.map(sanitizeExcelRow));
  wsMeta["!cols"] = [{ wch: 24 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(wb, wsMeta, "ข้อมูลกำกับ");

  XLSX.writeFile(wb, filename);
}
