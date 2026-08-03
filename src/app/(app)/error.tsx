"use client";

import { IntentLink as Link } from "@/components/navigation/intent-link";
import { useEffect } from "react";
import { AlertTriangle, House, RefreshCw } from "lucide-react";

export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <section className="mx-auto max-w-2xl rounded-card border border-danger/30 bg-surface p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-danger-soft text-danger">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div>
          <p className="k-label text-danger">Error temporal</p>
          <h1 className="mt-1 text-xl font-bold text-foam">
            Esta sección no ha podido cargarse
          </h1>
          <p className="mt-2 text-sm leading-6 text-mist">
            La navegación sigue disponible. Reintenta la consulta o vuelve a Hoy.
          </p>
          {error.digest ? (
            <p className="mt-2 font-mono text-[11px] text-faint">
              Referencia: {error.digest}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => unstable_retry()}
              className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-violet px-4 text-xs font-semibold text-white hover:bg-violet/85"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reintentar
            </button>
            <Link
              href="/dashboard"
              prefetch={false}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-4 text-xs font-semibold text-mist hover:bg-raise hover:text-foam"
            >
              <House className="h-3.5 w-3.5" />
              Volver a Hoy
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
