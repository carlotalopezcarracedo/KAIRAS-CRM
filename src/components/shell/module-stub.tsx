import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export function ModuleStub({
  title,
  phase,
  description,
}: {
  title: string;
  phase: string;
  description: string;
}) {
  return (
    <div>
      <PageHeader title={title} />
      <EmptyState
        title={`Módulo previsto en ${phase}`}
        hint={description}
      />
    </div>
  );
}
