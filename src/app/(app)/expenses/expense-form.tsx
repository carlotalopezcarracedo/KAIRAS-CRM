"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { EXPENSE_KIND, toOptions } from "@/lib/labels";
import { formatMoney } from "@/lib/utils";
import type { ActionResult } from "@/lib/action-result";

const kindOptions = toOptions(EXPENSE_KIND);

export type ExpenseFormDefaults = Partial<{
  kind: string;
  description: string;
  expenseAt: string;
  originPlace: string;
  destinationPlace: string;
  kilometers: string;
  ratePerKm: string;
  roundTrip: boolean;
  perDiemDays: string;
  overnight: boolean;
  amountNet: string;
  vatAmount: string;
  supplier: string;
  receiptUrl: string;
  notes: string;
  billable: boolean;
  clientId: string;
  projectId: string;
}>;

export type ExpenseRates = {
  ratePerKm: number;
  perDiemDay: number;
  perDiemOvernight: number;
};

type Option = { id: string; name: string };

export function ExpenseForm({
  action,
  defaults = {},
  rates,
  clients,
  projects,
  submitLabel,
}: {
  action: (
    prev: ActionResult | undefined,
    formData: FormData,
  ) => Promise<ActionResult>;
  defaults?: ExpenseFormDefaults;
  rates: ExpenseRates;
  clients: Option[];
  projects: Option[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  const [kind, setKind] = useState(defaults.kind ?? "mileage");
  const [km, setKm] = useState(defaults.kilometers ?? "");
  const [rate, setRate] = useState(defaults.ratePerKm ?? String(rates.ratePerKm));
  const [roundTrip, setRoundTrip] = useState(defaults.roundTrip ?? false);
  const [days, setDays] = useState(defaults.perDiemDays ?? "");
  const [overnight, setOvernight] = useState(defaults.overnight ?? false);
  const [net, setNet] = useState(defaults.amountNet ?? "");
  const [vat, setVat] = useState(defaults.vatAmount ?? "");

  // Espejo del cálculo del servidor. El servidor manda; esto solo evita
  // guardar a ciegas sin ver el importe que va a salir.
  let preview: number | null = null;
  let previewHint = "";
  if (kind === "mileage") {
    const kmNumber = Number(km);
    const rateNumber = Number(rate);
    if (km !== "" && !Number.isNaN(kmNumber) && !Number.isNaN(rateNumber)) {
      const effective = kmNumber * (roundTrip ? 2 : 1);
      preview = effective * rateNumber;
      previewHint = `${effective} km × ${rateNumber} €/km${roundTrip ? " (ida y vuelta)" : ""}`;
    }
  } else if (kind === "per_diem") {
    const daysNumber = Number(days);
    const perDay = overnight ? rates.perDiemOvernight : rates.perDiemDay;
    if (days !== "" && !Number.isNaN(daysNumber)) {
      preview = daysNumber * perDay;
      previewHint = `${daysNumber} día(s) × ${perDay} €${overnight ? " con pernocta" : " sin pernocta"}`;
    }
  } else {
    const netNumber = Number(net || 0);
    const vatNumber = Number(vat || 0);
    if (!Number.isNaN(netNumber) && !Number.isNaN(vatNumber)) {
      preview = netNumber + vatNumber;
      previewHint = "base + IVA del ticket";
    }
  }

  const isMileage = kind === "mileage";
  const isPerDiem = kind === "per_diem";
  const isManualAmount = !isMileage && !isPerDiem;

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo de gasto" error={errors.kind?.[0]}>
          <Select name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            {kindOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fecha" required error={errors.expenseAt?.[0]}>
          <Input name="expenseAt" type="date" defaultValue={defaults.expenseAt} required />
        </Field>
        <Field
          label="Descripción"
          required
          error={errors.description?.[0]}
          className="sm:col-span-2"
        >
          <Input
            name="description"
            defaultValue={defaults.description}
            required
            minLength={2}
            placeholder={isMileage ? "Ej. Visita a cliente" : "Ej. Repostaje A-6"}
          />
        </Field>
      </div>

      {isMileage ? (
        <div className="rounded-card border border-line bg-surface p-4">
          <p className="k-label mb-3">Trayecto</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Origen" required error={errors.originPlace?.[0]}>
              <Input
                name="originPlace"
                defaultValue={defaults.originPlace}
                placeholder="A Coruña"
              />
            </Field>
            <Field label="Destino" required error={errors.destinationPlace?.[0]}>
              <Input
                name="destinationPlace"
                defaultValue={defaults.destinationPlace}
                placeholder="Santiago"
              />
            </Field>
            <Field label="Kilómetros" required error={errors.kilometers?.[0]}>
              <Input
                name="kilometers"
                type="number"
                min={0}
                step="0.01"
                value={km}
                onChange={(e) => setKm(e.target.value)}
              />
            </Field>
            <Field label="€/km" error={errors.ratePerKm?.[0]}>
              <Input
                name="ratePerKm"
                type="number"
                min={0}
                step="0.001"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </Field>
          </div>
          <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm text-mist">
            <input
              type="checkbox"
              name="roundTrip"
              checked={roundTrip}
              onChange={(e) => setRoundTrip(e.target.checked)}
              className="h-4 w-4 accent-[#8b5df5]"
            />
            Ida y vuelta (duplica los kilómetros)
          </label>
          <p className="mt-3 text-xs text-faint">
            La tarifa por defecto ({rates.ratePerKm} €/km) es el máximo exento de
            IRPF. Se cambia en Ajustes y aquí puedes ajustarla para este viaje.
          </p>
        </div>
      ) : null}

      {isPerDiem ? (
        <div className="rounded-card border border-line bg-surface p-4">
          <p className="k-label mb-3">Dieta</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Días" required error={errors.perDiemDays?.[0]}>
              <Input
                name="perDiemDays"
                type="number"
                min={1}
                step="1"
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
            </Field>
          </div>
          <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm text-mist">
            <input
              type="checkbox"
              name="overnight"
              checked={overnight}
              onChange={(e) => setOvernight(e.target.checked)}
              className="h-4 w-4 accent-[#8b5df5]"
            />
            Con pernocta
          </label>
          <p className="mt-3 text-xs text-faint">
            {rates.perDiemDay} € por día sin pernocta · {rates.perDiemOvernight} €
            con pernocta. Son los topes exentos de IRPF para dietas nacionales.
          </p>
        </div>
      ) : null}

      {isManualAmount ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Base imponible (€)" required error={errors.amountNet?.[0]}>
            <Input
              name="amountNet"
              type="number"
              min={0}
              step="0.01"
              value={net}
              onChange={(e) => setNet(e.target.value)}
            />
          </Field>
          <Field label="IVA (€)" error={errors.vatAmount?.[0]}>
            <Input
              name="vatAmount"
              type="number"
              min={0}
              step="0.01"
              value={vat}
              onChange={(e) => setVat(e.target.value)}
            />
          </Field>
          <Field label="Proveedor" error={errors.supplier?.[0]}>
            <Input name="supplier" defaultValue={defaults.supplier} placeholder="Repsol" />
          </Field>
        </div>
      ) : null}

      <div className="rounded-card border border-violet-line bg-violet-soft px-4 py-3">
        <p className="k-label text-lavender">Importe total</p>
        <p className="mt-1 text-2xl font-extrabold text-lavender">
          {preview !== null ? formatMoney(preview) : "—"}
        </p>
        {previewHint ? <p className="mt-1 text-xs text-mist">{previewHint}</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
        <Field label="Proyecto" error={errors.projectId?.[0]}>
          <Select name="projectId" defaultValue={defaults.projectId ?? ""}>
            <option value="">— ninguno —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Enlace al ticket" error={errors.receiptUrl?.[0]} className="sm:col-span-2">
          <Input
            name="receiptUrl"
            type="url"
            defaultValue={defaults.receiptUrl}
            placeholder="https://…"
          />
        </Field>
      </div>

      <Field label="Notas" error={errors.notes?.[0]}>
        <Textarea name="notes" defaultValue={defaults.notes} className="min-h-16" />
      </Field>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-mist">
        <input
          type="checkbox"
          name="billable"
          defaultChecked={defaults.billable}
          className="h-4 w-4 accent-[#8b5df5]"
        />
        Repercutible al cliente
      </label>
      <p className="-mt-3 text-xs text-faint">
        Se guarda para tenerlo controlado, pero todavía no entra
        automáticamente en las solicitudes de factura.
      </p>

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
