import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogIn, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "เข้าสู่ระบบ · เทศบาลนครนครสวรรค์" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { login, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoggedIn) navigate({ to: "/" });
  }, [isLoggedIn, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username || !password) {
      setError("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
      return;
    }
    setSubmitting(true);
    try {
      await login(username, password);
      toast.success("เข้าสู่ระบบสำเร็จ");
      window.location.href = "/";
    } catch (err: any) {
      const msg =
        err?.message === "TOO_MANY_ATTEMPTS"
          ? "พยายามเข้าสู่ระบบผิดหลายครั้งเกินไป กรุณารอ 1 นาทีแล้วลองใหม่"
          : err?.message === "ADMIN_LOGIN_DISABLED"
            ? "ระบบปิดการเข้าสู่ระบบผู้ดูแลชั่วคราว กรุณาติดต่อผู้ดูแลระบบ"
            : err?.message === "ADMIN_LOGIN_NOT_ALLOWED"
              ? "เครือข่ายนี้ไม่ได้รับอนุญาตให้เข้าสู่ระบบผู้ดูแล"
              : err?.message === "DATABASE_URL_MISSING"
                ? "Vercel ยังไม่ได้ตั้งค่า DATABASE_URL สำหรับเชื่อมต่อฐานข้อมูล"
                : err?.message === "SESSION_PASSWORD_MISSING"
                  ? "Vercel ยังไม่ได้ตั้งค่า SESSION_PASSWORD หรือค่าสั้นกว่า 32 ตัวอักษร"
                  : err?.message === "ADMIN_USERS_TABLE_MISSING"
                    ? "ฐานข้อมูลยังไม่มีตารางผู้ดูแลระบบ กรุณารัน migrate"
                    : err?.message === "ADMIN_USERS_NOT_SEEDED"
                      ? "ฐานข้อมูลยังไม่มีบัญชีผู้ดูแลระบบ กรุณารัน seed-admins"
                      : err?.message || "เข้าสู่ระบบไม่สำเร็จ";
      toast.error(msg);
      setError(msg);
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 size-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <LogIn className="size-6 text-primary" />
          </div>
          <CardTitle>เข้าสู่ระบบผู้ดูแล</CardTitle>
          <CardDescription>สำหรับผู้ดูแลระบบเท่านั้น</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">ชื่อผู้ใช้</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError("");
                }}
                autoComplete="username"
                autoFocus
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                autoComplete="current-password"
                disabled={submitting}
              />
            </div>
            {error && (
              <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 mr-2 animate-spin" /> : <LogIn className="size-4 mr-2" />}
              เข้าสู่ระบบ
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
