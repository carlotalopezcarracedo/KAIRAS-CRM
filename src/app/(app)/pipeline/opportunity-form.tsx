"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { DateTimeField } from "@/components/ui/date-time-field";
import { OPPORTUNITY_STAGE, PRIORITY, toOptions } from "@/lib/labels";
import type { ActionResult } from "@/lib/action-result";

const stageOptions = toOptions(OPPORTUNITY_STAGE);
const priorityOptions = toOptions(PRIORITY);

export type OpportunityFormDefaults = Partial<{
  title: string;
  leadId: string;
  clientId: string;
  serviceId: string;
  stage: string;
  estimatedValue: string;
  probability: string;
  expectedCloseAt: string;
  priority: string;
  urgencyLevel: string;
  kairasFit: string;
  costOfInaction: string;
  nextAction: string;
  nextActionAt: string;
  observations: string;
}>;

export function OpportunityForm({
  action,
  defaults = {},
  leads,
  clients,
  services,
  submitLabel,
}: {
  action: (
    prev: ActionResult | undefined,
    formData: FormData,
  ) => Promise<ActionResult>;
  defaults?: OpportunityFormDefaults;
  leads: { id: string; name: string }[];
  clients: { id: string; name: string }[];
  services: { id: string; name: string }[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="max-w-3xl space-y-8">
      <section className="space-y-4">
        <h2 className="k-label">Qué es</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Título" required error={errors.title?.[0]} className="sm:col-span-2">
            <Input
              name="title"
              defaultValue={defaults.title}
              placeholder="Bot de citas para Clínica Sonrisa"
              required
              minLength={2}
            />
          </Field>
          <Field label="Lead asociado" error={errors.leadId?.[0]}>
            <Select name="leadId" defaultValue={defaults.leadId ?? ""}>
              <option value="">Sin lead</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cliente asociado" error={errors.clientId?.[0]}>
            <Select name="clientId" defaultValue={defaults.clientId ?? ""}>
              <option value="">Sin cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Servicio" error={errors.serviceId?.[0]}>
            <Select name="serviceId" defaultValue={defaults.serviceId ?? ""}>
              <option value="">Sin definir</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Etapa" error={errors.stage?.[0]}>
            <Select name="stage" defaultValue={defaults.stage ?? "discovered"}>
              {stageOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="k-label">Dinero y cierre</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Valor estimado (€)" error={errors.estimatedValue?.[0]}>
            <Input
              name="estimatedValue"
              type="number"
              min={0}
              step="0.01"
              defaultValue={defaults.estimatedValue}
              placeholder="1500"
            />
          </Field>
          <Field label="Probabilidad (%)" error={errors.probability?.[0]}>
            <Input
              name="probability"
              type="number"
              min={0}
              max={100}
              defaultValue={defaults.probability ?? "30"}
            />
          </Field>
          <Field label="Cierre previsto" error={errors.expectedCloseAt?.[0]}>
            <DateTimeField withTime={false}
              name="expectedCloseAt"
             
              defaultValue={defaults.expectedCloseAt}
            />
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
          <Field label="Urgencia (1-5)" error={errors.urgencyLevel?.[0]}>
            <Input
              name="urgencyLevel"
              type="number"
              min={1}
              max={5}
              defaultValue={defaults.urgencyLevel}
            />
          </Field>
          <Field label="Encaje KAIRAS (1-5)" error={errors.kairasFit?.[0]}>
            <Input
              name="kairasFit"
              type="number"
              min={1}
              max={5}
              defaultValue={defaults.kairasFit}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="k-label">Seguimiento</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Siguiente acción" error={errors.nextAction?.[0]}>
            <Input
              name="nextAction"
              defaultValue={defaults.nextAction}
              placeholder="Preparar demo para la reunión"
            />
          </Field>
          <Field label="Cuándo" error={errors.nextActionAt?.[0]}>
            <DateTimeField
              name="nextActionAt"
              defaultValue={defaults.nextActionAt}
            />
          </Field>
          <Field
            label="Coste de no resolver"
            error={errors.costOfInaction?.[0]}
            className="sm:col-span-2"
          >
            <Input
              name="costOfInaction"
              defaultValue={defaults.costOfInaction}
              placeholder="Sigue perdiendo ~10 citas/mes"
            />
          </Field>
          <Field
            label="Observaciones"
            error={errors.observations?.[0]}
            className="sm:col-span-2"
          >
            <Textarea name="observations" defaultValue={defaults.observations} />
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
