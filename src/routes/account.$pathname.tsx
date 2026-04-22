import { createFileRoute } from "@tanstack/react-router";
import { AccountView } from "@neondatabase/neon-js/auth/react/ui";

export const Route = createFileRoute("/account/$pathname")({
  head: () => ({
    meta: [{ title: "บัญชีผู้ใช้ · แผนพัฒนาท้องถิ่น" }],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { pathname } = Route.useParams();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <AccountView pathname={pathname} />
    </div>
  );
}
