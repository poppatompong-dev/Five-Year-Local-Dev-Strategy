import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { apiBatchImportProjects, type ProjectCreateInput, type ImportResult } from "@/lib/api";
import { YEARS } from "@/lib/mock-data";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, AlertTriangle, X, Loader2, Download, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/import")({
  head: () => ({
    meta: [
      { title: "นำเข้าข้อมูล · แผนพัฒนาท้องถิ่น" },
      { name: "description", content: "นำเข้าข้อมูลโครงการจากไฟล์ Excel เข้าสู่ระบบบริหารแผนพัฒนาท้องถิ่น" },
    ],
  }),
  component: ImportPage,
});

const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024;
const TEMPLATE_FILENAME = "project-import-template-2566-2570.xlsx";

interface ParsedRow {
  name: string;
  department: string;
  plan_id: number | null;
  budgets: Record<number, number>;
}

function parseExcel(buffer: ArrayBuffer): { rows: ParsedRow[]; warnings: string[]; sheetName: string } {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  const rows: ParsedRow[] = [];
  const warnings: string[] = [];

  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    const hasAnyValue = r.some((cell) => String(cell ?? "").trim() !== "");
    if (!hasAnyValue) continue;

    const name = String(r[0] ?? "").trim();
    if (!name) {
      warnings.push(`แถว ${i + 1}: ข้ามเนื่องจากไม่มีชื่อโครงการ`);
      continue;
    }

    const department = String(r[1] ?? "").trim();
    const rawPlan = r[2];
    const planText = String(rawPlan ?? "").trim();
    const plan_id = planText ? (Number.isFinite(Number(planText)) ? Number(planText) : null) : null;
    if (planText && plan_id === null) warnings.push(`แถว ${i + 1}: plan_id "${planText}" ต้องเป็นตัวเลข`);

    const budgets: Record<number, number> = {};
    YEARS.forEach((y, idx) => {
      const rawBudget = r[3 + idx];
      const budgetText = String(rawBudget ?? "").trim();
      if (!budgetText) return;

      const val = Number(budgetText);
      if (!Number.isFinite(val)) {
        warnings.push(`แถว ${i + 1}: งบปี ${y} ต้องเป็นตัวเลข`);
        return;
      }
      if (val < 0) {
        warnings.push(`แถว ${i + 1}: งบปี ${y} ต้องไม่ติดลบ (${val})`);
        return;
      }
      if (val > 0) budgets[y] = val;
    });

    rows.push({ name, department, plan_id, budgets });
  }

  return { rows, warnings, sheetName };
}

function downloadImportTemplate() {
  const header = [
    "ชื่อโครงการ",
    "หน่วยงานรับผิดชอบ",
    "plan_id",
    ...YEARS.map((y) => `งบปี ${y}`),
  ];
  const exampleRow = [
    "ตัวอย่างโครงการปรับปรุงทางเท้า",
    "สำนักช่าง",
    1,
    250000,
    0,
    0,
    0,
    0,
  ];

  const templateSheet = XLSX.utils.aoa_to_sheet([header, exampleRow]);
  templateSheet["!cols"] = [
    { wch: 36 },
    { wch: 24 },
    { wch: 12 },
    ...YEARS.map(() => ({ wch: 14 })),
  ];

  const instructionSheet = XLSX.utils.aoa_to_sheet([
    ["คำแนะนำการนำเข้าข้อมูล"],
    [],
    ["1", "กรอกข้อมูลในชีต template โดยเริ่มตั้งแต่แถวที่ 2"],
    ["2", "คอลัมน์ plan_id ต้องเป็นตัวเลข เช่น 1, 2, 3 หากไม่ทราบให้เว้นว่างได้"],
    ["3", "งบประมาณต้องเป็นตัวเลข 0 หรือมากกว่า ห้ามใช้งบติดลบ"],
    ["4", "แถวว่างจะถูกข้ามโดยอัตโนมัติ"],
    ["5", "ระบบอ่านรูปแบบ Simple 8 columns เท่านั้น: ชื่อโครงการ, หน่วยงานรับผิดชอบ, plan_id และงบปี 2566-2570"],
  ]);
  instructionSheet["!cols"] = [{ wch: 8 }, { wch: 92 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, templateSheet, "template");
  XLSX.utils.book_append_sheet(wb, instructionSheet, "instructions");
  XLSX.writeFile(wb, TEMPLATE_FILENAME);
}

function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsed, setParsed] = useState<{ rows: ParsedRow[]; warnings: string[]; sheetName: string } | null>(null);
  const [parseError, setParseError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const { isLoggedIn, isLoading } = useAuth();

  const handleFile = useCallback(async (f: File | null) => {
    if (!f) return;
    setParsed(null);
    setResult(null);

    if (!/\.(xlsx|xls)$/i.test(f.name)) {
      setFile(null);
      setParseError("กรุณาเลือกไฟล์ .xlsx หรือ .xls เท่านั้น");
      return;
    }
    if (f.size > MAX_IMPORT_FILE_SIZE) {
      setFile(null);
      setParseError("ไฟล์ต้องมีขนาดไม่เกิน 10 MB");
      return;
    }

    setFile(f);
    setParseError("");
    try {
      const buffer = await f.arrayBuffer();
      const p = parseExcel(buffer);
      if (p.rows.length === 0) {
        setParseError("ไม่พบข้อมูลโครงการในไฟล์นี้");
        setParsed(null);
        return;
      }
      setParsed(p);
    } catch (err: any) {
      setParseError(`อ่านไฟล์ไม่สำเร็จ: ${err.message}`);
      setParsed(null);
    }
  }, []);

  const importMutation = useMutation({
    mutationFn: (rows: ProjectCreateInput[]) => apiBatchImportProjects(rows),
    onSuccess: (r) => {
      setResult(r);
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      if (r.errors.length === 0) {
        toast.success(`นำเข้าสำเร็จ ${r.inserted} โครงการ`);
      } else {
        toast.warning(`นำเข้า ${r.inserted} โครงการ พบข้อผิดพลาด ${r.errors.length} รายการ`);
      }
    },
    onError: (err) => {
      toast.error(`นำเข้าล้มเหลว: ${err.message}`);
    },
  });

  function startImport() {
    if (!parsed || !isLoggedIn) return;
    const inputs: ProjectCreateInput[] = parsed.rows.map((r) => ({
      name: r.name,
      department: r.department || undefined,
      plan_id: r.plan_id,
      source_sheet: parsed.sheetName,
      budgets: r.budgets,
    }));
    importMutation.mutate(inputs);
  }

  function reset() {
    setFile(null);
    setParsed(null);
    setParseError("");
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const totalBudget = parsed?.rows.reduce((s, r) => s + Object.values(r.budgets).reduce((a, b) => a + b, 0), 0) ?? 0;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin mr-2" />
          กำลังตรวจสอบสิทธิ์...
        </div>
      </AppLayout>
    );
  }

  if (!isLoggedIn) {
    return (
      <AppLayout>
        <div className="max-w-2xl">
          <div className="bg-card rounded-2xl border border-border p-8 shadow-soft">
            <div className="size-12 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
              <LogIn className="size-6" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight mt-5">ต้องเข้าสู่ระบบผู้ดูแลก่อนนำเข้าข้อมูล</h1>
            <p className="text-sm text-muted-foreground mt-2">
              หน้า import เปิดให้ผู้ดูแลระบบเท่านั้น เพื่อป้องกันการอัปโหลดข้อมูลโดยไม่ได้รับอนุญาต
            </p>
            <Button asChild className="mt-5 gap-2">
              <Link to="/login">
                <LogIn className="size-4" />
                เข้าสู่ระบบผู้ดูแล
              </Link>
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">การจัดการข้อมูล</div>
            <h1 className="text-3xl font-semibold tracking-tight mt-1">นำเข้าข้อมูลจาก Excel</h1>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
              อัปโหลดไฟล์ Excel (.xlsx) เพื่อนำเข้าโครงการและงบประมาณรายปีเข้าระบบ ระบบจะตรวจโครงสร้างข้อมูลและรายงานผลก่อนบันทึก
            </p>
          </div>
          <Button variant="outline" onClick={downloadImportTemplate} className="gap-2 shrink-0">
            <Download className="size-4" />
            ดาวน์โหลดเทมเพลต Excel
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
              className={[
                "bg-card rounded-2xl border-2 border-dashed p-10 text-center transition-all",
                dragOver ? "border-primary bg-primary-soft/40" : "border-border hover:border-primary/40",
              ].join(" ")}
            >
              <div className="size-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mx-auto">
                <Upload className="size-7" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">ลากและวางไฟล์ที่นี่</h3>
              <p className="text-sm text-muted-foreground mt-1">หรือคลิกเพื่อเลือกไฟล์จากเครื่องของคุณ</p>
              <p className="text-xs text-muted-foreground mt-3">รองรับเฉพาะไฟล์ .xlsx หรือ .xls ขนาดไม่เกิน 10 MB</p>
              <button
                onClick={() => inputRef.current?.click()}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:bg-primary/90 transition"
              >
                <FileSpreadsheet className="size-4" /> เลือกไฟล์ Excel
              </button>
              <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
            </div>

            {parseError && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive flex items-start gap-2">
                <AlertCircle className="size-4 mt-0.5 shrink-0" /> {parseError}
              </div>
            )}

            {file && parsed && (
              <div className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
                <div className="p-5 flex items-center gap-4">
                  <div className="size-12 rounded-xl bg-success/10 text-success flex items-center justify-center">
                    <FileSpreadsheet className="size-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{file.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      ชีต "{parsed.sheetName}" · {parsed.rows.length} โครงการ · งบรวม {totalBudget.toLocaleString("th-TH")} บาท
                    </div>
                  </div>
                  <button onClick={reset} className="size-9 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition">
                    <X className="size-4" />
                  </button>
                </div>

                <div className="overflow-x-auto border-t border-border max-h-[320px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/60 backdrop-blur">
                      <tr className="text-left text-muted-foreground">
                        <th className="px-3 py-2 font-medium w-8">#</th>
                        <th className="px-3 py-2 font-medium">ชื่อโครงการ</th>
                        <th className="px-3 py-2 font-medium">หน่วยงาน</th>
                        <th className="px-3 py-2 font-medium">Plan</th>
                        {YEARS.map((y) => <th key={y} className="px-3 py-2 font-medium text-right">{y}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.rows.slice(0, 50).map((r, i) => (
                        <tr key={i} className="border-t border-border/40 hover:bg-muted/30">
                          <td className="px-3 py-1.5 text-muted-foreground tabular">{i + 1}</td>
                          <td className="px-3 py-1.5 max-w-[240px] truncate">{r.name}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{r.department || "-"}</td>
                          <td className="px-3 py-1.5 tabular">{r.plan_id ?? "-"}</td>
                          {YEARS.map((y) => (
                            <td key={y} className="px-3 py-1.5 text-right tabular">{r.budgets[y] ? r.budgets[y].toLocaleString("th-TH") : "-"}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsed.rows.length > 50 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground text-center border-t border-border/40">
                      แสดง 50 แถวแรกจากทั้งหมด {parsed.rows.length} แถว
                    </div>
                  )}
                </div>

                {parsed.warnings.length > 0 && (
                  <div className="p-4 border-t border-border bg-amber-50/50 dark:bg-amber-950/20">
                    <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400 mb-1.5">
                      <AlertTriangle className="size-3.5" /> {parsed.warnings.length} คำเตือน
                    </div>
                    <ul className="text-xs text-amber-800/70 dark:text-amber-300/60 space-y-0.5 max-h-24 overflow-y-auto">
                      {parsed.warnings.map((w, i) => <li key={i}>• {w}</li>)}
                    </ul>
                  </div>
                )}

                {!result && (
                  <div className="p-5 border-t border-border">
                    <Button onClick={startImport} disabled={importMutation.isPending} className="w-full gap-2">
                      {importMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                      {importMutation.isPending ? "กำลังนำเข้า..." : `นำเข้า ${parsed.rows.length} โครงการ`}
                    </Button>
                  </div>
                )}

                {result && (
                  <div className="p-5 border-t border-border space-y-3">
                    {result.inserted > 0 && (
                      <div className="rounded-lg bg-success/10 border border-success/20 p-4 flex items-start gap-3">
                        <CheckCircle2 className="size-5 text-success shrink-0 mt-0.5" />
                        <div>
                          <div className="font-medium text-success">นำเข้าสำเร็จ</div>
                          <div className="text-sm text-foreground/80 mt-0.5">
                            เพิ่มโครงการใหม่ <span className="font-semibold tabular">{result.inserted}</span> โครงการ
                          </div>
                        </div>
                      </div>
                    )}
                    {result.errors.length > 0 && (
                      <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-destructive mb-1.5">
                          <AlertCircle className="size-4" /> พบข้อผิดพลาด {result.errors.length} รายการ
                        </div>
                        <ul className="text-xs text-destructive/70 space-y-0.5 max-h-32 overflow-y-auto">
                          {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
                        </ul>
                      </div>
                    )}
                    <Button variant="outline" onClick={reset} className="w-full">
                      นำเข้าไฟล์ใหม่
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="space-y-5">
            <div className="bg-card rounded-2xl border border-border p-5 shadow-soft">
              <h3 className="text-sm font-semibold">โครงสร้างไฟล์ที่รองรับ</h3>
              <p className="text-xs text-muted-foreground mt-1">แต่ละแถวแทนหนึ่งโครงการ คอลัมน์เรียงตามลำดับ:</p>
              <ol className="mt-3 space-y-2 text-sm">
                {[
                  "ชื่อโครงการ",
                  "หน่วยงานรับผิดชอบ",
                  "รหัสแผนงาน (plan_id)",
                  "งบประมาณปี 2566",
                  "งบประมาณปี 2567",
                  "งบประมาณปี 2568",
                  "งบประมาณปี 2569",
                  "งบประมาณปี 2570",
                ].map((label, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="size-6 rounded-md bg-muted text-muted-foreground text-xs font-semibold flex items-center justify-center tabular">{i + 1}</span>
                    <span className="text-foreground/85">{label}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="bg-gold/10 ring-1 ring-gold/20 rounded-2xl p-5">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="size-4 text-gold-foreground" /> ข้อควรระวัง
              </h3>
              <ul className="mt-2 text-xs text-foreground/80 space-y-1.5 list-disc pl-5">
                <li>ระบบจะข้ามแถวว่างและแถวที่ไม่มีชื่อโครงการ</li>
                <li>plan_id ต้องเป็นตัวเลข หากไม่ถูกต้องโครงการจะไม่ถูกผูกกับแผนงาน</li>
                <li>งบประมาณต้องเป็นตัวเลข 0 หรือมากกว่า</li>
                <li>การนำเข้าจะเพิ่มข้อมูลใหม่ ไม่ได้แก้ไขข้อมูลเดิม</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
