"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import type { ActionResult } from "@/lib/action-result";
import type {
  CompanyProfile,
  AppDefaults,
  ExpenseDefaults,
} from "@/server/services/settings-service";
import {
  saveCompanyProfileAction,
  saveAppDefaultsAction,
  saveExpenseDefaultsAction,
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
        <Field label="Dirección" error={errors.address?.[0]}>
          <Input name="address" defaultValue={profile.address} />
        </Field>
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
