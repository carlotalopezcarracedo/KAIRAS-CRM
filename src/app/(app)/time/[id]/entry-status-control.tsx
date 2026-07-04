"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Select } from "@/components/ui/field";
import { TIME_ENTRY_STATUS, toOptions } from "@/lib/labels";
import { setEntryStatusAction } from "../actions";

const options = toOptions(TIME_ENTRY_STATUS).filter(
  (o) => !["queued_for_invoice", "invoiced"].includes(o.value),
);

export function EntryStatusControl({
  entryId,
  current,
  locked,
}: {
  entryId: string;
  current: string;
  locked: boolean;
}) {
  const [value, setValue] = useState(current);
  const [pending, startTransition] = useTransition();

  if (locked) return null;

  return (
    <Select
      value={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        const prev = value;
        setValue(next);
        startTransition(async () => {
          const result = await setEntryStatusAction(entryId, next);
          if (!result.ok) {
            setValue(prev);
            toast.error(result.error);
          } else {
            toast.success("Estado actualizado");
          }
        });
      }}
      aria-label="Estado de la entrada"
      className="w-full sm:w-52"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
