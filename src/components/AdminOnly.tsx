import { Link } from "@tanstack/react-router";
import { Lock, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export function AdminOnly({
  children,
  title = "พื้นที่สำหรับผู้ดูแลระบบ",
  description = "กรุณาเข้าสู่ระบบก่อนใช้งานส่วนจัดการข้อมูล",
}: {
  children: ReactNode;
  title?: string;
  description?: string;
}) {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" />
          กำลังตรวจสอบสิทธิ์...
        </div>
      </AppLayout>
    );
  }

  if (!isLoggedIn) {
    return (
      <AppLayout>
        <div className="mx-auto flex max-w-md flex-col items-center justify-center py-24 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Lock className="size-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          <Button asChild className="mt-5">
            <Link to="/login">เข้าสู่ระบบผู้ดูแล</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return <>{children}</>;
}
