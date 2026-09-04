/**
 * Test de integración de la ruta pública del webhook, contra la BD local
 * real. `resolveWebhookActorId()` no está mockeado a propósito -- se
 * comprueba el comportamiento real, que atribuye siempre a la MISMA
 * propietaria existente (la más antigua con role="owner"), sea cual sea la
 * usuaria de prueba que creemos aquí. `fetch` se espía y se hace fallar si se
 * llama: esta ruta NUNCA debe salir a la red. Se salta si no hay BD accesible.
 *
 * Cada test usa su propio togglTimeEntryId en un rango dedicado
 * (>= FIRST_TEST_ID) para no chocar ni con otros tests ni con datos reales,
 * y la limpieza está siempre acotada a `userId: realOwnerId` + ese rango: en
 * ningún caso se borra un dato de la propietaria real fuera de ese rango.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db/prisma";
import { signTogglPayload } from "@/integrations/toggl/webhooks";
import { resolveWebhookActorId } from "@/server/services/toggl-webhook-service";
import { POST } from "./route";

const SECRET = "test-webhook-secret";
let dbUp = true;
let realOwnerId = "";
const FIRST_TEST_ID = 810000000;
let nextId = FIRST_TEST_ID;
function freshId(): number {
  nextId += 1;
  return nextId;
}
function ownedTestData() {
  return { userId: realOwnerId, togglTimeEntryId: { gte: String(FIRST_TEST_ID) } } as const;
}

function request(body: string, opts: { signature?: string | null; contentType?: string } = {}) {
  const headers: Record<string, string> = {
    "content-type": opts.contentType ?? "application/json",
  };
  const signature = opts.signature === undefined ? signTogglPayload(body, SECRET) : opts.signature;
  if (signature !== null) headers["x-webhook-signature-256"] = signature;
  return new Request("http://localhost/api/webhooks/toggl", {
    method: "POST",
    headers,
    body,
  });
}

function envelope(overrides: Record<string, unknown> = {}, payloadOverrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    event_id: Math.floor(Math.random() * 1_000_000_000),
    timestamp: new Date().toISOString(),
    metadata: { action: "created", model: "time_entry" },
    payload: {
      id: freshId(),
      workspace_id: 333,
      description: "Desde el webhook",
      start: "2026-08-01T09:00:00.000Z",
      stop: "2026-08-01T10:00:00.000Z",
      duration: 3600,
      billable: true,
      at: new Date().toISOString(),
      ...payloadOverrides,
    },
    ...overrides,
  });
}

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const actorId = await resolveWebhookActorId();
    if (!actorId) throw new Error("No hay ninguna usuaria en la BD local para atribuir el webhook.");
    realOwnerId = actorId;
    // Rango de prueba limpio antes de empezar, por si una ejecución anterior
    // se interrumpió antes de su propia limpieza.
    await prisma.timeEntry.deleteMany({ where: ownedTestData() });
    await prisma.timerSession.deleteMany({ where: ownedTestData() });
  } catch {
    dbUp = false;
  }
});

afterAll(async () => {
  if (dbUp) {
    await prisma.timeEntry.deleteMany({ where: ownedTestData() });
    await prisma.timerSession.deleteMany({ where: ownedTestData() });
  }
  await prisma.$disconnect();
}, 30_000);

beforeEach(() => {
  vi.stubEnv("TOGGL_WEBHOOK_SECRET", SECRET);
  // Ninguna llamada a fetch debe salir de esta ruta jamás.
  vi.spyOn(globalThis, "fetch").mockImplementation(() => {
    throw new Error("La ruta del webhook no debe llamar a la red");
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("firma", () => {
  it("firma válida: procesa el evento", async () => {
    if (!dbUp) return;
    const res = await POST(request(envelope()));
    expect(res.status).toBe(200);
  });

  it("firma inválida: 401, no escribe nada", async () => {
    if (!dbUp) return;
    const id = freshId();
    const body = envelope({}, { id });
    const res = await POST(request(body, { signature: signTogglPayload(body, "otro-secreto") }));
    expect(res.status).toBe(401);
    const row = await prisma.timeEntry.findUnique({ where: { togglTimeEntryId: String(id) } });
    expect(row).toBeNull();
  });

  it("firma ausente: 401", async () => {
    if (!dbUp) return;
    const res = await POST(request(envelope(), { signature: null }));
    expect(res.status).toBe(401);
  });

  it("cuerpo vacío: 400, ni intenta verificar firma sobre nada", async () => {
    if (!dbUp) return;
    const res = await POST(request("", { signature: "sha256=" + "0".repeat(64) }));
    expect(res.status).toBe(400);
  });
});

describe("validation_code", () => {
  it("responde exactamente {validation_code: <mismo código>}", async () => {
    if (!dbUp) return;
    const body = JSON.stringify({ validation_code: "abc123xyz" });
    const res = await POST(request(body, { signature: signTogglPayload(body, SECRET) }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ validation_code: "abc123xyz" });
  });
});

describe("eventos time_entry", () => {
  afterEach(async () => {
    if (dbUp) {
      await prisma.timeEntry.deleteMany({ where: ownedTestData() });
      await prisma.timerSession.deleteMany({ where: ownedTestData() });
    }
  });

  it("created: crea la entrada en Kairas con origin=toggl, atribuida a la propietaria", async () => {
    if (!dbUp) return;
    const id = freshId();
    const res = await POST(request(envelope({}, { id })));
    expect(res.status).toBe(200);

    const row = await prisma.timeEntry.findUnique({ where: { togglTimeEntryId: String(id) } });
    expect(row).not.toBeNull();
    expect(row?.origin).toBe("toggl");
    expect(row?.syncStatus).toBe("synced");
    expect(row?.userId).toBe(realOwnerId);
  });

  it("dos entregas idénticas del mismo evento son idempotentes (sin duplicar)", async () => {
    if (!dbUp) return;
    const id = freshId();
    const body = envelope({ event_id: 42 }, { id });
    await POST(request(body));
    const second = await POST(request(body));
    expect(second.status).toBe(200);

    const rows = await prisma.timeEntry.findMany({ where: { togglTimeEntryId: String(id) } });
    expect(rows).toHaveLength(1);
  });

  it("updated: actualiza la entrada existente en vez de crear otra", async () => {
    if (!dbUp) return;
    const id = freshId();
    await POST(request(envelope({}, { id })));

    const updatedBody = envelope(
      { metadata: { action: "updated", model: "time_entry" } },
      { id, description: "Título cambiado", at: new Date(Date.now() + 60_000).toISOString() },
    );
    await POST(request(updatedBody));

    const rows = await prisma.timeEntry.findMany({ where: { togglTimeEntryId: String(id) } });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.title).toBe("Título cambiado");
  });

  it("deleted: hace soft delete de la entrada existente", async () => {
    if (!dbUp) return;
    const id = freshId();
    await POST(request(envelope({}, { id })));

    const deletedBody = envelope(
      { metadata: { action: "deleted", model: "time_entry" } },
      { id, at: new Date(Date.now() + 120_000).toISOString() },
    );
    await POST(request(deletedBody));

    const row = await prisma.timeEntry.findUnique({ where: { togglTimeEntryId: String(id) } });
    expect(row?.deletedAt).not.toBeNull();
  });

  it("una entrada activa (stop=null) crea una TimerSession, no una TimeEntry", async () => {
    if (!dbUp) return;
    // Precondición: sin esto, un cronómetro ya activo para la propietaria
    // (nativo o de otra prueba) haría que esta entrada entre en conflicto
    // por diseño (ver toggl-sync-service.ts) en vez de crear sesión.
    const preexisting = await prisma.timerSession.findMany({ where: { userId: realOwnerId } });
    if (preexisting.length > 0) {
      throw new Error(
        `Hay ${preexisting.length} TimerSession activa(s) para la propietaria antes de este test; ` +
          "límpialas manualmente para no falsear el resultado.",
      );
    }

    const id = freshId();
    const body = envelope(
      {},
      {
        id,
        description: "Cronómetro desde Toggl",
        stop: null,
        duration: -1754000000,
      },
    );
    const res = await POST(request(body));
    expect(res.status).toBe(200);

    const session = await prisma.timerSession.findFirst({ where: { togglTimeEntryId: String(id) } });
    expect(session).not.toBeNull();
    const asEntry = await prisma.timeEntry.findUnique({ where: { togglTimeEntryId: String(id) } });
    expect(asEntry).toBeNull();
  });

  it("evento antiguo (posible reenvío) se descarta sin aplicarse", async () => {
    if (!dbUp) return;
    const id = freshId();
    const body = envelope(
      { event_id: 999, timestamp: new Date(Date.now() - 3600_000).toISOString() }, // 1h en el pasado
      { id },
    );
    const res = await POST(request(body));
    expect(res.status).toBe(200);

    const row = await prisma.timeEntry.findUnique({ where: { togglTimeEntryId: String(id) } });
    expect(row).toBeNull(); // nunca se aplicó
  });

  it("nunca llama a fetch (no puede activar un push de vuelta a Toggl)", async () => {
    if (!dbUp) return;
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await POST(request(envelope()));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
