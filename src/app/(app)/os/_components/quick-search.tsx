"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft } from "lucide-react";
import { quickSearchAction } from "../actions";
import { OS_SECTIONS, sectionForEntry, entryHref } from "../_sections";
import { OS_TYPE_LABEL } from "../_config";
import type { BaseEntry } from "@/server/services/os/os-views-service";
import styles from "./os.module.css";

type Grouped = { section: string; label: string; items: (BaseEntry & { _i: number })[] };

export function QuickSearch({ variant = "bar" }: { variant?: "bar" | "hero" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<BaseEntry[]>([]);
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

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
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => { setQ(""); setResults([]); setSel(0); }, 0);
    return () => clearTimeout(t);
  }, [open]);

  // Búsqueda con debounce (todo setState va dentro del timeout: nada síncrono).
  useEffect(() => {
    const term = q.trim();
    const t = setTimeout(async () => {
      if (term.length < 2) { setResults([]); setSel(0); return; }
      const r = await quickSearchAction(q);
      setResults(r);
      setSel(0);
    }, term.length < 2 ? 0 : 130);
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

  const go = useCallback((id: string) => {
    setOpen(false);
    router.push(entryHref(id));
  }, [router]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, flat.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && flat[sel]) { e.preventDefault(); go(flat[sel].id); }
  };

  return (
    <>
      {variant === "bar" ? (
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
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-4 rounded-2xl border border-line-strong bg-gradient-to-b from-raise to-surface px-5 py-4 text-left transition-colors hover:border-violet-line"
        >
          <Search className="h-5 w-5 text-lavender" />
          <span className="text-lg font-medium text-faint">¿Qué necesitas del cerebro de KAIRAS?</span>
          <span className="ml-auto flex gap-1 text-xs text-faint">
            <kbd className="rounded-md border border-line px-1.5 py-1">⌘</kbd>
            <kbd className="rounded-md border border-line px-1.5 py-1">K</kbd>
          </span>
        </button>
      )}

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
                <p className="px-4 py-8 text-center text-sm text-faint">Escribe para buscar en las 113 unidades de conocimiento.</p>
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
              <span>{flat.length} resultados</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
