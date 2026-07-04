"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trophy, XCircle } from "lucide-react";
import { Select, Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { OPPORTUNITY_STAGE, toOptions } from "@/lib/labels";
import { changeStageAction } from "../actions";

const options = toOptions(OPPORTUNITY_STAGE).filter(
  (o) => o.value !== "won" && o.value !== "lost",
);

export function StageControl({
  opportunityId,
  current,
  estimatedValue,
}: {
  opportunityId: string;
  current: string;
  estimatedValue: number | null;
}) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(current);
  const [wonOpen, setWonOpen] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [acceptedValue, setAcceptedValue] = useState(
    estimatedValue?.toString() ?? "",
  );
  const [lostReason, setLostReason] = useState("");
  const closed = current === "won" || current === "lost";

  function change(stage: string, extra?: { lostReason?: string; acceptedValue?: string }) {
    const prev = value;
    setValue(stage);
    startTransition(async () => {
      const result = await changeStageAction(opportunityId, stage, extra);
      if (!result.ok) {
        setValue(prev);
        toast.error(result.error);
      } else {
        toast.success(
          `Etapa: ${OPPORTUNITY_STAGE[stage as keyof typeof OPPORTUNITY_STAGE].label}`,
        );
        setWonOpen(false);
        setLostOpen(false);
      }
    });
  }

  if (closed) {
    return (
      <p className="text-sm font-semibold text-mist">
        Oportunidad cerrada. Puedes reabrirla cambiando la etapa:
        <Select
          value={value}
          disabled={pending}
          onChange={(e) => change(e.target.value)}
          className="mt-2 w-full sm:w-56"
        >
          <option value={current}>
            {OPPORTUNITY_STAGE[current as keyof typeof OPPORTUNITY_STAGE].label}
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={value}
        disabled={pending}
        onChange={(e) => change(e.target.value)}
        aria-label="Cambiar etapa"
        className="w-full sm:w-56"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>

      <Dialog open={wonOpen} onOpenChange={setWonOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="bg-ok text-ink hover:bg-ok/85">
            <Trophy className="h-3.5 w-3.5" />
            Ganada
          </Button>
        </DialogTrigger>
        <DialogContent
          title="Marcar como ganada"
          description="Se guardará el valor aceptado y el lead asociado pasará a Ganado."
        >
          <div className="space-y-4">
            <Field label="Valor aceptado (€)">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={acceptedValue}
                onChange={(e) => setAcceptedValue(e.target.value)}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setWonOpen(false)}>
                Cancelar
              </Button>
              <Button
                disabled={pending}
                onClick={() => change("won", { acceptedValue })}
              >
                {pending ? "Guardando…" : "Confirmar ganada"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={lostOpen} onOpenChange={setLostOpen}>
        <DialogTrigger asChild>
          <Button variant="danger" size="sm">
            <XCircle className="h-3.5 w-3.5" />
            Perdida
          </Button>
        </DialogTrigger>
        <DialogContent
          title="Marcar como perdida"
          description="Guarda el motivo para aprender de qué se pierde."
        >
          <div className="space-y-4">
            <Field label="Motivo de pérdida">
              <Input
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="Precio, timing, eligió otra opción…"
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setLostOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                disabled={pending}
                onClick={() => change("lost", { lostReason })}
              >
                {pending ? "Guardando…" : "Confirmar perdida"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
