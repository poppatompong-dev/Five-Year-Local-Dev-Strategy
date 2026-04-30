import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import {
  strategies,
  plans,
  tactics,
  DEPARTMENTS,
  YEARS,
  STATUS_LABEL,
  formatBaht,
  type Status,
} from "@/lib/mock-data";
import { apiGetProjects, apiCreateProject, apiDeleteProject, apiLogAudit, apiBulkPatchProjectStatus, type ProjectCreateInput } from "@/lib/api";
import { toast } from "sonner";
import { ProjectFormDialog } from "@/components/ProjectFormDialog";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { exportProjectsToExcel } from "@/lib/export";
import { Search, Filter, ChevronLeft, ChevronRight, X, ArrowUpDown, Plus, Trash2, Download, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "โครงการทั้งหมด · แผนพัฒนาท้องถิ่น" },
      { name: "description", content: "รายการโครงการทั้งหมดในแผนพัฒนาท้องถิ่น พร้อมตัวกรองตามยุทธศาสตร์ หน่วยงาน สถานะ และปีงบประมาณ" },
    ],
  }),
  component: ProjectsPage,
});

const PAGE_SIZE = 12;

function ProjectsPage() {
  const { isLoggedIn } = useAuth();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [strategyId, setStrategyId] = useState<number | "">("");
  const [planId, setPlanId] = useState<number | "">("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState<Status | "">("");
  const [year, setYear] = useState<number | "">("");
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const qc = useQueryClient();

  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: number[]; status: Status }) => apiBulkPatchProjectStatus(ids, status),
    onSuccess: (r, vars) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setSelectedIds(new Set());
      toast.success(`อัปเดตสถานะ ${r.updated} โครงการแล้ว`, { icon: "✅" });
      apiLogAudit({ action: "status_change", entity: "project", after: { ids: vars.ids, status: vars.status } }).catch(() => {});
    },
    onError: (err) => toast.error(`อัปเดตไม่สำเร็จ: ${err.message}`),
  });

  const createMutation = useMutation({
    mutationFn: (data: ProjectCreateInput) => apiCreateProject(data),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setCreateOpen(false);
      toast.success("เพิ่มโครงการสำเร็จ", { icon: "✅" });
      apiLogAudit({ action: "create", entity: "project", after: variables }).catch(() => {});
    },
    onError: (err) => {
      toast.error(`เพิ่มโครงการไม่สำเร็จ: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDeleteProject(id),
    onSuccess: (_r, id) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setDeleteId(null);
      toast.success("ลบโครงการแล้ว", { icon: "🗑️" });
      apiLogAudit({ action: "delete", entity: "project", entity_id: id }).catch(() => {});
    },
    onError: (err) => {
      toast.error(`ลบโครงการไม่สำเร็จ: ${err.message}`);
    },
  });

  const availablePlans = strategyId
    ? plans.filter((p) => tactics.find((t) => t.id === p.tactic_id)?.strategy_id === strategyId)
    : plans;

  const { data: result, isLoading } = useQuery({
    queryKey: ["projects", { debouncedSearch, strategyId, planId, department, status, year, page }],
    queryFn: () =>
      apiGetProjects({
        search: debouncedSearch || undefined,
        strategy_id: strategyId || undefined,
        plan_id: planId || undefined,
        department: department || undefined,
        status: (status as Status) || undefined,
        year: (year as number) || undefined,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const pageItems = result?.data ?? [];
  const totalPages = result?.totalPages ?? 1;
  const safePage = page;
  const totalFiltered = result?.total ?? 0;
  const totalBudget = pageItems.reduce((s, p) => s + p.total_budget, 0);

  const hasFilters = strategyId || planId || department || status || year || search;

  function handleSearchChange(val: string) {
    setSearch(val);
    setPage(1);
    clearTimeout((handleSearchChange as any)._t);
    (handleSearchChange as any)._t = setTimeout(() => setDebouncedSearch(val), 400);
  }

  function clearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setStrategyId("");
    setPlanId("");
    setDepartment("");
    setStatus("");
    setYear("");
    setPage(1);
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">รายการโครงการ</div>
            <h1 className="text-3xl font-semibold tracking-tight mt-1">โครงการทั้งหมด</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isLoading ? "กำลังโหลด..." : (
                <>พบ <span className="font-medium text-foreground tabular">{totalFiltered.toLocaleString("th-TH")}</span> โครงการ ·
                งบประมาณหน้านี้ <span className="font-medium text-foreground tabular">{formatBaht(totalBudget)} บาท</span></>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (pageItems.length > 0) {
                  exportProjectsToExcel(pageItems, `projects-${new Date().toISOString().slice(0, 10)}.xlsx`);
                  toast.success("ส่งออกไฟล์ Excel แล้ว", { icon: "📄" });
                }
              }}
              disabled={pageItems.length === 0}
              className="gap-1.5"
            >
              <Download className="size-4" /> ส่งออก
            </Button>
            {isLoggedIn && (
              <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
                <Plus className="size-4" /> เพิ่มโครงการ
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-2xl border border-border p-4 lg:p-5 shadow-soft">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="ค้นหาชื่อโครงการ หน่วยงาน วัตถุประสงค์..."
                className="w-full bg-muted/50 border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground ring-focus"
              />
            </div>
            <Select
              value={strategyId}
              onChange={(v) => {
                setStrategyId(v as number | "");
                setPlanId("");
                setPage(1);
              }}
              placeholder="ยุทธศาสตร์ทั้งหมด"
              options={strategies.map((s) => ({ value: s.id, label: `${s.id}. ${s.short_name}` }))}
            />
            <Select
              value={planId}
              onChange={(v) => {
                setPlanId(v as number | "");
                setPage(1);
              }}
              placeholder="แผนงาน"
              options={availablePlans.map((p) => ({ value: p.id, label: p.name }))}
            />
            <Select
              value={department}
              onChange={(v) => {
                setDepartment(v as string);
                setPage(1);
              }}
              placeholder="หน่วยงาน"
              options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
            />
            <Select
              value={status}
              onChange={(v) => {
                setStatus(v as Status | "");
                setPage(1);
              }}
              placeholder="สถานะ"
              options={(Object.keys(STATUS_LABEL) as Status[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
            />
            <Select
              value={year}
              onChange={(v) => {
                setYear(v as number | "");
                setPage(1);
              }}
              placeholder="ปีงบประมาณ"
              options={YEARS.map((y) => ({ value: y, label: `พ.ศ. ${y}` }))}
            />
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-muted transition"
              >
                <X className="size-3.5" /> ล้างตัวกรอง
              </button>
            )}
          </div>
        </div>

        {/* Bulk toolbar (admin only) */}
        {isLoggedIn && selectedIds.size > 0 && (
          <div className="bg-primary/5 border border-primary/30 rounded-xl px-4 py-2.5 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckSquare className="size-4 text-primary" />
              เลือก {selectedIds.size} โครงการ
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-muted-foreground">ปรับสถานะเป็น:</span>
              <select
                onChange={(e) => {
                  const v = e.target.value as Status;
                  if (v) {
                    bulkStatusMutation.mutate({ ids: [...selectedIds], status: v });
                    e.target.value = "";
                  }
                }}
                disabled={bulkStatusMutation.isPending}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                defaultValue=""
              >
                <option value="" disabled>เลือกสถานะ...</option>
                <option value="not_set">ยังไม่ได้ปรับสถานะ</option>
                <option value="planning">วางแผน</option>
                <option value="in_progress">ดำเนินการ</option>
                <option value="completed">เสร็จสิ้น</option>
                <option value="cancelled">ยกเลิก</option>
              </select>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                ยกเลิก
              </Button>
            </div>
          </div>
        )}

        {/* Project list */}
        <div className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground bg-muted/30 border-b border-border">
                  {isLoggedIn && (
                    <th className="px-3 py-3.5 w-10">
                      <input
                        type="checkbox"
                        className="size-4 cursor-pointer"
                        checked={pageItems.length > 0 && pageItems.every((p) => selectedIds.has(p.id))}
                        onChange={(e) => {
                          const next = new Set(selectedIds);
                          if (e.target.checked) pageItems.forEach((p) => next.add(p.id));
                          else pageItems.forEach((p) => next.delete(p.id));
                          setSelectedIds(next);
                        }}
                      />
                    </th>
                  )}
                  <th className="px-5 py-3.5 font-medium">โครงการ</th>
                  <th className="px-5 py-3.5 font-medium">หน่วยงาน</th>
                  <th className="px-5 py-3.5 font-medium">ยุทธศาสตร์</th>
                  <th className="px-5 py-3.5 font-medium text-right">
                    <span className="inline-flex items-center gap-1">
                      งบประมาณ {year ? `(${year})` : "(รวม)"} <ArrowUpDown className="size-3" />
                    </span>
                  </th>
                  <th className="px-5 py-3.5 font-medium">สถานะ</th>
                  <th className="px-3 py-3.5 font-medium w-12"></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={isLoggedIn ? 7 : 6} className="px-5 py-16 text-center text-muted-foreground">
                      <Filter className="size-8 mx-auto mb-2 opacity-40" />
                      ไม่พบโครงการที่ตรงกับเงื่อนไข
                    </td>
                  </tr>
                ) : (
                  pageItems.map((p) => {
                    const budget = p.total_budget;
                    return (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-muted/40 transition group">
                        {isLoggedIn && (
                          <td className="px-3 py-4">
                            <input
                              type="checkbox"
                              className="size-4 cursor-pointer"
                              checked={selectedIds.has(p.id)}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const next = new Set(selectedIds);
                                if (e.target.checked) next.add(p.id);
                                else next.delete(p.id);
                                setSelectedIds(next);
                              }}
                            />
                          </td>
                        )}
                        <td className="px-5 py-4 max-w-[420px]">
                          <Link
                            to="/projects/$projectId"
                            params={{ projectId: String(p.id) }}
                            className="font-medium line-clamp-2 group-hover:text-primary transition"
                          >
                            {p.name}
                          </Link>
                          {p.tactic_code && (
                            <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1.5">
                              <span className="inline-flex items-center justify-center size-4 rounded bg-primary-soft text-primary text-[10px] font-semibold">
                                {p.tactic_code}
                              </span>
                              <span className="truncate">{p.plan_name}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 text-foreground/80">{p.department}</td>
                        <td className="px-5 py-4">
                          {p.strategy_name && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs">
                              <span className="size-1.5 rounded-full bg-primary" />
                              {p.strategy_name}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right tabular font-medium">
                          {budget > 0 ? formatBaht(budget) : <span className="text-muted-foreground/60">—</span>}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="px-3 py-4">
                          {isLoggedIn && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteId(p.id);
                                setDeleteName(p.name);
                              }}
                              className="size-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition opacity-0 group-hover:opacity-100"
                              title="ลบโครงการ"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-border">
              <div className="text-xs text-muted-foreground">
                แสดง {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, totalFiltered)} จาก {totalFiltered}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="size-8 rounded-md border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:hover:bg-background flex items-center justify-center transition"
                >
                  <ChevronLeft className="size-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let n: number;
                  if (totalPages <= 7) n = i + 1;
                  else if (safePage <= 4) n = i + 1;
                  else if (safePage >= totalPages - 3) n = totalPages - 6 + i;
                  else n = safePage - 3 + i;
                  return (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={[
                        "size-8 rounded-md text-sm font-medium transition tabular",
                        n === safePage
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted",
                      ].join(" ")}
                    >
                      {n}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="size-8 rounded-md border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:hover:bg-background flex items-center justify-center transition"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
        {/* Create Project Dialog */}
        <ProjectFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSubmit={async (data) => { await createMutation.mutateAsync(data); }}
          isSubmitting={createMutation.isPending}
        />

        {/* Delete Confirmation */}
        <DeleteConfirmDialog
          open={deleteId !== null}
          onOpenChange={(open) => { if (!open) setDeleteId(null); }}
          onConfirm={async () => { if (deleteId) await deleteMutation.mutateAsync(deleteId); }}
          title="ลบโครงการ"
          description={`คุณต้องการลบโครงการ "${deleteName}" หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`}
          isDeleting={deleteMutation.isPending}
        />
      </div>
    </AppLayout>
  );
}

function Select<T extends string | number>({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: T | "";
  onChange: (v: T | "") => void;
  placeholder: string;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "") onChange("");
        else if (typeof options[0]?.value === "number") onChange(Number(v) as T);
        else onChange(v as T);
      }}
      className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm ring-focus min-w-[160px] cursor-pointer"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={String(o.value)} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
