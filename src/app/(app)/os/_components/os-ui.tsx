import { createElement } from "react";
import Link from "next/link";
import {
  FileText, Lightbulb, FlaskConical, Scale, Landmark, Target,
  MessageSquareText, Megaphone, Palette, BookOpen, Package, Building2,
  Layers, Quote, ShieldAlert, Sparkles, type LucideIcon,
} from "lucide-react";
import { StatusBadge } from "@/components/os/os-badges";
import { OS_TYPE_LABEL } from "../_config";
import { entryHref, type SectionConfig } from "../_sections";
import { cn } from "@/lib/utils";
import styles from "./os.module.css";
import type { OsEntryType, OsStatus } from "@/types/os";

/** Icono por tipo de entrada. */
const TYPE_ICON: Partial<Record<OsEntryType, LucideIcon>> = {
  principio: Landmark, regla: Scale, prohibicion: ShieldAlert, definicion: FileText,
  posicionamiento: Target, icp: Target, oferta: Layers, precio: Layers, garantia: Scale,
  claim: Quote, mensaje: MessageSquareText, objecion: MessageSquareText, cta: Megaphone,
  guion: MessageSquareText, caso: Building2, pilar_contenido: Megaphone, serie_contenido: Megaphone,
  pieza_contenido: Megaphone, hipotesis: FlaskConical, experimento: FlaskConical, aprendizaje: Lightbulb,
  decision: Sparkles, riesgo: ShieldAlert, playbook: BookOpen, recurso: Package,
  regla_marca: Palette, token_visual: Palette, articulo_constitucion: Scale,
};
export function typeIcon(type: OsEntryType): LucideIcon {
  return TYPE_ICON[type] ?? FileText;
}

/** Icono estable por tipo (evita crear componentes en render). */
export function TypeIcon({ type, className }: { type: OsEntryType; className?: string }) {
  return createElement(TYPE_ICON[type] ?? FileText, { className });
}

/** Cabecera de sección: icono en tesela de acento + título + tagline + contador. */
export function SectionHero({
  section, count, actions,
}: {
  section: SectionConfig;
  count?: number;
  actions?: React.ReactNode;
}) {
  const Icon = section.icon;
  return (
    <div className={cn("mb-7 flex flex-wrap items-center gap-4", styles.rise)}>
      <span
        className="grid h-12 w-12 place-items-center rounded-2xl border border-line-strong"
        style={{ background: `color-mix(in srgb, ${section.accent} 16%, transparent)`, color: section.accent }}
      >
        <Icon className="h-6 w-6" />
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-extrabold tracking-tight text-foam">{section.label}</h1>
          {typeof count === "number" ? (
            <span className="rounded-full border border-line px-2 py-0.5 text-xs tabular-nums text-faint">{count}</span>
          ) : null}
        </div>
        <p className="text-sm text-mist">{section.tagline}</p>
      </div>
      {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export type CardEntry = {
  id: string; title: string; summary: string | null; type: OsEntryType; status: OsStatus;
  sector?: string | null;
};

/** Tarjeta de conocimiento premium. */
export function KnowledgeCard({ entry, badge }: { entry: CardEntry; badge?: React.ReactNode }) {
  return (
    <Link
      href={entryHref(entry.id)}
      prefetch={false}
      className={cn(
        "group flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5",
        styles.lift,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-raise text-lavender transition-colors group-hover:bg-violet-soft">
          <TypeIcon type={entry.type} className="h-[18px] w-[18px]" />
        </span>
        {badge ?? <StatusBadge status={entry.status} />}
      </div>
      <div>
        <p className="font-semibold leading-snug text-foam">{entry.title}</p>
        {entry.summary ? <p className="mt-1 line-clamp-2 text-[13px] text-mist">{entry.summary}</p> : null}
      </div>
      <span className="mt-auto text-[11px] uppercase tracking-wide text-faint">{OS_TYPE_LABEL[entry.type]}</span>
    </Link>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-surface/40 px-6 py-16 text-center">
      <p className="text-sm font-semibold text-mist">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-faint">{hint}</p> : null}
    </div>
  );
}

/** Rejilla con entrada escalonada. */
export function CardGrid({ children, cols = 3 }: { children: React.ReactNode; cols?: 2 | 3 | 4 }) {
  const c = cols === 2 ? "sm:grid-cols-2" : cols === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3";
  return <div className={cn("grid gap-4", c, styles.stagger)}>{children}</div>;
}
