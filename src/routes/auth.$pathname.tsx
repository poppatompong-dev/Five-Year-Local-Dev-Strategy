import { createFileRoute } from "@tanstack/react-router";
import { AuthView } from "@neondatabase/neon-js/auth/react/ui";

export const Route = createFileRoute("/auth/$pathname")({
  head: () => ({
    meta: [{ title: "เข้าสู่ระบบ · แผนพัฒนาท้องถิ่น" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { pathname } = Route.useParams();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <AuthView pathname={pathname} />
    </div>
  );
}
