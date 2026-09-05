"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { DateTimeField } from "@/components/ui/date-time-field";
import { toDateOnlyInput } from "@/lib/dates";
import type { ActionResult } from "@/lib/action-result";
import { importHistoricalAction } from "./actions";

function defaultRange() {
  const to = new Date();
  const from = new Date(to.getTime() - 90 * 86_400_000);
  return { from: toDateOnlyInput(from), to: toDateOnlyInput(to) };
}

export function ImportHistoricalForm() {
  const [state, formAction, pending] = useActionState<ActionResult | undefined, FormData>(
    importHistoricalAction,
    undefined,
  );
  const defaults = defaultRange();

  useEffect(() => {
    if (state?.ok) toast.success("Importación histórica terminada. Revisa el resultado abajo.");
    else if (state && !state.ok && !state.fieldErrors) toast.error(state.error);
  }, [state]);

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <Field label="Desde" error={errors.from?.[0]} className="sm:w-40">
        <DateTimeField withTime={false} name="from" defaultValue={defaults.from} required />
      </Field>
      <Field label="Hasta" error={errors.to?.[0]} className="sm:w-40">
        <DateTimeField withTime={false} name="to" defaultValue={defaults.to} required />
      </Field>
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Importando…" : "Importar histórico"}
      </Button>
      {state && !state.ok && !state.fieldErrors ? (
        <p className="text-xs text-danger">{state.error}</p>
      ) : null}
      <p className="text-xs text-faint sm:ml-2">
        Se descarga por ventanas de ~31 días vía el Reports API de Toggl, sin
        límite artificial de antigüedad. Repetirlo es seguro: nunca duplica.
      </p>
    </form>
  );
}
