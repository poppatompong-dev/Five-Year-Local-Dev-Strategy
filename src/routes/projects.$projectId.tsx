import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import {
  formatBaht,
  YEARS,
  STATUS_LABEL,
  type Status,
} from "@/lib/mock-data";
import { apiGetProject, apiPatchProjectStatus, apiUpdateProject, apiDeleteProject, type ProjectCreateInput } from "@/lib/api";
import { authClient } from "@/auth";
import { ProjectFormDialog } from "@/components/ProjectFormDialog";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, FileText, Target, Award, TrendingUp, Building2, Calendar, Pencil, Trash2 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/projects/$projectId")({
  head: ({ params }) => ({
    meta: [
      { title: `รายละเอียดโครงการ #${params.projectId} · แผนพัฒนาท้องถิ่น` },
      { name: "description", content: "รายละเอียดโครงการในแผนพัฒนาท้องถิ่น พร้อมงบประมาณรายปีและสถานะดำเนินงาน" },
    ],
  }),
  component: ProjectDetailPage,
  notFoundComponent: () => (
    <AppLayout>
      <div className="text-center py-20">
        <h1 className="text-2xl font-semibold">ไม่พบโครงการ</h1>
        <Link to="/projects" className="text-primary hover:underline mt-4 inline-block">กลับไปยังรายการโครงการ</Link>
      </div>
    </AppLayout>
  ),
});

function ProjectDetailPage() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const id = Number(projectId);

  const { data: session } = authClient.useSession();
  const isAuthed = !!session;

  const { data: project, isLoading, error } = useQuery({
    queryKey: ["project", id],
    queryFn: () => apiGetProject(id),
    enabled: isAuthed,
  });

  const [localStatus, setLocalStatus] = useState<Status | null>(null);
  const status = localStatus ?? project?.status ?? "planning";

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const patchStatus = useMutation({
    mutationFn: (s: Status) => apiPatchProjectStatus(id, s),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", id] }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: ProjectCreateInput) => apiUpdateProject(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      setEditOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiDeleteProject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      navigate({ to: "/projects" });
    },
  });

  function handleStatusChange(s: Status) {
    setLocalStatus(s);
    patchStatus.mutate(s);
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center text-muted-foreground">
            <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            กำลังโหลดข้อมูล...
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !project) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <h1 className="text-2xl font-semibold">ไม่พบโครงการ</h1>
          <Link to="/projects" className="text-primary hover:underline mt-4 inline-block">
            กลับไปยังรายการโครงการ
          </Link>
        </div>
      </AppLayout>
    );
  }

  const budgetData = YEARS.map((y) => ({
    label: `${y}`,
    amount: project.budgets[y] || 0,
  }));

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/projects" className="hover:text-foreground transition flex items-center gap-1">
            <ChevronLeft className="size-4" />
            โครงการทั้งหมด
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground truncate max-w-[300px]">โครงการ #{project.id}</span>
        </nav>

        {/* Hero */}
        <div className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
          <div className="bg-emerald-gradient p-6 lg:p-7 text-primary-foreground">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                {project.strategy && project.tactic && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="rounded-full bg-white/15 backdrop-blur px-2.5 py-1 ring-1 ring-white/20">
                      ยุทธศาสตร์ที่ {project.strategy.id}: {project.strategy.short_name}
                    </span>
                    <ChevronRight className="size-3 text-primary-foreground/60" />
                    <span className="rounded-full bg-white/15 backdrop-blur px-2.5 py-1 ring-1 ring-white/20">
                      กลยุทธ์ {project.tactic.code}
                    </span>
                    <ChevronRight className="size-3 text-primary-foreground/60" />
                    <span className="rounded-full bg-white/15 backdrop-blur px-2.5 py-1 ring-1 ring-white/20 truncate max-w-[260px]">
                      {project.plan?.name}
                    </span>
                  </div>
                )}
                <h1 className="mt-3 text-2xl lg:text-3xl font-semibold tracking-tight">{project.name}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-primary-foreground/80">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="size-4" />
                    {project.department}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-4" />
                    {project.source_sheet}
                  </div>
                </div>
              </div>
              <div className="text-right space-y-2">
                <div className="text-xs text-primary-foreground/70 uppercase tracking-wider">งบประมาณรวม 5 ปี</div>
                <div className="text-3xl lg:text-4xl font-semibold tracking-tight tabular mt-1 text-gold">
                  {formatBaht(project.total_budget)}
                </div>
                <div className="text-xs text-primary-foreground/70 mt-0.5">บาท</div>
                <div className="flex items-center gap-2 justify-end pt-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditOpen(true)}
                    className="gap-1 bg-white/15 text-white border-white/20 hover:bg-white/25"
                  >
                    <Pencil className="size-3.5" /> แก้ไข
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteOpen(true)}
                    className="gap-1"
                  >
                    <Trash2 className="size-3.5" /> ลบ
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 lg:p-7 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">สถานะปัจจุบัน:</span>
              <StatusBadge status={status} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground mr-1">เปลี่ยนสถานะ:</span>
              {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={[
                    "rounded-lg px-3 py-1.5 text-xs font-medium border transition",
                    s === status
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-foreground/70 hover:border-primary/40 hover:text-foreground",
                  ].join(" ")}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 space-y-5">
            <DetailCard icon={<FileText className="size-4" />} title="วัตถุประสงค์ของโครงการ">
              <p>{project.objective}</p>
            </DetailCard>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <DetailCard icon={<Target className="size-4" />} title="เป้าหมาย">
                <p>{project.target}</p>
              </DetailCard>
              <DetailCard icon={<TrendingUp className="size-4" />} title="ตัวชี้วัด (KPI)">
                <p>{project.kpi}</p>
              </DetailCard>
            </div>
            <DetailCard icon={<Award className="size-4" />} title="ผลที่คาดว่าจะได้รับ">
              <p>{project.expected_result}</p>
            </DetailCard>

            <div className="bg-card rounded-2xl border border-border p-5 lg:p-6 shadow-soft">
              <div>
                <h3 className="text-base font-semibold tracking-tight">งบประมาณรายปี</h3>
                <p className="text-xs text-muted-foreground mt-0.5">การจัดสรรงบประมาณตลอด 5 ปีงบประมาณ</p>
              </div>
              <div className="h-[260px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={budgetData} margin={{ left: -10, right: 10, top: 10 }}>
                    <defs>
                      <linearGradient id="budgetBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.74 0.12 88)" />
                        <stop offset="100%" stopColor="oklch(0.62 0.13 75)" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.015 140)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: "oklch(0.48 0.02 160)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "oklch(0.48 0.02 160)" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: "oklch(0.95 0.03 165 / 0.4)" }}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid oklch(0.9 0.015 140)",
                        background: "oklch(1 0 0)",
                      }}
                      formatter={(v) => [`${Number(v).toLocaleString("th-TH")} บาท`, "งบประมาณ"]}
                      labelFormatter={(l) => `ปีงบประมาณ ${l}`}
                    />
                    <Bar dataKey="amount" fill="url(#budgetBar)" radius={[8, 8, 0, 0]} maxBarSize={70} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <aside className="space-y-5">
            <div className="bg-card rounded-2xl border border-border p-5 shadow-soft">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">สรุปงบประมาณ</h3>
              <div className="mt-4 space-y-3">
                {YEARS.map((y) => {
                  const amt = project.budgets[y] || 0;
                  const max = Math.max(...YEARS.map((yr) => project.budgets[yr] || 0));
                  const pct = max > 0 ? (amt / max) * 100 : 0;
                  return (
                    <div key={y}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium">ปี {y}</span>
                        <span className="tabular text-foreground/80">{amt > 0 ? formatBaht(amt) : "—"}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-gradient transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                <span className="text-sm font-medium">รวมทั้งสิ้น</span>
                <span className="text-lg font-semibold tabular text-primary">{formatBaht(project.total_budget)}</span>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border p-5 shadow-soft">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">ลำดับชั้น</h3>
              <ol className="mt-4 space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-border">
                {[
                  { label: "ยุทธศาสตร์", value: project.strategy?.name },
                  { label: `กลยุทธ์ ${project.tactic?.code ?? ""}`, value: project.tactic?.name },
                  { label: "แผนงาน", value: project.plan?.name },
                  { label: "โครงการ", value: project.name, current: true },
                ].map((item, i) => (
                  <li key={i} className="flex gap-3 relative">
                    <span
                      className={[
                        "size-6 rounded-full ring-2 ring-background flex items-center justify-center text-[10px] font-semibold shrink-0 z-10",
                        item.current ? "bg-gold text-gold-foreground" : "bg-primary-soft text-primary",
                      ].join(" ")}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{item.label}</div>
                      <div className={["text-sm mt-0.5", item.current && "font-semibold text-primary"].filter(Boolean).join(" ")}>
                        {item.value}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <button
              onClick={() => navigate({ to: "/projects" })}
              className="w-full rounded-xl border border-border bg-card hover:bg-muted px-4 py-3 text-sm font-medium transition flex items-center justify-center gap-2"
            >
              <ChevronLeft className="size-4" /> กลับไปยังรายการโครงการ
            </button>
          </aside>
        </div>

        {/* Edit Dialog */}
        <ProjectFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          onSubmit={async (data) => { await updateMutation.mutateAsync(data); }}
          initialData={project}
          isSubmitting={updateMutation.isPending}
        />

        {/* Delete Confirmation */}
        <DeleteConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onConfirm={async () => { await deleteMutation.mutateAsync(); }}
          title="ลบโครงการ"
          description={`คุณต้องการลบโครงการ "${project.name}" หรือไม่? การดำเนินการนี้จะลบข้อมูลงบประมาณและหมายเหตุที่เกี่ยวข้องทั้งหมด`}
          isDeleting={deleteMutation.isPending}
        />
      </div>
    </AppLayout>
  );
}

function DetailCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 lg:p-6 shadow-soft">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="size-7 rounded-lg bg-primary-soft text-primary flex items-center justify-center">{icon}</span>
        {title}
      </div>
      <div className="mt-3 text-sm text-foreground/85 leading-relaxed">{children}</div>
    </div>
  );
}
