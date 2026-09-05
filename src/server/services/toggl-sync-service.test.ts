/**
 * Test de integración contra la BD local (igual que knowledge-service.test.ts):
 * crea sus propios datos con marcador único y los borra al final. Cada test
 * se salta si no hay BD accesible (`if (!dbUp) return`). La API de Toggl se
 * mockea vía `fetch`; nunca se llama a la red real.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db/prisma";
import { getSetting, setSetting } from "@/server/services/settings-service";
import {
  applyRemoteEntry,
  runHistoricalImport,
  continueHistoricalImport,
  runReconciliation,
} from "./toggl-sync-service";
import { getTogglSettings, patchTogglSettings } from "./toggl-connection-service";
import type { TogglTimeEntry } from "@/integrations/toggl/adapter";

const MARK = `zztoggl_${Date.now()}`;
let dbUp = true;
let userId = "";
let clientId = "";
let projectId = "";
let originalSettings: unknown = null;
const createdRunIds: string[] = [];

function entry(overrides: Partial<TogglTimeEntry> = {}): TogglTimeEntry {
  return {
    id: 900000001,
    workspaceId: 111,
    projectId: null,
    description: "Trabajo de prueba",
    start: "2026-08-01T09:00:00.000Z",
    stop: "2026-08-01T10:00:00.000Z",
    durationSeconds: 3600,
    billable: true,
    tags: [],
    updatedAt: "2026-08-01T10:00:01.000Z",
    deletedAt: null,
    running: false,
    ...overrides,
  };
}

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    originalSettings = await getSetting<unknown>("integrations.toggl", null);

    const user = await prisma.user.create({
      data: { email: `${MARK}@test.kairas`, name: MARK, passwordHash: "x", role: "owner" },
    });
    userId = user.id;
    const client = await prisma.client.create({ data: { name: MARK } });
    clientId = client.id;
    const project = await prisma.project.create({ data: { name: MARK, clientId } });
    projectId = project.id;

    await patchTogglSettings({ workspaceId: 111, workspaceName: MARK });
  } catch {
    dbUp = false;
  }
});

afterAll(async () => {
  if (dbUp) {
    await prisma.timeEntry.deleteMany({ where: { userId } });
    await prisma.timerSession.deleteMany({ where: { userId } });
    if (createdRunIds.length) {
      await prisma.togglSyncRun.deleteMany({ where: { id: { in: createdRunIds } } });
    }
    await prisma.togglProjectMapping.deleteMany({ where: { togglWorkspaceId: "111" } });
    await prisma.project.deleteMany({ where: { id: projectId } });
    await prisma.client.deleteMany({ where: { id: clientId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await setSetting("integrations.toggl", originalSettings ?? {});
  }
  await prisma.$disconnect();
}, 30_000);

describe("applyRemoteEntry (idempotencia y conflictos)", () => {
  afterEach(async () => {
    if (dbUp) {
      await prisma.timeEntry.deleteMany({ where: { userId } });
      await prisma.timerSession.deleteMany({ where: { userId } });
    }
  });

  it("crea una entrada nueva; sin proyecto mapeado queda 'sin asignar'", async () => {
    if (!dbUp) return;
    const result = await applyRemoteEntry(entry({ id: 1, projectId: 5551 }), userId);
    expect(result).toEqual({ action: "created", unassigned: true });

    const row = await prisma.timeEntry.findUnique({ where: { togglTimeEntryId: "1" } });
    expect(row).toMatchObject({
      origin: "toggl",
      source: "toggl_import",
      syncStatus: "synced",
      projectId: null,
      togglProjectId: "5551",
      durationSeconds: 3600,
    });
  });

  it("reimportar la misma entrada (mismo 'at') no duplica ni reescribe: unchanged", async () => {
    if (!dbUp) return;
    const first = await applyRemoteEntry(entry({ id: 2 }), userId);
    expect(first.action).toBe("created");

    const second = await applyRemoteEntry(entry({ id: 2 }), userId);
    expect(second.action).toBe("unchanged");

    const rows = await prisma.timeEntry.findMany({ where: { togglTimeEntryId: "2" } });
    expect(rows).toHaveLength(1);
  });

  it("una entrada con 'at' más reciente actualiza el mismo registro", async () => {
    if (!dbUp) return;
    await applyRemoteEntry(entry({ id: 3, description: "Versión 1" }), userId);
    const updated = await applyRemoteEntry(
      entry({ id: 3, description: "Versión 2", updatedAt: "2026-08-01T12:00:00.000Z" }),
      userId,
    );
    expect(updated.action).toBe("updated");

    const rows = await prisma.timeEntry.findMany({ where: { togglTimeEntryId: "3" } });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.title).toBe("Versión 2");
  });

  it("resuelve el proyecto Kairas cuando hay mapping confirmado", async () => {
    if (!dbUp) return;
    const mapping = await prisma.togglProjectMapping.create({
      data: {
        togglProjectId: "5552",
        togglProjectName: MARK,
        togglWorkspaceId: "111",
        kairasProjectId: projectId,
        confirmedAt: new Date(),
      },
    });

    const result = await applyRemoteEntry(entry({ id: 4, projectId: 5552 }), userId);
    expect(result).toEqual({ action: "created", unassigned: false });

    const row = await prisma.timeEntry.findUnique({ where: { togglTimeEntryId: "4" } });
    expect(row?.projectId).toBe(projectId);
    expect(row?.clientId).toBe(clientId);

    await prisma.togglProjectMapping.delete({ where: { id: mapping.id } });
  });

  it("un cambio remoto sobre una entrada bloqueada (facturada) no se aplica: conflicto", async () => {
    if (!dbUp) return;
    await applyRemoteEntry(entry({ id: 6, description: "Original" }), userId);
    await prisma.timeEntry.update({
      where: { togglTimeEntryId: "6" },
      data: { status: "invoiced", lockedAt: new Date() },
    });

    const result = await applyRemoteEntry(
      entry({ id: 6, description: "Cambiado en Toggl", updatedAt: "2026-08-01T13:00:00.000Z" }),
      userId,
    );
    expect(result.action).toBe("conflict");

    const row = await prisma.timeEntry.findUnique({ where: { togglTimeEntryId: "6" } });
    expect(row?.title).toBe("Original"); // no se sobrescribió
    expect(row?.syncStatus).toBe("error");
    expect(row?.lastSyncError).toBeTruthy();
  });

  it("borrado en Toggl hace soft delete local (no borrado físico)", async () => {
    if (!dbUp) return;
    await applyRemoteEntry(entry({ id: 7 }), userId);
    const result = await applyRemoteEntry(
      entry({ id: 7, deletedAt: "2026-08-01T14:00:00.000Z" }),
      userId,
    );
    expect(result.action).toBe("deleted");

    const row = await prisma.timeEntry.findUnique({ where: { togglTimeEntryId: "7" } });
    expect(row).not.toBeNull(); // sigue existiendo (soft delete)
    expect(row?.deletedAt).not.toBeNull();
  });

  it("borrado en Toggl sobre una entrada bloqueada no la elimina: conflicto", async () => {
    if (!dbUp) return;
    await applyRemoteEntry(entry({ id: 8 }), userId);
    await prisma.timeEntry.update({
      where: { togglTimeEntryId: "8" },
      data: { status: "queued_for_invoice", lockedAt: new Date() },
    });

    const result = await applyRemoteEntry(
      entry({ id: 8, deletedAt: "2026-08-01T15:00:00.000Z" }),
      userId,
    );
    expect(result.action).toBe("conflict");

    const row = await prisma.timeEntry.findUnique({ where: { togglTimeEntryId: "8" } });
    expect(row?.deletedAt).toBeNull(); // no se borró
  });
});

describe("applyRemoteEntry — política de billable", () => {
  afterEach(async () => {
    if (dbUp) await prisma.timeEntry.deleteMany({ where: { userId } });
  });

  it("billable=true nacido en Kairas no se pisa aunque Toggl devuelva false al reconciliar", async () => {
    if (!dbUp) return;
    // Nace en Kairas: billableLocal=true, exactamente como hace createManualEntry.
    const kairasEntry = await prisma.timeEntry.create({
      data: {
        userId,
        title: "Original",
        startedAt: new Date("2026-08-01T09:00:00Z"),
        endedAt: new Date("2026-08-01T10:00:00Z"),
        durationSeconds: 3600,
        origin: "kairas",
        billable: true,
        billableLocal: true,
        togglTimeEntryId: "60",
        togglUpdatedAt: new Date("2026-08-01T10:00:01.000Z"),
        syncStatus: "synced",
      },
    });
    expect(kairasEntry.billable).toBe(true);

    // Toggl "actualiza" la entrada (p.ej. cambia la descripción) y, por
    // limitación de plan, reporta billable=false -- como en la prueba real.
    const result = await applyRemoteEntry(
      entry({
        id: 60,
        billable: false,
        description: "Cambiado en Toggl",
        updatedAt: "2026-08-01T12:00:00.000Z",
      }),
      userId,
    );
    expect(result.action).toBe("updated");

    const after = await prisma.timeEntry.findUnique({ where: { id: kairasEntry.id } });
    expect(after?.billable).toBe(true); // sigue true, Toggl no lo pisó
    expect(after?.status).toBe("draft"); // coherente con billable=true
    expect(after?.title).toBe("Cambiado en Toggl"); // el resto SÍ se actualiza
  });

  it("una entrada nacida en Toggl sí sigue el billable remoto (billableLocal=false)", async () => {
    if (!dbUp) return;
    const result = await applyRemoteEntry(entry({ id: 61, billable: false }), userId);
    expect(result.action).toBe("created");
    const created = await prisma.timeEntry.findUnique({ where: { togglTimeEntryId: "61" } });
    expect(created?.billable).toBe(false);
    expect(created?.billableLocal).toBe(false);

    const updated = await applyRemoteEntry(
      entry({ id: 61, billable: true, updatedAt: "2026-08-01T12:00:00.000Z" }),
      userId,
    );
    expect(updated.action).toBe("updated");
    const after = await prisma.timeEntry.findUnique({ where: { togglTimeEntryId: "61" } });
    expect(after?.billable).toBe(true); // sí siguió al remoto, no está protegida
  });

  it("editar en Kairas una entrada nacida en Toggl la protege para sincronizaciones futuras", async () => {
    if (!dbUp) return;
    await applyRemoteEntry(entry({ id: 62, billable: false }), userId);
    // Simula lo que hace updateEntry() al editar desde Kairas.
    await prisma.timeEntry.update({
      where: { togglTimeEntryId: "62" },
      data: { billable: true, billableLocal: true },
    });

    const result = await applyRemoteEntry(
      entry({ id: 62, billable: false, updatedAt: "2026-08-01T12:00:00.000Z" }),
      userId,
    );
    expect(result.action).toBe("updated");
    const after = await prisma.timeEntry.findUnique({ where: { togglTimeEntryId: "62" } });
    expect(after?.billable).toBe(true); // protegida tras la edición en Kairas
  });
});

describe("applyRemoteEntry — timer activo (una sola fuente de estado)", () => {
  afterEach(async () => {
    if (dbUp) {
      await prisma.timeEntry.deleteMany({ where: { userId } });
      await prisma.timerSession.deleteMany({ where: { userId } });
    }
  });

  it("una entrada en curso (stop=null) crea una TimerSession, no una TimeEntry", async () => {
    if (!dbUp) return;
    const result = await applyRemoteEntry(
      entry({ id: 50, stop: null, durationSeconds: -1754000000, running: true }),
      userId,
    );
    // Sin togglProjectId no hay nada que mapear: "unassigned" es para cuando
    // SÍ hay proyecto de Toggl pero falta el mapping, no para "sin proyecto".
    expect(result).toEqual({ action: "created", unassigned: false });

    const session = await prisma.timerSession.findFirst({ where: { togglTimeEntryId: "50" } });
    expect(session).not.toBeNull();
    expect(session?.userId).toBe(userId);
    expect(session?.active).toBe(true);

    const asTimeEntry = await prisma.timeEntry.findUnique({ where: { togglTimeEntryId: "50" } });
    expect(asTimeEntry).toBeNull(); // no hay una segunda representación
  });

  it("reaplicar la misma entrada en curso refresca la sesión sin duplicarla", async () => {
    if (!dbUp) return;
    await applyRemoteEntry(entry({ id: 51, stop: null, running: true, description: "v1" }), userId);
    const result = await applyRemoteEntry(
      entry({ id: 51, stop: null, running: true, description: "v2" }),
      userId,
    );
    expect(result.action).toBe("unchanged");

    const sessions = await prisma.timerSession.findMany({ where: { togglTimeEntryId: "51" } });
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.currentTitle).toBe("v2");
  });

  it("si ya hay un cronómetro Kairas nativo activo, una entrada en curso de Toggl no lo sustituye", async () => {
    if (!dbUp) return;
    const native = await prisma.timerSession.create({
      data: { userId, active: true, startedAt: new Date(), currentTitle: "nativo" },
    });

    const result = await applyRemoteEntry(
      entry({ id: 52, stop: null, running: true, description: "de Toggl" }),
      userId,
    );
    expect(result.action).toBe("conflict");

    const sessions = await prisma.timerSession.findMany({ where: { userId } });
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.id).toBe(native.id);
    expect(sessions[0]!.currentTitle).toBe("nativo"); // intacto

    await prisma.timerSession.delete({ where: { id: native.id } });
  });

  it("cuando la entrada se para en Toggl, la sesión se cierra como TimeEntry y desaparece la sesión", async () => {
    if (!dbUp) return;
    await applyRemoteEntry(entry({ id: 53, stop: null, running: true }), userId);
    const sessionBefore = await prisma.timerSession.findFirst({
      where: { togglTimeEntryId: "53" },
    });
    expect(sessionBefore).not.toBeNull();

    const result = await applyRemoteEntry(
      entry({
        id: 53,
        stop: "2026-08-01T11:00:00.000Z",
        running: false,
        durationSeconds: 3600,
      }),
      userId,
    );
    expect(result.action).toBe("created");

    const sessionAfter = await prisma.timerSession.findFirst({
      where: { togglTimeEntryId: "53" },
    });
    expect(sessionAfter).toBeNull();

    const closedEntry = await prisma.timeEntry.findUnique({ where: { togglTimeEntryId: "53" } });
    expect(closedEntry).not.toBeNull();
    expect(closedEntry?.origin).toBe("toggl");
    expect(closedEntry?.endedAt).not.toBeNull();
    expect(closedEntry?.durationSeconds).toBe(3600);
    expect(closedEntry?.userId).toBe(userId); // hereda la propietaria de la sesión
  });

  it("borrar en Toggl un timer en curso descarta la sesión sin crear TimeEntry", async () => {
    if (!dbUp) return;
    await applyRemoteEntry(entry({ id: 54, stop: null, running: true }), userId);

    const result = await applyRemoteEntry(
      entry({ id: 54, deletedAt: "2026-08-01T09:30:00.000Z" }),
      userId,
    );
    expect(result.action).toBe("deleted");

    const session = await prisma.timerSession.findFirst({ where: { togglTimeEntryId: "54" } });
    expect(session).toBeNull();
    const asTimeEntry = await prisma.timeEntry.findUnique({ where: { togglTimeEntryId: "54" } });
    expect(asTimeEntry).toBeNull();
  });
});

describe("runReconciliation (cursor de sincronización)", () => {
  beforeEach(() => {
    vi.stubEnv("TOGGL_API_TOKEN", "test-token");
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    if (dbUp) await prisma.timeEntry.deleteMany({ where: { userId } });
  });

  it("con éxito, avanza el cursor lastReconciledAt", async () => {
    if (!dbUp) return;
    await patchTogglSettings({ lastReconciledAt: 1000 });
    // mockImplementation (no mockResolvedValue): el body de un Response solo
    // se puede leer una vez, y este mock puede invocarse más de una vez.
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () => new Response(JSON.stringify([entry({ id: 101 })].map(toRaw)), { status: 200 }),
    );

    const run = await runReconciliation(userId);
    createdRunIds.push(run.id);
    expect(run.status).toBe("success");

    const settings = await getTogglSettings();
    expect(settings.lastReconciledAt).toBeGreaterThan(1000);
  });

  it("si la API de Toggl falla, el cursor NO avanza", async () => {
    if (!dbUp) return;
    await patchTogglSettings({ lastReconciledAt: 2000 });
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response("{}", { status: 500 }));

    const run = await runReconciliation(userId);
    createdRunIds.push(run.id);
    expect(run.status).toBe("error");

    const settings = await getTogglSettings();
    expect(settings.lastReconciledAt).toBe(2000); // sin cambios
  });

  it("rate limit (429) de Toggl se registra como error y no rompe el proceso", async () => {
    if (!dbUp) return;
    await patchTogglSettings({ lastReconciledAt: 3000 });
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response("{}", { status: 429 }));

    const run = await runReconciliation(userId);
    createdRunIds.push(run.id);
    expect(run.status).toBe("error");
    expect(run.error).toContain("limitado");

    const settings = await getTogglSettings();
    expect(settings.lastReconciledAt).toBe(3000);
  });

  it("primera reconciliación sin cursor NO trae histórico: pide 'since' cercano a ahora, no hace 90 días", async () => {
    if (!dbUp) return;
    await patchTogglSettings({ lastReconciledAt: null });
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => new Response(JSON.stringify([]), { status: 200 }));

    const beforeUnix = Math.floor(Date.now() / 1000);
    const run = await runReconciliation(userId);
    createdRunIds.push(run.id);
    expect(run.status).toBe("success");

    const url = new URL(String(fetchMock.mock.calls[0]![0]));
    const sinceUsed = Number(url.searchParams.get("since"));
    // El margen de seguridad es de minutos, nunca de 90 días.
    expect(beforeUnix - sinceUsed).toBeLessThan(10 * 60);
  });

  it("primera reconciliación establece el cursor cerca de 'ahora', no en el pasado", async () => {
    if (!dbUp) return;
    await patchTogglSettings({ lastReconciledAt: null });
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () => new Response(JSON.stringify([]), { status: 200 }),
    );

    const beforeUnix = Math.floor(Date.now() / 1000);
    const run = await runReconciliation(userId);
    createdRunIds.push(run.id);
    expect(run.status).toBe("success");

    const settings = await getTogglSettings();
    expect(settings.lastReconciledAt).not.toBeNull();
    expect(settings.lastReconciledAt!).toBeGreaterThanOrEqual(beforeUnix);
  });

  it("una segunda reconciliación pide 'since' desde el cursor de la primera, no desde el principio", async () => {
    if (!dbUp) return;
    await patchTogglSettings({ lastReconciledAt: 500_000 });
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => new Response(JSON.stringify([]), { status: 200 }));

    await runReconciliation(userId).then((r) => createdRunIds.push(r.id));
    const settingsAfterFirst = await getTogglSettings();

    await runReconciliation(userId).then((r) => createdRunIds.push(r.id));

    const secondUrl = new URL(String(fetchMock.mock.calls[1]![0]));
    const sinceUsed = Number(secondUrl.searchParams.get("since"));
    // El "since" de la 2ª pasada debe partir del cursor que dejó la 1ª
    // (con el margen de solape), no de 500_000 otra vez.
    expect(sinceUsed).toBeGreaterThan(settingsAfterFirst.lastReconciledAt! - 1000);
  });
});

describe("runHistoricalImport (idempotencia)", () => {
  beforeEach(() => {
    vi.stubEnv("TOGGL_API_TOKEN", "test-token");
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    if (dbUp) await prisma.timeEntry.deleteMany({ where: { userId } });
  });

  it("importar el mismo rango dos veces no duplica nada", async () => {
    if (!dbUp) return;
    const fixture = [toReportGroup({ id: 201 }), toReportGroup({ id: 202 })];
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () => new Response(JSON.stringify(fixture), { status: 200 }),
    );

    const range = { from: new Date("2026-08-01T00:00:00Z"), to: new Date("2026-08-05T00:00:00Z") };
    const first = await runHistoricalImport(userId, range);
    createdRunIds.push(first.id);
    expect(first.itemsCreated).toBe(2);

    const second = await runHistoricalImport(userId, range);
    createdRunIds.push(second.id);
    expect(second.itemsCreated).toBe(0);
    expect(second.itemsUnchanged).toBe(2);

    const rows = await prisma.timeEntry.findMany({
      where: { togglTimeEntryId: { in: ["201", "202"] } },
    });
    expect(rows).toHaveLength(2);
  });

  it("una importación histórica con éxito deja el cursor de reconciliación en el final del rango", async () => {
    if (!dbUp) return;
    await patchTogglSettings({ lastReconciledAt: null });
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () => new Response(JSON.stringify([toReportGroup({ id: 301 })]), { status: 200 }),
    );

    const range = { from: new Date("2026-08-01T00:00:00Z"), to: new Date("2026-08-05T00:00:00Z") };
    const run = await runHistoricalImport(userId, range);
    createdRunIds.push(run.id);
    expect(run.status).toBe("success");

    const settings = await getTogglSettings();
    expect(settings.lastReconciledAt).toBe(Math.floor(range.to.getTime() / 1000));
  });

  it("una importación histórica con errores NO adelanta el cursor (podría dejar huecos sin cubrir)", async () => {
    if (!dbUp) return;
    await patchTogglSettings({ lastReconciledAt: 123 });
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response("{}", { status: 500 }));

    const range = { from: new Date("2026-08-01T00:00:00Z"), to: new Date("2026-08-05T00:00:00Z") };
    const run = await runHistoricalImport(userId, range);
    createdRunIds.push(run.id);
    expect(run.status).toBe("error");

    const settings = await getTogglSettings();
    expect(settings.lastReconciledAt).toBe(123); // sin cambios
  });

  it("no retrocede el cursor si se importa un rango antiguo tras haber reconciliado algo más reciente", async () => {
    if (!dbUp) return;
    const recentCursor = Math.floor(new Date("2026-08-10T00:00:00Z").getTime() / 1000);
    await patchTogglSettings({ lastReconciledAt: recentCursor });
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () => new Response(JSON.stringify([toReportGroup({ id: 302 })]), { status: 200 }),
    );

    const oldRange = { from: new Date("2026-01-01T00:00:00Z"), to: new Date("2026-01-05T00:00:00Z") };
    const run = await runHistoricalImport(userId, oldRange);
    createdRunIds.push(run.id);
    expect(run.status).toBe("success");

    const settings = await getTogglSettings();
    expect(settings.lastReconciledAt).toBe(recentCursor); // no retrocedió
  });

  it("se para antes de agotar la cuota de Toggl en vez de encadenar peticiones", async () => {
    if (!dbUp) return;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "x-toggl-quota-remaining": "1", "x-toggl-quota-resets-in": "5" },
        }),
    );

    // Rango de 70 días: a 31 días por ventana, son 3 ventanas si se completa.
    const range = { from: new Date("2026-01-01T00:00:00Z"), to: new Date("2026-03-12T00:00:00Z") };
    const run = await runHistoricalImport(userId, range);
    createdRunIds.push(run.id);

    // Parcial, no "error" puro: la primera ventana SÍ se completó (hubo
    // progreso real), solo queda pausado por cuota, y es reanudable.
    expect(run.status).toBe("partial");
    expect(run.error).toContain("cuota");
    expect(run.resumable).toBe(true);
    expect(run.pendingWindows).toBe(2);
    // Se paró tras la primera ventana en vez de agotar la cuota en las 3.
    expect(fetchMock.mock.calls.length).toBe(1);
  });
});

/**
 * Encadena una respuesta distinta por cada llamada real a `fetch` (la última
 * de la lista se repite si se piden más). Permite simular "la ventana N falla
 * de una forma concreta, la N+1 tiene éxito" sin depender de la URL exacta.
 */
function fetchSequence(factories: Array<() => Response>) {
  // Restaura antes de espiar de nuevo: si `fetch` ya estaba espiado (llamada
  // anterior dentro del mismo test, p.ej. antes de una reanudación), `vi.spyOn`
  // reutilizaría el mismo mock y su `.mock.calls` acumulado, en vez de
  // devolver un contador limpio para ESTA fase.
  vi.restoreAllMocks();
  let i = 0;
  return vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
    const factory = factories[Math.min(i, factories.length - 1)]!;
    i++;
    return factory();
  });
}

function quotaResponse() {
  return new Response(JSON.stringify({ error: "quota exhausted" }), {
    status: 429,
    headers: { "x-toggl-quota-remaining": "0", "x-toggl-quota-resets-in": "600" },
  });
}

/**
 * El import histórico ahora usa el Reports API para TODO el rango (ver
 * toggl-sync-service.ts): un 403 en ESE endpoint significa que el plan de
 * Toggl no permite usarlo para este workspace -- el equivalente, para
 * historical import, de lo que antes era el 400 "start_date..." de Track API.
 */
function forbiddenResponse() {
  return new Response('"reports api not available for this plan"', {
    status: 403,
    headers: { "x-toggl-quota-remaining": "50", "x-toggl-quota-resets-in": "3600" },
  });
}

// Cabeceras de cuota "sana" por defecto: Toggl las manda en TODAS las
// respuestas, con éxito o no. Sin esto, un `lastQuota` bajo dejado por un test
// anterior (singleton a nivel de módulo, ver adapter.test.ts) contaminaría
// los siguientes -- igual que en la API real, una respuesta buena lo corrige.
// Nunca incluye cabeceras de "siguiente página": cada entrada de prueba es
// una sola página, salvo que el test de paginación las añada explícitamente.
function entriesResponse(ids: number[]) {
  return new Response(JSON.stringify(ids.map((id) => toReportGroup({ id }))), {
    status: 200,
    headers: { "x-toggl-quota-remaining": "50", "x-toggl-quota-resets-in": "3600" },
  });
}

describe("runHistoricalImport y continueHistoricalImport (resumible)", () => {
  beforeEach(() => {
    vi.stubEnv("TOGGL_API_TOKEN", "test-token");
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    if (dbUp) {
      await prisma.timeEntry.deleteMany({ where: { userId } });
      // TogglSyncRun no tiene userId (es un singleton de workspace, como en
      // producción): sin este borrado, un run "partial" que un test deja sin
      // resolver sería recogido por la consulta "más reciente reanudable" de
      // un test posterior, contaminando su resultado.
      await prisma.togglSyncRun.deleteMany({ where: { kind: "historical_import" } });
    }
  });

  // Rango de 65 días: a 31 días por ventana, son 3 ventanas (31 + 31 + 3).
  const threeWindowRange = {
    from: new Date("2026-01-01T00:00:00Z"),
    to: new Date("2026-03-07T00:00:00Z"),
  };

  it("importa varias ventanas y termina SUCCESS cuando todas tienen éxito", async () => {
    if (!dbUp) return;
    const fetchMock = fetchSequence([
      () => entriesResponse([401]),
      () => entriesResponse([402]),
      () => entriesResponse([403]),
    ]);

    const run = await runHistoricalImport(userId, threeWindowRange);
    createdRunIds.push(run.id);

    expect(run.status).toBe("success");
    expect(run.itemsCreated).toBe(3);
    expect(run.resumable).toBe(false);
    expect(fetchMock.mock.calls.length).toBe(3);
  });

  it("cuota agotada a mitad: detiene inmediatamente y no llama a las ventanas siguientes", async () => {
    if (!dbUp) return;
    const fetchMock = fetchSequence([() => entriesResponse([411]), () => quotaResponse()]);

    const run = await runHistoricalImport(userId, threeWindowRange);
    createdRunIds.push(run.id);

    expect(run.status).toBe("partial");
    expect(run.resumable).toBe(true);
    expect(run.pendingWindows).toBe(2); // la que falló por cuota + la que ni se intentó
    // 2 llamadas: la 1ª (éxito) y la 2ª (429). La 3ª ventana no se intenta.
    expect(fetchMock.mock.calls.length).toBe(2);

    const stored = await prisma.togglSyncRun.findUniqueOrThrow({ where: { id: run.id } });
    const summary = stored.summary as { windows: { status: string; reason?: string }[] };
    expect(summary.windows.map((w) => w.status)).toEqual(["success", "error", "pending"]);
    expect(summary.windows[1]?.reason).toBe("quota");
  });

  it("conserva las entradas ya creadas cuando el import se pausa a mitad", async () => {
    if (!dbUp) return;
    fetchSequence([() => entriesResponse([421]), () => quotaResponse()]);
    const run = await runHistoricalImport(userId, threeWindowRange);
    createdRunIds.push(run.id);
    expect(run.status).toBe("partial");

    const row = await prisma.timeEntry.findUnique({ where: { togglTimeEntryId: "421" } });
    expect(row).not.toBeNull();
    expect(row?.deletedAt).toBeNull();
  });

  it("continueHistoricalImport reanuda desde la ventana fallida sin repetir las ya completadas", async () => {
    if (!dbUp) return;
    fetchSequence([() => entriesResponse([431]), () => quotaResponse()]);
    const first = await runHistoricalImport(userId, threeWindowRange);
    createdRunIds.push(first.id);
    expect(first.status).toBe("partial");

    const resumeFetch = fetchSequence([() => entriesResponse([432]), () => entriesResponse([433])]);
    const resumed = await continueHistoricalImport(userId);

    expect(resumed.id).toBe(first.id); // mismo run, no uno nuevo
    expect(resumed.status).toBe("success");
    expect(resumed.itemsCreated).toBe(3); // 1 de antes + 2 nuevas
    // Solo 2 llamadas: las 2 ventanas pendientes. La ya completada no se repite.
    expect(resumeFetch.mock.calls.length).toBe(2);

    const rows = await prisma.timeEntry.findMany({
      where: { togglTimeEntryId: { in: ["431", "432", "433"] } },
    });
    expect(rows).toHaveLength(3);
  });

  it("dos reintentos seguidos no duplican nada: el segundo no tiene nada que reanudar", async () => {
    if (!dbUp) return;
    fetchSequence([() => entriesResponse([441]), () => quotaResponse()]);
    const first = await runHistoricalImport(userId, threeWindowRange);
    createdRunIds.push(first.id);

    fetchSequence([() => entriesResponse([442]), () => entriesResponse([443])]);
    const resumed = await continueHistoricalImport(userId);
    expect(resumed.status).toBe("success");

    await expect(continueHistoricalImport(userId)).rejects.toThrow("NO_RESUMABLE_IMPORT");

    const rows = await prisma.timeEntry.findMany({
      where: { togglTimeEntryId: { in: ["441", "442", "443"] } },
    });
    expect(rows).toHaveLength(3); // ninguna duplicada
  });

  it("la cuota puede agotarse otra vez durante la reanudación y volver a pausarse", async () => {
    if (!dbUp) return;
    fetchSequence([() => entriesResponse([451]), () => quotaResponse()]);
    const first = await runHistoricalImport(userId, threeWindowRange);
    createdRunIds.push(first.id);
    expect(first.pendingWindows).toBe(2);

    // Al reanudar, la 1ª ventana pendiente vuelve a toparse con cuota.
    fetchSequence([() => quotaResponse()]);
    const resumedOnceMore = await continueHistoricalImport(userId);
    expect(resumedOnceMore.status).toBe("partial");
    expect(resumedOnceMore.resumable).toBe(true);
    expect(resumedOnceMore.id).toBe(first.id);

    // Y una tercera vez, ya sin cuota agotada, termina.
    fetchSequence([() => entriesResponse([452]), () => entriesResponse([453])]);
    const finalRun = await continueHistoricalImport(userId);
    expect(finalRun.status).toBe("success");
  });

  it("un error genérico (no cuota) queda distinguido y también se puede reintentar", async () => {
    if (!dbUp) return;
    fetchSequence([
      () => entriesResponse([461]),
      () => new Response("{}", { status: 500 }),
    ]);
    const first = await runHistoricalImport(userId, threeWindowRange);
    createdRunIds.push(first.id);
    expect(first.status).toBe("partial");
    expect(first.error).toContain("no relacionado con cuota");

    const stored = await prisma.togglSyncRun.findUniqueOrThrow({ where: { id: first.id } });
    const summary = stored.summary as { windows: { status: string; reason?: string }[] };
    expect(summary.windows[1]?.status).toBe("error");
    expect(summary.windows[1]?.reason).toBe("other");

    fetchSequence([() => entriesResponse([462]), () => entriesResponse([463])]);
    const resumed = await continueHistoricalImport(userId);
    expect(resumed.status).toBe("success");
  });

  it("un 403 del Reports API (plan sin acceso) marca la ventana no-alcanzable y no se reintenta", async () => {
    if (!dbUp) return;
    // Rango de 2 ventanas: la primera "no alcanzable" (403), la segunda con éxito.
    const twoWindowRange = {
      from: new Date("2026-01-01T00:00:00Z"),
      to: new Date("2026-02-05T00:00:00Z"),
    };
    fetchSequence([() => forbiddenResponse(), () => entriesResponse([471])]);
    const run = await runHistoricalImport(userId, twoWindowRange);
    createdRunIds.push(run.id);

    expect(run.status).toBe("partial"); // hubo progreso real en la segunda ventana
    expect(run.unreachableWindows).toBe(1);
    expect(run.resumable).toBe(false); // nada que reintentar: es permanente
    expect(run.error).toContain("Reports API");

    // No hay nada reanudable para ESTE run concreto.
    await expect(continueHistoricalImport(userId)).rejects.toThrow("NOTHING_TO_RESUME");
  });

  it("Reports API recupera un rango de más de 90 días de antigüedad (fuera del alcance de Track API)", async () => {
    if (!dbUp) return;
    // Rango de una sola ventana, muy anterior a "hoy": esto es exactamente lo
    // que Track API rechazaría con HTTP 400 en producción.
    const oldRange = { from: new Date("2024-05-31T00:00:00Z"), to: new Date("2024-06-30T00:00:00Z") };
    fetchSequence([() => entriesResponse([501])]);

    const run = await runHistoricalImport(userId, oldRange);
    createdRunIds.push(run.id);

    expect(run.status).toBe("success");
    expect(run.itemsCreated).toBe(1);
    const row = await prisma.timeEntry.findUnique({ where: { togglTimeEntryId: "501" } });
    expect(row).not.toBeNull();
  });

  it("una ventana que abarca tanto fechas antiguas como recientes se recupera entera en una sola llamada (no hay frontera que cruzar)", async () => {
    if (!dbUp) return;
    // Una sola ventana con entradas de ambos "lados" del antiguo límite de
    // Track API: al venir del Reports API, no hace falta partirla.
    fetchSequence([() => entriesResponse([511, 512])]);

    const range = { from: new Date("2026-05-14T00:00:00Z"), to: new Date("2026-06-13T00:00:00Z") };
    const run = await runHistoricalImport(userId, range);
    createdRunIds.push(run.id);

    expect(run.status).toBe("success");
    expect(run.itemsCreated).toBe(2);
    expect(run.unreachableWindows).toBe(0);
    const rows = await prisma.timeEntry.findMany({
      where: { togglTimeEntryId: { in: ["511", "512"] } },
    });
    expect(rows).toHaveLength(2); // ambos lados recuperados, ninguno perdido
  });

  it("pagina de verdad dentro de una ventana del import histórico (2 páginas, misma ventana)", async () => {
    if (!dbUp) return;
    const fetchMock = fetchSequence([
      () =>
        new Response(JSON.stringify([toReportGroup({ id: 521 })]), {
          status: 200,
          headers: {
            "x-toggl-quota-remaining": "50",
            "x-toggl-quota-resets-in": "3600",
            "x-next-id": "521",
            "x-next-row-number": "2",
          },
        }),
      () =>
        new Response(JSON.stringify([toReportGroup({ id: 522 })]), {
          status: 200,
          headers: { "x-toggl-quota-remaining": "50", "x-toggl-quota-resets-in": "3600" },
        }),
    ]);

    const range = { from: new Date("2026-08-01T00:00:00Z"), to: new Date("2026-08-05T00:00:00Z") };
    const run = await runHistoricalImport(userId, range);
    createdRunIds.push(run.id);

    expect(run.status).toBe("success");
    expect(run.itemsCreated).toBe(2);
    expect(fetchMock.mock.calls.length).toBe(2); // 2 páginas para 1 sola ventana
    const rows = await prisma.timeEntry.findMany({
      where: { togglTimeEntryId: { in: ["521", "522"] } },
    });
    expect(rows).toHaveLength(2);
  });
});

/** Convierte un TogglTimeEntry (forma interna) al shape crudo que devuelve la API real. */
function toRaw(e: TogglTimeEntry) {
  return {
    id: e.id,
    workspace_id: e.workspaceId,
    project_id: e.projectId,
    description: e.description,
    start: e.start,
    stop: e.stop,
    duration: e.durationSeconds,
    tags: e.tags,
    billable: e.billable,
    at: e.updatedAt,
    server_deleted_at: e.deletedAt,
  };
}

/**
 * Construye un "grupo" del Reports API v3 con una sola ocurrencia, en la
 * forma real observada contra la cuenta (ver auditoría 2026-09-05): grupo por
 * usuaria+proyecto+descripción+facturable, con las ocurrencias reales en
 * `time_entries[]`. El `id` de la ocurrencia es el mismo id global que usa
 * Track API (comprobado cruzando una entrada real entre ambas APIs).
 */
function toReportGroup(overrides: Partial<TogglTimeEntry> = {}) {
  const e = entry(overrides);
  return {
    project_id: e.projectId,
    billable: e.billable,
    description: e.description,
    time_entries: [
      {
        id: e.id,
        seconds: e.durationSeconds,
        start: e.start,
        stop: e.stop,
        at: e.updatedAt,
      },
    ],
  };
}
