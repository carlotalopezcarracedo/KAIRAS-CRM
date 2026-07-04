import * as React from "react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/labels";

const tones: Record<Tone, string> = {
  neutral: "bg-raise text-mist border-line",
  violet: "bg-violet-soft text-lavender border-violet-line",
  ok: "bg-ok-soft text-ok border-ok/25",
  warn: "bg-warn-soft text-warn border-warn/25",
  danger: "bg-danger-soft text-danger border-danger/25",
  info: "bg-info-soft text-info border-info/25",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
