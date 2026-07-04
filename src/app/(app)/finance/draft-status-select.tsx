"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Select } from "@/components/ui/field";
import { INVOICE_DRAFT_STATUS, toOptions } from "@/lib/labels";
import { setDraftStatusAction } from "./actions";

const options = toOptions(INVOICE_DRAFT_STATUS);

export function DraftStatusSelect({
  draftId,
  current,
}: {
  draftId: string;
  current: string;
}) {
  const [value, setValue] = useState(current);
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        const prev = value;
        setValue(next);
        startTransition(async () => {
          const result = await setDraftStatusAction(draftId, next);
          if (!result.ok) {
            setValue(prev);
            toast.error(result.error);
          } else {
            toast.success("Estado actualizado");
          }
        });
      }}
      aria-label="Estado de la solicitud"
      className="h-8 w-40 text-xs"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
