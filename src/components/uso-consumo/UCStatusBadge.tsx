import { ucStatusConfig, type UCRequestStatus } from "@/lib/uso-consumo-status";
import { cn } from "@/lib/utils";

export default function UCStatusBadge({ status }: { status: UCRequestStatus }) {
  const config = ucStatusConfig[status];
  if (!config) return <span className="text-xs">{status}</span>;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", config.bgColor, config.color)}>
      {config.label}
    </span>
  );
}
