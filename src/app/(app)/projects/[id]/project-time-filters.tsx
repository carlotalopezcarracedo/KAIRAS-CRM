"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Input, Select } from "@/components/ui/field";
import { DateTimeField } from "@/components/ui/date-time-field";

/** Filtros de la sección "Tiempo" de la ficha de proyecto: rango, texto, facturable, origen. */
export function ProjectTimeFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  const hasFilters = ["tFrom", "tTo", "tQ", "tBillable", "tOrigin"].some((k) =>
    searchParams.get(k),
  );

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <DateTimeField
        withTime={false}
        aria-label="Desde"
        defaultValue={searchParams.get("tFrom") ?? ""}
        onChange={(v) => setParam("tFrom", v)}
        className="h-9 w-full text-base sm:h-8 sm:w-36 sm:text-xs"
      />
      <span className="hidden text-faint sm:inline">→</span>
      <DateTimeField
        withTime={false}
        aria-label="Hasta"
        defaultValue={searchParams.get("tTo") ?? ""}
        onChange={(v) => setParam("tTo", v)}
        className="h-9 w-full text-base sm:h-8 sm:w-36 sm:text-xs"
      />
      <Input
        aria-label="Buscar en descripción"
        placeholder="Buscar…"
        defaultValue={searchParams.get("tQ") ?? ""}
        onChange={(e) => setParam("tQ", e.target.value)}
        className="h-9 w-full text-base sm:h-8 sm:w-40 sm:text-xs"
      />
      <Select
        aria-label="Filtrar por facturable"
        value={searchParams.get("tBillable") ?? ""}
        onChange={(e) => setParam("tBillable", e.target.value)}
        className="h-9 w-full text-base sm:h-8 sm:w-36 sm:text-xs"
      >
        <option value="">Todo</option>
        <option value="1">Solo facturable</option>
        <option value="0">Solo no facturable</option>
      </Select>
      <Select
        aria-label="Filtrar por origen"
        value={searchParams.get("tOrigin") ?? ""}
        onChange={(e) => setParam("tOrigin", e.target.value)}
        className="h-9 w-full text-base sm:h-8 sm:w-36 sm:text-xs"
      >
        <option value="">Origen: todos</option>
        <option value="kairas">Kairas</option>
        <option value="toggl">Toggl</option>
      </Select>
      {hasFilters ? (
        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            for (const k of ["tFrom", "tTo", "tQ", "tBillable", "tOrigin"]) params.delete(k);
            startTransition(() =>
              router.replace(`${pathname}?${params.toString()}`, { scroll: false }),
            );
          }}
          className="cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold text-faint hover:text-foam"
        >
          Limpiar
        </button>
      ) : null}
    </div>
  );
}
