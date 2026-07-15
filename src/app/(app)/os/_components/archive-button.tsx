"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { archiveEntryAction } from "../actions";

/**
 * Archiva (no borra) una entrada. En V1 no hay borrado destructivo desde la
 * interfaz: archivar solo cambia el estado a «archivado» y es reversible.
 */
export function ArchiveButton({
  entryId,
  area,
  archived,
}: {
  entryId: string;
  area: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (archived) {
    return <span className="text-xs text-faint">Archivada</span>;
  }

  const onClick = () => {
    if (!confirm("¿Archivar esta entrada? No se borra: podrás recuperarla cambiando su estado.")) return;
    const reason = window.prompt("Motivo (opcional):") ?? undefined;
    start(async () => {
      const r = await archiveEntryAction(entryId, area, reason || undefined);
      if (r.ok) {
        toast.success("Entrada archivada");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  };

  return (
    <Button variant="ghost" size="sm" onClick={onClick} disabled={pending}>
      <Archive className="h-3.5 w-3.5" />
      {pending ? "Archivando…" : "Archivar"}
    </Button>
  );
}
