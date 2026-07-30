"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function OsError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[KAIRAS_OS_ERROR]", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  const reference = error.digest ? `OS-${error.digest}` : "OS-RUNTIME";

  return (
    <section
      role="alert"
      className="mx-auto my-12 max-w-xl rounded-2xl border border-danger/30 bg-danger-soft/40 p-6"
    >
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-danger-soft text-danger">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <h1 className="mt-5 text-xl font-bold text-foam">
        No hemos podido cargar esta parte de KAIRAS OS
      </h1>
      <p className="mt-2 text-sm leading-6 text-mist">
        El fallo se ha aislado dentro de Conocimiento. El resto del CRM sigue
        disponible y puedes volver a intentar la carga.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="inline-flex h-9 items-center gap-2 rounded-full bg-violet px-4 text-xs font-semibold text-white hover:bg-violet/85"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reintentar
        </button>
        <p className="text-xs text-faint">
          Referencia técnica: <code className="text-mist">{reference}</code>
        </p>
      </div>
    </section>
  );
}
