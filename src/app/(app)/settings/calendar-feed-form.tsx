"use client";

import { useState, useTransition } from "react";
import { Copy, RefreshCw, Check, CalendarPlus, Power } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  enableCalendarFeedAction,
  regenerateCalendarFeedAction,
  disableCalendarFeedAction,
} from "./calendar-actions";

export function CalendarFeedForm({
  initialToken,
  appUrl,
}: {
  initialToken: string | null;
  appUrl: string;
}) {
  const [token, setToken] = useState(initialToken);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const feedUrl = token ? `${appUrl}/api/calendar/${token}.ics` : null;
  // webcal:// hace que iOS abra directamente el diálogo de suscripción.
  const webcalUrl = feedUrl?.replace(/^https?:\/\//, "webcal://") ?? null;

  function run(
    action: () => Promise<{ ok: true; token: string | null } | { ok: false; error: string }>,
    successMessage: string,
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setToken(result.token);
      setCopied(false);
      toast.success(successMessage);
    });
  }

  async function copy() {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      toast.success("Enlace copiado");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("No se pudo copiar. Selecciona el enlace a mano.");
    }
  }

  if (!token) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-mist">
          Publica tu agenda como calendario suscribible para verla en el iPhone,
          en Google Calendar o en Outlook.
        </p>
        <Button
          size="sm"
          disabled={pending}
          onClick={() => run(enableCalendarFeedAction, "Calendario publicado")}
        >
          <CalendarPlus className="h-4 w-4" />
          {pending ? "Activando…" : "Activar sincronización"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="k-label mb-1.5">Enlace de suscripción</p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-xl border border-line bg-ink px-3 py-2.5 font-mono text-xs text-mist">
            {feedUrl}
          </code>
          <Button variant="ghost" size="sm" onClick={copy} disabled={pending}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>
      </div>

      {webcalUrl ? (
        <a
          href={webcalUrl}
          className="inline-flex h-9 items-center gap-2 rounded-full bg-violet px-4 text-xs font-semibold text-white hover:bg-violet/85"
        >
          <CalendarPlus className="h-3.5 w-3.5" />
          Añadir en este dispositivo
        </a>
      ) : null}

      <div className="rounded-xl border border-line bg-ink p-3.5">
        <p className="k-label mb-2">Cómo suscribirte</p>
        <ul className="space-y-1.5 text-xs leading-relaxed text-mist">
          <li>
            <strong className="text-foam">iPhone:</strong> Ajustes → Aplicaciones
            → Calendario → Cuentas → Añadir cuenta → Otra → Añadir calendario
            suscrito, y pega el enlace.
          </li>
          <li>
            <strong className="text-foam">Google Calendar:</strong> Otros
            calendarios → + → Desde URL.
          </li>
        </ul>
      </div>

      <div className="rounded-xl border border-warn/25 bg-warn-soft/40 p-3.5">
        <p className="text-xs leading-relaxed text-mist">
          <strong className="text-foam">Es de solo lectura.</strong> KAIRAS
          publica y el móvil consume: lo que crees en el iPhone no vuelve aquí.
          Y quien tenga el enlace ve tu agenda sin contraseña, así que trátalo
          como una contraseña: si lo compartes por error, regenéralo.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() =>
            run(
              regenerateCalendarFeedAction,
              "Enlace nuevo. El anterior ya no funciona.",
            )
          }
        >
          <RefreshCw className="h-4 w-4" />
          Regenerar enlace
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-danger hover:text-danger"
          disabled={pending}
          onClick={() =>
            run(disableCalendarFeedAction, "Sincronización desactivada")
          }
        >
          <Power className="h-4 w-4" />
          Desactivar
        </Button>
      </div>
    </div>
  );
}
