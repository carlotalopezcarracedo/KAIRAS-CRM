"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import type { ActionResult } from "@/lib/action-result";

/** Formulario de nota genérico: recibe un server action ya vinculado a la entidad. */
export function EntityNoteForm({
  action,
}: {
  action: (
    prev: ActionResult | undefined,
    formData: FormData,
  ) => Promise<ActionResult>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      toast.success("Nota guardada");
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2.5">
      <Textarea name="content" placeholder="Añadir nota…" required className="min-h-20" />
      {state && !state.ok ? (
        <p className="text-sm text-danger">
          {state.fieldErrors?.content?.[0] ?? state.error}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          {pending ? "Guardando…" : "Guardar nota"}
        </Button>
      </div>
    </form>
  );
}
