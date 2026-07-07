"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input, Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import {
  startTimerAction,
  stopTimerAction,
  discardTimerAction,
} from "./actions";

export type TimerBarActive = {
  startedAt: string; // ISO
  accumulatedSeconds: number;
  title: string | null;
  billable: boolean;
  projectName: string | null;
  clientName: string | null;
} | null;

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Barra de temporizador estilo Toggl: descripción + proyecto + facturable
 * y un botón grande de iniciar/parar. Vive en la cabecera de /time.
 */
export function TimerBar({
  active,
  projects,
  clients,
}: {
  active: TimerBarActive;
  projects: { id: string; name: string }[];
  clients: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());
  const titleRef = useRef<HTMLInputElement>(null);
  const [projectId, setProjectId] = useState("");
  const [clientId, setClientId] = useState("");
  const [billable, setBillable] = useState(true);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [active]);

  if (active) {
    const elapsed =
      Math.max(0, Math.floor((now - new Date(active.startedAt).getTime()) / 1000)) +
      active.accumulatedSeconds;
    return (
      <div className="mb-5 flex flex-col gap-3 rounded-card border border-violet-line bg-violet-soft/50 px-4 py-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foam">
            {active.title || "Sin descripción"}
          </p>
          <p className="truncate text-xs text-mist">
            {[active.projectName, active.clientName].filter(Boolean).join(" · ") ||
              "Sin proyecto"}
            {active.billable ? " · facturable" : " · interno"}
          </p>
        </div>
        <span className="font-mono text-2xl font-bold tabular-nums text-lavender">
          {formatElapsed(elapsed)}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await stopTimerAction();
                if (!result.ok) toast.error(result.error);
                else {
                  toast.success("Entrada guardada");
                  router.refresh();
                }
              })
            }
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-violet px-6 text-sm font-bold text-white transition-colors hover:bg-violet/85 disabled:opacity-50"
          >
            <Square className="h-4 w-4 fill-current" />
            Parar
          </button>
          <button
            type="button"
            disabled={pending}
            title="Descartar sin guardar"
            onClick={() =>
              startTransition(async () => {
                const result = await discardTimerAction();
                if (!result.ok) toast.error(result.error);
                else {
                  toast.success("Cronómetro descartado");
                  router.refresh();
                }
              })
            }
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-faint transition-colors hover:bg-raise hover:text-danger disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  function start() {
    startTransition(async () => {
      const result = await startTimerAction({
        title: titleRef.current?.value || undefined,
        projectId: projectId || undefined,
        clientId: clientId || undefined,
        billable,
      });
      if (!result.ok) toast.error(result.error);
      else {
        if (titleRef.current) titleRef.current.value = "";
        router.refresh();
      }
    });
  }

  return (
    <div className="mb-5 flex flex-col gap-2.5 rounded-card border border-line bg-surface px-4 py-3 sm:flex-row sm:items-center">
      <Input
        ref={titleRef}
        placeholder="¿En qué estás trabajando?"
        aria-label="Descripción del trabajo"
        className="flex-1 border-0 bg-transparent px-1 text-base focus:border-0"
        onKeyDown={(e) => {
          if (e.key === "Enter") start();
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          aria-label="Proyecto"
          className="h-9 w-40 text-xs"
        >
          <option value="">Proyecto…</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          aria-label="Cliente"
          className="h-9 w-36 text-xs"
        >
          <option value="">Cliente…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <button
          type="button"
          onClick={() => setBillable((b) => !b)}
          title={billable ? "Facturable (clic para interno)" : "Interno (clic para facturable)"}
          className={cn(
            "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border text-sm font-bold transition-colors",
            billable
              ? "border-violet-line bg-violet-soft text-lavender"
              : "border-line text-faint",
          )}
        >
          €
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={start}
          className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-violet px-6 text-sm font-bold text-white transition-colors hover:bg-violet/85 disabled:opacity-50"
        >
          <Play className="h-4 w-4 fill-current" />
          Iniciar
        </button>
      </div>
    </div>
  );
}
