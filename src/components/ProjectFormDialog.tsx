import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  strategies,
  plans,
  tactics,
  DEPARTMENTS,
  YEARS,
  STATUS_LABEL,
  type Status,
} from "@/lib/mock-data";
import type { ProjectCreateInput, ProjectDetail } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProjectCreateInput) => Promise<void>;
  initialData?: ProjectDetail | null;
  isSubmitting?: boolean;
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isSubmitting,
}: ProjectFormDialogProps) {
  const isEdit = !!initialData;

  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [target, setTarget] = useState("");
  const [kpi, setKpi] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [department, setDepartment] = useState("");
  const [strategyId, setStrategyId] = useState<number | "">("");
  const [planId, setPlanId] = useState<number | "">("");
  const [status, setStatus] = useState<Status>("planning");
  const [budgets, setBudgets] = useState<Record<number, string>>({});

  useEffect(() => {
    if (open && initialData) {
      setName(initialData.name || "");
      setObjective(initialData.objective || "");
      setTarget(initialData.target || "");
      setKpi(initialData.kpi || "");
      setExpectedResult(initialData.expected_result || "");
      setDepartment(initialData.department || "");
      setStatus(initialData.status || "planning");
      setPlanId(initialData.plan_id || "");
      if (initialData.strategy) setStrategyId(initialData.strategy.id);
      const b: Record<number, string> = {};
      YEARS.forEach((y) => {
        b[y] = initialData.budgets[y] ? String(initialData.budgets[y]) : "";
      });
      setBudgets(b);
    } else if (open && !initialData) {
      setName("");
      setObjective("");
      setTarget("");
      setKpi("");
      setExpectedResult("");
      setDepartment("");
      setStrategyId("");
      setPlanId("");
      setStatus("planning");
      setBudgets({});
    }
  }, [open, initialData]);

  const availablePlans = strategyId
    ? plans.filter(
        (p) =>
          tactics.find((t) => t.id === p.tactic_id)?.strategy_id === strategyId
      )
    : plans;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedBudgets: Record<number, number> = {};
    YEARS.forEach((y) => {
      const val = parseFloat((budgets[y] || "0").replace(/,/g, ""));
      if (!isNaN(val) && val > 0) parsedBudgets[y] = val;
    });

    await onSubmit({
      name: name.trim(),
      objective: objective.trim() || undefined,
      target: target.trim() || undefined,
      kpi: kpi.trim() || undefined,
      expected_result: expectedResult.trim() || undefined,
      department: department || undefined,
      plan_id: planId || null,
      status,
      budgets: parsedBudgets,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "แก้ไขโครงการ" : "เพิ่มโครงการใหม่"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              ชื่อโครงการ <span className="text-destructive">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="ระบุชื่อโครงการ"
              className="w-full bg-muted/50 border border-border rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground ring-focus"
            />
          </div>

          {/* Strategy + Plan row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                ยุทธศาสตร์
              </label>
              <select
                value={strategyId}
                onChange={(e) => {
                  const v = e.target.value;
                  setStrategyId(v ? Number(v) : "");
                  setPlanId("");
                }}
                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm ring-focus"
              >
                <option value="">— เลือกยุทธศาสตร์ —</option>
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id}. {s.short_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                แผนงาน
              </label>
              <select
                value={planId}
                onChange={(e) =>
                  setPlanId(e.target.value ? Number(e.target.value) : "")
                }
                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm ring-focus"
              >
                <option value="">— เลือกแผนงาน —</option>
                {availablePlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Department + Status row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                หน่วยงาน
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm ring-focus"
              >
                <option value="">— เลือกหน่วยงาน —</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                สถานะ
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm ring-focus"
              >
                {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Objective */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              วัตถุประสงค์
            </label>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              rows={3}
              placeholder="ระบุวัตถุประสงค์ของโครงการ"
              className="w-full bg-muted/50 border border-border rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground ring-focus resize-none"
            />
          </div>

          {/* Target + KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                เป้าหมาย
              </label>
              <textarea
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                rows={2}
                placeholder="ระบุเป้าหมาย"
                className="w-full bg-muted/50 border border-border rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground ring-focus resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                ตัวชี้วัด (KPI)
              </label>
              <textarea
                value={kpi}
                onChange={(e) => setKpi(e.target.value)}
                rows={2}
                placeholder="ระบุตัวชี้วัด"
                className="w-full bg-muted/50 border border-border rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground ring-focus resize-none"
              />
            </div>
          </div>

          {/* Expected Result */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              ผลที่คาดว่าจะได้รับ
            </label>
            <textarea
              value={expectedResult}
              onChange={(e) => setExpectedResult(e.target.value)}
              rows={2}
              placeholder="ระบุผลที่คาดว่าจะได้รับ"
              className="w-full bg-muted/50 border border-border rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground ring-focus resize-none"
            />
          </div>

          {/* Budget per year */}
          <div>
            <label className="block text-sm font-medium mb-2">
              งบประมาณรายปี (บาท)
            </label>
            <div className="grid grid-cols-5 gap-3">
              {YEARS.map((y) => (
                <div key={y}>
                  <div className="text-xs text-muted-foreground text-center mb-1">
                    ปี {y}
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={budgets[y] || ""}
                    onChange={(e) =>
                      setBudgets((prev) => ({
                        ...prev,
                        [y]: e.target.value.replace(/[^\d.,]/g, ""),
                      }))
                    }
                    placeholder="0"
                    className="w-full bg-muted/50 border border-border rounded-lg px-2.5 py-2 text-sm text-center tabular ring-focus"
                  />
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "บันทึกการเปลี่ยนแปลง" : "เพิ่มโครงการ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
