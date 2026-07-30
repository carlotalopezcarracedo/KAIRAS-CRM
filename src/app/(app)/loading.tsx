export default function AppLoading() {
  return (
    <div role="status" aria-label="Cargando sección" className="space-y-5">
      <div className="space-y-3">
        <span className="block h-8 w-56 max-w-full animate-pulse rounded-full bg-raise" />
        <span className="block h-3 w-80 max-w-full animate-pulse rounded-full bg-surface" />
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
