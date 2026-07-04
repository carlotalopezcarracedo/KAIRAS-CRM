"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EntryForm, type EntrySelectData } from "./entry-form";
import { createEntryAction } from "./actions";

function defaultTimes() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const oneHourAgo = new Date(now.getTime() - 3600_000);
  return { startedAt: fmt(oneHourAgo), endedAt: fmt(now) };
}

export function ManualEntryDialog({ selects }: { selects: EntrySelectData }) {
  const [open, setOpen] = useState(false);
  const times = defaultTimes();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <Plus className="h-4 w-4" />
          Entrada manual
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Registrar tiempo trabajado"
        description="Para trabajo ya hecho sin cronómetro."
        className="max-w-xl"
      >
        <EntryForm
          action={createEntryAction}
          selects={selects}
          defaults={times}
          submitLabel="Registrar"
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
