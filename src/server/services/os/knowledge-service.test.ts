/**
 * Test de integración del servicio de conocimiento contra la BD local (os_*).
 * Crea sus propios datos con externalKey único y los borra al final (afterAll).
 * No toca datos de la semilla ni del CRM. Se salta si no hay BD accesible.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db/prisma";
import {
  createEntry,
  updateEntry,
  archiveEntry,
  getEntry,
  listEntries,
  searchEntries,
  addRelation,
  removeRelation,
  toggleFavorite,
  isFavorite,
  listFavorites,
  setEntryTags,
  softDeleteEntry,
} from "./knowledge-service";

const TAG = `test_${Date.now()}`;
const USER = `test-user-${Date.now()}`;
let dbUp = true;
const createdIds: string[] = [];

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbUp = false;
  }
});

afterAll(async () => {
  if (dbUp) {
    for (const id of createdIds) {
      await prisma.knowledgeRelation.deleteMany({ where: { OR: [{ fromId: id }, { toId: id }] } });
      await prisma.knowledgeFavorite.deleteMany({ where: { entryId: id } });
      await prisma.knowledgeEntryTag.deleteMany({ where: { entryId: id } });
      await prisma.knowledgeVersion.deleteMany({ where: { entryId: id } });
      await prisma.knowledgeEntry.delete({ where: { id } }).catch(() => {});
    }
    await prisma.knowledgeTag.deleteMany({ where: { slug: { startsWith: "ztag-" } } });
  }
  await prisma.$disconnect();
});

describe("knowledge-service (integración)", () => {
  it("crea una entrada y genera snapshot v1", async () => {
    if (!dbUp) return;
    const e = await createEntry(
      { type: "principio", area: `zz-${TAG}`, title: "Entrada de prueba", status: "vigente", authority: "operativo", businessLine: "transversal", messageLayer: "na", body: "cuerpo alfa" },
      USER,
    );
    createdIds.push(e.id);
    const detail = await getEntry(e.id);
    expect(detail?.title).toBe("Entrada de prueba");
    expect(detail?.currentVersion).toBe(1);
    expect(detail?.versions.length).toBe(1);
    expect(detail?.versions[0]?.version).toBe(1);
  });

  it("al actualizar incrementa versión y guarda historial", async () => {
    if (!dbUp) return;
    const e = await createEntry(
      { type: "regla", area: `zz-${TAG}`, title: "Regla v1", status: "borrador", authority: "operativo", businessLine: "transversal", messageLayer: "na" },
      USER,
    );
    createdIds.push(e.id);
    await updateEntry({ id: e.id, title: "Regla v2", status: "vigente", changeReason: "prueba de edición" });
    const detail = await getEntry(e.id);
    expect(detail?.title).toBe("Regla v2");
    expect(detail?.status).toBe("vigente");
    expect(detail?.currentVersion).toBe(2);
    expect(detail?.versions.length).toBeGreaterThanOrEqual(2);
  });

  it("filtra por área y busca por texto", async () => {
    if (!dbUp) return;
    const e = await createEntry(
      { type: "definicion", area: `zz-${TAG}`, title: "Zafiro singular", status: "vigente", authority: "operativo", businessLine: "transversal", messageLayer: "na", summary: "palabra clave zafiro" },
      USER,
    );
    createdIds.push(e.id);
    const list = await listEntries({ area: `zz-${TAG}` });
    expect(list.some((x) => x.id === e.id)).toBe(true);
    const found = await searchEntries("Zafiro singular");
    expect(found.some((x) => x.id === e.id)).toBe(true);
  });

  it("crea y elimina relaciones sin tocar entidades del CRM", async () => {
    if (!dbUp) return;
    const a = await createEntry({ type: "hipotesis", area: `zz-${TAG}`, title: "H-test", status: "provisional", authority: "operativo", businessLine: "transversal", messageLayer: "na" }, USER);
    const b = await createEntry({ type: "oferta", area: `zz-${TAG}`, title: "Oferta-test", status: "provisional", authority: "operativo", businessLine: "transversal", messageLayer: "na" }, USER);
    createdIds.push(a.id, b.id);
    const rel = await addRelation(a.id, b.id, "valida", "nota");
    expect(rel.fromId).toBe(a.id);
    await removeRelation(rel.id);
    const detail = await getEntry(a.id);
    expect(detail?.relationsFrom.length).toBe(0);
  });

  it("rechaza relacionar una entrada consigo misma", async () => {
    if (!dbUp) return;
    const a = await createEntry({ type: "regla", area: `zz-${TAG}`, title: "Auto-rel", status: "vigente", authority: "operativo", businessLine: "transversal", messageLayer: "na" }, USER);
    createdIds.push(a.id);
    await expect(addRelation(a.id, a.id, "relacionado")).rejects.toThrow();
  });

  it("alterna favoritos por usuario", async () => {
    if (!dbUp) return;
    const e = await createEntry({ type: "playbook", area: `zz-${TAG}`, title: "Fav-test", status: "vigente", authority: "operativo", businessLine: "transversal", messageLayer: "na" }, USER);
    createdIds.push(e.id);
    expect(await isFavorite(e.id, USER)).toBe(false);
    expect(await toggleFavorite(e.id, USER)).toBe(true);
    expect(await isFavorite(e.id, USER)).toBe(true);
    expect(await toggleFavorite(e.id, USER)).toBe(false);
  });

  it("el borrado suave excluye de los listados", async () => {
    if (!dbUp) return;
    const e = await createEntry({ type: "recurso", area: `zz-${TAG}`, title: "Borrar-test", status: "vigente", authority: "operativo", businessLine: "transversal", messageLayer: "na" }, USER);
    createdIds.push(e.id);
    await softDeleteEntry(e.id);
    const list = await listEntries({ area: `zz-${TAG}` });
    expect(list.some((x) => x.id === e.id)).toBe(false);
    expect(await getEntry(e.id)).toBeNull();
  });

  it("archivar cambia el estado sin borrar y versiona", async () => {
    if (!dbUp) return;
    const e = await createEntry({ type: "definicion", area: `zz-${TAG}`, title: "Archivar-test", status: "vigente", authority: "operativo", businessLine: "transversal", messageLayer: "na" }, USER);
    createdIds.push(e.id);
    await archiveEntry(e.id, USER, "fin de vigencia");
    const detail = await getEntry(e.id);
    expect(detail).not.toBeNull(); // NO se borra
    expect(detail?.status).toBe("archivado");
    expect(detail?.currentVersion).toBe(2);
    expect(detail?.deletedAt).toBeNull();
  });

  it("el borrado NO es destructivo: la fila sigue en BD y es recuperable", async () => {
    if (!dbUp) return;
    const e = await createEntry({ type: "recurso", area: `zz-${TAG}`, title: "NoDestructivo-test", status: "vigente", authority: "operativo", businessLine: "transversal", messageLayer: "na" }, USER);
    createdIds.push(e.id);
    await softDeleteEntry(e.id);
    // La fila persiste físicamente (solo marcada con deletedAt): recuperable.
    const raw = await prisma.knowledgeEntry.findUnique({ where: { id: e.id } });
    expect(raw).not.toBeNull();
    expect(raw?.deletedAt).not.toBeNull();
    // Recuperar limpiando deletedAt la devuelve a los listados.
    await prisma.knowledgeEntry.update({ where: { id: e.id }, data: { deletedAt: null } });
    expect(await getEntry(e.id)).not.toBeNull();
  });

  it("busca por contenido editado (no por el antiguo)", async () => {
    if (!dbUp) return;
    const e = await createEntry({ type: "mensaje", area: `zz-${TAG}`, title: "Palabra-antigua-xyz", status: "borrador", authority: "operativo", businessLine: "transversal", messageLayer: "na" }, USER);
    createdIds.push(e.id);
    await updateEntry({ id: e.id, title: "Palabra-nueva-abc" }, USER);
    const nuevos = await searchEntries("Palabra-nueva-abc");
    expect(nuevos.some((x) => x.id === e.id)).toBe(true);
    const viejos = await searchEntries("Palabra-antigua-xyz");
    expect(viejos.some((x) => x.id === e.id)).toBe(false);
  });

  it("filtra por estado", async () => {
    if (!dbUp) return;
    const vig = await createEntry({ type: "regla", area: `zzf-${TAG}`, title: "Filtro-vigente", status: "vigente", authority: "operativo", businessLine: "transversal", messageLayer: "na" }, USER);
    const bor = await createEntry({ type: "regla", area: `zzf-${TAG}`, title: "Filtro-borrador", status: "borrador", authority: "operativo", businessLine: "transversal", messageLayer: "na" }, USER);
    createdIds.push(vig.id, bor.id);
    const soloVigentes = await listEntries({ area: `zzf-${TAG}`, status: "vigente" });
    expect(soloVigentes.some((x) => x.id === vig.id)).toBe(true);
    expect(soloVigentes.some((x) => x.id === bor.id)).toBe(false);
  });

  it("persiste favoritos entre consultas", async () => {
    if (!dbUp) return;
    const e = await createEntry({ type: "playbook", area: `zz-${TAG}`, title: "FavPersist-test", status: "vigente", authority: "operativo", businessLine: "transversal", messageLayer: "na" }, USER);
    createdIds.push(e.id);
    await toggleFavorite(e.id, USER);
    const favs = await listFavorites(USER);
    expect(favs.some((x) => x.id === e.id)).toBe(true);
  });

  it("sincroniza etiquetas (crea las que faltan, sin duplicar)", async () => {
    if (!dbUp) return;
    const e = await createEntry({ type: "definicion", area: `zz-${TAG}`, title: "Tags-test", status: "vigente", authority: "operativo", businessLine: "transversal", messageLayer: "na" }, USER);
    createdIds.push(e.id);
    await setEntryTags(e.id, ["ztag Uno", "ztag Dos", "ztag Uno"]); // duplicado ignorado
    let detail = await getEntry(e.id);
    expect(detail?.tags.length).toBe(2);
    await setEntryTags(e.id, ["ztag Uno"]); // reemplaza el conjunto
    detail = await getEntry(e.id);
    expect(detail?.tags.length).toBe(1);
    expect(detail?.tags[0].tag.slug).toBe("ztag-uno");
  });
});
