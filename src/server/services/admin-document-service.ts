import { prisma } from "@/server/db/prisma";
import { audit } from "@/server/audit/audit";
import { listAttachments } from "@/server/services/attachment-service";
import { addDays } from "@/lib/dates";
import type { AdminDocumentInput } from "@/server/validators/admin-document";
import type { Prisma, AdminDocCategory } from "@prisma/client";

const notDeleted = { deletedAt: null } as const;

/** Ventana de aviso previo a una caducidad. */
const EXPIRY_WARNING_DAYS = 60;

export type AdminDocFilters = {
  category?: string;
  fiscalYear?: number;
};

export async function listAdminDocuments(filters: AdminDocFilters = {}) {
  const where: Prisma.AdminDocumentWhereInput = {
    ...notDeleted,
    ...(filters.category ? { category: filters.category as AdminDocCategory } : {}),
    ...(filters.fiscalYear ? { fiscalYear: filters.fiscalYear } : {}),
  };

  const now = new Date();
  const soon = addDays(now, EXPIRY_WARNING_DAYS);

  const [documents, byCategory, years, expiring] = await Promise.all([
    prisma.adminDocument.findMany({
      where,
      orderBy: [
        { fiscalYear: "desc" },
        { issuedAt: "desc" },
        { createdAt: "desc" },
      ],
    }),
    prisma.adminDocument.groupBy({
      by: ["category"],
      where: notDeleted,
      _count: { _all: true },
    }),
    // Ejercicios con documentos, para las pestañas de año.
    prisma.adminDocument.groupBy({
      by: ["fiscalYear"],
      where: { ...notDeleted, fiscalYear: { not: null } },
      _count: { _all: true },
      orderBy: { fiscalYear: "desc" },
    }),
    // Caducados o a punto: es el valor real de tener esto en KAIRAS.
    prisma.adminDocument.findMany({
      where: { ...notDeleted, validUntil: { not: null, lte: soon } },
      orderBy: { validUntil: "asc" },
      select: { id: true, title: true, category: true, validUntil: true },
    }),
  ]);

  return {
    documents,
    byCategory: byCategory.map((row) => ({
      category: row.category,
      count: row._count._all,
    })),
    years: years
      .map((row) => row.fiscalYear)
      .filter((year): year is number => year !== null),
    expiring: expiring.map((doc) => ({
      ...doc,
      expired: doc.validUntil !== null && doc.validUntil < now,
    })),
    stats: {
      total: byCategory.reduce((acc, row) => acc + row._count._all, 0),
      expiringCount: expiring.length,
    },
  };
}

export async function getAdminDocument(id: string) {
  const document = await prisma.adminDocument.findFirst({
    where: { id, ...notDeleted },
  });
  if (!document) return null;
  // Los ficheros viven en Attachment, para no duplicar almacenamiento.
  const files = await listAttachments("admin_document", id);
  return { document, files };
}

function dataFrom(input: AdminDocumentInput) {
  return {
    title: input.title,
    category: input.category,
    fiscalYear: input.fiscalYear ?? null,
    fiscalPeriod: input.fiscalPeriod ?? null,
    issuer: input.issuer ?? null,
    reference: input.reference ?? null,
    amount: input.amount ?? null,
    issuedAt: input.issuedAt ?? null,
    validUntil: input.validUntil ?? null,
    notes: input.notes ?? null,
  };
}

export async function createAdminDocument(
  actorId: string,
  input: AdminDocumentInput,
) {
  const document = await prisma.adminDocument.create({ data: dataFrom(input) });
  await audit({
    actorId,
    action: "create",
    entityType: "AdminDocument",
    entityId: document.id,
    after: { title: document.title, category: document.category },
  });
  return document;
}

export async function updateAdminDocument(
  actorId: string,
  id: string,
  input: AdminDocumentInput,
) {
  const before = await prisma.adminDocument.findFirst({ where: { id, ...notDeleted } });
  if (!before) throw new Error("NOT_FOUND");

  const document = await prisma.adminDocument.update({
    where: { id },
    data: dataFrom(input),
  });
  await audit({
    actorId,
    action: "update",
    entityType: "AdminDocument",
    entityId: id,
    before: { category: before.category },
    after: { category: document.category },
  });
  return document;
}

export async function softDeleteAdminDocument(actorId: string, id: string) {
  const document = await prisma.adminDocument.findFirst({ where: { id, ...notDeleted } });
  if (!document) throw new Error("NOT_FOUND");

  await prisma.adminDocument.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({
    actorId,
    action: "delete",
    entityType: "AdminDocument",
    entityId: id,
    before: { title: document.title },
  });
}
