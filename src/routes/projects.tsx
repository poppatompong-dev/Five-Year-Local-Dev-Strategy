import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { PublicDataNotice } from "@/components/PublicDataNotice";
import { StatusBadge } from "@/components/StatusBadge";
import {
  YEARS,
  STATUS_LABEL,
  formatBaht,
  type Status,
} from "@/lib/mock-data";
import {
  apiGetProjects,
  apiGetProject,
  apiCreateProject,
  apiUpdateProject,
  apiDeleteProject,
  apiPatchProjectStatus,
  apiBulkPatchProjectStatus,
  apiBulkPatchProjectStatusByFilter,
  apiGetProjectAnnotationLabels,
  apiGetStrategies,
  apiGetTactics,
  apiGetPlans,
  apiGetDepartments,
  ANNOTATION_TYPE_LABEL,
  type ProjectCreateInput,
  type ProjectDetail,
  type AnnotationType,
} from "@/lib/api";
import { toast } from "sonner";
import { ProjectFormDialog } from "@/components/ProjectFormDialog";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Search, Filter, ChevronLeft, ChevronRight, X, ArrowUpDown, Plus, Trash2, Download, CheckSquare, Loader2, ExternalLink, Pencil, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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

function getProjectRowTone(status: Status) {
  switch (status) {
    case "completed":
      return "border-l-success bg-success/5 hover:bg-success/10";
    case "in_progress":
      return "border-l-warning bg-warning/5 hover:bg-warning/10";
    case "planning":
      return "border-l-info bg-info/5 hover:bg-info/10";
    case "cancelled":
      return "border-l-destructive bg-destructive/5 hover:bg-destructive/10";
    default:
      return "border-l-muted-foreground/40 bg-muted/20 hover:bg-muted/40";
  }
}

function ProjectsPage() {
  const { isLoggedIn } = useAuth();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [annotationSearch, setAnnotationSearch] = useState("");
  const [debouncedAnnotationSearch, setDebouncedAnnotationSearch] = useState("");
  const [selectedAnnotationLabel, setSelectedAnnotationLabel] = useState("");
  const [annotationType, setAnnotationType] = useState<AnnotationType | "all" | "">("");
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
  const [isAllFilteredSelected, setIsAllFilteredSelected] = useState(false);
  const [detailProjectId, setDetailProjectId] = useState<number | null>(null);

  const qc = useQueryClient();

  const { data: strategies = [] } = useQuery({
    queryKey: ["strategies"],
    queryFn: apiGetStrategies,
  });
  const { data: tactics = [] } = useQuery({
    queryKey: ["tactics"],
    queryFn: apiGetTactics,
  });
  const { data: plans = [] } = useQuery({
    queryKey: ["plans"],
    queryFn: apiGetPlans,
  });
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: apiGetDepartments,
  });
  const { data: annotationLabels = [] } = useQuery({
    queryKey: ["project-annotation-labels"],
    queryFn: apiGetProjectAnnotationLabels,
  });

  function resetSelection() {
    setSelectedIds(new Set());
    setIsAllFilteredSelected(false);
  }

  const bulkStatusMutation = useMutation({
    mutationFn: ({
      ids,
      status,
      selectAllFiltered,
      filters,
    }: {
      ids: number[];
      status: Status;
      selectAllFiltered?: boolean;
      filters: {
        search?: string;
        annotation_search?: string;
        annotation_type?: AnnotationType;
        has_annotations?: boolean;
        strategy_id?: number;
        plan_id?: number;
        department?: string;
        status?: Status;
        year?: number;
      };
    }) => (
      selectAllFiltered
        ? apiBulkPatchProjectStatusByFilter(filters, status)
        : apiBulkPatchProjectStatus(ids, status)
    ),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      resetSelection();
      toast.success(`อัปเดตสถานะ ${r.updated} โครงการแล้ว`, { icon: "✅" });
    },
    onError: (err) => toast.error(`อัปเดตไม่สำเร็จ: ${err.message}`),
  });

  const rowStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: Status }) => apiPatchProjectStatus(id, status),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`เปลี่ยนสถานะเป็น "${STATUS_LABEL[vars.status]}" แล้ว`);
    },
    onError: (err) => {
      toast.error(`เปลี่ยนสถานะไม่สำเร็จ: ${err instanceof Error ? err.message : "กรุณาลองใหม่อีกครั้ง"}`);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ProjectCreateInput) => apiCreateProject(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setCreateOpen(false);
      toast.success("เพิ่มโครงการสำเร็จ", { icon: "✅" });
    },
    onError: (err) => {
      toast.error(`เพิ่มโครงการไม่สำเร็จ: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDeleteProject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setDeleteId(null);
      toast.success("ลบโครงการแล้ว", { icon: "🗑️" });
    },
    onError: (err) => {
      toast.error(`ลบโครงการไม่สำเร็จ: ${err.message}`);
    },
  });

  const availablePlans = strategyId
    ? plans.filter((p) => tactics.find((t) => t.id === p.tactic_id)?.strategy_id === strategyId)
    : plans;
  const effectiveAnnotationSearch = debouncedAnnotationSearch || selectedAnnotationLabel;
  const projectFilters = {
    search: debouncedSearch || undefined,
    annotation_search: effectiveAnnotationSearch || undefined,
    annotation_type: annotationType && annotationType !== "all" ? annotationType : undefined,
    has_annotations: annotationType === "all" || !!effectiveAnnotationSearch || undefined,
    strategy_id: strategyId || undefined,
    plan_id: planId || undefined,
    department: department || undefined,
    status: (status as Status) || undefined,
    year: (year as number) || undefined,
  };

  const { data: result, isLoading } = useQuery({
    queryKey: ["projects", { debouncedSearch, effectiveAnnotationSearch, annotationType, strategyId, planId, department, status, year, page }],
    queryFn: () =>
      apiGetProjects({
        ...projectFilters,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const pageItems = result?.data ?? [];
  const totalPages = result?.totalPages ?? 1;
  const safePage = page;
  const totalFiltered = result?.total ?? 0;
  const totalBudget = pageItems.reduce((s, p) => s + p.total_budget, 0);
  const selectedCount = isAllFilteredSelected ? totalFiltered : selectedIds.size;
  const allPageItemsSelected = pageItems.length > 0 && pageItems.every((p) => selectedIds.has(p.id));

  const hasFilters = strategyId || planId || department || status || year || search || annotationSearch || selectedAnnotationLabel || annotationType;

  function handleSearchChange(val: string) {
    setSearch(val);
    resetSelection();
    setPage(1);
    clearTimeout((handleSearchChange as any)._t);
    (handleSearchChange as any)._t = setTimeout(() => setDebouncedSearch(val), 400);
  }

  function handleAnnotationSearchChange(val: string) {
    setAnnotationSearch(val);
    setSelectedAnnotationLabel("");
    resetSelection();
    setPage(1);
    clearTimeout((handleAnnotationSearchChange as any)._t);
    (handleAnnotationSearchChange as any)._t = setTimeout(() => setDebouncedAnnotationSearch(val), 400);
  }

  function clearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setAnnotationSearch("");
    setDebouncedAnnotationSearch("");
    setSelectedAnnotationLabel("");
    setAnnotationType("");
    setStrategyId("");
    setPlanId("");
    setDepartment("");
    setStatus("");
    setYear("");
    resetSelection();
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
              onClick={async () => {
                if (pageItems.length > 0) {
                  const { exportProjectsToExcel } = await import("@/lib/export");
                  exportProjectsToExcel(pageItems, `projects-${new Date().toISOString().slice(0, 10)}.xlsx`);
                  toast.success("ส่งออกไฟล์ Excel แล้ว", { icon: "📄" });
                }
              }}
              disabled={pageItems.length === 0}
              className="gap-1.5"
              aria-label="ส่งออกโครงการในหน้านี้เป็นไฟล์ Excel"
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

        <PublicDataNotice compact />

        {/* Filters */}
        <div className="bg-card rounded-2xl border border-border p-4 lg:p-5 shadow-soft">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                id="project-search"
                aria-label="ค้นหาโครงการ"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="ค้นหาชื่อโครงการ หน่วยงาน วัตถุประสงค์..."
                className="w-full bg-muted/50 border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground ring-focus"
              />
            </div>
            <div className="relative flex-1 min-w-[220px]">
              <MessageSquareText className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                id="project-annotation-search"
                aria-label="ค้นหาในกล่องข้อความและหมายเหตุ"
                value={annotationSearch}
                onChange={(e) => handleAnnotationSearchChange(e.target.value)}
                placeholder="ค้นหาในกล่องข้อความ/หมายเหตุจากไฟล์ต้นทาง..."
                className="w-full bg-muted/50 border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground ring-focus"
              />
            </div>
            <Select
              value={selectedAnnotationLabel}
              onChange={(v) => {
                const value = String(v || "");
                setSelectedAnnotationLabel(value);
                setAnnotationSearch("");
                setDebouncedAnnotationSearch("");
                resetSelection();
                setPage(1);
              }}
              placeholder="ป้าย Text box"
              options={annotationLabels.map((item) => ({
                value: item.value,
                label: `${item.label} (${item.count.toLocaleString("th-TH")})`,
              }))}
            />
            <Select
              value={annotationType}
              onChange={(v) => {
                setAnnotationType(v as AnnotationType | "all" | "");
                resetSelection();
                setPage(1);
              }}
              placeholder="Text box"
              options={[
                { value: "all" as const, label: "มี Text box" },
                ...(Object.entries(ANNOTATION_TYPE_LABEL).map(([value, label]) => ({
                  value: value as AnnotationType,
                  label,
                }))),
              ]}
            />
            <Select
              value={strategyId}
              onChange={(v) => {
                setStrategyId(v as number | "");
                setPlanId("");
                resetSelection();
                setPage(1);
              }}
              placeholder="ยุทธศาสตร์ทั้งหมด"
              options={strategies.map((s) => ({ value: s.id, label: `${s.id}. ${s.short_name ?? s.name}` }))}
            />
            <Select
              value={planId}
              onChange={(v) => {
                setPlanId(v as number | "");
                resetSelection();
                setPage(1);
              }}
              placeholder="แผนงาน"
              options={availablePlans.map((p) => ({ value: p.id, label: p.name }))}
            />
            <Select
              value={department}
              onChange={(v) => {
                setDepartment(v as string);
                resetSelection();
                setPage(1);
              }}
              placeholder="หน่วยงาน"
              options={departments.map((d) => ({ value: d, label: d }))}
            />
            <Select
              value={status}
              onChange={(v) => {
                setStatus(v as Status | "");
                resetSelection();
                setPage(1);
              }}
              placeholder="สถานะ"
              options={(Object.keys(STATUS_LABEL) as Status[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
            />
            <Select
              value={year}
              onChange={(v) => {
                setYear(v as number | "");
                resetSelection();
                setPage(1);
              }}
              placeholder="ปีงบประมาณ"
              options={YEARS.map((y) => ({ value: y, label: `พ.ศ. ${y}` }))}
            />
            {hasFilters && (
              <button
                onClick={clearFilters}
                aria-label="ล้างตัวกรองทั้งหมด"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-muted transition"
              >
                <X className="size-3.5" /> ล้างตัวกรอง
              </button>
            )}
          </div>
        </div>

        {/* Bulk toolbar (admin only) */}
        {isLoggedIn && selectedCount > 0 && (
          <div className="bg-primary/5 border border-primary/30 rounded-xl px-4 py-2.5 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckSquare className="size-4 text-primary" />
              เลือก {selectedCount} โครงการ
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-muted-foreground">ปรับสถานะเป็น:</span>
              <select
                aria-label="ปรับสถานะโครงการที่เลือก"
                onChange={(e) => {
                  const v = e.target.value as Status;
                  if (v) {
                    bulkStatusMutation.mutate({
                      ids: [...selectedIds],
                      status: v,
                      selectAllFiltered: isAllFilteredSelected,
                      filters: projectFilters,
                    });
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
              <Button variant="ghost" size="sm" onClick={resetSelection}>
                ยกเลิก
              </Button>
            </div>
          </div>
        )}

        {isLoggedIn && allPageItemsSelected && totalFiltered > pageItems.length && !isAllFilteredSelected && (
          <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
            <span>เลือกโครงการในหน้านี้แล้ว {pageItems.length} รายการ</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAllFilteredSelected(true);
                setSelectedIds(new Set());
              }}
            >
              เลือกทั้งหมด {totalFiltered} โครงการตามตัวกรอง
            </Button>
          </div>
        )}

        {isLoggedIn && isAllFilteredSelected && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-primary">
            เลือกครบ {totalFiltered} โครงการตามตัวกรองแล้ว
          </div>
        )}

        {/* Project list */}
        <div className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
          <div className="max-h-[72vh] overflow-auto">
            <table className="w-full min-w-[980px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="sticky top-0 z-10 border-b border-border bg-muted/95 text-left text-xs uppercase tracking-wider text-muted-foreground backdrop-blur">
                  {isLoggedIn && (
                    <th className="px-3 py-3.5 w-10">
                      <input
                        type="checkbox"
                        aria-label="เลือกโครงการทั้งหมดในหน้านี้"
                        className="size-4 cursor-pointer"
                        checked={isAllFilteredSelected || allPageItemsSelected}
                        onChange={(e) => {
                          if (isAllFilteredSelected) {
                            setIsAllFilteredSelected(false);
                          }
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
                  pageItems.map((p, index) => {
                    const budget = p.total_budget;
                    return (
                      <tr
                        key={p.id}
                        className={[
                          "group cursor-pointer border-b border-l-4 border-border/50 transition-colors",
                          index % 2 === 0 ? "bg-card" : "bg-muted/10",
                          getProjectRowTone(p.status),
                        ].join(" ")}
                        onClick={() => setDetailProjectId(p.id)}
                      >
                        {isLoggedIn && (
                          <td className="px-3 py-4">
                            <input
                              type="checkbox"
                              aria-label={`เลือกโครงการ ${p.name}`}
                              className="size-4 cursor-pointer"
                              checked={isAllFilteredSelected || selectedIds.has(p.id)}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                if (isAllFilteredSelected) {
                                  setIsAllFilteredSelected(false);
                                }
                                const next = new Set(selectedIds);
                                if (e.target.checked) next.add(p.id);
                                else next.delete(p.id);
                                setSelectedIds(next);
                              }}
                            />
                          </td>
                        )}
                        <td className="px-5 py-4 max-w-[440px]">
                          <div className="mb-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="inline-flex h-5 min-w-8 items-center justify-center rounded-full bg-background px-2 font-semibold tabular shadow-sm ring-1 ring-border">
                              #{(safePage - 1) * PAGE_SIZE + index + 1}
                            </span>
                            <span className="truncate md:hidden">{p.department || "ไม่ระบุหน่วยงาน"}</span>
                          </div>
                          <Link
                            to="/projects/$projectId"
                            params={{ projectId: String(p.id) }}
                            className="line-clamp-2 text-left font-semibold leading-relaxed transition group-hover:text-primary"
                            aria-label={`ดูรายละเอียดโครงการ ${p.name}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {p.name}
                          </Link>
                          {p.tactic_code && (
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="inline-flex items-center justify-center size-4 rounded bg-primary-soft text-primary text-[10px] font-semibold">
                                {p.tactic_code}
                              </span>
                              <span className="truncate">{p.plan_name}</span>
                            </div>
                          )}
                          {p.annotation_count > 0 && (
                            <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-700">
                              <MessageSquareText className="mt-0.5 size-3.5 shrink-0" />
                              <span className="line-clamp-1">
                                {p.annotation_count} text box · {p.annotation_preview}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="max-w-[220px] px-5 py-4 text-foreground/80">
                          <span className="line-clamp-2" title={p.department ?? undefined}>{p.department}</span>
                        </td>
                        <td className="px-5 py-4">
                          {p.strategy_name && (
                            <span className="inline-flex max-w-[240px] items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-xs shadow-sm ring-1 ring-border">
                              <span className="size-1.5 rounded-full bg-primary" />
                              <span className="truncate">{p.strategy_name}</span>
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right tabular font-medium">
                          {budget > 0 ? formatBaht(budget) : <span className="text-muted-foreground/60">—</span>}
                        </td>
                        <td className="px-5 py-4">
                          {isLoggedIn ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={p.status}
                                disabled={rowStatusMutation.isPending}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  const nextStatus = e.target.value as Status;
                                  if (nextStatus !== p.status) {
                                    rowStatusMutation.mutate({ id: p.id, status: nextStatus });
                                  }
                                }}
                              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs ring-focus min-w-[150px]"
                                aria-label={`ปรับสถานะโครงการ ${p.name}`}
                                title="ปรับสถานะโครงการ"
                              >
                                {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
                                  <option key={s} value={s}>
                                    {STATUS_LABEL[s]}
                                  </option>
                                ))}
                              </select>
                              {rowStatusMutation.isPending && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
                            </div>
                          ) : (
                            <StatusBadge status={p.status} />
                          )}
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
                              aria-label={`ลบโครงการ ${p.name}`}
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
                  aria-label="ไปหน้าก่อนหน้า"
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
                      aria-label={`ไปหน้าที่ ${n}`}
                      aria-current={n === safePage ? "page" : undefined}
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
                  aria-label="ไปหน้าถัดไป"
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

        <ProjectReadSheet
          projectId={detailProjectId}
          onClose={() => setDetailProjectId(null)}
        />
      </div>
    </AppLayout>
  );
}

function ProjectReadSheet({ projectId, onClose }: { projectId: number | null; onClose: () => void }) {
  const { isLoggedIn } = useAuth();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => apiGetProject(projectId!),
    enabled: projectId !== null,
  });

  const updateMutation = useMutation({
    mutationFn: (data: ProjectCreateInput) => apiUpdateProject(projectId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setEditOpen(false);
      toast.success("บันทึกข้อมูลโครงการแล้ว");
    },
    onError: (err) => toast.error(`บันทึกไม่สำเร็จ: ${err.message}`),
  });

  return (
    <>
      <Sheet open={projectId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
          <div className="shrink-0 bg-background/95 backdrop-blur border-b border-border px-6 py-4">
            <SheetHeader>
              <SheetTitle className="text-base font-semibold pr-6 leading-snug">
                {isLoading ? "กำลังโหลดรายละเอียด..." : (project?.name ?? "รายละเอียดโครงการ")}
              </SheetTitle>
              <SheetDescription className="sr-only">
                แสดงรายละเอียดโครงการ แผนงาน หน่วยงาน สถานะ งบประมาณ และข้อมูลประกอบอื่น ๆ
              </SheetDescription>
            </SheetHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {isLoading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="size-7 animate-spin text-primary" />
              </div>
            )}

            {!isLoading && !project && (
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                ไม่พบข้อมูลโครงการนี้
              </div>
            )}

            {project && <ProjectReadContent project={project} />}
          </div>

          {project && (
            <div className="shrink-0 bg-background/95 backdrop-blur border-t border-border px-6 py-4 flex flex-wrap items-center gap-3">
              {isLoggedIn && (
                <Button onClick={() => setEditOpen(true)} className="flex-1 gap-2">
                  <Pencil className="size-4" />
                  แก้ไขโครงการ
                </Button>
              )}
              <Button variant="outline" asChild className="flex-1 gap-2">
                <Link to="/projects/$projectId" params={{ projectId: String(project.id) }}>
                  <ExternalLink className="size-4" />
                  ดูเต็มหน้า
                </Link>
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {project && (
        <ProjectFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          onSubmit={async (data) => { await updateMutation.mutateAsync(data); }}
          initialData={project}
          isSubmitting={updateMutation.isPending}
        />
      )}
    </>
  );
}

function ProjectReadContent({ project }: { project: ProjectDetail }) {
  const budgetMax = Math.max(...YEARS.map((year) => project.budgets[year] || 0), 1);

  const detailBlocks = [
    { label: "วัตถุประสงค์", value: project.objective },
    { label: "เป้าหมาย", value: project.target },
    { label: "ตัวชี้วัด (KPI)", value: project.kpi },
    { label: "ผลที่คาดว่าจะได้รับ", value: project.expected_result },
  ].filter((item) => item.value);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-emerald-gradient p-5 text-primary-foreground">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-primary-foreground/70 mb-1">สถานะปัจจุบัน</div>
            <StatusBadge status={project.status} />
          </div>
          <div className="text-right">
            <div className="text-xs text-primary-foreground/70">งบประมาณรวม</div>
            <div className="text-2xl font-bold tabular mt-0.5">
              {formatBaht(project.total_budget, { compact: true })}
            </div>
            <div className="text-[11px] text-primary-foreground/60">บาท</div>
          </div>
        </div>
      </div>

      {(project.strategy || project.tactic || project.plan) && (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">ลำดับแผน</div>
          <div className="text-sm leading-relaxed">
            {project.strategy && <span className="font-medium">{project.strategy.name}</span>}
            {project.tactic && <span className="text-muted-foreground"> › {project.tactic.code}: {project.tactic.name}</span>}
            {project.plan && <span className="text-muted-foreground"> › {project.plan.name}</span>}
          </div>
        </div>
      )}

      <ProjectAnnotationsSection annotations={project.annotations} />

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "หน่วยงาน", value: project.department },
          { label: "แหล่งข้อมูล", value: project.source_sheet },
          { label: "รหัสโครงการ", value: `#${project.id}` },
          {
            label: "วันที่เพิ่ม",
            value: new Date(project.created_at).toLocaleDateString("th-TH", {
              year: "numeric",
              month: "short",
              day: "numeric",
            }),
          },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-muted/50 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</div>
            <div className="text-sm font-medium truncate">{value ?? "—"}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">งบประมาณรายปี</div>
        <div className="space-y-2.5">
          {YEARS.map((year) => {
            const amount = project.budgets[year] || 0;
            const pct = (amount / budgetMax) * 100;
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

      {detailBlocks.length > 0 ? (
        detailBlocks.map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-border p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{label}</div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/85">{value}</p>
          </div>
        ))
      ) : (
        <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          ยังไม่มีรายละเอียดวัตถุประสงค์ เป้าหมาย หรือตัวชี้วัดสำหรับโครงการนี้
        </div>
      )}
    </div>
  );
}

function ProjectAnnotationsSection({ annotations }: { annotations: ProjectDetail["annotations"] }) {
  if (!annotations?.length) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
          <MessageSquareText className="size-4" />
          กล่องข้อความจากไฟล์ต้นทาง
        </div>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
          {annotations.length.toLocaleString("th-TH")} รายการ
        </span>
      </div>
      <div className="space-y-2.5">
        {annotations.map((annotation) => (
          <div key={annotation.id} className="rounded-lg border border-amber-200/70 bg-background/80 px-3 py-2.5">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                {ANNOTATION_TYPE_LABEL[annotation.annotation_type] ?? annotation.annotation_type}
              </span>
              {annotation.source_row && (
                <span className="text-[11px] text-muted-foreground">
                  {annotation.source_sheet} แถว {annotation.source_row}
                </span>
              )}
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/85">{annotation.raw_text}</p>
            {(annotation.target_plan || annotation.target_ref || annotation.funding_source) && (
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                {annotation.target_plan && <span>แผนปลายทาง: {annotation.target_plan}</span>}
                {annotation.target_ref && <span>อ้างอิง: {annotation.target_ref}</span>}
                {annotation.funding_source && <span>แหล่งงบ: {annotation.funding_source}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
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
      aria-label={placeholder}
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
