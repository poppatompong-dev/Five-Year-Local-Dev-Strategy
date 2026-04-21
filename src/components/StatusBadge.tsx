import { STATUS_LABEL, type Status } from "@/lib/mock-data";

const STYLES: Record<Status, string> = {
  planning: "bg-info/10 text-info ring-info/20",
  in_progress: "bg-warning/15 text-warning ring-warning/25",
  completed: "bg-success/10 text-success ring-success/20",
  cancelled: "bg-destructive/10 text-destructive ring-destructive/20",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        STYLES[status],
      ].join(" ")}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}
