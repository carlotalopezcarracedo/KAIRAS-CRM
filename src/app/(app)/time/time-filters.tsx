"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Select, Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";

const RANGES = [
  ["day", "Hoy"],
  ["week", "Semana"],
  ["month", "Mes"],
  ["prev", "Mes anterior"],
  ["custom", "Personalizado"],
] as const;

export function TimeFilters({
  clients,
  projects,
}: {
  clients: { id: string; name: string }[];
  projects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const range = searchParams.get("range") ?? "week";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() =>
      router.replace(`${pathname}?${params.toString()}`, { scroll: false }),
    );
  }

  function rangeHref(r: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", r);
    if (r !== "custom") {
      params.delete("from");
      params.delete("to");
    }
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="mb-5 space-y-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {RANGES.map(([key, label]) => (
          <Link
            key={key}
            href={rangeHref(key)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
              range === key
                ? "border-violet-line bg-violet-soft text-lavender"
                : "border-line bg-surface text-faint hover:text-foam",
            )}
          >
            {label}
          </Link>
        ))}
        {range === "custom" ? (
          <span className="flex items-center gap-1.5">
            <Input
              type="date"
              aria-label="Desde"
              defaultValue={searchParams.get("from") ?? ""}
              onChange={(e) => setParam("from", e.target.value)}
              className="h-8 w-36 text-xs"
            />
            <span className="text-faint">→</span>
            <Input
              type="date"
              aria-label="Hasta"
              defaultValue={searchParams.get("to") ?? ""}
              onChange={(e) => setParam("to", e.target.value)}
              className="h-8 w-36 text-xs"
            />
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="Filtrar por cliente"
          value={searchParams.get("clientId") ?? ""}
          onChange={(e) => setParam("clientId", e.target.value)}
          className="h-8 w-44 text-xs"
        >
          <option value="">Cliente: todos</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filtrar por proyecto"
          value={searchParams.get("projectId") ?? ""}
          onChange={(e) => setParam("projectId", e.target.value)}
          className="h-8 w-44 text-xs"
        >
          <option value="">Proyecto: todos</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filtrar por facturable"
          value={searchParams.get("billable") ?? ""}
          onChange={(e) => setParam("billable", e.target.value)}
          className="h-8 w-40 text-xs"
        >
          <option value="">Todo el tiempo</option>
          <option value="1">Solo facturable</option>
          <option value="0">Solo no facturable</option>
        </Select>
        {searchParams.get("clientId") ||
        searchParams.get("projectId") ||
        searchParams.get("billable") ? (
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams();
              params.set("range", range);
              startTransition(() =>
                router.replace(`${pathname}?${params.toString()}`, { scroll: false }),
              );
            }}
            className="cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold text-faint hover:text-foam"
          >
            Limpiar filtros
          </button>
        ) : null}
      </div>
    </div>
  );
}
