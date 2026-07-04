import * as React from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  hint,
  action,
  className,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-line bg-surface/50 px-6 py-14 text-center",
        className,
      )}
    >
      <p className="text-sm font-semibold text-mist">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-faint">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
