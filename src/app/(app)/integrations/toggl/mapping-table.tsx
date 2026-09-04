"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import type { ProjectMappingRow } from "@/server/services/toggl-mapping-service";
import { refreshMappingsAction, confirmMappingAction } from "./actions";

const IGNORE_VALUE = "__ignore__";
const PENDING_VALUE = "";

export function MappingTable({
  mappings,
  kairasProjects,
}: {
  mappings: ProjectMappingRow[];
  kairasProjects: { id: string; name: string }[];
}) {
  const [refreshing, startRefresh] = useTransition();
  const router = useRouter();

  function refresh() {
    startRefresh(async () => {
      const result = await refreshMappingsAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Proyectos de Toggl actualizados");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-faint">
          {mappings.length === 0
            ? "Aún no se ha traído ningún proyecto de Toggl."
            : `${mappings.filter((m) => !m.confirmed).length} pendiente(s) de confirmar de ${mappings.length}`}
        </p>
        <Button variant="secondary" size="sm" disabled={refreshing} onClick={refresh}>
          <RefreshCw className={refreshing ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          {refreshing ? "Actualizando…" : "Actualizar desde Toggl"}
        </Button>
      </div>

      {mappings.length === 0 ? null : (
        <div className="space-y-2">
          {mappings.map((mapping) => (
            <MappingRow key={mapping.id} mapping={mapping} kairasProjects={kairasProjects} />
          ))}
        </div>
      )}
    </div>
  );
}

function MappingRow({
  mapping,
  kairasProjects,
}: {
  mapping: ProjectMappingRow;
  kairasProjects: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const currentValue = !mapping.confirmed
    ? PENDING_VALUE
    : mapping.kairasProjectId
      ? mapping.kairasProjectId
      : IGNORE_VALUE;

  function onChange(value: string) {
    const kairasProjectId = value === IGNORE_VALUE ? null : value || null;
    if (value === PENDING_VALUE) return; // "elige…" no es una confirmación
    startTransition(async () => {
      const result = await confirmMappingAction(mapping.id, kairasProjectId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Mapeo guardado");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-ink/40 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foam">{mapping.togglProjectName}</p>
        <p className="text-xs text-faint">
          {mapping.confirmed ? (
            <Badge tone={mapping.kairasProjectId ? "ok" : "neutral"}>
              {mapping.kairasProjectId ? "Confirmado" : "Ignorado"}
            </Badge>
          ) : mapping.matchedByName ? (
            <Badge tone="warn">Sugerido por nombre — confirmar</Badge>
          ) : (
            <Badge tone="warn">Sin sugerencia — elegir</Badge>
          )}
        </p>
      </div>
      <Select
        value={currentValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={pending}
        className="h-9 w-64 text-xs"
      >
        <option value={PENDING_VALUE} disabled>
          {mapping.kairasProjectName ? `Sugerido: ${mapping.kairasProjectName}` : "Elige…"}
        </option>
        <option value={IGNORE_VALUE}>No corresponde a ningún proyecto</option>
        {kairasProjects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
