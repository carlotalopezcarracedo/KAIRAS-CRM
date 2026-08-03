"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EventForm, type EventSelectData } from "./event-form";
import { createEventAction, getEventSelectOptionsAction } from "./actions";

export function EventDialog() {
  const [open, setOpen] = useState(false);
  const [selects, setSelects] = useState<EventSelectData | null>(null);
  const [loadingOptions, startLoadingOptions] = useTransition();
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  const startAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:00`;

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
        setSelects(await getEventSelectOptionsAction());
        setOpen(true);
      } catch {
        toast.error("No se pudieron preparar los datos del evento. Inténtalo de nuevo.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={loadingOptions}>
          <span className={loadingOptions ? "inline-flex animate-spin" : "inline-flex"}>
            {loadingOptions ? (
              <LoaderCircle className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </span>
          {loadingOptions ? "Preparando…" : "Evento"}
        </Button>
      </DialogTrigger>
      <DialogContent title="Nuevo evento" className="max-w-xl">
        {selects ? (
          <EventForm
            action={createEventAction}
            selects={selects}
            defaults={{ startAt }}
            submitLabel="Crear evento"
            onSuccess={() => setOpen(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
