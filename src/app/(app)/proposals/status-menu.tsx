"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Select } from "@/components/ui/field";
import { PROPOSAL_STATUS, toOptions } from "@/lib/labels";
import { setProposalStatusAction } from "./actions";

const options = toOptions(PROPOSAL_STATUS);

/**
 * Cambio de estado sin abrir la propuesta. El rechazo se deja fuera: exige
 * motivo, así que ese camino pasa por el formulario completo.
 */
export function ProposalStatusMenu({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      name={`status-${id}`}
      value={status}
      disabled={pending}
      aria-label="Cambiar estado"
      className="h-8 w-36 text-xs"
      onChange={(e) => {
        const next = e.target.value;
        if (next === status) return;
        if (next === "rejected") {
          toast.info("Para rechazar, abre la propuesta e indica el motivo.");
          return;
        }
        startTransition(async () => {
          const result = await setProposalStatusAction(id, next);
          if (result && !result.ok) toast.error(result.error);
        });
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
