"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { OPPORTUNITY_STAGE, PRIORITY } from "@/lib/labels";
import { formatMoney, formatDate, cn } from "@/lib/utils";
import { changeStageAction } from "./actions";

export type KanbanItem = {
  id: string;
  title: string;
  stage: string;
  estimatedValue: number | null;
  probability: number;
  expectedCloseAt: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  nextAction: string | null;
  partyName: string | null; // lead o cliente
};

const COLUMNS = [
  "discovered",
  "qualified",
  "diagnosis",
  "proposal_drafting",
  "proposal_sent",
  "follow_up",
  "negotiation",
  "accepted",
] as const;

export function KanbanBoard({ items: initial }: { items: KanbanItem[] }) {
  const [items, setItems] = useState(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function moveTo(id: string, stage: string, extra?: { lostReason?: string }) {
    const prev = items;
    if (stage === "won" || stage === "lost") {
      setItems((arr) => arr.filter((i) => i.id !== id));
    } else {
      setItems((arr) => arr.map((i) => (i.id === id ? { ...i, stage } : i)));
    }
    startTransition(async () => {
      const result = await changeStageAction(id, stage, extra);
      if (!result.ok) {
        setItems(prev);
        toast.error(result.error);
      } else {
        toast.success(
          `Movida a ${OPPORTUNITY_STAGE[stage as keyof typeof OPPORTUNITY_STAGE].label}`,
        );
        router.refresh();
      }
    });
  }

  function handleDrop(stage: string) {
    if (!dragId) return;
    const id = dragId;
    setDragId(null);
    setOverCol(null);
    const item = items.find((i) => i.id === id);
    if (!item || item.stage === stage) return;
    if (stage === "lost") {
      const reason = window.prompt("¿Motivo de la pérdida? (opcional)") ?? undefined;
      moveTo(id, stage, { lostReason: reason });
      return;
    }
    moveTo(id, stage);
  }

  return (
    <div>
      {/* Zonas de cierre */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        {(["won", "lost"] as const).map((closeStage) => (
          <div
            key={closeStage}
            onDragOver={(e) => {
              e.preventDefault();
              setOverCol(closeStage);
            }}
            onDragLeave={() => setOverCol(null)}
            onDrop={() => handleDrop(closeStage)}
            className={cn(
              "flex h-12 items-center justify-center rounded-card border border-dashed text-xs font-semibold uppercase tracking-widest transition-colors",
              closeStage === "won"
                ? "border-ok/30 text-ok"
                : "border-danger/30 text-danger",
              overCol === closeStage &&
                (closeStage === "won" ? "bg-ok-soft" : "bg-danger-soft"),
              !dragId && "opacity-50",
            )}
          >
            {closeStage === "won" ? "Soltar aquí: ganada" : "Soltar aquí: perdida"}
          </div>
        ))}
      </div>

      {/* Columnas */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((stage) => {
          const colItems = items.filter((i) => i.stage === stage);
          const colValue = colItems.reduce(
            (acc, i) => acc + (i.estimatedValue ?? 0),
            0,
          );
          return (
            <div
              key={stage}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(stage);
              }}
              onDragLeave={() => setOverCol(null)}
              onDrop={() => handleDrop(stage)}
              className={cn(
                "flex w-64 shrink-0 flex-col rounded-card border border-line bg-surface/50 transition-colors",
                overCol === stage && "border-violet-line bg-violet-soft/40",
              )}
            >
              <div className="flex items-center justify-between px-3.5 pb-2 pt-3.5">
                <span className="k-label">
                  {OPPORTUNITY_STAGE[stage].label}
                  <span className="ml-1.5 text-faint">×{colItems.length}</span>
                </span>
                <span className="text-xs text-faint">{formatMoney(colValue)}</span>
              </div>
              <div className="flex min-h-24 flex-col gap-2 px-2.5 pb-2.5">
                {colItems.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => setDragId(item.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverCol(null);
                    }}
                    className={cn(
                      "cursor-grab rounded-xl border border-line bg-surface p-3 transition-colors hover:border-line-strong active:cursor-grabbing",
                      dragId === item.id && "opacity-40",
                    )}
                  >
                    <Link
                      href={`/pipeline/${item.id}`}
                      className="block text-sm font-semibold leading-snug text-foam hover:text-lavender"
                    >
                      {item.title}
                    </Link>
                    {item.partyName ? (
                      <p className="mt-0.5 truncate text-xs text-faint">
                        {item.partyName}
                      </p>
                    ) : null}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-lavender">
                        {formatMoney(item.estimatedValue)}
                      </span>
                      <span className="text-xs text-faint">{item.probability}%</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <Badge tone={PRIORITY[item.priority].tone}>
                        {PRIORITY[item.priority].label}
                      </Badge>
                      {item.expectedCloseAt ? (
                        <span
                          className={cn(
                            "text-[11px]",
                            new Date(item.expectedCloseAt) < new Date()
                              ? "font-semibold text-danger"
                              : "text-faint",
                          )}
                        >
                          {formatDate(item.expectedCloseAt)}
                        </span>
                      ) : null}
                    </div>
                    {!item.nextAction ? (
                      <p className="mt-2 rounded-lg bg-warn-soft px-2 py-1 text-[11px] font-medium text-warn">
                        Sin siguiente acción
                      </p>
                    ) : null}
                  </div>
                ))}
                {colItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-line px-3 py-5 text-center text-xs text-faint">
                    Vacío
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-1 text-xs text-faint lg:hidden">
        En móvil: desliza horizontalmente. Para mover una oportunidad, ábrela y
        cambia la etapa desde el detalle.
      </p>
    </div>
  );
}
