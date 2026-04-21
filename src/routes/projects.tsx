import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import {
  projects,
  strategies,
  plans,
  tactics,
  DEPARTMENTS,
  YEARS,
  STATUS_LABEL,
  formatBaht,
  type Status,
} from "@/lib/mock-data";
import { Search, Filter, ChevronLeft, ChevronRight, X, ArrowUpDown } from "lucide-react";

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
  const [search, setSearch] = useState("");
  const [strategyId, setStrategyId] = useState<number | "">("");
  const [planId, setPlanId] = useState<number | "">("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState<Status | "">("");
  const [year, setYear] = useState<number | "">("");
  const [page, setPage] = useState(1);

  const availablePlans = useMemo(() => {
    if (!strategyId) return plans;
    const tIds = tactics.filter((t) => t.strategy_id === strategyId).map((t) => t.id);
    return plans.filter((p) => tIds.includes(p.tactic_id));
  }, [strategyId]);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !p.name.toLowerCase().includes(q) &&
          !p.department.toLowerCase().includes(q) &&
          !p.objective.toLowerCase().includes(q)
        )
          return false;
      }
      if (strategyId) {
        const plan = plans.find((x) => x.id === p.plan_id);
        const tactic = plan ? tactics.find((t) => t.id === plan.tactic_id) : null;
        if (!tactic || tactic.strategy_id !== strategyId) return false;
      }
      if (planId && p.plan_id !== planId) return false;
      if (department && p.department !== department) return false;
      if (status && p.status !== status) return false;
      if (year && !(p.budgets[year] > 0)) return false;
      return true;
    });
  }, [search, strategyId, planId, department, status, year]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const totalBudget = filtered.reduce(
    (s, p) => s + (year ? p.budgets[year as number] || 0 : p.total_budget),
    0,
  );

  const hasFilters = strategyId || planId || department || status || year || search;

  function clearFilters() {
    setSearch("");
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
              พบ <span className="font-medium text-foreground tabular">{filtered.length.toLocaleString("th-TH")}</span> โครงการ ·
              งบประมาณรวม <span className="font-medium text-foreground tabular">{formatBaht(totalBudget)} บาท</span>
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-2xl border border-border p-4 lg:p-5 shadow-soft">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
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

        {/* Project list */}
        <div className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground bg-muted/30 border-b border-border">
                  <th className="px-5 py-3.5 font-medium">โครงการ</th>
                  <th className="px-5 py-3.5 font-medium">หน่วยงาน</th>
                  <th className="px-5 py-3.5 font-medium">ยุทธศาสตร์</th>
                  <th className="px-5 py-3.5 font-medium text-right">
                    <span className="inline-flex items-center gap-1">
                      งบประมาณ {year ? `(${year})` : "(รวม)"} <ArrowUpDown className="size-3" />
                    </span>
                  </th>
                  <th className="px-5 py-3.5 font-medium">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-16 text-center text-muted-foreground">
                      <Filter className="size-8 mx-auto mb-2 opacity-40" />
                      ไม่พบโครงการที่ตรงกับเงื่อนไข
                    </td>
                  </tr>
                ) : (
                  pageItems.map((p) => {
                    const plan = plans.find((x) => x.id === p.plan_id);
                    const tactic = plan ? tactics.find((t) => t.id === plan.tactic_id) : null;
                    const strategy = tactic ? strategies.find((s) => s.id === tactic.strategy_id) : null;
                    const budget = year ? p.budgets[year as number] || 0 : p.total_budget;
                    return (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-muted/40 transition group">
                        <td className="px-5 py-4 max-w-[420px]">
                          <Link
                            to="/projects/$projectId"
                            params={{ projectId: String(p.id) }}
                            className="font-medium line-clamp-2 group-hover:text-primary transition"
                          >
                            {p.name}
                          </Link>
                          {tactic && (
                            <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1.5">
                              <span className="inline-flex items-center justify-center size-4 rounded bg-primary-soft text-primary text-[10px] font-semibold">
                                {tactic.code}
                              </span>
                              <span className="truncate">{plan?.name}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 text-foreground/80">{p.department}</td>
                        <td className="px-5 py-4">
                          {strategy && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs">
                              <span className="size-1.5 rounded-full bg-primary" />
                              {strategy.short_name}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right tabular font-medium">
                          {budget > 0 ? formatBaht(budget) : <span className="text-muted-foreground/60">—</span>}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={p.status} />
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
                แสดง {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} จาก {filtered.length}
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
