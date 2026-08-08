"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EventForm, type EventSelectData } from "./event-form";
import { createEventAction, getEventSelectOptionsAction } from "./actions";

/**
 * `anchorDate` es el día que se está mirando en el calendario (YYYY-MM-DD).
 * Crear un evento estando en el 15 y que salga con la fecha de hoy obliga a
 * corregirla a mano cada vez, así que manda el día visible.
 */
export function EventDialog({ anchorDate }: { anchorDate?: string }) {
  const [open, setOpen] = useState(false);
  const [selects, setSelects] = useState<EventSelectData | null>(null);
  const [loadingOptions, startLoadingOptions] = useTransition();

  const pad = (n: number) => String(n).padStart(2, "0");
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const isToday = !anchorDate || anchorDate === todayKey;

  // En el día de hoy, la hora siguiente en punto. En otro día, las 9:00:
  // proponer "dentro de una hora" en una fecha futura no significa nada.
  const nextHour = new Date(now.getTime());
  nextHour.setMinutes(0, 0, 0);
  nextHour.setHours(nextHour.getHours() + 1);

  const startAt = isToday
    ? `${todayKey}T${pad(nextHour.getHours())}:00`
    : `${anchorDate}T09:00`;

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
