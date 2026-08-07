"use client";

import { useTransition } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createProposalVersionAction } from "./actions";

/**
 * Crea la siguiente versión y archiva la actual, para conservar el histórico
 * de lo que se llegó a enviar al cliente.
 */
export function NewVersionButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await createProposalVersionAction(id);
          if (result && !result.ok) toast.error(result.error);
        })
      }
    >
      <Copy className="h-4 w-4" />
      {pending ? "Creando…" : "Nueva versión"}
    </Button>
  );
}
