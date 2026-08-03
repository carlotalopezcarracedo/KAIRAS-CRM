import { LoaderCircle } from "lucide-react";

export default function AppLoading() {
  return (
    <div role="status" aria-label="Cargando sección" className="space-y-5">
      <div className="flex items-center gap-3 rounded-2xl border border-violet-line bg-violet-soft px-4 py-3.5">
        <span className="shrink-0 animate-spin text-lavender" aria-hidden>
          <LoaderCircle className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foam">Abriendo la pestaña…</p>
          <p className="text-xs text-mist">El contenido aparecerá enseguida.</p>
        </div>
      </div>
      <div className="space-y-3">
        <span className="block h-8 w-56 max-w-full animate-pulse rounded-full bg-line-strong" />
        <span className="block h-3 w-80 max-w-full animate-pulse rounded-full bg-raise" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-2xl border border-line bg-surface"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl border border-line bg-surface" />
      <span className="sr-only">Cargando la sección solicitada…</span>
    </div>
  );
}
