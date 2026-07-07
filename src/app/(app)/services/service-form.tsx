"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SERVICE_CATEGORY, toOptions } from "@/lib/labels";
import type { ActionResult } from "@/lib/action-result";

const categoryOptions = toOptions(SERVICE_CATEGORY);
const unitOptions = [
  { value: "project", label: "Por proyecto" },
  { value: "hour", label: "Por hora" },
  { value: "month", label: "Por mes" },
  { value: "piece", label: "Por pieza" },
  { value: "other", label: "Otro" },
];

export type ServiceFormDefaults = Partial<{
  name: string;
  category: string;
  description: string;
  basePrice: string;
  priceMin: string;
  priceMax: string;
  vatRate: string;
  billingUnit: string;
  hourlyRate: string;
  canBeRecurring: boolean;
  deliverables: string;
  odooProductRef: string;
  active: boolean;
}>;

export function ServiceForm({
  action,
  defaults = {},
  submitLabel,
}: {
  action: (
    prev: ActionResult | undefined,
    formData: FormData,
  ) => Promise<ActionResult>;
  defaults?: ServiceFormDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre comercial" required error={errors.name?.[0]}>
          <Input name="name" defaultValue={defaults.name} required minLength={2} />
        </Field>
        <Field label="Categoría" error={errors.category?.[0]}>
          <Select name="category" defaultValue={defaults.category ?? "other"}>
            {categoryOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Descripción interna" error={errors.description?.[0]} className="sm:col-span-2">
          <Textarea name="description" defaultValue={defaults.description} className="min-h-16" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Precio base (€)" error={errors.basePrice?.[0]}>
          <Input name="basePrice" type="number" min={0} step="0.01" defaultValue={defaults.basePrice} />
        </Field>
        <Field label="Precio mín. (€)" error={errors.priceMin?.[0]}>
          <Input name="priceMin" type="number" min={0} step="0.01" defaultValue={defaults.priceMin} />
        </Field>
        <Field label="Precio máx. (€)" error={errors.priceMax?.[0]}>
          <Input name="priceMax" type="number" min={0} step="0.01" defaultValue={defaults.priceMax} />
        </Field>
        <Field label="IVA (%)" error={errors.vatRate?.[0]}>
          <Input name="vatRate" type="number" min={0} max={100} defaultValue={defaults.vatRate ?? "21"} />
        </Field>
        <Field label="Unidad de facturación" error={errors.billingUnit?.[0]}>
          <Select name="billingUnit" defaultValue={defaults.billingUnit ?? "project"}>
            {unitOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tarifa (€/h)" error={errors.hourlyRate?.[0]}>
          <Input
            name="hourlyRate"
            type="number"
            min={0}
            step="0.01"
            defaultValue={defaults.hourlyRate}
            placeholder="para trabajo por horas"
          />
        </Field>
        <Field label="Ref. producto Odoo" error={errors.odooProductRef?.[0]}>
          <Input name="odooProductRef" defaultValue={defaults.odooProductRef} />
        </Field>
      </div>
      <p className="text-xs text-faint">
        Cómo cobrar este servicio: <strong className="text-mist">por proyecto</strong> →
        precio base · <strong className="text-mist">por mes</strong> → márcalo
        recurrente y crea la cuota en cada cliente ·{" "}
        <strong className="text-mist">por horas</strong> → unidad «Por hora» + tarifa €/h.
      </p>

      <Field label="Entregables típicos" error={errors.deliverables?.[0]}>
        <Textarea name="deliverables" defaultValue={defaults.deliverables} className="min-h-16" />
      </Field>

      <div className="flex flex-wrap gap-5">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-mist">
          <input
            type="checkbox"
            name="canBeRecurring"
            defaultChecked={defaults.canBeRecurring}
            className="h-4 w-4 accent-[#8b5df5]"
          />
          Puede ser recurrente
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-mist">
          <input
            type="checkbox"
            name="active"
            defaultChecked={defaults.active ?? true}
            className="h-4 w-4 accent-[#8b5df5]"
          />
          Activo en catálogo
        </label>
      </div>

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
