import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Database, FileText, ShieldCheck } from "lucide-react";
import { apiGetPublicDataSummary } from "@/lib/api";

function formatDate(value: string | null) {
  if (!value) return "ยังไม่มีข้อมูล";
  return new Date(value).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function PublicDataNotice({ compact = false }: { compact?: boolean }) {
  const { data } = useQuery({
    queryKey: ["public-data-summary"],
    queryFn: apiGetPublicDataSummary,
    staleTime: 300_000,
  });

  const items = [
    {
      icon: CalendarClock,
      label: "ปรับปรุงล่าสุด",
      value: formatDate(data?.lastUpdated ?? null),
    },
    {
      icon: FileText,
      label: "แหล่งข้อมูล",
      value: data?.sourceName ?? "แผนพัฒนาท้องถิ่น พ.ศ. 2566-2570",
    },
    {
      icon: ShieldCheck,
      label: "สถานะข้อมูล",
      value: data?.dataStatus ?? "เผยแพร่แบบอ่านอย่างเดียว",
    },
    {
      icon: Database,
      label: "หมายเหตุการตรวจสอบ",
      value: data?.verificationNote ?? "ข้อมูลอยู่ระหว่างการตรวจทานเชิงคุณภาพอย่างต่อเนื่อง",
    },
  ];

  return (
    <section className={compact ? "grid gap-3 sm:grid-cols-2" : "grid gap-3 md:grid-cols-4"}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="rounded-xl border border-border bg-card px-4 py-3 shadow-soft">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <Icon className="size-3.5" />
              {item.label}
            </div>
            <div className="mt-1.5 text-sm font-medium leading-relaxed text-foreground/85">{item.value}</div>
          </div>
        );
      })}
    </section>
  );
}
