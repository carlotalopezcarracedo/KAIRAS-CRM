"use client";

import { useState, useTransition } from "react";
import { UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { convertLeadAction } from "../../clients/actions";

export function ConvertLeadButton({
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
        <Button variant="secondary" size="sm">
          <UserCheck className="h-3.5 w-3.5 text-ok" />
          Convertir en cliente
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Convertir en cliente"
        description={`Se creará el cliente "${leadName}" con los datos del lead, y sus oportunidades quedarán vinculadas.`}
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await convertLeadAction(leadId);
                if (result && !result.ok) toast.error(result.error);
              })
            }
          >
            {pending ? "Convirtiendo…" : "Convertir"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
