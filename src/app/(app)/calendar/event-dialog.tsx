"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EventForm, type EventSelectData } from "./event-form";
import { createEventAction } from "./actions";

export function EventDialog({ selects }: { selects: EventSelectData }) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  const startAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:00`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Evento
        </Button>
      </DialogTrigger>
      <DialogContent title="Nuevo evento" className="max-w-xl">
        <EventForm
          action={createEventAction}
          selects={selects}
          defaults={{ startAt }}
          submitLabel="Crear evento"
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
