/**
 * Test de integración contra la BD local. La API de Toggl se mockea vía
 * `fetch`; nunca se llama a la red real. Se salta si no hay BD accesible.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db/prisma";
import { getSetting, setSetting } from "@/server/services/settings-service";
import { patchTogglSettings } from "@/server/services/toggl-connection-service";
import {
  pushTimeEntry,
  deleteTimeEntryInToggl,
  startRemoteTimer,
  stopRemoteTimer,
  retryPendingPushes,
} from "./toggl-push-service";

const MARK = `zzpush_${Date.now()}`;
let dbUp = true;
let userId = "";
let clientId = "";
let projectId = "";
let originalSettings: unknown = null;

function togglRaw(overrides: Record<string, unknown> = {}) {
  return {
    id: 700000001,
    workspace_id: 222,
    project_id: null,
    description: "Push de prueba",
    start: "2026-08-01T09:00:00.000Z",
    stop: "2026-08-01T10:00:00.000Z",
    duration: 3600,
    tags: [],
    billable: true,
    at: "2026-08-01T10:00:01.000Z",
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
    await patchTogglSettings({ workspaceId: 222, workspaceName: MARK });
  } catch {
    dbUp = false;
  }
});

afterAll(async () => {
  if (dbUp) {
    await prisma.timeEntry.deleteMany({ where: { userId } });
    await prisma.timerSession.deleteMany({ where: { userId } });
    await prisma.project.deleteMany({ where: { id: projectId } });
    await prisma.client.deleteMany({ where: { id: clientId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await setSetting("integrations.toggl", originalSettings ?? {});
  }
  await prisma.$disconnect();
}, 30_000);

beforeEach(() => {
  vi.stubEnv("TOGGL_API_TOKEN", "test-token");
});
afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  if (dbUp) {
    await prisma.timeEntry.deleteMany({ where: { userId } });
    await prisma.timerSession.deleteMany({ where: { userId } });
  }
});

describe("pushTimeEntry — crear", () => {
  it("crea en Toggl una entrada nueva y guarda el remote ID", async () => {
    if (!dbUp) return;
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => new Response(JSON.stringify(togglRaw()), { status: 200 }));

    const entry = await prisma.timeEntry.create({
      data: {
        userId,
        title: "Nueva",
        startedAt: new Date("2026-08-01T09:00:00Z"),
        endedAt: new Date("2026-08-01T10:00:00Z"),
        durationSeconds: 3600,
        origin: "kairas",
        syncStatus: "pending",
        billable: true,
      },
    });

    const result = await pushTimeEntry(entry.id);
    expect(result).toEqual({ ok: true, action: "created" });

    const [, options] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(String(options?.body));
    expect(body.created_with).toBe("Kairas CRM");

    const updated = await prisma.timeEntry.findUnique({ where: { id: entry.id } });
    expect(updated?.togglTimeEntryId).toBe("700000001");
    expect(updated?.syncStatus).toBe("synced");
    expect(updated?.lastSyncedAt).not.toBeNull();
  });

  it("un proyecto sin mapping deja la entrada pendiente sin llamar a Toggl", async () => {
    if (!dbUp) return;
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const entry = await prisma.timeEntry.create({
      data: {
        userId,
        projectId,
        startedAt: new Date(),
        endedAt: new Date(Date.now() + 3600_000),
        durationSeconds: 3600,
        origin: "kairas",
        syncStatus: "pending",
        billable: true,
      },
    });

    const result = await pushTimeEntry(entry.id);
    expect(result).toMatchObject({ ok: false, skipped: "NO_PROJECT_MAPPING" });
    expect(fetchMock).not.toHaveBeenCalled();

    const updated = await prisma.timeEntry.findUnique({ where: { id: entry.id } });
    expect(updated?.syncStatus).toBe("pending");
  });

  it("un fallo de la API de Toggl conserva la entrada local intacta", async () => {
    if (!dbUp) return;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response("{}", { status: 500 }));

    const entry = await prisma.timeEntry.create({
      data: {
        userId,
        title: "Sobrevive al fallo",
        startedAt: new Date(),
        endedAt: new Date(Date.now() + 3600_000),
        durationSeconds: 3600,
        origin: "kairas",
        syncStatus: "pending",
        billable: true,
      },
    });

    const result = await pushTimeEntry(entry.id);
    expect(result.ok).toBe(false);

    const stillThere = await prisma.timeEntry.findUnique({ where: { id: entry.id } });
    expect(stillThere).not.toBeNull(); // nunca se pierde
    expect(stillThere?.title).toBe("Sobrevive al fallo");
    expect(stillThere?.syncStatus).toBe("pending");
    expect(stillThere?.syncAttempts).toBe(1);
    expect(stillThere?.lastSyncError).toBeTruthy();
  });
});

describe("pushTimeEntry — editar reutiliza el mismo remote ID", () => {
  it("una segunda llamada actualiza, no crea un duplicado", async () => {
    if (!dbUp) return;
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => new Response(JSON.stringify(togglRaw()), { status: 200 }));

    const entry = await prisma.timeEntry.create({
      data: {
        userId,
        startedAt: new Date("2026-08-01T09:00:00Z"),
        endedAt: new Date("2026-08-01T10:00:00Z"),
        durationSeconds: 3600,
        origin: "kairas",
        syncStatus: "pending",
        billable: true,
      },
    });

    await pushTimeEntry(entry.id); // crea
    await prisma.timeEntry.update({ where: { id: entry.id }, data: { title: "Editada" } });
    const second = await pushTimeEntry(entry.id); // debe actualizar

    expect(second).toEqual({ ok: true, action: "updated" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondCallUrl = String(fetchMock.mock.calls[1]![0]);
    expect(secondCallUrl).toContain("/time_entries/700000001");
    expect(fetchMock.mock.calls[1]![1]?.method).toBe("PUT");
  });
});

describe("deleteTimeEntryInToggl", () => {
  it("borra en Toggl y conserva togglTimeEntryId (trazabilidad)", async () => {
    if (!dbUp) return;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(null, { status: 200 }));

    const entry = await prisma.timeEntry.create({
      data: {
        userId,
        startedAt: new Date(),
        endedAt: new Date(),
        durationSeconds: 60,
        origin: "kairas",
        togglTimeEntryId: "700000002",
        togglWorkspaceId: "222",
        deletedAt: new Date(),
      },
    });

    const result = await deleteTimeEntryInToggl(entry);
    expect(result).toEqual({ ok: true, action: "deleted" });

    const after = await prisma.timeEntry.findUnique({ where: { id: entry.id } });
    expect(after?.togglTimeEntryId).toBe("700000002"); // se conserva
    expect(after?.syncStatus).toBe("synced");
  });

  it("sin remote ID no llama a Toggl (nunca llegó a existir allí)", async () => {
    if (!dbUp) return;
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const entry = await prisma.timeEntry.create({
      data: {
        userId,
        startedAt: new Date(),
        endedAt: new Date(),
        durationSeconds: 60,
        origin: "kairas",
        deletedAt: new Date(),
      },
    });

    const result = await deleteTimeEntryInToggl(entry);
    expect(result).toEqual({ ok: true, action: "deleted" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("cronómetro: startRemoteTimer / stopRemoteTimer", () => {
  it("startRemoteTimer abre una entrada en curso y guarda el remote ID en la sesión", async () => {
    if (!dbUp) return;
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () => new Response(JSON.stringify(togglRaw({ id: 700000003, stop: null, duration: -1 })), { status: 200 }),
    );

    const session = await prisma.timerSession.create({
      data: { userId, active: true, startedAt: new Date(), currentTitle: "En curso" },
    });

    const result = await startRemoteTimer(session);
    expect(result).toEqual({ ok: true, action: "created" });

    const updated = await prisma.timerSession.findUnique({ where: { id: session.id } });
    expect(updated?.togglTimeEntryId).toBe("700000003");
    expect(updated?.togglSyncError).toBeNull();
  });

  it("stopRemoteTimer cierra la MISMA entrada que abrió el arranque", async () => {
    if (!dbUp) return;
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => new Response(JSON.stringify(togglRaw({ id: 700000004 })), { status: 200 }));

    const closedEntry = await prisma.timeEntry.create({
      data: {
        userId,
        startedAt: new Date("2026-08-01T09:00:00Z"),
        endedAt: new Date("2026-08-01T10:00:00Z"),
        durationSeconds: 3600,
        origin: "kairas",
        syncStatus: "pending",
        billable: true,
      },
    });

    const result = await stopRemoteTimer("700000004", "222", closedEntry.id);
    expect(result).toEqual({ ok: true, action: "stopped" });

    const url = String(fetchMock.mock.calls[0]![0]);
    expect(url).toContain("/time_entries/700000004");
    expect(fetchMock.mock.calls[0]![1]?.method).toBe("PUT"); // update, no create -> sin duplicado

    const updated = await prisma.timeEntry.findUnique({ where: { id: closedEntry.id } });
    expect(updated?.togglTimeEntryId).toBe("700000004");
    expect(updated?.syncStatus).toBe("synced");
  });

  it("sin remote ID previo, stopRemoteTimer crea la entrada como cierre normal", async () => {
    if (!dbUp) return;
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () => new Response(JSON.stringify(togglRaw({ id: 700000005 })), { status: 200 }),
    );
    const closedEntry = await prisma.timeEntry.create({
      data: {
        userId,
        startedAt: new Date(),
        endedAt: new Date(),
        durationSeconds: 60,
        origin: "kairas",
        syncStatus: "pending",
        billable: true,
      },
    });

    const result = await stopRemoteTimer(null, null, closedEntry.id);
    expect(result).toEqual({ ok: true, action: "created" });
  });
});

describe("retryPendingPushes", () => {
  it("solo reintenta entradas origin=kairas con estado pending/error", async () => {
    if (!dbUp) return;
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () => new Response(JSON.stringify(togglRaw({ id: 700000006 })), { status: 200 }),
    );

    const pending = await prisma.timeEntry.create({
      data: {
        userId,
        startedAt: new Date(),
        endedAt: new Date(),
        durationSeconds: 60,
        origin: "kairas",
        syncStatus: "pending",
        billable: true,
      },
    });
    const alreadySynced = await prisma.timeEntry.create({
      data: {
        userId,
        startedAt: new Date(),
        endedAt: new Date(),
        durationSeconds: 60,
        origin: "kairas",
        syncStatus: "synced",
        billable: true,
      },
    });
    const fromToggl = await prisma.timeEntry.create({
      data: {
        userId,
        startedAt: new Date(),
        endedAt: new Date(),
        durationSeconds: 60,
        origin: "toggl",
        syncStatus: "pending", // no debería darse en la práctica, pero si se diera, no se reenvía
        billable: true,
      },
    });

    const summary = await retryPendingPushes();
    expect(summary.attempted).toBe(1); // solo `pending`
    expect(summary.synced).toBe(1);

    const updatedPending = await prisma.timeEntry.findUnique({ where: { id: pending.id } });
    expect(updatedPending?.syncStatus).toBe("synced");

    const updatedSynced = await prisma.timeEntry.findUnique({ where: { id: alreadySynced.id } });
    expect(updatedSynced?.togglTimeEntryId).toBeNull(); // ni se tocó

    const updatedFromToggl = await prisma.timeEntry.findUnique({ where: { id: fromToggl.id } });
    expect(updatedFromToggl?.togglTimeEntryId).toBeNull(); // origin toggl, nunca se reenvía
  });

  it("se para antes de agotar la cuota en vez de encadenar todos los reintentos", async () => {
    if (!dbUp) return;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        new Response(JSON.stringify(togglRaw()), {
          status: 200,
          headers: { "x-toggl-quota-remaining": "1", "x-toggl-quota-resets-in": "5" },
        }),
    );

    const entries = await Promise.all(
      [1, 2, 3].map((i) =>
        prisma.timeEntry.create({
          data: {
            userId,
            title: `Pendiente ${i}`,
            startedAt: new Date(),
            endedAt: new Date(Date.now() + 60_000),
            durationSeconds: 60,
            origin: "kairas",
            syncStatus: "pending",
            billable: true,
          },
        }),
      ),
    );

    const summary = await retryPendingPushes();
    expect(summary.stoppedByQuota).toBe(true);
    expect(summary.synced).toBe(1); // se paró tras la primera, no encadenó las 3
    expect(fetchMock.mock.calls.length).toBe(1);

    await prisma.timeEntry.deleteMany({ where: { id: { in: entries.map((e) => e.id) } } });
  });
});
