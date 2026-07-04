"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, Square } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  startTimerAction,
  stopTimerAction,
} from "@/app/(app)/time/actions";

export type ActiveTimerData = {
  id: string;
  startedAt: string; // ISO
  accumulatedSeconds: number;
  title: string | null;
  billable: boolean;
} | null;

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function TimerWidget({ active }: { active: ActiveTimerData }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [active]);

  if (!active) {
    return (
      <button
        type="button"
        title="Iniciar cronómetro"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await startTimerAction({ billable: true });
            if (!result.ok) toast.error(result.error);
            else {
              toast.success("Cronómetro iniciado. Asigna cliente/proyecto en Tiempo.");
              router.refresh();
            }
          })
        }
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-faint transition-colors hover:border-violet-line hover:text-lavender disabled:opacity-50"
      >
        <Play className="h-4 w-4" />
      </button>
    );
  }

  const elapsed =
    Math.max(
      0,
      Math.floor((now - new Date(active.startedAt).getTime()) / 1000),
    ) + active.accumulatedSeconds;
  const longRunning = elapsed > 8 * 3600;

  return (
    <div
      className={cn(
        "flex h-9 items-center gap-2 rounded-full border px-1.5 pl-3",
        longRunning
          ? "border-warn/40 bg-warn-soft"
          : "border-violet-line bg-violet-soft",
      )}
    >
      <Link
        href="/time"
        className="flex items-center gap-2"
        title={active.title ?? "Cronómetro activo — ver en Tiempo"}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 animate-pulse rounded-full",
            longRunning ? "bg-warn" : "bg-lavender",
          )}
        />
        <span
          className={cn(
            "font-mono text-xs font-bold tabular-nums",
            longRunning ? "text-warn" : "text-lavender",
          )}
        >
          {formatElapsed(elapsed)}
        </span>
        {active.title ? (
          <span className="hidden max-w-32 truncate text-xs text-mist sm:block">
            {active.title}
          </span>
        ) : null}
      </Link>
      <button
        type="button"
        title="Parar y guardar entrada"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await stopTimerAction();
            if (!result.ok) toast.error(result.error);
            else {
              toast.success("Entrada de tiempo guardada");
              router.refresh();
            }
          })
        }
        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-violet text-white transition-colors hover:bg-violet/85 disabled:opacity-50"
      >
        <Square className="h-3 w-3 fill-current" />
      </button>
    </div>
  );
}
