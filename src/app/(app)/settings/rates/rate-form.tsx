"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import type { ActionResult } from "@/lib/action-result";
import { createRateAction } from "../actions";

export function RateForm({
  clients,
  projects,
  services,
}: {
  clients: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  services: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(createRateAction, undefined);
  const [scope, setScope] = useState("global");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      queueMicrotask(() => setScope("global"));
      toast.success("Tarifa creada");
    }
  }, [state]);

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <Field label="Ámbito" error={errors.scope?.[0]} className="sm:w-40">
        <Select
          name="scope"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
        >
          <option value="global">Global</option>
          <option value="client">Cliente</option>
          <option value="project">Proyecto</option>
          <option value="service">Servicio</option>
        </Select>
      </Field>
      {scope === "client" ? (
        <Field label="Cliente" className="sm:w-52">
          <Select name="clientId" defaultValue="">
            <option value="">Selecciona…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      {scope === "project" ? (
        <Field label="Proyecto" className="sm:w-52">
          <Select name="projectId" defaultValue="">
            <option value="">Selecciona…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      {scope === "service" ? (
        <Field label="Servicio" className="sm:w-52">
          <Select name="serviceId" defaultValue="">
            <option value="">Selecciona…</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      <Field label="Tarifa (€/h)" error={errors.rate?.[0]} className="sm:w-32">
        <Input name="rate" type="number" min={1} step="0.01" required />
      </Field>
      <Field label="Vigente desde" error={errors.validFrom?.[0]} className="sm:w-40">
        <Input name="validFrom" type="date" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Creando…" : "Añadir tarifa"}
      </Button>
    </form>
  );
}
