// KAIRAS OS — mapa de SECCIONES del rediseño.
// Reagrupa las `area` almacenadas en 10 secciones de navegación SIN re-etiquetar
// el dato: cada sección declara de qué áreas/tipos se nutre. Config pura.

import {
  LayoutDashboard,
  Palette,
  Compass,
  Megaphone,
  Handshake,
  Users,
  BookOpen,
  Workflow,
  Package,
  Scale,
  type LucideIcon,
} from "lucide-react";
import type { OsEntryType } from "@/types/os";

export type SectionSlug =
  | "marca"
  | "estrategia"
  | "marketing"
  | "comercial"
  | "clientes"
  | "playbooks"
  | "procesos"
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
    icon: Palette,
    tagline: "Identidad visual lista para usar",
    areas: ["marca"],
    accent: "var(--color-violet)",
  },
  {
    slug: "estrategia",
    label: "Estrategia",
    icon: Compass,
    tagline: "Qué es KAIRAS, para quién y por qué",
    areas: ["identidad", "validacion"],
    accent: "var(--color-info)",
  },
  {
    slug: "marketing",
    label: "Marketing",
    icon: Megaphone,
    tagline: "Mensaje, contenidos y conversión",
    areas: ["comunicacion", "contenidos"],
    accent: "var(--color-lavender)",
  },
  {
    slug: "comercial",
    label: "Comercial",
    icon: Handshake,
    tagline: "Del chequeo al cierre",
    areas: ["comercial", "oferta"],
    accent: "var(--color-ok)",
  },
  {
    slug: "clientes",
    label: "Clientes",
    icon: Users,
    tagline: "Fichas, casos y aprendizajes",
    areas: ["clientes"],
    accent: "var(--color-warn)",
  },
  {
    slug: "playbooks",
    label: "Playbooks",
    icon: BookOpen,
    tagline: "Procesos consultables",
    types: ["playbook"],
    accent: "var(--color-violet)",
  },
  {
    slug: "procesos",
    label: "Procesos",
    icon: Workflow,
    tagline: "Flujos, pasos y checklists",
    types: ["playbook"],
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

export function getSection(slug: string): SectionConfig | undefined {
  return OS_SECTIONS.find((s) => s.slug === slug);
}

/** Sección "principal" a la que pertenece una entrada (para breadcrumbs/URLs). */
export function sectionForEntry(area: string, type: OsEntryType): SectionConfig | undefined {
  // Por área primero; si no, por tipo (playbooks/procesos).
  const byArea = OS_SECTIONS.find((s) => s.areas?.includes(area));
  if (byArea) return byArea;
  return OS_SECTIONS.find((s) => s.types?.includes(type));
}

/** URL canónica de una entrada en el rediseño. */
export function entryHref(id: string): string {
  return `/os/e/${id}`;
}
