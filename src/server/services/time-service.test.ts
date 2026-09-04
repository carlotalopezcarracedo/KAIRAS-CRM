/**
 * Autorización (IDOR) de las mutaciones de TimeEntry: `updateEntry`,
 * `softDeleteEntry`, `setEntryStatus`. Contra la BD local real, con dos
 * usuarias (owner / member). `opts: { syncToToggl: false }` en todas las
 * llamadas: esto es autorización, no integración con Toggl, así que no debe
 * depender de tener el token configurado. Se salta si no hay BD accesible.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import { updateEntry, softDeleteEntry, setEntryStatus } from "./time-service";
import type { TimeEntryCreateInput } from "@/server/validators/time";

const MARK = `zzidor_${Date.now()}`;
let dbUp = true;
let ownerId = "";
let memberAId = "";
let memberBId = "";

function baseInput(overrides: Partial<TimeEntryCreateInput> = {}): TimeEntryCreateInput {
  return {
    title: "Entrada",
    workType: "other",
    startedAt: new Date("2026-08-01T09:00:00Z"),
    endedAt: new Date("2026-08-01T10:00:00Z"),
    billable: true,
    ...overrides,
  } as TimeEntryCreateInput;
}

async function makeEntry(owner: string) {
  return prisma.timeEntry.create({
    data: {
      userId: owner,
      title: "Original",
      startedAt: new Date("2026-08-01T09:00:00Z"),
      endedAt: new Date("2026-08-01T10:00:00Z"),
      durationSeconds: 3600,
      origin: "kairas",
      billable: true,
    },
  });
}

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const owner = await prisma.user.create({
      data: { email: `${MARK}-owner@test.kairas`, name: MARK, passwordHash: "x", role: "owner" },
    });
    ownerId = owner.id;
    const a = await prisma.user.create({
      data: { email: `${MARK}-a@test.kairas`, name: MARK, passwordHash: "x", role: "member" },
    });
    memberAId = a.id;
    const b = await prisma.user.create({
      data: { email: `${MARK}-b@test.kairas`, name: MARK, passwordHash: "x", role: "member" },
    });
    memberBId = b.id;
  } catch {
    dbUp = false;
  }
});

afterAll(async () => {
  if (dbUp) {
    await prisma.timeEntry.deleteMany({
      where: { userId: { in: [ownerId, memberAId, memberBId] } },
    });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, memberAId, memberBId] } } });
  }
  await prisma.$disconnect();
}, 30_000);

describe("updateEntry: IDOR", () => {
  it("una usuaria puede editar SU PROPIA entrada", async () => {
    if (!dbUp) return;
    const entry = await makeEntry(memberAId);
    const updated = await updateEntry(
      memberAId,
      entry.id,
      baseInput({ title: "Editada por su dueña" }),
      { syncToToggl: false },
    );
    expect(updated.title).toBe("Editada por su dueña");
    await prisma.timeEntry.delete({ where: { id: entry.id } });
  });

  it("una usuaria NO puede editar la entrada de otra (solo con el ID)", async () => {
    if (!dbUp) return;
    const entry = await makeEntry(memberAId);
    await expect(
      updateEntry(memberBId, entry.id, baseInput({ title: "Intento ajeno" }), {
        syncToToggl: false,
      }),
    ).rejects.toThrow("FORBIDDEN");

    const untouched = await prisma.timeEntry.findUnique({ where: { id: entry.id } });
    expect(untouched?.title).toBe("Original"); // no se modificó
    await prisma.timeEntry.delete({ where: { id: entry.id } });
  });

  it("la propietaria (role owner) puede editar la entrada de cualquiera", async () => {
    if (!dbUp) return;
    const entry = await makeEntry(memberAId);
    const updated = await updateEntry(
      ownerId,
      entry.id,
      baseInput({ title: "Editada por la propietaria" }),
      { syncToToggl: false },
    );
    expect(updated.title).toBe("Editada por la propietaria");
    await prisma.timeEntry.delete({ where: { id: entry.id } });
  });

  it("un ID inexistente da NOT_FOUND independientemente de quién pregunte", async () => {
    if (!dbUp) return;
    await expect(
      updateEntry(memberAId, "no-existe-este-id", baseInput(), { syncToToggl: false }),
    ).rejects.toThrow("NOT_FOUND");
  });
});

describe("softDeleteEntry: IDOR", () => {
  it("una usuaria puede borrar SU PROPIA entrada", async () => {
    if (!dbUp) return;
    const entry = await makeEntry(memberAId);
    await softDeleteEntry(memberAId, entry.id, { syncToToggl: false });
    const row = await prisma.timeEntry.findUnique({ where: { id: entry.id } });
    expect(row?.deletedAt).not.toBeNull();
  });

  it("una usuaria NO puede borrar la entrada de otra", async () => {
    if (!dbUp) return;
    const entry = await makeEntry(memberAId);
    await expect(softDeleteEntry(memberBId, entry.id, { syncToToggl: false })).rejects.toThrow(
      "FORBIDDEN",
    );
    const row = await prisma.timeEntry.findUnique({ where: { id: entry.id } });
    expect(row?.deletedAt).toBeNull(); // sigue viva
    await prisma.timeEntry.delete({ where: { id: entry.id } });
  });

  it("la propietaria puede borrar la entrada de cualquiera", async () => {
    if (!dbUp) return;
    const entry = await makeEntry(memberBId);
    await softDeleteEntry(ownerId, entry.id, { syncToToggl: false });
    const row = await prisma.timeEntry.findUnique({ where: { id: entry.id } });
    expect(row?.deletedAt).not.toBeNull();
  });
});

describe("setEntryStatus: IDOR", () => {
  it("una usuaria puede cambiar el estado de SU PROPIA entrada", async () => {
    if (!dbUp) return;
    const entry = await makeEntry(memberAId);
    const updated = await setEntryStatus(memberAId, entry.id, "reviewed");
    expect(updated.status).toBe("reviewed");
    await prisma.timeEntry.delete({ where: { id: entry.id } });
  });

  it("una usuaria NO puede cambiar el estado de la entrada de otra", async () => {
    if (!dbUp) return;
    const entry = await makeEntry(memberAId);
    await expect(setEntryStatus(memberBId, entry.id, "reviewed")).rejects.toThrow("FORBIDDEN");
    const row = await prisma.timeEntry.findUnique({ where: { id: entry.id } });
    expect(row?.status).toBe("draft"); // sin cambios
    await prisma.timeEntry.delete({ where: { id: entry.id } });
  });

  it("la propietaria puede cambiar el estado de cualquier entrada", async () => {
    if (!dbUp) return;
    const entry = await makeEntry(memberAId);
    const updated = await setEntryStatus(ownerId, entry.id, "approved");
    expect(updated.status).toBe("approved");
    await prisma.timeEntry.delete({ where: { id: entry.id } });
  });
});
