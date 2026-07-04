"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { INTERACTION_CHANNEL, toOptions } from "@/lib/labels";
import type { ActionResult } from "@/lib/action-result";
import { addInteractionAction } from "../actions";

const channelOptions = toOptions(INTERACTION_CHANNEL);

export function InteractionDialog({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false);
  const boundAction = addInteractionAction.bind(null, leadId);
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(boundAction, undefined);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Interacción registrada");
      setOpen(false);
    }
  }, [state]);

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <Plus className="h-4 w-4" />
          Interacción
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Registrar interacción"
        description="Llamada, WhatsApp, reunión… lo que haya pasado con este lead."
      >
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Canal" error={errors.channel?.[0]}>
              <Select name="channel" defaultValue="whatsapp">
                {channelOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Dirección" error={errors.direction?.[0]}>
              <Select name="direction" defaultValue="outbound">
                <option value="outbound">Yo he contactado</option>
                <option value="inbound">Me han contactado</option>
              </Select>
            </Field>
          </div>
          <Field label="Resumen" required error={errors.summary?.[0]}>
            <Input
              name="summary"
              placeholder="Le envié la propuesta de bot de citas"
              required
              minLength={2}
            />
          </Field>
          <Field label="Detalle (opcional)" error={errors.detail?.[0]}>
            <Textarea name="detail" className="min-h-20" />
          </Field>
          <Field label="Cuándo ocurrió" error={errors.occurredAt?.[0]}>
            <Input name="occurredAt" type="datetime-local" />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Siguiente acción" error={errors.nextAction?.[0]}>
              <Input name="nextAction" placeholder="Llamar si no responde" />
            </Field>
            <Field label="Fecha siguiente acción" error={errors.nextActionAt?.[0]}>
              <Input name="nextActionAt" type="datetime-local" />
            </Field>
          </div>
          {state && !state.ok && !state.fieldErrors ? (
            <p className="text-sm text-danger">{state.error}</p>
          ) : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
