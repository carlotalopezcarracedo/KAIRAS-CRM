"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { CLIENT_STATUS, toOptions } from "@/lib/labels";
import type { ActionResult } from "@/lib/action-result";

const statusOptions = toOptions(CLIENT_STATUS);

export type ClientFormDefaults = Partial<{
  name: string;
  status: string;
  vatId: string;
  billingEmail: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  odooPartnerId: string;
  satisfaction: string;
  notes: string;
}>;

export function ClientForm({
  action,
  defaults = {},
  submitLabel,
}: {
  action: (
    prev: ActionResult | undefined,
    formData: FormData,
  ) => Promise<ActionResult>;
  defaults?: ClientFormDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="max-w-3xl space-y-8">
      <section className="space-y-4">
        <h2 className="k-label">Datos básicos</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" required error={errors.name?.[0]}>
            <Input name="name" defaultValue={defaults.name} required minLength={2} />
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
          <Field label="Teléfono" error={errors.phone?.[0]}>
            <Input name="phone" type="tel" defaultValue={defaults.phone} />
          </Field>
          <Field label="Email de facturación" error={errors.billingEmail?.[0]}>
            <Input name="billingEmail" type="email" defaultValue={defaults.billingEmail} />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="k-label">Datos fiscales</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="CIF / NIF" error={errors.vatId?.[0]}>
            <Input name="vatId" defaultValue={defaults.vatId} />
          </Field>
          <Field label="ID contacto Odoo" error={errors.odooPartnerId?.[0]}>
            <Input
              name="odooPartnerId"
              defaultValue={defaults.odooPartnerId}
              placeholder="Se rellena al sincronizar"
            />
          </Field>
          <Field label="Dirección" error={errors.address?.[0]} className="sm:col-span-2">
            <Input name="address" defaultValue={defaults.address} />
          </Field>
          <Field label="Ciudad" error={errors.city?.[0]}>
            <Input name="city" defaultValue={defaults.city} />
          </Field>
          <Field label="Provincia" error={errors.province?.[0]}>
            <Input name="province" defaultValue={defaults.province} />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="k-label">Relación</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Satisfacción (1-5)" error={errors.satisfaction?.[0]}>
            <Input
              name="satisfaction"
              type="number"
              min={1}
              max={5}
              defaultValue={defaults.satisfaction}
            />
          </Field>
          <Field label="Notas internas" error={errors.notes?.[0]} className="sm:col-span-2">
            <Textarea name="notes" defaultValue={defaults.notes} />
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
