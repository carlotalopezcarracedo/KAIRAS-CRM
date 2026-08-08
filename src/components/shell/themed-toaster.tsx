"use client";

import { Toaster } from "sonner";
import type { Theme } from "@/lib/theme";

/**
 * Los avisos de sonner llevan colores propios, así que hay que decirles el
 * tema aparte. Con "system" se delega en sonner, que ya escucha la
 * preferencia del sistema.
 */
export function ThemedToaster({ theme }: { theme: Theme }) {
  const isLight = theme === "light";

  return (
    <Toaster
      position="top-right"
      theme={theme === "system" ? "system" : theme}
      toastOptions={{
        style: isLight
          ? {
              background: "#ffffff",
              border: "1px solid rgba(23,20,26,0.12)",
              color: "#17141a",
            }
          : {
              background: "#18151d",
              border: "1px solid rgba(225,232,240,0.1)",
              color: "#e1e8f0",
            },
      }}
    />
  );
}
