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
    (s, e) => s + e.budget_2566 + e.budget_2567 + e.budget_2568 + e.budget_2569 + e.budget_2570,
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MiniStat label="รายการทั้งหมด" value={totalCount.toString()} icon={<Package className="size-4" />} />
          <MiniStat
            label="งบประมาณหน้านี้"
            value={formatBaht(totalBudget, { compact: true })}
            sub="บาท"
            icon={<Package className="size-4" />}
          />
          <MiniStat
            label="แสดงหน้า"
            value={`${safePage} / ${totalPages}`}
            icon={<Wrench className="size-4" />}
          />
          <MiniStat
            label="รายการทั้งหมด"
            value={totalCount.toString()}
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
                  const total = e.budget_2566 + e.budget_2567 + e.budget_2568 + e.budget_2569 + e.budget_2570;
                  return (
                    <tr key={e.id} className="border-b border-border/50 hover:bg-muted/40 transition group">
                      <td className="px-5 py-4 max-w-[300px]">
                        <div className="font-medium">{e.item_type}</div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs">
                          <span className="rounded bg-primary-soft text-primary px-2 py-0.5">{e.category}</span>
                          <span className="text-muted-foreground truncate">{e.target}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-foreground/80">{e.department}</td>
                      {([e.budget_2566, e.budget_2567, e.budget_2568, e.budget_2569, e.budget_2570] as const).map(
                        (b, i) => (
                          <td key={i} className="px-3 py-4 text-right tabular text-sm">
                            {b > 0 ? (
                              b.toLocaleString("th-TH")
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>
                        ),
                      )}
                      <td className="px-5 py-4 text-right tabular font-semibold text-primary">
                        {total.toLocaleString("th-TH")}
                      </td>
                      <td className="px-3 py-4">
                        {isLoggedIn && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={() => setEditItem(e)}
                              className="size-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition"
                              title="แก้ไข"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              onClick={() => {
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
      </div>
    </AppLayout>
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
