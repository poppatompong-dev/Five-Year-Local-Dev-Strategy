import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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

  if (isLoggedIn) {
    navigate({ to: "/" });
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) return;
    setSubmitting(true);
    try {
      await login(username, password);
      toast.success("เข้าสู่ระบบสำเร็จ");
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err?.message || "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
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
                onChange={(e) => setUsername(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={submitting}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting || !username || !password}>
              {submitting ? <Loader2 className="size-4 mr-2 animate-spin" /> : <LogIn className="size-4 mr-2" />}
              เข้าสู่ระบบ
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
