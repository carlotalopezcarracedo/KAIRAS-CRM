import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { StatusBadge, AuthorityBadge } from "@/components/os/os-badges";
import { CopyButton } from "@/components/os/copy-button";
import { FavoriteButton } from "./favorite-button";
import { ArchiveButton } from "./archive-button";
import { RelationEditor } from "./relation-editor";
import { RelationshipGraph } from "./relationship-graph";
import { OS_TYPE_LABEL, OS_BUSINESS_LINE, OS_MESSAGE_LAYER, getArea } from "../_config";
import { entryHref } from "../_sections";
import { formatDate } from "@/lib/utils";
import type { EntryDetail as EntryDetailData } from "@/server/services/os/knowledge-service";

/** Renderiza los campos de `meta` de forma legible (según el tipo). */
function MetaBlock({ meta }: { meta: unknown }) {
  if (!meta || typeof meta !== "object") return null;
  const entries = Object.entries(meta as Record<string, unknown>);
  if (entries.length === 0) return null;
  return (
    <Card>
      <CardBody>
        <p className="k-label mb-3">Detalle</p>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {entries.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="k-label text-faint">{k}</dt>
              <dd className="mt-0.5 text-sm text-foam">
                {Array.isArray(v) ? (
                  <ul className="list-disc space-y-0.5 pl-4">
                    {v.map((item, i) => (
                      <li key={i}>{typeof item === "object" ? JSON.stringify(item) : String(item)}</li>
                    ))}
                  </ul>
                ) : typeof v === "object" && v !== null ? (
                  <pre className="whitespace-pre-wrap text-xs text-mist">{JSON.stringify(v, null, 2)}</pre>
                ) : (
                  String(v ?? "—")
                )}
              </dd>
            </div>
          ))}
        </dl>
      </CardBody>
    </Card>
  );
}

export function EntryDetail({
  entry,
  isFavorite,
  authorNames = {},
}: {
  entry: EntryDetailData;
  isFavorite: boolean;
  authorNames?: Record<string, string>;
}) {
  const area = getArea(entry.area);
  const relations = [
    ...entry.relationsFrom.map((r) => ({
      id: r.id,
      type: r.type as string,
      otherId: r.to.id,
      otherArea: r.to.area,
      otherTitle: r.to.title,
    })),
    ...entry.relationsTo.map((r) => ({
      id: r.id,
      type: r.type as string,
      otherId: r.from.id,
      otherArea: r.from.area,
      otherTitle: r.from.title,
    })),
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{OS_TYPE_LABEL[entry.type]}</Badge>
            <StatusBadge status={entry.status} />
            <AuthorityBadge authority={entry.authority} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foam">{entry.title}</h1>
          {entry.summary ? <p className="mt-1 text-sm text-mist">{entry.summary}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FavoriteButton entryId={entry.id} initial={isFavorite} />
          {entry.body ? <CopyButton text={entry.body} label="Copiar texto" /> : null}
          <ButtonLink href={`${entryHref(entry.id)}/editar`} prefetch={false} variant="secondary" size="sm">
            <Pencil className="h-3.5 w-3.5" /> Editar
          </ButtonLink>
          <ArchiveButton entryId={entry.id} area={entry.area} archived={entry.status === "archivado"} />
        </div>
      </div>

      {entry.body ? (
        <Card>
          <CardBody>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foam/90">{entry.body}</div>
          </CardBody>
        </Card>
      ) : null}

      <MetaBlock meta={entry.meta} />

      {relations.length > 0 ? (
        <RelationshipGraph
          center={{ id: entry.id, title: entry.title, type: entry.type }}
          relations={relations.map((r) => ({ id: r.id, type: r.type, otherId: r.otherId, otherTitle: r.otherTitle }))}
        />
      ) : null}

      <Card>
        <CardBody>
          <p className="k-label mb-3">Relacionado</p>
          <RelationEditor entryId={entry.id} relations={relations} />
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <p className="k-label mb-3">Trazabilidad</p>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Meta label="Área" value={area?.label ?? entry.area} />
            <Meta label="Línea de negocio" value={OS_BUSINESS_LINE[entry.businessLine]} />
            <Meta label="Capa de mensaje" value={OS_MESSAGE_LAYER[entry.messageLayer]} />
            <Meta label="Sector" value={entry.sector ?? "—"} />
            <Meta label="Vigencia" value={entry.validUntil ? `Vigente hasta ${formatDate(entry.validUntil)}` : "Sin caducidad"} />
            <Meta label="Fuente" value={entry.source?.label ?? "—"} />
            <Meta label="Versión" value={`v${entry.currentVersion}`} />
            <Meta label="Actualizado" value={formatDate(entry.updatedAt)} />
            <Meta label="Creado" value={formatDate(entry.createdAt)} />
            {entry.hypothesisRef ? <Meta label="Hipótesis" value={entry.hypothesisRef} /> : null}
            {entry.targetType ? (
              <Meta label="Enlace CRM" value={`${entry.targetType}:${entry.targetId ?? ""}`} />
            ) : null}
          </dl>
        </CardBody>
      </Card>

      {entry.versions.length > 0 ? (
        <Card>
          <CardBody>
            <p className="k-label mb-3">Historial de versiones</p>
            <ul className="space-y-1.5 text-sm">
              {entry.versions.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-mist">
                  <span className="font-semibold text-foam">v{v.version}</span>
                  <span className="text-faint">{v.changeReason ?? "—"}</span>
                  <span className="ml-auto text-xs text-faint">
                    {v.authorId && authorNames[v.authorId] ? `${authorNames[v.authorId]} · ` : ""}
                    {formatDate(v.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="k-label text-faint">{label}</dt>
      <dd className="mt-0.5 text-foam">{value}</dd>
    </div>
  );
}
