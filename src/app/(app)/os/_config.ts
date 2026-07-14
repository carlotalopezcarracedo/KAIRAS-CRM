// KAIRAS OS — configuración del módulo: áreas, etiquetas de enums y tonos.
// Constantes locales del módulo (no toca src/lib/labels.ts del CRM).

import {
  Brain,
  Compass,
  Palette,
  MessageSquareText,
  Layers,
  Handshake,
  Building2,
  Clapperboard,
  FlaskConical,
  BookOpen,
  Files,
  Scale,
  type LucideIcon,
} from "lucide-react";
import type { Tone } from "@/lib/labels";
import type {
  OsAreaSlug,
  OsEntryType,
  OsStatus,
  OsAuthority,
} from "@/types/os";

export type AreaConfig = {
  slug: OsAreaSlug;
  label: string;
  icon: LucideIcon;
  description: string;
  /** Tipos de entrada que se muestran por defecto en esta área. */
  types: OsEntryType[];
};

/** Las 11 áreas de conocimiento de la V1, en orden de navegación. */
export const OS_AREAS: AreaConfig[] = [
  {
    slug: "identidad",
    label: "Identidad y estrategia",
    icon: Compass,
    description:
      "Qué es y qué no es KAIRAS, propósito, posicionamiento, ICP y decisiones no negociables.",
    types: ["principio", "definicion", "posicionamiento", "icp", "kpi"],
  },
  {
    slug: "marca",
    label: "Marca visual",
    icon: Palette,
    description:
      "Paleta, tokens, tipografía, composición, dirección de arte, usos correctos e incorrectos.",
    types: ["token_visual", "regla_marca"],
  },
  {
    slug: "comunicacion",
    label: "Comunicación",
    icon: MessageSquareText,
    description:
      "Voz y tono, claims, pitches, mensajes, CTAs y objeciones, filtrables por capa y canal.",
    types: ["claim", "mensaje", "cta", "objecion", "guion"],
  },
  {
    slug: "oferta",
    label: "Oferta y productos",
    icon: Layers,
    description:
      "Escalera de valor, precios, garantías, alcance, exclusiones y estado de validación.",
    types: ["oferta", "precio", "garantia"],
  },
  {
    slug: "comercial",
    label: "Comercial",
    icon: Handshake,
    description: "Playbooks de venta: descubrimiento, chequeo, propuesta, cierre.",
    types: ["playbook"],
  },
  {
    slug: "clientes",
    label: "Clientes y casos",
    icon: Building2,
    description:
      "Casos reales con estado de publicación y resultado (medido / cualitativo / en curso).",
    types: ["caso"],
  },
  {
    slug: "contenidos",
    label: "Contenidos",
    icon: Clapperboard,
    description:
      "Pilares, series, categorías, piezas y sprint, con función comercial y estado.",
    types: ["pilar_contenido", "serie_contenido", "pieza_contenido"],
  },
  {
    slug: "validacion",
    label: "Validación y aprendizaje",
    icon: FlaskConical,
    description:
      "Hipótesis, experimentos, decisiones, aprendizajes y riesgos, con sus estados y relaciones.",
    types: ["hipotesis", "experimento", "decision", "aprendizaje", "riesgo"],
  },
  {
    slug: "playbooks",
    label: "Playbooks",
    icon: BookOpen,
    description: "Biblioteca de procesos consultables, con pasos, checklist y definición de terminado.",
    types: ["playbook"],
  },
  {
    slug: "recursos",
    label: "Recursos",
    icon: Files,
    description: "Plantillas, guiones y checklists copiables.",
    types: ["recurso", "guion"],
  },
  {
    slug: "constitucion",
    label: "Constitución y gobierno",
    icon: Scale,
    description:
      "La Constitución de KAIRAS navegable por títulos: principios, reglas, prohibiciones, precedencia.",
    types: ["articulo_constitucion", "prohibicion", "regla"],
  },
];

export const OS_MODULE_ICON = Brain;

export function getArea(slug: string): AreaConfig | undefined {
  return OS_AREAS.find((a) => a.slug === slug);
}

// -- Etiquetas de estado -----------------------------------------------------
export const OS_STATUS: Record<OsStatus, { label: string; tone: Tone }> = {
  borrador: { label: "Borrador", tone: "neutral" },
  vigente: { label: "Vigente", tone: "ok" },
  provisional: { label: "Provisional", tone: "warn" },
  condicionado: { label: "Condicionado", tone: "info" },
  validado: { label: "Validado", tone: "violet" },
  historico: { label: "Histórico", tone: "neutral" },
  obsoleto: { label: "Obsoleto", tone: "danger" },
  archivado: { label: "Archivado", tone: "neutral" },
};

export const OS_AUTHORITY: Record<OsAuthority, { label: string; tone: Tone }> = {
  constitucion: { label: "Constitución", tone: "violet" },
  sistema_permanente: { label: "Sistema permanente", tone: "info" },
  operativo: { label: "Operativo", tone: "neutral" },
  experimental: { label: "Experimental", tone: "warn" },
  historico: { label: "Histórico", tone: "neutral" },
};

export const OS_TYPE_LABEL: Record<OsEntryType, string> = {
  principio: "Principio",
  regla: "Regla",
  prohibicion: "Prohibición",
  definicion: "Definición",
  posicionamiento: "Posicionamiento",
  icp: "ICP",
  oferta: "Oferta",
  precio: "Precio",
  garantia: "Garantía",
  claim: "Claim",
  mensaje: "Mensaje",
  objecion: "Objeción",
  cta: "CTA",
  guion: "Guion",
  caso: "Caso",
  pilar_contenido: "Pilar",
  serie_contenido: "Serie",
  pieza_contenido: "Pieza",
  hipotesis: "Hipótesis",
  experimento: "Experimento",
  aprendizaje: "Aprendizaje",
  decision: "Decisión",
  riesgo: "Riesgo",
  playbook: "Playbook",
  recurso: "Recurso",
  regla_marca: "Regla de marca",
  token_visual: "Token visual",
  kpi: "KPI",
  articulo_constitucion: "Artículo",
};

export const OS_RELATION_LABEL: Record<string, string> = {
  desarrolla: "desarrolla",
  sustituye: "sustituye a",
  depende_de: "depende de",
  valida: "valida",
  refuta: "refuta",
  prueba: "prueba",
  responde: "responde a",
  aplica: "aplica a",
  deriva_en: "deriva en",
  relacionado: "relacionado con",
};
