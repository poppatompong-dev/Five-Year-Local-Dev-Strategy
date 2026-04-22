import { STATUS_LABEL, type Status } from "@/lib/mock-data";

const STYLES: Record<Status, string> = {
  planning:    "bg-info/10 text-info ring-1 ring-inset ring-info/25",
  in_progress: "bg-warning/12 text-warning ring-1 ring-inset ring-warning/30",
  completed:   "bg-success/10 text-success ring-1 ring-inset ring-success/25",
  cancelled:   "bg-destructive/8 text-destructive ring-1 ring-inset ring-destructive/20",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0",
        STYLES[status],
      ].join(" ")}
    >
      <span
        className={[
          "size-1.5 rounded-full bg-current",
          status === "in_progress" ? "animate-pulse" : "",
        ].join(" ")}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}
