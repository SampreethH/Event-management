import { cn } from "@/lib/cn";
import { PIPELINE, STATUS_LABEL, type AnyStatus } from "@/lib/domain/order-status";

export function StatusTrack({ status }: { status: AnyStatus }) {
  if (status === "CANCELLED" || status === "PENDING_PAYMENT") {
    return <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", status === "CANCELLED" ? "bg-white/5 text-mist-faint" : "bg-tangerine/15 text-tangerine-300")}>{STATUS_LABEL[status]}</span>;
  }
  const idx = PIPELINE.indexOf(status);
  return (
    <ol className="flex items-center gap-1.5" aria-label={`Status: ${STATUS_LABEL[status]}`}>
      {PIPELINE.map((s, i) => (
        <li key={s} className="flex items-center gap-1.5">
          <span className={cn("h-1.5 w-8 rounded-full sm:w-12", i <= idx ? "bg-gradient-to-r from-champagne to-tangerine" : "bg-white/10")} title={STATUS_LABEL[s]} />
        </li>
      ))}
      <span className="ml-2 text-xs font-semibold text-champagne">{STATUS_LABEL[status]}</span>
    </ol>
  );
}
