"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import {
  NOTIFICATION_OFFSET_OPTIONS,
  NOTIFICATION_PRIORITIES,
  PRIORITY_LABELS,
  offsetLabel,
} from "@/lib/notification-options";
import type { ActionResult } from "@/lib/action-result";
import type {
  CompanyProfile,
  AppDefaults,
  ExpenseDefaults,
  NotificationDefaults,
} from "@/server/services/settings-service";
import {
  saveCompanyProfileAction,
  saveAppDefaultsAction,
  saveExpenseDefaultsAction,
  saveNotificationDefaultsAction,
  changePasswordAction,
} from "./actions";

export function CompanyProfileForm({ profile }: { profile: CompanyProfile }) {
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(saveCompanyProfileAction, undefined);

  useEffect(() => {
    if (state?.ok) toast.success("Datos de KAIRAS guardados");
  }, [state]);

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Marca" required error={errors.brandName?.[0]}>
          <Input name="brandName" defaultValue={profile.brandName} required />
        </Field>
        <Field label="Nombre legal" error={errors.legalName?.[0]}>
          <Input name="legalName" defaultValue={profile.legalName} />
        </Field>
        <Field label="NIF/CIF" error={errors.vatId?.[0]}>
          <Input name="vatId" defaultValue={profile.vatId} />
        </Field>
        <Field label="Email" error={errors.email?.[0]}>
          <Input name="email" type="email" defaultValue={profile.email} />
        </Field>
        <Field label="Teléfono" error={errors.phone?.[0]}>
          <Input name="phone" defaultValue={profile.phone} />
        </Field>
        <Field label="Web" error={errors.web?.[0]}>
          <Input name="web" defaultValue={profile.web} />
        </Field>
        <Field label="Instagram" error={errors.instagram?.[0]}>
          <Input name="instagram" defaultValue={profile.instagram} />
        </Field>
      </div>

      <div>
        <p className="k-label mb-3">Domicilio fiscal</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Calle, número y piso"
            error={errors.address?.[0]}
            className="sm:col-span-2"
          >
            <Input name="address" defaultValue={profile.address} />
          </Field>
          <Field label="Código postal" error={errors.postalCode?.[0]}>
            <Input name="postalCode" defaultValue={profile.postalCode} />
          </Field>
          <Field label="Localidad" error={errors.city?.[0]}>
            <Input name="city" defaultValue={profile.city} />
          </Field>
          <Field label="Provincia" error={errors.province?.[0]}>
            <Input name="province" defaultValue={profile.province} />
          </Field>
          <Field label="País" error={errors.country?.[0]}>
            <Input name="country" defaultValue={profile.country} />
          </Field>
        </div>
      </div>

      <div>
        <p className="k-label mb-3">Datos administrativos</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Régimen" error={errors.taxRegime?.[0]}>
            <Select name="taxRegime" defaultValue={profile.taxRegime || "autonoma"}>
              <option value="autonoma">Autónoma</option>
              <option value="sociedad">Sociedad</option>
              <option value="otro">Otro</option>
            </Select>
          </Field>
          <Field label="Epígrafe IAE" error={errors.iaeCode?.[0]}>
            <Input name="iaeCode" defaultValue={profile.iaeCode} placeholder="763" />
          </Field>
          <Field
            label="Nº afiliación Seguridad Social"
            error={errors.socialSecurityNumber?.[0]}
          >
            <Input
              name="socialSecurityNumber"
              defaultValue={profile.socialSecurityNumber}
            />
          </Field>
          <Field label="IBAN" error={errors.iban?.[0]}>
            <Input name="iban" defaultValue={profile.iban} placeholder="ES00 0000 …" />
          </Field>
        </div>
        <p className="mt-3 text-xs text-faint">
          Estos datos no salen de KAIRAS. Sirven para tenerlos a mano al
          presentar modelos y para rellenar tus facturas.
        </p>
      </div>
      {state && !state.ok && !state.fieldErrors ? (
        <p className="text-sm text-danger">{state.error}</p>
      ) : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Guardando…" : "Guardar datos"}
      </Button>
    </form>
  );
}

export function AppDefaultsForm({ defaults }: { defaults: AppDefaults }) {
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(saveAppDefaultsAction, undefined);

  useEffect(() => {
    if (state?.ok) toast.success("Preferencias guardadas");
  }, [state]);

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Moneda" error={errors.currency?.[0]}>
          <Select name="currency" defaultValue={defaults.currency}>
            <option value="EUR">EUR (€)</option>
            <option value="USD">USD ($)</option>
          </Select>
        </Field>
        <Field label="IVA por defecto (%)" error={errors.vatRate?.[0]}>
          <Input
            name="vatRate"
            type="number"
            min={0}
            max={100}
            defaultValue={String(defaults.vatRate)}
          />
        </Field>
        <Field label="Zona horaria" error={errors.timezone?.[0]}>
          <Input name="timezone" defaultValue={defaults.timezone} />
        </Field>
        <Field label="Redondeo de tiempo (min)" error={errors.timeRounding?.[0]}>
          <Select name="timeRounding" defaultValue={String(defaults.timeRounding)}>
            <option value="0">Sin redondeo</option>
            <option value="5">5 minutos</option>
            <option value="10">10 minutos</option>
            <option value="15">15 minutos</option>
            <option value="30">30 minutos</option>
          </Select>
        </Field>
      </div>
      {state && !state.ok && !state.fieldErrors ? (
        <p className="text-sm text-danger">{state.error}</p>
      ) : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Guardando…" : "Guardar preferencias"}
      </Button>
    </form>
  );
}

export function ExpenseDefaultsForm({ defaults }: { defaults: ExpenseDefaults }) {
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(saveExpenseDefaultsAction, undefined);

  useEffect(() => {
    if (state?.ok) toast.success("Tarifas de gastos guardadas");
  }, [state]);

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="€ por kilómetro" error={errors.ratePerKm?.[0]}>
          <Input
            name="ratePerKm"
            type="number"
            min={0}
            step="0.001"
            defaultValue={String(defaults.ratePerKm)}
          />
        </Field>
        <Field label="Dieta sin pernocta (€)" error={errors.perDiemDay?.[0]}>
          <Input
            name="perDiemDay"
            type="number"
            min={0}
            step="0.01"
            defaultValue={String(defaults.perDiemDay)}
          />
        </Field>
        <Field label="Dieta con pernocta (€)" error={errors.perDiemOvernight?.[0]}>
          <Input
            name="perDiemOvernight"
            type="number"
            min={0}
            step="0.01"
            defaultValue={String(defaults.perDiemOvernight)}
          />
        </Field>
      </div>
      <Field label="Proveedores de peaje en Odoo" error={errors.tollSuppliers?.[0]}>
        <Input
          name="tollSuppliers"
          defaultValue={defaults.tollSuppliers.join(", ")}
          placeholder="beep, via-t"
        />
      </Field>
      <p className="text-xs text-faint">
        Separados por comas. Una factura de proveedor de Odoo se importa como
        peaje si su nombre contiene alguno de estos textos. Los valores por
        defecto de kilometraje y dietas son los topes exentos de IRPF.
      </p>
      {state && !state.ok && !state.fieldErrors ? (
        <p className="text-sm text-danger">{state.error}</p>
      ) : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Guardando…" : "Guardar tarifas"}
      </Button>
    </form>
  );
}

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line bg-ink/40 p-3 has-[:checked]:border-violet-line has-[:checked]:bg-violet-soft">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5" />
      <span>
        <span className="block text-sm font-medium text-foam">{label}</span>
        {hint ? <span className="block text-xs text-faint">{hint}</span> : null}
      </span>
    </label>
  );
}

function ChipGroup({
  name,
  options,
  selected,
}: {
  name: string;
  options: { value: string | number; label: string }[];
  selected: (string | number)[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label
          key={o.value}
          className="cursor-pointer rounded-full border border-line bg-ink/40 px-3 py-1.5 text-xs text-mist has-[:checked]:border-violet-line has-[:checked]:bg-violet-soft has-[:checked]:text-foam"
        >
          <input
            type="checkbox"
            name={name}
            value={o.value}
            defaultChecked={selected.includes(o.value)}
            className="sr-only"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foam">{title}</h3>
      {hint ? <p className="text-xs text-faint">{hint}</p> : null}
    </div>
  );
}

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const hourOption = (h: number) => (
  <option key={h} value={h}>
    {String(h).padStart(2, "0")}:00
  </option>
);

export function NotificationDefaultsForm({ defaults }: { defaults: NotificationDefaults }) {
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(saveNotificationDefaultsAction, undefined);

  useEffect(() => {
    if (state?.ok) toast.success("Preferencias de notificación guardadas");
  }, [state]);

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const offsetOptions = NOTIFICATION_OFFSET_OPTIONS.map((m) => ({ value: m, label: offsetLabel(m) }));

  return (
    <form action={formAction} className="space-y-6">
      <Toggle
        name="enabled"
        label="Recibir notificaciones"
        hint="Interruptor general. Si lo apagas no se manda ningún aviso, aunque tengas un dispositivo activado."
        defaultChecked={defaults.enabled}
      />

      <section className="space-y-3">
        <SectionTitle
          title="Tareas"
          hint="Puedes marcar varias antelaciones: recibirás un aviso por cada una."
        />
        <Toggle name="tasksEnabled" label="Avisar de tareas" defaultChecked={defaults.tasksEnabled} />
        <Field label="Recordatorio de la tarea" error={errors.taskRemindOffsets?.[0]}>
          <ChipGroup name="taskRemindOffsets" options={offsetOptions} selected={defaults.taskRemindOffsets} />
        </Field>
        <p className="-mt-1 text-xs text-faint">
          Respecto a la hora de «Recordatorio» que pones dentro de cada tarea.
        </p>
        <Field label="Fecha límite de la tarea" error={errors.taskDueOffsets?.[0]}>
          <ChipGroup name="taskDueOffsets" options={offsetOptions} selected={defaults.taskDueOffsets} />
        </Field>
        <p className="-mt-1 text-xs text-faint">
          Respecto al vencimiento de la tarea. Ejemplo: «1 día antes» + «1 h antes» + «En el
          momento». Si no marcas ninguna, no se avisa por fecha límite.
        </p>
        <Field label="Solo tareas con prioridad" error={errors.taskPriorities?.[0]}>
          <ChipGroup
            name="taskPriorities"
            options={NOTIFICATION_PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))}
            selected={defaults.taskPriorities}
          />
        </Field>
      </section>

      <section className="space-y-3 border-t border-line pt-5">
        <SectionTitle title="Leads" hint="Avisos de la fecha de «siguiente acción» de cada lead." />
        <Toggle name="leadsEnabled" label="Avisar de seguimientos de leads" defaultChecked={defaults.leadsEnabled} />
        <Field label="Cuándo avisar" error={errors.leadFollowUpOffsets?.[0]}>
          <ChipGroup name="leadFollowUpOffsets" options={offsetOptions} selected={defaults.leadFollowUpOffsets} />
        </Field>
      </section>

      <section className="space-y-3 border-t border-line pt-5">
        <SectionTitle
          title="Resumen diario"
          hint="Un único aviso al día con lo pendiente. Si no hay nada, no se manda."
        />
        <Toggle name="summaryEnabled" label="Recibir resumen diario" defaultChecked={defaults.summaryEnabled} />
        <Field label="Hora del resumen" className="sm:w-48">
          <Select name="summaryHour" defaultValue={String(defaults.summaryHour)}>
            {HOURS.map(hourOption)}
          </Select>
        </Field>
        <div className="grid gap-2 sm:grid-cols-3">
          <Toggle name="summaryIncludeOverdue" label="Tareas vencidas" defaultChecked={defaults.summaryIncludeOverdue} />
          <Toggle name="summaryIncludeToday" label="Tareas de hoy" defaultChecked={defaults.summaryIncludeToday} />
          <Toggle name="summaryIncludeLeads" label="Seguimientos" defaultChecked={defaults.summaryIncludeLeads} />
        </div>
      </section>

      <section className="space-y-3 border-t border-line pt-5">
        <SectionTitle
          title="Modo silencio"
          hint="Durante estas horas no suena nada; lo pendiente llega al terminar (hasta 24 h después)."
        />
        <Toggle name="quietEnabled" label="Activar modo silencio" defaultChecked={defaults.quietEnabled} />
        <div className="grid gap-3 sm:grid-cols-2 sm:w-96">
          <Field label="Desde">
            <Select name="quietStartHour" defaultValue={String(defaults.quietStartHour)}>
              {HOURS.map(hourOption)}
            </Select>
          </Field>
          <Field label="Hasta">
            <Select name="quietEndHour" defaultValue={String(defaults.quietEndHour)}>
              {HOURS.map(hourOption)}
            </Select>
          </Field>
        </div>
        <Toggle
          name="quietAllowUrgent"
          label="Las tareas urgentes ignoran el silencio"
          defaultChecked={defaults.quietAllowUrgent}
        />
      </section>

      <p className="text-xs text-faint">
        El chequeo corre cada 15 min, así que un aviso puede llegar con hasta ese margen de
        retraso. Las horas son las de tu zona horaria de Ajustes.
      </p>
      {state && !state.ok && !state.fieldErrors ? (
        <p className="text-sm text-danger">{state.error}</p>
      ) : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Guardando…" : "Guardar preferencias"}
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(changePasswordAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      toast.success("Contraseña actualizada");
    }
  }, [state]);

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <Field label="Contraseña actual" required error={errors.currentPassword?.[0]}>
        <Input
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nueva contraseña" required error={errors.newPassword?.[0]}>
          <Input
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
          />
        </Field>
        <Field label="Repite la nueva" required error={errors.confirmPassword?.[0]}>
          <Input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
          />
        </Field>
      </div>
      {state && !state.ok && !state.fieldErrors ? (
        <p className="text-sm text-danger">{state.error}</p>
      ) : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Guardando…" : "Cambiar contraseña"}
      </Button>
    </form>
  );
}
