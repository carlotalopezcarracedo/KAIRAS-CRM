import { Hammer } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

/**
 * Página de módulo pendiente. Honestidad ante todo: deja claro que NO es
 * funcional, qué hará y qué usar mientras tanto.
 */
export function ModuleStub({
  title,
  phase,
  description,
  meanwhile,
}: {
  title: string;
  phase: string;
  description: string;
  meanwhile?: string;
}) {
  return (
    <div>
      <PageHeader title={title} />
      <div className="mx-auto max-w-lg rounded-card border border-dashed border-line bg-surface/50 px-8 py-14 text-center">
        <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-warn/30 bg-warn-soft">
          <Hammer className="h-5 w-5 text-warn" />
        </span>
        <p className="k-label mb-2 text-warn">En construcción · {phase}</p>
        <p className="text-sm leading-relaxed text-mist">{description}</p>
        {meanwhile ? (
          <p className="mt-4 rounded-xl border border-line bg-ink/40 px-4 py-3 text-sm text-faint">
            Mientras tanto: {meanwhile}
          </p>
        ) : null}
      </div>
    </div>
  );
}
