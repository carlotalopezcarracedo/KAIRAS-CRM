import type { Metadata } from "next";
import Link from "next/link";
import { Plus, ArrowUpRight, Activity, Sparkles, Star, Building2, BookOpen, Flame, Package } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/os/os-badges";
import { QuickSearch } from "./_components/quick-search";
import { TypeIcon } from "./_components/os-ui";
import { OS_SECTIONS, entryHref, sectionForEntry } from "./_sections";
import { getDashboard } from "@/server/services/os/knowledge-service";
import {
  dashboardStats, getActivityFeed, getMostUsed, getWeeklyActivity, getSectionEntries,
} from "@/server/services/os/os-views-service";
import { requireUser } from "@/server/auth";
import { formatDate } from "@/lib/utils";
import styles from "./_components/os.module.css";

export const metadata: Metadata = { title: "KAIRAS OS" };

const QUICK = [
  { slug: "marca", label: "Kit de marca", hint: "color · tipografía" },
  { slug: "comercial", label: "Embudo comercial", hint: "chequeo → cierre" },
  { slug: "estrategia", label: "Estrategia", hint: "ICP · oferta · hipótesis" },
  { slug: "constitucion", label: "Constitución", hint: "no negociables" },
];

export default async function OsDashboard() {
  const user = await requireUser();
  const [stats, board, activity, mostUsed, weekly, clients, playbooks] = await Promise.all([
    dashboardStats(),
    getDashboard(user.id),
    getActivityFeed(6),
    getMostUsed(5),
    getWeeklyActivity(),
    getSectionEntries({ areas: ["clientes"] }),
    getSectionEntries({ types: ["playbook"] }),
  ]);
  const hour = new Date().getHours();
  const greet = hour < 6 ? "Buenas noches" : hour < 14 ? "Buenos días" : hour < 21 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className={styles.fade}>
      <p className="text-[13px] text-faint">{greet} · el cerebro de KAIRAS</p>
      <h1 className="mb-5 mt-0.5 text-[28px] font-extrabold tracking-tight text-foam">¿Qué necesitas hoy?</h1>

      <QuickSearch variant="hero" />

      {/* accesos rápidos */}
      <div className={`mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 ${styles.stagger}`}>
        {QUICK.map((q) => {
          const s = OS_SECTIONS.find((x) => x.slug === q.slug)!;
          return (
            <Link key={q.slug} href={`/os/${q.slug}`} className={`flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4 ${styles.lift}`}>
              <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${s.accent} 16%, transparent)`, color: s.accent }}>
                <s.icon className="h-[18px] w-[18px]" />
              </span>
              <span className="text-[13px] font-semibold text-foam">{q.label}</span>
              <span className="text-[11px] text-faint">{q.hint}</span>
            </Link>
          );
        })}
      </div>

      {/* stats */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={stats.total} label="Entradas" />
        <Stat value={stats.vigentes} label="Vigentes" accent />
        <Stat value={stats.hypotheses} label="Hipótesis abiertas" />
        <Stat value={stats.relations} label="Relaciones" />
      </div>

      {/* widgets */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Widget title="Actividad reciente" icon={<Activity className="h-4 w-4" />} className="lg:col-span-1">
          {activity.length === 0 ? <Muted>Sin actividad.</Muted> : activity.map((a) => (
            <Row key={a.id} id={a.entry.id} type={a.entry.type} title={a.entry.title}
              meta={`v${a.version} · ${formatDate(a.createdAt)}`} />
          ))}
        </Widget>

        <Widget title="Decisiones" icon={<Sparkles className="h-4 w-4" />}>
          {board.recentDecisions.length === 0 ? <Muted>Sin decisiones.</Muted> : board.recentDecisions.map((e) => (
            <Row key={e.id} id={e.id} type={e.type} title={e.title} badge={<StatusBadge status={e.status} />} />
          ))}
        </Widget>

        <Widget title="Tus favoritos" icon={<Star className="h-4 w-4" />}>
          {board.favorites.length === 0 ? <Muted>Marca entradas con la estrella.</Muted> : board.favorites.map((e) => (
            <Row key={e.id} id={e.id} type={e.type} title={e.title}
              meta={sectionForEntry(e.area, e.type)?.label} />
          ))}
        </Widget>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Widget title="Clientes" icon={<Building2 className="h-4 w-4" />} href="/os/clientes">
          {clients.slice(0, 4).map((e) => (
            <Row key={e.id} id={e.id} type={e.type} title={e.title} badge={<StatusBadge status={e.status} />} />
          ))}
        </Widget>

        <Widget title="Playbooks" icon={<BookOpen className="h-4 w-4" />} href="/os/playbooks">
          {playbooks.slice(0, 4).map((e) => (
            <Row key={e.id} id={e.id} type={e.type} title={e.title} />
          ))}
        </Widget>

        <Widget title="Más utilizado" icon={<Flame className="h-4 w-4" />}>
          {mostUsed.map((e) => (
            <Row key={e.id} id={e.id} type={e.type} title={e.title}
              meta={"views" in e && e.views ? `${e.views} vistas` : undefined} />
          ))}
        </Widget>
      </div>

      {weekly.resources.length > 0 ? (
        <div className="mt-4">
          <Widget title="Recursos usados esta semana" icon={<Package className="h-4 w-4" />} href="/os/recursos">
            {weekly.resources.map((e) => (
              <Row key={e.id} id={e.id} type={e.type} title={e.title} />
            ))}
          </Widget>
        </div>
      ) : null}

      <div className="mt-6 flex justify-center">
        <ButtonLink href="/os/nuevo" variant="secondary" size="sm">
          <Plus className="h-3.5 w-3.5" /> Nueva entrada
        </ButtonLink>
      </div>
    </div>
  );
}

function Stat({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className={`text-[26px] font-extrabold tabular-nums tracking-tight ${accent ? "text-lavender" : "text-foam"}`}>{value}</p>
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-faint">{label}</p>
    </div>
  );
}

function Widget({ title, icon, href, className, children }: {
  title: string; icon: React.ReactNode; href?: string; className?: string; children: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-5 ${className ?? ""}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lavender">{icon}</span>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-faint">{title}</p>
        {href ? (
          <Link href={href} className="ml-auto text-[11px] text-lavender hover:underline">
            ver todo <ArrowUpRight className="inline h-3 w-3" />
          </Link>
        ) : null}
      </div>
      <div>{children}</div>
    </section>
  );
}

function Row({ id, type, title, meta, badge }: {
  id: string; type: import("@/types/os").OsEntryType;
  title: string; meta?: string; badge?: React.ReactNode;
}) {
  return (
    <Link href={entryHref(id)} className="flex items-center gap-2.5 border-t border-line py-2 text-[13px] text-mist first:border-t-0 hover:text-foam">
      <TypeIcon type={type} className="h-3.5 w-3.5 flex-none text-faint" />
      <span className="min-w-0 flex-1 truncate text-foam/90">{title}</span>
      {badge ?? (meta ? <span className="flex-none text-[11px] text-faint">{meta}</span> : null)}
    </Link>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="py-2 text-[13px] text-faint">{children}</p>;
}
