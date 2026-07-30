// KAIRAS OS — mapa de SECCIONES del rediseño.
// Reagrupa las `area` almacenadas en 10 secciones de navegación SIN re-etiquetar
// el dato: cada sección declara de qué áreas/tipos se nutre. Config pura.

import {
  LayoutDashboard,
  Fingerprint,
  SwatchBook,
  MessageSquareText,
  BriefcaseBusiness,
  BookOpen,
  FlaskConical,
  Clapperboard,
  Package,
  Scale,
  type LucideIcon,
} from "lucide-react";
import type { OsEntryType } from "@/types/os";

export type SectionSlug =
  | "marca"
  | "visual"
  | "comunicacion"
  | "oferta"
  | "playbooks"
  | "aprendizaje"
  | "contenidos"
  | "recursos"
  | "constitucion";

export type SectionConfig = {
  slug: SectionSlug;
  label: string;
  icon: LucideIcon;
  tagline: string;
  /** Áreas almacenadas (`area`) de las que se nutre la sección. */
  areas?: string[];
  /** Tipos de entrada de los que se nutre (alternativa/añadido a `areas`). */
  types?: OsEntryType[];
  /** Acento visual (token de color del CRM). */
  accent: string;
};

export const OS_SECTIONS: SectionConfig[] = [
  {
    slug: "marca",
    label: "Marca",
    icon: Fingerprint,
    tagline: "Qué representa KAIRAS y qué límites tiene",
    areas: ["identidad"],
    accent: "var(--color-violet)",
  },
  {
    slug: "visual",
    label: "Manual visual",
    icon: SwatchBook,
    tagline: "Cómo debe verse cada pieza",
    areas: ["marca"],
    accent: "var(--color-lavender)",
  },
  {
    slug: "comunicacion",
    label: "Comunicación",
    icon: MessageSquareText,
    tagline: "Qué decir, cómo decirlo y qué evitar",
    areas: ["comunicacion"],
    accent: "var(--color-info)",
  },
  {
    slug: "oferta",
    label: "Oferta y clientes",
    icon: BriefcaseBusiness,
    tagline: "Encaje, alcance, precio, objeciones y casos",
    areas: ["oferta", "clientes", "comercial"],
    types: ["objecion", "guion"],
    accent: "var(--color-ok)",
  },
  {
    slug: "playbooks",
    label: "Playbooks",
    icon: BookOpen,
    tagline: "Cómo ejecutar el trabajo sin reinventarlo",
    types: ["playbook"],
    accent: "var(--color-violet)",
  },
  {
    slug: "aprendizaje",
    label: "Decisiones y aprendizaje",
    icon: FlaskConical,
    tagline: "Qué está vigente, qué probamos y qué aprendimos",
    areas: ["validacion"],
    accent: "var(--color-warn)",
  },
  {
    slug: "contenidos",
    label: "Contenidos",
    icon: Clapperboard,
    tagline: "Qué pieza crear, para quién y por qué",
    areas: ["contenidos"],
    accent: "var(--color-info)",
  },
  {
    slug: "recursos",
    label: "Recursos",
    icon: Package,
    tagline: "Plantillas, guiones y checklists",
    areas: ["recursos"],
    accent: "var(--color-lavender)",
  },
  {
    slug: "constitucion",
    label: "Constitución",
    icon: Scale,
    tagline: "Principios y no negociables",
    areas: ["constitucion"],
    accent: "var(--color-violet)",
  },
];

export const OS_DASHBOARD = { slug: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard };

const LEGACY_SECTION_ALIASES: Record<string, SectionSlug> = {
  estrategia: "marca",
  marketing: "comunicacion",
  comercial: "oferta",
  clientes: "oferta",
  procesos: "playbooks",
};

export function canonicalSectionSlug(slug: string): SectionSlug | undefined {
  if (OS_SECTIONS.some((section) => section.slug === slug)) return slug as SectionSlug;
  return LEGACY_SECTION_ALIASES[slug];
}

export function getSection(slug: string): SectionConfig | undefined {
  const canonical = canonicalSectionSlug(slug);
  return OS_SECTIONS.find((section) => section.slug === canonical);
}

/** Sección "principal" a la que pertenece una entrada (para breadcrumbs/URLs). */
export function sectionForEntry(area: string, type: OsEntryType): SectionConfig | undefined {
  // Los playbooks tienen una sección propia aunque su área documental sea comercial.
  if (type === "playbook") return OS_SECTIONS.find((section) => section.slug === "playbooks");
  const byArea = OS_SECTIONS.find((s) => s.areas?.includes(area));
  if (byArea) return byArea;
  return OS_SECTIONS.find((s) => s.types?.includes(type));
}

/** URL canónica de una entrada en el rediseño. */
export function entryHref(id: string): string {
  return `/os/e/${id}`;
}
