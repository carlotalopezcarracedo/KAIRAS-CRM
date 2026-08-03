"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          minHeight: "100vh",
          margin: 0,
          display: "grid",
          placeItems: "center",
          background: "#0b090d",
          color: "#f7f4fa",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <main
          style={{
            width: "min(560px, calc(100% - 32px))",
            padding: 28,
            border: "1px solid #3b2c46",
            borderRadius: 20,
            background: "#151119",
          }}
        >
          <p style={{ margin: 0, color: "#cbb3ff", fontWeight: 700 }}>
            KAIRAS OS
          </p>
          <h1 style={{ margin: "10px 0 0", fontSize: 24 }}>
            No hemos podido cargar la aplicación
          </h1>
          <p style={{ margin: "10px 0 0", color: "#b9afbf", lineHeight: 1.6 }}>
            Se ha producido un error temporal. Puedes reintentar sin perder tu
            sesión.
          </p>
          {error.digest ? (
            <p style={{ color: "#827789", fontSize: 12 }}>
              Referencia: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => unstable_retry()}
            style={{
              marginTop: 18,
              minHeight: 40,
              padding: "0 18px",
              border: 0,
              borderRadius: 999,
              background: "#7c4dff",
              color: "white",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
