"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reconcileNowAction } from "./actions";

export function SyncNowButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await reconcileNowAction();
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("Sincronización con Toggl terminada");
          router.refresh();
        })
      }
    >
      <RefreshCw className={pending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
      {pending ? "Sincronizando…" : "Sincronizar ahora"}
    </Button>
  );
}
