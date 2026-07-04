"use client";

import { useTransition } from "react";
import { Receipt } from "lucide-react";
import { toast } from "sonner";
import { generateInvoiceDraftAction } from "./actions";

export function GenerateDraftButton({ recurringId }: { recurringId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      title="Crear solicitud de factura de este ciclo"
      onClick={() =>
        startTransition(async () => {
          const result = await generateInvoiceDraftAction(recurringId);
          if (!result.ok) toast.error(result.error);
          else toast.success("Solicitud creada en la cola de facturación");
        })
      }
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-violet-line bg-violet-soft px-3 py-1.5 text-xs font-semibold text-lavender transition-colors hover:bg-violet/20 disabled:opacity-50"
    >
      <Receipt className="h-3.5 w-3.5" />
      {pending ? "Creando…" : "Facturar ciclo"}
    </button>
  );
}
