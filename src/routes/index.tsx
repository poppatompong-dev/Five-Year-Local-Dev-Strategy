import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { getDashboardData, formatBaht, projects, STATUS_COLOR, type Status } from "@/lib/mock-data";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Wallet,
  Layers,
  Building,
  ArrowUpRight,
  Calendar,
  Target,
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

function DashboardPage() {
  const data = getDashboardData();

  const recent = [...projects]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);

  return (
    <AppLayout>
      <div className="space-y-7">
        {/* Hero header */}
        <section className="relative overflow-hidden rounded-2xl bg-emerald-gradient p-7 lg:p-9 text-primary-foreground">
          <div
            aria-hidden
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(circle at 80% 20%, oklch(0.74 0.12 88 / 0.4), transparent 40%), radial-gradient(circle at 20% 80%, oklch(0.6 0.12 230 / 0.3), transparent 40%)",
            }}
          />
          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-medium ring-1 ring-white/20">
                <Calendar className="size-3.5" />
                ปีงบประมาณ 2566 – 2570
              </div>
              <h1 className="mt-4 text-3xl lg:text-4xl font-semibold tracking-tight">
                ภาพรวมแผนพัฒนาท้องถิ่น
              </h1>
              <p className="mt-2 text-primary-foreground/80 max-w-xl">
                สรุปผลการบริหารโครงการและงบประมาณตามยุทธศาสตร์การพัฒนาเทศบาลนครนครสวรรค์ ระยะ 5 ปี
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/projects"
                className="inline-flex items-center gap-2 rounded-lg bg-gold text-gold-foreground px-4 py-2.5 text-sm font-medium hover:brightness-105 transition shadow-[0_4px_20px_-4px_oklch(0.74_0.12_88_/_0.6)]"
              >
                ดูโครงการทั้งหมด
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Stat cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="โครงการทั้งหมด"
            value={data.totalProjects.toLocaleString("th-TH")}
            sub="โครงการ"
            icon={<Target className="size-5" />}
            trend="+12 จากปีก่อน"
            tone="primary"
          />
          <StatCard
            label="งบประมาณรวม 5 ปี"
            value={formatBaht(data.totalBudget, { compact: true })}
            sub="บาท"
            icon={<Wallet className="size-5" />}
            trend="กระจายตามยุทธศาสตร์"
            tone="gold"
          />
          <StatCard
            label="ยุทธศาสตร์"
            value={data.totalStrategies.toString()}
            sub={`${data.totalPlans} แผนงาน`}
            icon={<Layers className="size-5" />}
            trend="ครอบคลุมทุกด้าน"
            tone="info"
          />
          <StatCard
            label="หน่วยงานรับผิดชอบ"
            value={data.totalDepartments.toString()}
            sub="หน่วยงาน"
            icon={<Building className="size-5" />}
            trend="ทำงานร่วมกัน"
            tone="success"
          />
        </section>

        {/* Charts row 1 */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <Card className="xl:col-span-2">
            <CardHeader
              title="งบประมาณตามปี"
              subtitle="งบประมาณที่จัดสรรในแต่ละปีงบประมาณ (หน่วย: ล้านบาท)"
            />
            <div className="h-[300px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byYear.map((d) => ({ ...d, totalM: d.total / 1_000_000 }))} margin={{ left: -10, right: 10, top: 10 }}>
                  <defs>
                    <linearGradient id="barGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.52 0.105 165)" />
                      <stop offset="100%" stopColor="oklch(0.36 0.085 162)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.015 140)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "oklch(0.48 0.02 160)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "oklch(0.48 0.02 160)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "oklch(0.95 0.03 165 / 0.4)" }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid oklch(0.9 0.015 140)",
                      background: "oklch(1 0 0)",
                      boxShadow: "0 10px 30px -10px oklch(0 0 0 / 0.15)",
                    }}
                    formatter={(v: number) => [`${v.toLocaleString("th-TH", { maximumFractionDigits: 2 })} ล้านบาท`, "งบประมาณ"]}
                    labelFormatter={(l) => `ปีงบประมาณ ${l}`}
                  />
                  <Bar dataKey="totalM" fill="url(#barGreen)" radius={[8, 8, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHeader title="สถานะโครงการ" subtitle="สัดส่วนตามสถานะดำเนินงาน" />
            <div className="h-[300px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.byStatus}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {data.byStatus.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLOR[entry.status as Status]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid oklch(0.9 0.015 140)",
                      background: "oklch(1 0 0)",
                      boxShadow: "0 10px 30px -10px oklch(0 0 0 / 0.15)",
                    }}
                    formatter={(v: number, _n, p) => [`${v} โครงการ`, p.payload.label]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    formatter={(value) => <span className="text-foreground">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        {/* Strategy breakdown */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <Card className="xl:col-span-2">
            <CardHeader title="งบประมาณตามยุทธศาสตร์" subtitle="เปรียบเทียบงบประมาณรวม 5 ปี ของแต่ละยุทธศาสตร์" />
            <div className="mt-5 space-y-4">
              {data.byStrategy.map((s, i) => {
                const max = Math.max(...data.byStrategy.map((x) => x.total_budget));
                const pct = (s.total_budget / max) * 100;
                const colors = [
                  "from-emerald-700 to-emerald-500",
                  "from-amber-600 to-amber-400",
                  "from-sky-700 to-sky-500",
                  "from-rose-700 to-rose-500",
                  "from-violet-700 to-violet-500",
                  "from-teal-700 to-teal-500",
                ];
                return (
                  <div key={s.id}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="size-6 rounded-md bg-primary-soft text-primary text-xs font-semibold flex items-center justify-center shrink-0">
                          {s.id}
                        </span>
                        <span className="font-medium truncate">{s.name}</span>
                        <span className="text-muted-foreground text-xs shrink-0">· {s.project_count} โครงการ</span>
                      </div>
                      <span className="font-semibold tabular text-foreground shrink-0 ml-3">
                        {formatBaht(s.total_budget, { compact: true })}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${colors[i % colors.length]} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title="โครงการล่าสุด" subtitle="โครงการที่เพิ่มเข้าระบบล่าสุด" />
            <div className="mt-4 -mx-1 divide-y divide-border">
              {recent.map((p) => (
                <Link
                  key={p.id}
                  to="/projects/$projectId"
                  params={{ projectId: String(p.id) }}
                  className="flex items-start gap-3 py-3 px-1 hover:bg-muted/40 rounded-md transition group"
                >
                  <div className="size-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <TrendingUp className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium line-clamp-2 group-hover:text-primary transition">{p.name}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{p.department}</span>
                    </div>
                  </div>
                  <StatusBadge status={p.status} />
                </Link>
              ))}
            </div>
          </Card>
        </section>

        {/* Top departments table */}
        <section>
          <Card>
            <CardHeader title="หน่วยงานที่รับผิดชอบโครงการสูงสุด" subtitle="10 อันดับหน่วยงานเรียงตามจำนวนโครงการ" />
            <div className="mt-4 overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="px-3 py-3 font-medium">อันดับ</th>
                    <th className="px-3 py-3 font-medium">หน่วยงาน</th>
                    <th className="px-3 py-3 font-medium text-right">จำนวนโครงการ</th>
                    <th className="px-3 py-3 font-medium text-right">งบประมาณรวม (บาท)</th>
                    <th className="px-3 py-3 font-medium w-[140px]">สัดส่วน</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topDepts.map((d, i) => {
                    const max = data.topDepts[0].count;
                    const pct = (d.count / max) * 100;
                    return (
                      <tr key={d.department} className="border-b border-border/60 hover:bg-muted/30 transition">
                        <td className="px-3 py-3.5">
                          <span
                            className={[
                              "inline-flex size-7 items-center justify-center rounded-md text-xs font-semibold",
                              i < 3 ? "bg-gold/20 text-gold-foreground ring-1 ring-gold/40" : "bg-muted text-muted-foreground",
                            ].join(" ")}
                          >
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 font-medium">{d.department}</td>
                        <td className="px-3 py-3.5 text-right tabular">{d.count.toLocaleString("th-TH")}</td>
                        <td className="px-3 py-3.5 text-right tabular">{d.budget.toLocaleString("th-TH")}</td>
                        <td className="px-3 py-3.5">
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-gradient" style={{ width: `${pct}%` }} />
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
    </AppLayout>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card rounded-2xl border border-border p-5 lg:p-6 shadow-soft ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  trend,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  trend: string;
  tone: "primary" | "gold" | "info" | "success";
}) {
  const tones: Record<typeof tone, string> = {
    primary: "bg-primary-soft text-primary",
    gold: "bg-gold/15 text-gold-foreground ring-1 ring-gold/30",
    info: "bg-info/10 text-info",
    success: "bg-success/10 text-success",
  };
  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-soft hover:shadow-elevated transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className={`size-10 rounded-xl flex items-center justify-center ${tones[tone]}`}>{icon}</div>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <div className="text-3xl font-semibold tracking-tight tabular">{value}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
      <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
        <span className="inline-block size-1 rounded-full bg-success" />
        {trend}
      </div>
    </div>
  );
}
