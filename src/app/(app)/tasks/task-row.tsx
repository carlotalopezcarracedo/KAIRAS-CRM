"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { TASK_STATUS, PRIORITY, TASK_TYPE } from "@/lib/labels";
import { formatDate, cn } from "@/lib/utils";
import { setTaskStatusAction } from "./actions";
import { StartTimerButton } from "../time/start-timer-button";

export type TaskRowData = {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "waiting" | "done" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  type: keyof typeof TASK_TYPE;
  dueAt: string | null;
  billable: boolean;
  projectName: string | null;
  projectId: string | null;
  clientName: string | null;
  clientId: string | null;
  leadName: string | null;
  leadId: string | null;
};

export function TaskRow({ task }: { task: TaskRowData }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(task.status === "done");
  const overdue =
    task.dueAt && new Date(task.dueAt) < new Date() && !done && task.status !== "cancelled";

  function toggleDone() {
    const next = !done;
    setDone(next);
    startTransition(async () => {
      const result = await setTaskStatusAction(task.id, next ? "done" : "todo");
      if (!result.ok) {
        setDone(!next);
        toast.error(result.error);
      }
    });
  }

  const context =
    task.projectName ?? task.clientName ?? task.leadName ?? null;
  const contextHref = task.projectId
    ? `/projects/${task.projectId}`
    : task.clientId
      ? `/clients/${task.clientId}`
      : task.leadId
        ? `/leads/${task.leadId}`
        : null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5 transition-colors",
        overdue && "border-danger/25",
        done && "opacity-55",
      )}
    >
      <button
        type="button"
        onClick={toggleDone}
        disabled={pending}
        title={done ? "Reabrir" : "Marcar hecha"}
        className={cn(
          "flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors",
          done
            ? "border-ok bg-ok text-ink"
            : "border-line-strong hover:border-lavender",
        )}
      >
        {done ? <Check className="h-3 w-3" /> : null}
      </button>

      <div className="min-w-0 flex-1">
        <Link
          href={`/tasks/${task.id}`}
          className={cn(
            "block truncate text-sm font-medium text-foam hover:text-lavender",
            done && "line-through",
          )}
        >
          {task.title}
        </Link>
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-faint">
          {contextHref && context ? (
            <Link href={contextHref} className="hover:text-lavender">
              {context}
            </Link>
          ) : null}
          {task.dueAt ? (
            <span className={overdue ? "font-semibold text-danger" : undefined}>
              {formatDate(task.dueAt)}
            </span>
          ) : null}
          <span>{TASK_TYPE[task.type].label}</span>
        </div>
      </div>

      <div className="hidden items-center gap-2 sm:flex">
        {task.status !== "todo" && task.status !== "done" ? (
          <Badge tone={TASK_STATUS[task.status].tone}>
            {TASK_STATUS[task.status].label}
          </Badge>
        ) : null}
        <Badge tone={PRIORITY[task.priority].tone}>
          {PRIORITY[task.priority].label}
        </Badge>
      </div>

      {!done ? (
        <StartTimerButton
          taskId={task.id}
          title={task.title}
          projectId={task.projectId}
          clientId={task.clientId}
          billable={task.billable}
          compact
        />
      ) : null}
    </div>
  );
}
