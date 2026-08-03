"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EntryForm, type EntrySelectData } from "./entry-form";
import { createEntryAction, getTimeEntryExtraOptionsAction } from "./actions";

function defaultTimes() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const oneHourAgo = new Date(now.getTime() - 3600_000);
  return { startedAt: fmt(oneHourAgo), endedAt: fmt(now) };
}

export function ManualEntryDialog({
  clients,
  projects,
  initialExtras,
}: Pick<EntrySelectData, "clients" | "projects"> & {
  initialExtras?: Pick<EntrySelectData, "services" | "tasks">;
}) {
  const [open, setOpen] = useState(false);
  const [selects, setSelects] = useState<EntrySelectData | null>(() =>
    initialExtras ? { clients, projects, ...initialExtras } : null,
  );
  const [loadingOptions, startLoadingOptions] = useTransition();
  const times = defaultTimes();

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setOpen(false);
      return;
    }
    if (selects) {
      setOpen(true);
      return;
    }
    startLoadingOptions(async () => {
      try {
        const extras = await getTimeEntryExtraOptionsAction();
        setSelects({ clients, projects, ...extras });
        setOpen(true);
      } catch {
        toast.error("No se pudieron preparar los datos de tiempo. Inténtalo de nuevo.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" disabled={loadingOptions}>
          <span className={loadingOptions ? "inline-flex animate-spin" : "inline-flex"}>
            {loadingOptions ? (
              <LoaderCircle className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </span>
          {loadingOptions ? "Preparando…" : "Entrada manual"}
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Registrar tiempo trabajado"
        description="Para trabajo ya hecho sin cronómetro."
        className="max-w-xl"
      >
        {selects ? (
          <EntryForm
            action={createEntryAction}
            selects={selects}
            defaults={times}
            submitLabel="Registrar"
            onSuccess={() => setOpen(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
