import Link from "next/link";
import { cn } from "@/lib/utils";

export type Chip = { label: string; value: string };

/**
 * Chips de filtro como enlaces (server-friendly). Mantiene el resto de la
 * query y alterna el parámetro `param`.
 */
export function FilterChips({
  chips,
  param,
  active,
  basePath,
  allLabel = "Todo",
}: {
  chips: Chip[];
  param: string;
  active?: string;
  basePath: string;
  allLabel?: string;
}) {
  const build = (value?: string) => {
    const sp = new URLSearchParams();
    if (value) sp.set(param, value);
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const items = [{ label: allLabel, value: "" }, ...chips];
  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      {items.map((c) => {
        const isActive = (c.value || undefined) === (active || undefined);
        return (
          <Link
            key={c.value || "__all"}
            href={build(c.value || undefined)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              isActive
                ? "border-violet-line bg-violet-soft text-lavender"
                : "border-line bg-surface text-mist hover:border-line-strong hover:text-foam",
            )}
          >
            {c.label}
          </Link>
        );
      })}
    </div>
  );
}
