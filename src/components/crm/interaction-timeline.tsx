import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { INTERACTION_CHANNEL } from "@/lib/labels";
import { formatDateTime } from "@/lib/utils";

export type TimelineInteraction = {
  id: string;
  channel: keyof typeof INTERACTION_CHANNEL;
  direction: "outbound" | "inbound";
  summary: string;
  detail: string | null;
  occurredAt: Date;
};

/** Timeline vertical de interacciones — línea + puntos, sobrio. */
export function InteractionTimeline({
  interactions,
}: {
  interactions: TimelineInteraction[];
}) {
  if (interactions.length === 0) return null;
  return (
    <ol className="relative ml-2 space-y-4 border-l border-line pl-5">
      {interactions.map((interaction) => (
        <li key={interaction.id} className="relative">
          <span className="absolute -left-[26px] top-1.5 flex h-3 w-3 items-center justify-center rounded-full border border-line bg-surface">
            <span
              className={
                interaction.direction === "inbound"
                  ? "h-1.5 w-1.5 rounded-full bg-ok"
                  : "h-1.5 w-1.5 rounded-full bg-lavender"
              }
            />
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {interaction.direction === "inbound" ? (
              <ArrowDownLeft className="h-3.5 w-3.5 text-ok" />
            ) : (
              <ArrowUpRight className="h-3.5 w-3.5 text-lavender" />
            )}
            <Badge tone={INTERACTION_CHANNEL[interaction.channel].tone}>
              {INTERACTION_CHANNEL[interaction.channel].label}
            </Badge>
            <span className="text-xs text-faint">
              {formatDateTime(interaction.occurredAt)}
            </span>
          </div>
          <p className="mt-1.5 text-sm font-medium text-foam">
            {interaction.summary}
          </p>
          {interaction.detail ? (
            <p className="mt-1 whitespace-pre-wrap text-sm text-mist">
              {interaction.detail}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
