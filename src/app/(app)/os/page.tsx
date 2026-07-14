import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/os/os-badges";
import { OS_AREAS, OS_TYPE_LABEL } from "./_config";
import { getDashboard, countByArea } from "@/server/services/os/knowledge-service";
import { requireUser } from "@/server/auth";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "KAIRAS OS" };

export default async function OsDashboardPage() {
  const user = await requireUser();
  const [d, areaCounts] = await Promise.all([getDashboard(user.id), countByArea()]);
  const totalEntries = [...areaCounts.values()].reduce((a, b) => a + b, 0);

  return (
    <div>
      <PageHeader
        title="KAIRAS OS"
        subtitle="El cerebro de la empresa: identidad, estrategia, oferta, contenidos, validación y playbooks."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Entradas" value={totalEntries} />
        <StatCard label="Vigentes" value={d.totalVigente} />
        <StatCard label="Hipótesis abiertas" value={d.openHypotheses.length} accent />
        <StatCard label="Experimentos activos" value={d.activeExperiments} />
        <StatCard label="Decisiones" value={d.recentDecisions.length} />
        <StatCard label="Riesgos" value={d.openRisks.length} />
      </div>

      {totalEntries === 0 ? (
        <Card className="mt-6">
          <CardBody>
            <p className="text-sm text-mist">
              Todavía no hay conocimiento importado. Ejecuta la importación inicial
              (<code className="text-lavender">npx tsx prisma/seed-os.ts</code>) para cargar la
              Constitución, marca, comunicación, oferta, casos, contenidos y validación
              vigentes. Los archivos originales no se tocan.
            </p>
          </CardBody>
        </Card>
      ) : null}

      {/* Áreas */}
      <p className="k-label mt-8 mb-3">Áreas de conocimiento</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {OS_AREAS.map((a) => (
          <Link
            key={a.slug}
            href={`/os/${a.slug}`}
            className="group rounded-card border border-line bg-surface p-5 transition-colors hover:border-line-strong hover:bg-raise/60"
          >
            <div className="mb-2 flex items-center justify-between">
              <a.icon className="h-5 w-5 text-lavender" />
              <span className="text-xs text-faint">{areaCounts.get(a.slug) ?? 0}</span>
            </div>
            <p className="font-semibold text-foam">{a.label}</p>
            <p className="mt-1 line-clamp-2 text-sm text-mist">{a.description}</p>
          </Link>
        ))}
      </div>

      {/* Actualizado + decisiones */}
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody>
            <div className="mb-3 flex items-center justify-between">
              <p className="k-label">Actualizado recientemente</p>
            </div>
            {d.recentlyUpdated.length === 0 ? (
              <p className="text-sm text-faint">Sin entradas todavía.</p>
            ) : (
              <ul className="space-y-2">
                {d.recentlyUpdated.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/os/${e.area}/${e.id}`}
                      className="flex items-center gap-2 text-sm text-mist hover:text-foam"
                    >
                      <span className="truncate">{e.title}</span>
                      <StatusBadge status={e.status} />
                      <span className="ml-auto shrink-0 text-xs text-faint">{formatDate(e.updatedAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="k-label mb-3">Decisiones recientes</p>
            {d.recentDecisions.length === 0 ? (
              <p className="text-sm text-faint">Sin decisiones registradas.</p>
            ) : (
              <ul className="space-y-2">
                {d.recentDecisions.map((e) => (
                  <li key={e.id}>
                    <Link href={`/os/validacion/${e.id}`} className="text-sm text-mist hover:text-foam">
                      {e.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Hipótesis abiertas + favoritos */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody>
            <div className="mb-3 flex items-center justify-between">
              <p className="k-label">Hipótesis abiertas</p>
              <Link href="/os/validacion" className="text-xs text-lavender hover:underline">
                Ver validación <ArrowRight className="inline h-3 w-3" />
              </Link>
            </div>
            {d.openHypotheses.length === 0 ? (
              <p className="text-sm text-faint">Sin hipótesis abiertas.</p>
            ) : (
              <ul className="space-y-2">
                {d.openHypotheses.map((e) => (
                  <li key={e.id}>
                    <Link href={`/os/validacion/${e.id}`} className="flex items-center gap-2 text-sm text-mist hover:text-foam">
                      <span className="truncate">{e.title}</span>
                      <StatusBadge status={e.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="k-label mb-3">Tus favoritos</p>
            {d.favorites.length === 0 ? (
              <p className="text-sm text-faint">Marca entradas con la estrella para tenerlas a mano.</p>
            ) : (
              <ul className="space-y-2">
                {d.favorites.map((e) => (
                  <li key={e.id}>
                    <Link href={`/os/${e.area}/${e.id}`} className="flex items-center gap-2 text-sm text-mist hover:text-foam">
                      <span className="truncate">{e.title}</span>
                      <span className="ml-auto shrink-0 text-xs text-faint">{OS_TYPE_LABEL[e.type]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
