"use client";

import { useTransition } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { processMetaQueueAction } from "./actions";

export function ProcessQueueButton({ disabled }: { disabled: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      disabled={pending || disabled}
      title={
        disabled
          ? "Configura META_PIXEL_ID y META_ACCESS_TOKEN para poder enviar"
          : "Enviar eventos pendientes a Meta"
      }
      onClick={() =>
        startTransition(async () => {
          const result = await processMetaQueueAction();
          if (!result.ok) toast.error(result.error);
          else
            toast.success(
              `Procesado: ${result.sent ?? 0} enviados, ${result.failed ?? 0} fallidos`,
            );
        })
      }
    >
      <Send className="h-3.5 w-3.5" />
      {pending ? "Enviando…" : "Procesar cola"}
    </Button>
  );
}
