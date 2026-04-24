import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DEPARTMENTS, YEARS } from "@/lib/mock-data";
import type { EquipmentCreateInput, DBEquipment } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface EquipmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: EquipmentCreateInput) => Promise<void>;
  initialData?: DBEquipment | null;
  isSubmitting?: boolean;
}

export function EquipmentFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isSubmitting,
}: EquipmentFormDialogProps) {
  const isEdit = !!initialData;

  const [planName, setPlanName] = useState("");
  const [category, setCategory] = useState("");
  const [itemType, setItemType] = useState("");
  const [target, setTarget] = useState("");
  const [department, setDepartment] = useState("");
  const [budgets, setBudgets] = useState<Record<number, string>>({});

  useEffect(() => {
    if (open && initialData) {
      setPlanName(initialData.plan_name || "");
      setCategory(initialData.category || "");
      setItemType(initialData.item_type || "");
      setTarget(initialData.target || "");
      setDepartment(initialData.department || "");
      const b: Record<number, string> = {};
      YEARS.forEach((y) => {
        const key = `budget_${y}` as keyof DBEquipment;
        const val = initialData[key];
        b[y] = val && Number(val) > 0 ? String(val) : "";
      });
      setBudgets(b);
    } else if (open && !initialData) {
      setPlanName("");
      setCategory("");
      setItemType("");
      setTarget("");
      setDepartment("");
      setBudgets({});
    }
  }, [open, initialData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!itemType.trim()) return;

    const parseBudget = (s: string) => {
      const v = parseFloat((s || "0").replace(/,/g, ""));
      return isNaN(v) ? 0 : v;
    };

    await onSubmit({
      plan_name: planName.trim() || undefined,
      category: category.trim() || undefined,
      item_type: itemType.trim(),
      target: target.trim() || undefined,
      department: department || undefined,
      budget_2566: parseBudget(budgets[2566] || ""),
      budget_2567: parseBudget(budgets[2567] || ""),
      budget_2568: parseBudget(budgets[2568] || ""),
      budget_2569: parseBudget(budgets[2569] || ""),
      budget_2570: parseBudget(budgets[2570] || ""),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "แก้ไขครุภัณฑ์" : "เพิ่มครุภัณฑ์ใหม่"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Item Type */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              ประเภทครุภัณฑ์ <span className="text-destructive">*</span>
            </label>
            <input
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
              required
              placeholder="ระบุประเภทครุภัณฑ์"
              className="w-full bg-muted/50 border border-border rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground ring-focus"
            />
          </div>

          {/* Plan Name + Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                แผนงาน
              </label>
              <input
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="ระบุแผนงาน"
                className="w-full bg-muted/50 border border-border rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground ring-focus"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                หมวด
              </label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="ระบุหมวด"
                className="w-full bg-muted/50 border border-border rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground ring-focus"
              />
            </div>
          </div>

          {/* Target + Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                เป้าหมาย
              </label>
              <input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="ระบุเป้าหมาย"
                className="w-full bg-muted/50 border border-border rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground ring-focus"
              />
            </div>
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
            <Button type="submit" disabled={isSubmitting || !itemType.trim()}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "บันทึกการเปลี่ยนแปลง" : "เพิ่มครุภัณฑ์"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
