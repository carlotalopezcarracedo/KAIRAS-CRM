import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { prisma } from "@/server/db/prisma";
import { ProjectForm } from "../project-form";
import { createProjectAction } from "../actions";

export const metadata: Metadata = { title: "Nuevo proyecto" };

export default async function NewProjectPage({
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

  if (clients.length === 0) {
    return (
      <div>
        <PageHeader title="Nuevo proyecto" />
        <EmptyState
          title="Primero necesitas un cliente"
          hint="Un proyecto siempre cuelga de un cliente. Crea el cliente y vuelve aquí."
          action={<ButtonLink href="/clients/new" size="sm">Crear cliente</ButtonLink>}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Nuevo proyecto" />
      <ProjectForm
        action={createProjectAction}
        clients={clients}
        services={services}
        defaults={{ clientId }}
        submitLabel="Crear proyecto"
      />
    </div>
  );
}
