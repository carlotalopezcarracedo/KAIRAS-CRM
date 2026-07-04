"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { Input, Select } from "@/components/ui/field";
import { LEAD_STATUS, TEMPERATURE, LEAD_SOURCE, toOptions } from "@/lib/labels";

const statusOptions = toOptions(LEAD_STATUS);
const temperatureOptions = toOptions(TEMPERATURE);
const sourceOptions = toOptions(LEAD_SOURCE);

export function LeadFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function apply(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => {
      router.replace(`/leads?${params.toString()}`, { scroll: false });
    });
  }

  // Búsqueda con debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if ((searchParams.get("q") ?? "") !== q) apply("q", q);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const hasFilters =
    !!searchParams.get("q") ||
    !!searchParams.get("status") ||
    !!searchParams.get("temperature") ||
    !!searchParams.get("source");

  return (
    <div className="mb-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative sm:w-72">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar nombre, email, teléfono…"
          className="pl-10"
          aria-label="Buscar leads"
        />
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:flex sm:items-center">
        <Select
          aria-label="Filtrar por estado"
          value={searchParams.get("status") ?? ""}
          onChange={(e) => apply("status", e.target.value)}
          className="sm:w-44"
        >
          <option value="">Estado: todos</option>
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filtrar por temperatura"
          value={searchParams.get("temperature") ?? ""}
          onChange={(e) => apply("temperature", e.target.value)}
          className="sm:w-40"
        >
          <option value="">Temperatura</option>
          {temperatureOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filtrar por fuente"
          value={searchParams.get("source") ?? ""}
          onChange={(e) => apply("source", e.target.value)}
          className="sm:w-48"
        >
          <option value="">Fuente: todas</option>
          {sourceOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      {hasFilters ? (
        <button
          type="button"
          onClick={() => {
            setQ("");
            startTransition(() => router.replace("/leads", { scroll: false }));
          }}
          className="inline-flex cursor-pointer items-center gap-1 self-start rounded-full px-3 py-1.5 text-xs font-semibold text-faint transition-colors hover:bg-raise hover:text-foam sm:self-auto"
        >
          <X className="h-3.5 w-3.5" />
          Limpiar
        </button>
      ) : null}
    </div>
  );
}
