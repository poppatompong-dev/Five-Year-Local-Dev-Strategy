import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AuthView } from "@neondatabase/neon-js/auth/react/ui";

export const Route = createFileRoute("/auth/$pathname")({
  head: () => ({
    meta: [{ title: "เข้าสู่ระบบ · แผนพัฒนาท้องถิ่น" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { pathname } = Route.useParams();

  // Block self-registration - redirect sign-up to sign-in
  if (pathname === "sign-up") {
    return <Navigate to="/auth/sign-in" />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <AuthView pathname={pathname} />
    </div>
  );
}
