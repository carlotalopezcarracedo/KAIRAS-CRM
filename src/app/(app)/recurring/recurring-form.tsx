"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { DateTimeField } from "@/components/ui/date-time-field";
import { RECURRING_STATUS, toOptions } from "@/lib/labels";
import type { ActionResult } from "@/lib/action-result";

const statusOptions = toOptions(RECURRING_STATUS);
const periodicityOptions = [
  { value: "monthly", label: "Mensual" },
  { value: "quarterly", label: "Trimestral" },
  { value: "yearly", label: "Anual" },
  { value: "weekly", label: "Semanal" },
  { value: "custom", label: "Personalizada" },
];

export type RecurringFormDefaults = Partial<{
  clientId: string;
  serviceId: string;
  title: string;
  amount: string;
  periodicity: string;
  status: string;
  startedAt: string;
  endsAt: string;
  billingDay: string;
  nextInvoiceAt: string;
  paymentMethod: string;
  estimatedMargin: string;
  notes: string;
}>;

export function RecurringForm({
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
  defaults?: RecurringFormDefaults;
  clients: { id: string; name: string }[];
  services: { id: string; name: string }[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cliente" required error={errors.clientId?.[0]}>
          <Select name="clientId" defaultValue={defaults.clientId ?? ""} required>
            <option value="">Selecciona…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Servicio" required error={errors.serviceId?.[0]}>
          <Select name="serviceId" defaultValue={defaults.serviceId ?? ""} required>
            <option value="">Selecciona…</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Título (opcional)" error={errors.title?.[0]} className="sm:col-span-2">
          <Input
            name="title"
            defaultValue={defaults.title}
            placeholder="Gestión RRSS — plan mensual"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Importe por ciclo (€)" required error={errors.amount?.[0]}>
          <Input
            name="amount"
            type="number"
            min={0}
            step="0.01"
            defaultValue={defaults.amount}
            required
          />
        </Field>
        <Field label="Periodicidad" error={errors.periodicity?.[0]}>
          <Select name="periodicity" defaultValue={defaults.periodicity ?? "monthly"}>
            {periodicityOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Estado" error={errors.status?.[0]}>
          <Select name="status" defaultValue={defaults.status ?? "active"}>
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Inicio" required error={errors.startedAt?.[0]}>
          <DateTimeField withTime={false} name="startedAt" defaultValue={defaults.startedAt} required />
        </Field>
        <Field label="Fin (si existe)" error={errors.endsAt?.[0]}>
          <DateTimeField withTime={false} name="endsAt" defaultValue={defaults.endsAt} />
        </Field>
        <Field label="Día de facturación" error={errors.billingDay?.[0]}>
          <Input
            name="billingDay"
            type="number"
            min={1}
            max={28}
            defaultValue={defaults.billingDay ?? "1"}
          />
        </Field>
        <Field label="Próximo ciclo" error={errors.nextInvoiceAt?.[0]}>
          <DateTimeField withTime={false} name="nextInvoiceAt" defaultValue={defaults.nextInvoiceAt} />
        </Field>
        <Field label="Método de cobro" error={errors.paymentMethod?.[0]}>
          <Input
            name="paymentMethod"
            defaultValue={defaults.paymentMethod}
            placeholder="Transferencia, domiciliación…"
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
      </div>

      <Field label="Notas" error={errors.notes?.[0]}>
        <Textarea name="notes" defaultValue={defaults.notes} className="min-h-16" />
      </Field>

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
