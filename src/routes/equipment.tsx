import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { equipment, formatBaht, YEARS } from "@/lib/mock-data";
import { Search, ChevronLeft, ChevronRight, Wrench, Package } from "lucide-react";

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
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search) return equipment;
    const q = search.toLowerCase();
    return equipment.filter(
      (e) =>
        e.item_type.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q),
    );
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const items = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const totalBudget = filtered.reduce(
    (s, e) => s + e.budget_2566 + e.budget_2567 + e.budget_2568 + e.budget_2569 + e.budget_2570,
    0,
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">บัญชีครุภัณฑ์ (ผ.03)</div>
            <h1 className="text-3xl font-semibold tracking-tight mt-1">รายการครุภัณฑ์</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {filtered.length.toLocaleString("th-TH")} รายการ · งบประมาณรวม {formatBaht(totalBudget)} บาท
            </p>
          </div>
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MiniStat label="รายการทั้งหมด" value={equipment.length.toString()} icon={<Package className="size-4" />} />
          <MiniStat
            label="หมวดครุภัณฑ์"
            value={new Set(equipment.map((e) => e.category)).size.toString()}
            icon={<Wrench className="size-4" />}
          />
          <MiniStat
            label="งบประมาณรวม"
            value={formatBaht(totalBudget, { compact: true })}
            sub="บาท"
            icon={<Package className="size-4" />}
          />
          <MiniStat
            label="หน่วยงาน"
            value={new Set(equipment.map((e) => e.department)).size.toString()}
            icon={<Wrench className="size-4" />}
          />
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
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
                </tr>
              </thead>
              <tbody>
                {items.map((e) => {
                  const total = e.budget_2566 + e.budget_2567 + e.budget_2568 + e.budget_2569 + e.budget_2570;
                  return (
                    <tr key={e.id} className="border-b border-border/50 hover:bg-muted/40 transition">
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-border">
              <div className="text-xs text-muted-foreground">
                แสดง {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} จาก {filtered.length}
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
