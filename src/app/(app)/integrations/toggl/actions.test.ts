import { describe, expect, it, vi } from "vitest";

// Sin sesión válida: requireUser() rechaza, igual que en producción cuando
// la cookie ha caducado. Todas las actions deben devolver {ok:false} y no
// tocar ningún servicio de Toggl ni base de datos.
vi.mock("@/server/auth", () => ({
  requireUser: vi.fn().mockRejectedValue(new Error("UNAUTHORIZED")),
}));

const checkTogglConnection = vi.fn();
const selectTogglWorkspace = vi.fn();
vi.mock("@/server/services/toggl-connection-service", () => ({
  checkTogglConnection: (...args: unknown[]) => checkTogglConnection(...args),
  selectTogglWorkspace: (...args: unknown[]) => selectTogglWorkspace(...args),
}));

const runHistoricalImport = vi.fn();
const runReconciliation = vi.fn();
vi.mock("@/server/services/toggl-sync-service", () => ({
  runHistoricalImport: (...args: unknown[]) => runHistoricalImport(...args),
  runReconciliation: (...args: unknown[]) => runReconciliation(...args),
}));

const refreshProjectMappings = vi.fn();
const confirmProjectMapping = vi.fn();
vi.mock("@/server/services/toggl-mapping-service", () => ({
  refreshProjectMappings: (...args: unknown[]) => refreshProjectMappings(...args),
  confirmProjectMapping: (...args: unknown[]) => confirmProjectMapping(...args),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  checkConnectionAction,
  selectWorkspaceAction,
  importHistoricalAction,
  reconcileNowAction,
  refreshMappingsAction,
  confirmMappingAction,
} from "./actions";

describe("Toggl actions sin sesión válida", () => {
  it("checkConnectionAction no llama a Toggl y devuelve error", async () => {
    const result = await checkConnectionAction();
    expect(result.ok).toBe(false);
    expect(checkTogglConnection).not.toHaveBeenCalled();
  });

  it("selectWorkspaceAction no persiste nada", async () => {
    const result = await selectWorkspaceAction(1, "x");
    expect(result.ok).toBe(false);
    expect(selectTogglWorkspace).not.toHaveBeenCalled();
  });

  it("importHistoricalAction no importa nada", async () => {
    const fd = new FormData();
    fd.set("from", "2026-01-01");
    fd.set("to", "2026-01-31");
    const result = await importHistoricalAction(undefined, fd);
    expect(result.ok).toBe(false);
    expect(runHistoricalImport).not.toHaveBeenCalled();
  });

  it("reconcileNowAction no sincroniza nada", async () => {
    const result = await reconcileNowAction();
    expect(result.ok).toBe(false);
    expect(runReconciliation).not.toHaveBeenCalled();
  });

  it("refreshMappingsAction no consulta Toggl", async () => {
    const result = await refreshMappingsAction();
    expect(result.ok).toBe(false);
    expect(refreshProjectMappings).not.toHaveBeenCalled();
  });

  it("confirmMappingAction no escribe nada", async () => {
    const result = await confirmMappingAction("map1", null);
    expect(result.ok).toBe(false);
    expect(confirmProjectMapping).not.toHaveBeenCalled();
  });
});
