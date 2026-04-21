import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, FolderKanban, Wrench, Upload, Building2, Bell, Search } from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "ภาพรวม", icon: LayoutDashboard },
  { to: "/projects", label: "โครงการ", icon: FolderKanban },
  { to: "/equipment", label: "ครุภัณฑ์", icon: Wrench },
  { to: "/import", label: "นำเข้าข้อมูล", icon: Upload },
] as const;

export function AppLayout({ children }: { children?: ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-[280px] shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border sticky top-0 h-screen">
        <div className="px-6 pt-7 pb-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-gold/15 ring-1 ring-gold/30 flex items-center justify-center">
              <Building2 className="size-5 text-gold" />
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold tracking-tight">เทศบาลนคร</div>
              <div className="text-[15px] font-semibold tracking-tight">นครสวรรค์</div>
            </div>
          </div>
          <div className="mt-4 rounded-lg bg-sidebar-accent/60 px-3 py-2.5">
            <div className="text-[11px] uppercase tracking-wider text-sidebar-foreground/60">แผนพัฒนาท้องถิ่น</div>
            <div className="text-sm font-medium text-gold mt-0.5">พ.ศ. 2566 – 2570</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          <div className="px-3 pb-2 text-[11px] uppercase tracking-wider text-sidebar-foreground/50">เมนูหลัก</div>
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
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all relative",
                  active
                    ? "bg-gold text-gold-foreground font-medium shadow-[0_2px_12px_-2px_oklch(0.74_0.12_88_/_0.5)]"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                ].join(" ")}
              >
                <Icon className="size-[18px] shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-gold/20 ring-1 ring-gold/30 flex items-center justify-center text-gold text-sm font-semibold">
              จท
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">เจ้าหน้าที่แผน</div>
              <div className="text-xs text-sidebar-foreground/60 truncate">กองวิชาการและแผนงาน</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="px-5 lg:px-8 h-16 flex items-center gap-4">
            <div className="lg:hidden flex items-center gap-2">
              <div className="size-9 rounded-lg bg-emerald-gradient flex items-center justify-center">
                <Building2 className="size-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sm">เทศบาลนครนครสวรรค์</span>
            </div>
            <div className="flex-1 max-w-xl hidden md:flex">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="ค้นหาโครงการ แผนงาน หน่วยงาน..."
                  className="w-full bg-muted/60 border border-border rounded-lg pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground ring-focus"
                />
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button className="size-10 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative">
                <Bell className="size-[18px]" />
                <span className="absolute top-2 right-2 size-2 rounded-full bg-gold ring-2 ring-background" />
              </button>
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-soft text-primary text-xs font-medium">
                <span className="size-1.5 rounded-full bg-success animate-pulse" />
                ปีงบประมาณปัจจุบัน 2568
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-5 lg:px-8 py-7">
          {children ?? <Outlet />}
        </main>

        <footer className="px-5 lg:px-8 py-5 border-t border-border text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <div>© 2568 เทศบาลนครนครสวรรค์ · ระบบบริหารแผนพัฒนาท้องถิ่น</div>
          <div>เวอร์ชัน 1.0.0</div>
        </footer>
      </div>
    </div>
  );
}
