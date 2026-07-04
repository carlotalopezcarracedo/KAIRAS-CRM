"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteLeadAction } from "../actions";

export function DeleteLeadButton({
  leadId,
  leadName,
}: {
  leadId: string;
  leadName: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-danger hover:text-danger">
          <Trash2 className="h-4 w-4" />
          Eliminar
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Eliminar lead"
        description={`"${leadName}" se archivará (borrado suave). Podrás recuperarlo desde la base de datos si hace falta.`}
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteLeadAction(leadId);
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
