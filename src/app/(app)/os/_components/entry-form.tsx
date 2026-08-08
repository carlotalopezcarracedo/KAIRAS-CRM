"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { DateTimeField } from "@/components/ui/date-time-field";
import type { ActionResult } from "@/lib/action-result";
import {
  OS_AREAS,
  OS_STATUS,
  OS_AUTHORITY,
  OS_TYPE_LABEL,
  OS_BUSINESS_LINE,
  OS_MESSAGE_LAYER,
} from "../_config";
import {
  OS_ENTRY_TYPES,
  OS_STATUSES,
  OS_AUTHORITIES,
  OS_BUSINESS_LINES,
  OS_MESSAGE_LAYERS,
} from "@/server/validators/os/knowledge";
import { entryHref } from "../_sections";

export type EntryFormDefaults = Partial<{
  id: string;
  type: string;
  area: string;
  title: string;
  summary: string;
  body: string;
  status: string;
  authority: string;
  businessLine: string;
  messageLayer: string;
  sector: string;
  validUntil: string; // yyyy-mm-dd
  tags: string; // "a, b, c"
  meta: string; // JSON
}>;

export function EntryForm({
  action,
  mode,
  defaults = {},
  submitLabel,
}: {
  action: (prev: ActionResult | undefined, fd: FormData) => Promise<ActionResult>;
  mode: "create" | "edit";
  defaults?: EntryFormDefaults;
  submitLabel: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const [area, setArea] = useState(defaults.area ?? OS_AREAS[0].slug);
  const [dirty, setDirty] = useState(false);
  const submitting = useRef(false);

  // Confirmación de guardado + redirección al detalle.
  useEffect(() => {
    if (state?.ok && state.id) {
      submitting.current = true; // evita el aviso de descarte al navegar
      toast.success(mode === "create" ? "Entrada creada" : "Cambios guardados");
      router.push(entryHref(state.id));
      router.refresh();
    } else if (state && !state.ok) {
      toast.error(state.error);
    }
  }, [state, area, mode, router]);

  // Prevención de pérdida accidental de cambios.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty && !submitting.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const cancelHref = mode === "edit" && defaults.id ? entryHref(defaults.id) : "/os";
  const onCancel = (e: React.MouseEvent) => {
    if (dirty && !confirm("Tienes cambios sin guardar. ¿Salir y descartarlos?")) {
      e.preventDefault();
    }
  };

  return (
    <form
      action={formAction}
      onChange={() => setDirty(true)}
      onSubmit={() => {
        submitting.current = true;
      }}
      className="max-w-3xl space-y-8"
    >
      {mode === "edit" && defaults.id ? <input type="hidden" name="id" value={defaults.id} /> : null}

      <section className="space-y-4">
        <h2 className="k-label">Contenido</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Título" required error={errors.title?.[0]} className="sm:col-span-2">
            <Input name="title" defaultValue={defaults.title} required minLength={1} maxLength={300} />
          </Field>
          <Field label="Resumen" error={errors.summary?.[0]} className="sm:col-span-2">
            <Input name="summary" defaultValue={defaults.summary} placeholder="Una línea que resuma la entrada" />
          </Field>
          <Field label="Cuerpo" error={errors.body?.[0]} className="sm:col-span-2">
            <Textarea name="body" defaultValue={defaults.body} rows={8} placeholder="Contenido de la entrada. Este es el texto que se copia desde el detalle." />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="k-label">Clasificación</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo" required error={errors.type?.[0]}>
            <Select name="type" defaultValue={defaults.type ?? "definicion"}>
              {OS_ENTRY_TYPES.map((t) => (
                <option key={t} value={t}>{OS_TYPE_LABEL[t]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Área" required error={errors.area?.[0]}>
            <Select name="area" value={area} onChange={(e) => setArea(e.target.value)}>
              {OS_AREAS.map((a) => (
                <option key={a.slug} value={a.slug}>{a.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Sector" error={errors.sector?.[0]}>
            <Input name="sector" defaultValue={defaults.sector} placeholder="p. ej. estetica" />
          </Field>
          <Field label="Etiquetas" error={errors.tags?.[0]}>
            <Input name="tags" defaultValue={defaults.tags} placeholder="separadas por comas" />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="k-label">Gobierno</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Estado" required error={errors.status?.[0]}>
            <Select name="status" defaultValue={defaults.status ?? "borrador"}>
              {OS_STATUSES.map((s) => (
                <option key={s} value={s}>{OS_STATUS[s].label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Autoridad" required error={errors.authority?.[0]}>
            <Select name="authority" defaultValue={defaults.authority ?? "operativo"}>
              {OS_AUTHORITIES.map((a) => (
                <option key={a} value={a}>{OS_AUTHORITY[a].label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Vigencia (vigente hasta)" error={errors.validUntil?.[0]}>
            <DateTimeField withTime={false} name="validUntil" defaultValue={defaults.validUntil} />
          </Field>
          <Field label="Línea de negocio" error={errors.businessLine?.[0]}>
            <Select name="businessLine" defaultValue={defaults.businessLine ?? "transversal"}>
              {OS_BUSINESS_LINES.map((l) => (
                <option key={l} value={l}>{OS_BUSINESS_LINE[l]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Capa de mensaje" error={errors.messageLayer?.[0]}>
            <Select name="messageLayer" defaultValue={defaults.messageLayer ?? "na"}>
              {OS_MESSAGE_LAYERS.map((m) => (
                <option key={m} value={m}>{OS_MESSAGE_LAYER[m]}</option>
              ))}
            </Select>
          </Field>
        </div>
      </section>

      <details className="rounded-card border border-line bg-surface/60 px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-mist">Campos avanzados (meta JSON)</summary>
        <div className="mt-3">
          <Field label="Meta (JSON)" error={errors.meta?.[0]}>
            <Textarea name="meta" defaultValue={defaults.meta} rows={6} spellCheck={false} placeholder='{"clave": "valor"}' className="font-mono text-xs" />
          </Field>
        </div>
      </details>

      {mode === "edit" ? (
        <section className="space-y-4">
          <h2 className="k-label">Versión</h2>
          <Field label="Motivo del cambio (opcional)" error={errors.changeReason?.[0]}>
            <Input name="changeReason" placeholder="Qué cambia y por qué. Se guarda en el historial." />
          </Field>
        </section>
      ) : null}

      {state && !state.ok ? (
        <p className="rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </Button>
        <ButtonLink href={cancelHref} variant="ghost" onClick={onCancel}>
          Cancelar
        </ButtonLink>
      </div>
    </form>
  );
}
