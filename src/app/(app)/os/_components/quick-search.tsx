"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft, History, LoaderCircle } from "lucide-react";
import { quickSearchAction } from "../actions";
import { OS_SECTIONS, sectionForEntry, entryHref } from "../_sections";
import { OS_TYPE_LABEL } from "../_config";
import type { BaseEntry } from "@/server/services/os/os-views-service";
import styles from "./os.module.css";

type Grouped = { section: string; label: string; items: (BaseEntry & { _i: number })[] };
const RECENT_SEARCHES_KEY = "kairas-os:recent-searches:v1";

export function QuickSearchTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("os:open-search"))}
      className="flex w-full items-center gap-4 rounded-2xl border border-line-strong bg-gradient-to-b from-raise to-surface px-5 py-4 text-left transition-colors hover:border-violet-line"
    >
      <Search className="h-5 w-5 text-lavender" />
      <span className="text-lg font-medium text-faint">¿Qué necesitas del cerebro de KAIRAS?</span>
      <span className="ml-auto flex gap-1 text-xs text-faint">
        <kbd className="rounded-md border border-line px-1.5 py-1">⌘</kbd>
        <kbd className="rounded-md border border-line px-1.5 py-1">K</kbd>
      </span>
    </button>
  );
}

export function QuickSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<BaseEntry[]>([]);
  const [sel, setSel] = useState(0);
  const [pending, setPending] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);

  // Abrir con ⌘K / Ctrl+K, o evento global desde el buscador de la home.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("os:open-search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("os:open-search", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => {
        inputRef.current?.focus();
        try {
          const stored: unknown = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) ?? "[]");
          setRecent(Array.isArray(stored) ? stored.filter((item): item is string => typeof item === "string").slice(0, 5) : []);
        } catch {
          setRecent([]);
        }
      }, 20);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => { setQ(""); setResults([]); setSel(0); }, 0);
    return () => clearTimeout(t);
  }, [open]);

  // Debounce + secuencia: una respuesta lenta nunca reemplaza otra más reciente.
  useEffect(() => {
    const term = q.trim();
    const requestId = ++requestRef.current;
    const t = setTimeout(async () => {
      if (term.length < 2) {
        setResults([]);
        setSel(0);
        setPending(false);
        return;
      }
      setPending(true);
      try {
        const result = await quickSearchAction(term);
        if (requestRef.current !== requestId) return;
        setResults(result);
        setSel(0);
      } finally {
        if (requestRef.current === requestId) setPending(false);
      }
    }, term.length < 2 ? 0 : 220);
    return () => clearTimeout(t);
  }, [q]);

  const flat = results.map((e, i) => ({ ...e, _i: i }));
  const groups: Grouped[] = [];
  for (const e of flat) {
    const s = sectionForEntry(e.area, e.type);
    const key = s?.slug ?? e.area;
    const label = s?.label ?? e.area;
    let g = groups.find((x) => x.section === key);
    if (!g) { g = { section: key, label, items: [] }; groups.push(g); }
    g.items.push(e);
  }

  const remember = useCallback((term: string) => {
    const value = term.trim();
    if (value.length < 2) return;
    const next = [
      value,
      ...recent.filter((item) => item.toLocaleLowerCase("es") !== value.toLocaleLowerCase("es")),
    ].slice(0, 5);
    setRecent(next);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  }, [recent]);

  const go = useCallback((id: string) => {
    remember(q);
    setOpen(false);
    router.push(entryHref(id));
  }, [q, remember, router]);

  const openAll = useCallback(() => {
    remember(q);
    setOpen(false);
    router.push(`/os/buscar?q=${encodeURIComponent(q.trim())}`);
  }, [q, remember, router]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, flat.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && flat[sel]) { e.preventDefault(); go(flat[sel].id); }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full max-w-[520px] items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-left text-[13.5px] text-faint transition-colors hover:border-line-strong"
      >
        <Search className="h-4 w-4 text-mist" />
        Busca en el cerebro de KAIRAS…
        <span className="ml-auto flex gap-1 text-[11px] text-faint">
          <kbd className="rounded-md border border-line px-1.5 py-0.5">⌘</kbd>
          <kbd className="rounded-md border border-line px-1.5 py-0.5">K</kbd>
        </span>
      </button>

      {open ? (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div className={styles.palette} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-line px-5 py-4">
              <Search className="h-[18px] w-[18px] text-lavender" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Busca documentos, decisiones, clientes, recursos…"
                className="flex-1 bg-transparent text-[17px] text-foam outline-none placeholder:text-faint"
              />
              <kbd className="rounded-md border border-line px-1.5 py-0.5 text-[11px] text-faint">esc</kbd>
            </div>

            <div className={`max-h-[52vh] overflow-y-auto p-2 ${styles.scroll}`}>
              {q.trim().length < 2 ? (
                recent.length > 0 ? (
                  <div className="p-2">
                    <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-faint">Búsquedas recientes</p>
                    {recent.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => setQ(term)}
                        className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left text-sm text-mist hover:bg-raise hover:text-foam"
                      >
                        <History className="h-3.5 w-3.5 text-faint" /> {term}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="px-4 py-8 text-center text-sm text-faint">Escribe al menos dos caracteres para buscar en todo KAIRAS OS.</p>
                )
              ) : pending ? (
                <p className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-faint">
                  <LoaderCircle className="h-4 w-4 animate-spin" /> Buscando…
                </p>
              ) : flat.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-faint">Sin resultados para «{q}».</p>
              ) : (
                groups.map((g) => {
                  const sec = OS_SECTIONS.find((s) => s.slug === g.section);
                  const Icon = sec?.icon ?? Search;
                  return (
                    <div key={g.section} className="mb-1">
                      <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-faint">{g.label}</p>
                      {g.items.map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onMouseEnter={() => setSel(e._i)}
                          onClick={() => go(e.id)}
                          className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left ${sel === e._i ? "bg-violet-soft" : ""}`}
                        >
                          <span className="grid h-[26px] w-[26px] flex-none place-items-center rounded-[7px] bg-raise text-lavender">
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[13.5px] text-foam">{e.title}</span>
                            {e.summary ? <span className="block truncate text-[11px] text-faint">{e.summary}</span> : null}
                          </span>
                          <span className="ml-auto hidden shrink-0 text-[11px] text-faint sm:block">
                            {g.label} · {OS_TYPE_LABEL[e.type]}
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex gap-4 border-t border-line px-4 py-2.5 text-[11px] text-faint">
              <span className="flex items-center gap-1.5">↑↓ navegar</span>
              <span className="flex items-center gap-1.5"><CornerDownLeft className="h-3 w-3" /> abrir</span>
              <span>{flat.length} resultados rápidos</span>
              {q.trim().length >= 2 ? (
                <button type="button" onClick={openAll} className="ml-auto font-semibold text-lavender hover:underline">
                  Ver todos y filtrar
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
