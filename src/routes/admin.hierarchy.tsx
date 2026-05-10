import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Trash2, Plus, Loader2, GitBranch } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { useAuth } from "@/hooks/use-auth";
import {
  apiGetStrategies, apiCreateStrategy, apiUpdateStrategy, apiDeleteStrategy,
  apiGetTactics, apiCreateTactic, apiUpdateTactic, apiDeleteTactic,
  apiGetPlans, apiCreatePlan, apiUpdatePlan, apiDeletePlan,
  type DBStrategy, type DBTactic, type DBPlan,
} from "@/lib/api";

export const Route = createFileRoute("/admin/hierarchy")({
  head: () => ({ meta: [{ title: "โครงสร้างแผน · เทศบาลนครนครสวรรค์" }] }),
  component: HierarchyPage,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function childrenError(msg: string) {
  if (msg.includes("HAS_CHILDREN")) return "ไม่สามารถลบได้เนื่องจากมีข้อมูลลูกอยู่";
  return msg;
}

// ---------------------------------------------------------------------------
// Strategy Tab
// ---------------------------------------------------------------------------
function StrategyTab() {
  const qc = useQueryClient();
  const { data: strategies = [], isLoading } = useQuery<DBStrategy[]>({
    queryKey: ["strategies"],
    queryFn: apiGetStrategies,
    staleTime: 300_000,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DBStrategy | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DBStrategy | null>(null);
  const [form, setForm] = useState({ name: "", short_name: "", department: "" });

  function openCreate() {
    setForm({ name: "", short_name: "", department: "" });
    setCreateOpen(true);
  }
  function openEdit(s: DBStrategy) {
    setForm({ name: s.name, short_name: s.short_name, department: s.department });
    setEditTarget(s);
  }

  const createMut = useMutation({
    mutationFn: () => apiCreateStrategy(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["strategies"] });
      setCreateOpen(false);
      toast.success("เพิ่มยุทธศาสตร์สำเร็จ");
    },
    onError: (e: any) => toast.error(e?.message || "เกิดข้อผิดพลาด"),
  });

  const updateMut = useMutation({
    mutationFn: () => apiUpdateStrategy({ id: editTarget!.id, ...form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["strategies"] });
      setEditTarget(null);
      toast.success("แก้ไขยุทธศาสตร์สำเร็จ");
    },
    onError: (e: any) => toast.error(e?.message || "เกิดข้อผิดพลาด"),
  });

  const deleteMut = useMutation({
    mutationFn: () => apiDeleteStrategy(deleteTarget!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["strategies"] });
      setDeleteTarget(null);
      toast.success("ลบยุทธศาสตร์สำเร็จ");
    },
    onError: (e: any) => toast.error(childrenError(e?.message || "เกิดข้อผิดพลาด")),
  });

  const pending = createMut.isPending || updateMut.isPending;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={openCreate}><Plus className="size-4 mr-1" />เพิ่มยุทธศาสตร์</Button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="divide-y rounded-lg border">
          {strategies.map((s) => (
            <div key={s.id} className="flex items-start gap-3 px-4 py-3">
              <span className="mt-0.5 size-6 rounded bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{s.id}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{s.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.short_name} · {s.department}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(s)}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(s)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {strategies.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">ยังไม่มียุทธศาสตร์</div>}
        </div>
      )}

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>เพิ่มยุทธศาสตร์</DialogTitle></DialogHeader>
          <StrategyForm form={form} onChange={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={pending}>ยกเลิก</Button>
            <Button onClick={() => createMut.mutate()} disabled={pending || !form.name}>
              {pending && <Loader2 className="size-4 animate-spin mr-1" />}บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>แก้ไขยุทธศาสตร์</DialogTitle></DialogHeader>
          <StrategyForm form={form} onChange={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={pending}>ยกเลิก</Button>
            <Button onClick={() => updateMut.mutate()} disabled={pending || !form.name}>
              {pending && <Loader2 className="size-4 animate-spin mr-1" />}บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate()}
        isDeleting={deleteMut.isPending}
        title="ลบยุทธศาสตร์"
        description={`ลบ "${deleteTarget?.name}" หากมีแนวทางอยู่ด้านล่างจะไม่สามารถลบได้`}
      />
    </div>
  );
}

function StrategyForm({ form, onChange }: { form: { name: string; short_name: string; department: string }; onChange: (f: any) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>ชื่อยุทธศาสตร์</Label>
        <Input value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} placeholder="ด้านการสาธารณสุขและสิ่งแวดล้อม" />
      </div>
      <div className="space-y-1.5">
        <Label>ชื่อย่อ</Label>
        <Input value={form.short_name} onChange={(e) => onChange({ ...form, short_name: e.target.value })} placeholder="สาธารณสุข" />
      </div>
      <div className="space-y-1.5">
        <Label>หน่วยงานหลัก</Label>
        <Input value={form.department} onChange={(e) => onChange({ ...form, department: e.target.value })} placeholder="สำนักสาธารณสุขและสิ่งแวดล้อม" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tactic Tab
// ---------------------------------------------------------------------------
function TacticTab() {
  const qc = useQueryClient();
  const { data: tactics = [], isLoading: tacLoading } = useQuery<DBTactic[]>({
    queryKey: ["tactics"],
    queryFn: apiGetTactics,
    staleTime: 300_000,
  });
  const { data: strategies = [] } = useQuery<DBStrategy[]>({
    queryKey: ["strategies"],
    queryFn: apiGetStrategies,
    staleTime: 300_000,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DBTactic | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DBTactic | null>(null);
  const [form, setForm] = useState({ code: "", name: "", strategy_id: 0 });

  function stratName(id: number) {
    return strategies.find((s) => s.id === id)?.short_name ?? String(id);
  }

  function openCreate() {
    setForm({ code: "", name: "", strategy_id: strategies[0]?.id ?? 0 });
    setCreateOpen(true);
  }
  function openEdit(t: DBTactic) {
    setForm({ code: t.code, name: t.name, strategy_id: t.strategy_id });
    setEditTarget(t);
  }

  const createMut = useMutation({
    mutationFn: () => apiCreateTactic(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tactics"] });
      setCreateOpen(false);
      toast.success("เพิ่มแนวทางสำเร็จ");
    },
    onError: (e: any) => toast.error(e?.message || "เกิดข้อผิดพลาด"),
  });

  const updateMut = useMutation({
    mutationFn: () => apiUpdateTactic({ id: editTarget!.id, ...form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tactics"] });
      setEditTarget(null);
      toast.success("แก้ไขแนวทางสำเร็จ");
    },
    onError: (e: any) => toast.error(e?.message || "เกิดข้อผิดพลาด"),
  });

  const deleteMut = useMutation({
    mutationFn: () => apiDeleteTactic(deleteTarget!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tactics"] });
      setDeleteTarget(null);
      toast.success("ลบแนวทางสำเร็จ");
    },
    onError: (e: any) => toast.error(childrenError(e?.message || "เกิดข้อผิดพลาด")),
  });

  const pending = createMut.isPending || updateMut.isPending;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={openCreate}><Plus className="size-4 mr-1" />เพิ่มแนวทาง</Button>
      </div>
      {tacLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="divide-y rounded-lg border">
          {tactics.map((t) => (
            <div key={t.id} className="flex items-start gap-3 px-4 py-3">
              <span className="mt-0.5 min-w-[2.5rem] rounded bg-secondary text-secondary-foreground text-xs font-mono font-bold px-1.5 py-0.5 text-center shrink-0">{t.code}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{t.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">ยุทธศาสตร์: {stratName(t.strategy_id)}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(t)}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(t)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {tactics.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีแนวทาง</div>}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>เพิ่มแนวทาง</DialogTitle></DialogHeader>
          <TacticForm form={form} onChange={setForm} strategies={strategies} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={pending}>ยกเลิก</Button>
            <Button onClick={() => createMut.mutate()} disabled={pending || !form.code || !form.name}>
              {pending && <Loader2 className="size-4 animate-spin mr-1" />}บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>แก้ไขแนวทาง</DialogTitle></DialogHeader>
          <TacticForm form={form} onChange={setForm} strategies={strategies} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={pending}>ยกเลิก</Button>
            <Button onClick={() => updateMut.mutate()} disabled={pending || !form.code || !form.name}>
              {pending && <Loader2 className="size-4 animate-spin mr-1" />}บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate()}
        isDeleting={deleteMut.isPending}
        title="ลบแนวทาง"
        description={`ลบ "${deleteTarget?.code} ${deleteTarget?.name}" หากมีแผนงานอยู่ด้านล่างจะไม่สามารถลบได้`}
      />
    </div>
  );
}

function TacticForm({ form, onChange, strategies }: { form: { code: string; name: string; strategy_id: number }; onChange: (f: any) => void; strategies: DBStrategy[] }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>รหัสแนวทาง</Label>
        <Input value={form.code} onChange={(e) => onChange({ ...form, code: e.target.value })} placeholder="1.1" />
      </div>
      <div className="space-y-1.5">
        <Label>ชื่อแนวทาง</Label>
        <Input value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} placeholder="ส่งเสริมสนับสนุน..." />
      </div>
      <div className="space-y-1.5">
        <Label>ยุทธศาสตร์</Label>
        <Select value={String(form.strategy_id)} onValueChange={(v) => onChange({ ...form, strategy_id: Number(v) })}>
          <SelectTrigger><SelectValue placeholder="เลือกยุทธศาสตร์" /></SelectTrigger>
          <SelectContent>
            {strategies.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>{s.id}. {s.short_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plan Tab
// ---------------------------------------------------------------------------
function PlanTab() {
  const qc = useQueryClient();
  const { data: plans = [], isLoading: planLoading } = useQuery<DBPlan[]>({
    queryKey: ["plans"],
    queryFn: apiGetPlans,
    staleTime: 300_000,
  });
  const { data: tactics = [] } = useQuery<DBTactic[]>({
    queryKey: ["tactics"],
    queryFn: apiGetTactics,
    staleTime: 300_000,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DBPlan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DBPlan | null>(null);
  const [form, setForm] = useState({ name: "", tactic_id: 0 });

  function tacticLabel(id: number) {
    const t = tactics.find((x) => x.id === id);
    return t ? `${t.code} ${t.name}` : String(id);
  }

  function openCreate() {
    setForm({ name: "", tactic_id: tactics[0]?.id ?? 0 });
    setCreateOpen(true);
  }
  function openEdit(p: DBPlan) {
    setForm({ name: p.name, tactic_id: p.tactic_id });
    setEditTarget(p);
  }

  const createMut = useMutation({
    mutationFn: () => apiCreatePlan(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans"] });
      setCreateOpen(false);
      toast.success("เพิ่มแผนงานสำเร็จ");
    },
    onError: (e: any) => toast.error(e?.message || "เกิดข้อผิดพลาด"),
  });

  const updateMut = useMutation({
    mutationFn: () => apiUpdatePlan({ id: editTarget!.id, ...form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans"] });
      setEditTarget(null);
      toast.success("แก้ไขแผนงานสำเร็จ");
    },
    onError: (e: any) => toast.error(e?.message || "เกิดข้อผิดพลาด"),
  });

  const deleteMut = useMutation({
    mutationFn: () => apiDeletePlan(deleteTarget!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans"] });
      setDeleteTarget(null);
      toast.success("ลบแผนงานสำเร็จ");
    },
    onError: (e: any) => toast.error(childrenError(e?.message || "เกิดข้อผิดพลาด")),
  });

  const pending = createMut.isPending || updateMut.isPending;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={openCreate}><Plus className="size-4 mr-1" />เพิ่มแผนงาน</Button>
      </div>
      {planLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="divide-y rounded-lg border">
          {plans.map((p) => (
            <div key={p.id} className="flex items-start gap-3 px-4 py-3">
              <span className="mt-0.5 size-6 rounded bg-secondary text-secondary-foreground text-xs font-bold flex items-center justify-center shrink-0">{p.id}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{p.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">แนวทาง: {tacticLabel(p.tactic_id)}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(p)}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(p)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {plans.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีแผนงาน</div>}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>เพิ่มแผนงาน</DialogTitle></DialogHeader>
          <PlanForm form={form} onChange={setForm} tactics={tactics} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={pending}>ยกเลิก</Button>
            <Button onClick={() => createMut.mutate()} disabled={pending || !form.name}>
              {pending && <Loader2 className="size-4 animate-spin mr-1" />}บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>แก้ไขแผนงาน</DialogTitle></DialogHeader>
          <PlanForm form={form} onChange={setForm} tactics={tactics} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={pending}>ยกเลิก</Button>
            <Button onClick={() => updateMut.mutate()} disabled={pending || !form.name}>
              {pending && <Loader2 className="size-4 animate-spin mr-1" />}บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate()}
        isDeleting={deleteMut.isPending}
        title="ลบแผนงาน"
        description={`ลบ "${deleteTarget?.name}" หากมีโครงการอยู่ด้านล่างจะไม่สามารถลบได้`}
      />
    </div>
  );
}

function PlanForm({ form, onChange, tactics }: { form: { name: string; tactic_id: number }; onChange: (f: any) => void; tactics: DBTactic[] }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>ชื่อแผนงาน</Label>
        <Input value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} placeholder="แผนงานสาธารณสุข" />
      </div>
      <div className="space-y-1.5">
        <Label>แนวทาง</Label>
        <Select value={String(form.tactic_id)} onValueChange={(v) => onChange({ ...form, tactic_id: Number(v) })}>
          <SelectTrigger><SelectValue placeholder="เลือกแนวทาง" /></SelectTrigger>
          <SelectContent>
            {tactics.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>{t.code} · {t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
function HierarchyPage() {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
        <GitBranch className="size-10 text-muted-foreground" />
        <p className="text-muted-foreground">กรุณาเข้าสู่ระบบก่อนเข้าถึงหน้านี้</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GitBranch className="size-6" />จัดการโครงสร้างแผน
        </h1>
        <p className="text-muted-foreground text-sm mt-1">จัดการยุทธศาสตร์ แนวทาง และแผนงานที่ใช้เป็นโครงสร้างของโครงการ</p>
      </div>

      <Tabs defaultValue="strategy">
        <TabsList>
          <TabsTrigger value="strategy">ยุทธศาสตร์</TabsTrigger>
          <TabsTrigger value="tactic">แนวทาง</TabsTrigger>
          <TabsTrigger value="plan">แผนงาน</TabsTrigger>
        </TabsList>
        <TabsContent value="strategy" className="mt-4"><StrategyTab /></TabsContent>
        <TabsContent value="tactic" className="mt-4"><TacticTab /></TabsContent>
        <TabsContent value="plan" className="mt-4"><PlanTab /></TabsContent>
      </Tabs>
    </div>
  );
}
