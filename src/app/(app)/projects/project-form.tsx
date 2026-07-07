"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { PROJECT_STATUS, PRIORITY, PROJECT_BILLING, toOptions } from "@/lib/labels";
import type { ActionResult } from "@/lib/action-result";

const statusOptions = toOptions(PROJECT_STATUS);
const priorityOptions = toOptions(PRIORITY);
const billingOptions = toOptions(PROJECT_BILLING);

export type ProjectFormDefaults = Partial<{
  name: string;
  clientId: string;
  mainServiceId: string;
  status: string;
  priority: string;
  billingMode: string;
  startAt: string;
  deadline: string;
  budget: string;
  hourlyRate: string;
  estimatedMargin: string;
  description: string;
  scope: string;
  outOfScope: string;
  deliverables: string;
  nextSteps: string;
}>;

export function ProjectForm({
  action,
  defaults = {},
  clients,
  services,
  submitLabel,
}: {
  action: (
    prev: ActionResult | undefined,
    formData: FormData,
  ) => Promise<ActionResult>;
  defaults?: ProjectFormDefaults;
  clients: { id: string; name: string }[];
  services: { id: string; name: string }[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="max-w-3xl space-y-8">
      <section className="space-y-4">
        <h2 className="k-label">Proyecto</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" required error={errors.name?.[0]} className="sm:col-span-2">
            <Input
              name="name"
              defaultValue={defaults.name}
              placeholder="Web + bot de reservas"
              required
              minLength={2}
            />
          </Field>
          <Field label="Cliente" required error={errors.clientId?.[0]}>
            <Select name="clientId" defaultValue={defaults.clientId ?? ""} required>
              <option value="">Selecciona cliente…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Servicio principal" error={errors.mainServiceId?.[0]}>
            <Select name="mainServiceId" defaultValue={defaults.mainServiceId ?? ""}>
              <option value="">Sin definir</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estado" error={errors.status?.[0]}>
            <Select name="status" defaultValue={defaults.status ?? "not_started"}>
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Prioridad" error={errors.priority?.[0]}>
            <Select name="priority" defaultValue={defaults.priority ?? "medium"}>
              {priorityOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="k-label">Dinero y fechas</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Modo de facturación" error={errors.billingMode?.[0]}>
            <Select name="billingMode" defaultValue={defaults.billingMode ?? "fixed"}>
              {billingOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Precio cerrado / presupuesto (€)" error={errors.budget?.[0]}>
            <Input
              name="budget"
              type="number"
              min={0}
              step="0.01"
              defaultValue={defaults.budget}
              placeholder="2100"
            />
          </Field>
          <Field label="Tarifa de este proyecto (€/h)" error={errors.hourlyRate?.[0]}>
            <Input
              name="hourlyRate"
              type="number"
              min={0}
              step="0.01"
              defaultValue={defaults.hourlyRate}
              placeholder="auto (cliente/global)"
            />
          </Field>
          <Field label="Margen estimado (%)" error={errors.estimatedMargin?.[0]}>
            <Input
              name="estimatedMargin"
              type="number"
              min={0}
              max={100}
              defaultValue={defaults.estimatedMargin}
            />
          </Field>
          <Field label="Inicio" error={errors.startAt?.[0]}>
            <Input name="startAt" type="date" defaultValue={defaults.startAt} />
          </Field>
          <Field label="Deadline" error={errors.deadline?.[0]}>
            <Input name="deadline" type="date" defaultValue={defaults.deadline} />
          </Field>
        </div>
        <p className="text-xs text-faint">
          Cómo cobrar: <strong className="text-mist">Precio cerrado</strong> → pon el
          importe en presupuesto · <strong className="text-mist">Por horas</strong> → pon
          la tarifa €/h (si la dejas vacía se usa la del cliente o la global) ·{" "}
          <strong className="text-mist">Cuota recurrente</strong> → crea además el
          recurrente en el cliente.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="k-label">Alcance</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Descripción" error={errors.description?.[0]} className="sm:col-span-2">
            <Textarea name="description" defaultValue={defaults.description} className="min-h-16" />
          </Field>
          <Field label="Dentro del alcance" error={errors.scope?.[0]}>
            <Textarea
              name="scope"
              defaultValue={defaults.scope}
              placeholder="Qué SÍ incluye"
              className="min-h-24"
            />
          </Field>
          <Field label="Fuera del alcance" error={errors.outOfScope?.[0]}>
            <Textarea
              name="outOfScope"
              defaultValue={defaults.outOfScope}
              placeholder="Qué NO incluye (evita el scope creep)"
              className="min-h-24"
            />
          </Field>
          <Field label="Entregables" error={errors.deliverables?.[0]}>
            <Textarea name="deliverables" defaultValue={defaults.deliverables} className="min-h-16" />
          </Field>
          <Field label="Próximos pasos" error={errors.nextSteps?.[0]}>
            <Textarea name="nextSteps" defaultValue={defaults.nextSteps} className="min-h-16" />
          </Field>
        </div>
      </section>

      {state && !state.ok ? (
        <p className="rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}
