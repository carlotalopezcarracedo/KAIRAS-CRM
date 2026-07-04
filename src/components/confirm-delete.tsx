"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";

/** Botón de borrado con confirmación, reutilizable en todos los módulos. */
export function ConfirmDelete({
  action,
  title,
  description,
  buttonLabel = "Eliminar",
}: {
  action: () => Promise<ActionResult>;
  title: string;
  description: string;
  buttonLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-danger hover:text-danger">
          <Trash2 className="h-4 w-4" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent title={title} description={description}>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await action();
                if (result && !result.ok) toast.error(result.error);
              })
            }
          >
            {pending ? "Eliminando…" : "Sí, eliminar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
