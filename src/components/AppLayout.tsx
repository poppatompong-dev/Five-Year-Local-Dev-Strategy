import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, FolderKanban, Wrench, Upload, Building2, Bell, Search, LogOut, Users } from "lucide-react";
import type { ReactNode } from "react";
import { RedirectToSignIn } from "@neondatabase/neon-js/auth/react/ui";
import { authClient } from "../auth";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const NAV = [
  { to: "/", label: "ภาพรวม", icon: LayoutDashboard },
  { to: "/projects", label: "โครงการ", icon: FolderKanban },
  { to: "/equipment", label: "ครุภัณฑ์", icon: Wrench },
  { to: "/import", label: "นำเข้าข้อมูล", icon: Upload },
] as const;

export function AppLayout({ children }: { children?: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  async function handleSignOut() {
    try {
      await authClient.signOut({
        fetchOptions: { onError: () => {} },
      });
    } catch {
      // suppress origin errors from dev proxy — session cleared client-side
    }
    navigate({ to: "/auth/$pathname", params: { pathname: "sign-in" } });
  }

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <RedirectToSignIn />;
  }

  return (
    <TooltipProvider delayDuration={300}>
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-[280px] shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border sticky top-0 h-screen">
        <div className="px-6 pt-7 pb-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-gradient-to-br from-gold/25 to-gold/10 ring-1 ring-gold/40 flex items-center justify-center shadow-[0_2px_12px_-2px_oklch(0.74_0.12_88_/_0.4)]">
              <Building2 className="size-5 text-gold" strokeWidth={1.5} />
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold tracking-tight">เทศบาลนคร</div>
              <div className="text-[15px] font-semibold tracking-tight text-gold">นครสวรรค์</div>
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-gradient-to-r from-sidebar-accent to-sidebar-accent/40 px-3 py-2.5 border border-sidebar-border/60">
            <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50 font-medium">แผนพัฒนาท้องถิ่น</div>
            <div className="text-sm font-semibold text-gold mt-0.5 tracking-tight">พ.ศ. 2566 – 2570</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-medium">เมนูหลัก</div>
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={[
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 relative overflow-hidden",
                  active
                    ? "bg-gradient-to-r from-gold to-gold/80 text-gold-foreground font-semibold shadow-[0_2px_16px_-2px_oklch(0.74_0.12_88_/_0.55)]"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground",
                ].join(" ")}
              >
                {active && (
                  <span className="absolute left-0 inset-y-2 w-0.5 rounded-full bg-white/40" />
                )}
                <Icon className="size-[17px] shrink-0" strokeWidth={active ? 2 : 1.75} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="px-3 pt-5 pb-2 text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-medium">ผู้ดูแลระบบ</div>
          <Link
            to="/admin/users"
            className={[
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 relative overflow-hidden",
              location.pathname.startsWith("/admin")
                ? "bg-gradient-to-r from-gold to-gold/80 text-gold-foreground font-semibold shadow-[0_2px_16px_-2px_oklch(0.74_0.12_88_/_0.55)]"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground",
            ].join(" ")}
          >
            {location.pathname.startsWith("/admin") && (
              <span className="absolute left-0 inset-y-2 w-0.5 rounded-full bg-white/40" />
            )}
            <Users className="size-[17px] shrink-0" strokeWidth={location.pathname.startsWith("/admin") ? 2 : 1.75} />
            <span>จัดการผู้ใช้</span>
          </Link>
        </nav>

        <div className="px-4 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-sidebar-accent/60 transition-colors group">
            <div className="size-9 rounded-full bg-gradient-to-br from-gold/30 to-gold/10 ring-2 ring-gold/35 flex items-center justify-center text-gold text-sm font-bold shrink-0 shadow-[0_0_12px_-3px_oklch(0.74_0.12_88_/_0.5)]">
              {user?.name?.charAt(0).toUpperCase() ?? user?.email?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate leading-tight">{user?.name ?? user?.email ?? "ผู้ใช้งาน"}</div>
              <div className="text-[11px] text-sidebar-foreground/50 truncate mt-0.5">{user?.email ?? ""}</div>
            </div>
            <button
              onClick={handleSignOut}
              title="ออกจากระบบ"
              className="size-7 rounded-lg hover:bg-destructive/20 flex items-center justify-center text-sidebar-foreground/40 hover:text-destructive transition-all shrink-0 opacity-0 group-hover:opacity-100"
            >
              <LogOut className="size-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 glass border-b border-border/60">
          <div className="px-5 lg:px-8 h-14 flex items-center gap-4">
            <div className="lg:hidden flex items-center gap-2">
              <div className="size-8 rounded-lg bg-emerald-gradient flex items-center justify-center shadow-soft">
                <Building2 className="size-4 text-primary-foreground" strokeWidth={1.5} />
              </div>
              <span className="font-semibold text-sm tracking-tight">เทศบาลนครนครสวรรค์</span>
            </div>
            <div className="flex-1 max-w-sm hidden md:flex">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" strokeWidth={1.75} />
                <input
                  type="search"
                  placeholder="ค้นหาโครงการ แผนงาน หน่วยงาน..."
                  className="w-full bg-muted/50 border border-border/70 rounded-xl pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground/60 ring-focus hover:border-border transition-colors"
                />
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button className="size-9 rounded-xl hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all relative">
                <Bell className="size-[17px]" strokeWidth={1.75} />
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-gold ring-2 ring-background animate-pulse" />
              </button>
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-success/10 text-success border border-success/20 text-xs font-medium">
                <span className="size-1.5 rounded-full bg-success animate-pulse" />
                ปีงบประมาณ 2568
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-5 lg:px-8 py-7">
          {children ?? <Outlet />}
        </main>

        <footer className="px-5 lg:px-8 py-4 border-t border-border/60 text-[11px] text-muted-foreground/60 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="size-1 rounded-full bg-success/60" />
            © 2568 เทศบาลนครนครสวรรค์ · ระบบบริหารแผนพัฒนาท้องถิ่น
          </div>
          <div className="font-mono tracking-tight">v1.0.0</div>
        </footer>
      </div>
    </div>
    <Toaster position="top-right" richColors closeButton expand={false} />
    </TooltipProvider>
  );
}
