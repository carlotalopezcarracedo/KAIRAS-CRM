import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  FilePenLine,
  Plus,
  Sparkles,
  Star,
  SwatchBook,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/os/os-badges";
import { formatDate } from "@/lib/utils";
import { requireUser } from "@/server/auth";
import {
  getOsDashboardOverview,
  type KnowledgeIndexEntry,
} from "@/server/services/os/os-views-service";
import { QuickSearch } from "./_components/quick-search";
import { TypeIcon } from "./_components/os-ui";
import { entryHref, sectionForEntry } from "./_sections";
import styles from "./_components/os.module.css";

export const metadata: Metadata = { title: "KAIRAS OS" };

const TASK_SHORTCUTS = [
  {
    href: "/os/visual",
    eyebrow: "Voy a diseñar",
    title: "¿Cómo debe verse?",
    hint: "Colores, tipografía y reglas de marca",
    icon: SwatchBook,
  },
  {
    href: "/os/comunicacion",
    eyebrow: "Voy a escribir",
    title: "¿Cómo lo decimos?",
    hint: "Voz, mensajes, CTAs y objeciones",
    icon: FilePenLine,
  },
  {
    href: "/os/oferta",
    eyebrow: "Voy a vender",
    title: "¿Qué encaja aquí?",
    hint: "Oferta, precio, casos y propuesta",
    icon: Sparkles,
  },
  {
    href: "/os/playbooks",
    eyebrow: "Voy a ejecutar",
    title: "¿Cuál es el proceso?",
    hint: "Pasos, checklist y criterio de terminado",
    icon: BookOpen,
  },
];

export default async function OsDashboard() {
  const user = await requireUser();
  const overview = await getOsDashboardOverview(user.id);
  const hour = new Date().getHours();
  const greeting =
    hour < 6
      ? "Buenas noches"
      : hour < 14
        ? "Buenos días"
        : hour < 21
          ? "Buenas tardes"
          : "Buenas noches";
  const continueEntries =
    overview.recentlyViewed.length > 0
      ? overview.recentlyViewed
      : overview.updates.slice(0, 4);

  return (
    <div className={styles.fade}>
      <header className="max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-lavender">
          {greeting} · sistema de conocimiento
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.035em] text-foam sm:text-4xl">
          ¿Qué necesitas saber o hacer hoy?
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-mist">
          Busca una respuesta, comprueba qué sigue vigente o abre el proceso
          que necesitas ejecutar.
        </p>
      </header>

      <div className="mt-6">
        <QuickSearch variant="hero" />
      </div>

      <nav aria-label="Accesos por tarea" className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {TASK_SHORTCUTS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`group rounded-2xl border border-line bg-surface p-4 ${styles.lift}`}
          >
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-raise text-lavender">
                <item.icon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-faint">
                  {item.eyebrow}
                </span>
                <span className="mt-1 block text-sm font-semibold text-foam">
                  {item.title}
                </span>
              </span>
              <ArrowUpRight className="ml-auto h-3.5 w-3.5 flex-none text-faint transition-colors group-hover:text-lavender" />
            </div>
            <p className="mt-3 text-xs leading-5 text-faint">{item.hint}</p>
          </Link>
        ))}
      </nav>

      <div className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <Panel
          eyebrow="Radar de hoy"
          title="Decisiones vigentes"
          icon={<CheckCircle2 className="h-4 w-4" />}
          href="/os/aprendizaje"
        >
          {overview.decisions.length === 0 ? (
            <EmptyLine>No hay decisiones registradas todavía.</EmptyLine>
          ) : (
            <div className="divide-y divide-line">
              {overview.decisions.slice(0, 4).map((entry, index) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  featured={index === 0}
                  meta={index === 0 ? "Decisión prioritaria" : formatDate(entry.updatedAt)}
                />
              ))}
            </div>
          )}
        </Panel>

        <section className="rounded-2xl border border-line bg-foam p-5 text-ink">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/50">
            Salud del conocimiento
          </p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <Metric value={overview.stats.vigentes} label="Vigentes" />
            <Metric value={overview.stats.hypotheses} label="Hipótesis" />
            <Metric value={overview.stats.attention} label="Revisar" />
          </div>
          <div className="mt-5 border-t border-ink/10 pt-4">
            {overview.attention.length > 0 ? (
              <Link
                href={entryHref(overview.attention[0].id)}
                className="flex items-start gap-3 rounded-xl bg-ink/[0.06] p-3"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-[#6c42d8]" />
                <span>
                  <span className="block text-xs font-bold">Revisión pendiente</span>
                  <span className="mt-1 block text-xs leading-5 text-ink/60">
                    {overview.attention[0].title}
                  </span>
                </span>
              </Link>
            ) : (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-[#5b34c9]" />
                <p className="text-xs leading-5 text-ink/60">
                  No hay contenido vencido ni revisiones atrasadas.
                </p>
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-ink/50">
            <Clock3 className="h-3.5 w-3.5" />
            {overview.upcoming.length > 0
              ? `Próxima revisión: ${formatDate(overview.upcoming[0].validUntil!)}`
              : "Sin próximas revisiones fechadas"}
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel
          eyebrow="Continuar"
          title={overview.recentlyViewed.length > 0 ? "Visto recientemente" : "Últimas actualizaciones"}
          icon={<Clock3 className="h-4 w-4" />}
        >
          <div className="divide-y divide-line">
            {continueEntries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                meta={sectionForEntry(entry.area, entry.type)?.label}
              />
            ))}
          </div>
        </Panel>

        <Panel
          eyebrow="Acción"
          title="Playbooks frecuentes"
          icon={<BookOpen className="h-4 w-4" />}
          href="/os/playbooks"
        >
          {overview.playbooks.length === 0 ? (
            <EmptyLine>No hay playbooks operativos.</EmptyLine>
          ) : (
            <div className="divide-y divide-line">
              {overview.playbooks.slice(0, 4).map((entry) => (
                <EntryRow key={entry.id} entry={entry} meta="Abrir proceso" />
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel
          eyebrow="En validación"
          title="Hipótesis activas"
          icon={<Sparkles className="h-4 w-4" />}
          href="/os/aprendizaje"
        >
          {overview.hypotheses.length === 0 ? (
            <EmptyLine>No hay hipótesis abiertas.</EmptyLine>
          ) : (
            <div className="divide-y divide-line">
              {overview.hypotheses.slice(0, 4).map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  badge={<StatusBadge status={entry.status} />}
                />
              ))}
            </div>
          )}
        </Panel>

        <Panel
          eyebrow="A mano"
          title="Favoritos"
          icon={<Star className="h-4 w-4" />}
          href="/os/favoritos"
        >
          {overview.favorites.length === 0 ? (
            <EmptyLine>Marca entradas con la estrella para encontrarlas aquí.</EmptyLine>
          ) : (
            <div className="divide-y divide-line">
              {overview.favorites.slice(0, 4).map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  meta={sectionForEntry(entry.area, entry.type)?.label}
                />
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <p className="text-xs text-faint">
          {overview.stats.total} unidades · {overview.stats.vigentes} vigentes
        </p>
        <ButtonLink href="/os/nuevo" variant="secondary" size="sm">
          <Plus className="h-3.5 w-3.5" />
          Nueva entrada
        </ButtonLink>
      </div>
    </div>
  );
}

function Panel({
  eyebrow,
  title,
  icon,
  href,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: React.ReactNode;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lavender">{icon}</span>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-faint">
            {eyebrow}
          </p>
          <h2 className="mt-0.5 text-sm font-semibold text-foam">{title}</h2>
        </div>
        {href ? (
          <Link
            href={href}
            aria-label={`Ver ${title}`}
            className="ml-auto grid h-8 w-8 place-items-center rounded-full text-faint hover:bg-raise hover:text-lavender"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function EntryRow({
  entry,
  meta,
  badge,
  featured = false,
}: {
  entry: KnowledgeIndexEntry;
  meta?: string;
  badge?: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <Link
      href={entryHref(entry.id)}
      className={`group flex items-start gap-3 py-3 ${featured ? "rounded-xl bg-violet-soft/55 px-3" : ""}`}
    >
      <span className="mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-lg bg-raise text-faint group-hover:text-lavender">
        <TypeIcon type={entry.type} className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium leading-5 text-foam group-hover:text-lavender">
          {entry.title}
        </span>
        {meta ? <span className="mt-0.5 block text-[11px] text-faint">{meta}</span> : null}
      </span>
      {badge ?? <ArrowUpRight className="mt-1 h-3.5 w-3.5 flex-none text-faint" />}
    </Link>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="text-2xl font-extrabold tabular-nums tracking-tight">{value}</p>
      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.1em] text-ink/45">
        {label}
      </p>
    </div>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-sm leading-6 text-faint">{children}</p>;
}
