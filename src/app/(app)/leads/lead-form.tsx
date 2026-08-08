"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { DateTimeField } from "@/components/ui/date-time-field";
import { LEAD_STATUS, TEMPERATURE, LEAD_SOURCE, toOptions } from "@/lib/labels";
import type { ActionResult } from "@/lib/action-result";

const statusOptions = toOptions(LEAD_STATUS);
const temperatureOptions = toOptions(TEMPERATURE);
const sourceOptions = toOptions(LEAD_SOURCE);

const consentOptions = [
  { value: "unknown", label: "Sin definir" },
  { value: "legitimate_interest", label: "Interés legítimo (B2B)" },
  { value: "explicit_consent", label: "Consentimiento explícito" },
  { value: "withdrawn", label: "Retirado" },
  { value: "do_not_contact", label: "No contactar" },
];

export type LeadFormDefaults = Partial<{
  name: string;
  contact: string;
  role: string;
  phone: string;
  email: string;
  instagram: string;
  website: string;
  city: string;
  province: string;
  sector: string;
  status: string;
  temperature: string;
  source: string;
  consentStatus: string;
  painDetected: string;
  potentialService: string;
  serviceId: string;
  estimatedBudget: string;
  probability: string;
  objections: string;
  internalNotes: string;
  nextAction: string;
  nextActionAt: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
}>;

export function LeadForm({
  action,
  defaults = {},
  services,
  submitLabel,
}: {
  action: (
    prev: ActionResult | undefined,
    formData: FormData,
  ) => Promise<ActionResult>;
  defaults?: LeadFormDefaults;
  services: { id: string; name: string }[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="max-w-3xl space-y-8">
      {/* Identidad */}
      <section className="space-y-4">
        <h2 className="k-label">Quién es</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre / negocio" required error={errors.name?.[0]}>
            <Input
              name="name"
              defaultValue={defaults.name}
              placeholder="Clínica Dental Sonrisa"
              required
              minLength={2}
            />
          </Field>
          <Field label="Persona de contacto" error={errors.contact?.[0]}>
            <Input name="contact" defaultValue={defaults.contact} placeholder="María García" />
          </Field>
          <Field label="Cargo" error={errors.role?.[0]}>
            <Input name="role" defaultValue={defaults.role} placeholder="Gerente" />
          </Field>
          <Field label="Sector" error={errors.sector?.[0]}>
            <Input name="sector" defaultValue={defaults.sector} placeholder="Clínica dental" />
          </Field>
          <Field label="Teléfono" error={errors.phone?.[0]}>
            <Input name="phone" type="tel" defaultValue={defaults.phone} placeholder="+34 600 000 000" />
          </Field>
          <Field label="Email" error={errors.email?.[0]}>
            <Input name="email" type="email" defaultValue={defaults.email} placeholder="hola@negocio.com" />
          </Field>
          <Field label="Instagram" error={errors.instagram?.[0]}>
            <Input name="instagram" defaultValue={defaults.instagram} placeholder="@negocio" />
          </Field>
          <Field label="Web" error={errors.website?.[0]}>
            <Input name="website" defaultValue={defaults.website} placeholder="https://…" />
          </Field>
          <Field label="Ciudad" error={errors.city?.[0]}>
            <Input name="city" defaultValue={defaults.city} placeholder="Oviedo" />
          </Field>
          <Field label="Provincia" error={errors.province?.[0]}>
            <Input name="province" defaultValue={defaults.province} placeholder="Asturias" />
          </Field>
        </div>
      </section>

      {/* Clasificación */}
      <section className="space-y-4">
        <h2 className="k-label">Clasificación</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Estado" error={errors.status?.[0]}>
            <Select name="status" defaultValue={defaults.status ?? "new"}>
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Temperatura" error={errors.temperature?.[0]}>
            <Select name="temperature" defaultValue={defaults.temperature ?? "cold"}>
              {temperatureOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fuente" error={errors.source?.[0]}>
            <Select name="source" defaultValue={defaults.source ?? "other"}>
              {sourceOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Probabilidad (%)" error={errors.probability?.[0]}>
            <Input
              name="probability"
              type="number"
              min={0}
              max={100}
              defaultValue={defaults.probability}
              placeholder="30"
            />
          </Field>
          <Field label="Presupuesto estimado (€)" error={errors.estimatedBudget?.[0]}>
            <Input
              name="estimatedBudget"
              type="number"
              min={0}
              step="0.01"
              defaultValue={defaults.estimatedBudget}
              placeholder="1500"
            />
          </Field>
          <Field label="Permiso comercial" error={errors.consentStatus?.[0]}>
            <Select name="consentStatus" defaultValue={defaults.consentStatus ?? "unknown"}>
              {consentOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </section>

      {/* Diagnóstico comercial */}
      <section className="space-y-4">
        <h2 className="k-label">Diagnóstico</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Dolor detectado" error={errors.painDetected?.[0]} className="sm:col-span-2">
            <Textarea
              name="painDetected"
              defaultValue={defaults.painDetected}
              placeholder="Pierden citas porque nadie responde el WhatsApp por la tarde…"
            />
          </Field>
          <Field label="Servicio potencial (catálogo)" error={errors.serviceId?.[0]}>
            <Select name="serviceId" defaultValue={defaults.serviceId ?? ""}>
              <option value="">Sin definir</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Servicio potencial (texto libre)" error={errors.potentialService?.[0]}>
            <Input
              name="potentialService"
              defaultValue={defaults.potentialService}
              placeholder="Bot de citas + recordatorios"
            />
          </Field>
          <Field label="Objeciones" error={errors.objections?.[0]} className="sm:col-span-2">
            <Textarea
              name="objections"
              defaultValue={defaults.objections}
              placeholder="Le parece caro, quiere verlo funcionando antes…"
              className="min-h-16"
            />
          </Field>
          <Field label="Notas internas" error={errors.internalNotes?.[0]} className="sm:col-span-2">
            <Textarea
              name="internalNotes"
              defaultValue={defaults.internalNotes}
              className="min-h-16"
            />
          </Field>
        </div>
      </section>

      {/* Seguimiento */}
      <section className="space-y-4">
        <h2 className="k-label">Siguiente acción</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Qué toca hacer" error={errors.nextAction?.[0]}>
            <Input
              name="nextAction"
              defaultValue={defaults.nextAction}
              placeholder="Enviar audio recordando la demo"
            />
          </Field>
          <Field label="Cuándo" error={errors.nextActionAt?.[0]}>
            <DateTimeField
              name="nextActionAt"
              defaultValue={defaults.nextActionAt}
            />
          </Field>
        </div>
      </section>

      {/* Atribución */}
      <details className="group rounded-card border border-line bg-surface/50 p-4">
        <summary className="k-label cursor-pointer select-none list-none">
          Atribución / UTM (opcional) ▾
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="UTM source" error={errors.utmSource?.[0]}>
            <Input name="utmSource" defaultValue={defaults.utmSource} />
          </Field>
          <Field label="UTM medium" error={errors.utmMedium?.[0]}>
            <Input name="utmMedium" defaultValue={defaults.utmMedium} />
          </Field>
          <Field label="UTM campaign" error={errors.utmCampaign?.[0]}>
            <Input name="utmCampaign" defaultValue={defaults.utmCampaign} />
          </Field>
          <Field label="UTM content" error={errors.utmContent?.[0]}>
            <Input name="utmContent" defaultValue={defaults.utmContent} />
          </Field>
        </div>
      </details>

      {state && !state.ok ? (
        <p className="rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
