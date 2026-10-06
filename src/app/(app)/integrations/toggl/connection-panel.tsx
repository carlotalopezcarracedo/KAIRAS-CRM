"use client";

import { useState, useTransition } from "react";
import { RefreshCw, CircleCheck, CircleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { checkConnectionAction, selectWorkspaceAction } from "./actions";
import type { TogglWorkspace } from "@/integrations/toggl/adapter";

type CheckState =
  | { status: "idle" }
  | {
      status: "ok";
      account: { email: string | null; fullname: string | null };
      workspaces: TogglWorkspace[];
      selectedWorkspaceId: number | null;
    }
  | { status: "error"; error: string };

export function ConnectionPanel({ configured }: { configured: boolean }) {
  const [state, setState] = useState<CheckState>({ status: "idle" });
  const [pending, startTransition] = useTransition();
  const [savingWorkspace, startSavingWorkspace] = useTransition();

  function check() {
    startTransition(async () => {
      const result = await checkConnectionAction();
      if (!result.ok) {
        setState({ status: "error", error: result.error });
        toast.error(result.error);
        return;
      }
      setState({
        status: "ok",
        account: result.account,
        workspaces: result.workspaces,
        selectedWorkspaceId: result.selectedWorkspaceId,
      });
      toast.success("Conexión con Toggl verificada");
    });
  }

  function chooseWorkspace(id: number) {
    if (state.status !== "ok") return;
    const workspace = state.workspaces.find((w) => w.id === id);
    if (!workspace) return;
    startSavingWorkspace(async () => {
      const result = await selectWorkspaceAction(workspace.id, workspace.name);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setState({ ...state, selectedWorkspaceId: workspace.id });
      toast.success(`Workspace "${workspace.name}" seleccionado`);
    });
  }

  return (
    <div className="space-y-4">
      {!configured ? (
        <div className="flex items-start gap-3 rounded-xl border border-warn/25 bg-warn-soft px-4 py-3 text-sm text-warn">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Falta configurar <code>TOGGL_API_TOKEN</code> en el servidor.
        </div>
      ) : null}

      <Button variant="secondary" size="sm" disabled={pending || !configured} onClick={check}>
        <RefreshCw className={pending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
        {pending ? "Comprobando…" : "Comprobar conexión"}
      </Button>

      {state.status === "ok" ? (
        <div className="space-y-3 rounded-xl border border-ok/20 bg-ok-soft/40 p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold text-ok">
            <CircleCheck className="h-4 w-4" />
            Conectado{state.account.email ? ` como ${state.account.email}` : ""}
          </p>
          {state.workspaces.length === 0 ? (
            <p className="text-mist">Esta cuenta de Toggl no tiene workspaces visibles.</p>
          ) : state.workspaces.length === 1 ? (
            <p className="text-mist">
              Workspace: <span className="font-semibold text-foam">{state.workspaces[0]!.name}</span>{" "}
              (seleccionado automáticamente)
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-mist">Workspace:</span>
              <Select
                value={state.selectedWorkspaceId ? String(state.selectedWorkspaceId) : ""}
                onChange={(e) => chooseWorkspace(Number(e.target.value))}
                disabled={savingWorkspace}
                className="h-9 w-56 text-base sm:h-8 sm:text-xs"
              >
                <option value="">Elige uno…</option>
                {state.workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
      ) : null}

      {state.status === "error" ? (
        <div className="flex items-start gap-3 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {state.error}
        </div>
      ) : null}
    </div>
  );
}
