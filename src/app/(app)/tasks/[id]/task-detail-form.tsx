"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { TASK_STATUS, TASK_TYPE, PRIORITY, toOptions } from "@/lib/labels";
import type { ActionResult } from "@/lib/action-result";
import { updateTaskAction } from "../actions";

const statusOptions = toOptions(TASK_STATUS);
const typeOptions = toOptions(TASK_TYPE);
const priorityOptions = toOptions(PRIORITY);

export type TaskFormDefaults = {
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  dueAt: string;
  remindAt: string;
  estimatedHours: string;
  billable: boolean;
  leadId: string;
  clientId: string;
  projectId: string;
  opportunityId: string;
  checklist: string;
};

export function TaskDetailForm({
  taskId,
  defaults,
  projects,
  clients,
  leads,
  opportunities,
}: {
  taskId: string;
  defaults: TaskFormDefaults;
  projects: { id: string; name: string }[];
  clients: { id: string; name: string }[];
  leads: { id: string; name: string }[];
  opportunities: { id: string; title: string }[];
}) {
  const boundAction = updateTaskAction.bind(null, taskId);
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(boundAction, undefined);

  useEffect(() => {
    if (state?.ok) toast.success("Tarea guardada");
  }, [state]);

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Título" required error={errors.title?.[0]} className="sm:col-span-2">
          <Input name="title" defaultValue={defaults.title} required minLength={2} />
        </Field>
        <Field label="Descripción" error={errors.description?.[0]} className="sm:col-span-2">
          <Textarea name="description" defaultValue={defaults.description} className="min-h-16" />
        </Field>
        <Field label="Estado" error={errors.status?.[0]}>
          <Select name="status" defaultValue={defaults.status}>
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tipo" error={errors.type?.[0]}>
          <Select name="type" defaultValue={defaults.type}>
            {typeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Prioridad" error={errors.priority?.[0]}>
          <Select name="priority" defaultValue={defaults.priority}>
            {priorityOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Horas estimadas" error={errors.estimatedHours?.[0]}>
          <Input
            name="estimatedHours"
            type="number"
            min={0}
            step="0.25"
            defaultValue={defaults.estimatedHours}
          />
        </Field>
        <Field label="Fecha límite" error={errors.dueAt?.[0]}>
          <Input name="dueAt" type="datetime-local" defaultValue={defaults.dueAt} />
        </Field>
        <Field label="Recordatorio" error={errors.remindAt?.[0]}>
          <Input name="remindAt" type="datetime-local" defaultValue={defaults.remindAt} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Proyecto" error={errors.projectId?.[0]}>
          <Select name="projectId" defaultValue={defaults.projectId}>
            <option value="">Sin proyecto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Cliente" error={errors.clientId?.[0]}>
          <Select name="clientId" defaultValue={defaults.clientId}>
            <option value="">Sin cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Lead" error={errors.leadId?.[0]}>
          <Select name="leadId" defaultValue={defaults.leadId}>
            <option value="">Sin lead</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Oportunidad" error={errors.opportunityId?.[0]}>
          <Select name="opportunityId" defaultValue={defaults.opportunityId}>
            <option value="">Sin oportunidad</option>
            {opportunities.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Checklist (una línea por elemento)"
        error={errors.checklist?.[0]}
      >
        <Textarea
          name="checklist"
          defaultValue={defaults.checklist}
          placeholder={"Diseñar wireframe\nRevisar con cliente\nPublicar"}
          className="min-h-24 font-mono text-xs"
        />
      </Field>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-mist">
        <input
          type="checkbox"
          name="billable"
          defaultChecked={defaults.billable}
          className="h-4 w-4 accent-[#8b5df5]"
        />
        Trabajo facturable
      </label>

      {state && !state.ok ? (
        <p className="rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
