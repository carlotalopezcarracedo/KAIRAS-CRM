/** Test de integración contra la BD local. Se salta si no hay BD accesible. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import { confirmProjectMapping, listProjectMappings } from "./toggl-mapping-service";

const MARK = `zzmap_${Date.now()}`;
let dbUp = true;
let userId = "";
let clientId = "";
let projectId = "";
let otherProjectId = "";
const mappingIds: string[] = [];

// Nota: este archivo NO toca Settings("integrations.toggl") a propósito.
// confirmProjectMapping/listProjectMappings no dependen del workspace
// seleccionado, y ese ajuste es una fila singleton compartida con
// toggl-sync-service.test.ts — escribirla desde dos archivos que Vitest
// ejecuta en paralelo provoca una carrera real entre ambos.
beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    const user = await prisma.user.create({
      data: { email: `${MARK}@test.kairas`, name: MARK, passwordHash: "x", role: "owner" },
    });
    userId = user.id;
    const client = await prisma.client.create({ data: { name: MARK } });
    clientId = client.id;
    const project = await prisma.project.create({ data: { name: MARK, clientId } });
    projectId = project.id;
    const otherProject = await prisma.project.create({ data: { name: `${MARK}-otro`, clientId } });
    otherProjectId = otherProject.id;
  } catch {
    dbUp = false;
  }
});

afterAll(async () => {
  if (dbUp) {
    await prisma.timeEntry.deleteMany({ where: { userId } });
    if (mappingIds.length) {
      await prisma.togglProjectMapping.deleteMany({ where: { id: { in: mappingIds } } });
    }
    await prisma.project.deleteMany({ where: { id: { in: [projectId, otherProjectId] } } });
    await prisma.client.deleteMany({ where: { id: clientId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
}, 30_000);

describe("confirmProjectMapping", () => {
  it("confirmar un mapping reasigna las TimeEntry 'sin asignar' que tenían ese togglProjectId", async () => {
    if (!dbUp) return;

    const mapping = await prisma.togglProjectMapping.create({
      data: {
        togglProjectId: `${MARK}-p1`,
        togglProjectName: "Proyecto sin mapear",
        togglWorkspaceId: "999",
        kairasProjectId: null,
      },
    });
    mappingIds.push(mapping.id);

    const entryA = await prisma.timeEntry.create({
      data: {
        userId,
        startedAt: new Date("2026-08-01T09:00:00Z"),
        endedAt: new Date("2026-08-01T10:00:00Z"),
        durationSeconds: 3600,
        origin: "toggl",
        source: "toggl_import",
        togglTimeEntryId: `${MARK}-te1`,
        togglProjectId: `${MARK}-p1`,
        projectId: null,
      },
    });

    const result = await confirmProjectMapping(userId, mapping.id, projectId);
    expect(result.reassigned).toBe(1);

    const updated = await prisma.timeEntry.findUnique({ where: { id: entryA.id } });
    expect(updated?.projectId).toBe(projectId);
    expect(updated?.clientId).toBe(clientId);

    const mappings = await listProjectMappings();
    const row = mappings.find((m) => m.id === mapping.id);
    expect(row?.confirmed).toBe(true);
    expect(row?.kairasProjectId).toBe(projectId);
  });

  it("confirmar como 'ignorar' (sin proyecto) no reasigna nada y no vuelve a aparecer como pendiente", async () => {
    if (!dbUp) return;

    const mapping = await prisma.togglProjectMapping.create({
      data: {
        togglProjectId: `${MARK}-p2`,
        togglProjectName: "Proyecto personal (ignorar)",
        togglWorkspaceId: "999",
        kairasProjectId: null,
      },
    });
    mappingIds.push(mapping.id);

    const result = await confirmProjectMapping(userId, mapping.id, null);
    expect(result.reassigned).toBe(0);

    const mappings = await listProjectMappings();
    const row = mappings.find((m) => m.id === mapping.id);
    expect(row?.confirmed).toBe(true); // confirmado, aunque sin proyecto
    expect(row?.kairasProjectId).toBeNull();
  });

  it("confirmar contra un proyecto Kairas inexistente falla sin tocar nada", async () => {
    if (!dbUp) return;
    const mapping = await prisma.togglProjectMapping.create({
      data: {
        togglProjectId: `${MARK}-p3`,
        togglProjectName: "X",
        togglWorkspaceId: "999",
        kairasProjectId: null,
      },
    });
    mappingIds.push(mapping.id);

    await expect(confirmProjectMapping(userId, mapping.id, "no-existe")).rejects.toThrow(
      "PROJECT_NOT_FOUND",
    );
  });

  it("confirmar dos veces el mismo mapping es idempotente (no reasigna ni duplica la segunda vez)", async () => {
    if (!dbUp) return;
    const mapping = await prisma.togglProjectMapping.create({
      data: {
        togglProjectId: `${MARK}-p4`,
        togglProjectName: "Proyecto doble confirmación",
        togglWorkspaceId: "999",
        kairasProjectId: null,
      },
    });
    mappingIds.push(mapping.id);

    const entryA = await prisma.timeEntry.create({
      data: {
        userId,
        startedAt: new Date("2026-08-01T09:00:00Z"),
        endedAt: new Date("2026-08-01T10:00:00Z"),
        durationSeconds: 3600,
        origin: "toggl",
        source: "toggl_import",
        togglTimeEntryId: `${MARK}-te4`,
        togglProjectId: `${MARK}-p4`,
        projectId: null,
      },
    });

    const first = await confirmProjectMapping(userId, mapping.id, projectId);
    expect(first.reassigned).toBe(1);

    const second = await confirmProjectMapping(userId, mapping.id, projectId);
    expect(second.reassigned).toBe(0); // ya no queda ninguna "sin asignar" con ese togglProjectId

    const after = await prisma.timeEntry.findUnique({ where: { id: entryA.id } });
    expect(after?.projectId).toBe(projectId); // sigue correcto, sin duplicar nada
  });

  it("no reasigna una TimeEntry que ya tiene una asociación Kairas explícita distinta", async () => {
    if (!dbUp) return;
    const mapping = await prisma.togglProjectMapping.create({
      data: {
        togglProjectId: `${MARK}-p5`,
        togglProjectName: "Proyecto con entrada ya asociada a otra cosa",
        togglWorkspaceId: "999",
        kairasProjectId: null,
      },
    });
    mappingIds.push(mapping.id);

    // Esta entrada YA tiene un proyecto Kairas asignado explícitamente
    // (distinto del que se va a confirmar en el mapping) -- p.ej. alguien la
    // reasignó a mano antes de que existiera el mapping automático.
    const alreadyAssigned = await prisma.timeEntry.create({
      data: {
        userId,
        startedAt: new Date("2026-08-01T09:00:00Z"),
        endedAt: new Date("2026-08-01T10:00:00Z"),
        durationSeconds: 3600,
        origin: "toggl",
        source: "toggl_import",
        togglTimeEntryId: `${MARK}-te5`,
        togglProjectId: `${MARK}-p5`,
        projectId: otherProjectId, // asociación explícita ya existente
      },
    });

    const result = await confirmProjectMapping(userId, mapping.id, projectId);
    expect(result.reassigned).toBe(0); // no la toca

    const after = await prisma.timeEntry.findUnique({ where: { id: alreadyAssigned.id } });
    expect(after?.projectId).toBe(otherProjectId); // conserva su asociación explícita
  });
});
