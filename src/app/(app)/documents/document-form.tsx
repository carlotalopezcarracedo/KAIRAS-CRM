"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ADMIN_DOC_CATEGORY, toOptions } from "@/lib/labels";
import type { ActionResult } from "@/lib/action-result";

const categoryOptions = toOptions(ADMIN_DOC_CATEGORY);

/** Categorías donde la caducidad es lo importante. */
const EXPIRING_CATEGORIES = ["certificado_digital", "seguro", "contrato", "licencia"];
/** Categorías periódicas: piden ejercicio y trimestre. */
const PERIODIC_CATEGORIES = [
  "irpf_trimestral",
  "iva_trimestral",
  "iva_anual",
  "retenciones",
  "resumen_anual",
  "renta",
  "reta",
];

export type DocumentFormDefaults = Partial<{
  title: string;
  category: string;
  fiscalYear: string;
  fiscalPeriod: string;
  issuer: string;
  reference: string;
  amount: string;
  issuedAt: string;
  validUntil: string;
  notes: string;
}>;

export function DocumentForm({
  action,
  defaults = {},
  submitLabel,
}: {
  action: (
    prev: ActionResult | undefined,
    formData: FormData,
  ) => Promise<ActionResult>;
  defaults?: DocumentFormDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const [category, setCategory] = useState(defaults.category ?? "otro");

  const periodic = PERIODIC_CATEGORIES.includes(category);
  const expiring = EXPIRING_CATEGORIES.includes(category);

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Título" required error={errors.title?.[0]} className="sm:col-span-2">
          <Input
            name="title"
            defaultValue={defaults.title}
            required
            minLength={2}
            placeholder="Ej. Modelo 303 · 2T 2026"
          />
        </Field>
        <Field label="Categoría" error={errors.category?.[0]}>
          <Select
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categoryOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Emisor" error={errors.issuer?.[0]}>
          <Input
            name="issuer"
            defaultValue={defaults.issuer}
            placeholder="AEAT, Seguridad Social…"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Ejercicio" error={errors.fiscalYear?.[0]}>
          <Input
            name="fiscalYear"
            type="number"
            min={1990}
            max={2100}
            step="1"
            defaultValue={defaults.fiscalYear}
            placeholder={String(new Date().getFullYear())}
          />
        </Field>
        <Field label="Periodo" error={errors.fiscalPeriod?.[0]}>
          <Select name="fiscalPeriod" defaultValue={defaults.fiscalPeriod ?? ""}>
            <option value="">— sin periodo —</option>
            <option value="1T">1T</option>
            <option value="2T">2T</option>
            <option value="3T">3T</option>
            <option value="4T">4T</option>
            <option value="anual">Anual</option>
          </Select>
        </Field>
        <Field label="Importe (€)" error={errors.amount?.[0]}>
          <Input
            name="amount"
            type="number"
            min={0}
            step="0.01"
            defaultValue={defaults.amount}
          />
        </Field>
      </div>
      {periodic ? (
        <p className="-mt-3 text-xs text-faint">
          Rellenar ejercicio y periodo te deja luego filtrar por año y ver de un
          vistazo si falta algún trimestre.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fecha de emisión" error={errors.issuedAt?.[0]}>
          <Input name="issuedAt" type="date" defaultValue={defaults.issuedAt} />
        </Field>
        <Field label="Caduca el" error={errors.validUntil?.[0]}>
          <Input name="validUntil" type="date" defaultValue={defaults.validUntil} />
        </Field>
        <Field label="Referencia" error={errors.reference?.[0]} className="sm:col-span-2">
          <Input
            name="reference"
            defaultValue={defaults.reference}
            placeholder="Nº de justificante o de póliza"
          />
        </Field>
      </div>
      {expiring ? (
        <p className="-mt-3 text-xs text-warn">
          Pon la caducidad: KAIRAS te avisará 60 días antes en el listado de
          documentos.
        </p>
      ) : null}

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
