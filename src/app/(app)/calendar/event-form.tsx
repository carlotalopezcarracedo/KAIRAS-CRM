"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import type { ActionResult } from "@/lib/action-result";

const typeOptions = [
  { value: "meeting", label: "Reunión" },
  { value: "call", label: "Llamada" },
  { value: "follow_up", label: "Seguimiento" },
  { value: "delivery", label: "Entrega" },
  { value: "deadline", label: "Deadline" },
  { value: "time_block", label: "Bloque de trabajo" },
  { value: "personal", label: "Personal" },
  { value: "other", label: "Otro" },
];

export type EventFormDefaults = Partial<{
  title: string;
  type: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  description: string;
  location: string;
  leadId: string;
  clientId: string;
  projectId: string;
}>;

export type EventSelectData = {
  leads: { id: string; name: string }[];
  clients: { id: string; name: string }[];
  projects: { id: string; name: string }[];
};

export function EventForm({
  action,
  defaults = {},
  selects,
  submitLabel,
  onSuccess,
}: {
  action: (
    prev: ActionResult | undefined,
    formData: FormData,
  ) => Promise<ActionResult>;
  defaults?: EventFormDefaults;
  selects: EventSelectData;
  submitLabel: string;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Evento guardado");
      onSuccess?.();
    }
  }, [state, onSuccess]);

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Título" required error={errors.title?.[0]}>
        <Input
          name="title"
          defaultValue={defaults.title}
          placeholder="Reunión con Clínica Sonrisa"
          required
          minLength={2}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Tipo" error={errors.type?.[0]}>
          <Select name="type" defaultValue={defaults.type ?? "meeting"}>
            {typeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Lugar / enlace" error={errors.location?.[0]}>
          <Input name="location" defaultValue={defaults.location} placeholder="Meet, oficina…" />
        </Field>
        <Field label="Empieza" required error={errors.startAt?.[0]}>
          <Input
            name="startAt"
            type="datetime-local"
            defaultValue={defaults.startAt}
            required
          />
        </Field>
        <Field label="Termina" error={errors.endAt?.[0]}>
          <Input name="endAt" type="datetime-local" defaultValue={defaults.endAt} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Lead" error={errors.leadId?.[0]}>
          <Select name="leadId" defaultValue={defaults.leadId ?? ""}>
            <option value="">—</option>
            {selects.leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Cliente" error={errors.clientId?.[0]}>
          <Select name="clientId" defaultValue={defaults.clientId ?? ""}>
            <option value="">—</option>
            {selects.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Proyecto" error={errors.projectId?.[0]}>
          <Select name="projectId" defaultValue={defaults.projectId ?? ""}>
            <option value="">—</option>
            {selects.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Notas" error={errors.description?.[0]}>
        <Textarea name="description" defaultValue={defaults.description} className="min-h-16" />
      </Field>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-mist">
        <input
          type="checkbox"
          name="allDay"
          defaultChecked={defaults.allDay}
          className="h-4 w-4 accent-[#8b5df5]"
        />
        Todo el día
      </label>

      {state && !state.ok && !state.fieldErrors ? (
        <p className="text-sm text-danger">{state.error}</p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
