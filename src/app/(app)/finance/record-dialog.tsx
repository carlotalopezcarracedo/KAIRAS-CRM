"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { DateTimeField } from "@/components/ui/date-time-field";
import { INVOICE_STATUS, toOptions } from "@/lib/labels";
import type { ActionResult } from "@/lib/action-result";
import { createRecordAction } from "./actions";

const statusOptions = toOptions(INVOICE_STATUS);

export function RecordDialog({
  clients,
  drafts,
}: {
  clients: { id: string; name: string }[];
  drafts: { id: string; concept: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(createRecordAction, undefined);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Factura registrada");
      queueMicrotask(() => setOpen(false));
    }
  }, [state]);

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <Plus className="h-4 w-4" />
          Registrar factura Odoo
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Registrar factura (snapshot)"
        description="La factura legal vive en Odoo. Aquí guardas la referencia para el control interno."
        className="max-w-xl"
      >
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Cliente" error={errors.clientId?.[0]}>
              <Select name="clientId" defaultValue="">
                <option value="">Sin cliente</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Nº factura Odoo" error={errors.odooInvoiceNumber?.[0]}>
              <Input name="odooInvoiceNumber" placeholder="FAC/2026/0042" />
            </Field>
          </div>
          <Field label="Concepto" required error={errors.concept?.[0]}>
            <Input name="concept" required minLength={2} />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Base (€)" error={errors.amountNet?.[0]}>
              <Input name="amountNet" type="number" min={0} step="0.01" />
            </Field>
            <Field label="IVA (€)" error={errors.vatAmount?.[0]}>
              <Input name="vatAmount" type="number" min={0} step="0.01" />
            </Field>
            <Field label="Total (€)" required error={errors.amountTotal?.[0]}>
              <Input name="amountTotal" type="number" min={0} step="0.01" required />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Emitida" error={errors.issuedAt?.[0]}>
              <DateTimeField withTime={false} name="issuedAt" />
            </Field>
            <Field label="Vence" error={errors.dueAt?.[0]}>
              <DateTimeField withTime={false} name="dueAt" />
            </Field>
            <Field label="Estado" error={errors.status?.[0]}>
              <Select name="status" defaultValue="created_in_odoo">
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Enlace Odoo" error={errors.odooUrl?.[0]}>
            <Input name="odooUrl" placeholder="https://…odoo.com/…" />
          </Field>
          {drafts.length > 0 ? (
            <Field label="Vincular a solicitud de la cola (opcional)">
              <Select name="linkDraftId" defaultValue="">
                <option value="">No vincular</option>
                {drafts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.concept}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          {state && !state.ok && !state.fieldErrors ? (
            <p className="text-sm text-danger">{state.error}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Registrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
