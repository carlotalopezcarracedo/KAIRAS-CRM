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
    const fixture = [entry({ id: 201 }), entry({ id: 202 })].map(toRaw);
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
      async () => new Response(JSON.stringify([entry({ id: 301 })].map(toRaw)), { status: 200 }),
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
      async () => new Response(JSON.stringify([entry({ id: 302 })].map(toRaw)), { status: 200 }),
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

    expect(run.status).toBe("error"); // incompleto: hace falta reintentarlo
    expect(run.error).toContain("cuota");
    // Se paró tras la primera ventana en vez de agotar la cuota en las 3.
    expect(fetchMock.mock.calls.length).toBe(1);
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
