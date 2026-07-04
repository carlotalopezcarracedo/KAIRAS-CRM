"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toggleChecklistAction } from "../actions";

export function Checklist({
  taskId,
  items: initial,
}: {
  taskId: string;
  items: { label: string; done: boolean }[];
}) {
  const [items, setItems] = useState(initial);
  const [, startTransition] = useTransition();

  function toggle(index: number) {
    const prev = items;
    setItems((arr) =>
      arr.map((item, i) => (i === index ? { ...item, done: !item.done } : item)),
    );
    startTransition(async () => {
      const result = await toggleChecklistAction(taskId, index);
      if (!result.ok) {
        setItems(prev);
        toast.error(result.error);
      }
    });
  }

  const doneCount = items.filter((i) => i.done).length;

  return (
    <div>
      <p className="k-label mb-2.5">
        Checklist · {doneCount}/{items.length}
      </p>
      <ul className="space-y-1.5">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            <button
              type="button"
              onClick={() => toggle(index)}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-raise"
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                  item.done ? "border-ok bg-ok text-ink" : "border-line-strong",
                )}
              >
                {item.done ? <Check className="h-3 w-3" /> : null}
              </span>
              <span
                className={cn(
                  "text-sm",
                  item.done ? "text-faint line-through" : "text-foam",
                )}
              >
                {item.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
