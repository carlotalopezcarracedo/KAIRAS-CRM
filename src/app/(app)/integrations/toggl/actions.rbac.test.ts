/**
 * RBAC de las acciones de Toggl, contra la BD local real (dos usuarias: una
 * "owner", otra "member"). Todos los servicios que llaman a la red se
 * mockean: aquí solo interesa si la puerta de permisos deja pasar o no.
 * Se salta si no hay BD accesible.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db/prisma";

const MARK = `zzrbac_${Date.now()}`;
let dbUp = true;
let ownerId = "";
let memberId = "";
let currentUserId = "";

vi.mock("@/server/auth", () => ({
  requireUser: vi.fn(async () => ({ id: currentUserId, email: "rbac@test.kairas" })),
}));

vi.mock("@/server/services/toggl-connection-service", () => ({
  checkTogglConnection: vi.fn().mockResolvedValue({
    ok: true,
    account: { email: null, fullname: null },
    workspaces: [],
    selectedWorkspaceId: null,
  }),
  selectTogglWorkspace: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/services/toggl-sync-service", () => ({
  runHistoricalImport: vi.fn().mockResolvedValue({}),
  runReconciliation: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/server/services/toggl-mapping-service", () => ({
  refreshProjectMappings: vi.fn().mockResolvedValue({}),
  confirmProjectMapping: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/server/services/toggl-webhook-service", () => ({
  configureWebhook: vi.fn().mockResolvedValue({}),
  pingWebhook: vi.fn().mockResolvedValue({}),
  refreshWebhookStatus: vi.fn().mockResolvedValue({}),
  removeWebhook: vi.fn().mockResolvedValue({}),
  describeWebhookError: () => "error de webhook",
}));

vi.mock("@/server/services/toggl-push-service", () => ({
  pushTimeEntry: vi.fn().mockResolvedValue({ ok: true, action: "updated" }),
  retryPendingPushes: vi.fn().mockResolvedValue({}),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  checkConnectionAction,
  selectWorkspaceAction,
  importHistoricalAction,
  reconcileNowAction,
  refreshMappingsAction,
  confirmMappingAction,
  configureWebhookAction,
  pingWebhookAction,
  refreshWebhookAction,
  removeWebhookAction,
  retryEntrySyncAction,
  retryPendingSyncAction,
} from "./actions";

function importForm(): FormData {
  const fd = new FormData();
  fd.set("from", "2026-01-01");
  fd.set("to", "2026-01-31");
  return fd;
}

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const owner = await prisma.user.create({
      data: { email: `${MARK}-owner@test.kairas`, name: MARK, passwordHash: "x", role: "owner" },
    });
    ownerId = owner.id;
    const member = await prisma.user.create({
      data: { email: `${MARK}-member@test.kairas`, name: MARK, passwordHash: "x", role: "member" },
    });
    memberId = member.id;
  } catch {
    dbUp = false;
  }
});

afterAll(async () => {
  if (dbUp) {
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, memberId] } } });
  }
  await prisma.$disconnect();
});

const adminActions: Array<[string, () => Promise<{ ok: boolean; error?: string }>]> = [
  ["checkConnectionAction", () => checkConnectionAction()],
  ["selectWorkspaceAction", () => selectWorkspaceAction(1, "ws")],
  ["importHistoricalAction", () => importHistoricalAction(undefined, importForm())],
  ["reconcileNowAction", () => reconcileNowAction()],
  ["refreshMappingsAction", () => refreshMappingsAction()],
  ["confirmMappingAction", () => confirmMappingAction("m1", null)],
  ["configureWebhookAction", () => configureWebhookAction()],
  ["pingWebhookAction", () => pingWebhookAction()],
  ["refreshWebhookAction", () => refreshWebhookAction()],
  ["removeWebhookAction", () => removeWebhookAction()],
  ["retryPendingSyncAction", () => retryPendingSyncAction()],
];

describe("Administración de la integración Toggl: solo la propietaria", () => {
  it.each(adminActions)("%s rechaza a una usuaria sin rol owner", async (_name, run) => {
    if (!dbUp) return;
    currentUserId = memberId;
    const result = await run();
    expect(result.ok).toBe(false);
  });

  it.each(adminActions)("%s permite a la propietaria", async (_name, run) => {
    if (!dbUp) return;
    currentUserId = ownerId;
    const result = await run();
    expect(result.ok).toBe(true);
  });
});

describe("retryEntrySyncAction: propiedad de la entrada, no solo rol", () => {
  it("una usuaria no-owner puede reintentar SU PROPIA entrada", async () => {
    if (!dbUp) return;
    currentUserId = memberId;
    const e = await prisma.timeEntry.create({
      data: {
        userId: memberId,
        startedAt: new Date(),
        endedAt: new Date(),
        durationSeconds: 60,
        origin: "kairas",
      },
    });
    const result = await retryEntrySyncAction(e.id);
    expect(result.ok).toBe(true);
    await prisma.timeEntry.delete({ where: { id: e.id } });
  });

  it("una usuaria no-owner NO puede reintentar la entrada de otra persona", async () => {
    if (!dbUp) return;
    currentUserId = memberId;
    const e = await prisma.timeEntry.create({
      data: {
        userId: ownerId,
        startedAt: new Date(),
        endedAt: new Date(),
        durationSeconds: 60,
        origin: "kairas",
      },
    });
    const result = await retryEntrySyncAction(e.id);
    expect(result.ok).toBe(false);
    await prisma.timeEntry.delete({ where: { id: e.id } });
  });

  it("la propietaria puede reintentar entradas de cualquier usuaria", async () => {
    if (!dbUp) return;
    currentUserId = ownerId;
    const e = await prisma.timeEntry.create({
      data: {
        userId: memberId,
        startedAt: new Date(),
        endedAt: new Date(),
        durationSeconds: 60,
        origin: "kairas",
      },
    });
    const result = await retryEntrySyncAction(e.id);
    expect(result.ok).toBe(true);
    await prisma.timeEntry.delete({ where: { id: e.id } });
  });

  it("una entrada de origen Toggl no se reenvía aunque sea propia", async () => {
    if (!dbUp) return;
    currentUserId = ownerId;
    const e = await prisma.timeEntry.create({
      data: {
        userId: ownerId,
        startedAt: new Date(),
        endedAt: new Date(),
        durationSeconds: 60,
        origin: "toggl",
      },
    });
    const result = await retryEntrySyncAction(e.id);
    expect(result.ok).toBe(false);
    await prisma.timeEntry.delete({ where: { id: e.id } });
  });
});
