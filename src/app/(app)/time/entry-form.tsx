"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { WORK_TYPE, toOptions } from "@/lib/labels";
import type { ActionResult } from "@/lib/action-result";

const workTypeOptions = toOptions(WORK_TYPE);

export type EntryFormDefaults = Partial<{
  title: string;
  description: string;
  workType: string;
  startedAt: string;
  endedAt: string;
  clientId: string;
  projectId: string;
  taskId: string;
  serviceId: string;
  billable: boolean;
  hourlyRate: string;
}>;

export type EntrySelectData = {
  clients: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  services: { id: string; name: string }[];
  tasks: { id: string; title: string }[];
};

export function EntryForm({
  action,
  defaults = {},
  selects,
  submitLabel,
  onSuccess,
  resetOnSuccess = false,
}: {
  action: (
    prev: ActionResult | undefined,
    formData: FormData,
  ) => Promise<ActionResult>;
  defaults?: EntryFormDefaults;
  selects: EntrySelectData;
  submitLabel: string;
  onSuccess?: () => void;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Entrada guardada");
      if (resetOnSuccess) formRef.current?.reset();
      onSuccess?.();
    }
  }, [state, onSuccess, resetOnSuccess]);

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <Field label="Qué has hecho" error={errors.title?.[0]}>
        <Input
          name="title"
          defaultValue={defaults.title}
          placeholder="Maquetar la home"
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Inicio" required error={errors.startedAt?.[0]}>
          <Input
            name="startedAt"
            type="datetime-local"
            defaultValue={defaults.startedAt}
            required
          />
        </Field>
        <Field label="Fin" required error={errors.endedAt?.[0]}>
          <Input
            name="endedAt"
            type="datetime-local"
            defaultValue={defaults.endedAt}
            required
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Tipo de trabajo" error={errors.workType?.[0]}>
          <Select name="workType" defaultValue={defaults.workType ?? "other"}>
            {workTypeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Cliente" error={errors.clientId?.[0]}>
          <Select name="clientId" defaultValue={defaults.clientId ?? ""}>
            <option value="">Sin cliente</option>
            {selects.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Proyecto" error={errors.projectId?.[0]}>
          <Select name="projectId" defaultValue={defaults.projectId ?? ""}>
            <option value="">Sin proyecto</option>
            {selects.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tarea" error={errors.taskId?.[0]}>
          <Select name="taskId" defaultValue={defaults.taskId ?? ""}>
            <option value="">Sin tarea</option>
            {selects.tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Servicio" error={errors.serviceId?.[0]}>
          <Select name="serviceId" defaultValue={defaults.serviceId ?? ""}>
            <option value="">Sin servicio</option>
            {selects.services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Tarifa manual (€/h, opcional)"
          error={errors.hourlyRate?.[0]}
        >
          <Input
            name="hourlyRate"
            type="number"
            min={0}
            step="0.01"
            defaultValue={defaults.hourlyRate}
            placeholder="auto"
          />
        </Field>
      </div>

      <Field label="Descripción (opcional)" error={errors.description?.[0]}>
        <Textarea
          name="description"
          defaultValue={defaults.description}
          className="min-h-16"
        />
      </Field>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-mist">
        <input
          type="checkbox"
          name="billable"
          defaultChecked={defaults.billable ?? true}
          className="h-4 w-4 accent-[#8b5df5]"
        />
        Facturable
      </label>

      {state && !state.ok && !state.fieldErrors ? (
        <p className="rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
