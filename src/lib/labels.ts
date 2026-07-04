// Etiquetas en español y tonos de badge para los enums de la app.
// Único sitio donde se traduce un valor de enum a texto visible.

export type Tone = "neutral" | "violet" | "ok" | "warn" | "danger" | "info";

type LabelMap<T extends string> = Record<T, { label: string; tone: Tone }>;

export const LEAD_STATUS: LabelMap<
  | "new"
  | "contacted"
  | "responded"
  | "interested"
  | "meeting_scheduled"
  | "diagnosis_done"
  | "proposal_needed"
  | "proposal_sent"
  | "follow_up"
  | "negotiation"
  | "won"
  | "lost"
  | "nurture"
  | "client_active"
  | "client_inactive"
  | "do_not_contact"
> = {
  new: { label: "Nuevo", tone: "info" },
  contacted: { label: "Contactado", tone: "neutral" },
  responded: { label: "Ha respondido", tone: "info" },
  interested: { label: "Interesado", tone: "violet" },
  meeting_scheduled: { label: "Reunión agendada", tone: "violet" },
  diagnosis_done: { label: "Diagnóstico hecho", tone: "violet" },
  proposal_needed: { label: "Falta propuesta", tone: "warn" },
  proposal_sent: { label: "Propuesta enviada", tone: "violet" },
  follow_up: { label: "Seguimiento", tone: "warn" },
  negotiation: { label: "Negociación", tone: "warn" },
  won: { label: "Ganado", tone: "ok" },
  lost: { label: "Perdido", tone: "danger" },
  nurture: { label: "Nurture", tone: "neutral" },
  client_active: { label: "Cliente activo", tone: "ok" },
  client_inactive: { label: "Cliente inactivo", tone: "neutral" },
  do_not_contact: { label: "No contactar", tone: "danger" },
};

export const TEMPERATURE: LabelMap<"cold" | "warm" | "hot" | "urgent"> = {
  cold: { label: "Frío", tone: "neutral" },
  warm: { label: "Templado", tone: "info" },
  hot: { label: "Caliente", tone: "warn" },
  urgent: { label: "Urgente", tone: "danger" },
};

export const LEAD_SOURCE: LabelMap<
  | "instagram_cold"
  | "instagram_inbound"
  | "meta_ads"
  | "website"
  | "whatsapp"
  | "referral"
  | "door_to_door"
  | "cold_call"
  | "email"
  | "linkedin"
  | "existing_client"
  | "networking"
  | "other"
> = {
  instagram_cold: { label: "Instagram (frío)", tone: "neutral" },
  instagram_inbound: { label: "Instagram (inbound)", tone: "violet" },
  meta_ads: { label: "Meta Ads", tone: "violet" },
  website: { label: "Web", tone: "info" },
  whatsapp: { label: "WhatsApp", tone: "ok" },
  referral: { label: "Recomendación", tone: "ok" },
  door_to_door: { label: "Puerta fría", tone: "neutral" },
  cold_call: { label: "Llamada fría", tone: "neutral" },
  email: { label: "Email", tone: "neutral" },
  linkedin: { label: "LinkedIn", tone: "info" },
  existing_client: { label: "Cliente existente", tone: "ok" },
  networking: { label: "Networking", tone: "info" },
  other: { label: "Otro", tone: "neutral" },
};

export const OPPORTUNITY_STAGE: LabelMap<
  | "discovered"
  | "qualified"
  | "diagnosis"
  | "proposal_drafting"
  | "proposal_sent"
  | "follow_up"
  | "negotiation"
  | "accepted"
  | "won"
  | "lost"
  | "paused"
> = {
  discovered: { label: "Detectada", tone: "neutral" },
  qualified: { label: "Cualificada", tone: "info" },
  diagnosis: { label: "Diagnóstico", tone: "info" },
  proposal_drafting: { label: "Preparando propuesta", tone: "warn" },
  proposal_sent: { label: "Propuesta enviada", tone: "violet" },
  follow_up: { label: "Seguimiento", tone: "warn" },
  negotiation: { label: "Negociación", tone: "warn" },
  accepted: { label: "Aceptada", tone: "ok" },
  won: { label: "Ganada", tone: "ok" },
  lost: { label: "Perdida", tone: "danger" },
  paused: { label: "Pausada", tone: "neutral" },
};

export const CLIENT_STATUS: LabelMap<
  "active" | "paused" | "completed" | "recurring" | "inactive" | "archived"
> = {
  active: { label: "Activo", tone: "ok" },
  paused: { label: "Pausado", tone: "warn" },
  completed: { label: "Completado", tone: "neutral" },
  recurring: { label: "Recurrente", tone: "violet" },
  inactive: { label: "Inactivo", tone: "neutral" },
  archived: { label: "Archivado", tone: "neutral" },
};

export const PROJECT_STATUS: LabelMap<
  | "not_started"
  | "discovery"
  | "planning"
  | "design"
  | "development"
  | "review"
  | "delivery"
  | "support"
  | "blocked"
  | "completed"
  | "cancelled"
> = {
  not_started: { label: "Sin empezar", tone: "neutral" },
  discovery: { label: "Descubrimiento", tone: "info" },
  planning: { label: "Planificación", tone: "info" },
  design: { label: "Diseño", tone: "violet" },
  development: { label: "Desarrollo", tone: "violet" },
  review: { label: "Revisión", tone: "warn" },
  delivery: { label: "Entrega", tone: "warn" },
  support: { label: "Soporte", tone: "ok" },
  blocked: { label: "Bloqueado", tone: "danger" },
  completed: { label: "Completado", tone: "ok" },
  cancelled: { label: "Cancelado", tone: "neutral" },
};

export const TASK_STATUS: LabelMap<
  "todo" | "in_progress" | "waiting" | "done" | "cancelled"
> = {
  todo: { label: "Pendiente", tone: "neutral" },
  in_progress: { label: "En curso", tone: "violet" },
  waiting: { label: "Esperando", tone: "warn" },
  done: { label: "Hecha", tone: "ok" },
  cancelled: { label: "Cancelada", tone: "neutral" },
};

export const TASK_TYPE: LabelMap<
  | "follow_up"
  | "call"
  | "meeting"
  | "proposal"
  | "invoice"
  | "delivery"
  | "review"
  | "content"
  | "admin"
  | "technical"
  | "other"
> = {
  follow_up: { label: "Seguimiento", tone: "warn" },
  call: { label: "Llamada", tone: "info" },
  meeting: { label: "Reunión", tone: "violet" },
  proposal: { label: "Propuesta", tone: "violet" },
  invoice: { label: "Factura", tone: "ok" },
  delivery: { label: "Entrega", tone: "warn" },
  review: { label: "Revisión", tone: "info" },
  content: { label: "Contenido", tone: "neutral" },
  admin: { label: "Admin", tone: "neutral" },
  technical: { label: "Técnica", tone: "neutral" },
  other: { label: "Otra", tone: "neutral" },
};

export const PRIORITY: LabelMap<"low" | "medium" | "high" | "urgent"> = {
  low: { label: "Baja", tone: "neutral" },
  medium: { label: "Media", tone: "info" },
  high: { label: "Alta", tone: "warn" },
  urgent: { label: "Urgente", tone: "danger" },
};

export const INTERACTION_CHANNEL: LabelMap<
  | "call"
  | "whatsapp"
  | "email"
  | "instagram"
  | "linkedin"
  | "meeting"
  | "video_call"
  | "in_person"
  | "website_form"
  | "other"
> = {
  call: { label: "Llamada", tone: "info" },
  whatsapp: { label: "WhatsApp", tone: "ok" },
  email: { label: "Email", tone: "neutral" },
  instagram: { label: "Instagram", tone: "violet" },
  linkedin: { label: "LinkedIn", tone: "info" },
  meeting: { label: "Reunión", tone: "violet" },
  video_call: { label: "Videollamada", tone: "violet" },
  in_person: { label: "Presencial", tone: "ok" },
  website_form: { label: "Formulario web", tone: "neutral" },
  other: { label: "Otro", tone: "neutral" },
};

export const PROPOSAL_STATUS: LabelMap<
  | "draft"
  | "sent"
  | "viewed"
  | "followed_up"
  | "accepted"
  | "rejected"
  | "expired"
  | "archived"
> = {
  draft: { label: "Borrador", tone: "neutral" },
  sent: { label: "Enviada", tone: "violet" },
  viewed: { label: "Vista", tone: "info" },
  followed_up: { label: "Con seguimiento", tone: "warn" },
  accepted: { label: "Aceptada", tone: "ok" },
  rejected: { label: "Rechazada", tone: "danger" },
  expired: { label: "Caducada", tone: "neutral" },
  archived: { label: "Archivada", tone: "neutral" },
};

export const SERVICE_CATEGORY: LabelMap<
  | "automation_ai"
  | "custom_software"
  | "website"
  | "website_maintenance"
  | "social_media_management"
  | "content_creation"
  | "meta_ads"
  | "marketing_strategy"
  | "branding_naming"
  | "consulting"
  | "audiovisual"
  | "other"
> = {
  automation_ai: { label: "Automatización e IA", tone: "violet" },
  custom_software: { label: "Software a medida", tone: "violet" },
  website: { label: "Web", tone: "info" },
  website_maintenance: { label: "Mantenimiento web", tone: "info" },
  social_media_management: { label: "Redes sociales", tone: "ok" },
  content_creation: { label: "Contenido", tone: "ok" },
  meta_ads: { label: "Meta Ads", tone: "warn" },
  marketing_strategy: { label: "Estrategia marketing", tone: "warn" },
  branding_naming: { label: "Branding y naming", tone: "neutral" },
  consulting: { label: "Consultoría", tone: "neutral" },
  audiovisual: { label: "Audiovisual", tone: "neutral" },
  other: { label: "Otros", tone: "neutral" },
};

export const RECURRING_STATUS: LabelMap<
  "active" | "paused" | "cancelled" | "ended" | "trial"
> = {
  active: { label: "Activo", tone: "ok" },
  paused: { label: "Pausado", tone: "warn" },
  cancelled: { label: "Cancelado", tone: "danger" },
  ended: { label: "Finalizado", tone: "neutral" },
  trial: { label: "Prueba", tone: "info" },
};

export const INVOICE_STATUS: LabelMap<
  | "draft_needed"
  | "queued_for_odoo"
  | "created_in_odoo"
  | "sent"
  | "paid"
  | "overdue"
  | "cancelled"
  | "error"
> = {
  draft_needed: { label: "Falta borrador", tone: "warn" },
  queued_for_odoo: { label: "En cola Odoo", tone: "info" },
  created_in_odoo: { label: "Creada en Odoo", tone: "violet" },
  sent: { label: "Enviada", tone: "violet" },
  paid: { label: "Cobrada", tone: "ok" },
  overdue: { label: "Vencida", tone: "danger" },
  cancelled: { label: "Cancelada", tone: "neutral" },
  error: { label: "Error", tone: "danger" },
};

export const INVOICE_DRAFT_STATUS: LabelMap<
  "pending" | "queued" | "sent_to_odoo" | "created_in_odoo" | "error" | "discarded"
> = {
  pending: { label: "Pendiente", tone: "warn" },
  queued: { label: "En cola", tone: "info" },
  sent_to_odoo: { label: "Enviada a Odoo", tone: "violet" },
  created_in_odoo: { label: "Creada en Odoo", tone: "ok" },
  error: { label: "Error", tone: "danger" },
  discarded: { label: "Descartada", tone: "neutral" },
};

export const WORK_TYPE: LabelMap<
  | "strategy"
  | "sales"
  | "meeting"
  | "proposal"
  | "web_design"
  | "web_development"
  | "automation"
  | "ai_development"
  | "crm_system"
  | "debugging"
  | "content_planning"
  | "copywriting"
  | "design"
  | "video_editing"
  | "social_media"
  | "meta_ads"
  | "admin"
  | "accounting"
  | "learning"
  | "internal"
  | "other"
> = {
  strategy: { label: "Estrategia", tone: "violet" },
  sales: { label: "Ventas", tone: "warn" },
  meeting: { label: "Reunión", tone: "info" },
  proposal: { label: "Propuesta", tone: "violet" },
  web_design: { label: "Diseño web", tone: "info" },
  web_development: { label: "Desarrollo web", tone: "info" },
  automation: { label: "Automatización", tone: "violet" },
  ai_development: { label: "Desarrollo IA", tone: "violet" },
  crm_system: { label: "Sistema CRM", tone: "violet" },
  debugging: { label: "Debugging", tone: "danger" },
  content_planning: { label: "Planificación contenido", tone: "ok" },
  copywriting: { label: "Copywriting", tone: "ok" },
  design: { label: "Diseño", tone: "info" },
  video_editing: { label: "Edición vídeo", tone: "ok" },
  social_media: { label: "Redes sociales", tone: "ok" },
  meta_ads: { label: "Meta Ads", tone: "warn" },
  admin: { label: "Administración", tone: "neutral" },
  accounting: { label: "Contabilidad", tone: "neutral" },
  learning: { label: "Formación", tone: "neutral" },
  internal: { label: "Interno", tone: "neutral" },
  other: { label: "Otro", tone: "neutral" },
};

export const TIME_ENTRY_STATUS: LabelMap<
  | "draft"
  | "reviewed"
  | "approved"
  | "queued_for_invoice"
  | "invoiced"
  | "non_billable"
  | "written_off"
> = {
  draft: { label: "Borrador", tone: "neutral" },
  reviewed: { label: "Revisada", tone: "info" },
  approved: { label: "Aprobada", tone: "ok" },
  queued_for_invoice: { label: "En cola de factura", tone: "warn" },
  invoiced: { label: "Facturada", tone: "violet" },
  non_billable: { label: "No facturable", tone: "neutral" },
  written_off: { label: "Descartada", tone: "neutral" },
};

export const CAMPAIGN_STATUS: LabelMap<
  "draft" | "active" | "paused" | "finished" | "archived"
> = {
  draft: { label: "Borrador", tone: "neutral" },
  active: { label: "Activa", tone: "ok" },
  paused: { label: "Pausada", tone: "warn" },
  finished: { label: "Finalizada", tone: "neutral" },
  archived: { label: "Archivada", tone: "neutral" },
};

export const CAMPAIGN_CHANNEL: LabelMap<
  | "instagram_organic"
  | "instagram_ads"
  | "facebook_ads"
  | "linkedin"
  | "website"
  | "whatsapp"
  | "door_to_door"
  | "cold_call"
  | "referral"
  | "email"
  | "other"
> = {
  instagram_organic: { label: "Instagram orgánico", tone: "violet" },
  instagram_ads: { label: "Instagram Ads", tone: "violet" },
  facebook_ads: { label: "Facebook Ads", tone: "info" },
  linkedin: { label: "LinkedIn", tone: "info" },
  website: { label: "Web", tone: "neutral" },
  whatsapp: { label: "WhatsApp", tone: "ok" },
  door_to_door: { label: "Puerta fría", tone: "neutral" },
  cold_call: { label: "Llamada fría", tone: "neutral" },
  referral: { label: "Recomendación", tone: "ok" },
  email: { label: "Email", tone: "neutral" },
  other: { label: "Otro", tone: "neutral" },
};

/** Convierte un LabelMap en opciones para <select> */
export function toOptions<T extends string>(
  map: LabelMap<T>,
): { value: T; label: string }[] {
  return (Object.keys(map) as T[]).map((value) => ({
    value,
    label: map[value].label,
  }));
}
