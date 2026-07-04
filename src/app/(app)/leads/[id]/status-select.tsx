"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Select } from "@/components/ui/field";
import { LEAD_STATUS, toOptions } from "@/lib/labels";
import { changeLeadStatusAction } from "../actions";

const options = toOptions(LEAD_STATUS);

export function StatusSelect({
  leadId,
  current,
}: {
  leadId: string;
  current: string;
}) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(current);

  function onChange(next: string) {
    const prev = value;
    let lostReason: string | undefined;
    if (next === "lost") {
      lostReason =
        window.prompt("¿Motivo de la pérdida? (opcional)") ?? undefined;
    }
    setValue(next);
    startTransition(async () => {
      const result = await changeLeadStatusAction(leadId, next, lostReason);
      if (!result.ok) {
        setValue(prev);
        toast.error(result.error);
      } else {
        toast.success(`Estado: ${LEAD_STATUS[next as keyof typeof LEAD_STATUS].label}`);
      }
    });
  }

  return (
    <Select
      value={value}
      disabled={pending}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Cambiar estado del lead"
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
