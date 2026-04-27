import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { apiGetAuditEvents, type DBAuditEvent } from "@/lib/api";
import { ChevronLeft, ChevronRight, History, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({
    meta: [
      { title: "ประวัติการเปลี่ยนแปลง · แผนพัฒนาท้องถิ่น" },
      { name: "description", content: "บันทึกกิจกรรมการสร้าง แก้ไข ลบ และนำเข้าโครงการในระบบ" },
    ],
  }),
  component: AuditPage,
});

const ACTION_LABEL: Record<string, string> = {
  create: "สร้าง",
  update: "แก้ไข",
  delete: "ลบ",
  import: "นำเข้า",
  status_change: "เปลี่ยนสถานะ",
};

const ACTION_COLOR: Record<string, string> = {
  create: "bg-success/15 text-success border-success/30",
  update: "bg-info/15 text-info border-info/30",
  delete: "bg-destructive/15 text-destructive border-destructive/30",
  import: "bg-primary/15 text-primary border-primary/30",
  status_change: "bg-warning/15 text-warning border-warning/30",
};

function AuditPage() {
  const [filterAction, setFilterAction] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["audit-events", filterAction, page],
    queryFn: () =>
      apiGetAuditEvents({
        ...(filterAction ? { entity: "project" } : {}),
        limit: PAGE_SIZE * page,
      }),
  });

  const filtered = filterAction
    ? events.filter((e) => e.action === filterAction)
    : events;

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasMore = filtered.length >= PAGE_SIZE * page;

  function formatTime(ts: string) {
    const d = new Date(ts);
    return d.toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">ผู้ดูแลระบบ</div>
          <h1 className="text-3xl font-semibold tracking-tight mt-1">ประวัติการเปลี่ยนแปลง</h1>
          <p className="text-sm text-muted-foreground mt-1">
            บันทึกกิจกรรมทั้งหมดในระบบ
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="size-4 text-muted-foreground" />
          {["", "create", "update", "delete", "import", "status_change"].map((action) => (
            <button
              key={action}
              onClick={() => { setFilterAction(action); setPage(1); }}
              className={[
                "rounded-full px-3 py-1.5 text-xs font-medium border transition-all",
                filterAction === action
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/30",
              ].join(" ")}
            >
              {action === "" ? "ทั้งหมด" : ACTION_LABEL[action] ?? action}
            </button>
          ))}
        </div>

        {/* Event list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : paged.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-10 text-center">
            <History className="size-10 text-muted-foreground mx-auto mb-3" />
            <div className="text-lg font-medium">ยังไม่มีประวัติ</div>
            <p className="text-sm text-muted-foreground mt-1">กิจกรรมการใช้งานจะแสดงที่นี่</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium w-10">#</th>
                    <th className="px-4 py-3 font-medium">การกระทำ</th>
                    <th className="px-4 py-3 font-medium">ประเภท</th>
                    <th className="px-4 py-3 font-medium">ID</th>
                    <th className="px-4 py-3 font-medium">รายละเอียด</th>
                    <th className="px-4 py-3 font-medium text-right">เวลา</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((e) => (
                    <tr key={e.id} className="border-b border-border/40 hover:bg-muted/30 transition">
                      <td className="px-4 py-2.5 tabular text-muted-foreground">{e.id}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${ACTION_COLOR[e.action] ?? "bg-muted text-muted-foreground border-border"}`}>
                          {ACTION_LABEL[e.action] ?? e.action}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{e.entity}</td>
                      <td className="px-4 py-2.5 tabular">{e.entity_id ?? "—"}</td>
                      <td className="px-4 py-2.5 max-w-[300px]">
                        <AuditDetail event={e} />
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground text-xs tabular whitespace-nowrap">
                        {formatTime(e.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
              <span className="text-xs text-muted-foreground">
                หน้า {page} · {filtered.length} รายการ
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!hasMore}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function AuditDetail({ event }: { event: DBAuditEvent }) {
  const data = event.after;
  if (!data) return <span className="text-muted-foreground">—</span>;

  let parsed = data;
  if (typeof data === "string") {
    try { parsed = JSON.parse(data); } catch { return <span className="text-xs text-muted-foreground truncate block">{data}</span>; }
  }

  if (event.action === "status_change" && parsed.status) {
    return <span className="text-xs">สถานะ → <span className="font-medium">{parsed.status}</span></span>;
  }
  if (event.action === "import") {
    return (
      <span className="text-xs">
        นำเข้า <span className="font-medium">{parsed.inserted}</span> โครงการ
        {parsed.errors > 0 && <>, ผิดพลาด <span className="text-destructive font-medium">{parsed.errors}</span></>}
      </span>
    );
  }
  if (parsed.name) {
    return <span className="text-xs truncate block max-w-[280px]">{parsed.name}</span>;
  }
  return <span className="text-xs text-muted-foreground truncate block max-w-[280px]">{JSON.stringify(parsed).slice(0, 80)}</span>;
}
