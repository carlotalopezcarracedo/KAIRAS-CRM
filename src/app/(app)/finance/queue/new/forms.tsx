"use client";

import { useActionState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import type { ActionResult } from "@/lib/action-result";
import { createDraftAction, createDraftFromHoursAction } from "../../actions";

export function ManualDraftForm({
  clients,
  defaultClientId,
}: {
  clients: { id: string; name: string }[];
  defaultClientId?: string;
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(createDraftAction, undefined);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Cliente" required error={errors.clientId?.[0]}>
        <Select name="clientId" defaultValue={defaultClientId ?? ""} required>
          <option value="">Selecciona…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Concepto" required error={errors.concept?.[0]}>
        <Input
          name="concept"
          placeholder="Web corporativa — 50% inicial"
          required
          minLength={2}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Base imponible (€)" required error={errors.amountNet?.[0]}>
          <Input name="amountNet" type="number" min={0} step="0.01" required />
        </Field>
        <Field label="IVA (%)" error={errors.vatRate?.[0]}>
          <Input name="vatRate" type="number" min={0} max={100} defaultValue="21" />
        </Field>
      </div>
      <Field label="Notas internas" error={errors.notes?.[0]}>
        <Textarea name="notes" className="min-h-16" />
      </Field>
      {state && !state.ok && !state.fieldErrors ? (
        <p className="text-sm text-danger">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Creando…" : "Añadir a la cola"}
      </Button>
    </form>
  );
}

export function FromHoursForm({
  clients,
  defaultClientId,
}: {
  clients: { id: string; name: string }[];
  defaultClientId?: string;
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(createDraftFromHoursAction, undefined);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const router = useRouter();
  const pathname = usePathname();

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Cliente" required error={errors.clientId?.[0]}>
        <div className="flex gap-2">
          <Select
            name="clientId"
            defaultValue={defaultClientId ?? ""}
            required
            onChange={(e) =>
              router.replace(`${pathname}?clientId=${e.target.value}`, {
                scroll: false,
              })
            }
            className="flex-1"
          >
            <option value="">Selecciona…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </Field>
      <Field label="Concepto (opcional)" error={errors.concept?.[0]}>
        <Input name="concept" placeholder="Horas de trabajo — julio 2026" />
      </Field>
      <Field label="IVA (%)" error={errors.vatRate?.[0]}>
        <Input name="vatRate" type="number" min={0} max={100} defaultValue="21" />
      </Field>
      {state && !state.ok && !state.fieldErrors ? (
        <p className="text-sm text-danger">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Agrupando…" : "Agrupar horas y crear solicitud"}
      </Button>
    </form>
  );
}
