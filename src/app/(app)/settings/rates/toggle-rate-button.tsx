"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { toggleRateAction } from "../actions";

export function ToggleRateButton({
  rateId,
  active,
}: {
  rateId: string;
  active: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleRateAction(rateId);
          if (!result.ok) toast.error(result.error);
          else toast.success(active ? "Tarifa desactivada" : "Tarifa activada");
        })
      }
      className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
        active
          ? "border-line text-faint hover:border-danger/30 hover:text-danger"
          : "border-ok/30 text-ok hover:bg-ok-soft"
      }`}
    >
      {pending ? "…" : active ? "Desactivar" : "Activar"}
    </button>
  );
}
