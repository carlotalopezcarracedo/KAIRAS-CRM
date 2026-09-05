"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { continueImportAction } from "./actions";

export function ContinueImportButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await continueImportAction();
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("Importación histórica continuada.");
          router.refresh();
        })
      }
    >
      <PlayCircle className={pending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
      {pending ? "Continuando…" : "Continuar importación"}
    </Button>
  );
}
