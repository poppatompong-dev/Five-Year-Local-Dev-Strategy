import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import React from "react";
import { toast } from "sonner";
import { Tooltip as TipRoot, TooltipContent as TipContent, TooltipTrigger as TipTrigger } from "@/components/ui/tooltip";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { ProjectFormDialog } from "@/components/ProjectFormDialog";
import { formatBaht, STATUS_COLOR, YEARS, type Status } from "@/lib/mock-data";
import { apiGetDashboard, apiGetProjects, apiGetProject, apiUpdateProject, apiPatchProjectStatus } from "@/lib/api";
import { exportDashboardToExcel } from "@/lib/export";
import type { ProjectRow, StrategyProgress, ProjectCreateInput } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  Treemap,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Line,
  ComposedChart,
} from "recharts";
import {
  TrendingUp,
  Wallet,
  Layers,
  Building,
  ArrowUpRight,
  Calendar,
  Target,
  CheckCircle2,
  Clock,
  PlayCircle,
  XCircle,
  X,
  Filter,
  ChevronDown,
  Eye,
  Pencil,
  ExternalLink,
  MoreHorizontal,
  MousePointerClick,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  BarChart3,
  ListFilter,
  Info,
  Copy,
  CheckCheck,
  Sparkles,
  TrendingDown,
  AlertCircle,
  Download,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ภาพรวม · ระบบบริหารแผนพัฒนาท้องถิ่น เทศบาลนครนครสวรรค์" },
      {
        name: "description",
        content:
          "แดชบอร์ดภาพรวมแผนพัฒนาท้องถิ่นเทศบาลนครนครสวรรค์ ปี พ.ศ. 2566–2570 รวมจำนวนโครงการ งบประมาณ และผลการดำเนินงานตามยุทธศาสตร์",
      },
    ],
  }),
  component: DashboardPage,
});

// ─── Filter & sort types ──────────────────────────────────────────────────────
type FilterStatus   = Status | null;
type FilterStrategy = number | null;
type FilterYear     = number | null;
type SelectedProject = number | null;

const STATUS_LABEL: Record<Status, string> = {
  not_set: "ยังไม่ได้ปรับสถานะ",
  planning: "วางแผน",
  in_progress: "ดำเนินการ",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
};

type SortDir = "asc" | "desc";

type StratSort  = "budget_desc" | "budget_asc" | "count_desc" | "count_asc" | "completion_desc" | "completion_asc" | "id_asc";
type DeptSort   = "count_desc" | "count_asc" | "budget_desc" | "budget_asc" | "name_asc";
type TableSort  = "default" | "name_asc" | "budget_desc" | "budget_asc" | "status_asc" | "dept_asc";
type ProgressSort = "completion_desc" | "completion_asc" | "count_desc" | "budget_desc" | "id_asc";
type YearSort   = "year_asc" | "year_desc" | "budget_desc" | "count_desc";

// ── Count-up animation hook ───────────────────────────────────────────────────
function useCountUp(target: number, duration = 900, enabled = true) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled || target === 0) { setCount(target); return; }
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, enabled]);
  return count;
}

function DashboardPage() {

  // ── Filter state ──────────────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState<FilterStatus>(null);
  const [filterStrategy, setFilterStrategy] = useState<FilterStrategy>(null);
  const [filterYear, setFilterYear] = useState<FilterYear>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<SelectedProject>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // ── Sort state ────────────────────────────────────────────────────────────
  const [stratSort,    setStratSort]    = useState<StratSort>("budget_desc");
  const [progressSort, setProgressSort] = useState<ProgressSort>("completion_desc");
  const [deptSort,     setDeptSort]     = useState<DeptSort>("count_desc");
  const [tableSort,    setTableSort]    = useState<TableSort>("default");
  const [yearSort,     setYearSort]     = useState<YearSort>("year_asc");

  const hasFilter = filterStatus !== null || filterStrategy !== null || filterYear !== null;

  const clearFilters = useCallback(() => {
    setFilterStatus(null);
    setFilterStrategy(null);
    setFilterYear(null);
    toast.info("ล้างตัวกรองทั้งหมดแล้ว", { icon: "✕" });
  }, []);

  const scrollToTable = useCallback(() => {
    setTimeout(() => tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }, []);

  const setStatusFilter = useCallback((s: FilterStatus) => {
    const isClearing = filterStatus === s;
    setFilterStatus(isClearing ? null : s);
    setFilterStrategy(null);
    setFilterYear(null);
    scrollToTable();
    if (!isClearing) toast.success(`กรองตามสถานะ`, { description: s === "completed" ? "เสร็จสิ้น" : s === "in_progress" ? "ดำเนินการอยู่" : s === "planning" ? "วางแผน" : "ยกเลิก", icon: "🎯" });
    else toast.info("ล้างตัวกรองสถานะแล้ว");
  }, [filterStatus, scrollToTable]);

  const setStrategyFilter = useCallback((id: FilterStrategy) => {
    const isClearing = filterStrategy === id;
    setFilterStrategy(isClearing ? null : id);
    setFilterStatus(null);
    setFilterYear(null);
    scrollToTable();
    if (!isClearing && id !== null) toast.success(`กรองตามยุทธศาสตร์`, { description: `ยุทธศาสตร์ที่ ${id}`, icon: "🎯" });
    else if (isClearing) toast.info("ล้างตัวกรองยุทธศาสตร์แล้ว");
  }, [filterStrategy, scrollToTable]);

  const setYearFilter = useCallback((y: FilterYear) => {
    const isClearing = filterYear === y;
    setFilterYear(isClearing ? null : y);
    setFilterStatus(null);
    setFilterStrategy(null);
    scrollToTable();
    if (!isClearing && y !== null) toast.success(`กรองตามปี`, { description: `ปีงบประมาณ ${y}`, icon: "📅" });
    else if (isClearing) toast.info("ล้างตัวกรองปีแล้ว");
  }, [scrollToTable]);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: apiGetDashboard,
  });

  // Filtered projects query — depends on active filter
  const { data: filteredResult, isFetching: tableFetching } = useQuery({
    queryKey: ["projects-filtered", filterStatus, filterStrategy, filterYear],
    queryFn: () => apiGetProjects({
      page: 1,
      limit: 50,
      status: filterStatus ?? undefined,
      strategy_id: filterStrategy ?? undefined,
      year: filterYear ?? undefined,
    }),
    enabled: hasFilter,
  });

  const { data: recentResult } = useQuery({
    queryKey: ["projects", "recent"],
    queryFn: () => apiGetProjects({ page: 1, limit: 6 }),
    enabled: !hasFilter,
  });

  const tableRows: ProjectRow[] = hasFilter
    ? (filteredResult?.data ?? [])
    : (recentResult?.data ?? []);

  // ── ALL hooks MUST be before any early returns (Rules of Hooks) ──────────────
  // Count-up targets (safe with undefined data)
  const _totalProjects  = data?.totalProjects ?? 0;
  const _totalActive    = data?.byStatus.find(s => s.status === "in_progress")?.count ?? 0;
  const _totalCompleted = data?.byStatus.find(s => s.status === "completed")?.count ?? 0;
  const _totalPlanning  = data?.byStatus.find(s => s.status === "planning")?.count ?? 0;
  const _totalCancelled = data?.byStatus.find(s => s.status === "cancelled")?.count ?? 0;
  const countProjects  = useCountUp(_totalProjects,  900, !!data);
  const countActive    = useCountUp(_totalActive,    750, !!data);
  const countCompleted = useCountUp(_totalCompleted, 800, !!data);
  const countPlanning  = useCountUp(_totalPlanning,  700, !!data);
  const countCancelled = useCountUp(_totalCancelled, 650, !!data);

  // Sorted memos (use empty arrays when data not yet loaded)
  const stratSorted = useMemo(() => {
    const arr = [...(data?.byStrategy ?? [])];
    switch (stratSort) {
      case "budget_desc":     return arr.sort((a, b) => b.total_budget - a.total_budget);
      case "budget_asc":      return arr.sort((a, b) => a.total_budget - b.total_budget);
      case "count_desc":      return arr.sort((a, b) => b.project_count - a.project_count);
      case "count_asc":       return arr.sort((a, b) => a.project_count - b.project_count);
      case "completion_desc": return arr.sort((a, b) => {
        const pA = data?.byStrategyProgress.find(p => p.id === a.id)?.completion_rate ?? 0;
        const pB = data?.byStrategyProgress.find(p => p.id === b.id)?.completion_rate ?? 0;
        return pB - pA;
      });
      case "completion_asc":  return arr.sort((a, b) => {
        const pA = data?.byStrategyProgress.find(p => p.id === a.id)?.completion_rate ?? 0;
        const pB = data?.byStrategyProgress.find(p => p.id === b.id)?.completion_rate ?? 0;
        return pA - pB;
      });
      case "id_asc":          return arr.sort((a, b) => a.id - b.id);
      default:                return arr;
    }
  }, [data?.byStrategy, data?.byStrategyProgress, stratSort]);

  const stratMax = Math.max(0, ...(data?.byStrategy ?? []).map((x) => x.total_budget));

  const progressSorted = useMemo(() => {
    const arr = [...(data?.byStrategyProgress ?? [])];
    switch (progressSort) {
      case "completion_desc": return arr.sort((a, b) => b.completion_rate - a.completion_rate);
      case "completion_asc":  return arr.sort((a, b) => a.completion_rate - b.completion_rate);
      case "count_desc":      return arr.sort((a, b) => b.project_count - a.project_count);
      case "budget_desc":     return arr.sort((a, b) => b.total_budget - a.total_budget);
      case "id_asc":          return arr.sort((a, b) => a.id - b.id);
      default:                return arr;
    }
  }, [data?.byStrategyProgress, progressSort]);

  const yearSorted = useMemo(() => {
    const arr = [...(data?.byYear ?? [])];
    switch (yearSort) {
      case "year_asc":    return arr.sort((a, b) => a.year - b.year);
      case "year_desc":   return arr.sort((a, b) => b.year - a.year);
      case "budget_desc": return arr.sort((a, b) => b.total - a.total);
      case "count_desc":  return arr.sort((a, b) => b.project_count - a.project_count);
      default:            return arr;
    }
  }, [data?.byYear, yearSort]);

  const deptSorted = useMemo(() => {
    const arr = [...(data?.topDepts ?? [])];
    switch (deptSort) {
      case "count_desc":  return arr.sort((a, b) => b.count - a.count);
      case "count_asc":   return arr.sort((a, b) => a.count - b.count);
      case "budget_desc": return arr.sort((a, b) => b.budget - a.budget);
      case "budget_asc":  return arr.sort((a, b) => a.budget - b.budget);
      case "name_asc":    return arr.sort((a, b) => a.department.localeCompare(b.department, "th"));
      default:            return arr;
    }
  }, [data?.topDepts, deptSort]);

  const tableSorted = useMemo(() => {
    const arr = [...tableRows];
    switch (tableSort) {
      case "name_asc":    return arr.sort((a, b) => a.name.localeCompare(b.name, "th"));
      case "budget_desc": return arr.sort((a, b) => b.total_budget - a.total_budget);
      case "budget_asc":  return arr.sort((a, b) => a.total_budget - b.total_budget);
      case "status_asc":  return arr.sort((a, b) => a.status.localeCompare(b.status));
      case "dept_asc":    return arr.sort((a, b) => (a.department ?? "").localeCompare(b.department ?? "", "th"));
      default:            return arr;
    }
  }, [tableRows, tableSort]);

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="h-40 rounded-2xl shimmer" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl shimmer" />)}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl shimmer" />)}
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2 h-72 rounded-2xl shimmer" />
            <div className="h-72 rounded-2xl shimmer" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !data) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center text-destructive">
            <p className="font-medium">ไม่สามารถโหลดข้อมูลได้</p>
            <p className="text-xs mt-1 text-muted-foreground">{String(error)}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── Derived metrics (data is guaranteed non-null here) ──────────────────
  const totalActive    = _totalActive;
  const totalCompleted = _totalCompleted;
  const totalPlanning  = _totalPlanning;
  const totalCancelled = _totalCancelled;
  const activePct      = data.totalProjects > 0 ? Math.round((totalActive / data.totalProjects) * 100) : 0;
  const completedPct   = data.totalProjects > 0 ? Math.round((totalCompleted / data.totalProjects) * 100) : 0;

  const STRAT_COLORS = [
    { bar: "from-emerald-700 to-emerald-500", badge: "bg-emerald-100 text-emerald-800", hex: "#0d7a5f" },
    { bar: "from-amber-600 to-amber-400",     badge: "bg-amber-100 text-amber-800",     hex: "#d97706" },
    { bar: "from-sky-700 to-sky-500",         badge: "bg-sky-100 text-sky-800",         hex: "#0369a1" },
    { bar: "from-rose-700 to-rose-500",       badge: "bg-rose-100 text-rose-800",       hex: "#be123c" },
    { bar: "from-violet-700 to-violet-500",   badge: "bg-violet-100 text-violet-800",   hex: "#6d28d9" },
    { bar: "from-teal-700 to-teal-500",       badge: "bg-teal-100 text-teal-800",       hex: "#0f766e" },
  ];

  const tooltipStyle = {
    borderRadius: 12,
    border: "1px solid oklch(0.9 0.015 140)",
    background: "oklch(1 0 0)",
    boxShadow: "0 10px 30px -10px oklch(0 0 0 / 0.15)",
    fontSize: 12,
  };

  // Filter label for display
  const filterLabel =
    filterStatus  ? `สถานะ: ${data.byStatus.find(s => s.status === filterStatus)?.label}` :
    filterStrategy ? `ยุทธศาสตร์: ${data.byStrategy.find(s => s.id === filterStrategy)?.name}` :
    filterYear    ? `ปีงบประมาณ: ${filterYear}` : null;

  return (
    <AppLayout>
      <div className="space-y-6">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-2xl bg-emerald-gradient p-7 lg:p-9 text-primary-foreground shadow-[0_8px_40px_-8px_oklch(0.36_0.085_162_/_0.45)]">
          <div aria-hidden className="absolute inset-0" style={{ backgroundImage: "radial-gradient(ellipse 70% 80% at 85% 15%, oklch(0.74 0.12 88 / 0.35), transparent 55%), radial-gradient(ellipse 60% 60% at 10% 85%, oklch(0.55 0.12 230 / 0.3), transparent 55%), radial-gradient(ellipse 40% 40% at 50% 50%, oklch(0.55 0.12 165 / 0.15), transparent 70%)" }} />
          <div aria-hidden className="absolute -top-16 -right-16 size-64 rounded-full border border-white/10" />
          <div aria-hidden className="absolute -top-8  -right-8  size-40 rounded-full border border-white/8" />
          <div aria-hidden className="absolute -bottom-20 -left-10 size-72 rounded-full border border-white/6" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-medium ring-1 ring-white/20">
                <Calendar className="size-3.5" />ปีงบประมาณ 2566 – 2570
              </div>
              <h1 className="mt-3 text-3xl lg:text-4xl font-semibold tracking-tight">ภาพรวมแผนพัฒนาท้องถิ่น</h1>
              <p className="mt-1.5 text-primary-foreground/80 text-sm max-w-lg">
                ติดตามงบประมาณและสถานะโครงการ · เทศบาลนครนครสวรรค์ ระยะ 5 ปี
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] ring-1 ring-white/15">
                <MousePointerClick className="size-3" />
                คลิกที่กราฟใดก็ได้เพื่อกรองตารางโครงการด้านล่างทันที
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 text-right">
              <div className="text-primary-foreground/70 text-xs">งบประมาณรวม 5 ปี</div>
              <div className="text-3xl font-bold tabular tracking-tight">{formatBaht(data.totalBudget, { compact: true })}</div>
              <div className="text-primary-foreground/70 text-xs">บาท · {data.totalProjects.toLocaleString("th-TH")} โครงการ</div>
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => {
                    if (data) {
                      exportDashboardToExcel(data, `dashboard-${new Date().toISOString().slice(0, 10)}.xlsx`);
                      toast.success("ส่งออกสรุปแดชบอร์ดแล้ว", { icon: "📄" });
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur px-3 py-1.5 text-xs font-medium ring-1 ring-white/20 transition"
                >
                  <Download className="size-3.5" /> ส่งออก
                </button>
                <Link to="/projects" className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur px-3 py-1.5 text-xs font-medium ring-1 ring-white/20 transition">
                  ดูโครงการทั้งหมด <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Status KPI strip — clickable filter ───────────────────── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {([
            { status: "in_progress" as Status, label: "ดำเนินการอยู่",  count: countActive,    pct: activePct,    icon: <PlayCircle className="size-5" />,   colorClass: "text-warning",     barClass: "bg-warning",     bgClass: "bg-warning/10",     tooltip: "โครงการที่อยู่ระหว่างดำเนินการ · คลิกเพื่อกรอง" },
            { status: "completed"   as Status, label: "เสร็จสิ้นแล้ว", count: countCompleted, pct: completedPct, icon: <CheckCircle2 className="size-5" />, colorClass: "text-success",     barClass: "bg-success",     bgClass: "bg-success/10",     tooltip: "โครงการที่ดำเนินการเสร็จสมบูรณ์แล้ว · คลิกเพื่อกรอง" },
            { status: "planning"    as Status, label: "วางแผน",         count: countPlanning,  pct: data.totalProjects > 0 ? Math.round((totalPlanning / data.totalProjects) * 100) : 0,  icon: <Clock className="size-5" />,     colorClass: "text-info",        barClass: "bg-info",        bgClass: "bg-info/10",        tooltip: "โครงการที่อยู่ในขั้นตอนวางแผน · คลิกเพื่อกรอง" },
            { status: "cancelled"   as Status, label: "ยกเลิก",         count: countCancelled, pct: data.totalProjects > 0 ? Math.round((totalCancelled / data.totalProjects) * 100) : 0, icon: <XCircle className="size-5" />,   colorClass: "text-destructive", barClass: "bg-destructive", bgClass: "bg-destructive/10", tooltip: "โครงการที่ถูกยกเลิก · คลิกเพื่อกรอง" },
          ] as const).map(({ status, tooltip, ...props }, i) => (
            <TipRoot key={status}>
              <TipTrigger asChild>
                <div className={`animate-fade-up stagger-${i + 1}`}>
                  <StatusKpiCard
                    {...props}
                    total={data.totalProjects}
                    active={filterStatus === status}
                    onClick={() => setStatusFilter(status)}
                  />
                </div>
              </TipTrigger>
              <TipContent className="tooltip-rich">{tooltip}</TipContent>
            </TipRoot>
          ))}
        </section>

        {/* ── Stat row ────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {([
            { label: "โครงการทั้งหมด",   value: countProjects.toLocaleString("th-TH"),             sub: "โครงการ",              icon: <Target className="size-5" />, tone: "primary" as const, tip: "จำนวนโครงการทั้งหมดในระบบ" },
            { label: "งบประมาณรวม 5 ปี", value: formatBaht(data.totalBudget, { compact: true }),     sub: "บาท",                  icon: <Wallet className="size-5" />, tone: "gold"    as const, tip: "งบประมาณรวมทุกโครงการปี 2566–2570" },
            { label: "ยุทธศาสตร์",         value: data.totalStrategies.toString(),                      sub: `${data.totalPlans} แผนงาน`, icon: <Layers className="size-5" />, tone: "info"    as const, tip: `${data.totalStrategies} ยุทธศาสตร์ · ${data.totalPlans} แผนงานย่อย` },
            { label: "หน่วยงาน",           value: data.totalDepartments.toString(),                     sub: "หน่วยงาน",          icon: <Building className="size-5" />, tone: "success" as const, tip: "หน่วยงานที่รับผิดชอบโครงการทั้งหมด" },
          ] as const).map(({ tip, ...props }, i) => (
            <TipRoot key={props.label}>
              <TipTrigger asChild>
                <div className={`animate-fade-up stagger-${i + 1} hover-lift`}>
                  <StatCard {...props} />
                </div>
              </TipTrigger>
              <TipContent className="tooltip-rich">{tip}</TipContent>
            </TipRoot>
          ))}
        </section>

        {/* ── Budget by year (clickable) + Donut ────────────────────────── */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <Card className="xl:col-span-2">
            <CardHeader
              title="งบประมาณตามปีงบประมาณ"
              subtitle="คลิกแท่งปีใดก็ได้เพื่อกรองโครงการ"
              sortControl={
                <SortSelect
                  value={yearSort}
                  onChange={(v) => setYearSort(v as YearSort)}
                  options={[
                    { value: "year_asc",    label: "ปี น้อย → มาก" },
                    { value: "year_desc",   label: "ปี มาก → น้อย" },
                    { value: "budget_desc", label: "งบมาก → น้อย" },
                    { value: "count_desc",  label: "โครงการมาก → น้อย" },
                  ]}
                />
              }
            />
            <div className="h-[280px] mt-4">
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart
                  data={yearSorted.map((d) => ({ ...d, totalM: +(d.total / 1_000_000).toFixed(2) }))}
                  margin={{ left: -10, right: 20, top: 10 }}
                  onClick={(e: any) => {
                    const yr = e?.activePayload?.[0]?.payload?.year as number | undefined;
                    if (yr) setYearFilter(yr);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <defs>
                    <linearGradient id="barGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.52 0.105 165)" />
                      <stop offset="100%" stopColor="oklch(0.36 0.085 162)" />
                    </linearGradient>
                    <linearGradient id="barGreenActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.74 0.12 88)" />
                      <stop offset="100%" stopColor="oklch(0.62 0.13 75)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.015 140)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "oklch(0.48 0.02 160)" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="budget" tick={{ fontSize: 11, fill: "oklch(0.48 0.02 160)" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 11, fill: "oklch(0.6 0.02 220)" }} axisLine={false} tickLine={false} />
                  <ReTooltip
                    cursor={{ fill: "oklch(0.95 0.03 165 / 0.35)" } as any}
                    contentStyle={tooltipStyle as any}
                    formatter={(v: any, name: any) =>
                      name === "totalM"
                        ? [`${Number(v).toLocaleString("th-TH", { maximumFractionDigits: 2 })} ล้านบาท`, "งบประมาณ"]
                        : [`${Number(v).toLocaleString("th-TH")} โครงการ`, "จำนวนโครงการ"]
                    }
                    labelFormatter={(l: any) => `ปีงบประมาณ ${l} (คลิกเพื่อกรอง)`}
                  />
                  <Bar
                    yAxisId="budget"
                    dataKey="totalM"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={56}
                  >
                    {yearSorted.map((d) => (
                      <Cell
                        key={d.year}
                        fill={filterYear === d.year ? "url(#barGreenActive)" : "url(#barGreen)"}
                        opacity={filterYear !== null && filterYear !== d.year ? 0.4 : 1}
                      />
                    ))}
                  </Bar>
                  <Line yAxisId="count" type="monotone" dataKey="project_count" stroke="oklch(0.55 0.12 260)" strokeWidth={2.5} dot={{ r: 4, fill: "oklch(0.55 0.12 260)", strokeWidth: 0 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Donut — clickable segments */}
          <Card>
            <CardHeader title="สัดส่วนสถานะโครงการ" subtitle={`คลิกส่วนใดก็ได้เพื่อกรอง · รวม ${data.totalProjects.toLocaleString("th-TH")} โครงการ`} />
            <div className="relative h-[280px] mt-2">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data.byStatus}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="45%"
                    innerRadius={68}
                    outerRadius={100}
                    paddingAngle={3}
                    stroke="none"
                    startAngle={90}
                    endAngle={-270}
                    onClick={(entry: any) => setStatusFilter(entry.status as Status)}
                    style={{ cursor: "pointer" }}
                  >
                    {data.byStatus.map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={STATUS_COLOR[entry.status as Status]}
                        opacity={filterStatus !== null && filterStatus !== entry.status ? 0.3 : 1}
                        stroke={filterStatus === entry.status ? "white" : "none"}
                        strokeWidth={filterStatus === entry.status ? 3 : 0}
                      />
                    ))}
                  </Pie>
                  <ReTooltip
                    contentStyle={tooltipStyle as any}
                    formatter={(v: any, _n: any, p: any) => [
                      `${Number(v).toLocaleString("th-TH")} โครงการ (${data.totalProjects > 0 ? Math.round((Number(v) / data.totalProjects) * 100) : 0}%)`,
                      (p as { payload?: { label?: string } }).payload?.label ?? "",
                    ]}
                  />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 4 }} formatter={(value) => <span className="text-foreground">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-start pointer-events-none" style={{ paddingTop: "72px" }}>
                <div className="text-2xl font-bold tabular">{activePct}%</div>
                <div className="text-xs text-muted-foreground">กำลังดำเนินการ</div>
              </div>
            </div>
          </Card>
        </section>

        {/* ── Budget by strategy (clickable rows) ───────────────────────── */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <Card className="xl:col-span-2">
            <CardHeader
              title="งบประมาณตามยุทธศาสตร์"
              subtitle="คลิกแถวเพื่อกรองโครงการในยุทธศาสตร์นั้น"
              sortControl={
                <SortSelect
                  value={stratSort}
                  onChange={(v) => setStratSort(v as StratSort)}
                  options={[
                    { value: "budget_desc",     label: "งบมาก → น้อย" },
                    { value: "budget_asc",      label: "งบน้อย → มาก" },
                    { value: "count_desc",      label: "โครงการมาก → น้อย" },
                    { value: "count_asc",       label: "โครงการน้อย → มาก" },
                    { value: "completion_desc", label: "% เสร็จมาก → น้อย" },
                    { value: "completion_asc",  label: "% เสร็จน้อย → มาก" },
                    { value: "id_asc",          label: "ลำดับยุทธศาสตร์" },
                  ]}
                />
              }
            />
            <div className="mt-4 space-y-2">
              {stratSorted.map((s, i) => {
                const pct = stratMax > 0 ? (s.total_budget / stratMax) * 100 : 0;
                const c = STRAT_COLORS[i % STRAT_COLORS.length];
                const isActive = filterStrategy === s.id;
                const prog = data.byStrategyProgress.find(p => p.id === s.id);
                return (
                  <HoverCard key={s.id} openDelay={400} closeDelay={100}>
                    <HoverCardTrigger asChild>
                      <button
                        onClick={() => setStrategyFilter(s.id)}
                        className={[
                          "w-full text-left group p-3 rounded-xl transition-all duration-150 -mx-1 press-effect",
                          isActive
                            ? "bg-primary-soft ring-1 ring-primary/30"
                            : "hover:bg-muted/50",
                          filterStrategy !== null && !isActive ? "opacity-50" : "",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`size-6 rounded-md text-xs font-semibold flex items-center justify-center shrink-0 ${isActive ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary"}`}>
                              {s.id}
                            </span>
                            <span className="font-medium text-sm truncate">{s.name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.badge}`}>{s.project_count} โครงการ</span>
                            <span className="text-sm font-semibold tabular">{formatBaht(s.total_budget, { compact: true })}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full bg-gradient-to-r ${c.bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground tabular w-10 text-right">{Math.round(pct)}%</span>
                        </div>
                      </button>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-72 p-4" side="right" align="start">
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="size-5 rounded bg-primary-soft text-primary text-[10px] font-bold flex items-center justify-center">{s.id}</span>
                            <span className="text-sm font-semibold leading-tight">{s.full_name ?? s.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">งบประมาณ {formatBaht(s.total_budget)} บาท · {s.project_count} โครงการ</p>
                        </div>
                        {prog && (
                          <>
                            <div className="grid grid-cols-2 gap-1.5 text-xs">
                              {([
                                { label: "เสร็จสิ้น",   v: prog.completed,   color: "text-success" },
                                { label: "ดำเนินการ",   v: prog.in_progress, color: "text-warning" },
                                { label: "วางแผน",      v: prog.planning,    color: "text-info"    },
                                { label: "ยกเลิก",      v: prog.cancelled,   color: "text-destructive" },
                              ] as const).map(({ label, v, color }) => (
                                <div key={label} className="flex items-center justify-between bg-muted/50 rounded-lg px-2 py-1">
                                  <span className="text-muted-foreground">{label}</span>
                                  <span className={`font-semibold tabular ${color}`}>{v}</span>
                                </div>
                              ))}
                            </div>
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-muted-foreground">อัตราความสำเร็จ</span>
                                <span className={`font-bold ${prog.completion_rate >= 60 ? "text-success" : prog.completion_rate >= 30 ? "text-warning" : "text-muted-foreground"}`}>{prog.completion_rate}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full bg-success transition-all duration-500" style={{ width: `${prog.completion_rate}%` }} />
                              </div>
                            </div>
                          </>
                        )}
                        <p className="text-[10px] text-muted-foreground/60">คลิกเพื่อกรองโครงการในยุทธศาสตร์นี้</p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                );
              })}
            </div>
          </Card>

          {/* Treemap — clickable */}
          <Card>
            <CardHeader title="Treemap งบประมาณ" subtitle="คลิกช่องเพื่อกรองยุทธศาสตร์" />
            <div className="h-[320px] mt-4">
              <ResponsiveContainer width="100%" height={320}>
                <Treemap
                  data={data.byStrategy.map((s, i) => ({
                    name: s.name, size: Math.round(s.total_budget / 1_000_000),
                    colorIndex: i, stratId: s.id,
                    dimmed: filterStrategy !== null && filterStrategy !== s.id,
                  }))}
                  dataKey="size"
                  aspectRatio={4 / 3}
                  stroke="oklch(1 0 0 / 0.08)"
                  onClick={(node: any) => { if (node?.stratId) setStrategyFilter(node.stratId); }}
                  style={{ cursor: "pointer" }}
                  content={<TreemapCell activeId={filterStrategy} />}
                />
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        {/* ── Radar chart ───────────────────────────────────────────────── */}
        <section>
          <Card>
            <CardHeader title="Radar เปรียบเทียบยุทธศาสตร์" subtitle="สัดส่วนโครงการ vs งบประมาณ (% เทียบยุทธศาสตร์สูงสุด)" />
            <div className="h-[300px] mt-4">
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart
                  data={(() => {
                    const maxProj   = Math.max(...data.byStrategy.map((s) => s.project_count));
                    const maxBudget = Math.max(...data.byStrategy.map((s) => s.total_budget));
                    return data.byStrategy.map((s) => ({
                      subject:  s.name,
                      stratId:  s.id,
                      โครงการ:  Math.round((s.project_count / maxProj) * 100),
                      งบประมาณ: Math.round((s.total_budget / maxBudget) * 100),
                    }));
                  })()}
                  outerRadius={80}
                  margin={{ top: 30, right: 90, bottom: 30, left: 90 }}
                >
                  <PolarGrid stroke="oklch(0.88 0.02 150)" />
                  <PolarAngleAxis dataKey="subject" tick={CustomPolarAngleTick} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: "oklch(0.6 0.02 160)" }} tickCount={4} />
                  <Radar name="โครงการ"  dataKey="โครงการ"  stroke="oklch(0.52 0.105 165)" fill="oklch(0.52 0.105 165)" fillOpacity={0.25} strokeWidth={2} />
                  <Radar name="งบประมาณ" dataKey="งบประมาณ" stroke="oklch(0.74 0.12 88)"   fill="oklch(0.74 0.12 88)"   fillOpacity={0.2}  strokeWidth={2} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 4 }} formatter={(v) => <span className="text-foreground">{v} (%)</span>} />
                  <ReTooltip contentStyle={tooltipStyle as any} formatter={(v: any, name: any) => [`${v}%`, name]} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        {/* ── Interactive filtered table ─────────────────────────────────── */}
        <section ref={tableRef} id="filtered-table">
          <Card accent>
            {/* Table header with filter chips */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-primary" />
                <h3 className="text-base font-semibold tracking-tight">
                  {hasFilter ? "ผลการกรองโครงการ" : "โครงการล่าสุด"}
                </h3>
                {tableFetching && (
                  <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <SortSelect
                  value={tableSort}
                  onChange={(v) => setTableSort(v as TableSort)}
                  options={[
                    { value: "default",     label: "ค่าเริ่มต้น" },
                    { value: "budget_desc", label: "งบมาก → น้อย" },
                    { value: "budget_asc",  label: "งบน้อย → มาก" },
                    { value: "name_asc",    label: "ชื่อ ก → ฮ" },
                    { value: "status_asc",  label: "สถานะ A → Z" },
                    { value: "dept_asc",    label: "หน่วยงาน ก → ฮ" },
                  ]}
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Active filter chip */}
                {filterLabel && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-xs font-medium">
                    <Filter className="size-3" />
                    {filterLabel}
                    <button onClick={clearFilters} className="ml-1 hover:text-destructive transition-colors rounded-full">
                      <X className="size-3" />
                    </button>
                  </span>
                )}
                {hasFilter && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                  >
                    ล้างตัวกรอง
                  </button>
                )}
                <Link
                  to="/projects"
                  className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors shadow-soft"
                >
                  ดูทั้งหมด <ArrowUpRight className="size-3" />
                </Link>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="px-3 py-2.5 font-medium">#</th>
                    <th className="px-3 py-2.5 font-medium">ชื่อโครงการ</th>
                    <th className="px-3 py-2.5 font-medium hidden md:table-cell">หน่วยงาน</th>
                    <th className="px-3 py-2.5 font-medium hidden lg:table-cell">ยุทธศาสตร์</th>
                    <th className="px-3 py-2.5 font-medium text-right hidden sm:table-cell">งบรวม</th>
                    <th className="px-3 py-2.5 font-medium">สถานะ</th>
                    <th className="px-3 py-2.5 font-medium text-center w-12">เมนู</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.length === 0 && !tableFetching && (
                    <tr>
                      <td colSpan={7} className="px-3 py-12 text-center text-muted-foreground text-sm">
                        {hasFilter ? "ไม่พบโครงการที่ตรงกับตัวกรอง" : "ยังไม่มีข้อมูลโครงการ"}
                      </td>
                    </tr>
                  )}
                  {tableSorted.map((p, i) => (
                    <tr
                      key={p.id}
                      className={[
                        "border-b border-border/50 transition-colors group cursor-pointer",
                        selectedProjectId === p.id
                          ? "bg-primary/8 ring-1 ring-inset ring-primary/20"
                          : "hover:bg-muted/40",
                      ].join(" ")}
                      onClick={(e) => {
                        // Don't open sheet when clicking the quick-menu
                        if ((e.target as HTMLElement).closest("[data-quick-menu]")) return;
                        setSelectedProjectId(p.id);
                      }}
                    >
                      <td className="px-3 py-3 text-muted-foreground tabular text-xs">{i + 1}</td>
                      <td className="px-3 py-3 max-w-[220px]">
                        <span className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
                          {p.name}
                        </span>
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell text-muted-foreground text-xs max-w-[140px] truncate">{p.department ?? "—"}</td>
                      <td className="px-3 py-3 hidden lg:table-cell text-xs text-muted-foreground max-w-[160px] truncate" title={p.strategy_name ?? undefined}>{p.strategy_name ?? "—"}</td>
                      <td className="px-3 py-3 text-right tabular text-xs hidden sm:table-cell font-medium">{formatBaht(p.total_budget, { compact: true })}</td>
                      <td className="px-3 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-3 py-3 text-center" data-quick-menu>
                        <QuickMenu projectId={p.id} projectName={p.name} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasFilter && filteredResult && filteredResult.total > 50 && (
              <div className="mt-3 text-center text-xs text-muted-foreground">
                แสดง 50 รายการแรกจากทั้งหมด {filteredResult.total.toLocaleString("th-TH")} รายการ ·{" "}
                <Link to="/projects" className="text-primary underline underline-offset-2 hover:no-underline">ดูทั้งหมด</Link>
              </div>
            )}
          </Card>
        </section>

        {/* ── Progress chart ─────────────────────────────────────────────── */}
        <section>
          <Card>
            <CardHeader
              title="ความคืบหน้าโครงการตามยุทธศาสตร์"
              subtitle="Stacked bar — สัดส่วน 4 สถานะต่อยุทธศาสตร์ และอัตราความสำเร็จ"
              sortControl={
                <SortSelect
                  value={progressSort}
                  onChange={(v) => setProgressSort(v as ProgressSort)}
                  options={[
                    { value: "completion_desc", label: "% เสร็จมาก → น้อย" },
                    { value: "completion_asc",  label: "% เสร็จน้อย → มาก" },
                    { value: "count_desc",      label: "โครงการมาก → น้อย" },
                    { value: "budget_desc",     label: "งบมาก → น้อย" },
                    { value: "id_asc",          label: "ลำดับยุทธศาสตร์" },
                  ]}
                />
              }
            />
            <ProgressChart data={progressSorted} onStrategyClick={setStrategyFilter} activeId={filterStrategy} />
          </Card>
        </section>

        {/* ── Top departments ────────────────────────────────────────────── */}
        <section>
          <Card>
            <CardHeader
              title="หน่วยงานรับผิดชอบโครงการสูงสุด"
              subtitle="เรียงลำดับได้ตามต้องการ"
              sortControl={
                <SortSelect
                  value={deptSort}
                  onChange={(v) => setDeptSort(v as DeptSort)}
                  options={[
                    { value: "count_desc",  label: "โครงการมาก → น้อย" },
                    { value: "count_asc",   label: "โครงการน้อย → มาก" },
                    { value: "budget_desc", label: "งบมาก → น้อย" },
                    { value: "budget_asc",  label: "งบน้อย → มาก" },
                    { value: "name_asc",    label: "ชื่อ A → Z" },
                  ]}
                />
              }
            />
            <div className="mt-4 overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="px-3 py-3 font-medium">อันดับ</th>
                    <th className="px-3 py-3 font-medium">หน่วยงาน</th>
                    <th className="px-3 py-3 font-medium text-right">โครงการ</th>
                    <th className="px-3 py-3 font-medium text-right">งบประมาณรวม</th>
                    <th className="px-3 py-3 font-medium w-[120px]">สัดส่วน</th>
                  </tr>
                </thead>
                <tbody>
                  {deptSorted.map((d, i) => {
                    const max = deptSorted[0]?.count ?? 1;
                    const pct = (d.count / max) * 100;
                    return (
                      <tr key={d.department} className="border-b border-border/60 hover:bg-muted/30 transition">
                        <td className="px-3 py-3">
                          <span className={["inline-flex size-7 items-center justify-center rounded-md text-xs font-semibold", i < 3 ? "bg-gold/20 text-gold-foreground ring-1 ring-gold/40" : "bg-muted text-muted-foreground"].join(" ")}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-medium">{d.department}</td>
                        <td className="px-3 py-3 text-right tabular">{d.count.toLocaleString("th-TH")}</td>
                        <td className="px-3 py-3 text-right tabular text-xs">{formatBaht(d.budget, { compact: true })}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-gradient" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground tabular w-8">{Math.round(pct)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

      </div>

      {/* Project Detail Sheet */}
      <ProjectDetailSheet
        projectId={selectedProjectId}
        onClose={() => setSelectedProjectId(null)}
      />

      {/* Floating clear-filter button — visible whenever any filter is active */}
      {hasFilter && (
        <button
          onClick={clearFilters}
          title="ล้างตัวกรองทั้งหมด"
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-3 text-sm font-semibold shadow-lg hover:shadow-xl hover:bg-primary/90 transition-all press-effect animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <X className="size-4" />
          ล้างตัวกรอง
          {filterLabel && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium ml-1">
              {filterLabel}
            </span>
          )}
        </button>
      )}
    </AppLayout>
  );
}


// ─── Project Detail Sheet ─────────────────────────────────────────────────────
function ProjectDetailSheet({ projectId, onClose }: { projectId: number | null; onClose: () => void }) {
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
      qc.invalidateQueries({ queryKey: ["projects-filtered"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setEditOpen(false);
      toast.success("บันทึกการแก้ไขเรียบร้อยแล้ว", { icon: "✅" });
    },
  });

  const patchStatus = useMutation({
    mutationFn: (s: Status) => apiPatchProjectStatus(projectId!, s),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["projects-filtered"] });
    },
  });

  return (
    <>
      <Sheet open={projectId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg p-0 flex flex-col"
        >
          {/* ── Fixed header ─────────────────────────────────── */}
          <div className="shrink-0 bg-background/95 backdrop-blur border-b border-border px-6 py-4">
            <SheetHeader>
              <SheetTitle className="text-base font-semibold pr-6 leading-snug">
                {isLoading ? "กำลังโหลด..." : (project?.name ?? "รายละเอียดโครงการ")}
              </SheetTitle>
            </SheetHeader>
          </div>

          {/* ── Scrollable body ──────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {isLoading && (
              <div className="flex items-center justify-center py-16">
                <div className="size-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {project && (
              <>
                {/* Status + budget hero */}
                <div className="rounded-2xl bg-emerald-gradient p-5 text-primary-foreground">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-primary-foreground/70 mb-1">สถานะปัจจุบัน</div>
                      <StatusBadge status={project.status} />
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-primary-foreground/70">งบประมาณรวม</div>
                      <div className="text-xl font-bold tabular mt-0.5">
                        {formatBaht(project.total_budget, { compact: true })}
                      </div>
                      <div className="text-[11px] text-primary-foreground/60">บาท</div>
                    </div>
                  </div>
                </div>

                {/* Hierarchy breadcrumb */}
                {project.strategy && (
                  <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">{project.strategy.name}</span>
                    {project.tactic && (
                      <>
                        <span>›</span>
                        <span>{project.tactic.code}: {project.tactic.name}</span>
                      </>
                    )}
                    {project.plan && (
                      <>
                        <span>›</span>
                        <span>{project.plan.name}</span>
                      </>
                    )}
                  </div>
                )}

                {/* Meta info */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "หน่วยงาน", value: project.department },
                    { label: "แหล่งข้อมูล", value: project.source_sheet },
                    { label: "เพิ่มเมื่อ", value: new Date(project.created_at).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" }) },
                    { label: "รหัสโครงการ", value: `#${project.id}` },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl bg-muted/50 px-3 py-2.5">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</div>
                      <div className="text-sm font-medium truncate">{value ?? "—"}</div>
                    </div>
                  ))}
                </div>

                {/* Budget by year */}
                <div className="rounded-xl border border-border p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">งบประมาณรายปี</div>
                  <div className="space-y-2">
                    {YEARS.map((y) => {
                      const amt = project.budgets[y] || 0;
                      const max = Math.max(...YEARS.map(yr => project.budgets[yr] || 0), 1);
                      const pct = (amt / max) * 100;
                      return (
                        <div key={y}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">ปี {y}</span>
                            <span className="font-medium tabular">{amt > 0 ? formatBaht(amt, { compact: true }) : "—"}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-gradient transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Details */}
                {([
                  { label: "วัตถุประสงค์", value: project.objective },
                  { label: "เป้าหมาย", value: project.target },
                  { label: "ตัวชี้วัด (KPI)", value: project.kpi },
                  { label: "ผลที่คาดว่าจะได้รับ", value: project.expected_result },
                ] as const).filter(({ value }) => value).map(({ label, value }) => (
                  <div key={label} className="rounded-xl border border-border p-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{label}</div>
                    <p className="text-sm leading-relaxed text-foreground/85">{value}</p>
                  </div>
                ))}

                {/* Status stepper */}
                <div className="rounded-xl border border-border p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">เปลี่ยนสถานะ</div>
                  <div className="flex flex-wrap gap-2">
                    {(["planning", "in_progress", "completed", "cancelled"] as Status[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          patchStatus.mutate(s);
                          toast.success(`เปลี่ยนสถานะเป็น "${STATUS_LABEL[s]}" แล้ว`, { icon: "✅" });
                        }}
                        disabled={patchStatus.isPending || project.status === s}
                        className={[
                          "text-xs px-3 py-1.5 rounded-lg border font-medium transition-all",
                          project.status === s
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:bg-muted border-border text-foreground/70",
                        ].join(" ")}
                      >
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Fixed footer ─────────────────────────────────── */}
          {project && (
            <div className="shrink-0 bg-background/95 backdrop-blur border-t border-border px-6 py-4 flex items-center gap-3">
              {isLoggedIn && (
                <button
                  onClick={() => setEditOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition press-effect"
                >
                  <Pencil className="size-3.5" />
                  แก้ไขโครงการ
                </button>
              )}
              <Link
                to="/projects/$projectId"
                params={{ projectId: String(project.id) }}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-background hover:bg-muted px-4 py-2.5 text-sm font-medium transition flex-1"
              >
                <ExternalLink className="size-3.5" />
                ดูเต็มหน้า
              </Link>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit dialog */}
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

// ─── Quick action dropdown menu ───────────────────────────────────────────────
function QuickMenu({ projectId, projectName }: { projectId: number; projectName: string }) {
  const { isLoggedIn } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label="เมนูด่วน"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 surface-float rounded-xl overflow-hidden w-48 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium border-b border-border/50 mb-1">
            จัดการโครงการ
          </div>
          <Link
            to="/projects/$projectId"
            params={{ projectId: String(projectId) }}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
          >
            <Eye className="size-3.5 text-muted-foreground" />
            ดูรายละเอียด
          </Link>
          {isLoggedIn && (
            <Link
              to="/projects/$projectId"
              params={{ projectId: String(projectId) }}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
            >
              <Pencil className="size-3.5 text-muted-foreground" />
              แก้ไขโครงการ
            </Link>
          )}
          <div className="border-t border-border/50 mt-1 pt-1">
            <button
              onClick={async () => {
                const url = `${window.location.origin}/projects/${projectId}`;
                await navigator.clipboard?.writeText(url);
                setOpen(false);
                toast.success("คัดลอกลิงก์แล้ว", { description: url, icon: "🔗", duration: 2500 });
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
            >
              <ExternalLink className="size-3.5 text-muted-foreground" />
              คัดลอกลิงก์
            </button>
          </div>
          <div className="border-t border-border/50 mt-1 pt-1">
            <button
              onClick={async () => {
                const rowData = `ID:${projectId}\t${projectName}`;
                await navigator.clipboard?.writeText(rowData);
                setOpen(false);
                toast.success("คัดลอกข้อมูลแล้ว", { description: `${projectName.slice(0, 40)}…`, icon: "📋", duration: 2000 });
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/60 transition-colors text-muted-foreground"
            >
              <ChevronDown className="size-3.5" />
              คัดลอกข้อมูลแถว
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const STRATEGY_COLORS = [
  "oklch(0.48 0.105 165)",
  "oklch(0.68 0.12 88)",
  "oklch(0.50 0.10 230)",
  "oklch(0.52 0.12 340)",
  "oklch(0.50 0.10 280)",
  "oklch(0.48 0.10 195)",
];

function TreemapCell(props: any) {
  const { x, y, width, height, name, value, colorIndex, stratId, activeId } = props;
  if (!width || !height || width < 10 || height < 10) return null;
  const color = STRATEGY_COLORS[colorIndex % STRATEGY_COLORS.length];
  const isActive = activeId === null || activeId === stratId;
  const clipId = `tree-clip-${stratId}`;
  return (
    <g style={{ cursor: "pointer" }}>
      <title>{name}</title>
      <defs>
        <clipPath id={clipId}>
          <rect x={x + 4} y={y + 4} width={width - 8} height={height - 8} />
        </clipPath>
      </defs>
      <rect
        x={x} y={y} width={width} height={height}
        style={{ fill: color, stroke: "oklch(1 0 0 / 0.12)", strokeWidth: 2, opacity: isActive ? 1 : 0.35 }}
        rx={6}
      />
      {activeId === stratId && (
        <rect x={x + 2} y={y + 2} width={width - 4} height={3}
          style={{ fill: "white", opacity: 0.5 }} rx={2} />
      )}
      {width > 50 && height > 30 && (
        <>
          <text
            clipPath={`url(#${clipId})`}
            x={x + width / 2} y={y + height / 2 - (height > 50 ? 8 : 0)}
            textAnchor="middle" dominantBaseline="middle"
            fill="white" fontSize={Math.min(12, width / 8)} fontWeight={600}
            opacity={isActive ? 1 : 0.4}
          >
            {name}
          </text>
          {height > 50 && (
            <text
              clipPath={`url(#${clipId})`}
              x={x + width / 2} y={y + height / 2 + 12}
              textAnchor="middle" dominantBaseline="middle"
              fill="white" fontSize={10} opacity={isActive ? 0.85 : 0.3}
            >
              {value?.toLocaleString("th-TH")} ล้านบาท
            </text>
          )}
        </>
      )}
    </g>
  );
}

/** Count Thai grapheme clusters (not raw code-point length) */
function graphemeLen(s: string): number {
  return Array.from(new Intl.Segmenter("th", { granularity: "grapheme" }).segment(s)).length;
}

/**
 * Wrap Thai text by word boundary (Intl.Segmenter "word"), keeping
 * each line ≤ maxPerLine grapheme clusters.  Long single words are
 * left intact on one line (no mid-word break).
 */
function wrapThai(text: string, maxPerLine: number): string[] {
  const words = Array.from(
    new Intl.Segmenter("th", { granularity: "word" }).segment(text),
  ).map((s) => s.segment);

  const lines: string[] = [];
  let current = "";
  let currentLen = 0;

  for (const word of words) {
    const wLen = graphemeLen(word);
    if (currentLen === 0) {
      current = word;
      currentLen = wLen;
    } else if (currentLen + wLen <= maxPerLine) {
      current += word;
      currentLen += wLen;
    } else {
      lines.push(current);
      current = word;
      currentLen = wLen;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines.length > 0 ? lines : [text];
}

function CustomPolarAngleTick({ x, y, cx, payload, textAnchor }: any) {
  const text = String(payload?.value ?? "");

  // Side labels get narrower lines; top/bottom labels get wider
  const dx = x - (cx ?? 0);
  const isCenter = Math.abs(dx) < 20;
  const maxPerLine = isCenter ? 14 : 9;

  const lines = wrapThai(text, maxPerLine);
  const lineH = 14;
  const startY = y - ((lines.length - 1) * lineH) / 2;

  return (
    <text
      textAnchor={textAnchor ?? "middle"}
      fontSize={11}
      fill="oklch(0.35 0.03 160)"
      fontWeight={500}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={x} y={startY + i * lineH}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function Card({ children, className = "", accent = false }: { children: React.ReactNode; className?: string; accent?: boolean }) {
  return (
    <div className={`surface-premium rounded-2xl p-5 lg:p-6 transition-shadow hover:shadow-float ${accent ? "card-accent-top" : ""} ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle, sortControl }: { title: string; subtitle?: string; sortControl?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {sortControl && <div className="shrink-0">{sortControl}</div>}
    </div>
  );
}

function SortSelect({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none text-xs bg-muted/60 hover:bg-muted border border-border rounded-lg pl-2.5 pr-7 py-1.5 font-medium text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ArrowUpDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
    </div>
  );
}

function StatusKpiCard({
  label, count, total, pct, icon, colorClass, barClass, bgClass, active, onClick,
}: {
  label: string; count: number; total: number; pct: number;
  icon: React.ReactNode; colorClass: string; barClass: string; bgClass: string;
  active?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full text-left rounded-2xl p-4 transition-all duration-150 cursor-pointer",
        active
          ? "surface-premium ring-2 ring-primary/40 shadow-[var(--shadow-glow)]"
          : "bg-card border border-border shadow-soft hover:shadow-elevated hover:scale-[1.01]",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        <div className={`size-9 rounded-xl flex items-center justify-center ${bgClass} ${colorClass} ${active ? "ring-1 ring-current/30" : ""}`}>{icon}</div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <div className={`text-3xl font-bold tabular tracking-tight ${colorClass}`}>{count.toLocaleString("th-TH")}</div>
        <div className="text-xs text-muted-foreground">โครงการ</div>
      </div>
      <div className="mt-2.5">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>สัดส่วน</span>
          <span className={`font-semibold ${colorClass}`}>{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className={`h-full rounded-full ${barClass} transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      {active && (
        <div className="mt-2 text-[10px] text-primary/70 font-medium flex items-center gap-1">
          <Filter className="size-2.5" /> กำลังกรองอยู่ · คลิกเพื่อยกเลิก
        </div>
      )}
    </button>
  );
}

function StatCard({
  label, value, sub, icon, tone,
}: {
  label: string; value: string; sub: string; icon: React.ReactNode;
  tone: "primary" | "gold" | "info" | "success";
}) {
  const tones: Record<typeof tone, string> = {
    primary: "bg-primary-soft text-primary",
    gold: "bg-gold/15 text-gold-foreground ring-1 ring-gold/30",
    info: "bg-info/10 text-info",
    success: "bg-success/10 text-success",
  };
  return (
    <div className="bg-card rounded-2xl border border-border p-4 shadow-soft hover:shadow-elevated transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className={`size-9 rounded-xl flex items-center justify-center ${tones[tone]}`}>{icon}</div>
      </div>
      <div className="mt-2.5 flex items-baseline gap-1.5">
        <div className="text-2xl font-semibold tracking-tight tabular">{value}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}

// ─── Progress Chart Component ─────────────────────────────────────────────────
const STATUS_FILL: Record<string, string> = {
  completed:   "oklch(0.52 0.105 165)",
  in_progress: "oklch(0.72 0.13 88)",
  planning:    "oklch(0.55 0.12 260)",
  cancelled:   "oklch(0.52 0.18 25)",
};
const STATUS_LABEL_TH: Record<string, string> = {
  completed:   "เสร็จสิ้น",
  in_progress: "ดำเนินการ",
  planning:    "วางแผน",
  cancelled:   "ยกเลิก",
};

function ProgressChart({
  data, onStrategyClick, activeId,
}: {
  data: StrategyProgress[];
  onStrategyClick: (id: number | null) => void;
  activeId: number | null;
}) {
  const tooltipStyle = {
    borderRadius: 12,
    border: "1px solid oklch(0.9 0.015 140)",
    background: "oklch(1 0 0)",
    boxShadow: "0 10px 30px -10px oklch(0 0 0 / 0.15)",
    fontSize: 12,
  };

  const chartData = data.map((s) => ({
    name: "S" + s.id,
    fullName: s.full_name,
    stratId: s.id,
    completed:   s.completed,
    in_progress: s.in_progress,
    planning:    s.planning,
    cancelled:   s.cancelled,
    total:       s.project_count,
    rate:        s.completion_rate,
    dimmed:      activeId !== null && activeId !== s.id,
  }));

  const CustomLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (!value || width < 24) return null;
    return (
      <text x={x + width / 2} y={y + 10} textAnchor="middle" dominantBaseline="middle"
        fill="white" fontSize={9} fontWeight={600} opacity={0.9}>
        {value}
      </text>
    );
  };

  return (
    <div className="mt-5 space-y-4">
      {/* Stacked 100% horizontal bar chart */}
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 4, right: 48, top: 4, bottom: 4 }}
            onClick={(e: any) => {
              const id = e?.activePayload?.[0]?.payload?.stratId as number | undefined;
              if (id) onStrategyClick(activeId === id ? null : id);
            }}
            style={{ cursor: "pointer" }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.015 140)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: "oklch(0.55 0.02 160)" }} axisLine={false} tickLine={false} />
            <YAxis
              type="category" dataKey="name" width={30}
              tick={({ x, y, payload }: any) => (
                <text
                  x={(x as number) - 4} y={y} textAnchor="end" dominantBaseline="middle"
                  fontSize={10} fill={activeId === null || activeId === chartData.find(d => d.name === payload.value)?.stratId ? "oklch(0.35 0.02 160)" : "oklch(0.7 0.01 160)"}
                  fontWeight={activeId !== null && activeId === chartData.find(d => d.name === payload.value)?.stratId ? 700 : 400}
                >
                  {payload.value}
                </text>
              )}
              axisLine={false} tickLine={false}
            />
            <ReTooltip
              contentStyle={tooltipStyle as any}
              formatter={(v: any, name: any) => [v + " โครงการ", STATUS_LABEL_TH[String(name)] ?? String(name)]}
              labelFormatter={(l: any, payload: any) => {
                const d = payload?.[0]?.payload;
                return d ? `${d.fullName} (สำเร็จ ${d.rate}%)` : l;
              }}
            />
            <Legend
              iconType="circle"
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={(v) => <span className="text-foreground">{STATUS_LABEL_TH[v] ?? v}</span>}
            />
            {(["completed", "in_progress", "planning", "cancelled"] as const).map((st) => (
              <Bar
                key={st} dataKey={st} stackId="a"
                fill={STATUS_FILL[st]}
                radius={st === "cancelled" ? [0, 4, 4, 0] : st === "completed" ? [4, 0, 0, 4] : [0, 0, 0, 0]}
                maxBarSize={28}
                label={st === "completed" ? <CustomLabel /> : undefined}
              >
                {chartData.map((d) => (
                  <Cell
                    key={d.stratId}
                    fill={STATUS_FILL[st]}
                    opacity={d.dimmed ? 0.25 : 1}
                  />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Completion rate mini-cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {data.map((s) => {
          const isActive = activeId === s.id;
          const isDimmed = activeId !== null && !isActive;
          return (
            <button
              key={s.id}
              onClick={() => onStrategyClick(isActive ? null : s.id)}
              className={[
                "rounded-xl p-2.5 text-left transition-all duration-150 border",
                isActive
                  ? "bg-primary-soft border-primary/30 ring-1 ring-primary/30"
                  : isDimmed
                  ? "bg-card border-border opacity-40"
                  : "bg-card border-border hover:border-primary/30 hover:bg-primary-soft/30",
              ].join(" ")}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground">S{s.id}</span>
                <span className={`text-xs font-bold tabular ${
                  s.completion_rate >= 60 ? "text-success" :
                  s.completion_rate >= 30 ? "text-warning" : "text-muted-foreground"
                }`}>{s.completion_rate}%</span>
              </div>
              {/* Mini progress bar */}
              <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-1.5">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${s.completion_rate}%`,
                    background: s.completion_rate >= 60
                      ? "oklch(0.52 0.105 165)"
                      : s.completion_rate >= 30
                      ? "oklch(0.72 0.13 88)"
                      : "oklch(0.7 0.02 160)",
                  }}
                />
              </div>
              {/* Stacked mini bar */}
              <div className="flex h-1 rounded-full overflow-hidden gap-px">
                {s.project_count > 0 && ([
                  { key: "completed",   v: s.completed   },
                  { key: "in_progress", v: s.in_progress },
                  { key: "planning",    v: s.planning    },
                  { key: "cancelled",   v: s.cancelled   },
                ] as const).map(({ key, v }) => v > 0 ? (
                  <div
                    key={key}
                    style={{ width: `${(v / s.project_count) * 100}%`, background: STATUS_FILL[key] }}
                  />
                ) : null)}
              </div>
              <div className="mt-1.5 text-[10px] text-muted-foreground truncate">
                {s.project_count} โครงการ
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
