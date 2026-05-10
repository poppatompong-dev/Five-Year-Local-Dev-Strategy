import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { formatBaht, YEARS } from "@/lib/mock-data";
import { apiGetEquipment, apiCreateEquipment, apiUpdateEquipment, apiDeleteEquipment, type EquipmentCreateInput, type DBEquipment } from "@/lib/api";
import { EquipmentFormDialog } from "@/components/EquipmentFormDialog";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight, Wrench, Package, Plus, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/equipment")({
  head: () => ({
    meta: [
      { title: "บัญชีครุภัณฑ์ · แผนพัฒนาท้องถิ่น" },
      { name: "description", content: "บัญชีครุภัณฑ์ในแผนพัฒนาท้องถิ่น พร้อมงบประมาณรายปี 5 ปี" },
    ],
  }),
  component: EquipmentPage,
});

const PAGE_SIZE = 10;

function EquipmentPage() {
  const { isLoggedIn } = useAuth();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<DBEquipment | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState("");
  const [detailItem, setDetailItem] = useState<DBEquipment | null>(null);

  const qc = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: EquipmentCreateInput) => apiCreateEquipment(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["equipment"] });
      setCreateOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: EquipmentCreateInput }) => apiUpdateEquipment(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["equipment"] });
      setEditItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDeleteEquipment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["equipment"] });
      setDeleteId(null);
    },
  });

  const { data: result, isLoading } = useQuery({
    queryKey: ["equipment", { debouncedSearch, page }],
    queryFn: () => apiGetEquipment({ search: debouncedSearch || undefined, page, limit: PAGE_SIZE }),
  });

  const items = result?.data ?? [];
  const totalPages = result?.totalPages ?? 1;
  const safePage = page;
  const totalCount = result?.total ?? 0;

  const totalBudget = items.reduce(
    (s, e) => s + Number(e.budget_2566) + Number(e.budget_2567) + Number(e.budget_2568) + Number(e.budget_2569) + Number(e.budget_2570),
    0,
  );

  function handleSearchChange(val: string) {
    setSearch(val);
    setPage(1);
    clearTimeout((handleSearchChange as any)._t);
    (handleSearchChange as any)._t = setTimeout(() => setDebouncedSearch(val), 400);
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">บัญชีครุภัณฑ์ (ผ.03)</div>
            <h1 className="text-3xl font-semibold tracking-tight mt-1">รายการครุภัณฑ์</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isLoading ? "กำลังโหลด..." : `${totalCount.toLocaleString("th-TH")} รายการ`}
            </p>
          </div>
          {isLoggedIn && (
            <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
              <Plus className="size-4" /> เพิ่มครุภัณฑ์
            </Button>
          )}
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MiniStat
            label="รายการทั้งหมด"
            value={totalCount.toLocaleString("th-TH")}
            sub="รายการ"
            icon={<Package className="size-4" />}
          />
          <MiniStat
            label="งบประมาณหน้านี้"
            value={formatBaht(totalBudget, { compact: true })}
            sub="บาท"
            icon={<Wrench className="size-4" />}
          />
          <MiniStat
            label="แสดงหน้า"
            value={`${safePage} / ${totalPages}`}
            icon={<Wrench className="size-4" />}
          />
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="ค้นหาครุภัณฑ์ หมวด หน่วยงาน..."
                className="w-full bg-muted/50 border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground ring-focus"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground bg-muted/30 border-b border-border">
                  <th className="px-5 py-3.5 font-medium">ครุภัณฑ์</th>
                  <th className="px-5 py-3.5 font-medium">หน่วยงาน</th>
                  {YEARS.map((y) => (
                    <th key={y} className="px-3 py-3.5 font-medium text-right">
                      ปี {y}
                    </th>
                  ))}
                  <th className="px-5 py-3.5 font-medium text-right">รวม</th>
                  <th className="px-3 py-3.5 font-medium w-20"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((e) => {
                  const budgets = [Number(e.budget_2566), Number(e.budget_2567), Number(e.budget_2568), Number(e.budget_2569), Number(e.budget_2570)];
                  const total = budgets.reduce((a, b) => a + b, 0);
                  return (
                    <tr
                      key={e.id}
                      className="border-b border-border/50 hover:bg-muted/40 transition group cursor-pointer"
                      onClick={() => setDetailItem(e)}
                    >
                      <td className="px-5 py-4 max-w-[300px]">
                        <button
                          type="button"
                          className="font-medium text-left hover:text-primary transition"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDetailItem(e);
                          }}
                        >
                          {e.item_type}
                        </button>
                        <div className="mt-1 flex items-center gap-1.5 text-xs">
                          <span className="rounded bg-primary-soft text-primary px-2 py-0.5">{e.category}</span>
                          <span className="text-muted-foreground truncate">{e.target}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-foreground/80">{e.department}</td>
                      {budgets.map((b, i) => (
                        <td key={i} className="px-3 py-4 text-right tabular text-sm">
                          {b > 0 ? (
                            b.toLocaleString("th-TH")
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                      ))}
                      <td className="px-5 py-4 text-right tabular font-semibold text-primary">
                        {total.toLocaleString("th-TH")}
                      </td>
                      <td className="px-3 py-4">
                        {isLoggedIn && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                setEditItem(e);
                              }}
                              className="size-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition"
                              title="แก้ไข"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                setDeleteId(e.id);
                                setDeleteName(e.item_type || "");
                              }}
                              className="size-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                              title="ลบ"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-border">
              <div className="text-xs text-muted-foreground">
                แสดง {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, totalCount)} จาก {totalCount}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="size-8 rounded-md border border-border hover:bg-muted disabled:opacity-40 flex items-center justify-center"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="px-3 text-sm tabular">
                  {safePage} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="size-8 rounded-md border border-border hover:bg-muted disabled:opacity-40 flex items-center justify-center"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
        {/* Create Equipment Dialog */}
        <EquipmentFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSubmit={async (data) => { await createMutation.mutateAsync(data); }}
          isSubmitting={createMutation.isPending}
        />

        {/* Edit Equipment Dialog */}
        <EquipmentFormDialog
          open={editItem !== null}
          onOpenChange={(open) => { if (!open) setEditItem(null); }}
          onSubmit={async (data) => {
            if (editItem) await updateMutation.mutateAsync({ id: editItem.id, data });
          }}
          initialData={editItem}
          isSubmitting={updateMutation.isPending}
        />

        {/* Delete Confirmation */}
        <DeleteConfirmDialog
          open={deleteId !== null}
          onOpenChange={(open) => { if (!open) setDeleteId(null); }}
          onConfirm={async () => { if (deleteId) await deleteMutation.mutateAsync(deleteId); }}
          title="ลบครุภัณฑ์"
          description={`คุณต้องการลบ "${deleteName}" หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`}
          isDeleting={deleteMutation.isPending}
        />

        <EquipmentReadSheet
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onEdit={(item) => setEditItem(item)}
        />
      </div>
    </AppLayout>
  );
}

function EquipmentReadSheet({
  item,
  onClose,
  onEdit,
}: {
  item: DBEquipment | null;
  onClose: () => void;
  onEdit: (item: DBEquipment) => void;
}) {
  const { isLoggedIn } = useAuth();

  return (
    <Sheet open={item !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
        <div className="shrink-0 bg-background/95 backdrop-blur border-b border-border px-6 py-4">
          <SheetHeader>
            <SheetTitle className="text-base font-semibold pr-6 leading-snug">
              {item?.item_type ?? "รายละเอียดครุภัณฑ์"}
            </SheetTitle>
            <SheetDescription className="sr-only">
              แสดงรายละเอียดครุภัณฑ์ หมวด แผนงาน หน่วยงาน เป้าหมาย และงบประมาณรายปี
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {item && <EquipmentReadContent item={item} />}
        </div>

        {item && isLoggedIn && (
          <div className="shrink-0 bg-background/95 backdrop-blur border-t border-border px-6 py-4">
            <Button onClick={() => onEdit(item)} className="w-full gap-2">
              <Pencil className="size-4" />
              แก้ไขครุภัณฑ์
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function EquipmentReadContent({ item }: { item: DBEquipment }) {
  const budgetRows = YEARS.map((year) => {
    const key = `budget_${year}` as keyof DBEquipment;
    return { year, amount: Number(item[key] || 0) };
  });
  const total = budgetRows.reduce((sum, row) => sum + row.amount, 0);
  const max = Math.max(...budgetRows.map((row) => row.amount), 1);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-emerald-gradient p-5 text-primary-foreground">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-primary-foreground/70 mb-1">หมวดครุภัณฑ์</div>
            <div className="text-lg font-semibold leading-snug">{item.category || "ไม่ระบุหมวด"}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-primary-foreground/70">งบประมาณรวม</div>
            <div className="text-2xl font-bold tabular mt-0.5">
              {formatBaht(total, { compact: true })}
            </div>
            <div className="text-[11px] text-primary-foreground/60">บาท</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "แผนงาน", value: item.plan_name },
          { label: "หน่วยงาน", value: item.department },
          { label: "รหัสรายการ", value: `#${item.id}` },
          { label: "เป้าหมาย", value: item.target },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-muted/50 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</div>
            <div className="text-sm font-medium break-words">{value || "—"}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">งบประมาณรายปี</div>
        <div className="space-y-2.5">
          {budgetRows.map(({ year, amount }) => {
            const pct = (amount / max) * 100;
            return (
              <div key={year}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">ปี {year}</span>
                  <span className="font-medium tabular">
                    {amount > 0 ? `${formatBaht(amount)} บาท` : "—"}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-gradient transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">รายละเอียดรายการ</div>
        <p className="text-sm leading-relaxed text-foreground/85">
          {item.item_type || "ยังไม่มีรายละเอียดชื่อครุภัณฑ์"}
        </p>
      </div>
    </div>
  );
}

function MiniStat({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="size-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center">{icon}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <div className="text-xl font-semibold tabular">{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}
