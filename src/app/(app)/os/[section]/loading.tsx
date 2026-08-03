function Line({ className = "" }: { className?: string }) {
  return <span className={`block animate-pulse rounded-full bg-raise ${className}`} />;
}

export default function OsSectionLoading() {
  return (
    <div role="status" aria-label="Cargando seccion de KAIRAS OS" className="space-y-6">
      <div className="border-b border-line pb-5">
        <Line className="h-3 w-28" />
        <Line className="mt-3 h-8 w-72 max-w-full" />
        <Line className="mt-3 h-4 w-[32rem] max-w-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-40 animate-pulse rounded-2xl border border-line bg-surface"
          />
        ))}
      </div>
      <span className="sr-only">Preparando contenido operativo...</span>
    </div>
  );
}
