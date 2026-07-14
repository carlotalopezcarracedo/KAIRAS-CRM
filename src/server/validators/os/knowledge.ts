// KAIRAS OS — validadores Zod del módulo de conocimiento.
import { z } from "zod";

const opt = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

export const OS_ENTRY_TYPES = [
  "principio", "regla", "prohibicion", "definicion", "posicionamiento", "icp",
  "oferta", "precio", "garantia", "claim", "mensaje", "objecion", "cta", "guion",
  "caso", "pilar_contenido", "serie_contenido", "pieza_contenido", "hipotesis",
  "experimento", "aprendizaje", "decision", "riesgo", "playbook", "recurso",
  "regla_marca", "token_visual", "kpi", "articulo_constitucion",
] as const;

export const OS_STATUSES = [
  "borrador", "vigente", "provisional", "condicionado", "validado",
  "historico", "obsoleto", "archivado",
] as const;

export const OS_AUTHORITIES = [
  "constitucion", "sistema_permanente", "operativo", "experimental", "historico",
] as const;

export const OS_BUSINESS_LINES = [
  "L1_automatizacion", "L2_web", "L3_branding", "transversal",
] as const;

export const OS_MESSAGE_LAYERS = ["corp", "sect", "prod", "conv", "prop", "na"] as const;

export const OS_RELATION_TYPES = [
  "desarrolla", "sustituye", "depende_de", "valida", "refuta", "prueba",
  "responde", "aplica", "deriva_en", "relacionado",
] as const;

export const entryCreateSchema = z.object({
  type: z.enum(OS_ENTRY_TYPES),
  area: z.string().trim().min(1, "Área requerida"),
  title: z.string().trim().min(1, "Título requerido").max(300),
  body: opt,
  summary: opt,
  status: z.enum(OS_STATUSES).default("borrador"),
  authority: z.enum(OS_AUTHORITIES).default("operativo"),
  businessLine: z.enum(OS_BUSINESS_LINES).default("transversal"),
  messageLayer: z.enum(OS_MESSAGE_LAYERS).default("na"),
  sector: opt,
  hypothesisRef: opt,
  funnelStage: opt,
  awarenessLevel: opt,
  temperature: opt,
  channel: opt,
  targetType: opt,
  targetId: opt,
  sourceId: opt,
  externalKey: opt,
  meta: z.unknown().optional(),
});

export const entryUpdateSchema = entryCreateSchema.partial().extend({
  id: z.string().min(1),
  changeReason: opt,
});

export const relationCreateSchema = z.object({
  fromId: z.string().min(1),
  toId: z.string().min(1),
  type: z.enum(OS_RELATION_TYPES),
  note: opt,
});

export const listFiltersSchema = z.object({
  area: opt,
  type: opt,
  status: opt,
  sector: opt,
  tag: opt,
  q: opt,
});

export type EntryCreateInput = z.infer<typeof entryCreateSchema>;
export type EntryUpdateInput = z.infer<typeof entryUpdateSchema>;
