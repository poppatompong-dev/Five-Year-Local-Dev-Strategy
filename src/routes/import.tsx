import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download, X } from "lucide-react";

export const Route = createFileRoute("/import")({
  head: () => ({
    meta: [
      { title: "นำเข้าข้อมูล · แผนพัฒนาท้องถิ่น" },
      { name: "description", content: "นำเข้าข้อมูลโครงการจากไฟล์ Excel เข้าสู่ระบบบริหารแผนพัฒนาท้องถิ่น" },
    ],
  }),
  component: ImportPage,
});

function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [imported, setImported] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File | null) {
    if (!f) return;
    if (!/\.(xlsx|xls)$/i.test(f.name)) {
      setStatus("error");
      return;
    }
    setFile(f);
    setStatus("idle");
  }

  function startImport() {
    if (!file) return;
    setStatus("uploading");
    setTimeout(() => {
      setImported(Math.floor(Math.random() * 80) + 20);
      setStatus("success");
    }, 1600);
  }

  function reset() {
    setFile(null);
    setStatus("idle");
    setImported(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">การจัดการข้อมูล</div>
          <h1 className="text-3xl font-semibold tracking-tight mt-1">นำเข้าข้อมูลจาก Excel</h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            อัปโหลดไฟล์ Excel (.xlsx) เพื่อนำเข้าโครงการและงบประมาณรายปีเข้าสู่ระบบ
            ระบบจะตรวจสอบโครงสร้างข้อมูลและรายงานผลการนำเข้า
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFile(e.dataTransfer.files[0]);
              }}
              className={[
                "bg-card rounded-2xl border-2 border-dashed p-10 text-center transition-all",
                dragOver
                  ? "border-primary bg-primary-soft/40"
                  : "border-border hover:border-primary/40",
              ].join(" ")}
            >
              <div className="size-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mx-auto">
                <Upload className="size-7" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">ลากและวางไฟล์ที่นี่</h3>
              <p className="text-sm text-muted-foreground mt-1">หรือคลิกเพื่อเลือกไฟล์จากเครื่องของคุณ</p>
              <p className="text-xs text-muted-foreground mt-3">รองรับเฉพาะไฟล์ .xlsx ขนาดไม่เกิน 10 MB</p>
              <button
                onClick={() => inputRef.current?.click()}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:bg-primary/90 transition"
              >
                <FileSpreadsheet className="size-4" />
                เลือกไฟล์ Excel
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {file && (
              <div className="bg-card rounded-2xl border border-border p-5 shadow-soft">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-xl bg-success/10 text-success flex items-center justify-center">
                    <FileSpreadsheet className="size-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{file.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {(file.size / 1024).toLocaleString("th-TH", { maximumFractionDigits: 1 })} KB
                    </div>
                  </div>
                  <button
                    onClick={reset}
                    className="size-9 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {status === "idle" && (
                  <button
                    onClick={startImport}
                    className="mt-4 w-full rounded-lg bg-emerald-gradient text-primary-foreground px-4 py-3 text-sm font-medium hover:brightness-105 transition"
                  >
                    เริ่มนำเข้าข้อมูล
                  </button>
                )}

                {status === "uploading" && (
                  <div className="mt-4">
                    <div className="text-sm text-muted-foreground mb-2">กำลังนำเข้าข้อมูล...</div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-emerald-gradient animate-pulse" style={{ width: "60%" }} />
                    </div>
                  </div>
                )}

                {status === "success" && (
                  <div className="mt-4 rounded-lg bg-success/10 border border-success/20 p-4 flex items-start gap-3">
                    <CheckCircle2 className="size-5 text-success shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-success">นำเข้าข้อมูลสำเร็จ</div>
                      <div className="text-sm text-foreground/80 mt-0.5">
                        นำเข้าโครงการใหม่จำนวน <span className="font-semibold tabular">{imported}</span> โครงการ
                      </div>
                    </div>
                  </div>
                )}

                {status === "error" && (
                  <div className="mt-4 rounded-lg bg-destructive/10 border border-destructive/20 p-4 flex items-start gap-3">
                    <AlertCircle className="size-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-destructive">รูปแบบไฟล์ไม่ถูกต้อง</div>
                      <div className="text-sm text-foreground/80 mt-0.5">กรุณาเลือกไฟล์ .xlsx เท่านั้น</div>
                    </div>
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
                    <span className="size-6 rounded-md bg-muted text-muted-foreground text-xs font-semibold flex items-center justify-center tabular">
                      {i + 1}
                    </span>
                    <span className="text-foreground/85">{label}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="bg-card rounded-2xl border border-border p-5 shadow-soft">
              <h3 className="text-sm font-semibold">เทมเพลตตัวอย่าง</h3>
              <p className="text-xs text-muted-foreground mt-1">
                ดาวน์โหลดเทมเพลต Excel เพื่อใช้เป็นแบบฟอร์มในการบันทึกข้อมูลก่อนนำเข้า
              </p>
              <button className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background hover:bg-muted px-4 py-2.5 text-sm font-medium transition">
                <Download className="size-4" />
                ดาวน์โหลดเทมเพลต
              </button>
            </div>

            <div className="bg-gold/10 ring-1 ring-gold/20 rounded-2xl p-5">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="size-4 text-gold-foreground" />
                ข้อควรระวัง
              </h3>
              <ul className="mt-2 text-xs text-foreground/80 space-y-1.5 list-disc pl-5">
                <li>ระบบจะข้ามแถวที่ไม่มีชื่อโครงการ</li>
                <li>หากรหัสแผนงานไม่ถูกต้อง โครงการจะไม่ถูกผูกกับยุทธศาสตร์</li>
                <li>การนำเข้าจะเพิ่มข้อมูลใหม่ ไม่ได้แก้ไขข้อมูลเดิม</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
