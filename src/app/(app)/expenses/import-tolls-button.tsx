"use client";

import { useTransition } from "react";
import { DownloadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { importTollsAction } from "./actions";

/**
 * Trae los peajes desde Odoo. Es explícito y no automático: así se sabe
 * cuándo entraron los apuntes. Reimportar no duplica.
 */
export function ImportTollsButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await importTollsAction();
          if (result.ok) toast.success(result.message);
          else toast.error(result.error);
        })
      }
    >
      <DownloadCloud className="h-4 w-4" />
      {pending ? "Importando…" : "Importar peajes de Odoo"}
    </Button>
  );
}
