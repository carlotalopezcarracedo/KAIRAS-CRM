"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Monitor, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { THEMES, THEME_LABELS, type Theme } from "@/lib/theme";
import { setThemeAction } from "./theme-actions";

const ICONS: Record<Theme, typeof Sun> = {
  dark: Moon,
  light: Sun,
  system: Monitor,
};

export function ThemeForm({ current }: { current: Theme }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {THEMES.map((theme) => {
          const Icon = ICONS[theme];
          const active = current === theme;
          return (
            <button
              key={theme}
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await setThemeAction(theme);
                  if (!result.ok) {
                    toast.error(result.error);
                    return;
                  }
                  // El atributo lo pinta el layout en servidor: hay que
                  // refrescar para que llegue el HTML con el tema nuevo.
                  router.refresh();
                })
              }
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-3 text-sm font-semibold transition-colors",
                active
                  ? "border-violet-line bg-violet-soft text-lavender"
                  : "border-line bg-surface text-mist hover:border-line-strong hover:text-foam",
                pending && "opacity-60",
              )}
              aria-pressed={active}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {THEME_LABELS[theme]}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-faint">
        Se guarda en este navegador. «Según el sistema» sigue el ajuste de
        claro/oscuro de tu móvil u ordenador.
      </p>
    </div>
  );
}
