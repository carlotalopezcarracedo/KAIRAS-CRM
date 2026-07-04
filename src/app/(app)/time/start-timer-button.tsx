"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { startTimerAction } from "./actions";

/** Botón "iniciar cronómetro" reutilizable (tareas, proyectos, etc.). */
export function StartTimerButton({
  taskId,
  projectId,
  clientId,
  serviceId,
  title,
  billable = true,
  workType,
  compact = false,
}: {
  taskId?: string | null;
  projectId?: string | null;
  clientId?: string | null;
  serviceId?: string | null;
  title?: string;
  billable?: boolean;
  workType?: string;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function start() {
    startTransition(async () => {
      const result = await startTimerAction({
        taskId: taskId ?? undefined,
        projectId: projectId ?? undefined,
        clientId: clientId ?? undefined,
        serviceId: serviceId ?? undefined,
        title,
        billable,
        workType,
      });
      if (!result.ok) toast.error(result.error);
      else {
        toast.success("Cronómetro iniciado");
        router.refresh();
      }
    });
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={start}
        disabled={pending}
        title="Iniciar cronómetro con esta tarea"
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-faint transition-colors hover:bg-violet-soft hover:text-lavender disabled:opacity-50"
      >
        <Play className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={pending}
      className={cn(
        "inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-violet px-4 text-xs font-semibold text-white transition-colors hover:bg-violet/85 disabled:opacity-50",
      )}
    >
      <Play className="h-3.5 w-3.5" />
      {pending ? "Iniciando…" : "Iniciar cronómetro"}
    </button>
  );
}
