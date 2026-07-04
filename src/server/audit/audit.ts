import { prisma } from "@/server/db/prisma";
import type { AuditAction, Prisma } from "@prisma/client";

/**
 * Registra una acción importante en el audit log.
 * Nunca lanza: un fallo de auditoría no debe romper la operación principal.
 */
export async function audit(params: {
  actorId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        before: (params.before ?? undefined) as Prisma.InputJsonValue | undefined,
        after: (params.after ?? undefined) as Prisma.InputJsonValue | undefined,
        metadata: (params.metadata ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
      },
    });
  } catch (err) {
    console.error("[audit] error al registrar", err);
  }
}
