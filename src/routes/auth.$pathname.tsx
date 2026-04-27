import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "../auth";

export const Route = createFileRoute("/auth/$pathname")({
  head: () => ({
    meta: [{ title: "เข้าสู่ระบบ · แผนพัฒนาท้องถิ่น" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { pathname } = Route.useParams();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Block self-registration
  if (pathname === "sign-up") {
    return <Navigate to="/auth/$pathname" params={{ pathname: "sign-in" }} />;
  }

  // Only handle sign-in, other paths redirect
  if (pathname !== "sign-in") {
    return <Navigate to="/auth/$pathname" params={{ pathname: "sign-in" }} />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Convert username to synthetic email for Better Auth backend
    const email = username.includes("@")
      ? username
      : `${username.toLowerCase().replace(/[^a-z0-9._-]/g, "")}@nmt.local`;

    const result = await authClient.signIn.email({
      email,
      password,
    });

    setLoading(false);

    if (result.error) {
      setError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      return;
    }

    // Redirect to home on success
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-xl p-6">
        <h1 className="text-xl font-semibold text-center mb-6">เข้าสู่ระบบ</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">ชื่อผู้ใช้</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ชื่อผู้ใช้ของคุณ"
              autoComplete="username"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">รหัสผ่าน</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="รหัสผ่าน"
              autoComplete="current-password"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition disabled:opacity-60"
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          หากลืมรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบ
        </p>
      </div>
    </div>
  );
}
