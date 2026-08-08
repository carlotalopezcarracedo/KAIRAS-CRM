"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { DateTimeField } from "@/components/ui/date-time-field";
import { PROPOSAL_STATUS, toOptions } from "@/lib/labels";
import { formatMoney } from "@/lib/utils";
import type { ActionResult } from "@/lib/action-result";

const statusOptions = toOptions(PROPOSAL_STATUS);

export type ProposalFormDefaults = Partial<{
  title: string;
  status: string;
  leadId: string;
  clientId: string;
  opportunityId: string;
  amountNet: string;
  vatRate: string;
  sentAt: string;
  validUntil: string;
  documentUrl: string;
  conditions: string;
  rejectedReason: string;
  notes: string;
}>;

type Option = { id: string; name: string };

export function ProposalForm({
  action,
  defaults = {},
  leads,
  clients,
  opportunities,
  submitLabel,
}: {
  action: (
    prev: ActionResult | undefined,
    formData: FormData,
  ) => Promise<ActionResult>;
  defaults?: ProposalFormDefaults;
  leads: Option[];
  clients: Option[];
  opportunities: Option[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  // El bruto se calcula en el servidor, pero mostrarlo mientras se escribe
  // evita el clásico "creía que había puesto el IVA".
  const [net, setNet] = useState(defaults.amountNet ?? "");
  const [vat, setVat] = useState(defaults.vatRate ?? "21");
  const [status, setStatus] = useState(defaults.status ?? "draft");

  const netNumber = Number(net);
  const vatNumber = Number(vat);
  const gross =
    net !== "" && !Number.isNaN(netNumber) && !Number.isNaN(vatNumber)
      ? netNumber * (1 + vatNumber / 100)
      : null;

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Título" required error={errors.title?.[0]} className="sm:col-span-2">
          <Input
            name="title"
            defaultValue={defaults.title}
            required
            minLength={2}
            placeholder="Ej. Web corporativa + mantenimiento"
          />
        </Field>

        <Field label="Estado" error={errors.status?.[0]}>
          <Select name="status" value={status} onChange={(e) => setStatus(e.target.value)}>
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Oportunidad" error={errors.opportunityId?.[0]}>
          <Select name="opportunityId" defaultValue={defaults.opportunityId ?? ""}>
            <option value="">— sin vincular —</option>
            {opportunities.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Cliente" error={errors.clientId?.[0]}>
          <Select name="clientId" defaultValue={defaults.clientId ?? ""}>
            <option value="">— ninguno —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Lead" error={errors.leadId?.[0]}>
          <Select name="leadId" defaultValue={defaults.leadId ?? ""}>
            <option value="">— ninguno —</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <p className="text-xs text-faint">
        Vincula la propuesta a un <strong className="text-mist">lead</strong> si
        aún no es cliente, o a un <strong className="text-mist">cliente</strong>{" "}
        si ya lo es. No hace falta rellenar los dos.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Importe neto (€)" error={errors.amountNet?.[0]}>
          <Input
            name="amountNet"
            type="number"
            min={0}
            step="0.01"
            value={net}
            onChange={(e) => setNet(e.target.value)}
          />
        </Field>
        <Field label="IVA (%)" error={errors.vatRate?.[0]}>
          <Input
            name="vatRate"
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={vat}
            onChange={(e) => setVat(e.target.value)}
          />
        </Field>
        <div className="space-y-1.5">
          <span className="k-label block">Total con IVA</span>
          <p className="flex h-10 items-center text-sm font-semibold text-foam">
            {gross !== null ? formatMoney(gross) : "—"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fecha de envío" error={errors.sentAt?.[0]}>
          <DateTimeField withTime={false} name="sentAt" defaultValue={defaults.sentAt} />
        </Field>
        <Field label="Válida hasta" error={errors.validUntil?.[0]}>
          <DateTimeField withTime={false} name="validUntil" defaultValue={defaults.validUntil} />
        </Field>
        <Field label="Enlace al documento" error={errors.documentUrl?.[0]} className="sm:col-span-2">
          <Input
            name="documentUrl"
            type="url"
            defaultValue={defaults.documentUrl}
            placeholder="https://…"
          />
        </Field>
      </div>

      <Field label="Condiciones" error={errors.conditions?.[0]}>
        <Textarea
          name="conditions"
          defaultValue={defaults.conditions}
          className="min-h-16"
          placeholder="Forma de pago, plazos, alcance…"
        />
      </Field>

      {status === "rejected" ? (
        <Field label="Motivo del rechazo" required error={errors.rejectedReason?.[0]}>
          <Textarea
            name="rejectedReason"
            defaultValue={defaults.rejectedReason}
            className="min-h-16"
            placeholder="Precio, plazos, se fue con otra…"
          />
        </Field>
      ) : (
        <input type="hidden" name="rejectedReason" value={defaults.rejectedReason ?? ""} />
      )}

      <Field label="Notas internas" error={errors.notes?.[0]}>
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
