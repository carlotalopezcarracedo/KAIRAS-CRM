"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import type { ActionResult } from "@/lib/action-result";
import { addContactAction } from "../actions";

export function ContactDialog({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const boundAction = addContactAction.bind(null, clientId);
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(boundAction, undefined);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Contacto añadido");
      setOpen(false);
    }
  }, [state]);

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <Plus className="h-4 w-4" />
          Contacto
        </Button>
      </DialogTrigger>
      <DialogContent title="Añadir contacto">
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre" required error={errors.firstName?.[0]}>
              <Input name="firstName" required minLength={2} />
            </Field>
            <Field label="Apellidos" error={errors.lastName?.[0]}>
              <Input name="lastName" />
            </Field>
          </div>
          <Field label="Cargo" error={errors.role?.[0]}>
            <Input name="role" placeholder="Gerente" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Teléfono" error={errors.phone?.[0]}>
              <Input name="phone" type="tel" />
            </Field>
            <Field label="Email" error={errors.email?.[0]}>
              <Input name="email" type="email" />
            </Field>
          </div>
          {state && !state.ok && !state.fieldErrors ? (
            <p className="text-sm text-danger">{state.error}</p>
          ) : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Añadir"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
