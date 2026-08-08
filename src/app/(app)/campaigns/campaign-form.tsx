"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { DateTimeField } from "@/components/ui/date-time-field";
import { CAMPAIGN_CHANNEL, CAMPAIGN_STATUS, toOptions } from "@/lib/labels";
import type { ActionResult } from "@/lib/action-result";

const channelOptions = toOptions(CAMPAIGN_CHANNEL);
const statusOptions = toOptions(CAMPAIGN_STATUS);

export type CampaignFormDefaults = Partial<{
  name: string;
  channel: string;
  status: string;
  objective: string;
  startAt: string;
  endAt: string;
  budget: string;
  spent: string;
  manualCostPerLead: string;
  promotedService: string;
  url: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  notes: string;
}>;

export function CampaignForm({
  action,
  defaults = {},
  submitLabel,
}: {
  action: (
    prev: ActionResult | undefined,
    formData: FormData,
  ) => Promise<ActionResult>;
  defaults?: CampaignFormDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" required error={errors.name?.[0]} className="sm:col-span-2">
          <Input
            name="name"
            defaultValue={defaults.name}
            required
            minLength={2}
            placeholder="Ej. Meta Ads — clínicas Q3"
          />
        </Field>
        <Field label="Canal" error={errors.channel?.[0]}>
          <Select name="channel" defaultValue={defaults.channel ?? "other"}>
            {channelOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Estado" error={errors.status?.[0]}>
          <Select name="status" defaultValue={defaults.status ?? "draft"}>
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Objetivo" error={errors.objective?.[0]} className="sm:col-span-2">
          <Input
            name="objective"
            defaultValue={defaults.objective}
            placeholder="Ej. 20 leads cualificados al mes"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Inicio" error={errors.startAt?.[0]}>
          <DateTimeField withTime={false} name="startAt" defaultValue={defaults.startAt} />
        </Field>
        <Field label="Fin" error={errors.endAt?.[0]}>
          <DateTimeField withTime={false} name="endAt" defaultValue={defaults.endAt} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Presupuesto (€)" error={errors.budget?.[0]}>
          <Input name="budget" type="number" min={0} step="0.01" defaultValue={defaults.budget} />
        </Field>
        <Field label="Gastado (€)" error={errors.spent?.[0]}>
          <Input name="spent" type="number" min={0} step="0.01" defaultValue={defaults.spent} />
        </Field>
        <Field label="Coste/lead manual (€)" error={errors.manualCostPerLead?.[0]}>
          <Input
            name="manualCostPerLead"
            type="number"
            min={0}
            step="0.01"
            defaultValue={defaults.manualCostPerLead}
          />
        </Field>
      </div>
      <p className="text-xs text-faint">
        El <strong className="text-mist">coste por lead</strong> se calcula solo
        (gastado ÷ leads de la campaña). El valor manual solo se usa cuando no
        hay gasto registrado, por ejemplo en recomendaciones.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Servicio promocionado" error={errors.promotedService?.[0]}>
          <Input name="promotedService" defaultValue={defaults.promotedService} />
        </Field>
        <Field label="URL de destino" error={errors.url?.[0]}>
          <Input
            name="url"
            type="url"
            defaultValue={defaults.url}
            placeholder="https://…"
          />
        </Field>
      </div>

      <div>
        <p className="k-label mb-3">Parámetros UTM</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="utm_source" error={errors.utmSource?.[0]}>
            <Input name="utmSource" defaultValue={defaults.utmSource} placeholder="instagram" />
          </Field>
          <Field label="utm_medium" error={errors.utmMedium?.[0]}>
            <Input name="utmMedium" defaultValue={defaults.utmMedium} placeholder="cpc" />
          </Field>
          <Field label="utm_campaign" error={errors.utmCampaign?.[0]}>
            <Input name="utmCampaign" defaultValue={defaults.utmCampaign} />
          </Field>
          <Field label="utm_content" error={errors.utmContent?.[0]}>
            <Input name="utmContent" defaultValue={defaults.utmContent} />
          </Field>
        </div>
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
