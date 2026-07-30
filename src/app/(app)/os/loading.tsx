function Line({ className = "" }: { className?: string }) {
  return <span className={`block animate-pulse rounded-full bg-raise ${className}`} />;
}

export default function OsLoading() {
  return (
    <div role="status" aria-label="Cargando KAIRAS OS" className="space-y-6">
      <div>
        <Line className="h-3 w-44" />
        <Line className="mt-3 h-8 w-72 max-w-full" />
      </div>
      <div className="h-16 animate-pulse rounded-2xl border border-line bg-surface" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-2xl border border-line bg-surface"
          />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="h-48 animate-pulse rounded-2xl border border-line bg-surface"
          />
        ))}
      </div>
      <span className="sr-only">Cargando el conocimiento operativo…</span>
    </div>
  );
}
