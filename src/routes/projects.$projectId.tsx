import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, Fragment } from "react";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, FileText, Target, Award, TrendingUp, Building2, Calendar, Pencil, Trash2, CheckCircle2, XCircle, ArrowRight, RotateCcw } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

const STEP_FLOW: Status[] = ["planning", "in_progress", "completed"];

const STEP_LABEL_MAP: Record<string, string> = {
  planning: "วางแผน",
  in_progress: "กำลังดำเนินการ",
  completed: "เสร็จสิ้น",
};

const STEP_DESC: Record<string, string> = {
  planning: "กำหนดแนวทางและเตรียมทรัพยากร",
  in_progress: "กำลังดำเนินงานตามแผน",
  completed: "โครงการสำเร็จลุล่วงแล้ว",
};

type ConfirmAction =
  | { type: "revert"; to: Status }
  | { type: "cancel" }
  | { type: "reactivate" };

function StatusStepper({
  status,
  onStatusChange,
  isPending,
}: {
  status: Status;
  onStatusChange: (s: Status) => void;
  isPending: boolean;
}) {
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const currentIdx = STEP_FLOW.indexOf(status);
  const isCancelled = status === "cancelled";

  function handleConfirm() {
    if (!confirmAction) return;
    if (confirmAction.type === "cancel") onStatusChange("cancelled");
    else if (confirmAction.type === "reactivate") onStatusChange("planning");
    else onStatusChange(confirmAction.to);
    setConfirmAction(null);
  }

  const confirmMeta = confirmAction
    ? confirmAction.type === "cancel"
      ? { title: "ยืนยันการยกเลิกโครงการ", desc: "โครงการนี้จะถูกยกเลิก คุณสามารถเปิดใช้งานใหม่ได้ภายหลัง", action: "ยกเลิกโครงการ", destructive: true }
      : confirmAction.type === "revert"
      ? { title: "ย้อนสถานะโครงการ", desc: `โครงการจะถูกย้อนกลับไปที่ "${STEP_LABEL_MAP[confirmAction.to]}" คุณแน่ใจหรือไม่?`, action: "ย้อนกลับ", destructive: false }
      : { title: "เปิดใช้งานโครงการใหม่", desc: `โครงการจะถูกย้ายกลับไปยังสถานะ "วางแผน" เพื่อดำเนินการต่อ`, action: "เปิดใช้งานใหม่", destructive: false }
    : null;

  return (
    <>
      <div className="w-full">
        <div className="relative flex items-start">
          {STEP_FLOW.map((step, idx) => {
            const isDone = !isCancelled && currentIdx > idx;
            const isCurrent = !isCancelled && currentIdx === idx;
            const isFuture = isCancelled || currentIdx < idx;
            return (
              <Fragment key={step}>
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={cn(
                      "size-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                      isDone && "border-green-500 bg-green-500 text-white",
                      isCurrent && "border-primary bg-primary text-primary-foreground ring-4 ring-primary/15",
                      isFuture && "border-muted-foreground/25 bg-muted text-muted-foreground/40",
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="size-5" />
                    ) : isCurrent ? (
                      <span className="size-2.5 rounded-full bg-current" />
                    ) : (
                      <span className="text-xs font-semibold">{idx + 1}</span>
                    )}
                  </div>
                  <div className="mt-2.5 text-center px-1">
                    <div
                      className={cn(
                        "text-xs font-semibold",
                        isDone && "text-green-600",
                        isCurrent && "text-primary",
                        isFuture && "text-muted-foreground/50",
                      )}
                    >
                      {STEP_LABEL_MAP[step]}
                    </div>
                    <div className="text-[10px] text-muted-foreground/55 mt-0.5 leading-tight">
                      {STEP_DESC[step]}
                    </div>
                  </div>
                </div>
                {idx < STEP_FLOW.length - 1 && (
                  <div className="flex-1 h-0.5 mt-5 max-w-[80px]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        !isCancelled && currentIdx > idx ? "bg-green-400" : "bg-muted-foreground/20",
                      )}
                    />
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>

        {isCancelled && (
          <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-center gap-3">
            <XCircle className="size-4 text-destructive shrink-0" />
            <p className="flex-1 text-sm text-destructive font-medium">โครงการนี้ถูกยกเลิกแล้ว</p>
            <button
              onClick={() => setConfirmAction({ type: "reactivate" })}
              disabled={isPending}
              className="flex items-center gap-1.5 text-xs font-medium text-foreground/70 hover:text-foreground border border-border rounded-lg px-3 py-1.5 bg-background hover:bg-muted transition disabled:opacity-50"
            >
              <RotateCcw className="size-3.5" />
              เปิดใช้งานใหม่
            </button>
          </div>
        )}

        {!isCancelled && (
          <div className="mt-5 pt-4 border-t border-border flex items-center justify-between gap-3">
            <div>
              {currentIdx > 0 && (
                <button
                  onClick={() => setConfirmAction({ type: "revert", to: STEP_FLOW[currentIdx - 1] })}
                  disabled={isPending}
                  className="flex items-center gap-1.5 text-xs font-medium text-foreground/60 hover:text-foreground border border-border rounded-lg px-3 py-1.5 bg-background hover:bg-muted transition disabled:opacity-50"
                >
                  <RotateCcw className="size-3.5" />
                  ย้อนกลับ
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {currentIdx < STEP_FLOW.length - 1 && (
                <button
                  onClick={() => setConfirmAction({ type: "cancel" })}
                  disabled={isPending}
                  className="flex items-center gap-1.5 text-xs font-medium text-destructive hover:text-destructive border border-destructive/30 rounded-lg px-3 py-1.5 bg-background hover:bg-destructive/5 transition disabled:opacity-50"
                >
                  <XCircle className="size-3.5" />
                  ยกเลิกโครงการ
                </button>
              )}
              {currentIdx < STEP_FLOW.length - 1 ? (
                <button
                  onClick={() => onStatusChange(STEP_FLOW[currentIdx + 1])}
                  disabled={isPending}
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg px-4 py-1.5 transition press-effect disabled:opacity-50"
                >
                  {isPending ? (
                    <span className="size-3 border-2 border-primary-foreground/60 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <ArrowRight className="size-3.5" />
                  )}
                  ไปยัง{STEP_LABEL_MAP[STEP_FLOW[currentIdx + 1]]}
                </button>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 border border-green-500/30 rounded-lg px-3 py-1.5 bg-green-50 dark:bg-green-950/20">
                  <CheckCircle2 className="size-3.5" />
                  โครงการเสร็จสิ้นแล้ว
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmMeta?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmMeta?.desc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={cn(confirmMeta?.destructive && buttonVariants({ variant: "destructive" }))}
            >
              {confirmMeta?.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

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
    toast.success(`เปลี่ยนสถานะเป็น "${STATUS_LABEL[s]}" แล้ว`, { icon: "✅" });
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

          <div className="p-6 lg:p-7">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-sm font-medium text-muted-foreground">สถานะโครงการ:</span>
              <StatusBadge status={status} />
            </div>
            <StatusStepper
              status={status}
              onStatusChange={handleStatusChange}
              isPending={patchStatus.isPending}
            />
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
