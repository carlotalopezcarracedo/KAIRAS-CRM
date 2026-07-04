import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  href,
  accent = false,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  href?: string;
  accent?: boolean;
  className?: string;
}) {
  const inner = (
    <div
      className={cn(
        "rounded-card border border-line bg-surface p-5 transition-colors",
        href && "hover:border-line-strong hover:bg-raise/70",
        accent && "border-violet-line bg-violet-soft",
        className,
      )}
    >
      <p className="k-label">{label}</p>
      <p
        className={cn(
          "mt-2 text-2xl font-extrabold tracking-tight",
          accent ? "text-lavender" : "text-foam",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-faint">{hint}</p> : null}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
