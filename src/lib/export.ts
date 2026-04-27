import * as XLSX from "xlsx";
import { YEARS } from "./mock-data";
import type { ProjectRow } from "./api";
import type { DashboardData } from "./api";

export function exportProjectsToExcel(projects: ProjectRow[], filename = "projects.xlsx") {
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

  const rows = projects.map((p) => [
    p.id,
    p.name,
    p.department ?? "",
    p.strategy_name ?? "",
    p.tactic_code ?? "",
    p.plan_name ?? "",
    p.status,
    ...YEARS.map((y) => (p as any).project_budgets?.find?.((b: any) => b.year === y)?.amount ?? 0),
    p.total_budget,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);

  // Auto-width columns
  ws["!cols"] = header.map((h, i) => ({
    wch: Math.max(h.length, ...rows.map((r) => String(r[i]).length)) + 2,
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "โครงการ");
  XLSX.writeFile(wb, filename);
}

export function exportDashboardToExcel(data: DashboardData, filename = "dashboard.xlsx") {
  const wb = XLSX.utils.book_new();

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
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "สรุป");

  // Sheet 2: By Strategy
  const stratHeader = ["ยุทธศาสตร์", "จำนวนโครงการ", "งบประมาณรวม", "วางแผน", "ดำเนินการ", "เสร็จสิ้น", "ยกเลิก", "% เสร็จสิ้น"];
  const stratRows = data.byStrategyProgress.map((s) => [
    s.full_name,
    s.project_count,
    s.total_budget,
    s.planning,
    s.in_progress,
    s.completed,
    s.cancelled,
    s.completion_rate,
  ]);
  const wsStrat = XLSX.utils.aoa_to_sheet([stratHeader, ...stratRows]);
  wsStrat["!cols"] = stratHeader.map((h) => ({ wch: Math.max(h.length + 2, 14) }));
  XLSX.utils.book_append_sheet(wb, wsStrat, "ยุทธศาสตร์");

  // Sheet 3: By Year
  const yearHeader = ["ปีงบประมาณ", "งบประมาณ (บาท)", "จำนวนโครงการ"];
  const yearRows = data.byYear.map((y) => [y.label, y.total, y.project_count]);
  const wsYear = XLSX.utils.aoa_to_sheet([yearHeader, ...yearRows]);
  wsYear["!cols"] = [{ wch: 15 }, { wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsYear, "งบรายปี");

  // Sheet 4: Top Departments
  const deptHeader = ["หน่วยงาน", "จำนวนโครงการ", "งบประมาณ (บาท)"];
  const deptRows = data.topDepts.map((d) => [d.department, d.count, d.budget]);
  const wsDept = XLSX.utils.aoa_to_sheet([deptHeader, ...deptRows]);
  wsDept["!cols"] = [{ wch: 30 }, { wch: 15 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsDept, "หน่วยงาน");

  XLSX.writeFile(wb, filename);
}
