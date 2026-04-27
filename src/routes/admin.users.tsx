import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { apiGetUsers, apiCreateUser, apiDeleteUser, type AuthUser } from "@/lib/api";
import { authClient } from "@/auth";
import { Users, Plus, Trash2, Mail, ShieldCheck, ShieldOff, Eye, EyeOff, X } from "lucide-react";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [{ title: "จัดการผู้ใช้ · แผนพัฒนาท้องถิ่น" }],
  }),
  component: UsersPage,
});

function UsersPage() {
  const qc = useQueryClient();
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;
  const isAuthed = !!session;

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: apiGetUsers,
    enabled: isAuthed,
  });

  const deleteMutation = useMutation({
    mutationFn: apiDeleteUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AuthUser | null>(null);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">ผู้ดูแลระบบ</div>
            <h1 className="text-3xl font-semibold tracking-tight mt-1">จัดการผู้ใช้</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isLoading ? "กำลังโหลด..." : `${users.length} บัญชีผู้ใช้ในระบบ`}
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition shadow-sm"
          >
            <Plus className="size-4" />
            เพิ่มผู้ใช้ใหม่
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
            ไม่สามารถโหลดรายชื่อผู้ใช้ได้: {String(error)}
          </div>
        )}

        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 px-4 py-3 text-sm text-amber-900 dark:text-amber-200 flex items-start gap-2">
          <ShieldOff className="size-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">รายชื่อนี้แสดงผู้ใช้ที่เพิ่มผ่านหน้านี้เท่านั้น</p>
            <p className="text-xs mt-0.5 text-amber-800/80 dark:text-amber-300/70">
              Neon Auth (Better Auth) ยังไม่ได้ expose admin API สำหรับรายชื่อผู้ใช้ทั้งหมด —
              การลบในหน้านี้จะเอาออกจากรายการเท่านั้น ไม่ได้ลบบัญชีในระบบยืนยันตัวตน
            </p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3" />
              กำลังโหลด...
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground bg-muted/30 border-b border-border">
                  <th className="px-5 py-3.5 font-medium">ผู้ใช้</th>
                  <th className="px-5 py-3.5 font-medium">อีเมล</th>
                  <th className="px-5 py-3.5 font-medium">ยืนยันอีเมล</th>
                  <th className="px-5 py-3.5 font-medium">วันที่สร้าง</th>
                  <th className="px-5 py-3.5 font-medium text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-16 text-center text-muted-foreground">
                      <Users className="size-8 mx-auto mb-2 opacity-40" />
                      ยังไม่มีผู้ใช้ในระบบ
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="border-b border-border/50 hover:bg-muted/40 transition">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-full bg-primary-soft text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                            {u.name?.charAt(0).toUpperCase() ?? u.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium">{u.name || "—"}</div>
                            {u.id === currentUserId && (
                              <span className="text-[10px] bg-gold/20 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                                คุณ
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-foreground/80 flex items-center gap-1.5 mt-1">
                        <Mail className="size-3.5 text-muted-foreground" />
                        {u.email}
                      </td>
                      <td className="px-5 py-4">
                        {u.email_verified ? (
                          <span className="inline-flex items-center gap-1 text-success text-xs font-medium">
                            <ShieldCheck className="size-3.5" /> ยืนยันแล้ว
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                            <ShieldOff className="size-3.5" /> ยังไม่ยืนยัน
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground text-xs">
                        {new Date(u.created_at).toLocaleDateString("th-TH", {
                          year: "numeric", month: "short", day: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setConfirmDelete(u)}
                          disabled={u.id === currentUserId || deleteMutation.isPending}
                          title={u.id === currentUserId ? "ไม่สามารถลบบัญชีตัวเองได้" : "ลบผู้ใช้"}
                          className="size-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition ml-auto"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showForm && (
        <AddUserModal
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            qc.invalidateQueries({ queryKey: ["admin-users"] });
          }}
        />
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <ConfirmDeleteModal
          user={confirmDelete}
          isPending={deleteMutation.isPending}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            deleteMutation.mutate(confirmDelete.id, {
              onSuccess: () => setConfirmDelete(null),
            });
          }}
        />
      )}
    </AppLayout>
  );
}

// ---------------------------------------------------------------------------

function AddUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const createMutation = useMutation({
    mutationFn: apiCreateUser,
    onSuccess,
    onError: (e: Error) => setError(e.message),
  });

  function suggestPassword() {
    const base = username.trim() || "user";
    const suffix = Math.random().toString(36).slice(2, 4);
    setPassword(`${base}${suffix}`.slice(0, 20));
    setShowPw(true);
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError("");
    const u = username.trim();
    if (!u) {
      setError("กรุณาระบุชื่อผู้ใช้");
      return;
    }
    if (password.length < 3) {
      setError("รหัสผ่านต้องมีอย่างน้อย 3 ตัวอักษร");
      return;
    }
    // username "pop" → email "pop@nakhonsawan.local" (handled in apiCreateUser).
    // If user typed a real email, it's kept as-is.
    createMutation.mutate({
      name: name.trim() || u,
      email: u,
      password,
    });
  }

  const isEmail = username.includes("@");
  const previewEmail = isEmail
    ? username.trim()
    : username.trim()
    ? `${username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "")}@nakhonsawan.local`
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">เพิ่มผู้ใช้ใหม่</h2>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="ชื่อผู้ใช้ (username)">
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="เช่น pop หรือ pop@domain.com"
              autoComplete="off"
              autoCapitalize="none"
              className="input-base"
            />
            {previewEmail && !isEmail && (
              <p className="text-[11px] text-muted-foreground mt-1">
                ระบบจะใช้เป็นอีเมลภายใน: <span className="font-mono text-foreground/80">{previewEmail}</span>
              </p>
            )}
          </Field>

          <Field label="ชื่อที่แสดง (ไม่บังคับ)">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ชื่อ-นามสกุล หรือปล่อยว่างเพื่อใช้ชื่อผู้ใช้"
              className="input-base"
            />
          </Field>

          <Field label="รหัสผ่าน">
            <div className="relative">
              <input
                required
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="อย่างน้อย 3 ตัวอักษร"
                minLength={3}
                className="input-base pr-20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="size-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground"
                  title={showPw ? "ซ่อน" : "แสดง"}
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
                <button
                  type="button"
                  onClick={suggestPassword}
                  className="text-[10px] px-2 py-1 rounded-md bg-primary-soft text-primary font-medium hover:bg-primary-soft/80"
                  title="สุ่มรหัสผ่านจากชื่อผู้ใช้"
                >
                  สุ่ม
                </button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              ขั้นต่ำ 3 ตัว · กดปุ่ม "สุ่ม" เพื่อให้ระบบช่วยตั้งรหัสผ่าน
            </p>
          </Field>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg whitespace-pre-line">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition disabled:opacity-60"
            >
              {createMutation.isPending ? "กำลังสร้าง..." : "สร้างบัญชี"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({
  user,
  isPending,
  onCancel,
  onConfirm,
}: {
  user: AuthUser;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-xl p-6 text-center">
        <div className="size-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="size-5 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold">ลบผู้ใช้</h2>
        <p className="text-sm text-muted-foreground mt-2">
          ต้องการลบบัญชีของ <span className="font-semibold text-foreground">{user.name || user.email}</span> ใช่หรือไม่?
          การดำเนินการนี้ไม่สามารถย้อนกลับได้
        </p>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted transition"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 rounded-xl bg-destructive text-destructive-foreground px-4 py-2.5 text-sm font-medium hover:bg-destructive/90 transition disabled:opacity-60"
          >
            {isPending ? "กำลังลบ..." : "ลบบัญชี"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground/80">{label}</label>
      {children}
    </div>
  );
}
