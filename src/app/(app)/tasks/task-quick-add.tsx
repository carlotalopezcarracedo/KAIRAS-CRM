"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { DateTimeField } from "@/components/ui/date-time-field";
import type { ActionResult } from "@/lib/action-result";
import { createTaskAction } from "./actions";

/**
 * Alta rápida de tarea: título + fecha + proyecto (opcional).
 * Si `fixedProjectId` viene dado (detalle de proyecto), no muestra selector.
 */
export function TaskQuickAdd({
  projects = [],
  fixedProjectId,
  fixedClientId,
}: {
  projects?: { id: string; name: string }[];
  fixedProjectId?: string;
  fixedClientId?: string;
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(createTaskAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      toast.success("Tarea creada");
    } else if (state && !state.ok && !state.fieldErrors) {
      toast.error(state.error);
    }
  }, [state]);

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-2 rounded-card border border-line bg-surface p-3 sm:flex-row sm:items-center"
    >
      {fixedProjectId ? (
        <input type="hidden" name="projectId" value={fixedProjectId} />
      ) : null}
      {fixedClientId ? (
        <input type="hidden" name="clientId" value={fixedClientId} />
      ) : null}
      <div className="flex-1">
        <Input
          name="title"
          placeholder="Nueva tarea… (ej. Enviar propuesta a Clínica Sonrisa)"
          required
          minLength={2}
          aria-label="Título de la tarea"
        />
        {errors.title?.[0] ? (
          <p className="mt-1 text-xs text-danger">{errors.title[0]}</p>
        ) : null}
      </div>
      <DateTimeField withTime={false}
        name="dueAt"
       
        aria-label="Fecha límite"
        className="sm:w-40"
      />
      {!fixedProjectId && projects.length > 0 ? (
        <Select name="projectId" aria-label="Proyecto" className="sm:w-48">
          <option value="">Sin proyecto</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      ) : null}
      <Select name="priority" defaultValue="medium" aria-label="Prioridad" className="sm:w-32">
        <option value="low">Baja</option>
        <option value="medium">Media</option>
        <option value="high">Alta</option>
        <option value="urgent">Urgente</option>
      </Select>
      <Button type="submit" size="md" disabled={pending}>
        <Plus className="h-4 w-4" />
        {pending ? "Creando…" : "Añadir"}
      </Button>
    </form>
  );
}
