import { cn } from "@/lib/utils";
import { TEMPERATURE } from "@/lib/labels";

const DOT: Record<string, string> = {
  cold: "bg-faint",
  warm: "bg-info",
  hot: "bg-warn",
  urgent: "bg-danger animate-pulse",
};

const TONE: Record<string, string> = {
  cold: "border-line text-mist",
  warm: "border-info/25 bg-info-soft text-info",
  hot: "border-warn/25 bg-warn-soft text-warn",
  urgent: "border-danger/25 bg-danger-soft text-danger",
};

/** Badge de temperatura con indicador — más legible de un vistazo. */
export function TemperatureBadge({
  temperature,
}: {
  temperature: keyof typeof TEMPERATURE;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        TONE[temperature],
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT[temperature])} />
      {TEMPERATURE[temperature].label}
    </span>
  );
}
