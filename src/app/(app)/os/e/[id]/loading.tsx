export default function OsEntryLoading() {
  return (
    <div role="status" aria-label="Cargando entrada de KAIRAS OS" className="space-y-5">
      <div className="h-3 w-64 max-w-full animate-pulse rounded-full bg-raise" />
      <div className="rounded-2xl border border-line bg-surface p-6">
        <div className="h-4 w-24 animate-pulse rounded-full bg-raise" />
        <div className="mt-4 h-9 w-[38rem] max-w-full animate-pulse rounded-full bg-raise" />
        <div className="mt-3 h-4 w-[46rem] max-w-full animate-pulse rounded-full bg-raise" />
        <div className="mt-8 space-y-3">
          <div className="h-4 w-full animate-pulse rounded-full bg-raise" />
          <div className="h-4 w-11/12 animate-pulse rounded-full bg-raise" />
          <div className="h-4 w-4/5 animate-pulse rounded-full bg-raise" />
        </div>
      </div>
      <span className="sr-only">Preparando la ficha completa...</span>
    </div>
  );
}
