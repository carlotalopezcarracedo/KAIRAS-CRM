import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/server/db/prisma";
import { RecurringForm } from "../recurring-form";
import { createRecurringAction } from "../actions";

export const metadata: Metadata = { title: "Nuevo recurrente" };

export default async function NewRecurringPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const clientId = typeof raw.clientId === "string" ? raw.clientId : "";

  const [clients, services] = await Promise.all([
    prisma.client.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.service.findMany({
      where: { active: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader title="Nuevo servicio recurrente" />
      <RecurringForm
        action={createRecurringAction}
        clients={clients}
        services={services}
        defaults={{ clientId, startedAt: today }}
        submitLabel="Crear recurrente"
      />
    </div>
  );
}
