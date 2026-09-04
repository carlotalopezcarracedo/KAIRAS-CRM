"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { retryPendingSyncAction } from "./actions";

/** Reintenta subir a Toggl todas las entradas locales que quedaron sin sincronizar. */
export function RetryPendingButton({ count }: { count: number }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending || count === 0}
      onClick={() =>
        startTransition(async () => {
          const result = await retryPendingSyncAction();
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("Reintento terminado");
          router.refresh();
        })
      }
    >
      <UploadCloud className={pending ? "h-3.5 w-3.5 animate-pulse" : "h-3.5 w-3.5"} />
      {pending ? "Reintentando…" : `Reintentar pendientes (${count})`}
    </Button>
  );
}
