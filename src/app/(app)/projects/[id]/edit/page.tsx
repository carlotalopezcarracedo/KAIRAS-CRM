import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/server/db/prisma";
import { ProjectForm, type ProjectFormDefaults } from "../../project-form";
import { updateProjectAction } from "../../actions";

export const metadata: Metadata = { title: "Editar proyecto" };

function toDateInput(date: Date | null): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, clients, services] = await Promise.all([
    prisma.project.findFirst({ where: { id, deletedAt: null } }),
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
  if (!project) notFound();

  const defaults: ProjectFormDefaults = {
    name: project.name,
    clientId: project.clientId,
    mainServiceId: project.mainServiceId ?? "",
    status: project.status,
    priority: project.priority,
    billingMode: project.billingMode,
    startAt: toDateInput(project.startAt),
    deadline: toDateInput(project.deadline),
    budget: project.budget?.toString() ?? "",
    estimatedMargin: project.estimatedMargin?.toString() ?? "",
    description: project.description ?? "",
    scope: project.scope ?? "",
    outOfScope: project.outOfScope ?? "",
    deliverables: project.deliverables ?? "",
    nextSteps: project.nextSteps ?? "",
  };

  return (
    <div>
      <PageHeader title={`Editar: ${project.name}`} />
      <ProjectForm
        action={updateProjectAction.bind(null, project.id)}
        defaults={defaults}
        clients={clients}
        services={services}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
